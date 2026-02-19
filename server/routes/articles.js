import express from 'express';
import pool from '../db.js';

const router = express.Router();

// 生成文章编号
async function generateArticleNo() {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query("UPDATE counters SET value = value + 1 WHERE id = 'article'");
    const [rows] = await connection.query("SELECT value FROM counters WHERE id = 'article'");
    await connection.commit();
    const num = rows[0].value;
    return `KB${String(num).padStart(6, '0')}`;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// GET /api/articles - 获取所有文章
router.get('/', async (req, res) => {
  try {
    const [articles] = await pool.query(`
      SELECT
        a.*,
        u.name as author_name
      FROM articles a
      LEFT JOIN users u ON a.author_id = u.id
      ORDER BY a.created_at DESC
    `);

    const processedArticles = articles.map(article => ({
      ...article,
      tags: article.tags ? JSON.parse(article.tags) : []
    }));

    res.json(processedArticles);
  } catch (error) {
    console.error('获取文章列表失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/articles/:id - 获取单个文章
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [articles] = await pool.query(`
      SELECT
        a.*,
        u.name as author_name
      FROM articles a
      LEFT JOIN users u ON a.author_id = u.id
      WHERE a.id = ?
    `, [id]);

    if (articles.length === 0) {
      return res.status(404).json({ error: '文章不存在' });
    }

    const article = {
      ...articles[0],
      tags: articles[0].tags ? JSON.parse(articles[0].tags) : []
    };

    res.json(article);
  } catch (error) {
    console.error('获取文章详情失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/articles - 创建文章
router.post('/', async (req, res) => {
  const { id, title, content, category, tags, authorId } = req.body;

  if (!id || !title) {
    return res.status(400).json({ error: '缺少必需字段: id 或 title' });
  }

  try {
    const articleNo = await generateArticleNo();
    const now = Date.now();

    await pool.query(
      `INSERT INTO articles (
        id, article_no, title, content, category, tags, author_id, view_count,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        articleNo,
        title,
        content || null,
        category || null,
        JSON.stringify(tags || []),
        authorId || null,
        0,
        now,
        now
      ]
    );

    const [articles] = await pool.query('SELECT * FROM articles WHERE id = ?', [id]);
    const article = {
      ...articles[0],
      tags: articles[0].tags ? JSON.parse(articles[0].tags) : []
    };

    res.status(201).json(article);
  } catch (error) {
    console.error('创建文章失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/articles/:id - 更新文章
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const fields = [];
    const values = [];

    const fieldMapping = {
      title: 'title',
      content: 'content',
      category: 'category',
      authorId: 'author_id',
      viewCount: 'view_count'
    };

    Object.keys(updates).forEach(key => {
      if (fieldMapping[key]) {
        fields.push(`${fieldMapping[key]} = ?`);
        values.push(updates[key]);
      } else if (key === 'tags') {
        fields.push('tags = ?');
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
      `UPDATE articles SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    const [articles] = await pool.query('SELECT * FROM articles WHERE id = ?', [id]);

    if (articles.length === 0) {
      return res.status(404).json({ error: '文章不存在' });
    }

    const article = {
      ...articles[0],
      tags: articles[0].tags ? JSON.parse(articles[0].tags) : []
    };

    res.json(article);
  } catch (error) {
    console.error('更新文章失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/articles/:id - 删除文章
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM articles WHERE id = ?', [id]);

    if (result[0].affectedRows === 0) {
      return res.status(404).json({ error: '文章不存在' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('删除文章失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/articles/:id/view - 增加浏览计数
router.post('/:id/view', async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query('UPDATE articles SET view_count = view_count + 1 WHERE id = ?', [id]);

    const [articles] = await pool.query('SELECT view_count FROM articles WHERE id = ?', [id]);

    if (articles.length === 0) {
      return res.status(404).json({ error: '文章不存在' });
    }

    res.json({ viewCount: articles[0].view_count });
  } catch (error) {
    console.error('更新浏览计数失败:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
