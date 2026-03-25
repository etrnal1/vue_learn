import express from 'express';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { spawn, execFile } from 'child_process';
import { promisify } from 'util';
import { pool } from '../db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();
const execFileAsync = promisify(execFile);

// 存储根目录
const RECORDINGS_BASE = path.resolve(__dirname, '../data/recordings');
const TMP_BASE = path.join(RECORDINGS_BASE, 'tmp');
const THUMB_BASE = path.join(RECORDINGS_BASE, 'thumbnails');

// 确保目录存在
await fsp.mkdir(RECORDINGS_BASE, { recursive: true });
await fsp.mkdir(TMP_BASE, { recursive: true });
await fsp.mkdir(THUMB_BASE, { recursive: true });

// 内存中维护正在运行的任务
const runningTasks = new Map(); // taskId -> { process, abortFn }

// ─── 工具函数 ────────────────────────────────────────────

function genId(prefix) {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
}

function safeSeq(raw) {
  const n = parseInt(raw, 10);
  if (isNaN(n) || n < 0 || n > 9999) throw new Error('无效的 chunk seq');
  return n;
}

function safeRecordingId(raw) {
  const n = parseInt(raw, 10);
  if (isNaN(n) || n <= 0) throw new Error('无效的 recording id');
  return n;
}

