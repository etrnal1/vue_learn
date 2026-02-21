import express from 'express';
import pool from '../db.js';

const router = express.Router();
const VALID_PRIORITY = new Set(['low', 'medium', 'high']);
const VALID_ROLE = new Set(['admin', 'approver', 'member']);
const VALID_FIELD_TYPE = new Set(['text', 'textarea', 'number', 'select']);
const SERVICE_TYPE_PATTERN = /^[a-z0-9_]+$/;

const DEFAULT_CATALOG_ITEMS = [
  { id: 'sc_account', service_type: 'account', name: '账号管理', icon: '👤', description: '创建、修改或删除系统账号', form_schema: [{ key: 'targetUser', label: '目标账号', type: 'text', required: true, placeholder: '输入账号或邮箱' }], title_template: '账号管理 - ', default_priority: 'medium', requires_approval: true, default_approver_role: 'approver', default_assignee_role: 'member', is_active: true, sort_order: 10 },
  { id: 'sc_software_install', service_type: 'software_install', name: '软件安装', icon: '💿', description: '申请安装或更新软件', form_schema: [{ key: 'softwareName', label: '软件名称', type: 'text', required: true }, { key: 'version', label: '版本', type: 'text' }], title_template: '软件安装 - ', default_priority: 'medium', requires_approval: true, default_approver_role: 'approver', default_assignee_role: 'member', is_active: true, sort_order: 20 },
  { id: 'sc_hardware', service_type: 'hardware', name: '硬件申请', icon: '🖥️', description: '申请电脑、显示器等设备', form_schema: [{ key: 'deviceType', label: '设备类型', type: 'select', required: true, options: ['笔记本', '显示器', '键盘', '鼠标', '其他'] }, { key: 'quantity', label: '数量', type: 'number', required: true }], title_template: '硬件申请 - ', default_priority: 'high', requires_approval: true, default_approver_role: 'approver', default_assignee_role: 'member', is_active: true, sort_order: 30 },
  { id: 'sc_permission', service_type: 'permission', name: '权限申请', icon: '🔑', description: '申请系统或文件夹访问权限', form_schema: [{ key: 'systemName', label: '系统/资源名称', type: 'text', required: true }, { key: 'permissionLevel', label: '权限级别', type: 'select', required: true, options: ['只读', '读写', '管理员'] }], title_template: '权限申请 - ', default_priority: 'high', requires_approval: true, default_approver_role: 'approver', default_assignee_role: 'admin', is_active: true, sort_order: 40 },
  { id: 'sc_vpn', service_type: 'vpn', name: 'VPN 配置', icon: '🔒', description: '申请 VPN 账号或排障', form_schema: [{ key: 'issueType', label: '类型', type: 'select', required: true, options: ['新开通', '无法连接', '重置密码', '其他'] }], title_template: 'VPN 配置 - ', default_priority: 'medium', requires_approval: false, default_approver_role: 'approver', default_assignee_role: 'member', is_active: true, sort_order: 50 },
  { id: 'sc_email', service_type: 'email', name: '邮箱服务', icon: '📧', description: '邮箱创建、密码重置、邮件组', form_schema: [{ key: 'emailAction', label: '操作类型', type: 'select', required: true, options: ['新建邮箱', '重置密码', '创建邮件组', '其他'] }], title_template: '邮箱服务 - ', default_priority: 'low', requires_approval: false, default_approver_role: 'approver', default_assignee_role: 'member', is_active: true, sort_order: 60 },
  { id: 'sc_other', service_type: 'other', name: '其他', icon: '📝', description: '其他 IT 服务请求', form_schema: [], title_template: '其他请求 - ', default_priority: 'medium', requires_approval: true, default_approver_role: 'approver', default_assignee_role: 'member', is_active: true, sort_order: 999 }
];

function isNoTableError(error) {
  return error && error.code === 'ER_NO_SUCH_TABLE';
}

function isMissingColumnError(error) {
  return error && error.code === 'ER_BAD_FIELD_ERROR';
}

function normalizeSortOrder(value) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return 999;
  return Math.max(0, Math.min(parsed, 9999));
}

