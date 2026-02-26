import express from 'express';
import {
  cleanupExpiredSessions,
  createSession,
  extractBearerToken,
  getUserByCredentials,
  getUserByToken,
  registerUser,
  revokeSessionByToken
} from '../auth.js';
import pool from '../db.js';

const router = express.Router();
const ALLOWED_ROLES = new Set(['admin', 'member', 'approver']);

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
    const [exists] = await pool.query('SELECT id FROM users WHERE id = ? LIMIT 1', [id]);
    if (exists.length > 0) {
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
    console.error('注册失败:', error);
    res.status(500).json({ error: error.message });
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
    await cleanupExpiredSessions();
    const user = await getUserByCredentials(id, password);
    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const session = await createSession(user.id);
    res.json({
      token: session.token,
      expiresAt: session.expiresAt,
      user
    });
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({ error: error.message });
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
      return res.status(401).json({ error: '登录已过期或无效' });
    }
    res.json(auth);
  } catch (error) {
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
    console.error('退出登录失败:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