function sanitizeName(input) {
  const s = String(input || '').trim().slice(0, 200);
  return s.replace(/[\/\\:*?"<>|]/g, '_') || 'recording';
}

function getArchiveDir() {
  const now = new Date();
  const dir = path.join(RECORDINGS_BASE, `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`);
  return dir;
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' KB';
  return (bytes/1024/1024).toFixed(1) + ' MB';
}

function formatDuration(sec) {
  const h = Math.floor(sec/3600);
  const m = Math.floor((sec%3600)/60);
  const s = sec%60;
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function formatDate(d) {
  const dt = d instanceof Date ? d : new Date(d);
  return dt.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
}

async function probeDuration(filePath) {
  try {
    const { stdout } = await execFileAsync('ffprobe', [
      '-v', 'error', '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1', filePath
    ], { timeout: 8000 });
    const d = parseFloat(stdout.trim());
    return isFinite(d) && d > 0 ? Math.round(d) : 0;
  } catch { return 0; }
}

// Range 请求处理（复用 ffmpeg.js 的逻辑）
const DEFAULT_CHUNK = 8 * 1024 * 1024;
const INITIAL_CHUNK = 16 * 1024 * 1024;

function resolveRange(rangeHeader, fileSize) {
  const val = String(rangeHeader || '').replace(/bytes=/, '').trim();
  const [rawStart, rawEnd] = val.split('-');
  const hasStart = rawStart !== '';
  const hasEnd = rawEnd !== '';
  let start, end;
  if (hasStart) {
    start = parseInt(rawStart, 10);
    if (isNaN(start) || start < 0 || start >= fileSize) return null;
    if (hasEnd) {
      end = parseInt(rawEnd, 10);
      if (isNaN(end)) return null;
    } else {
      const cs = start === 0 ? INITIAL_CHUNK : DEFAULT_CHUNK;
      end = Math.min(start + cs - 1, fileSize - 1);
    }
  } else {
    if (!hasEnd) return null;
    const suffix = parseInt(rawEnd, 10);
    if (isNaN(suffix) || suffix <= 0) return null;
    start = Math.max(fileSize - suffix, 0);
    end = fileSize - 1;
  }
  if (end < start) return null;
  if (end >= fileSize) end = fileSize - 1;
  return { start, end };
}

// ─── 会话管理 ─────────────────────────────────────────

// POST /sessions
router.post('/sessions', express.json(), async (req, res) => {
  try {
    const { quality = 'high', frameRate = 30, captureAudio = true, captureMic = false } = req.body || {};
    const sessionId = genId('sess');
    const tmpDir = path.join(TMP_BASE, sessionId);
    await fsp.mkdir(tmpDir, { recursive: true });

    await pool.execute(
      `INSERT INTO screen_recorder_sessions (id, status, quality, frame_rate, capture_audio, capture_mic, tmp_dir)
       VALUES (?, 'active', ?, ?, ?, ?, ?)`,
      [sessionId, quality, frameRate, captureAudio ? 1 : 0, captureMic ? 1 : 0, tmpDir]
    );

    res.json({ sessionId, createdAt: new Date().toISOString() });
  } catch (e) {
    console.error('[screen-recorder] 创建会话失败', e);
    res.status(500).json({ error: e.message });
  }
});

// POST /sessions/:sessionId/chunks  — 接收 chunk（绕过 bodyParser）
router.post('/sessions/:sessionId/chunks', (req, res) => {
  const sessionId = req.params.sessionId;
  if (!/^sess_\d+_[0-9a-f]+$/.test(sessionId)) {
    return res.status(400).json({ error: '无效的 sessionId' });
  }

  let seq;
  try {
    seq = safeSeq(req.headers['x-chunk-seq']);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }

  const tmpDir = path.join(TMP_BASE, sessionId);
  const chunkPath = path.join(tmpDir, `chunk_${String(seq).padStart(5, '0')}.webm`);

  // 安全：确保 chunkPath 在 tmpDir 内
  if (!chunkPath.startsWith(tmpDir + path.sep)) {
    return res.status(400).json({ error: '路径非法' });
  }

  let bytesWritten = 0;
  const writeStream = fs.createWriteStream(chunkPath);
  req.on('data', chunk => { bytesWritten += chunk.length; });
  req.pipe(writeStream);

  writeStream.on('finish', async () => {
    // 更新 chunk 计数
    await pool.execute(
      'UPDATE screen_recorder_sessions SET chunk_count = chunk_count + 1 WHERE id = ?',
      [sessionId]
    ).catch(() => {});
    res.json({ seq, bytesWritten, chunkPath: path.basename(chunkPath) });
  });

  writeStream.on('error', (e) => {
    console.error('[screen-recorder] chunk 写入失败', e);
    res.status(500).json({ error: e.message });
  });
});

// POST /sessions/:sessionId/complete
router.post('/sessions/:sessionId/complete', express.json(), async (req, res) => {
  const sessionId = req.params.sessionId;
  if (!/^sess_\d+_[0-9a-f]+$/.test(sessionId)) {
    return res.status(400).json({ error: '无效的 sessionId' });
  }

  try {
    const { name = 'recording', durationSec = 0, totalChunks = 0 } = req.body || {};

    const tmpDir = path.join(TMP_BASE, sessionId);
    const archiveDir = getArchiveDir();
    await fsp.mkdir(archiveDir, { recursive: true });

    const safeName = sanitizeName(name);
    const filename = `${safeName}.webm`;
    const finalPath = path.join(archiveDir, `rec_${sessionId}.webm`);

    // 按 seq 排序所有 chunk，直接拼接
    const files = await fsp.readdir(tmpDir).catch(() => []);
    const chunks = files
      .filter(f => f.startsWith('chunk_') && f.endsWith('.webm'))
      .sort();

    if (chunks.length === 0) {
      return res.status(400).json({ error: '没有 chunk 可合并' });
    }

    // 串行拼接
    await new Promise((resolve, reject) => {
      const out = fs.createWriteStream(finalPath);
      out.on('error', reject);
      out.on('finish', resolve);

      let i = 0;
      function pipeNext() {
        if (i >= chunks.length) { out.end(); return; }
        const src = fs.createReadStream(path.join(tmpDir, chunks[i++]));
        src.on('error', reject);
        src.on('end', pipeNext);
        src.pipe(out, { end: false });
      }
      pipeNext();
    });

    // 获取文件大小和实际时长
    const stat = await fsp.stat(finalPath);
    const sizeByte = stat.size;
    const actualDuration = await probeDuration(finalPath);
    const duration = actualDuration || durationSec;

    // 写入数据库
    const [result] = await pool.execute(
      `INSERT INTO screen_recordings (session_id, name, filename, file_path, format, size_byte, duration_sec)
       VALUES (?, ?, ?, ?, 'webm', ?, ?)`,
      [sessionId, safeName, filename, finalPath, sizeByte, duration]
    );
    const recordingId = result.insertId;

    // 更新会话状态
    await pool.execute(
      `UPDATE screen_recorder_sessions SET status='completed', completed_at=NOW() WHERE id=?`,
      [sessionId]
    );

    // 清理 tmp
    fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => {});

    // 异步提取缩略图
    extractThumbnailAsync(recordingId, finalPath, 3);

    res.json({
      recordingId,
      filename,
      sizeByte,
      sizeHuman: formatSize(sizeByte),
      durationSec: duration,
      durationHuman: formatDuration(duration)
    });
  } catch (e) {
    console.error('[screen-recorder] complete 失败', e);
    res.status(500).json({ error: e.message });
  }
});

// DELETE /sessions/:sessionId (中止)
router.delete('/sessions/:sessionId', async (req, res) => {
  const sessionId = req.params.sessionId;
  try {
    await pool.execute(
      `UPDATE screen_recorder_sessions SET status='aborted' WHERE id=? AND status='active'`,
      [sessionId]
    );
    const tmpDir = path.join(TMP_BASE, sessionId);
    fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    res.json({ deleted: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /sessions/:sessionId/abort (sendBeacon 使用 POST)
router.post('/sessions/:sessionId/abort', (req, res) => {
  const sessionId = req.params.sessionId;
  pool.execute(
    `UPDATE screen_recorder_sessions SET status='aborted' WHERE id=? AND status='active'`,
    [sessionId]
  ).catch(() => {});
  const tmpDir = path.join(TMP_BASE, sessionId);
  fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  res.status(204).end();
});

// ─── 录制文件管理 ─────────────────────────────────────

// GET /recordings
router.get('/recordings', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const size = Math.min(100, Math.max(1, parseInt(req.query.size) || 20));
    const offset = (page - 1) * size;

    const [[{ total }]] = await pool.execute('SELECT COUNT(*) as total FROM screen_recordings');
    const [rows] = await pool.execute(
      'SELECT * FROM screen_recordings ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [size, offset]
    );

    const items = rows.map(r => ({
      id: r.id,
      name: r.name,
      filename: r.filename,
      format: r.format,
      sizeByte: r.size_byte,
      sizeHuman: formatSize(r.size_byte),
      durationSec: r.duration_sec,
      durationHuman: formatDuration(r.duration_sec),
      hasThumbnail: !!r.has_thumbnail,
      convertedMp4Id: r.converted_from ? null : null, // 标记是否已有 mp4 版本
      createdAt: r.created_at,
      createdAtHuman: formatDate(r.created_at)
    }));

    res.json({ total, page, size, items });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /recordings/:id
router.patch('/recordings/:id', express.json(), async (req, res) => {
  try {
    const id = safeRecordingId(req.params.id);
    const name = sanitizeName(req.body?.name);
    await pool.execute('UPDATE screen_recordings SET name=? WHERE id=?', [name, id]);
    res.json({ id, name, updatedAt: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /recordings/:id
router.delete('/recordings/:id', async (req, res) => {
  try {
    const id = safeRecordingId(req.params.id);
    const [[rec]] = await pool.execute('SELECT * FROM screen_recordings WHERE id=?', [id]);
    if (!rec) return res.status(404).json({ error: '录制不存在' });

    // 删除文件
    fsp.unlink(rec.file_path).catch(() => {});
    if (rec.thumbnail_path) fsp.unlink(rec.thumbnail_path).catch(() => {});

    await pool.execute('DELETE FROM screen_recordings WHERE id=?', [id]);
    res.json({ deleted: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /recordings/:id/stream
router.get('/recordings/:id/stream', async (req, res) => {
  try {
    const id = safeRecordingId(req.params.id);
    const [[rec]] = await pool.execute('SELECT * FROM screen_recordings WHERE id=?', [id]);
    if (!rec) return res.status(404).json({ error: '录制不存在' });

    const filePath = rec.file_path;
    const stat = await fsp.stat(filePath).catch(() => null);
    if (!stat) return res.status(404).json({ error: '文件不存在' });

    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = { '.webm': 'video/webm', '.mp4': 'video/mp4', '.mov': 'video/quicktime' };
    const mimeType = mimeTypes[ext] || 'video/webm';

    res.setHeader('Accept-Ranges', 'bytes');
    const range = resolveRange(req.headers.range, stat.size);

    if (!range) {
      res.setHeader('Content-Length', stat.size);
      res.setHeader('Content-Type', mimeType);
      fs.createReadStream(filePath).pipe(res);
      return;
    }

    const { start, end } = range;
    res.status(206);
    res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`);
    res.setHeader('Content-Length', end - start + 1);
    res.setHeader('Content-Type', mimeType);
    fs.createReadStream(filePath, { start, end }).pipe(res);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /recordings/:id/download
router.get('/recordings/:id/download', async (req, res) => {
  try {
    const id = safeRecordingId(req.params.id);
    const [[rec]] = await pool.execute('SELECT * FROM screen_recordings WHERE id=?', [id]);
    if (!rec) return res.status(404).json({ error: '录制不存在' });

    const filePath = rec.file_path;
    const stat = await fsp.stat(filePath).catch(() => null);
    if (!stat) return res.status(404).json({ error: '文件不存在' });

    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(rec.filename)}`);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Type', 'application/octet-stream');
    fs.createReadStream(filePath).pipe(res);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /recordings/:id/thumbnail
router.get('/recordings/:id/thumbnail', async (req, res) => {
  try {
    const id = safeRecordingId(req.params.id);
    const [[rec]] = await pool.execute('SELECT thumbnail_path, has_thumbnail FROM screen_recordings WHERE id=?', [id]);
    if (!rec || !rec.has_thumbnail || !rec.thumbnail_path) {
      return res.status(404).json({ error: '缩略图不存在' });
    }
    const stat = await fsp.stat(rec.thumbnail_path).catch(() => null);
    if (!stat) return res.status(404).json({ error: '缩略图文件不存在' });
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    fs.createReadStream(rec.thumbnail_path).pipe(res);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /recordings/:id/thumbnail
router.post('/recordings/:id/thumbnail', express.json(), async (req, res) => {
  try {
    const id = safeRecordingId(req.params.id);
    const timeSec = Math.max(0, parseInt(req.body?.timeSec) || 3);
    const [[rec]] = await pool.execute('SELECT * FROM screen_recordings WHERE id=?', [id]);
    if (!rec) return res.status(404).json({ error: '录制不存在' });

    const thumbPath = path.join(THUMB_BASE, `${id}.jpg`);
    await extractThumbnailByPath(rec.file_path, thumbPath, timeSec);
    await pool.execute('UPDATE screen_recordings SET thumbnail_path=?, has_thumbnail=1 WHERE id=?', [thumbPath, id]);
    res.json({ thumbnailUrl: `/api/screen-recorder/recordings/${id}/thumbnail` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── FFmpeg 任务 ──────────────────────────────────────

// POST /tasks/convert
router.post('/tasks/convert', express.json(), async (req, res) => {
  try {
    const { recordingId, format = 'mp4', crf = 23, preset = 'medium' } = req.body || {};
    const id = safeRecordingId(recordingId);
    const [[rec]] = await pool.execute('SELECT * FROM screen_recordings WHERE id=?', [id]);
    if (!rec) return res.status(404).json({ error: '录制不存在' });

    const taskId = genId('task');
    await pool.execute(
      `INSERT INTO screen_recorder_tasks (id, type, status, recording_id, params)
       VALUES (?, 'convert', 'pending', ?, ?)`,
      [taskId, id, JSON.stringify({ format, crf, preset })]
    );

    // 异步执行
    res.status(202).json({ taskId, status: 'pending', recordingId: id });

    // 在响应后异步执行转码
    setImmediate(() => runConvertTask(taskId, rec, { format, crf, preset }));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /tasks/:taskId
router.get('/tasks/:taskId', async (req, res) => {
  try {
    const taskId = req.params.taskId;
    if (!/^task_\d+_[0-9a-f]+$/.test(taskId)) {
      return res.status(400).json({ error: '无效的 taskId' });
    }
    const [[task]] = await pool.execute('SELECT * FROM screen_recorder_tasks WHERE id=?', [taskId]);
    if (!task) return res.status(404).json({ error: '任务不存在' });

    res.json({
      taskId: task.id,
      status: task.status,
      progress: task.progress,
      outputRecordingId: task.output_id,
      errorMsg: task.error_msg,
      startedAt: task.started_at,
      completedAt: task.completed_at
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── 后台任务函数 ─────────────────────────────────────

async function runConvertTask(taskId, rec, { format, crf, preset }) {
  const archiveDir = getArchiveDir();
  await fsp.mkdir(archiveDir, { recursive: true });
  const outputPath = path.join(archiveDir, `rec_${taskId}.${format}`);

  await pool.execute(
    'UPDATE screen_recorder_tasks SET status=?, started_at=NOW() WHERE id=?',
    ['running', taskId]
  );

  const args = [
    '-i', rec.file_path,
    '-c:v', 'libx264',
    '-crf', String(crf),
    '-preset', preset,
    '-c:a', 'aac',
    '-b:a', '128k',
    '-movflags', '+faststart',
    '-y',
    outputPath
  ];

  return new Promise((resolve) => {
    const child = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', d => { stderr += String(d); });

    runningTasks.set(taskId, { process: child });

    child.on('close', async (code) => {
      runningTasks.delete(taskId);
      if (code === 0) {
        try {
          const stat = await fsp.stat(outputPath);
          const duration = await probeDuration(outputPath);
          const [result] = await pool.execute(
            `INSERT INTO screen_recordings (session_id, name, filename, file_path, format, size_byte, duration_sec, converted_from)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [rec.session_id, rec.name + ' (MP4)', rec.name + '.mp4', outputPath, format, stat.size, duration, rec.id]
          );
          await pool.execute(
            'UPDATE screen_recorder_tasks SET status=?, output_id=?, progress=100, completed_at=NOW() WHERE id=?',
            ['done', result.insertId, taskId]
          );
        } catch (e) {
          await pool.execute(
            'UPDATE screen_recorder_tasks SET status=?, error_msg=?, completed_at=NOW() WHERE id=?',
            ['error', e.message, taskId]
          );
        }
      } else {
        await pool.execute(
          'UPDATE screen_recorder_tasks SET status=?, error_msg=?, completed_at=NOW() WHERE id=?',
          ['error', stderr.slice(-500) || `ffmpeg exited ${code}`, taskId]
        );
      }
      resolve();
    });

    child.on('error', async (e) => {
      runningTasks.delete(taskId);
      await pool.execute(
        'UPDATE screen_recorder_tasks SET status=?, error_msg=?, completed_at=NOW() WHERE id=?',
        ['error', e.message, taskId]
      );
      resolve();
    });
  });
}

async function extractThumbnailByPath(videoPath, thumbPath, timeSec) {
  await new Promise((resolve, reject) => {
    const child = spawn('ffmpeg', [
      '-ss', String(timeSec),
      '-i', videoPath,
      '-vframes', '1',
      '-q:v', '3',
      '-y',
      thumbPath
    ], { stdio: ['ignore', 'ignore', 'pipe'] });
    child.on('close', code => code === 0 ? resolve() : reject(new Error(`ffmpeg thumbnail exited ${code}`)));
    child.on('error', reject);
  });
}

async function extractThumbnailAsync(recordingId, videoPath, timeSec) {
  try {
    const thumbPath = path.join(THUMB_BASE, `${recordingId}.jpg`);
    await extractThumbnailByPath(videoPath, thumbPath, timeSec);
    await pool.execute(
      'UPDATE screen_recordings SET thumbnail_path=?, has_thumbnail=1 WHERE id=?',
      [thumbPath, recordingId]
    );
  } catch (e) {
    // 缩略图提取失败不影响主流程
    console.warn('[screen-recorder] 缩略图提取失败', e.message);
  }
}

export default router;
