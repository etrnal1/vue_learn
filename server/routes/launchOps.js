import express from 'express';
import fsp from 'fs/promises';
import path from 'path';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { requireAuth } from '../middleware/rbac.js';

const router = express.Router();
const execFileAsync = promisify(execFile);

const DATA_DIR = path.resolve('server/data/launch-ops');
const STATE_FILE = path.join(DATA_DIR, 'state.json');
const MAX_THREAD = 200;
const MAX_OUTPUT = 2000;
const MAX_TASKS = 500;
const MAX_RELATED = 800;
const ALLOWED_PREFIX = new Set(['open', 'npm', 'pnpm', 'yarn', 'node', 'git', 'brew', 'osascript', 'launchctl']);

let loaded = false;
let previousCpuSnapshot = readCpuSnapshot();
const state = {
  tasks: [],
  thread: [],
  relatedTasks: []
};

function now() {
  return Date.now();
}

function readCpuSnapshot() {
  return os.cpus().map((cpu) => {
    const times = cpu.times || {};
    const idle = Number(times.idle || 0);
    const total = Object.values(times).reduce((sum, value) => sum + Number(value || 0), 0);
    return { idle, total };
  });
}

function getCpuUsagePercent() {
  const current = readCpuSnapshot();
  const fallback = Math.min(100, Math.max(0, (os.loadavg?.()[0] || 0) * 100 / Math.max(1, os.cpus().length)));

  if (!Array.isArray(previousCpuSnapshot) || previousCpuSnapshot.length !== current.length) {
    previousCpuSnapshot = current;
    return Number(fallback.toFixed(1));
  }

  let totalDelta = 0;
  let idleDelta = 0;

  for (let i = 0; i < current.length; i += 1) {
    const total = current[i].total - previousCpuSnapshot[i].total;
    const idle = current[i].idle - previousCpuSnapshot[i].idle;
    totalDelta += Math.max(0, total);
    idleDelta += Math.max(0, idle);
  }

  previousCpuSnapshot = current;

  if (totalDelta <= 0) {
    return Number(fallback.toFixed(1));
  }

  const usage = (1 - idleDelta / totalDelta) * 100;
  return Number(Math.min(100, Math.max(0, usage)).toFixed(1));
}

