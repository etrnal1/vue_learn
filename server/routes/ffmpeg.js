import express from 'express';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import os from 'os';
import { spawn, execFile } from 'child_process';
import { promisify } from 'util';

const router = express.Router();
const execFileAsync = promisify(execFile);

const OUTPUT_DIR = process.env.FFMPEG_OUTPUT_DIR
  ? path.resolve(process.env.FFMPEG_OUTPUT_DIR)
  : path.join(os.homedir(), 'Movies');

const DEFAULT_CHUNK_SIZE = 8 * 1024 * 1024;
const INITIAL_CHUNK_SIZE = 16 * 1024 * 1024;
const MIME_BY_EXT = {
  '.mp4': 'video/mp4',
  '.mkv': 'video/x-matroska',
  '.mov': 'video/quicktime',
  '.avi': 'video/x-msvideo',
  '.webm': 'video/webm',
  '.m4v': 'video/x-m4v',
  '.wmv': 'video/x-ms-wmv',
  '.flv': 'video/x-flv',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.wav': 'audio/wav',
  '.flac': 'audio/flac',
  '.ogg': 'audio/ogg',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp'
};

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_BY_EXT[ext] || 'application/octet-stream';
}

function resolveRange(rangeHeader, fileSize) {
  const rangeValue = String(rangeHeader || '').replace(/bytes=/, '').trim();
  const [rawStart, rawEnd] = rangeValue.split('-');
  const hasStart = rawStart !== '';
  const hasEnd = rawEnd !== '';
  let start;
  let end;

  if (hasStart) {
    start = Number.parseInt(rawStart, 10);
    if (Number.isNaN(start) || start < 0 || start >= fileSize) return null;
    if (hasEnd) {
      end = Number.parseInt(rawEnd, 10);
      if (Number.isNaN(end)) return null;
    } else {
      const chunkSize = start === 0 ? INITIAL_CHUNK_SIZE : DEFAULT_CHUNK_SIZE;
      end = Math.min(start + chunkSize - 1, fileSize - 1);
    }
  } else {
    if (!hasEnd) return null;
    const suffixLen = Number.parseInt(rawEnd, 10);
    if (Number.isNaN(suffixLen) || suffixLen <= 0) return null;
    start = Math.max(fileSize - suffixLen, 0);
    end = fileSize - 1;
  }

  if (end < start) return null;
  if (end >= fileSize) end = fileSize - 1;
  return { start, end };
}

function cleanName(input) {
  const base = path.basename(String(input || '').trim() || 'output');
  return base.replace(/[^\w.\-()\u4e00-\u9fa5 ]+/g, '_').slice(0, 120) || 'output';
}

function resolveAbsolutePath(inputPath, name = 'path') {
  if (typeof inputPath !== 'string' || !inputPath.trim()) {
    throw new Error(`${name} 不能为空`);
  }
  const resolved = path.resolve(inputPath.trim());
  if (!path.isAbsolute(resolved)) throw new Error(`${name} 必须是绝对路径`);
  return resolved;
}

async function ensureReadableFile(absPath, name = 'inputPath') {
  const stat = await fsp.stat(absPath).catch(() => null);
  if (!stat || !stat.isFile()) throw new Error(`${name} 文件不存在`);
}

async function ensureOutputDir() {
  await fsp.mkdir(OUTPUT_DIR, { recursive: true });
}

function createOutputPath(inputPath, suffix, ext, outputName) {
  const srcBase = cleanName(path.parse(inputPath || '').name || 'output');
  const safeSuffix = cleanName(suffix || 'ffmpeg');
  const safeExt = String(ext || 'mp4').replace(/^\./, '').toLowerCase();
  const name = outputName ? cleanName(outputName).replace(/\.[^.]+$/, '') : `${srcBase}_${safeSuffix}_${Date.now()}`;
  return path.join(OUTPUT_DIR, `${name}.${safeExt}`);
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const child = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk || '');
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) return resolve();
      reject(new Error(stderr || `ffmpeg exited with code ${code}`));
    });
  });
}

async function probeDurationSeconds(filePath) {
  try {
    const { stdout } = await execFileAsync('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      filePath
    ], { timeout: 8000, maxBuffer: 128 * 1024 });
    const duration = Number.parseFloat(String(stdout || '').trim());
    return Number.isFinite(duration) && duration > 0 ? duration : 0;
  } catch {
    return 0;
  }
}

