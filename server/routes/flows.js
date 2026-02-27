import express from 'express';
import { randomUUID } from 'crypto';
import pool from '../db.js';
import { getRoleGroup, requireAuth, requireRoles } from '../middleware/rbac.js';

const router = express.Router();
const flowRbacEnabled = String(process.env.FLOW_RBAC_ENABLED || 'false').toLowerCase() === 'true';
const flowWriteRoles = getRoleGroup('audit');
const flowAdminRoles = getRoleGroup('admin');
const flowWriteProtect = flowRbacEnabled ? requireRoles(...flowWriteRoles) : (_req, _res, next) => next();
const flowAdminProtect = flowRbacEnabled ? requireRoles(...flowAdminRoles) : (_req, _res, next) => next();

function hasRole(req, roles = []) {
  const role = String(req?.authUser?.role || '').trim();
  return Array.isArray(roles) && roles.includes(role);
}

function canWriteFlow(req) {
  if (!flowRbacEnabled) return true;
  return hasRole(req, flowWriteRoles);
}

function canAdminFlow(req) {
  if (!flowRbacEnabled) return true;
  return hasRole(req, flowAdminRoles);
}

/**
 * 评估步骤参数（后端版本）
 * 支持常量、变量、表达式、前一步输出等参数来源
 */
function evaluateStepParameters(paramConfigs = [], context = {}) {
  const result = {};
  const { variableValues = {}, flowVariables = [], previousStepOutput = {} } = context;

  // 构建变量映射表
  const variableMap = {};
  for (const v of flowVariables) {
    variableMap[v.name] = v.default_value;
  }
  Object.assign(variableMap, variableValues);

  for (const param of paramConfigs) {
    const { paramName, sourceType, sourceValue } = param;
    if (!paramName) continue;

    try {
      let value;

      switch (sourceType) {
        case 'constant':
          value = parseConstantValue(sourceValue);
          break;

        case 'variable':
          value = variableMap[sourceValue] !== undefined ? variableMap[sourceValue] : null;
          break;

        case 'expression':
          value = evaluateExpression(sourceValue, variableMap, previousStepOutput);
          break;

        case 'previous_step':
          value = previousStepOutput[sourceValue] || null;
          break;

        default:
          value = null;
      }

      result[paramName] = value;
    } catch (err) {
      console.warn(`参数评估失败 [${paramName}]:`, err.message);
      result[paramName] = null;
    }
  }

  return result;
}

/**
 * 解析常量值
 */
function parseConstantValue(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const str = String(value).trim();

  // 布尔值
  if (str === 'true') return true;
  if (str === 'false') return false;

  // 数字
  if (/^-?\d+\.?\d*$/.test(str)) {
    return Number(str);
  }

  // null 值
  if (str === 'null') return null;

  // JSON 对象/数组
  if ((str.startsWith('{') && str.endsWith('}')) ||
      (str.startsWith('[') && str.endsWith(']'))) {
    try {
      return JSON.parse(str);
    } catch (e) {
      return str;
    }
  }

  // 默认为字符串
  return str;
}

/**
 * 评估表达式
 */
function evaluateExpression(expr, variables = {}, previousOutput = {}) {
  if (!expr) return null;

  let result = expr;

  // 替换变量引用 ${varName} 或 ${previousStep.fieldName}
  result = result.replace(/\$\{([^}]+)\}/g, (match, content) => {
    const trimmed = content.trim();

    // 前一步输出引用
    if (trimmed.startsWith('previousStep.')) {
      const fieldName = trimmed.slice('previousStep.'.length);
      return String(previousOutput[fieldName] || '');
    }

    // 变量引用
    const value = variables[trimmed];
    if (value !== undefined) {
      return String(value);
    }

    return match;
  });

  // 基础算术计算
  if (/^[\d\s+\-*/().]+$/.test(result)) {
    try {
      const compute = Function('"use strict"; return (' + result + ')');
      return compute();
    } catch (e) {
      return result;
    }
  }

  return result;
}

/**
 * 记录执行日志（用于 Phase 4 WebSocket 推送）
 */
async function recordExecutionLog(connection, executionId, eventType, details = {}) {
  try {
    // 这里预留接口用于 Phase 4 集成
    // 将在 Phase 4 中添加 flow_execution_logs 表记录
    console.log(`[ExecutionLog] ${eventType}:`, details);
  } catch (err) {
    console.warn('记录执行日志失败:', err.message);
  }
}

