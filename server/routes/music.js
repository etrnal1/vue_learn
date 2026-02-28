import express from 'express';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';

const router = express.Router();

const AUDIO_EXTENSIONS = new Set([
  '.mp3', '.wav', '.flac', '.aac', '.m4a', '.ogg', '.wma'
]);

const MIME_BY_EXT = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.flac': 'audio/flac',
  '.aac': 'audio/aac',
  '.m4a': 'audio/mp4',
  '.ogg': 'audio/ogg',
  '.wma': 'audio/x-ms-wma'
};

const DEFAULT_MAX_FILES = 3000;
const MAX_DEPTH = 20;

function isAudioFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return AUDIO_EXTENSIONS.has(ext);
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

function parseMaxFiles(input) {
  const num = Number.parseInt(input, 10);
  if (Number.isNaN(num) || num <= 0) return DEFAULT_MAX_FILES;
  return Math.min(num, 10000);
}

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_BY_EXT[ext] || 'audio/mpeg';
}

async function walkAudios(rootPath, recursive, maxFiles) {
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

      if (!entry.isFile() || !isAudioFile(fullPath)) continue;

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

// POST /api/music/scan
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
    const files = await walkAudios(validated.value, Boolean(recursive), parseMaxFiles(maxFiles));
    const items = files.map((item) => ({
      ...item,
      streamUrl: `/api/music/stream?path=${encodeURIComponent(item.path)}`,
      downloadUrl: `/api/music/download?path=${encodeURIComponent(item.path)}`
    }));

    return res.json({
      rootPath: validated.value,
      count: items.length,
      items
    });
  } catch (error) {
    console.error('扫描音乐失败:', error);
    return res.status(500).json({ error: error.message || '扫描失败' });
  }
});

// GET /api/music/stream?path=...
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

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = Number.parseInt(parts[0], 10);
    const end = parts[1] ? Number.parseInt(parts[1], 10) : fileSize - 1;

    if (Number.isNaN(start) || Number.isNaN(end) || start < 0 || end >= fileSize || start > end) {
      return res.status(416).set('Content-Range', `bytes */${fileSize}`).end();
    }

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

// GET /api/music/download?path=...
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
