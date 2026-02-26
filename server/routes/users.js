import express from 'express';
import pool from '../db.js';

const router = express.Router();
const APP_ROLE_SETTING_KEY = 'app_current_role';
const APP_PERMISSION_SETTING_KEY = 'app_permission_config';

const DEFAULT_PERMISSION_CONFIG = {
  roles: [
    { id: 'admin', label: '管理员' },
    { id: 'operator', label: '运维' },
    { id: 'viewer', label: '访客' }
  ],
  tabPermissions: {
    home: ['admin', 'operator', 'viewer'],
    spring: ['admin', 'operator', 'viewer'],
    excel: ['admin', 'operator', 'viewer'],
    chat: ['admin', 'operator'],
    itsm: ['admin', 'operator'],
    git: ['admin', 'operator'],
    video: ['admin', 'operator'],
    music: ['admin', 'operator'],
    album: ['admin', 'operator'],
    wiki: ['admin', 'operator', 'viewer'],
    logs: ['admin'],
    weibo: ['admin', 'operator'],
    scheduler: ['admin'],
    docs: ['admin', 'operator', 'viewer'],
    ffmpeg: ['admin', 'operator'],
    monitor: ['admin', 'operator'],
    docker: ['admin'],
    terminal: ['admin'],
    authLogs: ['admin', 'operator']
  }
};

function normalizeRoleId(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizePermissionConfig(input) {
  const source = input && typeof input === 'object' ? input : {};
  const roleItems = Array.isArray(source.roles) ? source.roles : [];
  const roleMap = new Map();

  for (const role of roleItems) {
    const id = normalizeRoleId(role?.id);
    if (!id || !/^[a-z0-9_-]{1,40}$/.test(id) || roleMap.has(id)) continue;
    const label = String(role?.label || id).trim() || id;
    roleMap.set(id, { id, label });
  }

  const roles = roleMap.size > 0
    ? Array.from(roleMap.values())
    : DEFAULT_PERMISSION_CONFIG.roles.map((role) => ({ ...role }));
  const roleIdSet = new Set(roles.map((role) => role.id));

  const sourceTabPermissions = source.tabPermissions && typeof source.tabPermissions === 'object'
    ? source.tabPermissions
    : {};
  const tabPermissions = {};
  const defaultTabPermissions = DEFAULT_PERMISSION_CONFIG.tabPermissions;
  const tabIds = new Set([
    ...Object.keys(defaultTabPermissions),
    ...Object.keys(sourceTabPermissions)
  ]);

  for (const tabId of tabIds) {
    const candidate = Array.isArray(sourceTabPermissions[tabId])
      ? sourceTabPermissions[tabId]
      : defaultTabPermissions[tabId];
    const normalized = Array.from(
      new Set((candidate || [])
        .map((item) => normalizeRoleId(item))
        .filter((id) => roleIdSet.has(id)))
    );
    tabPermissions[tabId] = normalized.length > 0 ? normalized : roles.map((role) => role.id);
  }

  return { roles, tabPermissions };
}

async function getPermissionConfig() {
  const [settings] = await pool.query(
    'SELECT setting_value FROM user_settings WHERE setting_key = ?',
    [APP_PERMISSION_SETTING_KEY]
  );
  const raw = settings[0]?.setting_value;
  if (!raw) return normalizePermissionConfig(DEFAULT_PERMISSION_CONFIG);
  try {
    return normalizePermissionConfig(JSON.parse(raw));
  } catch (error) {
    return normalizePermissionConfig(DEFAULT_PERMISSION_CONFIG);
  }
}

async function savePermissionConfig(config) {
  await pool.query(
    `INSERT INTO user_settings (setting_key, setting_value)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
    [APP_PERMISSION_SETTING_KEY, JSON.stringify(config)]
  );
}

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

// GET /api/users/current-role - 获取全局当前角色（跨浏览器共享）
router.get('/current-role', async (req, res) => {
  try {
    const permissionConfig = await getPermissionConfig();
    const allowedRoleIds = permissionConfig.roles.map((role) => role.id);
    const allowedRoleSet = new Set(allowedRoleIds);
    const fallbackRole = allowedRoleIds[0] || 'operator';

    const [settings] = await pool.query(
      'SELECT setting_value FROM user_settings WHERE setting_key = ?',
      [APP_ROLE_SETTING_KEY]
    );

    const role = normalizeRoleId(settings[0]?.setting_value);
    if (!role || !allowedRoleSet.has(role)) {
      return res.json({ role: fallbackRole });
    }

    res.json({ role });
  } catch (error) {
    console.error('获取当前角色失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/users/current-role - 设置全局当前角色（跨浏览器共享）
router.post('/current-role', async (req, res) => {
  try {
    const permissionConfig = await getPermissionConfig();
    const allowedRoleIds = permissionConfig.roles.map((item) => item.id);
    const allowedRoleSet = new Set(allowedRoleIds);
    const role = normalizeRoleId(req.body?.role);

    if (!allowedRoleSet.has(role)) {
      return res.status(400).json({ error: `非法角色，仅支持：${allowedRoleIds.join('/')}` });
    }

    await pool.query(
      `INSERT INTO user_settings (setting_key, setting_value)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [APP_ROLE_SETTING_KEY, role]
    );

    res.json({ success: true, role });
  } catch (error) {
    console.error('设置当前角色失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/users/permission-config - 获取可配置权限模型
router.get('/permission-config', async (req, res) => {
  try {
    const config = await getPermissionConfig();
    res.json(config);
  } catch (error) {
    console.error('获取权限配置失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/users/permission-config - 更新可配置权限模型
router.put('/permission-config', async (req, res) => {
  try {
    const config = normalizePermissionConfig(req.body || {});
    await savePermissionConfig(config);
    res.json(config);
  } catch (error) {
    console.error('更新权限配置失败:', error);
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
