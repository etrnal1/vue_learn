import express from 'express';
import pool from '../db.js';

const router = express.Router();

// GET /api/users - 获取所有用户
router.get('/', async (req, res) => {
  try {
    const [users] = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
    res.json(users);
  } catch (error) {
    console.error('获取用户列表失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/users/current - 获取当前登录用户
router.get('/current', async (req, res) => {
  try {
    const [settings] = await pool.query(
      "SELECT setting_value FROM user_settings WHERE setting_key = 'current_user_id'"
    );

    if (settings.length === 0) {
      return res.json(null);
    }

    const currentUserId = settings[0].setting_value;
    const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [currentUserId]);

    res.json(users.length > 0 ? users[0] : null);
  } catch (error) {
    console.error('获取当前用户失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/users/switch/:id - 切换当前用户
router.post('/switch/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // 检查用户是否存在
    const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
    if (users.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 更新或插入当前用户设置
    await pool.query(
      `INSERT INTO user_settings (setting_key, setting_value)
       VALUES ('current_user_id', ?)
       ON DUPLICATE KEY UPDATE setting_value = ?`,
      [id, id]
    );

    res.json({ success: true, currentUserId: id });
  } catch (error) {
    console.error('切换用户失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/users - 创建用户
router.post('/', async (req, res) => {
  const { id, name, role, avatar, email } = req.body;

  if (!id || !name) {
    return res.status(400).json({ error: '缺少必需字段: id 或 name' });
  }

  try {
    const createdAt = Date.now();

    await pool.query(
      'INSERT INTO users (id, name, role, avatar, email, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, name, role || 'member', avatar || '👨‍💻', email || null, createdAt]
    );

    const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
    res.status(201).json(users[0]);
  } catch (error) {
    console.error('创建用户失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/users/:id - 更新用户
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, role, avatar, email } = req.body;

  try {
    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (role !== undefined) {
      updates.push('role = ?');
      values.push(role);
    }
    if (avatar !== undefined) {
      updates.push('avatar = ?');
      values.push(avatar);
    }
    if (email !== undefined) {
      updates.push('email = ?');
      values.push(email);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: '没有提供更新字段' });
    }

    values.push(id);

    await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);

    if (users.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }

    res.json(users[0]);
  } catch (error) {
    console.error('更新用户失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/users/:id - 删除用户
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM users WHERE id = ?', [id]);

    if (result[0].affectedRows === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('删除用户失败:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
