import express from 'express';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { spawn } from 'child_process';
import { execFile } from 'child_process';
import { promisify } from 'util';

const router = express.Router();
const execFileAsync = promisify(execFile);

const VIDEO_EXTENSIONS = new Set([
  '.mp4', '.mkv', '.mov', '.avi', '.webm', '.m4v', '.flv', '.wmv'
]);
const MIME_BY_EXT = {
  '.mp4': 'video/mp4',
  '.mkv': 'video/x-matroska',
  '.mov': 'video/quicktime',
  '.avi': 'video/x-msvideo',
  '.webm': 'video/webm',
  '.m4v': 'video/x-m4v',
  '.flv': 'video/x-flv',
  '.wmv': 'video/x-ms-wmv'
};

const DEFAULT_MAX_FILES = 3000;
const MAX_DEPTH = 20;
const DEFAULT_CHUNK_SIZE = 8 * 1024 * 1024; // 8MB
const INITIAL_CHUNK_SIZE = 16 * 1024 * 1024; // 16MB for bytes=0-
const OPTIMIZE_DIR = path.join(os.tmpdir(), 'vue-learning-video-cache');
const VIDEO_DATA_DIR = path.resolve('server/data/videos');
const VIDEO_LIBRARY_FILE = path.join(VIDEO_DATA_DIR, 'library.json');
const VIDEO_UPLOAD_DIR = process.env.VIDEO_UPLOAD_DIR
  ? path.resolve(process.env.VIDEO_UPLOAD_DIR)
  : path.join(os.homedir(), 'Movies');
const VIDEO_CLIP_OUTPUT_DIR = process.env.VIDEO_CLIP_OUTPUT_DIR
  ? path.resolve(process.env.VIDEO_CLIP_OUTPUT_DIR)
  : path.join(os.homedir(), 'Desktop');
const MAX_DURATION_PROBE_FILES = 200;
const MAX_UPLOAD_SIZE_BYTES = (() => {
  const gb = Number(process.env.VIDEO_UPLOAD_MAX_GB);
  const safeGb = Number.isFinite(gb) && gb > 0 ? gb : 500;
  return Math.floor(safeGb * 1024 * 1024 * 1024);
})();

function isVideoFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return VIDEO_EXTENSIONS.has(ext);
}

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

async function ensureOptimizeDir() {
  await fsp.mkdir(OPTIMIZE_DIR, { recursive: true });
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const child = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';

    child.stderr.on('data', (chunk) => {
      stderr += String(chunk || '');
    });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('close', (code) => {
      if (code === 0) return resolve();
      reject(new Error(stderr || `ffmpeg exited with code ${code}`));
    });
  });
}

async function walkVideos(rootPath, recursive, maxFiles) {
  const results = [];

  async function walk(currentPath, depth) {
    if (results.length >= maxFiles) return;
    if (depth > MAX_DEPTH) return;

    let entries = [];
    try {
      entries = await fsp.readdir(currentPath, { withFileTypes: true });
    } catch (error) {
      return;
    }

    for (const entry of entries) {
      if (results.length >= maxFiles) break;

      const fullPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        if (recursive) {
          await walk(fullPath, depth + 1);
        }
        continue;
      }

      if (!entry.isFile() || !isVideoFile(fullPath)) continue;

      try {
        const stat = await fsp.stat(fullPath);
        results.push({
          name: entry.name,
          path: fullPath,
          size: stat.size,
          mtime: stat.mtimeMs
        });
      } catch (error) {
        // ignore inaccessible file
      }
    }
  }

  await walk(rootPath, 0);
  return results;
}

async function probeDurationSeconds(filePath) {
  try {
    const { stdout } = await execFileAsync('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      filePath
    ], { timeout: 6000, maxBuffer: 128 * 1024 });
    const duration = Number.parseFloat(String(stdout || '').trim());
    if (!Number.isFinite(duration) || duration <= 0) return 0;
    return duration;
  } catch (error) {
    return 0;
  }
}

function parseMaxFiles(input) {
  const num = Number.parseInt(input, 10);
  if (Number.isNaN(num) || num <= 0) return DEFAULT_MAX_FILES;
  return Math.min(num, 10000);
}

function resolveAndValidatePath(inputPath) {
  if (typeof inputPath !== 'string' || !inputPath.trim()) {
    return { ok: false, error: 'path 不能为空' };
  }

  const resolved = path.resolve(inputPath.trim());
  if (!path.isAbsolute(resolved)) {
    return { ok: false, error: 'path 必须是绝对路径' };
  }
  return { ok: true, value: resolved };
}

