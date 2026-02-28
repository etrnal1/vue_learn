import express from 'express';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fsp from 'fs/promises';
import { getRoleGroup, requireAuth, requireRoles } from '../middleware/rbac.js';

const router = express.Router();
router.use(requireAuth);
router.use(requireRoles(...getRoleGroup('admin')));
const execFileAsync = promisify(execFile);

const MAX_CONTENT_LENGTH = 20000;
const MAX_OUTPUT_LENGTH = 8000;
const DEFAULT_TIMEOUT_SECONDS = 30;

function clampTimeout(value) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return DEFAULT_TIMEOUT_SECONDS;
  return Math.max(1, Math.min(parsed, 300));
}

function trimOutput(text) {
  const value = String(text || '');
  if (value.length <= MAX_OUTPUT_LENGTH) {
    return { text: value, truncated: false };
  }
  return {
    text: `${value.slice(0, MAX_OUTPUT_LENGTH)}\n...输出已截断...`,
    truncated: true
  };
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

router.post('/execute', async (req, res) => {
  const { scriptType, content, cwd, timeoutSeconds } = req.body || {};
  const type = String(scriptType || '').trim().toLowerCase();
  const scriptContent = String(content || '');

  if (!['shell', 'python'].includes(type)) {
    return res.status(400).json({ error: 'scriptType 仅支持 shell 或 python' });
  }
  if (!scriptContent.trim()) {
    return res.status(400).json({ error: '脚本内容不能为空' });
  }
  if (scriptContent.length > MAX_CONTENT_LENGTH) {
    return res.status(400).json({ error: `脚本内容过长，最多 ${MAX_CONTENT_LENGTH} 字符` });
  }

  const cwdResult = await validateCwd(cwd);
  if (!cwdResult.ok) {
    return res.status(400).json({ error: cwdResult.error });
  }

  const timeout = clampTimeout(timeoutSeconds);
  const startedAt = Date.now();

  try {
    const cmd = type === 'shell' ? '/bin/sh' : 'python3';
    const args = type === 'shell' ? ['-lc', scriptContent] : ['-c', scriptContent];

    const { stdout, stderr } = await execFileAsync(cmd, args, {
      cwd: cwdResult.value,
      timeout: timeout * 1000,
      maxBuffer: 1024 * 1024,
      env: process.env
    });

    const out = trimOutput(stdout);
    const err = trimOutput(stderr);

    return res.json({
      success: true,
      scriptType: type,
      timeoutSeconds: timeout,
      durationMs: Date.now() - startedAt,
      cwd: cwdResult.value,
      stdout: out.text,
      stderr: err.text,
      truncated: out.truncated || err.truncated
    });
  } catch (error) {
    const out = trimOutput(error.stdout || '');
    const err = trimOutput(error.stderr || '');
    const isTimeout = error.killed || error.signal === 'SIGTERM';
    const message = isTimeout
      ? `执行超时（>${timeout}s）`
      : (error.code === 'ENOENT' && type === 'python'
        ? 'python3 不存在，请先安装 Python'
        : (error.message || '脚本执行失败'));

    return res.json({
      success: false,
      scriptType: type,
      timeoutSeconds: timeout,
      durationMs: Date.now() - startedAt,
      cwd: cwdResult.value,
      error: message,
      stdout: out.text,
      stderr: err.text,
      truncated: out.truncated || err.truncated
    });
  }
});

export default router;