function atempoFilter(speed) {
  let current = Number(speed);
  const chain = [];
  while (current > 2) {
    chain.push('atempo=2');
    current /= 2;
  }
  while (current < 0.5) {
    chain.push('atempo=0.5');
    current /= 0.5;
  }
  chain.push(`atempo=${current.toFixed(3)}`);
  return chain.join(',');
}

async function runAction(body) {
  const action = String(body?.action || '').trim();
  if (!action) throw new Error('action 不能为空');
  await ensureOutputDir();

  if (action === 'merge_concat') {
    const inputPaths = Array.isArray(body?.inputPaths) ? body.inputPaths : [];
    const files = inputPaths.map((p, i) => resolveAbsolutePath(p, `inputPaths[${i}]`));
    if (files.length < 2) throw new Error('合并至少需要两个输入文件');
    for (const f of files) await ensureReadableFile(f, 'inputPaths');
    const outputPath = createOutputPath(files[0], 'concat', 'mp4', body?.outputName);

    const listPath = path.join(OUTPUT_DIR, `ffmpeg_concat_${Date.now()}_${Math.random().toString(16).slice(2, 8)}.txt`);
    const listText = files.map((file) => `file '${file.replace(/'/g, "'\\''")}'`).join('\n');
    await fsp.writeFile(listPath, listText, 'utf8');
    try {
      const mode = String(body?.concatMode || 'copy');
      const args = mode === 'reencode'
        ? ['-y', '-f', 'concat', '-safe', '0', '-i', listPath, '-c:v', 'libx264', '-preset', 'medium', '-crf', '23', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', outputPath]
        : ['-y', '-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', outputPath];
      await runFfmpeg(args);
    } finally {
      await fsp.rm(listPath, { force: true }).catch(() => {});
    }
    return outputPath;
  }

  const inputPath = resolveAbsolutePath(body?.inputPath);
  await ensureReadableFile(inputPath);

  if (action === 'transcode') {
    const ext = String(body?.format || 'mp4');
    const crf = Math.max(16, Math.min(35, Number(body?.crf || 23)));
    const preset = String(body?.preset || 'medium');
    const outputPath = createOutputPath(inputPath, 'transcode', ext, body?.outputName);
    await runFfmpeg([
      '-y', '-i', inputPath,
      '-c:v', 'libx264',
      '-preset', preset,
      '-crf', String(crf),
      '-c:a', 'aac',
      '-b:a', '192k',
      '-movflags', '+faststart',
      outputPath
    ]);
    return outputPath;
  }

  if (action === 'extract_audio') {
    const format = String(body?.audioFormat || 'mp3').toLowerCase();
    const bitrate = String(body?.audioBitrate || '192k');
    const outputPath = createOutputPath(inputPath, 'audio', format, body?.outputName);
    const codecArgs = format === 'wav'
      ? ['-c:a', 'pcm_s16le']
      : (format === 'aac' || format === 'm4a'
          ? ['-c:a', 'aac', '-b:a', bitrate]
          : ['-c:a', 'libmp3lame', '-b:a', bitrate]);
    await runFfmpeg([
      '-y', '-i', inputPath, '-vn',
      ...codecArgs,
      outputPath
    ]);
    return outputPath;
  }

  if (action === 'snapshot') {
    const format = String(body?.imageFormat || 'jpg').toLowerCase();
    const sec = Math.max(0, Number(body?.timeSec || 1));
    const outputPath = createOutputPath(inputPath, 'snapshot', format, body?.outputName);
    await runFfmpeg([
      '-y', '-ss', String(sec), '-i', inputPath,
      '-frames:v', '1',
      ...(format === 'jpg' || format === 'jpeg' ? ['-q:v', '2'] : []),
      outputPath
    ]);
    return outputPath;
  }

  if (action === 'compress') {
    const crf = Math.max(18, Math.min(38, Number(body?.crf || 28)));
    const preset = String(body?.preset || 'medium');
    const width = Number(body?.width || 0);
    const outputPath = createOutputPath(inputPath, 'compressed', 'mp4', body?.outputName);
    const vf = width > 0 ? `scale=${Math.floor(width)}:-2` : '';
    await runFfmpeg([
      '-y', '-i', inputPath,
      ...(vf ? ['-vf', vf] : []),
      '-c:v', 'libx264',
      '-preset', preset,
      '-crf', String(crf),
      '-c:a', 'aac',
      '-b:a', '160k',
      '-movflags', '+faststart',
      outputPath
    ]);
    return outputPath;
  }

  if (action === 'trim') {
    const startSec = Math.max(0, Number(body?.startSec || 0));
    const endSecRaw = Number(body?.endSec);
    const durationRaw = Number(body?.durationSec);
    const duration = Number.isFinite(durationRaw) && durationRaw > 0
      ? durationRaw
      : (Number.isFinite(endSecRaw) && endSecRaw > startSec ? endSecRaw - startSec : 0);
    if (!(duration > 0)) throw new Error('请设置有效的结束时间或时长');
    const outputPath = createOutputPath(inputPath, 'trim', 'mp4', body?.outputName);
    await runFfmpeg([
      '-y', '-ss', String(startSec), '-i', inputPath, '-t', String(duration),
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '23',
      '-c:a', 'aac', '-b:a', '160k',
      '-movflags', '+faststart',
      outputPath
    ]);
    return outputPath;
  }

  if (action === 'speed') {
    const speed = Math.max(0.25, Math.min(4, Number(body?.speed || 1.25)));
    const outputPath = createOutputPath(inputPath, 'speed', 'mp4', body?.outputName);
    await runFfmpeg([
      '-y', '-i', inputPath,
      '-filter:v', `setpts=${(1 / speed).toFixed(6)}*PTS`,
      '-filter:a', atempoFilter(speed),
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', '23',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-movflags', '+faststart',
      outputPath
    ]);
    return outputPath;
  }

  throw new Error(`不支持的 action: ${action}`);
}

router.get('/presets', (req, res) => {
  res.json({
    actions: [
      { id: 'transcode', label: '转码 (H.264/AAC)' },
      { id: 'extract_audio', label: '提取音频' },
      { id: 'snapshot', label: '截图封面' },
      { id: 'compress', label: '压缩视频' },
      { id: 'trim', label: '裁剪时长' },
      { id: 'merge_concat', label: '合并视频' },
      { id: 'speed', label: '倍速处理' }
    ]
  });
});

router.post('/run', async (req, res) => {
  const startedAt = Date.now();
  try {
    const outputPath = await runAction(req.body || {});
    const stat = await fsp.stat(outputPath);
    const duration = await probeDurationSeconds(outputPath);
    res.json({
      outputPath,
      size: stat.size,
      duration,
      streamUrl: `/api/ffmpeg/stream?path=${encodeURIComponent(outputPath)}`,
      downloadUrl: `/api/ffmpeg/download?path=${encodeURIComponent(outputPath)}`,
      elapsedMs: Date.now() - startedAt
    });
  } catch (error) {
    res.status(400).json({ error: error.message || 'FFmpeg 执行失败' });
  }
});

router.get('/download', async (req, res) => {
  try {
    const absPath = resolveAbsolutePath(req.query.path, 'path');
    await ensureReadableFile(absPath, 'path');
    res.setHeader('Content-Type', contentTypeFor(absPath));
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(path.basename(absPath))}`);
    fs.createReadStream(absPath).pipe(res);
  } catch (error) {
    res.status(400).json({ error: error.message || '下载失败' });
  }
});

router.get('/stream', async (req, res) => {
  try {
    const absPath = resolveAbsolutePath(req.query.path, 'path');
    await ensureReadableFile(absPath, 'path');
    const stat = await fsp.stat(absPath);
    const fileSize = stat.size;
    const contentType = contentTypeFor(absPath);
    const range = req.headers.range ? resolveRange(req.headers.range, fileSize) : null;

    if (req.headers.range && !range) {
      res.status(416).set({
        'Content-Range': `bytes */${fileSize}`,
        'Accept-Ranges': 'bytes'
      });
      return res.end();
    }

    if (!range) {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': fileSize,
        'Accept-Ranges': 'bytes'
      });
      fs.createReadStream(absPath).pipe(res);
      return;
    }

    const { start, end } = range;
    const chunkSize = end - start + 1;
    res.writeHead(206, {
      'Content-Type': contentType,
      'Content-Length': chunkSize,
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes'
    });
    fs.createReadStream(absPath, { start, end }).pipe(res);
  } catch (error) {
    res.status(400).json({ error: error.message || '流式读取失败' });
  }
});

export default router;
