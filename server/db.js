import mysql from 'mysql2/promise';

// MySQL 连接配置
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'fcs',
  database: 'itsm_db',
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
};

// 创建连接池
const pool = mysql.createPool(dbConfig);

// 测试连接
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ MySQL 数据库连接成功');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ MySQL 连接失败:', error.message);
    return false;
  }
}

// 导出连接池和辅助函数
export { pool, testConnection };
export default pool;