function formatTime(ts) {
  const d = new Date(Number(ts || Date.now()));
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function pushThread(author, content, level = 'info') {
  state.thread.unshift({
    id: `th_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    author: String(author || 'system'),
    content: String(content || ''),
    level,
    time: formatTime(Date.now()),
    createdAt: Date.now()
  });
  state.thread = state.thread.slice(0, MAX_THREAD);
}

function mapLaunchStatusToRelated(status, lastResult = null) {
  if (status === 'running') return 'doing';
  if (status === 'warning') return 'blocked';
  if (lastResult === 'success') return 'done';
  return 'todo';
}

function appendRelatedTaskEvent(task, action, statusOverride = null) {
  const safeAction = String(action || '变更');
  const status = statusOverride || mapLaunchStatusToRelated(task?.status, task?.lastResult);
  const priority = task?.riskLevel === 'high' ? 'High' : (task?.riskLevel === 'medium' ? 'Medium' : 'Low');
  const owner = String(task?.createdBy || 'system');
  state.relatedTasks.unshift({
    id: `rel_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    launchTaskId: String(task?.id || ''),
    title: `${safeAction}：${String(task?.name || '未命名任务')}`,
    owner,
    priority,
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('zh-CN'),
    status,
    createdAt: Date.now()
  });
  state.relatedTasks = state.relatedTasks.slice(0, MAX_RELATED);
}

function createDefaultTasks() {
  const baseTs = Date.now();
  return [
    {
      id: `launch_${baseTs}_bootstrap_1`,
      name: '启动开发环境',
      category: 'Launch',
      command: 'open -a iTerm',
      impact: '拉起终端并准备开发会话',
      rollback: '关闭 iTerm 应用',
      riskLevel: 'low',
      cooldownMs: 60 * 1000,
      cooldownSec: 60,
      status: 'ready',
      lastRun: '',
      createdAt: baseTs,
      updatedAt: baseTs,
      createdBy: 'system',
      runCount: 0,
      successCount: 0,
      failCount: 0,
      lastResult: null,
      lastOutput: ''
    },
    {
      id: `launch_${baseTs}_bootstrap_2`,
      name: '同步代码仓库',
      category: 'Sync',
      command: 'git status',
      impact: '检查本地仓库状态',
      rollback: '无需回滚',
      riskLevel: 'medium',
      cooldownMs: 120 * 1000,
      cooldownSec: 120,
      status: 'ready',
      lastRun: '',
      createdAt: baseTs,
      updatedAt: baseTs,
      createdBy: 'system',
      runCount: 0,
      successCount: 0,
      failCount: 0,
      lastResult: null,
      lastOutput: ''
    }
  ];
}

function normalizeTask(input, existing = null, authUser = null) {
  const current = existing || {};
  const id = current.id || `launch_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
  const name = String(input?.name ?? current.name ?? '').trim();
  const category = String(input?.category ?? current.category ?? 'Launch').trim() || 'Launch';
  const command = String(input?.command ?? current.command ?? '').trim();
  const impact = String(input?.impact ?? current.impact ?? '').trim();
  const rollback = String(input?.rollback ?? current.rollback ?? '').trim();
  const riskLevel = String(input?.riskLevel ?? current.riskLevel ?? 'low').trim();
  const cooldownMsRaw = Number(input?.cooldownMs ?? current.cooldownMs ?? 0);
  const cooldownMs = Number.isFinite(cooldownMsRaw) ? Math.max(0, Math.round(cooldownMsRaw)) : 0;

  if (name.length < 2 || name.length > 40) {
    throw new Error('任务名称长度需在 2-40 个字符之间');
  }
  if (!command) {
    throw new Error('执行命令不能为空');
  }

  const prefix = command.split(/\s+/)[0]?.trim();
  if (!ALLOWED_PREFIX.has(prefix)) {
    throw new Error(`命令前缀不允许，仅支持：${Array.from(ALLOWED_PREFIX).join(', ')}`);
  }

  if (/(&&|\|\||;|`|\$\(|\n|\r)/.test(command)) {
    throw new Error('命令不支持链式或多行执行，请拆分为单条命令');
  }

  const duplicate = state.tasks.find((item) => item.name === name && item.id !== id);
  if (duplicate) {
    throw new Error('任务名称已存在');
  }

  const safeRisk = ['low', 'medium', 'high'].includes(riskLevel) ? riskLevel : 'low';
  const createdAt = Number(current.createdAt || Date.now());
  const updatedAt = Date.now();

  return {
    ...current,
    id,
    name,
    category,
    command,
    impact,
    rollback,
    riskLevel: safeRisk,
    cooldownMs,
    cooldownSec: Math.floor(cooldownMs / 1000),
    status: current.status || 'ready',
    lastRun: current.lastRun || '',
    createdAt,
    updatedAt,
    createdBy: current.createdBy || String(authUser?.id || authUser?.name || 'system'),
    runCount: Number(current.runCount || 0),
    successCount: Number(current.successCount || 0),
    failCount: Number(current.failCount || 0),
    lastResult: current.lastResult || null,
    lastOutput: current.lastOutput || ''
  };
}

