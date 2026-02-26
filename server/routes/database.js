import express from 'express';
import pool from '../db.js';
import { getRoleGroup, requireAuth, requireRoles } from '../middleware/rbac.js';

const router = express.Router();

const MAX_SQL_LENGTH = 20000;
const MAX_RESULT_ROWS = 500;

router.use(requireAuth);
router.use(requireRoles(...getRoleGroup('database')));

function normalizeDatabaseName(value) {
  return String(value || '').trim();
}

router.get('/databases', async (req, res) => {
  try {
    const [rows] = await pool.query('SHOW DATABASES');
    const databases = (rows || [])
      .map((item) => String(item.Database || '').trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
    res.json({ databases });
  } catch (error) {
    const fallbackDb = String(process.env.DB_NAME || '').trim();
    if (fallbackDb) {
      return res.json({
        databases: [fallbackDb],
        fallback: true,
        warning: '无法列出全部数据库，已回退到当前连接库'
      });
    }
    console.error('获取数据库列表失败:', error);
    res.status(500).json({ error: error?.message || '获取数据库列表失败' });
  }
});

router.post('/execute', async (req, res) => {
  const database = normalizeDatabaseName(req.body?.database);
  const sql = String(req.body?.sql || '').trim();

  if (!database) {
    return res.status(400).json({ error: '请选择数据库' });
  }
  if (!sql) {
    return res.status(400).json({ error: 'SQL 不能为空' });
  }
  if (sql.length > MAX_SQL_LENGTH) {
    return res.status(400).json({ error: `SQL 过长，最多 ${MAX_SQL_LENGTH} 字符` });
  }

  const connection = await pool.getConnection();
  try {
    await connection.query('USE ??', [database]);
    const startedAt = Date.now();
    const [rows, fields] = await connection.query(sql);
    const durationMs = Date.now() - startedAt;

    if (Array.isArray(rows)) {
      const limitedRows = rows.slice(0, MAX_RESULT_ROWS);
      const columns = Array.isArray(fields) ? fields.map((item) => item.name) : [];
      return res.json({
        success: true,
        database,
        sql,
        type: 'query',
        durationMs,
        columns,
        rowCount: rows.length,
        truncated: rows.length > limitedRows.length,
        rows: limitedRows
      });
    }

    return res.json({
      success: true,
      database,
      sql,
      type: 'mutation',
      durationMs,
      affectedRows: Number(rows?.affectedRows || 0),
      changedRows: Number(rows?.changedRows || 0),
      insertId: rows?.insertId ?? null
    });
  } catch (error) {
    console.error('执行 SQL 失败:', error);
    return res.status(400).json({ error: error?.message || '执行 SQL 失败' });
  } finally {
    connection.release();
  }
});

export default router;