async function ensureVideoDataDir() {
  await fsp.mkdir(VIDEO_DATA_DIR, { recursive: true });
}

async function ensureVideoUploadDir() {
  await fsp.mkdir(VIDEO_UPLOAD_DIR, { recursive: true });
}

async function ensureVideoClipOutputDir() {
  await fsp.mkdir(VIDEO_CLIP_OUTPUT_DIR, { recursive: true });
}

function safeFileName(input) {
  const raw = String(input || '').trim();
  const base = path.basename(raw).replace(/[^\w.\-()\u4e00-\u9fa5 ]+/g, '_');
  return base || `video_${Date.now()}.mp4`;
}

function maxUploadText() {
  const gb = Math.max(1, Math.floor(MAX_UPLOAD_SIZE_BYTES / (1024 * 1024 * 1024)));
  return `${gb}GB`;
}

function normalizeVideoItem(item) {
  if (!item || typeof item !== 'object') return null;

  const now = Date.now();
  const createdAt = Number(item.createdAt) || now;
  const updatedAt = Number(item.updatedAt) || createdAt;
  const title = String(item.title || '').trim();
  const url = String(item.url || '').trim();
  if (!title || !url) return null;

  return {
    id: String(item.id || `video_${updatedAt}`),
    title,
    url,
    category: String(item.category || '').trim(),
    collection: String(item.collection || '').trim(),
    episodeNo: Number(item.episodeNo) > 0 ? Math.floor(Number(item.episodeNo)) : null,
    status: ['watchlist', 'watching', 'completed'].includes(String(item.status))
      ? String(item.status)
      : 'watchlist',
    tags: Array.isArray(item.tags)
      ? item.tags.map((tag) => String(tag || '').trim()).filter(Boolean).slice(0, 20)
      : [],
    note: String(item.note || ''),
    localPath: item.localPath ? String(item.localPath) : null,
    optimizedPath: item.optimizedPath ? String(item.optimizedPath) : '',
    mediaDuration: Number(item.mediaDuration) > 0 ? Number(item.mediaDuration) : 0,
    progressTime: Number(item.progressTime) > 0 ? Number(item.progressTime) : 0,
    progressDuration: Number(item.progressDuration) > 0 ? Number(item.progressDuration) : 0,
    progressUpdatedAt: Number(item.progressUpdatedAt) > 0 ? Number(item.progressUpdatedAt) : 0,
    createdAt,
    updatedAt
  };
}

