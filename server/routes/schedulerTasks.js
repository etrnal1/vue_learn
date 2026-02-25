import express from 'express';
import fsp from 'fs/promises';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const router = express.Router();
const execFileAsync = promisify(execFile);

const DATA_DIR = path.resolve('server/data/scheduler');
const DATA_FILE = path.join(DATA_DIR, 'tasks.json');
const LOG_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_LOGS = 5000;

const state = {
  loaded: false,
  tasks: [],
  logs: [],
  timer: null,
  running: false
};

function now() {
  return Date.now();
}

function trimLogs(logs) {
  const minTime = now() - LOG_RETENTION_MS;
  return (Array.isArray(logs) ? logs : [])
    .filter((item) => Number(item?.time) >= minTime)
    .sort((a, b) => Number(b.time || 0) - Number(a.time || 0))
    .slice(0, MAX_LOGS);
}

function parseTimeParts(text) {
  const value = String(text || '');
  const [h, m] = value.split(':').map((v) => Number(v));
  return {
    hour: Number.isFinite(h) ? Math.max(0, Math.min(23, h)) : 0,
    minute: Number.isFinite(m) ? Math.max(0, Math.min(59, m)) : 0
  };
}

function segmentMatches(segment, value) {
  if (segment === '*') return true;
  if (/^\*\/\d+$/.test(segment)) return value % Number(segment.slice(2)) === 0;
  if (/^\d+$/.test(segment)) return value === Number(segment);
  if (/^\d+-\d+$/.test(segment)) {
    const [a, b] = segment.split('-').map(Number);
    return value >= a && value <= b;
  }
  if (/^\d+-\d+\/\d+$/.test(segment)) {
    const [range, stepRaw] = segment.split('/');
    const [a, b] = range.split('-').map(Number);
    const step = Number(stepRaw);
    return value >= a && value <= b && (value - a) % step === 0;
  }
  return false;
}

function cronFieldMatches(expr, value) {
  return String(expr || '').split(',').map((s) => s.trim()).filter(Boolean).some((p) => segmentMatches(p, value));
}

function isInDateRange(nowDate, range) {
  if (!range || !range.start || !range.end) return true;
  const today = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate()).getTime();
  const start = new Date(`${range.start}T00:00:00`).getTime();
  const end = new Date(`${range.end}T23:59:59`).getTime();
  return today >= start && today <= end;
}

function isInTimeWindow(nowDate, window) {
  if (!window || !window.start || !window.end) return true;
  const startPart = parseTimeParts(window.start);
  const endPart = parseTimeParts(window.end);
  const current = nowDate.getHours() * 60 + nowDate.getMinutes();
  const start = startPart.hour * 60 + startPart.minute;
  const end = endPart.hour * 60 + endPart.minute;
  if (start <= end) return current >= start && current <= end;
  return current >= start || current <= end;
}

function isNthWeekdayMatch(nowDate, condition) {
  if (!condition) return true;
  const weekday = Number(condition.weekday);
  if (nowDate.getDay() !== weekday) return false;
  const nth = condition.nth;
  if (nth === 'last') {
    const nextSame = new Date(nowDate);
    nextSame.setDate(nowDate.getDate() + 7);
    return nextSame.getMonth() !== nowDate.getMonth();
  }
  const target = Number(nth);
  const occur = Math.floor((nowDate.getDate() - 1) / 7) + 1;
  return occur === target;
}

function isCronMatched(task, nowDate) {
  const r = task.rule || {};
  const base = cronFieldMatches(r.year, nowDate.getFullYear()) &&
    cronFieldMatches(r.month, nowDate.getMonth() + 1) &&
    cronFieldMatches(r.day, nowDate.getDate()) &&
    cronFieldMatches(r.hour, nowDate.getHours()) &&
    cronFieldMatches(r.minute, nowDate.getMinutes()) &&
    cronFieldMatches(r.second, nowDate.getSeconds());
  if (!base) return false;
  if (!isInDateRange(nowDate, task.dateRange)) return false;
  if (!isInTimeWindow(nowDate, task.timeWindow)) return false;
  if (Array.isArray(task.weekdayList) && task.weekdayList.length && !task.weekdayList.includes(nowDate.getDay())) return false;
  if (!isNthWeekdayMatch(nowDate, task.monthNthWeekday)) return false;
  return true;
}

function shouldRunInterval(task, currentMs) {
  const intervalMs = Number(task.intervalMinutes || 30) * 60 * 1000;
  const anchor = Number(task.intervalAnchorAt || task.createdAt || currentMs);
  return currentMs - anchor >= intervalMs && (!task.lastRunAt || currentMs - Number(task.lastRunAt) >= intervalMs);
}

