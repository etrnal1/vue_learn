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
        password_hash VARCHAR(255),
        created_at BIGINT NOT NULL,
        INDEX idx_role (role)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ 表 users 已创建');

    // 检查 password_hash 列是否存在，如果不存在则添加
    try {
      await connection.query(`
        ALTER TABLE users
        ADD COLUMN password_hash VARCHAR(255)
        AFTER email
      `);
      console.log('✅ 表 users 密码字段已添加');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('✅ 表 users 密码字段已存在');
      } else {
        throw err;
      }
    }

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
        form_data JSON,
        priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
        status ENUM('draft', 'submitted', 'approved', 'rejected', 'in_progress', 'completed') DEFAULT 'submitted',
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

    // 兼容旧版本：确保状态枚举包含 draft
    await connection.query(`
      ALTER TABLE service_requests
      MODIFY COLUMN status ENUM('draft', 'submitted', 'approved', 'rejected', 'in_progress', 'completed')
      DEFAULT 'submitted'
    `);
    console.log('✅ 表 service_requests 状态枚举已校准');

    // 检查 form_data 列是否存在，如果不存在则添加
    try {
      await connection.query(`
        ALTER TABLE service_requests
        ADD COLUMN form_data JSON
        AFTER description
      `);
      console.log('✅ 表 service_requests 动态表单字段已添加');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('✅ 表 service_requests 动态表单字段已存在');
      } else {
        throw err;
      }
    }

    // 5. 服务目录表（自助门户 + 自动路由）
    await connection.query(`
      CREATE TABLE IF NOT EXISTS service_catalog (
        id VARCHAR(50) PRIMARY KEY,
        service_type VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(120) NOT NULL,
        icon VARCHAR(10),
        description VARCHAR(500),
        form_schema JSON,
        title_template VARCHAR(200),
        default_priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
        requires_approval BOOLEAN NOT NULL DEFAULT TRUE,
        default_approver_role ENUM('admin', 'approver', 'member') DEFAULT 'approver',
        default_assignee_role ENUM('admin', 'approver', 'member') DEFAULT 'member',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        sort_order INT NOT NULL DEFAULT 0,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL,
        INDEX idx_service_type (service_type),
        INDEX idx_active_sort (is_active, sort_order)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ 表 service_catalog 已创建');

    // 检查 form_schema 列是否存在，如果不存在则添加
    try {
      await connection.query(`
        ALTER TABLE service_catalog
        ADD COLUMN form_schema JSON
        AFTER description
      `);
      console.log('✅ 表 service_catalog 表单模板字段已添加');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('✅ 表 service_catalog 表单模板字段已存在');
      } else {
        throw err;
      }
    }

    const now = Date.now();
    await connection.query(`
      INSERT IGNORE INTO service_catalog (
        id, service_type, name, icon, description, form_schema, title_template,
        default_priority, requires_approval, default_approver_role, default_assignee_role,
        is_active, sort_order, created_at, updated_at
      ) VALUES
      ('sc_account', 'account', '账号管理', '👤', '创建、修改或删除系统账号', '[{\"key\":\"targetUser\",\"label\":\"目标账号\",\"type\":\"text\",\"required\":true,\"placeholder\":\"输入账号或邮箱\"}]', '账号管理 - ', 'medium', TRUE, 'approver', 'member', TRUE, 10, ?, ?),
      ('sc_software_install', 'software_install', '软件安装', '💿', '申请安装或更新软件', '[{\"key\":\"softwareName\",\"label\":\"软件名称\",\"type\":\"text\",\"required\":true},{\"key\":\"version\",\"label\":\"版本\",\"type\":\"text\"}]', '软件安装 - ', 'medium', TRUE, 'approver', 'member', TRUE, 20, ?, ?),
      ('sc_hardware', 'hardware', '硬件申请', '🖥️', '申请电脑、显示器等设备', '[{\"key\":\"deviceType\",\"label\":\"设备类型\",\"type\":\"select\",\"required\":true,\"options\":[\"笔记本\",\"显示器\",\"键盘\",\"鼠标\",\"其他\"]},{\"key\":\"quantity\",\"label\":\"数量\",\"type\":\"number\",\"required\":true}]', '硬件申请 - ', 'high', TRUE, 'approver', 'member', TRUE, 30, ?, ?),
      ('sc_permission', 'permission', '权限申请', '🔑', '申请系统或文件夹访问权限', '[{\"key\":\"systemName\",\"label\":\"系统/资源名称\",\"type\":\"text\",\"required\":true},{\"key\":\"permissionLevel\",\"label\":\"权限级别\",\"type\":\"select\",\"required\":true,\"options\":[\"只读\",\"读写\",\"管理员\"]}]', '权限申请 - ', 'high', TRUE, 'approver', 'admin', TRUE, 40, ?, ?),
      ('sc_vpn', 'vpn', 'VPN 配置', '🔒', '申请 VPN 账号或排障', '[{\"key\":\"issueType\",\"label\":\"类型\",\"type\":\"select\",\"required\":true,\"options\":[\"新开通\",\"无法连接\",\"重置密码\",\"其他\"]}]', 'VPN 配置 - ', 'medium', FALSE, 'approver', 'member', TRUE, 50, ?, ?),
      ('sc_email', 'email', '邮箱服务', '📧', '邮箱创建、密码重置、邮件组', '[{\"key\":\"emailAction\",\"label\":\"操作类型\",\"type\":\"select\",\"required\":true,\"options\":[\"新建邮箱\",\"重置密码\",\"创建邮件组\",\"其他\"]}]', '邮箱服务 - ', 'low', FALSE, 'approver', 'member', TRUE, 60, ?, ?),
      ('sc_other', 'other', '其他', '📝', '其他 IT 服务请求', '[]', '其他请求 - ', 'medium', TRUE, 'approver', 'member', TRUE, 999, ?, ?)
    `, [now, now, now, now, now, now, now, now, now, now, now, now, now, now]);
    console.log('✅ 服务目录默认数据初始化完成');

    // 6. 服务请求评论表
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

    // 7. 知识库文章表
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

    // 8. 流程表
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

    // 9. 流程步骤表
	    await connection.query(`
	      CREATE TABLE IF NOT EXISTS flow_steps (
	        id VARCHAR(50) PRIMARY KEY,
	        flow_id VARCHAR(50) NOT NULL,
	        step_order INT NOT NULL,
	        name VARCHAR(200) NOT NULL,
	        description TEXT,
	        assignee VARCHAR(50),
	        duration VARCHAR(100),
	        conditional BOOLEAN DEFAULT FALSE,
	        relation_type VARCHAR(20) DEFAULT 'sequential',
	        parent_step_id VARCHAR(50) NULL,
	        module_key VARCHAR(100) NULL,
	        position_x INT NULL,
	        position_y INT NULL,
	        INDEX idx_flow (flow_id),
	        FOREIGN KEY (flow_id) REFERENCES flows(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ 表 flow_steps 已创建');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS power_monitor_records (
        id VARCHAR(64) PRIMARY KEY,
        source ENUM('auto', 'manual') NOT NULL DEFAULT 'auto',
        timestamp_ms BIGINT NOT NULL,
        watts DECIMAL(10,2) NOT NULL,
        sample_seconds INT NOT NULL DEFAULT 60,
        duration_minutes INT NOT NULL DEFAULT 1,
        note VARCHAR(500),
        meta JSON,
        created_at BIGINT NOT NULL,
        INDEX idx_power_source_time (source, timestamp_ms),
        INDEX idx_power_timestamp (timestamp_ms)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ 表 power_monitor_records 已创建');

	    // 历史版本兼容：duration 早期为 INT，后来用于“预计耗时”展示（如：2小时/秒级），改为 VARCHAR(100)
	    try {
	      await connection.query(`
	        ALTER TABLE flow_steps
	        MODIFY COLUMN duration VARCHAR(100) NULL
	      `);
	      console.log('✅ 表 flow_steps duration 字段已升级为 VARCHAR(100)');
	    } catch (err) {
	      // 某些 MySQL 版本/权限下可能失败：不阻断启动
	      console.warn('⚠️ flow_steps.duration 字段升级失败，可忽略或手动执行迁移', err?.code || err);
	    }

    try {
      await connection.query(`
        ALTER TABLE flow_steps
        ADD COLUMN tip TEXT
        AFTER conditional
      `);
      console.log('✅ 表 flow_steps tip 字段已添加');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('✅ 表 flow_steps tip 字段已存在');
      } else {
        throw err;
      }
    }

    try {
      await connection.query(`
        ALTER TABLE flow_steps
        ADD COLUMN note TEXT
        AFTER tip
      `);
      console.log('✅ 表 flow_steps note 字段已添加');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('✅ 表 flow_steps note 字段已存在');
      } else {
        throw err;
      }
    }

    try {
      await connection.query(`
        ALTER TABLE flow_steps
        ADD COLUMN position_x INT NULL
        AFTER conditional
      `);
      console.log('✅ 表 flow_steps position_x 字段已添加');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('✅ 表 flow_steps position_x 字段已存在');
      } else {
        throw err;
      }
    }

    try {
      await connection.query(`
        ALTER TABLE flow_steps
        ADD COLUMN position_y INT NULL
        AFTER position_x
      `);
      console.log('✅ 表 flow_steps position_y 字段已添加');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('✅ 表 flow_steps position_y 字段已存在');
      } else {
        throw err;
      }
    }

    try {
      await connection.query(`
        ALTER TABLE flow_steps
        ADD COLUMN relation_type VARCHAR(20) DEFAULT 'sequential'
        AFTER conditional
      `);
      console.log('✅ 表 flow_steps relation_type 字段已添加');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('✅ 表 flow_steps relation_type 字段已存在');
      } else {
        throw err;
      }
    }

    try {
      await connection.query(`
        ALTER TABLE flow_steps
        ADD COLUMN parent_step_id VARCHAR(50) NULL
        AFTER relation_type
      `);
      console.log('✅ 表 flow_steps parent_step_id 字段已添加');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('✅ 表 flow_steps parent_step_id 字段已存在');
      } else {
        throw err;
      }
    }

    try {
      await connection.query(`
        ALTER TABLE flow_steps
        ADD COLUMN module_key VARCHAR(100) NULL
        AFTER parent_step_id
      `);
      console.log('✅ 表 flow_steps module_key 字段已添加');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('✅ 表 flow_steps module_key 字段已存在');
      } else {
        throw err;
      }
    }

    // 11. 流程发布历史表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS flow_releases (
        id VARCHAR(50) PRIMARY KEY,
        flow_id VARCHAR(50) NOT NULL,
        version VARCHAR(50) NOT NULL,
        note TEXT,
        payload JSON,
        created_at BIGINT NOT NULL,
        INDEX idx_flow_releases (flow_id),
        FOREIGN KEY (flow_id) REFERENCES flows(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ 表 flow_releases 已创建');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS flow_shared_modules (
        id VARCHAR(50) PRIMARY KEY,
        module_key VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        steps_snapshot JSON NOT NULL,
        created_by VARCHAR(50),
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL,
        INDEX idx_flow_modules_key (module_key),
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ 表 flow_shared_modules 已创建');

    // 检查 payload 列是否存在，如果不存在则添加
    try {
      await connection.query(`
        ALTER TABLE flow_releases
        ADD COLUMN payload JSON
      `);
      console.log('✅ 表 flow_releases payload 字段已添加');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('✅ 表 flow_releases payload 字段已存在');
      } else {
        throw err;
      }
    }

    await connection.query(`
      CREATE TABLE IF NOT EXISTS flow_comments (
        id VARCHAR(50) PRIMARY KEY,
        flow_id VARCHAR(50) NOT NULL,
        step_id VARCHAR(50),
        text TEXT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'open',
        mention_users JSON,
        author_id VARCHAR(50),
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL,
        INDEX idx_flow_comments_flow (flow_id),
        INDEX idx_flow_comments_step (step_id),
        INDEX idx_flow_comments_status (status),
        FOREIGN KEY (flow_id) REFERENCES flows(id) ON DELETE CASCADE,
        FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ 表 flow_comments 已创建');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS flow_audit_logs (
        id VARCHAR(50) PRIMARY KEY,
        flow_id VARCHAR(50) NOT NULL,
        action VARCHAR(100) NOT NULL,
        actor_id VARCHAR(50),
        actor_role VARCHAR(50),
        result VARCHAR(20) NOT NULL DEFAULT 'success',
        detail TEXT,
        metadata JSON,
        created_at BIGINT NOT NULL,
        INDEX idx_flow_audit_flow (flow_id),
        INDEX idx_flow_audit_action (action),
        INDEX idx_flow_audit_created (created_at),
        FOREIGN KEY (flow_id) REFERENCES flows(id) ON DELETE CASCADE,
        FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ 表 flow_audit_logs 已创建');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS flow_export_jobs (
        id VARCHAR(50) PRIMARY KEY,
        flow_id VARCHAR(50) NOT NULL,
        format VARCHAR(20) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'queued',
        options JSON,
        version_id VARCHAR(50),
        download_url TEXT,
        message VARCHAR(500),
        created_by VARCHAR(50),
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL,
        INDEX idx_flow_exports_flow (flow_id),
        INDEX idx_flow_exports_format (format),
        INDEX idx_flow_exports_created (created_at),
        FOREIGN KEY (flow_id) REFERENCES flows(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ 表 flow_export_jobs 已创建');

    // 10. 聊天记录表
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

    // 11. 聊天评论表
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

    // 12. 代码片段表
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

    // 13. 计数器表
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
        ('flow', 0),
        ('execution', 0)
    `);
    console.log('✅ 计数器初始化完成');

    // 13.5 流程执行实例表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS flow_executions (
        id VARCHAR(50) PRIMARY KEY,
        execution_no VARCHAR(20) UNIQUE NOT NULL,
        flow_id VARCHAR(50) NOT NULL,
        flow_release_id VARCHAR(50),
        status ENUM('pending', 'running', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
        initiator_id VARCHAR(50),
        current_step_id VARCHAR(50),
        context JSON,
        started_at BIGINT,
        completed_at BIGINT,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL,
        INDEX idx_flow (flow_id),
        INDEX idx_status (status),
        INDEX idx_created (created_at),
        FOREIGN KEY (flow_id) REFERENCES flows(id) ON DELETE RESTRICT,
        FOREIGN KEY (flow_release_id) REFERENCES flow_releases(id) ON DELETE SET NULL,
        FOREIGN KEY (initiator_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ 表 flow_executions 已创建');

    // 13.6 步骤执行记录表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS flow_execution_steps (
        id VARCHAR(50) PRIMARY KEY,
        execution_id VARCHAR(50) NOT NULL,
        step_id VARCHAR(50) NOT NULL,
        step_name VARCHAR(200) NOT NULL,
        step_order INT NOT NULL,
        status ENUM('pending', 'running', 'completed', 'skipped', 'failed') DEFAULT 'pending',
        assignee_id VARCHAR(50),
        result JSON,
        error_message TEXT,
        started_at BIGINT,
        completed_at BIGINT,
        duration INT,
        created_at BIGINT NOT NULL,
        INDEX idx_execution (execution_id),
        INDEX idx_status (status),
        FOREIGN KEY (execution_id) REFERENCES flow_executions(id) ON DELETE CASCADE,
        FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ 表 flow_execution_steps 已创建');

    // 创建复合索引以优化查询性能
    try {
      await connection.query(`
        CREATE INDEX idx_executions_status_created
        ON flow_executions(status, created_at DESC)
      `);
      console.log('✅ 复合索引 idx_executions_status_created 已创建');
    } catch (err) {
      if (err.code === 'ER_DUP_KEYNAME') {
        console.log('✅ 复合索引 idx_executions_status_created 已存在');
      } else {
        throw err;
      }
    }

    try {
      await connection.query(`
        CREATE INDEX idx_executions_flow_status_created
        ON flow_executions(flow_id, status, created_at DESC)
      `);
      console.log('✅ 复合索引 idx_executions_flow_status_created 已创建');
    } catch (err) {
      if (err.code === 'ER_DUP_KEYNAME') {
        console.log('✅ 复合索引 idx_executions_flow_status_created 已存在');
      } else {
        throw err;
      }
    }

    try {
      await connection.query(`
        CREATE INDEX idx_executions_initiator_created
        ON flow_executions(initiator_id, created_at DESC)
      `);
      console.log('✅ 复合索引 idx_executions_initiator_created 已创建');
    } catch (err) {
      if (err.code === 'ER_DUP_KEYNAME') {
        console.log('✅ 复合索引 idx_executions_initiator_created 已存在');
      } else {
        throw err;
      }
    }

    try {
      await connection.query(`
        CREATE INDEX idx_steps_execution_status
        ON flow_execution_steps(execution_id, status)
      `);
      console.log('✅ 复合索引 idx_steps_execution_status 已创建');
    } catch (err) {
      if (err.code === 'ER_DUP_KEYNAME') {
        console.log('✅ 复合索引 idx_steps_execution_status 已存在');
      } else {
        throw err;
      }
    }

    // 13.7 流程自动化规则表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS flow_automation_rules (
        id VARCHAR(50) PRIMARY KEY,
        flow_id VARCHAR(50) NOT NULL,
        rule_name VARCHAR(200) NOT NULL,
        rule_type ENUM('schedule', 'event', 'condition') NOT NULL,
        trigger_type VARCHAR(50),
        trigger_config JSON,
        action_type ENUM('execute_flow', 'execute_step', 'skip_step', 'complete_step') NOT NULL,
        action_config JSON,
        is_enabled BOOLEAN DEFAULT TRUE,
        created_by VARCHAR(50),
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL,
        INDEX idx_flow (flow_id),
        INDEX idx_enabled (is_enabled),
        INDEX idx_type (rule_type),
        FOREIGN KEY (flow_id) REFERENCES flows(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ 表 flow_automation_rules 已创建');

    // 13.8 自动化规则执行日志表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS flow_automation_logs (
        id VARCHAR(50) PRIMARY KEY,
        rule_id VARCHAR(50) NOT NULL,
        execution_id VARCHAR(50),
        trigger_time BIGINT NOT NULL,
        action_executed BOOLEAN DEFAULT FALSE,
        action_result JSON,
        error_message TEXT,
        created_at BIGINT NOT NULL,
        INDEX idx_rule (rule_id),
        INDEX idx_execution (execution_id),
        INDEX idx_trigger_time (trigger_time DESC),
        FOREIGN KEY (rule_id) REFERENCES flow_automation_rules(id) ON DELETE CASCADE,
        FOREIGN KEY (execution_id) REFERENCES flow_executions(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ 表 flow_automation_logs 已创建');

    // 14. 用户设置表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS user_settings (
        setting_key VARCHAR(50) PRIMARY KEY,
        setting_value TEXT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ 表 user_settings 已创建');

    // 15. 流程连线表（支持拖拽编辑器）
    await connection.query(`
      CREATE TABLE IF NOT EXISTS flow_connections (
        id VARCHAR(50) PRIMARY KEY,
        flow_id VARCHAR(50) NOT NULL,
        source_step_id VARCHAR(50) NOT NULL,
        target_step_id VARCHAR(50) NOT NULL,
        connection_type VARCHAR(20) DEFAULT 'sequence',
        label VARCHAR(200),
        condition_config JSON,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL,
        INDEX idx_flow (flow_id),
        INDEX idx_source (source_step_id),
        INDEX idx_target (target_step_id),
        FOREIGN KEY (flow_id) REFERENCES flows(id) ON DELETE CASCADE,
        FOREIGN KEY (source_step_id) REFERENCES flow_steps(id) ON DELETE CASCADE,
        FOREIGN KEY (target_step_id) REFERENCES flow_steps(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ 表 flow_connections 已创建');

    // 扩展flow_steps表添加节点类型和尺寸字段
    try {
      await connection.query(`
        ALTER TABLE flow_steps
        ADD COLUMN node_type VARCHAR(50) DEFAULT 'userTask'
        AFTER conditional
      `);
      console.log('✅ 表 flow_steps node_type 字段已添加');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('✅ 表 flow_steps node_type 字段已存在');
      } else {
        throw err;
      }
    }

    try {
      await connection.query(`
        ALTER TABLE flow_steps
        ADD COLUMN node_width INT DEFAULT 120
        AFTER position_y
      `);
      console.log('✅ 表 flow_steps node_width 字段已添加');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('✅ 表 flow_steps node_width 字段已存在');
      } else {
        throw err;
      }
    }

    try {
      await connection.query(`
        ALTER TABLE flow_steps
        ADD COLUMN node_height INT DEFAULT 80
        AFTER node_width
      `);
      console.log('✅ 表 flow_steps node_height 字段已添加');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('✅ 表 flow_steps node_height 字段已存在');
      } else {
        throw err;
      }
    }

    // 16. 流程变量表（Phase 3：参数传递与数据映射）
    await connection.query(`
      CREATE TABLE IF NOT EXISTS flow_variables (
        id VARCHAR(50) PRIMARY KEY,
        flow_id VARCHAR(50) NOT NULL,
        name VARCHAR(100) NOT NULL,
        type ENUM('string', 'number', 'boolean', 'array', 'object', 'any') DEFAULT 'string',
        default_value JSON,
        description TEXT,
        required BOOLEAN DEFAULT FALSE,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL,
        INDEX idx_flow (flow_id),
        FOREIGN KEY (flow_id) REFERENCES flows(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ 表 flow_variables 已创建');

    // 17. 步骤参数映射表（Phase 3：参数传递与数据映射）
    await connection.query(`
      CREATE TABLE IF NOT EXISTS flow_step_parameters (
        id VARCHAR(50) PRIMARY KEY,
        flow_id VARCHAR(50) NOT NULL,
        step_id VARCHAR(50) NOT NULL,
        param_type ENUM('input', 'output') DEFAULT 'input',
        param_name VARCHAR(100) NOT NULL,
        source_type ENUM('constant', 'variable', 'expression', 'previous_step') DEFAULT 'constant',
        source_value TEXT,
        mapping_to VARCHAR(100),
        description TEXT,
        step_order INT,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL,
        INDEX idx_step (step_id),
        INDEX idx_flow (flow_id),
        INDEX idx_param_type (param_type),
        FOREIGN KEY (flow_id) REFERENCES flows(id) ON DELETE CASCADE,
        FOREIGN KEY (step_id) REFERENCES flow_steps(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ 表 flow_step_parameters 已创建');

    // 扩展flow_execution_steps表添加参数字段
    try {
      await connection.query(`
        ALTER TABLE flow_execution_steps
        ADD COLUMN input_data JSON
        AFTER step_order
      `);
      console.log('✅ 表 flow_execution_steps input_data 字段已添加');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('✅ 表 flow_execution_steps input_data 字段已存在');
      } else {
        throw err;
      }
    }

    try {
      await connection.query(`
        ALTER TABLE flow_execution_steps
        ADD COLUMN output_data JSON
        AFTER input_data
      `);
      console.log('✅ 表 flow_execution_steps output_data 字段已添加');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('✅ 表 flow_execution_steps output_data 字段已存在');
      } else {
        throw err;
      }
    }

    // 18. 登录会话表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS auth_sessions (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        token_hash CHAR(64) NOT NULL,
        user_id VARCHAR(50) NOT NULL,
        created_at BIGINT NOT NULL,
        expires_at BIGINT NOT NULL,
        revoked_at BIGINT NULL,
        INDEX idx_token_hash (token_hash),
        INDEX idx_user_id (user_id),
        INDEX idx_expires_at (expires_at),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ 表 auth_sessions 已创建');

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
