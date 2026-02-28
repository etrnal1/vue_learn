import pool from '../server/db.js';

async function initSampleData() {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    console.log('🚀 开始初始化示例数据...\n');

    // 1. 创建示例用户
    const users = [
      {
        id: 'u' + Date.now(),
        name: '张三',
        role: 'admin',
        avatar: '👨‍💼',
        email: 'zhangsan@example.com'
      },
      {
        id: 'u' + (Date.now() + 1),
        name: '李四',
        role: 'member',
        avatar: '👩‍💻',
        email: 'lisi@example.com'
      },
      {
        id: 'u' + (Date.now() + 2),
        name: '王五',
        role: 'approver',
        avatar: '👨‍🔧',
        email: 'wangwu@example.com'
      }
    ];

    console.log('📝 创建用户...');
    for (const user of users) {
      await connection.query(
        `INSERT INTO users (id, name, role, avatar, email, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [user.id, user.name, user.role, user.avatar, user.email, Date.now()]
      );
      console.log(`   ✅ ${user.name} (${user.role})`);
    }

    // 2. 设置当前用户为第一个用户
    const currentUserId = users[0].id;
    await connection.query(
      `INSERT INTO user_settings (setting_key, setting_value)
       VALUES ('current_user_id', ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [currentUserId]
    );
    console.log(`\n🔑 设置当前用户: ${users[0].name}\n`);

    await connection.commit();

    console.log('✅ 示例数据初始化完成！\n');
    console.log('现在你可以：');
    console.log('1. 刷新浏览器页面');
    console.log('2. 创建工单、服务请求等数据\n');

    process.exit(0);

  } catch (error) {
    await connection.rollback();
    console.error('❌ 初始化失败:', error.message);
    process.exit(1);
  } finally {
    connection.release();
  }
}

initSampleData();