function normalizeCatalogInput(input = {}, isCreate = false) {
  const serviceType = typeof input.serviceType === 'string' ? input.serviceType.trim() : '';
  const name = typeof input.name === 'string' ? input.name.trim() : '';

  if (isCreate && !serviceType) {
    return { ok: false, error: 'serviceType 不能为空' };
  }

  if (serviceType && !SERVICE_TYPE_PATTERN.test(serviceType)) {
    return { ok: false, error: 'serviceType 仅支持小写字母、数字和下划线' };
  }

  if (isCreate && !name) {
    return { ok: false, error: 'name 不能为空' };
  }

  if (input.defaultPriority && !VALID_PRIORITY.has(input.defaultPriority)) {
    return { ok: false, error: 'defaultPriority 非法' };
  }

  if (input.defaultApproverRole && !VALID_ROLE.has(input.defaultApproverRole)) {
    return { ok: false, error: 'defaultApproverRole 非法' };
  }

  if (input.defaultAssigneeRole && !VALID_ROLE.has(input.defaultAssigneeRole)) {
    return { ok: false, error: 'defaultAssigneeRole 非法' };
  }

  if (input.formSchema !== undefined) {
    if (!Array.isArray(input.formSchema)) {
      return { ok: false, error: 'formSchema 必须是数组' };
    }
    for (const field of input.formSchema) {
      if (!field || typeof field !== 'object') {
        return { ok: false, error: 'formSchema 字段格式错误' };
      }
      const key = typeof field.key === 'string' ? field.key.trim() : '';
      const label = typeof field.label === 'string' ? field.label.trim() : '';
      const type = typeof field.type === 'string' ? field.type.trim() : '';
      if (!key || !label || !VALID_FIELD_TYPE.has(type)) {
        return { ok: false, error: 'formSchema 字段必须包含 key/label/type' };
      }
      if (type === 'select' && (!Array.isArray(field.options) || field.options.length === 0)) {
        return { ok: false, error: 'select 类型字段必须包含 options' };
      }
    }
  }

  const payload = {
    service_type: serviceType || undefined,
    name: name || undefined,
    icon: typeof input.icon === 'string' ? input.icon.trim() : undefined,
    description: typeof input.description === 'string' ? input.description.trim() : undefined,
    form_schema: input.formSchema !== undefined ? JSON.stringify(input.formSchema) : undefined,
    title_template: typeof input.titleTemplate === 'string' ? input.titleTemplate : undefined,
    default_priority: input.defaultPriority,
    requires_approval: typeof input.requiresApproval === 'boolean' ? input.requiresApproval : undefined,
    default_approver_role: input.defaultApproverRole,
    default_assignee_role: input.defaultAssigneeRole,
    is_active: typeof input.isActive === 'boolean' ? input.isActive : undefined,
    sort_order: input.sortOrder !== undefined ? normalizeSortOrder(input.sortOrder) : undefined
  };

  return { ok: true, payload };
}

