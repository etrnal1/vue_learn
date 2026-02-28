import express from 'express';
import pool from '../db.js';

const router = express.Router();

async function getCatalogRule(serviceType) {
  if (!serviceType) return null;

  try {
    const [rules] = await pool.query(`
      SELECT
        service_type,
        default_priority,
        requires_approval,
        default_approver_role,
        default_assignee_role
      FROM service_catalog
      WHERE service_type = ? AND is_active = TRUE
      LIMIT 1
    `, [serviceType]);

    return rules.length > 0 ? rules[0] : null;
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE') {
      return null;
    }
    throw error;
  }
}

async function findUserByRole(role) {
  if (!role) return null;

  const [users] = await pool.query(`
    SELECT id
    FROM users
    WHERE role = ?
    ORDER BY created_at ASC
    LIMIT 1
  `, [role]);

  if (users.length > 0) return users[0].id;

  // 审批角色兜底到管理员，避免路由失败
  if (role === 'approver') {
    const [admins] = await pool.query(`
      SELECT id
      FROM users
      WHERE role = 'admin'
      ORDER BY created_at ASC
      LIMIT 1
    `);
    if (admins.length > 0) return admins[0].id;
  }

  return null;
}

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
    formData,
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
    const isDraft = status === 'draft';

    let finalPriority = priority || 'medium';
    let finalStatus = status || 'submitted';
    let finalApproverId = approverId || null;
    let finalAssigneeId = assigneeId || null;
    let finalApprovalNote = approvalNote || null;
    let finalApprovedAt = null;

    if (!isDraft) {
      const catalogRule = await getCatalogRule(serviceType);
      if (catalogRule) {
        if (!priority && catalogRule.default_priority) {
          finalPriority = catalogRule.default_priority;
        }

        if (!finalAssigneeId) {
          finalAssigneeId = await findUserByRole(catalogRule.default_assignee_role);
        }

        if (!finalApproverId) {
          finalApproverId = await findUserByRole(catalogRule.default_approver_role);
        }

        if (!catalogRule.requires_approval && finalStatus === 'submitted') {
          finalStatus = 'approved';
          finalApprovedAt = now;
          finalApprovalNote = finalApprovalNote || '系统自动审批（服务目录规则）';
        }
      }
    }

    try {
      await pool.query(
        `INSERT INTO service_requests (
          id, request_no, service_type, title, description, form_data, priority, status,
          requester_id, approver_id, assignee_id, approval_note,
          created_at, updated_at, approved_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          requestNo,
          serviceType || null,
          title,
          description || null,
          JSON.stringify(formData || {}),
          finalPriority,
          finalStatus,
          requesterId || null,
          finalApproverId,
          finalAssigneeId,
          finalApprovalNote,
          now,
          now,
          finalApprovedAt
        ]
      );
    } catch (insertError) {
      if (insertError.code !== 'ER_BAD_FIELD_ERROR') {
        throw insertError;
      }

      await pool.query(
        `INSERT INTO service_requests (
          id, request_no, service_type, title, description, priority, status,
          requester_id, approver_id, assignee_id, approval_note,
          created_at, updated_at, approved_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          requestNo,
          serviceType || null,
          title,
          description || null,
          finalPriority,
          finalStatus,
          requesterId || null,
          finalApproverId,
          finalAssigneeId,
          finalApprovalNote,
          now,
          now,
          finalApprovedAt
        ]
      );
    }

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
      formData: 'form_data',
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
        values.push(key === 'formData' ? JSON.stringify(updates[key] || {}) : updates[key]);
      }
    });

    if (fields.length === 0) {
      return res.status(400).json({ error: '没有提供更新字段' });
    }

    fields.push('updated_at = ?');
    values.push(Date.now());
    values.push(id);

    try {
      await pool.query(
        `UPDATE service_requests SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
    } catch (updateError) {
      const shouldRetryWithoutFormData = updateError.code === 'ER_BAD_FIELD_ERROR' && Object.prototype.hasOwnProperty.call(updates, 'formData');
      if (!shouldRetryWithoutFormData) {
        throw updateError;
      }

      const retryFields = [];
      const retryValues = [];

      Object.keys(updates).forEach(key => {
        if (key === 'formData') return;
        if (fieldMapping[key]) {
          retryFields.push(`${fieldMapping[key]} = ?`);
          retryValues.push(updates[key]);
        }
      });

      if (retryFields.length === 0) {
        return res.status(400).json({ error: '没有提供更新字段' });
      }

      retryFields.push('updated_at = ?');
      retryValues.push(Date.now());
      retryValues.push(id);

      await pool.query(
        `UPDATE service_requests SET ${retryFields.join(', ')} WHERE id = ?`,
        retryValues
      );
    }

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
