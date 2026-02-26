import express from 'express';
import { spawn } from 'child_process';
import path from 'path';
import fsp from 'fs/promises';
import { randomUUID } from 'crypto';

const router = express.Router();

const DEFAULT_IDLE_TIMEOUT_MS = 20 * 60 * 1000;
const MAX_SESSIONS = 6;
const MAX_CHUNKS = 1500;
const MAX_INPUT_LENGTH = 4000;

const sessions = new Map();

function pushChunk(session, stream, text) {
  const value = String(text || '');
  if (!value) return;
  session.seq += 1;
  session.chunks.push({ seq: session.seq, stream, text: value, ts: Date.now() });
  if (session.chunks.length > MAX_CHUNKS) {
    session.chunks.shift();
  }
}

function touchSession(session) {
  session.lastActiveAt = Date.now();
  if (session.idleTimer) clearTimeout(session.idleTimer);
  session.idleTimer = setTimeout(() => {
    stopSession(session.id, '会话空闲超时，已自动关闭');
  }, DEFAULT_IDLE_TIMEOUT_MS);
}

function getSessionOrNull(id) {
  if (!id) return null;
  return sessions.get(String(id)) || null;
}

function stopSession(id, reason = '会话已关闭') {
  const session = getSessionOrNull(id);
  if (!session) return false;

  session.running = false;
  if (session.idleTimer) {
    clearTimeout(session.idleTimer);
    session.idleTimer = null;
  }
  if (session.cleanupTimer) {
    clearTimeout(session.cleanupTimer);
    session.cleanupTimer = null;
  }

  if (session.process && !session.process.killed) {
    try {
      session.process.kill('SIGTERM');
    } catch {
      // ignore kill error
    }
  }

  pushChunk(session, 'system', `\n[system] ${reason}\n`);
  sessions.delete(session.id);
  return true;
}

function scheduleClosedSessionCleanup(session, delayMs = 60 * 1000) {
  if (session.cleanupTimer) {
    clearTimeout(session.cleanupTimer);
    session.cleanupTimer = null;
  }
  session.cleanupTimer = setTimeout(() => {
    sessions.delete(session.id);
  }, delayMs);
}

async function validateCwd(cwd) {
  if (!cwd) return { ok: true, value: process.cwd() };
  const resolved = path.resolve(String(cwd));
  if (!path.isAbsolute(resolved)) return { ok: false, error: '工作目录必须是绝对路径' };
  try {
    const stat = await fsp.stat(resolved);
    if (!stat.isDirectory()) return { ok: false, error: '工作目录不是文件夹' };
    return { ok: true, value: resolved };
  } catch {
    return { ok: false, error: '工作目录不存在或不可访问' };
  }
}

router.post('/sessions', async (req, res) => {
  if (sessions.size >= MAX_SESSIONS) {
    return res.status(429).json({ error: `并发终端会话过多，最多 ${MAX_SESSIONS} 个` });
  }

  const cwdResult = await validateCwd(req.body?.cwd);
  if (!cwdResult.ok) {
    return res.status(400).json({ error: cwdResult.error });
  }

  // 在无 TTY 的 HTTP 场景下，`sh` 管道模式比 `zsh -i` 稳定，命令返回更可靠。
  const shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/sh';
  const args = [];
  const child = spawn(shell, args, {
    cwd: cwdResult.value,
    env: {
      ...process.env,
      TERM: process.env.TERM || 'xterm-256color',
      COLORTERM: process.env.COLORTERM || 'truecolor'
    },
    stdio: 'pipe'
  });

  const session = {
    id: randomUUID(),
    process: child,
    pid: child.pid || 0,
    cwd: cwdResult.value,
    shell,
    running: true,
    chunks: [],
    seq: 0,
    cleanupTimer: null,
    idleTimer: null,
    lastActiveAt: Date.now()
  };

  child.stdout.on('data', (chunk) => {
    pushChunk(session, 'stdout', chunk.toString('utf8'));
  });

  child.stderr.on('data', (chunk) => {
    pushChunk(session, 'stderr', chunk.toString('utf8'));
  });

  child.on('error', (error) => {
    pushChunk(session, 'system', `[system] 终端进程错误: ${error?.message || '未知错误'}\n`);
    session.running = false;
  });

  child.on('close', (code, signal) => {
    session.running = false;
    pushChunk(session, 'system', `\n[system] 终端进程结束 code=${code ?? '-'} signal=${signal ?? '-'}\n`);
    scheduleClosedSessionCleanup(session);
  });

  sessions.set(session.id, session);
  touchSession(session);

  return res.json({
    sessionId: session.id,
    pid: session.pid,
    cwd: session.cwd,
    shell: session.shell,
    cursor: session.seq
  });
});

router.get('/sessions', (req, res) => {
  const list = Array.from(sessions.values()).map((session) => ({
    sessionId: session.id,
    pid: session.pid,
    cwd: session.cwd,
    shell: session.shell,
    running: session.running,
    lastActiveAt: session.lastActiveAt
  }));
  res.json({ count: list.length, items: list });
});

router.get('/sessions/:id/output', (req, res) => {
  const session = getSessionOrNull(req.params.id);
  if (!session) {
    return res.status(404).json({ error: '会话不存在或已关闭' });
  }

  touchSession(session);
  const cursor = Number.parseInt(String(req.query.cursor || '0'), 10);
  const safeCursor = Number.isFinite(cursor) ? cursor : 0;
  const chunks = session.chunks.filter((item) => item.seq > safeCursor);
  const nextCursor = chunks.length > 0 ? chunks[chunks.length - 1].seq : safeCursor;

  return res.json({
    sessionId: session.id,
    running: session.running,
    cursor: nextCursor,
    chunks
  });
});

router.post('/sessions/:id/input', (req, res) => {
  const session = getSessionOrNull(req.params.id);
  if (!session) {
    return res.status(404).json({ error: '会话不存在或已关闭' });
  }
  if (!session.running) {
    return res.status(409).json({ error: '终端会话已结束' });
  }

  const input = String(req.body?.input || '');
  if (!input) {
    return res.status(400).json({ error: '输入内容不能为空' });
  }
  if (input.length > MAX_INPUT_LENGTH) {
    return res.status(400).json({ error: `单次输入过长，最多 ${MAX_INPUT_LENGTH} 字符` });
  }

  touchSession(session);
  session.process.stdin.write(input);
  return res.json({ ok: true });
});

router.delete('/sessions/:id', (req, res) => {
  const ok = stopSession(req.params.id, '会话已由用户关闭');
  if (!ok) {
    return res.status(404).json({ error: '会话不存在或已关闭' });
  }
  return res.json({ ok: true });
});

process.on('exit', () => {
  for (const id of sessions.keys()) {
    stopSession(id, '服务进程退出');
  }
});

export default router;
