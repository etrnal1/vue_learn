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
const HOST_SERVICE_SCAN_TTL_MS = 15 * 1000;

let loaded = false;
let previousCpuSnapshot = readCpuSnapshot();
let hostServiceSnapshot = {
  expiresAt: 0,
  payload: null
};
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

async function runSystemCommand(binary, args = []) {
  try {
    const result = await execFileAsync(binary, args, {
      cwd: process.cwd(),
      timeout: 12000,
      maxBuffer: 1024 * 1024,
      env: process.env
    });
    return {
      ok: true,
      stdout: String(result?.stdout || ''),
      stderr: String(result?.stderr || '')
    };
  } catch (error) {
    return {
      ok: false,
      stdout: String(error?.stdout || ''),
      stderr: String(error?.stderr || error?.message || '')
    };
  }
}

function parseBrewServices(stdout) {
  return String(stdout || '')
    .split('\n')
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\s+/).filter(Boolean);
      const name = parts[0] || '';
      const status = parts[1] || 'unknown';
      const user = parts[2] && !parts[2].startsWith('~/') && !parts[2].startsWith('/') ? parts[2] : '';
      const plistPath = parts.slice(user ? 3 : 2).join(' ');
      return {
        id: `brew_${name}`,
        name,
        status,
        user,
        plistPath,
        isStarted: status === 'started',
        startupMode: plistPath.includes('LaunchDaemons') ? 'boot' : (plistPath ? 'login' : 'manual')
      };
    })
    .filter((item) => item.name);
}

function parseLaunchctlList(stdout) {
  return String(stdout || '')
    .split('\n')
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\s+/).filter(Boolean);
      const [pidValue = '-', statusValue = '0', ...labelParts] = parts;
      const label = labelParts.join(' ');
      const pid = pidValue === '-' ? 0 : Number(pidValue || 0);
      const status = Number(statusValue || 0);
      return {
        id: `launch_${label}`,
        pid: Number.isFinite(pid) ? pid : 0,
        status: Number.isFinite(status) ? status : 0,
        label,
        isApple: label.startsWith('com.apple.'),
        isApplication: label.startsWith('application.')
      };
    })
    .filter((item) => item.label);
}

function parseListeningPorts(stdout) {
  return String(stdout || '')
    .split('\n')
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(\S+)\s+(\d+)\s+(\S+).*TCP\s+(.+)\s+\(LISTEN\)$/);
      if (!match) return null;
      const [, command, pidValue, user, endpoint] = match;
      const portMatch = endpoint.match(/.*:(\d+)$/);
      const host = portMatch ? endpoint.slice(0, Math.max(0, endpoint.length - portMatch[0].length + 1)).replace(/:$/, '') : endpoint;
      return {
        command,
        pid: Number(pidValue || 0),
        user,
        endpoint,
        host,
        port: Number(portMatch?.[1] || 0),
        localOnly: /^(127\.0\.0\.1|localhost|\[::1\])/.test(endpoint)
      };
    })
    .filter(Boolean);
}

function parseProcessList(stdout) {
  return String(stdout || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(\d+)\s+(\d+)\s+(\S+)\s+(\S+)\s+(.*)$/);
      if (!match) return null;
      const [, pidValue, ppidValue, user, command, args] = match;
      return {
        pid: Number(pidValue || 0),
        ppid: Number(ppidValue || 0),
        user,
        command,
        args: String(args || '').trim()
      };
    })
    .filter(Boolean);
}

function parseTmuxSessions(stdout) {
  return String(stdout || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^([^:]+):\s+(\d+) windows?/i);
      if (!match) {
        return {
          id: `tmux_${line}`,
          name: line,
          windows: 0,
          raw: line
        };
      }
      return {
        id: `tmux_${match[1]}`,
        name: match[1],
        windows: Number(match[2] || 0),
        raw: line
      };
    });
}

