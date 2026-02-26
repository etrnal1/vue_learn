import mysql from 'mysql2/promise';

// 从环境变量读取配置（默认值用于向后兼容）
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'fcs',
  database: process.env.DB_NAME || 'itsm_db',
  port: parseInt(process.env.DB_PORT || '3306'),
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
    const env = process.env.NODE_ENV || 'development';
    console.log(`✅ MySQL 数据库连接成功 [${env}] - ${dbConfig.database}`);
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ MySQL 连接失败:', {
      message: error?.message || '',
      code: error?.code || '',
      errno: error?.errno || '',
      address: error?.address || '',
      port: error?.port || '',
      host: dbConfig.host,
      user: dbConfig.user,
      database: dbConfig.database
    });
    return false;
  }
}

// 导出连接池和辅助函数
export { pool, testConnection };
export default pool;