async function ensureDataDir() {
  await fsp.mkdir(DATA_DIR, { recursive: true });
}

async function persistState() {
  await ensureDataDir();
  const payload = {
    updatedAt: now(),
    tasks: state.tasks,
    logs: trimLogs(state.logs)
  };
  await fsp.writeFile(DATA_FILE, JSON.stringify(payload, null, 2), 'utf8');
}

function addLog(message, level = 'info') {
  state.logs.unshift({
    id: `${now()}_${Math.random().toString(36).slice(2, 8)}`,
    time: now(),
    level,
    message: String(message || '')
  });
  state.logs = trimLogs(state.logs);
}

function normalizeTask(input, existing = null) {
  const base = existing || {};
  const task = {
    ...base,
    ...input,
    id: existing?.id || String(input?.id || `task_${now()}_${Math.random().toString(36).slice(2, 8)}`),
    name: String(input?.name || existing?.name || '').trim(),
    description: String(input?.description || existing?.description || '').trim(),
    actionType: String(input?.actionType || existing?.actionType || 'log'),
    mode: String(input?.mode || existing?.mode || 'cron'),
    rule: input?.rule || existing?.rule || { year: '*', month: '*', day: '*', hour: '*', minute: '*', second: '*' },
    enabled: input?.enabled ?? existing?.enabled ?? true,
    runCount: Number(input?.runCount ?? existing?.runCount ?? 0),
    lastRunAt: Number(input?.lastRunAt ?? existing?.lastRunAt ?? 0) || null,
    lastMatchedSecond: input?.lastMatchedSecond ?? existing?.lastMatchedSecond ?? null,
    createdAt: Number(input?.createdAt ?? existing?.createdAt ?? now()),
    runAt: input?.runAt ?? existing?.runAt ?? null,
    intervalMinutes: input?.intervalMinutes ?? existing?.intervalMinutes ?? null,
    intervalAnchorAt: input?.intervalAnchorAt ?? existing?.intervalAnchorAt ?? null,
    weekdayList: input?.weekdayList ?? existing?.weekdayList ?? null,
    monthNthWeekday: input?.monthNthWeekday ?? existing?.monthNthWeekday ?? null,
    dateRange: input?.dateRange ?? existing?.dateRange ?? null,
    timeWindow: input?.timeWindow ?? existing?.timeWindow ?? null,
    docScanConfig: input?.docScanConfig ?? existing?.docScanConfig ?? null,
    videoScanConfig: input?.videoScanConfig ?? existing?.videoScanConfig ?? null,
    scriptConfig: input?.scriptConfig ?? existing?.scriptConfig ?? null,
    source: input?.source ?? existing?.source ?? null
  };
  if (!task.name) throw new Error('任务名称不能为空');
  return task;
}