async function ensureLoaded() {
  if (loaded) return;
  loaded = true;
  try {
    await fsp.mkdir(DATA_DIR, { recursive: true });
    const raw = await fsp.readFile(STATE_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    const tasks = Array.isArray(parsed?.tasks) ? parsed.tasks : [];
    state.tasks = tasks.map((task) => ({
      ...task,
      cooldownMs: Number(task?.cooldownMs ?? (Number(task?.cooldownSec || 0) * 1000) ?? 0),
      cooldownSec: Math.floor(Number(task?.cooldownMs ?? (Number(task?.cooldownSec || 0) * 1000) ?? 0) / 1000)
    }));
    state.thread = Array.isArray(parsed?.thread) ? parsed.thread.slice(0, MAX_THREAD) : [];
    state.relatedTasks = Array.isArray(parsed?.relatedTasks) ? parsed.relatedTasks.slice(0, MAX_RELATED) : [];
  } catch (_error) {
    state.tasks = [];
    state.thread = [];
    state.relatedTasks = [];
  }

  if (state.tasks.length === 0) {
    state.tasks = createDefaultTasks();
    pushThread('launch-bot', '已初始化默认 Launch 任务（系统自动创建）');
    state.tasks.forEach((task) => appendRelatedTaskEvent(task, '初始化', 'todo'));
    await saveState();
  }
}

async function saveState() {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  const payload = {
    updatedAt: Date.now(),
    tasks: state.tasks.slice(0, MAX_TASKS),
    thread: state.thread.slice(0, MAX_THREAD),
    relatedTasks: state.relatedTasks.slice(0, MAX_RELATED)
  };
  await fsp.writeFile(STATE_FILE, JSON.stringify(payload, null, 2), 'utf8');
}

function buildRelatedTasks() {
  if (state.relatedTasks.length > 0) {
    return state.relatedTasks
      .slice()
      .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
      .slice(0, 120);
  }

  return state.tasks
    .slice()
    .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0))
    .slice(0, 80)
    .map((task) => ({
      id: `fallback_${task.id}`,
      title: task.name,
      owner: task.createdBy || 'system',
      priority: task.riskLevel === 'high' ? 'High' : (task.riskLevel === 'medium' ? 'Medium' : 'Low'),
      dueDate: new Date(Number(task.updatedAt || Date.now()) + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('zh-CN'),
      status: mapLaunchStatusToRelated(task.status, task.lastResult),
      createdAt: Number(task.updatedAt || Date.now())
    }));
}

function buildMonitor() {
  const cpu = getCpuUsagePercent();
  const totalMemoryBytes = os.totalmem();
  const freeMemoryBytes = os.freemem();
  const usedMemoryBytes = Math.max(0, totalMemoryBytes - freeMemoryBytes);
  const memory = totalMemoryBytes > 0
    ? Number(((usedMemoryBytes / totalMemoryBytes) * 100).toFixed(1))
    : 0;

  const runningCount = state.tasks.filter((item) => item.status === 'running').length;
  const totalRuns = state.tasks.reduce((sum, item) => sum + Number(item.runCount || 0), 0);
  const successRuns = state.tasks.reduce((sum, item) => sum + Number(item.successCount || 0), 0);
  const successRate = totalRuns > 0 ? Number(((successRuns / totalRuns) * 100).toFixed(1)) : 100;

  return {
    cpu,
    memory,
    queue: runningCount,
    successRate,
    updatedAt: Date.now(),
    source: 'server'
  };
}

function buildServiceHealth(monitor) {
  const taskCount = state.tasks.length;
  const hasRecentFailure = state.tasks.some((item) => item.lastResult === 'fail');
  return [
    { name: 'Launch Controller', value: Math.max(1, Math.round(100 - monitor.cpu)) },
    { name: 'Task Store', value: taskCount > 0 ? (hasRecentFailure ? 82 : 96) : 88 },
    { name: 'Auth Session', value: 99 },
    { name: 'Metrics Collector', value: Math.max(1, Math.round(100 - monitor.memory)) }
  ];
}

async function runLaunchTask(task) {
  const command = String(task.command || '').trim();
  const [binary, ...args] = command.split(/\s+/).filter(Boolean);

  const startedAt = Date.now();
  try {
    const result = await execFileAsync(binary, args, {
      cwd: process.cwd(),
      timeout: 120000,
      maxBuffer: 1024 * 1024,
      env: process.env
    });
    const stdout = String(result?.stdout || '').trim();
    const stderr = String(result?.stderr || '').trim();

    task.status = 'ready';
    task.lastRun = formatTime(startedAt);
    task.updatedAt = Date.now();
    task.runCount = Number(task.runCount || 0) + 1;
    task.successCount = Number(task.successCount || 0) + 1;
    task.lastResult = 'success';
    task.lastOutput = (stdout || stderr || '执行完成').slice(0, MAX_OUTPUT);
    pushThread('launch-bot', `任务「${task.name}」执行成功`);

    return {
      ok: true,
      output: task.lastOutput,
      durationMs: Date.now() - startedAt
    };
  } catch (error) {
    const stderr = String(error?.stderr || error?.message || '执行失败').trim();

    task.status = 'warning';
    task.lastRun = formatTime(startedAt);
    task.updatedAt = Date.now();
    task.runCount = Number(task.runCount || 0) + 1;
    task.failCount = Number(task.failCount || 0) + 1;
    task.lastResult = 'fail';
    task.lastOutput = stderr.slice(0, MAX_OUTPUT);
    pushThread('launch-bot', `任务「${task.name}」执行失败：${task.lastOutput}`, 'error');

    return {
      ok: false,
      output: task.lastOutput,
      durationMs: Date.now() - startedAt
    };
  }
}

