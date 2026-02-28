import express from 'express';
import pool from '../db.js';

const router = express.Router();

// GET /api/chats - 获取所有聊天记录
router.get('/', async (req, res) => {
  try {
    const [chats] = await pool.query('SELECT * FROM chats ORDER BY created_at DESC');
    res.json(chats);
  } catch (error) {
    console.error('获取聊天记录列表失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/chats/:id - 获取单个聊天记录（含评论）
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [chats] = await pool.query('SELECT * FROM chats WHERE id = ?', [id]);

    if (chats.length === 0) {
      return res.status(404).json({ error: '聊天记录不存在' });
    }

    const [comments] = await pool.query(`
      SELECT * FROM chat_comments
      WHERE chat_id = ?
      ORDER BY created_at ASC
    `, [id]);

    const chat = { ...chats[0], comments };
    res.json(chat);
  } catch (error) {
    console.error('获取聊天记录详情失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/chats - 创建聊天记录
router.post('/', async (req, res) => {
  const { id, title, content } = req.body;

  if (!id || !title) {
    return res.status(400).json({ error: '缺少必需字段: id 或 title' });
  }

  try {
    const now = Date.now();

    await pool.query(
      'INSERT INTO chats (id, title, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      [id, title, content || null, now, now]
    );

    const [chats] = await pool.query('SELECT * FROM chats WHERE id = ?', [id]);
    res.status(201).json(chats[0]);
  } catch (error) {
    console.error('创建聊天记录失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/chats/:id - 更新聊天记录
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { title, content } = req.body;

  try {
    const fields = [];
    const values = [];

    if (title !== undefined) {
      fields.push('title = ?');
      values.push(title);
    }
    if (content !== undefined) {
      fields.push('content = ?');
      values.push(content);
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: '没有提供更新字段' });
    }

    fields.push('updated_at = ?');
    values.push(Date.now());
    values.push(id);

    await pool.query(
      `UPDATE chats SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    const [chats] = await pool.query('SELECT * FROM chats WHERE id = ?', [id]);

    if (chats.length === 0) {
      return res.status(404).json({ error: '聊天记录不存在' });
    }

    res.json(chats[0]);
  } catch (error) {
    console.error('更新聊天记录失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/chats/:id - 删除聊天记录
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM chats WHERE id = ?', [id]);

    if (result[0].affectedRows === 0) {
      return res.status(404).json({ error: '聊天记录不存在' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('删除聊天记录失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/chats/:id/comments - 添加评论
router.post('/:id/comments', async (req, res) => {
  const { id } = req.params;
  const { commentId, text } = req.body;

  if (!commentId || !text) {
    return res.status(400).json({ error: '缺少必需字段: commentId 或 text' });
  }

  try {
    const [chats] = await pool.query('SELECT id FROM chats WHERE id = ?', [id]);
    if (chats.length === 0) {
      return res.status(404).json({ error: '聊天记录不存在' });
    }

    const now = Date.now();

    await pool.query(
      'INSERT INTO chat_comments (id, chat_id, text, created_at) VALUES (?, ?, ?, ?)',
      [commentId, id, text, now]
    );

    await pool.query('UPDATE chats SET updated_at = ? WHERE id = ?', [now, id]);

    const [comments] = await pool.query('SELECT * FROM chat_comments WHERE id = ?', [commentId]);
    res.status(201).json(comments[0]);
  } catch (error) {
    console.error('添加评论失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/chats/:chatId/comments/:commentId - 删除评论
router.delete('/:chatId/comments/:commentId', async (req, res) => {
  const { chatId, commentId } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM chat_comments WHERE id = ? AND chat_id = ?',
      [commentId, chatId]
    );

    if (result[0].affectedRows === 0) {
      return res.status(404).json({ error: '评论不存在' });
    }

    await pool.query('UPDATE chats SET updated_at = ? WHERE id = ?', [Date.now(), chatId]);

    res.json({ success: true });
  } catch (error) {
    console.error('删除评论失败:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
