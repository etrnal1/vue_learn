import express from 'express';
import {
  cleanupExpiredSessions,
  createSession,
  ensureAuthSchema,
  extractBearerToken,
  getUserByCredentials,
  getUserByToken,
  registerUser,
  revokeSessionByToken
} from '../auth.js';
import pool from '../db.js';
import { pushRuntimeLog } from '../runtimeLogs.js';

const router = express.Router();
const ALLOWED_ROLES = new Set(['admin', 'member', 'approver']);

async function ensureAuthSchemaSafe() {
  try {
    await ensureAuthSchema();
    return true;
  } catch (error) {
    pushRuntimeLog('error', '[auth] schema_check_failed', error);
    console.error('认证表结构校验失败:', error);
    return false;
  }
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const id = String(req.body?.id || '').trim();
  const name = String(req.body?.name || '').trim();
  const password = String(req.body?.password || '');
  const email = req.body?.email ? String(req.body.email).trim() : null;
  const avatar = req.body?.avatar ? String(req.body.avatar).trim() : '👨‍💻';
  const roleCandidate = String(req.body?.role || 'member').trim();
  const role = ALLOWED_ROLES.has(roleCandidate) ? roleCandidate : 'member';

  if (!id || !name || !password) {
    return res.status(400).json({ error: '缺少必填字段：id/name/password' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: '密码长度至少 6 位' });
  }

  try {
    const schemaOk = await ensureAuthSchemaSafe();
    if (!schemaOk) {
      return res.status(500).json({ error: '认证模块初始化失败，请先执行数据库迁移并重启后端' });
    }

    const [exists] = await pool.query('SELECT id FROM users WHERE id = ? LIMIT 1', [id]);
    if (exists.length > 0) {
      pushRuntimeLog('warn', `[auth] register_conflict id=${id}`);
      return res.status(409).json({ error: '用户 ID 已存在' });
    }

    const user = await registerUser({ id, name, role, avatar, email, password });
    const session = await createSession(user.id);
    res.status(201).json({
      token: session.token,
      expiresAt: session.expiresAt,
      user
    });
  } catch (error) {
    pushRuntimeLog('error', `[auth] register_failed id=${id}`, error);
    console.error('注册失败:', error);
    if (error?.code === 'ER_BAD_FIELD_ERROR' || /unknown column/i.test(String(error?.message || ''))) {
      return res.status(500).json({ error: '数据库字段缺失，请先执行数据库迁移（init-db）并重启后端' });
    }
    res.status(500).json({ error: error.message || '注册失败' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const id = String(req.body?.id || '').trim();
  const password = String(req.body?.password || '');
  if (!id || !password) {
    return res.status(400).json({ error: '缺少必填字段：id/password' });
  }

  try {
    const schemaOk = await ensureAuthSchemaSafe();
    if (!schemaOk) {
      return res.status(500).json({ error: '认证模块初始化失败，请先执行数据库迁移并重启后端' });
    }

    await cleanupExpiredSessions();
    const user = await getUserByCredentials(id, password);
    if (!user) {
      pushRuntimeLog('warn', `[auth] login_denied id=${id}`);
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const session = await createSession(user.id);
    res.json({
      token: session.token,
      expiresAt: session.expiresAt,
      user
    });
  } catch (error) {
    pushRuntimeLog('error', `[auth] login_failed id=${id}`, error);
    console.error('登录失败:', error);
    if (error?.code === 'ER_BAD_FIELD_ERROR' || /unknown column/i.test(String(error?.message || ''))) {
      return res.status(500).json({ error: '数据库字段缺失，请先执行数据库迁移（init-db）并重启后端' });
    }
    res.status(500).json({ error: error.message || '登录失败' });
  }
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  const token = extractBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: '未登录' });
  }

  try {
    const auth = await getUserByToken(token);
    if (!auth) {
      pushRuntimeLog('warn', '[auth] me_invalid_token');
      return res.status(401).json({ error: '登录已过期或无效' });
    }
    res.json(auth);
  } catch (error) {
    pushRuntimeLog('error', '[auth] me_failed', error);
    console.error('获取当前登录用户失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  const token = extractBearerToken(req);
  if (!token) {
    return res.json({ success: true });
  }

  try {
    await revokeSessionByToken(token);
    res.json({ success: true });
  } catch (error) {
    pushRuntimeLog('error', '[auth] logout_failed', error);
    console.error('退出登录失败:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
