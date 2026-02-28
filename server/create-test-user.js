import mysql from 'mysql2/promise';
import crypto from 'crypto';

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  port: parseInt(process.env.DB_PORT || '3306'),
  database: process.env.DB_NAME || 'itsm_db'
};

// 密码哈希函数
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const key = crypto.pbkdf2Sync(
    String(password),
    salt,
    120000,
    64,
    'sha512'
  ).toString('hex');
  return `${salt}:${key}`;
}

async function createTestUser() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ 连接到 MySQL 服务器');

    const now = Date.now();
    const passwordHash = hashPassword('password123');

    await connection.query(
      `INSERT IGNORE INTO users (id, name, role, avatar, email, password_hash, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['admin', '管理员', 'admin', '👨‍💼', 'admin@example.com', passwordHash, now]
    );
    console.log('✅ 测试用户 admin 已创建');

    await connection.query(
      `INSERT IGNORE INTO users (id, name, role, avatar, email, password_hash, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['user1', '用户1', 'member', '👨‍💻', 'user1@example.com', passwordHash, now]
    );
    console.log('✅ 测试用户 user1 已创建');

    console.log('\n✅ 测试用户创建完成');
    console.log('账号: admin, 密码: password123');
    console.log('账号: user1, 密码: password123');
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      console.log('✅ 用户已存在');
    } else {
      console.error('❌ 创建用户失败:', error.message);
      throw error;
    }
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

createTestUser().catch(console.error);