function normalizeVideoList(items) {
  if (!Array.isArray(items)) return [];
  const seen = new Set();
  const normalized = [];
  for (const item of items) {
    const parsed = normalizeVideoItem(item);
    if (!parsed || seen.has(parsed.id)) continue;
    seen.add(parsed.id);
    normalized.push(parsed);
  }
  return normalized.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

async function readVideoLibrary() {
  try {
    const raw = await fsp.readFile(VIDEO_LIBRARY_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return normalizeVideoList(parsed?.items || []);
  } catch (error) {
    return [];
  }
}

async function writeVideoLibrary(items) {
  await ensureVideoDataDir();
  const normalized = normalizeVideoList(items);
  const payload = {
    updatedAt: Date.now(),
    count: normalized.length,
    items: normalized
  };
  await fsp.writeFile(VIDEO_LIBRARY_FILE, JSON.stringify(payload, null, 2), 'utf8');
  return normalized;
}

function extractPathFromVideoUrl(rawUrl) {
  const text = String(rawUrl || '').trim();
  if (!text) return '';
  try {
    const parsed = new URL(text, 'http://placeholder.local');
    const endpoint = parsed.pathname || '';
    if (!endpoint.endsWith('/api/videos/stream') && !endpoint.endsWith('/api/videos/download')) {
      return '';
    }
    const pathParam = parsed.searchParams.get('path') || '';
    if (!pathParam) return '';
    return path.resolve(decodeURIComponent(pathParam));
  } catch (error) {
    return '';
  }
}

function normalizeLocalVideoItemForMigration(item) {
  const originalUrl = String(item?.url || '').trim();
  const localPath = item?.localPath ? String(item.localPath).trim() : '';
  const optimizedPath = item?.optimizedPath ? String(item.optimizedPath).trim() : '';
  const extractedPath = extractPathFromVideoUrl(originalUrl);

  const next = { ...item };
  let changed = false;
  let recoveredLocalPath = false;
  const issues = [];

  if (!localPath && extractedPath) {
    next.localPath = extractedPath;
    changed = true;
    recoveredLocalPath = true;
    issues.push('recovered_localPath');
  }

  const effectiveLocalPath = String(next.localPath || '').trim();
  const effectiveOptimizedPath = optimizedPath;
  const expectedPath = effectiveOptimizedPath || effectiveLocalPath;

  if (originalUrl.includes('localhost') || originalUrl.includes('127.0.0.1')) {
    issues.push('host_locked_url');
  }
  if (effectiveLocalPath && !originalUrl) {
    issues.push('missing_stream_url');
  }
  if (!effectiveLocalPath && originalUrl && extractedPath) {
    issues.push('missing_localPath');
  }

  if (expectedPath) {
    const expectedUrl = `/api/videos/stream?path=${encodeURIComponent(expectedPath)}`;
    if (originalUrl !== expectedUrl) {
      next.url = expectedUrl;
      next.updatedAt = Date.now();
      changed = true;
      issues.push('stream_url_mismatch');
    }
  }

  return {
    item: next,
    changed,
    recoveredLocalPath,
    issues: Array.from(new Set(issues))
  };
}

// POST /api/videos/upload?filename=...
router.post('/upload', async (req, res) => {
  let fullPath = '';
  try {
    const filename = safeFileName(req.query.filename || req.headers['x-file-name']);
    const ext = path.extname(filename).toLowerCase();
    if (!VIDEO_EXTENSIONS.has(ext)) {
      return res.status(400).json({ error: '仅支持上传视频文件（mp4/mkv/mov/avi/webm/m4v/flv/wmv）' });
    }

    await ensureVideoUploadDir();
    const finalName = `${Date.now()}_${Math.random().toString(16).slice(2, 8)}_${filename}`;
    fullPath = path.join(VIDEO_UPLOAD_DIR, finalName);
    const output = fs.createWriteStream(fullPath, { flags: 'wx' });

    let totalBytes = 0;
    await new Promise((resolve, reject) => {
      req.on('data', (chunk) => {
        totalBytes += chunk.length;
        if (totalBytes > MAX_UPLOAD_SIZE_BYTES) {
          req.destroy(new Error(`上传文件过大，最大支持 ${maxUploadText()}`));
        }
      });
      req.on('error', reject);
      output.on('error', reject);
      output.on('finish', resolve);
      req.pipe(output);
    });

    const stat = await fsp.stat(fullPath);
    const duration = await probeDurationSeconds(fullPath);
    return res.json({
      fileName: filename,
      size: stat.size,
      path: fullPath,
      duration,
      streamUrl: `/api/videos/stream?path=${encodeURIComponent(fullPath)}`,
      downloadUrl: `/api/videos/download?path=${encodeURIComponent(fullPath)}`
    });
  } catch (error) {
    if (fullPath) {
      await fsp.rm(fullPath, { force: true }).catch(() => {});
    }
    const message = error.message || '上传失败';
    const status = /过大|too large/i.test(message) ? 413 : 400;
    return res.status(status).json({ error: message });
  }
});

// GET /api/videos/library
router.get('/library', async (req, res) => {
  try {
    const items = await readVideoLibrary();
    res.json({
      count: items.length,
      items
    });
  } catch (error) {
    console.error('读取视频库失败:', error);
    res.status(500).json({ error: '读取视频库失败' });
  }
});

// PUT /api/videos/library
router.put('/library', async (req, res) => {
  try {
    const items = await writeVideoLibrary(req.body?.items || []);
    res.json({
      count: items.length,
      items
    });
  } catch (error) {
    console.error('保存视频库失败:', error);
    res.status(500).json({ error: '保存视频库失败' });
  }
});

// GET /api/videos/diagnose-legacy
router.get('/diagnose-legacy', async (req, res) => {
  try {
    const items = await readVideoLibrary();
    let localVideoCount = 0;
    let missingLocalPathCount = 0;
    let streamUrlMismatchCount = 0;
    let hostLockedUrlCount = 0;
    let recoverableLocalPathCount = 0;
    const samples = [];

    for (const item of items) {
      const rawUrl = String(item?.url || '').trim();
      const localPath = String(item?.localPath || '').trim();
      const extracted = extractPathFromVideoUrl(rawUrl);
      const isLocalCandidate = Boolean(localPath || extracted);
      if (!isLocalCandidate) continue;
      localVideoCount += 1;
      if (!localPath) missingLocalPathCount += 1;
      if (!localPath && extracted) recoverableLocalPathCount += 1;

      const normalized = normalizeLocalVideoItemForMigration(item);
      if (normalized.issues.includes('stream_url_mismatch')) streamUrlMismatchCount += 1;
      if (normalized.issues.includes('host_locked_url')) hostLockedUrlCount += 1;

      if (normalized.issues.length > 0 && samples.length < 20) {
        samples.push({
          id: item.id,
          title: item.title || '',
          localPath: localPath || extracted || '',
          issues: normalized.issues
        });
      }
    }

    return res.json({
      total: items.length,
      localVideoCount,
      missingLocalPathCount,
      recoverableLocalPathCount,
      streamUrlMismatchCount,
      hostLockedUrlCount,
      sample: samples
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || '诊断失败' });
  }
});

// POST /api/videos/migrate-legacy
router.post('/migrate-legacy', async (req, res) => {
  try {
    const items = await readVideoLibrary();
    let changedCount = 0;
    let recoveredLocalPathCount = 0;
    const migrated = items.map((item) => {
      const normalized = normalizeLocalVideoItemForMigration(item);
      if (normalized.changed) changedCount += 1;
      if (normalized.recoveredLocalPath) recoveredLocalPathCount += 1;
      return normalized.item;
    });

    const savedItems = changedCount > 0 ? await writeVideoLibrary(migrated) : items;
    return res.json({
      total: savedItems.length,
      changedCount,
      recoveredLocalPathCount
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || '迁移失败' });
  }
});

// POST /api/videos/scan
router.post('/scan', async (req, res) => {
  const { rootPath, recursive = true, maxFiles, includeDuration = false } = req.body || {};
  const validated = resolveAndValidatePath(rootPath);
  if (!validated.ok) {
    return res.status(400).json({ error: validated.error });
  }

  try {
    const stat = await fsp.stat(validated.value);
    if (!stat.isDirectory()) {
      return res.status(400).json({ error: 'rootPath 必须是目录' });
    }
  } catch (error) {
    return res.status(400).json({ error: '目录不存在或无法访问' });
  }

  try {
    const files = await walkVideos(validated.value, Boolean(recursive), parseMaxFiles(maxFiles));
    const canProbe = Boolean(includeDuration);
    const limited = canProbe ? files.slice(0, MAX_DURATION_PROBE_FILES) : [];
    const durationMap = new Map();
    if (limited.length > 0) {
      await Promise.all(limited.map(async (item) => {
        const sec = await probeDurationSeconds(item.path);
        if (sec > 0) durationMap.set(item.path, sec);
      }));
    }

    const items = files.map((item) => {
      const sec = durationMap.get(item.path) || 0;
      return {
        ...item,
        duration: sec,
        streamUrl: `/api/videos/stream?path=${encodeURIComponent(item.path)}`,
        downloadUrl: `/api/videos/download?path=${encodeURIComponent(item.path)}`
      };
    });

    res.json({
      rootPath: validated.value,
      count: items.length,
      items,
      durationProbed: canProbe ? Math.min(files.length, MAX_DURATION_PROBE_FILES) : 0
    });
  } catch (error) {
    console.error('扫描视频失败:', error);
    res.status(500).json({ error: error.message || '扫描失败' });
  }
});

// POST /api/videos/optimize
router.post('/optimize', async (req, res) => {
  const { path: inputPath, mode = 'faststart' } = req.body || {};
  const validated = resolveAndValidatePath(inputPath);
  if (!validated.ok) {
    return res.status(400).json({ error: validated.error });
  }

  let sourceStat;
  try {
    sourceStat = await fsp.stat(validated.value);
    if (!sourceStat.isFile()) {
      return res.status(400).json({ error: '指定路径不是文件' });
    }
  } catch (error) {
    return res.status(404).json({ error: '文件不存在或不可访问' });
  }

  try {
    await ensureOptimizeDir();
    const keyBase = `${validated.value}|${sourceStat.size}|${sourceStat.mtimeMs}|${mode}`;
    const hash = crypto.createHash('sha1').update(keyBase).digest('hex');
    const outputPath = path.join(OPTIMIZE_DIR, `${hash}.mp4`);

    let cached = false;
    try {
      const st = await fsp.stat(outputPath);
      cached = st.isFile() && st.size > 0;
    } catch (error) {
      cached = false;
    }

    if (!cached) {
      const args = mode === 'transcode'
        ? [
            '-y',
            '-i', validated.value,
            '-c:v', 'libx264',
            '-preset', 'veryfast',
            '-crf', '23',
            '-c:a', 'aac',
            '-b:a', '128k',
            '-movflags', '+faststart',
            outputPath
          ]
        : [
            '-y',
            '-i', validated.value,
            '-c', 'copy',
            '-movflags', '+faststart',
            outputPath
          ];

      await runFfmpeg(args);
    }

    return res.json({
      sourcePath: validated.value,
      optimizedPath: outputPath,
      cached,
      mode,
      streamUrl: `/api/videos/stream?path=${encodeURIComponent(outputPath)}`,
      downloadUrl: `/api/videos/download?path=${encodeURIComponent(outputPath)}`
    });
  } catch (error) {
    const detail = String(error?.message || '');
    if (detail.includes('spawn ffmpeg ENOENT')) {
      return res.status(500).json({ error: '未检测到 ffmpeg，请先安装 ffmpeg 后重试' });
    }
    console.error('视频优化失败:', error);
    return res.status(500).json({ error: '视频优化失败，请稍后重试' });
  }
});

// POST /api/videos/clip
router.post('/clip', async (req, res) => {
  const { path: inputPath, startSec = 0, endSec } = req.body || {};
  const validated = resolveAndValidatePath(inputPath);
  if (!validated.ok) {
    return res.status(400).json({ error: validated.error });
  }

  let sourceStat;
  try {
    sourceStat = await fsp.stat(validated.value);
    if (!sourceStat.isFile()) {
      return res.status(400).json({ error: '指定路径不是文件' });
    }
  } catch (error) {
    return res.status(404).json({ error: '文件不存在或不可访问' });
  }

  const start = Math.max(0, Number(startSec) || 0);
  const end = Number(endSec);
  if (!Number.isFinite(end) || end <= start) {
    return res.status(400).json({ error: '结束时间必须大于开始时间' });
  }
  const duration = end - start;
  if (duration <= 0) {
    return res.status(400).json({ error: '剪切时长必须大于 0 秒' });
  }

  try {
    await ensureVideoClipOutputDir();
    const parsed = path.parse(validated.value);
    const outputPath = path.join(
      VIDEO_CLIP_OUTPUT_DIR,
      `${parsed.name}_clip_${Date.now()}.mp4`
    );

    await runFfmpeg([
      '-y',
      '-ss', String(start),
      '-i', validated.value,
      '-t', String(duration),
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '23',
      '-c:a', 'aac',
      '-b:a', '160k',
      '-movflags', '+faststart',
      outputPath
    ]);

    return res.json({
      sourcePath: validated.value,
      outputPath,
      startSec: start,
      endSec: end,
      durationSec: duration,
      streamUrl: `/api/videos/stream?path=${encodeURIComponent(outputPath)}`,
      downloadUrl: `/api/videos/download?path=${encodeURIComponent(outputPath)}`
    });
  } catch (error) {
    const detail = String(error?.message || '');
    if (detail.includes('spawn ffmpeg ENOENT')) {
      return res.status(500).json({ error: '未检测到 ffmpeg，请先安装 ffmpeg 后重试' });
    }
    console.error('视频剪切失败:', error);
    return res.status(500).json({ error: '视频剪切失败，请稍后重试' });
  }
});

// GET /api/videos/stream?path=...
router.get('/stream', async (req, res) => {
  const validated = resolveAndValidatePath(String(req.query.path || ''));
  if (!validated.ok) {
    return res.status(400).json({ error: validated.error });
  }

  let stat;
  try {
    stat = await fsp.stat(validated.value);
    if (!stat.isFile()) {
      return res.status(400).json({ error: '指定路径不是文件' });
    }
  } catch (error) {
    return res.status(404).json({ error: '文件不存在或不可访问' });
  }

  const fileSize = stat.size;
  const range = req.headers.range;
  const contentType = contentTypeFor(validated.value);

  res.set('Accept-Ranges', 'bytes');
  res.set('Cache-Control', 'public, max-age=3600');
  res.set('Content-Type', contentType);

  if (range) {
    const parsed = resolveRange(range, fileSize);
    if (!parsed) {
      return res.status(416).set('Content-Range', `bytes */${fileSize}`).end();
    }

    const { start, end } = parsed;
    const chunkSize = end - start + 1;

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': contentType
    });
    fs.createReadStream(validated.value, { start, end }).pipe(res);
    return;
  }

  res.writeHead(200, {
    'Content-Length': fileSize,
    'Content-Type': contentType,
    'Accept-Ranges': 'bytes'
  });
  fs.createReadStream(validated.value).pipe(res);
});

// GET /api/videos/download?path=...
router.get('/download', async (req, res) => {
  const validated = resolveAndValidatePath(String(req.query.path || ''));
  if (!validated.ok) {
    return res.status(400).json({ error: validated.error });
  }

  try {
    const stat = await fsp.stat(validated.value);
    if (!stat.isFile()) {
      return res.status(400).json({ error: '指定路径不是文件' });
    }
    return res.download(validated.value, path.basename(validated.value));
  } catch (error) {
    return res.status(404).json({ error: '文件不存在或不可访问' });
  }
});

export default router;