router.use(requireAuth);

router.get('/overview', async (_req, res) => {
  await ensureLoaded();
  const monitor = buildMonitor();
  const serviceHealth = buildServiceHealth(monitor);
  res.json({
    tasks: state.tasks,
    thread: state.thread,
    relatedTasks: buildRelatedTasks(),
    monitor,
    serviceHealth,
    source: 'server'
  });
});

router.get('/monitor', async (_req, res) => {
  await ensureLoaded();
  const monitor = buildMonitor();
  res.json({
    monitor,
    serviceHealth: buildServiceHealth(monitor),
    source: 'server'
  });
});

router.get('/tasks', async (_req, res) => {
  await ensureLoaded();
  res.json({ tasks: state.tasks });
});

router.get('/thread', async (_req, res) => {
  await ensureLoaded();
  res.json({ thread: state.thread });
});

router.post('/thread', async (req, res) => {
  await ensureLoaded();
  const content = String(req.body?.content || '').trim();
  if (!content) {
    return res.status(400).json({ error: '消息内容不能为空' });
  }
  const author = String(req.authUser?.name || req.authUser?.id || 'user');
  pushThread(author, content, 'info');
  await saveState();
  res.status(201).json({ success: true });
});

router.post('/tasks', async (req, res) => {
  await ensureLoaded();
  try {
    const task = normalizeTask(req.body || {}, null, req.authUser);
    state.tasks.unshift(task);
    state.tasks = state.tasks.slice(0, MAX_TASKS);
    pushThread('launch-bot', `创建任务：${task.name}`);
    appendRelatedTaskEvent(task, '创建', 'todo');
    await saveState();
    res.status(201).json(task);
  } catch (error) {
    res.status(400).json({ error: error?.message || '创建失败' });
  }
});

router.put('/tasks/:id', async (req, res) => {
  await ensureLoaded();
  const id = String(req.params.id || '').trim();
  const index = state.tasks.findIndex((item) => item.id === id);
  if (index < 0) return res.status(404).json({ error: '任务不存在' });

  try {
    const task = normalizeTask(req.body || {}, state.tasks[index], req.authUser);
    state.tasks[index] = task;
    pushThread('launch-bot', `更新任务：${task.name}`);
    appendRelatedTaskEvent(task, '更新', 'todo');
    await saveState();
    res.json(task);
  } catch (error) {
    res.status(400).json({ error: error?.message || '更新失败' });
  }
});

router.delete('/tasks/:id', async (req, res) => {
  await ensureLoaded();
  const id = String(req.params.id || '').trim();
  const index = state.tasks.findIndex((item) => item.id === id);
  if (index < 0) return res.status(404).json({ error: '任务不存在' });

  const [removed] = state.tasks.splice(index, 1);
  pushThread('launch-bot', `删除任务：${removed?.name || id}`);
  appendRelatedTaskEvent(removed || { id, name: id, riskLevel: 'low', createdBy: 'system' }, '删除', 'done');
  await saveState();
  res.json({ success: true });
});

router.post('/tasks/:id/run', async (req, res) => {
  await ensureLoaded();
  const id = String(req.params.id || '').trim();
  const task = state.tasks.find((item) => item.id === id);
  if (!task) return res.status(404).json({ error: '任务不存在' });

  if (task.riskLevel === 'high' && req.body?.confirm !== true) {
    return res.status(400).json({ error: '高风险任务需要 confirm=true 才能执行' });
  }

  task.status = 'running';
  task.updatedAt = Date.now();
  await saveState();

  const result = await runLaunchTask(task);
  appendRelatedTaskEvent(task, '执行', mapLaunchStatusToRelated(task.status, task.lastResult));
  await saveState();
  res.json({
    ...result,
    task
  });
});

export default router;