async function executeDocScan(task) {
  const cfg = task.docScanConfig;
  if (!cfg || !Array.isArray(cfg.rootPaths) || cfg.rootPaths.length === 0) {
    throw new Error('目录扫描配置缺失');
  }
  const port = process.env.PORT || 4000;
  const response = await fetch(`http://127.0.0.1:${port}/api/doc-scanner/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rootPaths: cfg.rootPaths,
      recursive: cfg.recursive !== false,
      maxFiles: cfg.maxFiles || 1000,
      includeExts: cfg.includeExts || ['md', 'doc', 'excel', 'txt']
    })
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || `HTTP ${response.status}`);
  }
  addLog(`任务「${task.name}」扫描完成，文件数 ${Number(body?.summary?.count || 0)}`);
}

async function executeScript(task) {
  const cfg = task.scriptConfig;
  if (!cfg || !cfg.scriptType || !cfg.content) throw new Error('脚本配置缺失');
  const scriptType = String(cfg.scriptType).toLowerCase();
  const cmd = scriptType === 'python' ? 'python3' : '/bin/sh';
  const args = scriptType === 'python' ? ['-c', String(cfg.content)] : ['-lc', String(cfg.content)];
  const timeoutMs = Math.max(1000, Math.min(300000, Number(cfg.timeoutSeconds || 30) * 1000));
  const cwd = cfg.cwd ? path.resolve(String(cfg.cwd)) : process.cwd();
  const { stdout } = await execFileAsync(cmd, args, {
    cwd,
    timeout: timeoutMs,
    maxBuffer: 1024 * 1024,
    env: process.env
  });
  const msg = String(stdout || '').trim();
  addLog(`任务「${task.name}」脚本执行成功${msg ? `：${msg.slice(0, 120)}` : ''}`);
}

function buildVideoFromScanItem(item) {
  const nowTs = now();
  return {
    id: `video_${nowTs}_${Math.random().toString(16).slice(2, 6)}`,
    title: String(item?.name || '未命名视频'),
    url: String(item?.streamUrl || ''),
    category: '本地视频',
    collection: '',
    episodeNo: null,
    status: 'watchlist',
    tags: ['local'],
    note: '',
    localPath: String(item?.path || ''),
    optimizedPath: '',
    mediaDuration: Number(item?.duration) > 0 ? Number(item.duration) : 0,
    progressTime: 0,
    progressDuration: 0,
    progressUpdatedAt: 0,
    createdAt: nowTs,
    updatedAt: nowTs
  };
}

async function executeVideoScan(task) {
  const cfg = task.videoScanConfig;
  if (!cfg || !cfg.rootPath) throw new Error('视频扫描配置缺失');
  const rootPath = String(cfg.rootPath || '').trim();
  if (!rootPath) throw new Error('视频扫描路径不能为空');

  const port = process.env.PORT || 4000;
  const scanResp = await fetch(`http://127.0.0.1:${port}/api/videos/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rootPath,
      recursive: cfg.recursive !== false,
      maxFiles: Number(cfg.maxFiles || 3000),
      includeDuration: true
    })
  });
  const scanBody = await scanResp.json().catch(() => ({}));
  if (!scanResp.ok) throw new Error(scanBody.error || `HTTP ${scanResp.status}`);

  const items = Array.isArray(scanBody.items) ? scanBody.items : [];
  let imported = 0;
  if (cfg.autoImport !== false && items.length > 0) {
    const libResp = await fetch(`http://127.0.0.1:${port}/api/videos/library`);
    const libBody = await libResp.json().catch(() => ({}));
    if (!libResp.ok) throw new Error(libBody.error || `HTTP ${libResp.status}`);
    const existing = Array.isArray(libBody.items) ? libBody.items : [];
    const byLocalPath = new Map();
    for (const v of existing) {
      if (v?.localPath) byLocalPath.set(String(v.localPath), v);
    }

    for (const item of items) {
      const localPath = String(item.path || '');
      if (!localPath) continue;
      const matched = byLocalPath.get(localPath);
      const duration = Number(item.duration) > 0 ? Number(item.duration) : 0;
      if (matched) {
        if (duration > 0 && Number(matched.mediaDuration || 0) <= 0) {
          matched.mediaDuration = duration;
          matched.updatedAt = now();
        }
        continue;
      }
      const created = buildVideoFromScanItem(item);
      existing.unshift(created);
      byLocalPath.set(localPath, created);
      imported += 1;
    }

    const saveResp = await fetch(`http://127.0.0.1:${port}/api/videos/library`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: existing })
    });
    const saveBody = await saveResp.json().catch(() => ({}));
    if (!saveResp.ok) throw new Error(saveBody.error || `HTTP ${saveResp.status}`);
  }

  addLog(`任务「${task.name}」视频扫描完成，发现 ${items.length} 个，导入 ${imported} 个`);
}

async function executeTask(task, source = 'auto') {
  const executedAt = now();
  try {
    if (task.actionType === 'doc_scan') {
      await executeDocScan(task);
    } else if (task.actionType === 'video_scan') {
      await executeVideoScan(task);
    } else if (task.actionType === 'script') {
      await executeScript(task);
    }
    task.lastRunAt = executedAt;
    task.runCount = Number(task.runCount || 0) + 1;
    addLog(`任务「${task.name}」已触发（${source === 'manual' ? '手动' : '自动'}）`);
    if (task.mode === 'once') {
      task.enabled = false;
    }
  } catch (error) {
    task.lastRunAt = executedAt;
    addLog(`任务「${task.name}」执行失败：${error.message || '未知错误'}`, 'error');
  }
}

async function schedulerTick() {
  if (state.running) return;
  state.running = true;
  try {
    const nowDate = new Date();
    const currentKey = `${nowDate.getFullYear()}-${nowDate.getMonth() + 1}-${nowDate.getDate()} ${nowDate.getHours()}:${nowDate.getMinutes()}:${nowDate.getSeconds()}`;
    for (const task of state.tasks) {
      if (!task.enabled) continue;
      if (task.mode === 'once') {
        if (task.runAt && nowDate.getTime() >= Number(task.runAt) && Number(task.runCount || 0) === 0) {
          await executeTask(task, 'auto');
        }
        continue;
      }
      if (task.mode === 'interval') {
        if (shouldRunInterval(task, nowDate.getTime())) {
          await executeTask(task, 'auto');
        }
        continue;
      }
      if (task.lastMatchedSecond === currentKey) continue;
      if (isCronMatched(task, nowDate)) {
        task.lastMatchedSecond = currentKey;
        await executeTask(task, 'auto');
      }
    }
    await persistState();
  } finally {
    state.running = false;
  }
}

