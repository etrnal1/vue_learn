import express from 'express';
import { randomUUID } from 'crypto';
import pool from '../db.js';

const router = express.Router();

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
router.post('/:id/releases', async (req, res) => {
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
    const [rows] = await pool.query('SELECT * FROM flow_releases WHERE id = ?', [releaseId]);
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('创建发布记录失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/flows/:id/releases/rollback - 回滚到上一个版本
router.post('/:id/releases/rollback', async (req, res) => {
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

// GET /api/flows/:id - 获取单个流程（含步骤）
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

// POST /api/flows - 创建流程（含步骤）
router.post('/', async (req, res) => {
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
          `INSERT INTO flow_steps (id, flow_id, step_order, name, description, assignee, duration, conditional)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            step.id || `step_${Date.now()}_${stepIndex}`,
            id,
            step.order !== undefined ? step.order : stepIndex,
            step.name || '',
            step.description || null,
            step.assignee || null,
            step.duration || null,
            step.conditional || false
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
router.put('/:id', async (req, res) => {
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
            `INSERT INTO flow_steps (id, flow_id, step_order, name, description, assignee, duration, conditional)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              step.id || `step_${Date.now()}_${stepIndex}`,
              id,
              step.order !== undefined ? step.order : stepIndex,
              step.name || '',
              step.description || null,
              step.assignee || null,
              step.duration || null,
              step.conditional || false
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
router.delete('/:id', async (req, res) => {
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
  const now = Date.now();

  try {
    await pool.query(`
      UPDATE flow_executions
      SET status = 'running', started_at = ?, updated_at = ?
      WHERE id = ?
    `, [now, now, executionId]);

    res.json({ success: true });
  } catch (error) {
    console.error('启动执行失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/flows/executions/:executionId/steps/:stepId/complete - 完成步骤
router.post('/executions/:executionId/steps/:stepId/complete', async (req, res) => {
  const { executionId, stepId } = req.params;
  const { result, status } = req.body;
  const now = Date.now();

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 更新步骤状态
    const [stepResult] = await connection.query(`
      SELECT started_at FROM flow_execution_steps
      WHERE execution_id = ? AND step_id = ?
    `, [executionId, stepId]);

    const startedAt = stepResult[0]?.started_at || now;
    const duration = now - startedAt;

    await connection.query(`
      UPDATE flow_execution_steps
      SET status = ?, result = ?, completed_at = ?, duration = ?
      WHERE execution_id = ? AND step_id = ?
    `, [status || 'completed', result ? JSON.stringify(result) : null, now, duration, executionId, stepId]);

    // 检查是否所有步骤完成
    const [allSteps] = await connection.query(`
      SELECT COUNT(*) as total,
             SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
      FROM flow_execution_steps
      WHERE execution_id = ?
    `, [executionId]);

    if (allSteps[0].total === allSteps[0].completed) {
      // 标记执行完成
      await connection.query(`
        UPDATE flow_executions
        SET status = 'completed', completed_at = ?, updated_at = ?
        WHERE id = ?
      `, [now, now, executionId]);
    }

    await connection.commit();
    res.json({ success: true });
  } catch (error) {
    await connection.rollback();
    console.error('完成步骤失败:', error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
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

export default router;