function buildListeningGroups(entries) {
  const grouped = new Map();
  entries.forEach((item) => {
    const key = `${item.pid}:${item.command}`;
    const current = grouped.get(key) || {
      pid: item.pid,
      command: item.command,
      user: item.user,
      ports: [],
      localOnly: true
    };
    current.ports.push(item.port);
    current.localOnly = current.localOnly && item.localOnly;
    grouped.set(key, current);
  });
  return Array.from(grouped.values()).map((item) => ({
    ...item,
    ports: item.ports
      .filter((port) => Number.isFinite(port) && port > 0)
      .sort((a, b) => a - b)
  }));
}

function deriveProcessDisplayName(processInfo = {}, listeningInfo = {}) {
  const command = String(processInfo.command || listeningInfo.command || 'service').split('/').pop();
  const args = String(processInfo.args || '');
  if (command === 'node') {
    if (/vite/i.test(args)) return 'Node / Vite 服务';
    if (/codex/i.test(args)) return 'Node / Codex 相关服务';
    return 'Node 服务';
  }
  if (command === 'python' || command === 'python3') return 'Python 服务';
  if (command === 'mysqld') return 'MySQL';
  return command;
}

function matchBrewService(brewServices, processInfo = {}, launchInfo = null) {
  const command = String(processInfo.command || '').toLowerCase();
  const args = String(processInfo.args || '').toLowerCase();
  const label = String(launchInfo?.label || '').toLowerCase();
  return brewServices.find((item) => {
    const brewName = String(item.name || '').toLowerCase();
    const brewLabel = `homebrew.mxcl.${brewName}`;
    if (!brewName) return false;
    if (label === brewLabel) return true;
    if (command === brewName) return true;
    if (command.includes(brewName)) return true;
    if (args.includes(`/${brewName}`) || args.includes(` ${brewName} `)) return true;
    return false;
  }) || null;
}

function createObservedCommand(processInfo = {}) {
  const args = String(processInfo.args || '').trim();
  if (!args) return '';
  return args.length > 240 ? `${args.slice(0, 237)}...` : args;
}

function buildHostServiceRecommendations(services, uid) {
  const manualServices = services.filter((item) => item.manager === 'manual');
  const managedServices = services.filter((item) => item.manager !== 'manual');

  const recommendations = manualServices.map((item) => ({
    id: `rec_${item.id}`,
    name: item.name,
    reason: item.ports.length > 0 ? '正在监听端口，但未被 launchctl / brew services 托管。' : '当前是手动会话进程，重启后不会自动恢复。',
    action: item.command.includes('vite') || item.command.includes('node')
      ? '建议优先封装为 LaunchAgent，或先加入本页面的一键启动任务。'
      : '建议补一个 LaunchAgent/Daemon，或者整理成 brew service。',
    suggestedCommand: item.command || `launchctl bootstrap gui/${uid} ~/Library/LaunchAgents/${item.commandName}.plist`
  }));

  const findings = [];
  if (managedServices.length > 0) {
    findings.push({
      id: 'managed',
      level: 'good',
      title: '已有可随重启恢复的服务',
      detail: `当前识别到 ${managedServices.length} 个已被托管的服务，重启后可通过 brew services 或 launchctl 恢复。`
    });
  }
  if (manualServices.length > 0) {
    findings.push({
      id: 'manual',
      level: 'warn',
      title: '存在手动启动的会话服务',
      detail: `当前有 ${manualServices.length} 个服务更像是前台会话进程，重启后默认不会自动拉起。`
    });
  }
  if (managedServices.length > 0 && managedServices.every((item) => item.localOnly)) {
    findings.push({
      id: 'local-only',
      level: 'info',
      title: '大多数端口仅本机可见',
      detail: '这说明当前服务更多偏本机开发/运维用途，后续可按需区分“登录启动”和“开机启动”。'
    });
  }

  return { recommendations, findings };
}

