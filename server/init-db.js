import mysql from 'mysql2/promise';

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'fcs',
  port: parseInt(process.env.DB_PORT || '3306')
};

const DB_NAME = process.env.DB_NAME || 'itsm_db';

async function initDatabase() {
  let connection;

  try {
    // 连接到 MySQL（不指定数据库）
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ 连接到 MySQL 服务器');

    // 创建数据库（如果不存在）
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${DB_NAME} DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    console.log(`✅ 数据库 ${DB_NAME} 已创建/存在`);

    // 切换到目标数据库
    await connection.query(`USE ${DB_NAME}`);

    // 1. 用户表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        role ENUM('admin', 'member', 'approver') NOT NULL DEFAULT 'member',
        avatar VARCHAR(10) DEFAULT '👨‍💻',
        email VARCHAR(255),
        created_at BIGINT NOT NULL,
        INDEX idx_role (role)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ 表 users 已创建');

    // 2. 工单表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS tickets (
        id VARCHAR(50) PRIMARY KEY,
        ticket_no VARCHAR(20) UNIQUE NOT NULL,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        category VARCHAR(50),
        priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
        status ENUM('new', 'in_progress', 'resolved', 'closed') DEFAULT 'new',
        assignee_id VARCHAR(50),
        reporter_id VARCHAR(50),
        related_article_ids JSON,
        attachments JSON,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL,
        resolved_at BIGINT,
        closed_at BIGINT,
        INDEX idx_status (status),
        INDEX idx_assignee (assignee_id),
        INDEX idx_created (created_at),
        FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ 表 tickets 已创建');

    // 3. 工单评论表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS ticket_comments (
        id VARCHAR(50) PRIMARY KEY,
        ticket_id VARCHAR(50) NOT NULL,
        user_id VARCHAR(50),
        text TEXT NOT NULL,
        created_at BIGINT NOT NULL,
        INDEX idx_ticket (ticket_id),
        FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ 表 ticket_comments 已创建');

    // 4. 服务请求表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS service_requests (
        id VARCHAR(50) PRIMARY KEY,
        request_no VARCHAR(20) UNIQUE NOT NULL,
        service_type VARCHAR(100),
        title VARCHAR(500) NOT NULL,
        description TEXT,
        priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
        status ENUM('submitted', 'approved', 'rejected', 'in_progress', 'completed') DEFAULT 'submitted',
        requester_id VARCHAR(50),
        approver_id VARCHAR(50),
        assignee_id VARCHAR(50),
        approval_note TEXT,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL,
        approved_at BIGINT,
        completed_at BIGINT,
        INDEX idx_status (status),
        INDEX idx_requester (requester_id),
        FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (approver_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ 表 service_requests 已创建');

    // 5. 服务请求评论表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS request_comments (
        id VARCHAR(50) PRIMARY KEY,
        request_id VARCHAR(50) NOT NULL,
        user_id VARCHAR(50),
        text TEXT NOT NULL,
        created_at BIGINT NOT NULL,
        INDEX idx_request (request_id),
        FOREIGN KEY (request_id) REFERENCES service_requests(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ 表 request_comments 已创建');

    // 6. 知识库文章表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS articles (
        id VARCHAR(50) PRIMARY KEY,
        article_no VARCHAR(20) UNIQUE NOT NULL,
        title VARCHAR(500) NOT NULL,
        content MEDIUMTEXT,
        category VARCHAR(100),
        tags JSON,
        author_id VARCHAR(50),
        view_count INT DEFAULT 0,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL,
        INDEX idx_category (category),
        INDEX idx_author (author_id),
        FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ 表 articles 已创建');

    // 7. 流程表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS flows (
        id VARCHAR(50) PRIMARY KEY,
        flow_no VARCHAR(20) UNIQUE NOT NULL,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        icon VARCHAR(50),
        author_id VARCHAR(50),
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL,
        FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ 表 flows 已创建');

    // 8. 流程步骤表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS flow_steps (
        id VARCHAR(50) PRIMARY KEY,
        flow_id VARCHAR(50) NOT NULL,
        step_order INT NOT NULL,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        assignee VARCHAR(50),
        duration INT,
        conditional BOOLEAN DEFAULT FALSE,
        INDEX idx_flow (flow_id),
        FOREIGN KEY (flow_id) REFERENCES flows(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ 表 flow_steps 已创建');

    // 9. 聊天记录表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS chats (
        id BIGINT PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        content TEXT,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL,
        INDEX idx_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ 表 chats 已创建');

    // 10. 聊天评论表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS chat_comments (
        id BIGINT PRIMARY KEY,
        chat_id BIGINT NOT NULL,
        text TEXT NOT NULL,
        created_at BIGINT NOT NULL,
        INDEX idx_chat (chat_id),
        FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ 表 chat_comments 已创建');

    // 11. 代码片段表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS code_snippets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        code MEDIUMTEXT NOT NULL,
        language VARCHAR(50),
        created_at BIGINT NOT NULL,
        INDEX idx_language (language),
        INDEX idx_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ 表 code_snippets 已创建');

    // 12. 计数器表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS counters (
        id VARCHAR(50) PRIMARY KEY,
        value INT NOT NULL DEFAULT 0
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ 表 counters 已创建');

    // 插入初始计数器（如果不存在）
    await connection.query(`
      INSERT IGNORE INTO counters (id, value) VALUES
        ('ticket', 0),
        ('request', 0),
        ('article', 0),
        ('flow', 0)
    `);
    console.log('✅ 计数器初始化完成');

    // 13. 用户设置表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS user_settings (
        setting_key VARCHAR(50) PRIMARY KEY,
        setting_value TEXT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ 表 user_settings 已创建');

    console.log('\n🎉 数据库初始化完成！所有表已成功创建。');

  } catch (error) {
    console.error('❌ 数据库初始化失败:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 运行初始化
initDatabase().catch(console.error);
