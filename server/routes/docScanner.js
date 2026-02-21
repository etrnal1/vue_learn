import express from 'express';
import fsp from 'fs/promises';
import path from 'path';

const router = express.Router();

const GROUP_EXTENSIONS = {
  md: ['.md', '.markdown'],
  doc: ['.doc', '.docx'],
  excel: ['.xls', '.xlsx'],
  txt: ['.txt']
};

const ALL_SCAN_EXTENSIONS = new Set(Object.values(GROUP_EXTENSIONS).flat());
const PREVIEWABLE_EXTENSIONS = new Set([
  '.md', '.markdown', '.txt'
]);

const DEFAULT_MAX_FILES = 1000;
const MAX_DEPTH = 20;
const MAX_READ_BYTES = 1024 * 1024; // 1MB

const schedulerState = {
  enabled: false,
  timer: null,
  config: null,
  lastRunAt: null,
  lastResult: null,
  lastError: ''
};

function parseBool(input, fallback = true) {
  if (typeof input === 'boolean') return input;
  if (typeof input === 'string') {
    if (input.toLowerCase() === 'true') return true;
    if (input.toLowerCase() === 'false') return false;
  }
  return fallback;
}

function parseMaxFiles(input) {
  const num = Number.parseInt(input, 10);
  if (Number.isNaN(num) || num <= 0) return DEFAULT_MAX_FILES;
  return Math.min(num, 10000);
}

function parseIntervalMinutes(input) {
  const num = Number.parseInt(input, 10);
  if (Number.isNaN(num) || num <= 0) return 30;
  return Math.min(Math.max(num, 1), 24 * 60);
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

function normalizeRootPaths(rootPath, rootPaths) {
  if (Array.isArray(rootPaths) && rootPaths.length > 0) {
    return rootPaths.map((p) => String(p || '').trim()).filter(Boolean);
  }
  if (typeof rootPath === 'string' && rootPath.trim()) {
    return [rootPath.trim()];
  }
  return [];
}

function isDocFile(filePath, allowedExtSet = ALL_SCAN_EXTENSIONS) {
  const ext = path.extname(filePath).toLowerCase();
  return allowedExtSet.has(ext);
}

function normalizeIncludeExts(input) {
  if (!Array.isArray(input) || input.length === 0) {
    return { groups: ['md', 'doc', 'excel', 'txt'], extSet: ALL_SCAN_EXTENSIONS };
  }

  const groups = [];
  for (const raw of input) {
    const key = String(raw || '').trim().toLowerCase();
    if (GROUP_EXTENSIONS[key] && !groups.includes(key)) groups.push(key);
  }

  if (groups.length === 0) {
    return { groups: ['md', 'doc', 'excel', 'txt'], extSet: ALL_SCAN_EXTENSIONS };
  }

  const extSet = new Set(groups.flatMap((g) => GROUP_EXTENSIONS[g]));
  return { groups, extSet };
}

function buildSummary(items, rootPaths) {
  const byExt = {};
  for (const item of items) {
    const ext = (item.ext || 'none').toLowerCase();
    byExt[ext] = (byExt[ext] || 0) + 1;
  }
  return {
    rootPath: Array.isArray(rootPaths) ? rootPaths[0] || '' : rootPaths,
    rootPaths: Array.isArray(rootPaths) ? rootPaths : [rootPaths].filter(Boolean),
    count: items.length,
    byExt
  };
}

async function walkDocs(rootPath, recursive, maxFiles, allowedExtSet) {
  const items = [];

  async function walk(currentPath, depth) {
    if (items.length >= maxFiles) return;
    if (depth > MAX_DEPTH) return;

    let entries = [];
    try {
      entries = await fsp.readdir(currentPath, { withFileTypes: true });
    } catch (error) {
      return;
    }

    for (const entry of entries) {
      if (items.length >= maxFiles) break;
      const fullPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        if (recursive) {
          await walk(fullPath, depth + 1);
        }
        continue;
      }

      if (!entry.isFile() || !isDocFile(fullPath, allowedExtSet)) continue;

      try {
        const stat = await fsp.stat(fullPath);
        items.push({
          name: entry.name,
          path: fullPath,
          ext: path.extname(fullPath).toLowerCase(),
          size: stat.size,
          mtime: stat.mtimeMs
        });
      } catch (error) {
        // ignore unreadable files
      }
    }
  }

  await walk(rootPath, 0);
  items.sort((a, b) => (b.mtime || 0) - (a.mtime || 0));
  return items;
}

async function runScheduledScan() {
  if (!schedulerState.config) return;

  const { rootPaths, recursive, maxFiles, includeExts } = schedulerState.config;
  const extSelection = normalizeIncludeExts(includeExts);
  const merged = new Map();
  for (const rootPath of rootPaths) {
    const files = await walkDocs(rootPath, recursive, maxFiles, extSelection.extSet);
    for (const item of files) merged.set(item.path, item);
  }
  const files = [...merged.values()].sort((a, b) => (b.mtime || 0) - (a.mtime || 0)).slice(0, maxFiles);
  schedulerState.lastRunAt = Date.now();
  schedulerState.lastError = '';
  schedulerState.lastResult = {
    summary: buildSummary(files, rootPaths),
    topItems: files.slice(0, 200)
  };
}

function stopScheduler() {
  if (schedulerState.timer) {
    clearInterval(schedulerState.timer);
    schedulerState.timer = null;
  }
  schedulerState.enabled = false;
}

function schedulerPayload() {
  return {
    enabled: schedulerState.enabled,
    config: schedulerState.config,
    lastRunAt: schedulerState.lastRunAt,
    lastError: schedulerState.lastError,
    lastResult: schedulerState.lastResult
  };
}