function buildStartupPlan(services) {
  const managedServices = services.filter((item) => item.manager !== 'manual');
  const manualServices = services.filter((item) => item.manager === 'manual');
  return {
    feasible: true,
    summary: manualServices.length > 0
      ? '可以。Homebrew 服务继续交给 brew services，自定义 Node/Python 进程建议补 LaunchAgent，再把常用命令放进 Launch 工作台做一键恢复。'
      : '可以。当前大部分关键服务已经具备登录后自动恢复能力，只需要把剩余零散命令整理进启动任务。',
    approaches: [
      {
        id: 'brew-services',
        title: 'Homebrew 服务',
        desc: '适合 mysql、gitea 这类长期驻留服务，使用 brew services 管理。'
      },
      {
        id: 'launch-agent',
        title: 'LaunchAgent / LaunchDaemon',
        desc: '适合 Node、Python、本地脚本和 GUI 登录后自动启动场景。'
      },
      {
        id: 'launch-workbench',
        title: '应用内一键拉起',
        desc: '把常用恢复命令沉淀成 Launch 任务，登录后手动一键恢复开发环境。'
      },
      {
        id: 'tmux-restore',
        title: 'tmux 恢复脚本',
        desc: '适合恢复 session/window/pane 结构并重跑命令；更适合开发工作台，不适合替代正式服务托管。'
      }
    ],
    managedIds: managedServices.map((item) => item.id),
    manualIds: manualServices.map((item) => item.id)
  };
}

function buildTmuxPlan(tmuxSessions = [], uid) {
  const hasTmux = Array.isArray(tmuxSessions) && tmuxSessions.length > 0;
  return {
    installed: true,
    detected: hasTmux,
    sessionCount: tmuxSessions.length,
    sessions: tmuxSessions,
    summary: hasTmux
      ? `当前识别到 ${tmuxSessions.length} 个 tmux session。重启后不能恢复原进程现场，但可以通过恢复脚本重新建 session 并重跑命令。`
      : '当前未识别到 tmux session。若你计划用 tmux 托管开发服务，建议同时准备恢复脚本。',
    restoreScriptExample: [
      '#!/bin/bash',
      'tmux has-session -t dev 2>/dev/null && exit 0',
      'tmux new-session -d -s dev -n app',
      'tmux send-keys -t dev:app "cd /Users/mac/vue-learning-app && npm run dev" C-m',
      'tmux new-window -t dev -n api',
      'tmux send-keys -t dev:api "cd /Users/mac/vue-learning-app/server && npm run dev" C-m'
    ].join('\n'),
    launchAgentHint: `launchctl bootstrap gui/${uid} ~/Library/LaunchAgents/com.mac.tmux-restore.plist`,
    note: '建议把 tmux 用于恢复交互式工作台；长期常驻服务仍优先使用 brew services 或 LaunchAgent。'
  };
}

