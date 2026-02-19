import express from 'express';
import pool from '../db.js';

const router = express.Router();

// 生成服务请求编号
async function generateRequestNo() {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query("UPDATE counters SET value = value + 1 WHERE id = 'request'");
    const [rows] = await connection.query("SELECT value FROM counters WHERE id = 'request'");
    await connection.commit();
    const num = rows[0].value;
    return `SR${String(num).padStart(6, '0')}`;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// GET /api/service-requests - 获取所有服务请求
router.get('/', async (req, res) => {
  try {
    const [requests] = await pool.query(`
      SELECT
        sr.*,
        u1.name as requester_name,
        u2.name as approver_name,
        u3.name as assignee_name
      FROM service_requests sr
      LEFT JOIN users u1 ON sr.requester_id = u1.id
      LEFT JOIN users u2 ON sr.approver_id = u2.id
      LEFT JOIN users u3 ON sr.assignee_id = u3.id
      ORDER BY sr.created_at DESC
    `);
    res.json(requests);
  } catch (error) {
    console.error('获取服务请求列表失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/service-requests/:id - 获取单个服务请求（含评论）
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [requests] = await pool.query(`
      SELECT
        sr.*,
        u1.name as requester_name,
        u2.name as approver_name,
        u3.name as assignee_name
      FROM service_requests sr
      LEFT JOIN users u1 ON sr.requester_id = u1.id
      LEFT JOIN users u2 ON sr.approver_id = u2.id
      LEFT JOIN users u3 ON sr.assignee_id = u3.id
      WHERE sr.id = ?
    `, [id]);

    if (requests.length === 0) {
      return res.status(404).json({ error: '服务请求不存在' });
    }

    const [comments] = await pool.query(`
      SELECT
        c.*,
        u.name as user_name,
        u.avatar as user_avatar
      FROM request_comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.request_id = ?
      ORDER BY c.created_at ASC
    `, [id]);

    const request = { ...requests[0], comments };
    res.json(request);
  } catch (error) {
    console.error('获取服务请求详情失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/service-requests - 创建服务请求
router.post('/', async (req, res) => {
  const {
    id,
    serviceType,
    title,
    description,
    priority,
    status,
    requesterId,
    approverId,
    assigneeId,
    approvalNote
  } = req.body;

  if (!id || !title) {
    return res.status(400).json({ error: '缺少必需字段: id 或 title' });
  }

  try {
    const requestNo = await generateRequestNo();
    const now = Date.now();

    await pool.query(
      `INSERT INTO service_requests (
        id, request_no, service_type, title, description, priority, status,
        requester_id, approver_id, assignee_id, approval_note,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        requestNo,
        serviceType || null,
        title,
        description || null,
        priority || 'medium',
        status || 'submitted',
        requesterId || null,
        approverId || null,
        assigneeId || null,
        approvalNote || null,
        now,
        now
      ]
    );

    const [requests] = await pool.query('SELECT * FROM service_requests WHERE id = ?', [id]);
    res.status(201).json(requests[0]);
  } catch (error) {
    console.error('创建服务请求失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/service-requests/:id - 更新服务请求
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const fields = [];
    const values = [];

    const fieldMapping = {
      serviceType: 'service_type',
      title: 'title',
      description: 'description',
      priority: 'priority',
      status: 'status',
      requesterId: 'requester_id',
      approverId: 'approver_id',
      assigneeId: 'assignee_id',
      approvalNote: 'approval_note',
      approvedAt: 'approved_at',
      completedAt: 'completed_at'
    };

    Object.keys(updates).forEach(key => {
      if (fieldMapping[key]) {
        fields.push(`${fieldMapping[key]} = ?`);
        values.push(updates[key]);
      }
    });

    if (fields.length === 0) {
      return res.status(400).json({ error: '没有提供更新字段' });
    }

    fields.push('updated_at = ?');
    values.push(Date.now());
    values.push(id);

    await pool.query(
      `UPDATE service_requests SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    const [requests] = await pool.query('SELECT * FROM service_requests WHERE id = ?', [id]);

    if (requests.length === 0) {
      return res.status(404).json({ error: '服务请求不存在' });
    }

    res.json(requests[0]);
  } catch (error) {
    console.error('更新服务请求失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/service-requests/:id - 删除服务请求
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM service_requests WHERE id = ?', [id]);

    if (result[0].affectedRows === 0) {
      return res.status(404).json({ error: '服务请求不存在' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('删除服务请求失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/service-requests/:id/comments - 添加评论
router.post('/:id/comments', async (req, res) => {
  const { id } = req.params;
  const { commentId, userId, text } = req.body;

  if (!commentId || !text) {
    return res.status(400).json({ error: '缺少必需字段: commentId 或 text' });
  }

  try {
    const [requests] = await pool.query('SELECT id FROM service_requests WHERE id = ?', [id]);
    if (requests.length === 0) {
      return res.status(404).json({ error: '服务请求不存在' });
    }

    const now = Date.now();

    await pool.query(
      'INSERT INTO request_comments (id, request_id, user_id, text, created_at) VALUES (?, ?, ?, ?, ?)',
      [commentId, id, userId || null, text, now]
    );

    await pool.query('UPDATE service_requests SET updated_at = ? WHERE id = ?', [now, id]);

    const [comments] = await pool.query(`
      SELECT
        c.*,
        u.name as user_name,
        u.avatar as user_avatar
      FROM request_comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `, [commentId]);

    res.status(201).json(comments[0]);
  } catch (error) {
    console.error('添加评论失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/service-requests/:reqId/comments/:commentId - 删除评论
router.delete('/:reqId/comments/:commentId', async (req, res) => {
  const { reqId, commentId } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM request_comments WHERE id = ? AND request_id = ?',
      [commentId, reqId]
    );

    if (result[0].affectedRows === 0) {
      return res.status(404).json({ error: '评论不存在' });
    }

    await pool.query('UPDATE service_requests SET updated_at = ? WHERE id = ?', [Date.now(), reqId]);

    res.json({ success: true });
  } catch (error) {
    console.error('删除评论失败:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
