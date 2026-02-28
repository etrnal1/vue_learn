import express from 'express';
import pool from '../db.js';

const router = express.Router();

// 生成工单编号
async function generateTicketNo() {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query("UPDATE counters SET value = value + 1 WHERE id = 'ticket'");
    const [rows] = await connection.query("SELECT value FROM counters WHERE id = 'ticket'");
    await connection.commit();
    const num = rows[0].value;
    return `TK${String(num).padStart(6, '0')}`;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// GET /api/tickets - 获取所有工单
router.get('/', async (req, res) => {
  try {
    const [tickets] = await pool.query(`
      SELECT
        t.*,
        u1.name as assignee_name,
        u2.name as reporter_name
      FROM tickets t
      LEFT JOIN users u1 ON t.assignee_id = u1.id
      LEFT JOIN users u2 ON t.reporter_id = u2.id
      ORDER BY t.created_at DESC
    `);
    // camelCase 中间件会自动转换键名
    res.json(tickets);
  } catch (error) {
    console.error('获取工单列表失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/tickets/:id - 获取单个工单（含评论）
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [tickets] = await pool.query(`
      SELECT
        t.*,
        u1.name as assignee_name,
        u2.name as reporter_name
      FROM tickets t
      LEFT JOIN users u1 ON t.assignee_id = u1.id
      LEFT JOIN users u2 ON t.reporter_id = u2.id
      WHERE t.id = ?
    `, [id]);

    if (tickets.length === 0) {
      return res.status(404).json({ error: '工单不存在' });
    }

    const [comments] = await pool.query(`
      SELECT
        c.*,
        u.name as user_name,
        u.avatar as user_avatar
      FROM ticket_comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.ticket_id = ?
      ORDER BY c.created_at ASC
    `, [id]);

    const ticket = { ...tickets[0], comments };
    res.json(ticket);
  } catch (error) {
    console.error('获取工单详情失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/tickets - 创建工单
router.post('/', async (req, res) => {
  try {
    const {
      id,
      title,
      description,
      category,
      priority,
      status,
      assigneeId,
      reporterId,
      relatedArticleIds,
      attachments
    } = req.body;

    if (!id || !title) {
      return res.status(400).json({ error: '缺少必需字段: id 或 title' });
    }

    const ticketNo = await generateTicketNo();
    const now = Date.now();

    await pool.query(
      `INSERT INTO tickets (
        id, ticket_no, title, description, category, priority, status,
        assignee_id, reporter_id, related_article_ids, attachments,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        ticketNo,
        title,
        description || null,
        category || null,
        priority || 'medium',
        status || 'new',
        assigneeId || null,
        reporterId || null,
        JSON.stringify(relatedArticleIds || []),
        JSON.stringify(attachments || []),
        now,
        now
      ]
    );

    const [tickets] = await pool.query('SELECT * FROM tickets WHERE id = ?', [id]);
    res.status(201).json(tickets[0]);
  } catch (error) {
    console.error('创建工单失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/tickets/:id - 更新工单
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const fields = [];
    const values = [];

    const fieldMapping = {
      title: 'title',
      description: 'description',
      category: 'category',
      priority: 'priority',
      status: 'status',
      assigneeId: 'assignee_id',
      reporterId: 'reporter_id',
      resolvedAt: 'resolved_at',
      closedAt: 'closed_at'
    };

    Object.keys(updates).forEach(key => {
      if (fieldMapping[key]) {
        fields.push(`${fieldMapping[key]} = ?`);
        values.push(updates[key]);
      } else if (key === 'relatedArticleIds') {
        fields.push('related_article_ids = ?');
        values.push(JSON.stringify(updates[key]));
      } else if (key === 'attachments') {
        fields.push('attachments = ?');
        values.push(JSON.stringify(updates[key]));
      }
    });

    if (fields.length === 0) {
      return res.status(400).json({ error: '没有提供更新字段' });
    }

    fields.push('updated_at = ?');
    values.push(Date.now());
    values.push(id);

    await pool.query(
      `UPDATE tickets SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    const [tickets] = await pool.query('SELECT * FROM tickets WHERE id = ?', [id]);

    if (tickets.length === 0) {
      return res.status(404).json({ error: '工单不存在' });
    }

    res.json(tickets[0]);
  } catch (error) {
    console.error('更新工单失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/tickets/:id - 删除工单
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM tickets WHERE id = ?', [id]);

    if (result[0].affectedRows === 0) {
      return res.status(404).json({ error: '工单不存在' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('删除工单失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/tickets/:id/comments - 添加评论
router.post('/:id/comments', async (req, res) => {
  const { id } = req.params;
  const { commentId, userId, text } = req.body;

  if (!commentId || !text) {
    return res.status(400).json({ error: '缺少必需字段: commentId 或 text' });
  }

  try {
    const [tickets] = await pool.query('SELECT id FROM tickets WHERE id = ?', [id]);
    if (tickets.length === 0) {
      return res.status(404).json({ error: '工单不存在' });
    }

    const now = Date.now();

    await pool.query(
      'INSERT INTO ticket_comments (id, ticket_id, user_id, text, created_at) VALUES (?, ?, ?, ?, ?)',
      [commentId, id, userId || null, text, now]
    );

    await pool.query('UPDATE tickets SET updated_at = ? WHERE id = ?', [now, id]);

    const [comments] = await pool.query(`
      SELECT
        c.*,
        u.name as user_name,
        u.avatar as user_avatar
      FROM ticket_comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `, [commentId]);

    res.status(201).json(comments[0]);
  } catch (error) {
    console.error('添加评论失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/tickets/:ticketId/comments/:commentId - 删除评论
router.delete('/:ticketId/comments/:commentId', async (req, res) => {
  const { ticketId, commentId } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM ticket_comments WHERE id = ? AND ticket_id = ?',
      [commentId, ticketId]
    );

    if (result[0].affectedRows === 0) {
      return res.status(404).json({ error: '评论不存在' });
    }

    await pool.query('UPDATE tickets SET updated_at = ? WHERE id = ?', [Date.now(), ticketId]);

    res.json({ success: true });
  } catch (error) {
    console.error('删除评论失败:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
