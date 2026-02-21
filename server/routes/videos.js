import express from 'express';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { spawn } from 'child_process';

const router = express.Router();

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
    status: ['watchlist', 'watching', 'completed'].includes(String(item.status))
      ? String(item.status)
      : 'watchlist',
    tags: Array.isArray(item.tags)
      ? item.tags.map((tag) => String(tag || '').trim()).filter(Boolean).slice(0, 20)
      : [],
    note: String(item.note || ''),
    localPath: item.localPath ? String(item.localPath) : null,
    optimizedPath: item.optimizedPath ? String(item.optimizedPath) : '',
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

// POST /api/videos/scan
router.post('/scan', async (req, res) => {
  const { rootPath, recursive = true, maxFiles } = req.body || {};
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
    const items = files.map((item) => ({
      ...item,
      streamUrl: `/api/videos/stream?path=${encodeURIComponent(item.path)}`,
      downloadUrl: `/api/videos/download?path=${encodeURIComponent(item.path)}`
    }));

    res.json({
      rootPath: validated.value,
      count: items.length,
      items
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
