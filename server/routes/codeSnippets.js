import express from 'express';
import pool from '../db.js';

const router = express.Router();

// GET /api/code-snippets - 获取所有代码片段
router.get('/', async (req, res) => {
  try {
    const [snippets] = await pool.query('SELECT * FROM code_snippets ORDER BY created_at DESC');
    res.json(snippets);
  } catch (error) {
    console.error('获取代码片段列表失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/code-snippets - 创建代码片段
router.post('/', async (req, res) => {
  const { name, description, code, language } = req.body;

  if (!name || !code) {
    return res.status(400).json({ error: '缺少必需字段: name 或 code' });
  }

  try {
    const now = Date.now();

    const [result] = await pool.query(
      'INSERT INTO code_snippets (name, description, code, language, created_at) VALUES (?, ?, ?, ?, ?)',
      [name, description || null, code, language || null, now]
    );

    const [snippets] = await pool.query('SELECT * FROM code_snippets WHERE id = ?', [result.insertId]);
    res.status(201).json(snippets[0]);
  } catch (error) {
    console.error('创建代码片段失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/code-snippets/:id - 删除代码片段
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM code_snippets WHERE id = ?', [id]);

    if (result[0].affectedRows === 0) {
      return res.status(404).json({ error: '代码片段不存在' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('删除代码片段失败:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