// 生成流程编号
async function generateFlowNo() {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query("UPDATE counters SET value = value + 1 WHERE id = 'flow'");
    const [rows] = await connection.query("SELECT value FROM counters WHERE id = 'flow'");
    await connection.commit();
    const num = rows[0].value;
    return `FL${String(num).padStart(6, '0')}`;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// 生成执行编号
async function generateExecutionNo() {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query("UPDATE counters SET value = value + 1 WHERE id = 'execution'");
    const [rows] = await connection.query("SELECT value FROM counters WHERE id = 'execution'");
    await connection.commit();
    const num = rows[0].value;
    return `EX${String(num).padStart(6, '0')}`;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// GET /api/flows - 获取所有流程（含步骤）
router.get('/', async (req, res) => {
  try {
    const [flows] = await pool.query(`
      SELECT
        f.*,
        u.name as author_name
      FROM flows f
      LEFT JOIN users u ON f.author_id = u.id
      ORDER BY f.created_at DESC
    `);

    // 获取所有流程的步骤
    const flowsWithSteps = await Promise.all(
      flows.map(async (flow) => {
        const [steps] = await pool.query(
          'SELECT * FROM flow_steps WHERE flow_id = ? ORDER BY step_order ASC',
          [flow.id]
        );
        return { ...flow, steps };
      })
    );

    res.json(flowsWithSteps);
  } catch (error) {
    console.error('获取流程列表失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/flows/:id - 获取单个流程（含步骤）- 无需认证版本
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [flows] = await pool.query(`
      SELECT
        f.*,
        u.name as author_name
      FROM flows f
      LEFT JOIN users u ON f.author_id = u.id
      WHERE f.id = ?
    `, [id]);

    if (flows.length === 0) {
      return res.status(404).json({ error: '流程不存在' });
    }

    const [steps] = await pool.query(
      'SELECT * FROM flow_steps WHERE flow_id = ? ORDER BY step_order ASC',
      [id]
    );

    const flow = { ...flows[0], steps };
    res.json(flow);
  } catch (error) {
    console.error('获取流程详情失败:', error);
    res.status(500).json({ error: error.message });
  }
});

function validateFlowPayload(payload) {
  if (!payload || !Array.isArray(payload.steps) || payload.steps.length === 0) {
    return { valid: false, message: '请确保流程至少包含一个步骤' };
  }

  for (let i = 0; i < payload.steps.length; i++) {
    const step = payload.steps[i];
    const title = String((step.name || step.title || '').trim());
    if (!title) {
      return { valid: false, message: `第 ${i + 1} 步缺少标题` };
    }
  }

  return { valid: true };
}

let flowExtensionsReady = null;

async function ensureFlowExtensions() {
  if (flowExtensionsReady) return flowExtensionsReady;
  flowExtensionsReady = (async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS flow_comments (
        id VARCHAR(50) PRIMARY KEY,
        flow_id VARCHAR(50) NOT NULL,
        step_id VARCHAR(50),
        text TEXT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'open',
        mention_users JSON,
        author_id VARCHAR(50),
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL,
        INDEX idx_flow_comments_flow (flow_id),
        INDEX idx_flow_comments_step (step_id),
        INDEX idx_flow_comments_status (status),
        FOREIGN KEY (flow_id) REFERENCES flows(id) ON DELETE CASCADE,
        FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS flow_audit_logs (
        id VARCHAR(50) PRIMARY KEY,
        flow_id VARCHAR(50) NOT NULL,
        action VARCHAR(100) NOT NULL,
        actor_id VARCHAR(50),
        actor_role VARCHAR(50),
        result VARCHAR(20) NOT NULL DEFAULT 'success',
        detail TEXT,
        metadata JSON,
        created_at BIGINT NOT NULL,
        INDEX idx_flow_audit_flow (flow_id),
        INDEX idx_flow_audit_action (action),
        INDEX idx_flow_audit_created (created_at),
        FOREIGN KEY (flow_id) REFERENCES flows(id) ON DELETE CASCADE,
        FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS flow_export_jobs (
        id VARCHAR(50) PRIMARY KEY,
        flow_id VARCHAR(50) NOT NULL,
        format VARCHAR(20) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'queued',
        options JSON,
        version_id VARCHAR(50),
        download_url TEXT,
        message VARCHAR(500),
        created_by VARCHAR(50),
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL,
        INDEX idx_flow_exports_flow (flow_id),
        INDEX idx_flow_exports_format (format),
        INDEX idx_flow_exports_created (created_at),
        FOREIGN KEY (flow_id) REFERENCES flows(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS flow_shared_modules (
        id VARCHAR(50) PRIMARY KEY,
        module_key VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        steps_snapshot JSON NOT NULL,
        created_by VARCHAR(50),
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL,
        INDEX idx_flow_modules_key (module_key),
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    try {
      await pool.query('ALTER TABLE flow_steps ADD COLUMN tip TEXT AFTER conditional');
    } catch (err) {
      if (err.code !== 'ER_DUP_FIELDNAME') throw err;
    }

    try {
      await pool.query('ALTER TABLE flow_steps ADD COLUMN note TEXT AFTER tip');
    } catch (err) {
      if (err.code !== 'ER_DUP_FIELDNAME') throw err;
    }

    try {
      await pool.query('ALTER TABLE flow_steps ADD COLUMN position_x INT NULL AFTER conditional');
    } catch (err) {
      if (err.code !== 'ER_DUP_FIELDNAME') throw err;
    }

	    try {
	      await pool.query('ALTER TABLE flow_steps ADD COLUMN position_y INT NULL AFTER position_x');
	    } catch (err) {
	      if (err.code !== 'ER_DUP_FIELDNAME') throw err;
	    }

    try {
      await pool.query("ALTER TABLE flow_steps ADD COLUMN relation_type VARCHAR(20) DEFAULT 'sequential' AFTER conditional");
    } catch (err) {
      if (err.code !== 'ER_DUP_FIELDNAME') throw err;
    }

    try {
      await pool.query('ALTER TABLE flow_steps ADD COLUMN parent_step_id VARCHAR(50) NULL AFTER relation_type');
    } catch (err) {
      if (err.code !== 'ER_DUP_FIELDNAME') throw err;
    }

    try {
      await pool.query('ALTER TABLE flow_steps ADD COLUMN module_key VARCHAR(100) NULL AFTER parent_step_id');
    } catch (err) {
      if (err.code !== 'ER_DUP_FIELDNAME') throw err;
    }

	    // 历史版本兼容：duration 早期为 INT，后来用于“预计耗时”展示（如：2小时/秒级），需要允许字符串
	    try {
	      await pool.query('ALTER TABLE flow_steps MODIFY COLUMN duration VARCHAR(100) NULL');
	    } catch (err) {
	      // 不阻断主流程：如果权限不足/版本不支持，仍可继续使用（但保存含文字的 duration 会报截断）
	      console.warn('[flows] migrate flow_steps.duration -> VARCHAR(100) failed', err?.code || err);
	    }
	  })().catch((error) => {
	    flowExtensionsReady = null;
	    throw error;
	  });

  return flowExtensionsReady;
}

function normalizeActor(req = {}) {
  const body = req.body || {};
  const authUser = req.authUser || {};
  return {
    actorId: authUser.id || body.actorId || null,
    actorRole: authUser.role || body.actorRole || null
  };
}

async function appendAuditLog(flowId, action, req, options = {}) {
  const now = Date.now();
  const { actorId, actorRole } = normalizeActor(req);
  const {
    result = 'success',
    detail = '',
    metadata = null
  } = options;

  const auditId = randomUUID();
  await pool.query(
    `INSERT INTO flow_audit_logs (id, flow_id, action, actor_id, actor_role, result, detail, metadata, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [auditId, flowId, action, actorId, actorRole, result, detail || '', metadata ? JSON.stringify(metadata) : null, now]
  );
}

async function getFlowById(flowId) {
  const [flows] = await pool.query('SELECT * FROM flows WHERE id = ?', [flowId]);
  return flows[0] || null;
}

async function getFlowWithSteps(flowId) {
  const flow = await getFlowById(flowId);
  if (!flow) return null;
  const [steps] = await pool.query(
    'SELECT * FROM flow_steps WHERE flow_id = ? ORDER BY step_order ASC',
    [flowId]
  );
  return { ...flow, steps };
}

function parseFlowContentByFormat(format, flow, options = {}) {
  const normalizedFormat = String(format || '').toLowerCase();
  if (normalizedFormat === 'json') {
    return {
      mime: 'application/json',
      extension: 'json',
      content: JSON.stringify(flow, null, 2)
    };
  }

  if (normalizedFormat === 'markdown') {
    const lines = [];
    lines.push(`# ${flow.name || '未命名流程'}`);
    lines.push('');
    if (flow.description) {
      lines.push(flow.description);
      lines.push('');
    }
    lines.push(`- 导出时间: ${new Date().toLocaleString()}`);
    lines.push(`- 步骤总数: ${(flow.steps || []).length}`);
    if (options.watermark) {
      lines.push('- 水印: Internal / Workflow Export');
    }
    lines.push('');
    lines.push('## 步骤');
    lines.push('');
    (flow.steps || []).forEach((step, index) => {
      lines.push(`### ${index + 1}. ${step.name || `步骤 ${index + 1}`}`);
      if (step.description) lines.push(step.description);
      if (step.tip) lines.push(`- 提示: ${step.tip}`);
      if (step.note) lines.push(`- 备注: ${step.note}`);
      if (step.assignee) lines.push(`- 负责人: ${step.assignee}`);
      if (step.duration) lines.push(`- 预计耗时: ${step.duration}`);
      if (step.conditional) lines.push('- 条件步骤: 是');
      if (step.relation_type || step.relationType) lines.push(`- 关系: ${step.relation_type || step.relationType}`);
      if (step.parent_step_id || step.parentStepId) lines.push(`- 上级步骤: ${step.parent_step_id || step.parentStepId}`);
      if (step.module_key || step.moduleKey) lines.push(`- 公共模块: ${step.module_key || step.moduleKey}`);
      lines.push('');
    });
    return {
      mime: 'text/markdown',
      extension: 'md',
      content: lines.join('\n')
    };
  }

  if (normalizedFormat === 'bpmn') {
    const idSafe = String(flow.id || 'flow').replace(/[^\w-]/g, '_');
    const taskNodes = (flow.steps || [])
      .map((step, index) => {
        const nodeId = String(step.id || `step_${index + 1}`).replace(/[^\w-]/g, '_');
        return `<bpmn:task id="${nodeId}" name="${(step.name || `步骤 ${index + 1}`).replace(/"/g, '&quot;')}" />`;
      })
      .join('\n    ');
    return {
      mime: 'application/xml',
      extension: 'bpmn',
      content: `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="Defs_${idSafe}">
  <bpmn:process id="Process_${idSafe}" isExecutable="false">
    ${taskNodes}
  </bpmn:process>
</bpmn:definitions>`
    };
  }

  return null;
}

router.use(async (req, res, next) => {
  try {
    await ensureFlowExtensions();
    next();
  } catch (error) {
    console.error('流程扩展表初始化失败:', error);
    res.status(500).json({ error: '流程扩展初始化失败' });
  }
});

router.use(requireAuth);

// GET /api/flows/permissions/me - 当前用户在流程模块的权限
router.get('/permissions/me', async (req, res) => {
  const role = String(req.authUser?.role || '').trim();
  const canWrite = canWriteFlow(req);
  const canAdmin = canAdminFlow(req);
  res.json({
    role,
    rbacEnabled: flowRbacEnabled,
    actions: {
      read: true,
      comment: true,
      edit: canWrite,
      publish: canWrite,
      rollback: canWrite,
      export: canWrite,
      admin: canAdmin
    }
  });
});

// GET /api/flows/shared-modules - 获取公共模块
router.get('/shared-modules', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT m.*, u.name AS created_by_name
       FROM flow_shared_modules m
       LEFT JOIN users u ON m.created_by = u.id
       ORDER BY m.updated_at DESC`
    );
    res.json(rows);
  } catch (error) {
    console.error('获取公共模块失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/flows/shared-modules - 新建公共模块
router.post('/shared-modules', flowWriteProtect, async (req, res) => {
  const {
    moduleKey = '',
    name = '',
    description = '',
    steps = []
  } = req.body || {};

  const key = String(moduleKey || '').trim();
  const moduleName = String(name || '').trim();
  if (!key || !moduleName) {
    return res.status(400).json({ error: 'moduleKey 和 name 必填' });
  }
  if (!Array.isArray(steps) || steps.length === 0) {
    return res.status(400).json({ error: 'steps 至少包含一个步骤模板' });
  }

  try {
    const now = Date.now();
    const moduleId = randomUUID();
    const { actorId } = normalizeActor(req);
    const snapshot = steps.map((step = {}, index) => ({
      id: step.id || `tpl_${index + 1}`,
      name: step.name || `模板步骤 ${index + 1}`,
      description: step.description || '',
      assignee: step.assignee || '',
      duration: step.duration || '',
      conditional: !!step.conditional,
      relationType: step.relationType || step.relation_type || 'sequential',
      parentStepId: step.parentStepId || step.parent_step_id || null,
      tip: step.tip || '',
      note: step.note || ''
    }));

    await pool.query(
      `INSERT INTO flow_shared_modules (id, module_key, name, description, steps_snapshot, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [moduleId, key, moduleName, description || null, JSON.stringify(snapshot), actorId, now, now]
    );
    const [rows] = await pool.query('SELECT * FROM flow_shared_modules WHERE id = ?', [moduleId]);
    res.status(201).json(rows[0]);
  } catch (error) {
    if (error?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'moduleKey 已存在，请更换后再试' });
    }
    console.error('创建公共模块失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/flows/shared-modules/:moduleId - 删除公共模块
router.delete('/shared-modules/:moduleId', flowWriteProtect, async (req, res) => {
  const { moduleId } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM flow_shared_modules WHERE id = ?', [moduleId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '公共模块不存在' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('删除公共模块失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/flows/releases - 获取所有流程发布记录
router.get('/releases', async (req, res) => {
  try {
    const [releases] = await pool.query(
      'SELECT * FROM flow_releases ORDER BY created_at ASC'
    );
    res.json(releases);
  } catch (error) {
    console.error('获取流程发布历史失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/flows/:id/releases - 创建发布记录
router.post('/:id/releases', flowWriteProtect, async (req, res) => {
  const { id } = req.params;
  const { version, note, payload } = req.body;

  if (!version || !version.trim()) {
    return res.status(400).json({ error: '缺少版本号' });
  }

  try {
    const [flows] = await pool.query('SELECT id FROM flows WHERE id = ?', [id]);
    if (flows.length === 0) {
      return res.status(404).json({ error: '流程不存在' });
    }
    const validation = validateFlowPayload(payload);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.message });
    }
    const releaseId = randomUUID();
    const now = Date.now();
    await pool.query(
      `INSERT INTO flow_releases (id, flow_id, version, note, payload, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [releaseId, id, version.trim(), note || null, JSON.stringify(payload), now]
    );
    await appendAuditLog(id, 'create_release', req, {
      detail: note || '',
      metadata: { releaseId, version: version.trim() }
    });
    const [rows] = await pool.query('SELECT * FROM flow_releases WHERE id = ?', [releaseId]);
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('创建发布记录失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/flows/:id/releases/rollback - 回滚到上一个版本
router.post('/:id/releases/rollback', flowWriteProtect, async (req, res) => {
  const { id } = req.params;
  try {
    const [latest] = await pool.query(
      'SELECT * FROM flow_releases WHERE flow_id = ? ORDER BY created_at DESC LIMIT 1',
      [id]
    );
    if (latest.length === 0) {
      return res.status(400).json({ error: '没有可回滚的版本' });
    }
    const release = latest[0];
    await pool.query('DELETE FROM flow_releases WHERE id = ?', [release.id]);
    await appendAuditLog(id, 'rollback_release', req, {
      detail: `rollback ${release.version || release.id}`,
      metadata: { releaseId: release.id }
    });
    const [remaining] = await pool.query(
      'SELECT * FROM flow_releases WHERE flow_id = ? ORDER BY created_at ASC',
      [id]
    );
    res.json({ history: remaining });
  } catch (error) {
    console.error('回滚发布记录失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/flows - 创建流程（含步骤）
router.post('/', flowWriteProtect, async (req, res) => {
  const { id, name, description, icon, authorId, steps } = req.body;

  if (!id || !name) {
    return res.status(400).json({ error: '缺少必需字段: id 或 name' });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const flowNo = await generateFlowNo();
    const now = Date.now();

    await connection.query(
      `INSERT INTO flows (id, flow_no, name, description, icon, author_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, flowNo, name, description || null, icon || null, authorId || null, now, now]
    );

    // 插入步骤
    if (steps && steps.length > 0) {
      for (let stepIndex = 0; stepIndex < steps.length; stepIndex++) {
        const step = steps[stepIndex];
        await connection.query(
          `INSERT INTO flow_steps (id, flow_id, step_order, name, description, assignee, duration, conditional, relation_type, parent_step_id, module_key, position_x, position_y, tip, note)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            step.id || `step_${Date.now()}_${stepIndex}`,
            id,
            step.order !== undefined ? step.order : stepIndex,
            step.name || '',
            step.description || null,
            step.assignee || null,
            step.duration || null,
            step.conditional || false,
            String(step.relationType || step.relation_type || 'sequential'),
            step.parentStepId || step.parent_step_id || null,
            step.moduleKey || step.module_key || null,
            Number.isFinite(Number(step.positionX)) ? Number(step.positionX) : null,
            Number.isFinite(Number(step.positionY)) ? Number(step.positionY) : null,
            step.tip || null,
            step.note || null
          ]
        );
      }
    }

    await connection.commit();

    const [flows] = await connection.query('SELECT * FROM flows WHERE id = ?', [id]);
    const [flowSteps] = await connection.query(
      'SELECT * FROM flow_steps WHERE flow_id = ? ORDER BY step_order ASC',
      [id]
    );

    const flow = { ...flows[0], steps: flowSteps };
    await appendAuditLog(id, 'create_flow', req, {
      detail: name || '',
      metadata: { stepCount: Array.isArray(steps) ? steps.length : 0 }
    });
    res.status(201).json(flow);
  } catch (error) {
    await connection.rollback();
    console.error('创建流程失败:', error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// PUT /api/flows/:id - 更新流程（含步骤）
router.put('/:id', flowWriteProtect, async (req, res) => {
  const { id } = req.params;
  const { name, description, icon, authorId, steps } = req.body;

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const fields = [];
    const values = [];

    if (name !== undefined) {
      fields.push('name = ?');
      values.push(name);
    }
    if (description !== undefined) {
      fields.push('description = ?');
      values.push(description);
    }
    if (icon !== undefined) {
      fields.push('icon = ?');
      values.push(icon);
    }
    if (authorId !== undefined) {
      fields.push('author_id = ?');
      values.push(authorId);
    }

    if (fields.length > 0) {
      fields.push('updated_at = ?');
      values.push(Date.now());
      values.push(id);

      await connection.query(
        `UPDATE flows SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
    }

    // 更新步骤（删除旧步骤，插入新步骤）
    if (steps !== undefined) {
      await connection.query('DELETE FROM flow_steps WHERE flow_id = ?', [id]);

      if (steps.length > 0) {
        for (let stepIndex = 0; stepIndex < steps.length; stepIndex++) {
          const step = steps[stepIndex];
          await connection.query(
            `INSERT INTO flow_steps (id, flow_id, step_order, name, description, assignee, duration, conditional, relation_type, parent_step_id, module_key, position_x, position_y, tip, note)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              step.id || `step_${Date.now()}_${stepIndex}`,
              id,
              step.order !== undefined ? step.order : stepIndex,
              step.name || '',
              step.description || null,
              step.assignee || null,
              step.duration || null,
              step.conditional || false,
              String(step.relationType || step.relation_type || 'sequential'),
              step.parentStepId || step.parent_step_id || null,
              step.moduleKey || step.module_key || null,
              Number.isFinite(Number(step.positionX)) ? Number(step.positionX) : null,
              Number.isFinite(Number(step.positionY)) ? Number(step.positionY) : null,
              step.tip || null,
              step.note || null
            ]
          );
        }
      }
    }

    await connection.commit();

    const [flows] = await connection.query('SELECT * FROM flows WHERE id = ?', [id]);

    if (flows.length === 0) {
      return res.status(404).json({ error: '流程不存在' });
    }

    const [flowSteps] = await connection.query(
      'SELECT * FROM flow_steps WHERE flow_id = ? ORDER BY step_order ASC',
      [id]
    );

    const flow = { ...flows[0], steps: flowSteps };
    await appendAuditLog(id, 'update_flow', req, {
      detail: name || '',
      metadata: { stepCount: Array.isArray(steps) ? steps.length : undefined }
    });
    res.json(flow);
  } catch (error) {
    await connection.rollback();
    console.error('更新流程失败:', error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// DELETE /api/flows/:id - 删除流程
router.delete('/:id', flowAdminProtect, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM flows WHERE id = ?', [id]);

    if (result[0].affectedRows === 0) {
      return res.status(404).json({ error: '流程不存在' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('删除流程失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/flows/:id/comments - 获取流程评论
router.get('/:id/comments', async (req, res) => {
  const { id } = req.params;
  try {
    const [comments] = await pool.query(
      `SELECT c.*, u.name AS author_name
       FROM flow_comments c
       LEFT JOIN users u ON c.author_id = u.id
       WHERE c.flow_id = ?
       ORDER BY c.created_at DESC`,
      [id]
    );
    res.json(comments);
  } catch (error) {
    console.error('获取流程评论失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/flows/:id/comments - 新建流程评论
router.post('/:id/comments', async (req, res) => {
  const { id } = req.params;
  const {
    stepId = null,
    text = '',
    mentionUsers = [],
    status = 'open'
  } = req.body || {};

  if (!String(text).trim()) {
    return res.status(400).json({ error: '评论内容不能为空' });
  }

  try {
    const flow = await getFlowById(id);
    if (!flow) return res.status(404).json({ error: '流程不存在' });

    const now = Date.now();
    const commentId = randomUUID();
    const { actorId } = normalizeActor(req);
    const mentionList = Array.isArray(mentionUsers) ? mentionUsers.filter(Boolean) : [];
    await pool.query(
      `INSERT INTO flow_comments (id, flow_id, step_id, text, status, mention_users, author_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [commentId, id, stepId, String(text).trim(), status || 'open', JSON.stringify(mentionList), actorId, now, now]
    );

    await appendAuditLog(id, 'add_comment', req, {
      detail: String(text).slice(0, 200),
      metadata: { stepId, mentionUsers: mentionList }
    });

    const [rows] = await pool.query(
      `SELECT c.*, u.name AS author_name
       FROM flow_comments c
       LEFT JOIN users u ON c.author_id = u.id
       WHERE c.id = ?`,
      [commentId]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('新增流程评论失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/flows/:id/comments/:commentId - 更新流程评论
router.put('/:id/comments/:commentId', async (req, res) => {
  const { id, commentId } = req.params;
  const { text, status, mentionUsers } = req.body || {};

  try {
    const [rows] = await pool.query(
      'SELECT * FROM flow_comments WHERE id = ? AND flow_id = ?',
      [commentId, id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: '评论不存在' });
    }
    const target = rows[0];
    const actorId = String(req.authUser?.id || '');
    const isOwner = actorId && String(target.author_id || '') === actorId;
    if (!isOwner && !canWriteFlow(req)) {
      return res.status(403).json({ error: '权限不足：仅评论作者或流程维护角色可修改评论' });
    }

    const fields = [];
    const values = [];
    if (text !== undefined) {
      fields.push('text = ?');
      values.push(String(text).trim());
    }
    if (status !== undefined) {
      fields.push('status = ?');
      values.push(String(status));
    }
    if (mentionUsers !== undefined) {
      const mentionList = Array.isArray(mentionUsers) ? mentionUsers.filter(Boolean) : [];
      fields.push('mention_users = ?');
      values.push(JSON.stringify(mentionList));
    }

    fields.push('updated_at = ?');
    values.push(Date.now());
    values.push(commentId, id);

    await pool.query(
      `UPDATE flow_comments SET ${fields.join(', ')} WHERE id = ? AND flow_id = ?`,
      values
    );

    await appendAuditLog(id, 'update_comment', req, {
      detail: `comment=${commentId}`,
      metadata: { status }
    });

    const [updated] = await pool.query('SELECT * FROM flow_comments WHERE id = ?', [commentId]);
    res.json(updated[0]);
  } catch (error) {
    console.error('更新流程评论失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/flows/:id/comments/:commentId - 删除流程评论
router.delete('/:id/comments/:commentId', async (req, res) => {
  const { id, commentId } = req.params;
  try {
    const [rows] = await pool.query(
      'SELECT author_id FROM flow_comments WHERE id = ? AND flow_id = ?',
      [commentId, id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: '评论不存在' });
    }
    const actorId = String(req.authUser?.id || '');
    const isOwner = actorId && String(rows[0].author_id || '') === actorId;
    if (!isOwner && !canWriteFlow(req)) {
      return res.status(403).json({ error: '权限不足：仅评论作者或流程维护角色可删除评论' });
    }

    const [result] = await pool.query(
      'DELETE FROM flow_comments WHERE id = ? AND flow_id = ?',
      [commentId, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '评论不存在' });
    }
    await appendAuditLog(id, 'delete_comment', req, {
      detail: `comment=${commentId}`
    });
    res.json({ success: true });
  } catch (error) {
    console.error('删除流程评论失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/flows/:id/audit - 获取流程审计日志
router.get('/:id/audit', async (req, res) => {
  const { id } = req.params;
  const { limit = 50, offset = 0 } = req.query;
  try {
    const [rows] = await pool.query(
      `SELECT a.*, u.name AS actor_name
       FROM flow_audit_logs a
       LEFT JOIN users u ON a.actor_id = u.id
       WHERE a.flow_id = ?
       ORDER BY a.created_at DESC
       LIMIT ? OFFSET ?`,
      [id, Math.min(200, Math.max(1, Number(limit) || 50)), Math.max(0, Number(offset) || 0)]
    );
    res.json(rows);
  } catch (error) {
    console.error('获取流程审计日志失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/flows/:id/audit - 记录流程审计日志
router.post('/:id/audit', flowWriteProtect, async (req, res) => {
  const { id } = req.params;
  const { action, result = 'success', detail = '', metadata = null } = req.body || {};
  if (!action || !String(action).trim()) {
    return res.status(400).json({ error: '缺少 action' });
  }
  try {
    const flow = await getFlowById(id);
    if (!flow) return res.status(404).json({ error: '流程不存在' });
    await appendAuditLog(id, String(action).trim(), req, { result, detail, metadata });
    res.status(201).json({ success: true });
  } catch (error) {
    console.error('记录流程审计日志失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/flows/:id/export - 申请导出流程
router.post('/:id/export', flowWriteProtect, async (req, res) => {
  const { id } = req.params;
  const { format = 'json', options = {}, versionId = '' } = req.body || {};
  const normalizedFormat = String(format || '').toLowerCase();
  const supported = new Set(['json', 'markdown', 'bpmn', 'pdf', 'word']);
  if (!supported.has(normalizedFormat)) {
    return res.status(400).json({ error: `不支持的导出格式: ${format}` });
  }

  try {
    const flow = await getFlowWithSteps(id);
    if (!flow) return res.status(404).json({ error: '流程不存在' });

    const now = Date.now();
    const { actorId } = normalizeActor(req);
    const exportId = randomUUID();
    let status = 'queued';
    let downloadUrl = null;
    let message = '';

    const parsed = parseFlowContentByFormat(normalizedFormat, flow, options || {});
    if (parsed) {
      const base64 = Buffer.from(parsed.content, 'utf8').toString('base64');
      downloadUrl = `data:${parsed.mime};base64,${base64}`;
      status = 'completed';
      message = `导出已就绪: ${parsed.extension.toUpperCase()}`;
    } else {
      message = `${normalizedFormat.toUpperCase()} 导出任务已提交，请稍后查看`;
    }

    await pool.query(
      `INSERT INTO flow_export_jobs (id, flow_id, format, status, options, version_id, download_url, message, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [exportId, id, normalizedFormat, status, JSON.stringify(options || {}), versionId || null, downloadUrl, message, actorId, now, now]
    );

    await appendAuditLog(id, `export_${normalizedFormat}`, req, {
      detail: message,
      metadata: { exportId, versionId: versionId || null, options: options || {} }
    });

    res.status(201).json({
      id: exportId,
      status,
      message,
      url: downloadUrl,
      downloadUrl
    });
  } catch (error) {
    console.error('申请流程导出失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/flows/:id/exports - 获取导出任务
router.get('/:id/exports', async (req, res) => {
  const { id } = req.params;
  const { limit = 30 } = req.query;
  try {
    const [rows] = await pool.query(
      `SELECT * FROM flow_export_jobs
       WHERE flow_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [id, Math.min(200, Math.max(1, Number(limit) || 30))]
    );
    res.json(rows);
  } catch (error) {
    console.error('获取导出任务失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/flows/:id/execution-metrics - 获取流程执行指标
router.get('/:id/execution-metrics', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT
        COUNT(*) AS totalExecutions,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completedExecutions,
        SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) AS runningExecutions,
        SUM(CASE WHEN status IN ('failed', 'cancelled') THEN 1 ELSE 0 END) AS failedExecutions,
        AVG(CASE
          WHEN completed_at IS NOT NULL AND created_at IS NOT NULL
          THEN (completed_at - created_at)
          ELSE NULL
        END) AS avgDurationMs
      FROM flow_executions
      WHERE flow_id = ?`,
      [id]
    );

    const metrics = rows[0] || {};
    res.json({
      totalExecutions: Number(metrics.totalExecutions || 0),
      completedExecutions: Number(metrics.completedExecutions || 0),
      runningExecutions: Number(metrics.runningExecutions || 0),
      failedExecutions: Number(metrics.failedExecutions || 0),
      avgDurationMs: metrics.avgDurationMs == null ? null : Number(metrics.avgDurationMs)
    });
  } catch (error) {
    console.error('获取流程执行指标失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== 流程执行实例 API ====================

// GET /api/flows/executions - 全局查询所有执行实例（带分页和筛选）
router.get('/executions/query/all', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      order = 'DESC',
      status = '',
      flowId = '',
      initiatorId = '',
      startDate = '',
      endDate = ''
    } = req.query;

    // 验证参数
    const pageNum = Math.max(1, parseInt(page) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const offset = (pageNum - 1) * pageSize;

    // 白名单验证
    const allowedSortColumns = ['created_at', 'status', 'updated_at', 'initiator_id'];
    const sortColumn = allowedSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // 构建 WHERE 条件
    const conditions = [];
    const params = [];

    if (status) {
      conditions.push('e.status = ?');
      params.push(status);
    }
    if (flowId) {
      conditions.push('e.flow_id = ?');
      params.push(flowId);
    }
    if (initiatorId) {
      conditions.push('e.initiator_id = ?');
      params.push(initiatorId);
    }
    if (startDate) {
      conditions.push('e.created_at >= ?');
      params.push(parseInt(startDate));
    }
    if (endDate) {
      conditions.push('e.created_at <= ?');
      params.push(parseInt(endDate));
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    // 获取总数
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM flow_executions e ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    // 获取分页数据
    const [executions] = await pool.query(
      `
      SELECT
        e.*,
        u.name as initiator_name,
        f.name as flow_name,
        (SELECT COUNT(*) FROM flow_execution_steps WHERE execution_id = e.id) as step_count,
        (SELECT COUNT(*) FROM flow_execution_steps WHERE execution_id = e.id AND status = 'completed') as completed_step_count
      FROM flow_executions e
      LEFT JOIN users u ON e.initiator_id = u.id
      LEFT JOIN flows f ON e.flow_id = f.id
      ${whereClause}
      ORDER BY e.${sortColumn} ${sortOrder}
      LIMIT ? OFFSET ?
      `,
      [...params, pageSize, offset]
    );

    const totalPages = Math.ceil(total / pageSize);

    res.json({
      total,
      page: pageNum,
      limit: pageSize,
      pages: totalPages,
      hasMore: pageNum < totalPages,
      data: executions
    });
  } catch (error) {
    console.error('全局查询执行实例失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/flows/:id/executions - 获取流程的所有执行实例
router.get('/:id/executions', async (req, res) => {
  const { id } = req.params;
  try {
    const [executions] = await pool.query(`
      SELECT e.*, u.name as initiator_name
      FROM flow_executions e
      LEFT JOIN users u ON e.initiator_id = u.id
      WHERE e.flow_id = ?
      ORDER BY e.created_at DESC
    `, [id]);

    res.json(executions);
  } catch (error) {
    console.error('获取执行实例失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/flows/executions/:executionId - 获取执行详情（含步骤）
router.get('/executions/:executionId', async (req, res) => {
  const { executionId } = req.params;
  try {
    const [executions] = await pool.query(`
      SELECT e.*, u.name as initiator_name, f.name as flow_name
      FROM flow_executions e
      LEFT JOIN users u ON e.initiator_id = u.id
      LEFT JOIN flows f ON e.flow_id = f.id
      WHERE e.id = ?
    `, [executionId]);

    if (executions.length === 0) {
      return res.status(404).json({ error: '执行实例不存在' });
    }

    const [steps] = await pool.query(`
      SELECT s.*, u.name as assignee_name
      FROM flow_execution_steps s
      LEFT JOIN users u ON s.assignee_id = u.id
      WHERE s.execution_id = ?
      ORDER BY s.step_order ASC
    `, [executionId]);

    res.json({ ...executions[0], steps });
  } catch (error) {
    console.error('获取执行详情失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/flows/:id/executions - 创建执行实例
router.post('/:id/executions', async (req, res) => {
  const { id } = req.params;
  const { flowReleaseId, initiatorId, context } = req.body;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 获取流程定义
    const [flows] = await connection.query('SELECT * FROM flows WHERE id = ?', [id]);
    if (flows.length === 0) {
      throw new Error('流程不存在');
    }

    const [steps] = await connection.query(
      'SELECT * FROM flow_steps WHERE flow_id = ? ORDER BY step_order ASC',
      [id]
    );

    // 创建执行实例
    const executionId = randomUUID();
    const executionNo = await generateExecutionNo();
    const now = Date.now();

    await connection.query(`
      INSERT INTO flow_executions
      (id, execution_no, flow_id, flow_release_id, status, initiator_id, context, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?)
    `, [executionId, executionNo, id, flowReleaseId || null, initiatorId || null,
        context ? JSON.stringify(context) : null, now, now]);

    // 创建步骤记录
    for (const step of steps) {
      await connection.query(`
        INSERT INTO flow_execution_steps
        (id, execution_id, step_id, step_name, step_order, status, created_at)
        VALUES (?, ?, ?, ?, ?, 'pending', ?)
      `, [randomUUID(), executionId, step.id, step.name, step.step_order, now]);
    }

    await connection.commit();

    // 返回完整数据
    const [result] = await connection.query(
      'SELECT * FROM flow_executions WHERE id = ?',
      [executionId]
    );

    res.status(201).json(result[0]);
  } catch (error) {
    await connection.rollback();
    console.error('创建执行实例失败:', error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// POST /api/flows/executions/:executionId/start - 启动执行
router.post('/executions/:executionId/start', async (req, res) => {
  const { executionId } = req.params;
  const { variableValues } = req.body || {};
  const now = Date.now();

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 获取执行实例信息
    const [executions] = await connection.query(
      'SELECT * FROM flow_executions WHERE id = ?',
      [executionId]
    );

    if (executions.length === 0) {
      return res.status(404).json({ error: '执行实例不存在' });
    }

    const execution = executions[0];

    // 获取流程的所有变量定义
    const [flowVariables] = await connection.query(
      'SELECT * FROM flow_variables WHERE flow_id = ?',
      [execution.flow_id]
    );

    // 获取所有步骤和参数映射
    const [steps] = await connection.query(
      'SELECT * FROM flow_steps WHERE flow_id = ? ORDER BY step_order ASC',
      [execution.flow_id]
    );

    // 获取所有执行步骤
    const [executionSteps] = await connection.query(
      'SELECT * FROM flow_execution_steps WHERE execution_id = ? ORDER BY step_order ASC',
      [executionId]
    );

    // 处理每个步骤的参数
    const variableMap = { ...variableValues };
    let previousStepOutput = {};

    for (const execStep of executionSteps) {
      const [params] = await connection.query(
        'SELECT * FROM flow_step_parameters WHERE step_id = ? AND param_type = ?',
        [execStep.step_id, 'input']
      );

      // 评估输入参数
      const inputData = evaluateStepParameters(params, {
        variableValues: variableMap,
        flowVariables,
        previousStepOutput
      });

      // 保存输入参数到执行步骤
      if (Object.keys(inputData).length > 0) {
        await connection.query(`
          UPDATE flow_execution_steps
          SET input_data = ?
          WHERE id = ?
        `, [JSON.stringify(inputData), execStep.id]);
      }
    }

    // 更新执行状态为运行中
    await connection.query(`
      UPDATE flow_executions
      SET status = 'running', started_at = ?, updated_at = ?
      WHERE id = ?
    `, [now, now, executionId]);

    await connection.commit();
    res.json({ success: true });
  } catch (error) {
    await connection.rollback();
    console.error('启动执行失败:', error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// POST /api/flows/executions/:executionId/steps/:stepId/complete - 完成步骤并处理参数传递
router.post('/executions/:executionId/steps/:stepId/complete', async (req, res) => {
  const { executionId, stepId } = req.params;
  const { result, status, outputData } = req.body;
  const now = Date.now();

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 获取执行步骤
    const [stepResult] = await connection.query(`
      SELECT es.*, f.id as flow_id FROM flow_execution_steps es
      JOIN flow_executions e ON es.execution_id = e.id
      JOIN flows f ON e.flow_id = f.id
      WHERE es.execution_id = ? AND es.step_id = ?
    `, [executionId, stepId]);

    if (stepResult.length === 0) {
      return res.status(404).json({ error: '步骤记录不存在' });
    }

    const execStep = stepResult[0];
    const startedAt = execStep.started_at || now;
    const duration = now - startedAt;
    const flowId = execStep.flow_id;

    // 处理输出参数映射
    let processedOutputData = outputData || {};
    if (result) {
      const [outputParams] = await connection.query(
        'SELECT * FROM flow_step_parameters WHERE step_id = ? AND param_type = ?',
        [stepId, 'output']
      );

      // 根据输出参数映射配置，提取结果中的数据
      if (outputParams.length > 0) {
        processedOutputData = {};
        for (const param of outputParams) {
          const mappingTo = param.mapping_to || param.param_name;
          // 从 result 对象中获取对应字段的值
          processedOutputData[mappingTo] = result[param.param_name] || result[param.source_value];
        }
      }
    }

    // 更新步骤状态和数据
    await connection.query(`
      UPDATE flow_execution_steps
      SET status = ?, result = ?, output_data = ?, completed_at = ?, duration = ?
      WHERE execution_id = ? AND step_id = ?
    `, [
      status || 'completed',
      result ? JSON.stringify(result) : null,
      Object.keys(processedOutputData).length > 0 ? JSON.stringify(processedOutputData) : null,
      now,
      duration,
      executionId,
      stepId
    ]);

    // 获取下一个待执行步骤并应用参数
    const [allSteps] = await connection.query(`
      SELECT * FROM flow_execution_steps
      WHERE execution_id = ?
      ORDER BY step_order ASC
    `, [executionId]);

    const currentStepIndex = allSteps.findIndex(s => s.step_id === stepId);

    // 为下一个步骤应用参数映射
    if (currentStepIndex < allSteps.length - 1) {
      const nextExecStep = allSteps[currentStepIndex + 1];

      // 获取流程变量
      const [flowVariables] = await connection.query(
        'SELECT * FROM flow_variables WHERE flow_id = ?',
        [flowId]
      );

      // 获取下一步的参数映射
      const [nextParams] = await connection.query(
        'SELECT * FROM flow_step_parameters WHERE step_id = ? AND param_type = ?',
        [nextExecStep.step_id, 'input']
      );

      // 评估输入参数（包括来自前一步的输出）
      const inputData = evaluateStepParameters(nextParams, {
        variableValues: {},
        flowVariables,
        previousStepOutput: processedOutputData
      });

      // 保存输入参数到下一个执行步骤
      if (Object.keys(inputData).length > 0) {
        await connection.query(`
          UPDATE flow_execution_steps
          SET input_data = ?
          WHERE id = ?
        `, [JSON.stringify(inputData), nextExecStep.id]);
      }
    }

    // 检查是否所有步骤完成
    const [completedCount] = await connection.query(`
      SELECT COUNT(*) as completed
      FROM flow_execution_steps
      WHERE execution_id = ? AND status IN ('completed', 'skipped')
    `, [executionId]);

    if (completedCount[0].completed === allSteps.length) {
      // 标记执行完成
      await connection.query(`
        UPDATE flow_executions
        SET status = 'completed', completed_at = ?, updated_at = ?
        WHERE id = ?
      `, [now, now, executionId]);

      // 记录执行完成日志
      await recordExecutionLog(connection, executionId, 'execution_completed', {
        detail: '流程执行已完成',
        totalSteps: allSteps.length,
        duration
      });
    }

    await connection.commit();
    res.json({ success: true, outputData: processedOutputData });
  } catch (error) {
    await connection.rollback();
    console.error('完成步骤失败:', error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// POST /api/flows/executions/:executionId/steps/:stepId/start - 启动单个步骤执行
router.post('/executions/:executionId/steps/:stepId/start', async (req, res) => {
  const { executionId, stepId } = req.params;
  const now = Date.now();

  const connection = await pool.getConnection();
  try {
    // 获取执行步骤和执行实例信息
    const [stepResult] = await connection.query(`
      SELECT es.*, e.flow_id FROM flow_execution_steps es
      JOIN flow_executions e ON es.execution_id = e.id
      WHERE es.execution_id = ? AND es.step_id = ?
    `, [executionId, stepId]);

    if (stepResult.length === 0) {
      return res.status(404).json({ error: '步骤记录不存在' });
    }

    const execStep = stepResult[0];

    // 更新步骤状态为运行中
    await connection.query(`
      UPDATE flow_execution_steps
      SET status = 'running', started_at = ?, updated_at = ?
      WHERE execution_id = ? AND step_id = ?
    `, [now, now, executionId, stepId]);

    // 获取该步骤的输入参数
    const [inputParams] = await connection.query(`
      SELECT * FROM flow_execution_steps
      WHERE execution_id = ? AND step_id = ?
    `, [executionId, stepId]);

    const inputData = inputParams[0]?.input_data ? JSON.parse(inputParams[0].input_data) : {};

    await connection.commit();

    res.json({
      success: true,
      inputData,
      startedAt: now
    });
  } catch (error) {
    await connection.rollback();
    console.error('启动步骤失败:', error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// GET /api/flows/executions/:executionId/steps/:stepId/input-data - 获取步骤输入参数
router.get('/executions/:executionId/steps/:stepId/input-data', async (req, res) => {
  const { executionId, stepId } = req.params;

  try {
    const [stepData] = await pool.query(`
      SELECT input_data FROM flow_execution_steps
      WHERE execution_id = ? AND step_id = ?
    `, [executionId, stepId]);

    if (stepData.length === 0) {
      return res.status(404).json({ error: '步骤记录不存在' });
    }

    const inputData = stepData[0].input_data ? JSON.parse(stepData[0].input_data) : {};

    res.json({
      inputData,
      paramCount: Object.keys(inputData).length
    });
  } catch (error) {
    console.error('获取步骤输入参数失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ 流程自动化 API ============

// GET /api/flows/:flowId/automation/rules - 获取流程的自动化规则
router.get('/:flowId/automation/rules', async (req, res) => {
  const { flowId } = req.params;
  try {
    const [rules] = await pool.query(`
      SELECT r.*, u.name as created_by_name
      FROM flow_automation_rules r
      LEFT JOIN users u ON r.created_by = u.id
      WHERE r.flow_id = ?
      ORDER BY r.created_at DESC
    `, [flowId]);

    res.json(rules);
  } catch (error) {
    console.error('获取自动化规则失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/flows/:flowId/automation/rules - 创建自动化规则
router.post('/:flowId/automation/rules', async (req, res) => {
  const { flowId } = req.params;
  const { ruleName, ruleType, triggerType, triggerConfig, actionType, actionConfig, createdBy } = req.body;

  const connection = await pool.getConnection();
  try {
    // 验证流程是否存在
    const [flows] = await connection.query('SELECT id FROM flows WHERE id = ?', [flowId]);
    if (flows.length === 0) {
      return res.status(404).json({ error: '流程不存在' });
    }

    const ruleId = randomUUID();
    const now = Date.now();

    await connection.query(`
      INSERT INTO flow_automation_rules
      (id, flow_id, rule_name, rule_type, trigger_type, trigger_config, action_type, action_config, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      ruleId, flowId, ruleName, ruleType, triggerType,
      triggerConfig ? JSON.stringify(triggerConfig) : null,
      actionType, actionConfig ? JSON.stringify(actionConfig) : null,
      createdBy || null, now, now
    ]);

    const [result] = await connection.query('SELECT * FROM flow_automation_rules WHERE id = ?', [ruleId]);
    res.status(201).json(result[0]);
  } catch (error) {
    console.error('创建自动化规则失败:', error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// PUT /api/flows/automation/rules/:ruleId - 更新自动化规则
router.put('/automation/rules/:ruleId', async (req, res) => {
  const { ruleId } = req.params;
  const { ruleName, triggerType, triggerConfig, actionType, actionConfig, isEnabled } = req.body;

  const connection = await pool.getConnection();
  try {
    const now = Date.now();

    await connection.query(`
      UPDATE flow_automation_rules
      SET rule_name = ?, trigger_type = ?, trigger_config = ?, action_type = ?, action_config = ?, is_enabled = ?, updated_at = ?
      WHERE id = ?
    `, [
      ruleName, triggerType,
      triggerConfig ? JSON.stringify(triggerConfig) : null,
      actionType, actionConfig ? JSON.stringify(actionConfig) : null,
      isEnabled !== undefined ? isEnabled : true,
      now, ruleId
    ]);

    const [result] = await connection.query('SELECT * FROM flow_automation_rules WHERE id = ?', [ruleId]);
    res.json(result[0]);
  } catch (error) {
    console.error('更新自动化规则失败:', error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// DELETE /api/flows/automation/rules/:ruleId - 删除自动化规则
router.delete('/automation/rules/:ruleId', async (req, res) => {
  const { ruleId } = req.params;

  try {
    await pool.query('DELETE FROM flow_automation_rules WHERE id = ?', [ruleId]);
    res.json({ success: true });
  } catch (error) {
    console.error('删除自动化规则失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/flows/automation/rules/:ruleId/toggle - 启用/禁用规则
router.post('/automation/rules/:ruleId/toggle', async (req, res) => {
  const { ruleId } = req.params;
  const { isEnabled } = req.body;

  try {
    const now = Date.now();
    await pool.query(`
      UPDATE flow_automation_rules
      SET is_enabled = ?, updated_at = ?
      WHERE id = ?
    `, [isEnabled || false, now, ruleId]);

    res.json({ success: true });
  } catch (error) {
    console.error('切换规则状态失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/flows/automation/logs - 获取自动化执行日志
router.get('/automation/logs', async (req, res) => {
  const { ruleId, executionId, limit = 100, offset = 0 } = req.query;

  try {
    let sql = 'SELECT * FROM flow_automation_logs WHERE 1=1';
    const params = [];

    if (ruleId) {
      sql += ' AND rule_id = ?';
      params.push(ruleId);
    }

    if (executionId) {
      sql += ' AND execution_id = ?';
      params.push(executionId);
    }

    sql += ' ORDER BY trigger_time DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [logs] = await pool.query(sql, params);

    res.json(logs);
  } catch (error) {
    console.error('获取自动化日志失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/flows/automation/execute-rule - 手动触发自动化规则
router.post('/automation/execute-rule', async (req, res) => {
  const { ruleId, executionId } = req.body;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 获取规则
    const [rules] = await connection.query('SELECT * FROM flow_automation_rules WHERE id = ?', [ruleId]);
    if (rules.length === 0) {
      return res.status(404).json({ error: '规则不存在' });
    }

    const rule = rules[0];
    const logId = randomUUID();
    const now = Date.now();
    let actionExecuted = false;
    let actionResult = null;

    try {
      // 根据规则类型执行相应的操作
      const actionConfig = JSON.parse(rule.action_config || '{}');

      if (rule.action_type === 'execute_step' && executionId && actionConfig.stepId) {
        // 完成步骤
        await connection.query(`
          UPDATE flow_execution_steps
          SET status = 'completed', completed_at = ?
          WHERE execution_id = ? AND step_id = ?
        `, [now, executionId, actionConfig.stepId]);

        actionExecuted = true;
        actionResult = { type: 'step_completed', stepId: actionConfig.stepId };
      } else if (rule.action_type === 'skip_step' && executionId && actionConfig.stepId) {
        // 跳过步骤
        await connection.query(`
          UPDATE flow_execution_steps
          SET status = 'skipped', completed_at = ?
          WHERE execution_id = ? AND step_id = ?
        `, [now, executionId, actionConfig.stepId]);

        actionExecuted = true;
        actionResult = { type: 'step_skipped', stepId: actionConfig.stepId };
      } else if (rule.action_type === 'execute_flow' && actionConfig.flowId) {
        // 创建新的流程执行实例
        const execNo = await generateExecutionNo();
        const newExecId = randomUUID();

        await connection.query(`
          INSERT INTO flow_executions
          (id, execution_no, flow_id, status, created_at, updated_at)
          VALUES (?, ?, ?, 'pending', ?, ?)
        `, [newExecId, execNo, actionConfig.flowId, now, now]);

        actionExecuted = true;
        actionResult = { type: 'flow_executed', executionNo: execNo };
      }

      // 记录自动化执行
      await connection.query(`
        INSERT INTO flow_automation_logs
        (id, rule_id, execution_id, trigger_time, action_executed, action_result, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [logId, ruleId, executionId || null, now, actionExecuted, actionResult ? JSON.stringify(actionResult) : null, now]);

      await connection.commit();

      res.json({
        success: actionExecuted,
        message: actionExecuted ? '规则执行成功' : '规则执行失败',
        result: actionResult
      });
    } catch (execError) {
      await connection.rollback();
      console.error('执行规则操作时出错:', execError);
      res.status(500).json({ error: execError.message });
    }
  } catch (error) {
    await connection.rollback();
    console.error('手动触发规则失败:', error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// ================== 流程图编辑器 API ==================

// GET /api/flows/:id/diagram - 获取流程图完整数据（节点+连线）
router.get('/:id/diagram', async (req, res) => {
  const { id } = req.params;

  try {
    // 获取流程基本信息
    const [flows] = await pool.query('SELECT * FROM flows WHERE id = ?', [id]);
    if (flows.length === 0) {
      return res.status(404).json({ error: '流程不存在' });
    }

    // 获取步骤节点
    const [steps] = await pool.query(
      'SELECT * FROM flow_steps WHERE flow_id = ? ORDER BY step_order ASC',
      [id]
    );

    // 获取连线
    const [connections] = await pool.query(
      'SELECT * FROM flow_connections WHERE flow_id = ? ORDER BY created_at ASC',
      [id]
    );

    res.json({
      flow: flows[0],
      nodes: steps,
      edges: connections
    });
  } catch (error) {
    console.error('获取流程图数据失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/flows/:id/nodes - 创建节点
router.post('/:id/nodes', flowWriteProtect, async (req, res) => {
  const { id: flowId } = req.params;
  const {
    name,
    description,
    assignee,
    duration,
    position_x,
    position_y,
    node_type = 'userTask',
    node_width = 120,
    node_height = 80
  } = req.body;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 验证流程存在
    const [flows] = await connection.query('SELECT id FROM flows WHERE id = ?', [flowId]);
    if (flows.length === 0) {
      throw new Error('流程不存在');
    }

    // 获取下一个步骤序号
    const [stepOrderResult] = await connection.query(
      'SELECT COALESCE(MAX(step_order), 0) + 1 as next_order FROM flow_steps WHERE flow_id = ?',
      [flowId]
    );
    const stepOrder = stepOrderResult[0].next_order;

    const stepId = randomUUID();
    const now = Date.now();

    await connection.query(`
      INSERT INTO flow_steps
      (id, flow_id, name, description, assignee, duration, step_order, position_x, position_y,
       node_type, node_width, node_height, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      stepId, flowId, name, description, assignee, duration, stepOrder,
      position_x, position_y, node_type, node_width, node_height, now, now
    ]);

    await connection.commit();

    const [result] = await connection.query('SELECT * FROM flow_steps WHERE id = ?', [stepId]);
    res.status(201).json(result[0]);
  } catch (error) {
    await connection.rollback();
    console.error('创建节点失败:', error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// PUT /api/flows/:id/nodes/:nodeId - 更新节点
router.put('/:id/nodes/:nodeId', flowWriteProtect, async (req, res) => {
  const { id: flowId, nodeId } = req.params;
  const {
    name,
    description,
    assignee,
    duration,
    position_x,
    position_y,
    node_width,
    node_height
  } = req.body;

  try {
    const now = Date.now();

    await pool.query(`
      UPDATE flow_steps
      SET name = ?, description = ?, assignee = ?, duration = ?,
          position_x = ?, position_y = ?, node_width = ?, node_height = ?, updated_at = ?
      WHERE id = ? AND flow_id = ?
    `, [
      name, description, assignee, duration,
      position_x, position_y, node_width, node_height, now,
      nodeId, flowId
    ]);

    const [result] = await pool.query('SELECT * FROM flow_steps WHERE id = ?', [nodeId]);
    res.json(result[0]);
  } catch (error) {
    console.error('更新节点失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/flows/:id/nodes/:nodeId - 删除节点
router.delete('/:id/nodes/:nodeId', flowWriteProtect, async (req, res) => {
  const { id: flowId, nodeId } = req.params;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 删除相关连线
    await connection.query(`
      DELETE FROM flow_connections
      WHERE flow_id = ? AND (source_step_id = ? OR target_step_id = ?)
    `, [flowId, nodeId, nodeId]);

    // 删除节点
    await connection.query('DELETE FROM flow_steps WHERE id = ? AND flow_id = ?', [nodeId, flowId]);

    await connection.commit();
    res.json({ success: true });
  } catch (error) {
    await connection.rollback();
    console.error('删除节点失败:', error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// POST /api/flows/:id/connections - 创建连线
router.post('/:id/connections', flowWriteProtect, async (req, res) => {
  const { id: flowId } = req.params;
  const { source_step_id, target_step_id, label, condition_config } = req.body;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 验证源节点和目标节点存在
    const [sourceNodes] = await connection.query(
      'SELECT id FROM flow_steps WHERE id = ? AND flow_id = ?',
      [source_step_id, flowId]
    );
    const [targetNodes] = await connection.query(
      'SELECT id FROM flow_steps WHERE id = ? AND flow_id = ?',
      [target_step_id, flowId]
    );

    if (sourceNodes.length === 0 || targetNodes.length === 0) {
      throw new Error('源节点或目标节点不存在');
    }

    const connectionId = randomUUID();
    const now = Date.now();

    await connection.query(`
      INSERT INTO flow_connections
      (id, flow_id, source_step_id, target_step_id, label, condition_config, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      connectionId, flowId, source_step_id, target_step_id, label,
      condition_config ? JSON.stringify(condition_config) : null, now, now
    ]);

    await connection.commit();

    const [result] = await connection.query('SELECT * FROM flow_connections WHERE id = ?', [connectionId]);
    res.status(201).json(result[0]);
  } catch (error) {
    await connection.rollback();
    console.error('创建连线失败:', error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// DELETE /api/flows/:id/connections/:connectionId - 删除连线
router.delete('/:id/connections/:connectionId', flowWriteProtect, async (req, res) => {
  const { id: flowId, connectionId } = req.params;

  try {
    await pool.query('DELETE FROM flow_connections WHERE id = ? AND flow_id = ?', [connectionId, flowId]);
    res.json({ success: true });
  } catch (error) {
    console.error('删除连线失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * ==================== Phase 3: 参数传递与数据映射 ====================
 */

// GET /api/flows/:id/variables - 获取流程变量列表
router.get('/:id/variables', async (req, res) => {
  const { id: flowId } = req.params;

  try {
    const [variables] = await pool.query(`
      SELECT id, flow_id, name, type, default_value, description, required, created_at, updated_at
      FROM flow_variables
      WHERE flow_id = ?
      ORDER BY created_at ASC
    `, [flowId]);

    res.json(variables);
  } catch (error) {
    console.error('获取流程变量失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/flows/:id/variables - 创建流程变量
router.post('/:id/variables', flowWriteProtect, async (req, res) => {
  const { id: flowId } = req.params;
  const { name, type = 'string', defaultValue, description, required = false } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ error: '变量名称不能为空' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const variableId = randomUUID();
    const now = Date.now();

    await connection.query(`
      INSERT INTO flow_variables
      (id, flow_id, name, type, default_value, description, required, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [variableId, flowId, name, type, defaultValue ? JSON.stringify(defaultValue) : null, description, required, now, now]);

    await connection.commit();

    res.status(201).json({
      id: variableId,
      flowId,
      name,
      type,
      defaultValue,
      description,
      required,
      createdAt: now,
      updatedAt: now
    });
  } catch (error) {
    await connection.rollback();
    console.error('创建流程变量失败:', error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// PUT /api/flows/:id/variables/:varId - 更新流程变量
router.put('/:id/variables/:varId', flowWriteProtect, async (req, res) => {
  const { id: flowId, varId } = req.params;
  const { name, type, defaultValue, description, required } = req.body;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const now = Date.now();

    await connection.query(`
      UPDATE flow_variables
      SET name = ?, type = ?, default_value = ?, description = ?, required = ?, updated_at = ?
      WHERE id = ? AND flow_id = ?
    `, [name, type, defaultValue ? JSON.stringify(defaultValue) : null, description, required, now, varId, flowId]);

    await connection.commit();

    res.json({ success: true });
  } catch (error) {
    await connection.rollback();
    console.error('更新流程变量失败:', error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// DELETE /api/flows/:id/variables/:varId - 删除流程变量
router.delete('/:id/variables/:varId', flowWriteProtect, async (req, res) => {
  const { id: flowId, varId } = req.params;

  try {
    await pool.query(
      'DELETE FROM flow_variables WHERE id = ? AND flow_id = ?',
      [varId, flowId]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('删除流程变量失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/flows/:id/steps/:stepId/parameters - 获取步骤参数映射
router.get('/:id/steps/:stepId/parameters', async (req, res) => {
  const { id: flowId, stepId } = req.params;

  try {
    const [parameters] = await pool.query(`
      SELECT id, flow_id, step_id, param_type, param_name, source_type, source_value,
             mapping_to, description, step_order, created_at, updated_at
      FROM flow_step_parameters
      WHERE flow_id = ? AND step_id = ?
      ORDER BY param_type ASC, step_order ASC, created_at ASC
    `, [flowId, stepId]);

    res.json(parameters);
  } catch (error) {
    console.error('获取步骤参数映射失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/flows/:id/steps/:stepId/parameters - 创建参数映射
router.post('/:id/steps/:stepId/parameters', flowWriteProtect, async (req, res) => {
  const { id: flowId, stepId } = req.params;
  const { paramType = 'input', paramName, sourceType = 'constant', sourceValue, mappingTo, description, stepOrder } = req.body;

  if (!paramName || paramName.trim() === '') {
    return res.status(400).json({ error: '参数名称不能为空' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const paramId = randomUUID();
    const now = Date.now();

    await connection.query(`
      INSERT INTO flow_step_parameters
      (id, flow_id, step_id, param_type, param_name, source_type, source_value, mapping_to, description, step_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [paramId, flowId, stepId, paramType, paramName, sourceType, sourceValue, mappingTo, description, stepOrder, now, now]);

    await connection.commit();

    res.status(201).json({
      id: paramId,
      flowId,
      stepId,
      paramType,
      paramName,
      sourceType,
      sourceValue,
      mappingTo,
      description,
      stepOrder,
      createdAt: now,
      updatedAt: now
    });
  } catch (error) {
    await connection.rollback();
    console.error('创建参数映射失败:', error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// PUT /api/flows/:id/parameters/:paramId - 更新参数映射
router.put('/:id/parameters/:paramId', flowWriteProtect, async (req, res) => {
  const { id: flowId, paramId } = req.params;
  const { paramType, paramName, sourceType, sourceValue, mappingTo, description, stepOrder } = req.body;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const now = Date.now();

    await connection.query(`
      UPDATE flow_step_parameters
      SET param_type = ?, param_name = ?, source_type = ?, source_value = ?,
          mapping_to = ?, description = ?, step_order = ?, updated_at = ?
      WHERE id = ? AND flow_id = ?
    `, [paramType, paramName, sourceType, sourceValue, mappingTo, description, stepOrder, now, paramId, flowId]);

    await connection.commit();

    res.json({ success: true });
  } catch (error) {
    await connection.rollback();
    console.error('更新参数映射失败:', error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// DELETE /api/flows/:id/parameters/:paramId - 删除参数映射
router.delete('/:id/parameters/:paramId', flowWriteProtect, async (req, res) => {
  const { id: flowId, paramId } = req.params;

  try {
    await pool.query(
      'DELETE FROM flow_step_parameters WHERE id = ? AND flow_id = ?',
      [paramId, flowId]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('删除参数映射失败:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