async function loadState() {
  if (state.loaded) return;
  try {
    const raw = await fsp.readFile(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    state.tasks = Array.isArray(parsed.tasks) ? parsed.tasks : [];
    state.logs = trimLogs(parsed.logs || []);
  } catch {
    state.tasks = [];
    state.logs = [];
  }
  state.loaded = true;
  if (!state.timer) {
    state.timer = setInterval(() => {
      schedulerTick().catch((error) => {
        addLog(`调度器异常：${error.message || '未知错误'}`, 'error');
      });
    }, 1000);
  }
}

function ensureLoaded(req, res, next) {
  loadState().then(() => next()).catch((error) => {
    res.status(500).json({ error: error.message || '调度器初始化失败' });
  });
}

router.use(ensureLoaded);

router.get('/', (req, res) => {
  res.json({ tasks: state.tasks });
});

router.post('/', async (req, res) => {
  try {
    const task = normalizeTask(req.body || {});
    state.tasks.unshift(task);
    await persistState();
    addLog(`任务「${task.name}」创建成功`);
    await persistState();
    res.json({ task });
  } catch (error) {
    res.status(400).json({ error: error.message || '创建任务失败' });
  }
});

router.put('/:id', async (req, res) => {
  const idx = state.tasks.findIndex((item) => item.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: '任务不存在' });
  try {
    const task = normalizeTask(req.body || {}, state.tasks[idx]);
    state.tasks.splice(idx, 1, task);
    await persistState();
    res.json({ task });
  } catch (error) {
    res.status(400).json({ error: error.message || '更新任务失败' });
  }
});

router.delete('/:id', async (req, res) => {
  const task = state.tasks.find((item) => item.id === req.params.id);
  state.tasks = state.tasks.filter((item) => item.id !== req.params.id);
  await persistState();
  if (task) {
    addLog(`任务「${task.name}」已删除`);
    await persistState();
  }
  res.json({ success: true });
});

router.post('/:id/run', async (req, res) => {
  const task = state.tasks.find((item) => item.id === req.params.id);
  if (!task) return res.status(404).json({ error: '任务不存在' });
  await executeTask(task, 'manual');
  await persistState();
  res.json({ success: true, task });
});

router.post('/:id/toggle', async (req, res) => {
  const task = state.tasks.find((item) => item.id === req.params.id);
  if (!task) return res.status(404).json({ error: '任务不存在' });
  task.enabled = !task.enabled;
  await persistState();
  res.json({ task });
});

router.post('/toggle-all', async (req, res) => {
  const enabled = !!req.body?.enabled;
  state.tasks = state.tasks.map((item) => ({ ...item, enabled }));
  await persistState();
  res.json({ tasks: state.tasks });
});

router.get('/logs/all', (req, res) => {
  state.logs = trimLogs(state.logs);
  res.json({ logs: state.logs, total: state.logs.length });
});

router.delete('/logs', async (req, res) => {
  state.logs = [];
  await persistState();
  res.json({ success: true });
});

router.post('/import-legacy-doc-scheduler', async (req, res) => {
  const status = req.body?.status;
  if (!status?.config) {
    return res.status(400).json({ error: '缺少旧版定时配置' });
  }
  const config = status.config;
  const intervalMinutes = Number(config.intervalMinutes || 30);
  const existingIdx = state.tasks.findIndex((item) => item.source === 'legacy-doc-scanner');
  const task = normalizeTask({
    id: existingIdx >= 0 ? state.tasks[existingIdx].id : undefined,
    source: 'legacy-doc-scanner',
    name: '旧版目录扫描任务',
    description: `从 doc-scanner 导入，间隔 ${intervalMinutes} 分钟`,
    actionType: 'doc_scan',
    mode: 'interval',
    intervalMinutes,
    intervalAnchorAt: now(),
    rule: { year: '*', month: '*', day: '*', hour: '*', minute: '*', second: '0' },
    docScanConfig: {
      rootPaths: config.rootPaths || [config.rootPath].filter(Boolean),
      recursive: config.recursive !== false,
      maxFiles: Number(config.maxFiles || 1000),
      includeExts: config.includeExts || ['md', 'doc', 'excel', 'txt']
    },
    enabled: !!status.enabled,
    runCount: 0,
    lastRunAt: status.lastRunAt || null,
    lastMatchedSecond: null,
    createdAt: now()
  }, existingIdx >= 0 ? state.tasks[existingIdx] : null);

  if (existingIdx >= 0) state.tasks.splice(existingIdx, 1, task);
  else state.tasks.unshift(task);

  addLog('已导入旧版目录扫描定时配置');
  await persistState();
  res.json({ task });
});

export default router;