// GET /api/service-catalog
router.get('/', async (req, res) => {
  const includeInactive = req.query.includeInactive === '1' || req.query.includeInactive === 'true';

  try {
    const [items] = await pool.query(`
      SELECT
        id,
        service_type,
        name,
        icon,
        description,
        form_schema,
        title_template,
        default_priority,
        requires_approval,
        default_approver_role,
        default_assignee_role,
        is_active,
        sort_order,
        created_at,
        updated_at
      FROM service_catalog
      ${includeInactive ? '' : 'WHERE is_active = TRUE'}
      ORDER BY sort_order ASC, name ASC
    `);

    res.json(items);
  } catch (error) {
    if (isNoTableError(error) || isMissingColumnError(error)) {
      return res.json(includeInactive ? DEFAULT_CATALOG_ITEMS : DEFAULT_CATALOG_ITEMS.filter(item => item.is_active));
    }
    console.error('获取服务目录失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/service-catalog/:serviceType
router.get('/:serviceType', async (req, res) => {
  const { serviceType } = req.params;

  try {
    const [items] = await pool.query(`
      SELECT
        id,
        service_type,
        name,
        icon,
        description,
        form_schema,
        title_template,
        default_priority,
        requires_approval,
        default_approver_role,
        default_assignee_role,
        is_active,
        sort_order,
        created_at,
        updated_at
      FROM service_catalog
      WHERE service_type = ? AND is_active = TRUE
      LIMIT 1
    `, [serviceType]);

    if (items.length === 0) {
      return res.status(404).json({ error: '服务目录项不存在' });
    }

    res.json(items[0]);
  } catch (error) {
    if (isNoTableError(error) || isMissingColumnError(error)) {
      const fallback = DEFAULT_CATALOG_ITEMS.find(item => item.service_type === serviceType && item.is_active);
      if (!fallback) {
        return res.status(404).json({ error: '服务目录项不存在' });
      }
      return res.json(fallback);
    }
    console.error('获取服务目录项失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/service-catalog
router.post('/', async (req, res) => {
  const normalized = normalizeCatalogInput(req.body, true);
  if (!normalized.ok) {
    return res.status(400).json({ error: normalized.error });
  }

  const now = Date.now();
  const id = req.body.id || `sc_${Date.now()}`;

  const payload = {
    ...normalized.payload,
    icon: normalized.payload.icon || '📝',
    description: normalized.payload.description || '',
    form_schema: normalized.payload.form_schema || '[]',
    title_template: normalized.payload.title_template || `${normalized.payload.name} - `,
    default_priority: normalized.payload.default_priority || 'medium',
    requires_approval: normalized.payload.requires_approval !== undefined ? normalized.payload.requires_approval : true,
    default_approver_role: normalized.payload.default_approver_role || 'approver',
    default_assignee_role: normalized.payload.default_assignee_role || 'member',
    is_active: normalized.payload.is_active !== undefined ? normalized.payload.is_active : true,
    sort_order: normalized.payload.sort_order !== undefined ? normalized.payload.sort_order : 999
  };

  try {
    await pool.query(
      `INSERT INTO service_catalog (
        id, service_type, name, icon, description, form_schema, title_template,
        default_priority, requires_approval, default_approver_role, default_assignee_role,
        is_active, sort_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        payload.service_type,
        payload.name,
        payload.icon,
        payload.description,
        payload.form_schema,
        payload.title_template,
        payload.default_priority,
        payload.requires_approval,
        payload.default_approver_role,
        payload.default_assignee_role,
        payload.is_active,
        payload.sort_order,
        now,
        now
      ]
    );

    const [rows] = await pool.query('SELECT * FROM service_catalog WHERE id = ?', [id]);
    res.status(201).json(rows[0]);
  } catch (error) {
    if (isNoTableError(error) || isMissingColumnError(error)) {
      return res.status(400).json({ error: '当前数据库版本不支持目录管理，请先执行数据库初始化脚本' });
    }
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'serviceType 已存在，请使用不同编码' });
    }
    console.error('创建服务目录失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/service-catalog/:id
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const normalized = normalizeCatalogInput(req.body, false);

  if (!normalized.ok) {
    return res.status(400).json({ error: normalized.error });
  }

  const updates = [];
  const values = [];

  Object.entries(normalized.payload).forEach(([key, value]) => {
    if (value !== undefined) {
      updates.push(`${key} = ?`);
      values.push(value);
    }
  });

  if (updates.length === 0) {
    return res.status(400).json({ error: '没有提供更新字段' });
  }

  values.push(Date.now());
  values.push(id);

  try {
    await pool.query(
      `UPDATE service_catalog SET ${updates.join(', ')}, updated_at = ? WHERE id = ?`,
      values
    );

    const [rows] = await pool.query('SELECT * FROM service_catalog WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: '服务目录项不存在' });
    }

    res.json(rows[0]);
  } catch (error) {
    if (isNoTableError(error) || isMissingColumnError(error)) {
      return res.status(400).json({ error: '当前数据库版本不支持目录管理，请先执行数据库初始化脚本' });
    }
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'serviceType 已存在，请使用不同编码' });
    }
    console.error('更新服务目录失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/service-catalog/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.query('DELETE FROM service_catalog WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '服务目录项不存在' });
    }

    res.json({ success: true });
  } catch (error) {
    if (isNoTableError(error) || isMissingColumnError(error)) {
      return res.status(400).json({ error: '当前数据库版本不支持目录管理，请先执行数据库初始化脚本' });
    }
    console.error('删除服务目录失败:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