async function scanHostServices(force = false) {
  const currentTs = Date.now();
  if (!force && hostServiceSnapshot.payload && hostServiceSnapshot.expiresAt > currentTs) {
    return hostServiceSnapshot.payload;
  }

  const uid = typeof process.getuid === 'function' ? process.getuid() : Number(os.userInfo?.().uid || 0);
  const [brewResult, launchResult, lsofResult, psResult, tmuxResult] = await Promise.all([
    runSystemCommand('brew', ['services', 'list']),
    runSystemCommand('launchctl', ['list']),
    runSystemCommand('lsof', ['-nP', '-iTCP', '-sTCP:LISTEN']),
    runSystemCommand('ps', ['-axo', 'pid=,ppid=,user=,comm=,args=']),
    runSystemCommand('tmux', ['ls'])
  ]);

  const brewServices = parseBrewServices(brewResult.stdout);
  const launchServices = parseLaunchctlList(launchResult.stdout)
    .filter((item) => !item.isApple)
    .slice(0, 400);
  const listeningEntries = parseListeningPorts(lsofResult.stdout);
  const listeningGroups = buildListeningGroups(listeningEntries);
  const processes = parseProcessList(psResult.stdout);
  const tmuxSessions = tmuxResult.ok ? parseTmuxSessions(tmuxResult.stdout) : [];
  const processesByPid = new Map(processes.map((item) => [item.pid, item]));
  const launchByPid = new Map(launchServices.filter((item) => item.pid > 0).map((item) => [item.pid, item]));

  const services = listeningGroups.map((item) => {
    const processInfo = processesByPid.get(item.pid) || {};
    const launchInfo = launchByPid.get(item.pid) || null;
    const brewInfo = matchBrewService(brewServices, processInfo, launchInfo);
    const manager = brewInfo ? 'brew' : (launchInfo ? 'launchctl' : 'manual');
    const startupMode = brewInfo?.startupMode || (launchInfo ? 'login' : 'manual');
    const label = brewInfo ? `homebrew.mxcl.${brewInfo.name}` : String(launchInfo?.label || '');
    const name = brewInfo?.name || deriveProcessDisplayName(processInfo, item);
    const command = createObservedCommand(processInfo);
    return {
      id: `svc_${item.pid}_${item.command}`,
      pid: item.pid,
      name,
      commandName: String(processInfo.command || item.command || '').split('/').pop(),
      command,
      user: processInfo.user || item.user,
      ports: item.ports,
      localOnly: item.localOnly,
      manager,
      startupMode,
      rebootReady: manager !== 'manual',
      status: 'running',
      label,
      restartCommand: brewInfo
        ? `brew services restart ${brewInfo.name}`
        : (label ? `launchctl kickstart -k gui/${uid}/${label}` : command),
      autostartCommand: brewInfo
        ? `brew services start ${brewInfo.name}`
        : (label ? `launchctl print gui/${uid}/${label}` : `为 ${name} 创建 LaunchAgent`)
    };
  });

  brewServices
    .filter((item) => item.isStarted)
    .forEach((item) => {
      if (services.some((service) => service.name.toLowerCase() === item.name.toLowerCase())) return;
      services.push({
        id: `svc_brew_${item.name}`,
        pid: 0,
        name: item.name,
        commandName: item.name,
        command: '',
        user: item.user || os.userInfo().username,
        ports: [],
        localOnly: true,
        manager: 'brew',
        startupMode: item.startupMode,
        rebootReady: true,
        status: item.status,
        label: `homebrew.mxcl.${item.name}`,
        restartCommand: `brew services restart ${item.name}`,
        autostartCommand: `brew services start ${item.name}`
      });
    });

  const sortedServices = services.sort((a, b) => {
    if (a.rebootReady !== b.rebootReady) return a.rebootReady ? -1 : 1;
    if (b.ports.length !== a.ports.length) return b.ports.length - a.ports.length;
    return String(a.name).localeCompare(String(b.name), 'zh-CN');
  });

  const { recommendations, findings } = buildHostServiceRecommendations(sortedServices, uid);
  if (tmuxSessions.length > 0) {
    findings.push({
      id: 'tmux-detected',
      level: 'info',
      title: '检测到 tmux 会话',
      detail: `当前识别到 ${tmuxSessions.length} 个 tmux session。适合恢复工作台，但建议通过脚本重新建会话并重跑命令。`
    });
  }
  const summary = {
    scannedAt: currentTs,
    host: os.hostname(),
    platform: `${os.type()} ${os.release()}`,
    totalServices: sortedServices.length,
    listeningServices: sortedServices.filter((item) => item.ports.length > 0).length,
    managedServices: sortedServices.filter((item) => item.manager !== 'manual').length,
    manualServices: sortedServices.filter((item) => item.manager === 'manual').length,
    rebootReadyServices: sortedServices.filter((item) => item.rebootReady).length,
    brewStartedServices: brewServices.filter((item) => item.isStarted).length,
    launchctlLabels: launchServices.length,
    tmuxSessions: tmuxSessions.length
  };

  const payload = {
    source: 'server',
    summary,
    findings,
    recommendations,
    startupPlan: buildStartupPlan(sortedServices),
    tmux: buildTmuxPlan(tmuxSessions, uid),
    services: sortedServices,
    brewServices,
    launchServices: launchServices
      .filter((item) => item.label && !item.isApplication)
      .slice(0, 80),
    raw: {
      brewAvailable: brewResult.ok,
      launchctlAvailable: launchResult.ok,
      lsofAvailable: lsofResult.ok,
      psAvailable: psResult.ok,
      tmuxAvailable: tmuxResult.ok
    }
  };

  hostServiceSnapshot = {
    expiresAt: currentTs + HOST_SERVICE_SCAN_TTL_MS,
    payload
  };
  return payload;
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

router.get('/host-services', async (req, res) => {
  await ensureLoaded();
  const force = String(req.query?.force || '').trim() === 'true';
  const payload = await scanHostServices(force);
  res.json(payload);
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