// POST /api/doc-scanner/scan
router.post('/scan', async (req, res) => {
  const { rootPath, rootPaths, recursive = true, maxFiles, includeExts } = req.body || {};
  const inputPaths = normalizeRootPaths(rootPath, rootPaths);
  if (inputPaths.length === 0) {
    return res.status(400).json({ error: '请至少提供一个目录路径' });
  }

  const validatedPaths = [];
  for (const p of inputPaths) {
    const validated = resolveAndValidatePath(p);
    if (!validated.ok) return res.status(400).json({ error: validated.error });
    try {
      const stat = await fsp.stat(validated.value);
      if (!stat.isDirectory()) {
        return res.status(400).json({ error: `目录无效: ${validated.value}` });
      }
      validatedPaths.push(validated.value);
    } catch (error) {
      return res.status(400).json({ error: `目录不存在或无法访问: ${validated.value}` });
    }
  }

  try {
    const extSelection = normalizeIncludeExts(includeExts);
    const merged = new Map();
    const recursiveEnabled = parseBool(recursive, true);
    const max = parseMaxFiles(maxFiles);
    for (const rp of validatedPaths) {
      const files = await walkDocs(rp, recursiveEnabled, max, extSelection.extSet);
      for (const item of files) merged.set(item.path, item);
    }
    const files = [...merged.values()].sort((a, b) => (b.mtime || 0) - (a.mtime || 0)).slice(0, max);
    return res.json({
      summary: buildSummary(files, validatedPaths),
      includeExts: extSelection.groups,
      items: files
    });
  } catch (error) {
    console.error('扫描文档失败:', error);
    return res.status(500).json({ error: error.message || '扫描失败' });
  }
});

// GET /api/doc-scanner/read?path=...
router.get('/read', async (req, res) => {
  const validated = resolveAndValidatePath(String(req.query.path || ''));
  if (!validated.ok) {
    return res.status(400).json({ error: validated.error });
  }

  if (!isDocFile(validated.value, ALL_SCAN_EXTENSIONS)) {
    return res.status(400).json({ error: '当前只支持读取文本类文档后缀' });
  }
  if (!isDocFile(validated.value, PREVIEWABLE_EXTENSIONS)) {
    return res.status(400).json({ error: '该文档格式暂不支持在线阅读预览' });
  }

  try {
    const stat = await fsp.stat(validated.value);
    if (!stat.isFile()) {
      return res.status(400).json({ error: '指定路径不是文件' });
    }

    const bytesToRead = Math.min(stat.size, MAX_READ_BYTES);
    const handle = await fsp.open(validated.value, 'r');
    try {
      const buffer = Buffer.alloc(bytesToRead);
      const { bytesRead } = await handle.read(buffer, 0, bytesToRead, 0);
      const content = buffer.slice(0, bytesRead).toString('utf8');
      return res.json({
        path: validated.value,
        name: path.basename(validated.value),
        size: stat.size,
        truncated: stat.size > MAX_READ_BYTES,
        content
      });
    } finally {
      await handle.close();
    }
  } catch (error) {
    console.error('读取文档失败:', error);
    return res.status(500).json({ error: error.message || '读取失败' });
  }
});

// GET /api/doc-scanner/scheduler
router.get('/scheduler', (req, res) => {
  res.json(schedulerPayload());
});

// POST /api/doc-scanner/scheduler/start
router.post('/scheduler/start', async (req, res) => {
  const { rootPath, rootPaths, recursive = true, maxFiles, intervalMinutes, includeExts } = req.body || {};
  const inputPaths = normalizeRootPaths(rootPath, rootPaths);
  if (inputPaths.length === 0) {
    return res.status(400).json({ error: '请至少提供一个目录路径' });
  }

  const validatedPaths = [];
  for (const p of inputPaths) {
    const validated = resolveAndValidatePath(p);
    if (!validated.ok) return res.status(400).json({ error: validated.error });
    try {
      const stat = await fsp.stat(validated.value);
      if (!stat.isDirectory()) {
        return res.status(400).json({ error: `目录无效: ${validated.value}` });
      }
      validatedPaths.push(validated.value);
    } catch (error) {
      return res.status(400).json({ error: `目录不存在或无法访问: ${validated.value}` });
    }
  }

  const extSelection = normalizeIncludeExts(includeExts);
  const config = {
    rootPath: validatedPaths[0],
    rootPaths: validatedPaths,
    recursive: parseBool(recursive, true),
    maxFiles: parseMaxFiles(maxFiles),
    intervalMinutes: parseIntervalMinutes(intervalMinutes),
    includeExts: extSelection.groups
  };

  stopScheduler();
  schedulerState.enabled = true;
  schedulerState.config = config;

  try {
    await runScheduledScan();
  } catch (error) {
    schedulerState.lastError = error.message || '首次定时扫描失败';
  }

  schedulerState.timer = setInterval(async () => {
    try {
      await runScheduledScan();
    } catch (error) {
      schedulerState.lastError = error.message || '定时扫描失败';
      schedulerState.lastRunAt = Date.now();
    }
  }, config.intervalMinutes * 60 * 1000);

  return res.json(schedulerPayload());
});

// POST /api/doc-scanner/scheduler/stop
router.post('/scheduler/stop', (req, res) => {
  stopScheduler();
  return res.json(schedulerPayload());
});

// POST /api/doc-scanner/scheduler/run
router.post('/scheduler/run', async (req, res) => {
  if (!schedulerState.config) {
    return res.status(400).json({ error: '尚未配置定时扫描' });
  }

  try {
    await runScheduledScan();
    return res.json(schedulerPayload());
  } catch (error) {
    schedulerState.lastError = error.message || '手动触发扫描失败';
    schedulerState.lastRunAt = Date.now();
    return res.status(500).json({ error: schedulerState.lastError });
  }
});

export default router;
