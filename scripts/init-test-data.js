import mysql from 'mysql2/promise';

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'fcs',
  database: process.env.DB_NAME || 'itsm_db_test',
  port: parseInt(process.env.DB_PORT || '3306')
};

async function initTestData() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log(`✅ 连接到数据库: ${dbConfig.database}`);

    // 清空现有数据（仅测试环境）
    if (dbConfig.database === 'itsm_db_test') {
      await connection.query('SET FOREIGN_KEY_CHECKS = 0');
      await connection.query('TRUNCATE TABLE ticket_comments');
      await connection.query('TRUNCATE TABLE request_comments');
      await connection.query('TRUNCATE TABLE chat_comments');
      await connection.query('TRUNCATE TABLE tickets');
      await connection.query('TRUNCATE TABLE service_requests');
      await connection.query('TRUNCATE TABLE articles');
      await connection.query('TRUNCATE TABLE flow_steps');
      await connection.query('TRUNCATE TABLE flows');
      await connection.query('TRUNCATE TABLE chats');
      await connection.query('TRUNCATE TABLE code_snippets');
      await connection.query('TRUNCATE TABLE user_settings');
      await connection.query('TRUNCATE TABLE users');
      await connection.query('UPDATE counters SET value = 0');
      await connection.query('SET FOREIGN_KEY_CHECKS = 1');
      console.log('✅ 已清空现有测试数据');
    }

    // 插入示例用户
    const users = [
      {
        id: 'u1',
        name: '张三',
        role: 'admin',
        avatar: '👨‍💼',
        email: 'zhangsan@example.com',
        created_at: Date.now()
      },
      {
        id: 'u2',
        name: '李四',
        role: 'member',
        avatar: '👩‍💻',
        email: 'lisi@example.com',
        created_at: Date.now()
      },
      {
        id: 'u3',
        name: '王五',
        role: 'approver',
        avatar: '🧑‍💼',
        email: 'wangwu@example.com',
        created_at: Date.now()
      }
    ];

    for (const user of users) {
      await connection.query(
        'INSERT INTO users (id, name, role, avatar, email, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [user.id, user.name, user.role, user.avatar, user.email, user.created_at]
      );
    }
    console.log(`✅ 已插入 ${users.length} 个测试用户`);

    // 设置当前用户
    await connection.query(
      'INSERT INTO user_settings (user_id, current_user_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE current_user_id = ?',
      ['default', 'u1', 'u1']
    );
    console.log('✅ 已设置当前用户为: 张三');

    // 插入示例工单
    const tickets = [
      {
        id: 't' + Date.now(),
        ticket_no: 'INC-001',
        title: '测试工单 - 网络连接问题',
        description: '办公室 WiFi 无法连接',
        category: 'network',
        priority: 'high',
        status: 'new',
        assignee_id: 'u2',
        reporter_id: 'u1',
        related_article_ids: JSON.stringify([]),
        attachments: JSON.stringify([]),
        created_at: Date.now(),
        updated_at: Date.now()
      },
      {
        id: 't' + (Date.now() + 1),
        ticket_no: 'INC-002',
        title: '测试工单 - 软件安装请求',
        description: '需要安装 Photoshop',
        category: 'software',
        priority: 'medium',
        status: 'in_progress',
        assignee_id: 'u2',
        reporter_id: 'u1',
        related_article_ids: JSON.stringify([]),
        attachments: JSON.stringify([]),
        created_at: Date.now(),
        updated_at: Date.now()
      }
    ];

    for (const ticket of tickets) {
      await connection.query(
        `INSERT INTO tickets (id, ticket_no, title, description, category, priority, status, assignee_id, reporter_id, related_article_ids, attachments, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ticket.id, ticket.ticket_no, ticket.title, ticket.description,
          ticket.category, ticket.priority, ticket.status,
          ticket.assignee_id, ticket.reporter_id,
          ticket.related_article_ids, ticket.attachments,
          ticket.created_at, ticket.updated_at
        ]
      );
    }
    console.log(`✅ 已插入 ${tickets.length} 个测试工单`);

    // 更新计数器
    await connection.query('UPDATE counters SET value = 2 WHERE id = ?', ['ticket']);
    await connection.query('UPDATE counters SET value = 0 WHERE id = ?', ['request']);
    await connection.query('UPDATE counters SET value = 0 WHERE id = ?', ['article']);
    await connection.query('UPDATE counters SET value = 0 WHERE id = ?', ['flow']);
    console.log('✅ 已更新计数器');

    console.log('\n🎉 测试数据初始化完成！');
    console.log(`📊 数据库: ${dbConfig.database}`);
    console.log(`👥 用户数: ${users.length}`);
    console.log(`🎫 工单数: ${tickets.length}`);

  } catch (error) {
    console.error('❌ 初始化失败:', error);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

initTestData();
