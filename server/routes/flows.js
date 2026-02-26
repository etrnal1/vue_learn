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

export default router;
