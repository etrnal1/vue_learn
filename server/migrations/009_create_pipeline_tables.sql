-- M9 流水线模块数据库表
-- 创建日期: 2026-03-05

-- 1. 流水线表
CREATE TABLE IF NOT EXISTS pipelines (
  id VARCHAR(50) PRIMARY KEY COMMENT '流水线ID',
  name VARCHAR(255) NOT NULL COMMENT '流水线名称',
  description TEXT COMMENT '流水线描述',
  version VARCHAR(20) DEFAULT '1.0.0' COMMENT '版本号',
  status ENUM('active', 'paused', 'archived') DEFAULT 'active' COMMENT '状态',
  config JSON NOT NULL COMMENT '流水线配置',
  nodes JSON NOT NULL COMMENT '节点配置',
  edges JSON NOT NULL COMMENT '边配置',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  created_by VARCHAR(50) COMMENT '创建人',
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='流水线配置表';

-- 2. 执行记录表
CREATE TABLE IF NOT EXISTS executions (
  id VARCHAR(50) PRIMARY KEY COMMENT '执行ID',
  pipeline_id VARCHAR(50) NOT NULL COMMENT '流水线ID',
  status ENUM('pending', 'running', 'paused', 'completed', 'failed', 'cancelled') DEFAULT 'pending' COMMENT '执行状态',
  progress DECIMAL(5,4) DEFAULT 0 COMMENT '执行进度',
  variables JSON COMMENT '变量',
  context JSON COMMENT '上下文',
  result JSON COMMENT '执行结果',
  error_message TEXT COMMENT '错误信息',
  started_at TIMESTAMP NULL COMMENT '开始时间',
  completed_at TIMESTAMP NULL COMMENT '完成时间',
  duration_ms INT COMMENT '执行时长(毫秒)',
  triggered_by VARCHAR(50) COMMENT '触发人',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  FOREIGN KEY (pipeline_id) REFERENCES pipelines(id) ON DELETE CASCADE,
  INDEX idx_pipeline_status (pipeline_id, status),
  INDEX idx_created_at (created_at),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='流水线执行记录表';

-- 3. 执行节点表
CREATE TABLE IF NOT EXISTS execution_nodes (
  id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '自增ID',
  execution_id VARCHAR(50) NOT NULL COMMENT '执行ID',
  node_id VARCHAR(50) NOT NULL COMMENT '节点ID',
  node_type VARCHAR(100) NOT NULL COMMENT '节点类型',
  status ENUM('pending', 'running', 'completed', 'failed', 'skipped') DEFAULT 'pending' COMMENT '节点状态',
  input JSON COMMENT '输入数据',
  output JSON COMMENT '输出数据',
  error_message TEXT COMMENT '错误信息',
  started_at TIMESTAMP NULL COMMENT '开始时间',
  completed_at TIMESTAMP NULL COMMENT '完成时间',
  duration_ms INT COMMENT '执行时长(毫秒)',
  retry_count INT DEFAULT 0 COMMENT '重试次数',
  FOREIGN KEY (execution_id) REFERENCES executions(id) ON DELETE CASCADE,
  INDEX idx_execution_node (execution_id, node_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='执行节点记录表';

-- 4. 模块表
CREATE TABLE IF NOT EXISTS modules (
  type VARCHAR(100) PRIMARY KEY COMMENT '模块类型',
  name VARCHAR(255) NOT NULL COMMENT '模块名称',
  category VARCHAR(50) NOT NULL COMMENT '模块类别',
  description TEXT COMMENT '模块描述',
  version VARCHAR(20) DEFAULT '1.0.0' COMMENT '版本号',
  author VARCHAR(100) COMMENT '作者',
  config JSON NOT NULL COMMENT '模块配置',
  source_path VARCHAR(500) NOT NULL COMMENT '源码路径',
  is_builtin BOOLEAN DEFAULT FALSE COMMENT '是否内置模块',
  is_enabled BOOLEAN DEFAULT TRUE COMMENT '是否启用',
  installed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '安装时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_category (category),
  INDEX idx_enabled (is_enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='模块注册表';

-- 5. 执行日志表
CREATE TABLE IF NOT EXISTS execution_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '自增ID',
  execution_id VARCHAR(50) NOT NULL COMMENT '执行ID',
  node_id VARCHAR(50) COMMENT '节点ID',
  level ENUM('debug', 'info', 'warn', 'error') DEFAULT 'info' COMMENT '日志级别',
  message TEXT NOT NULL COMMENT '日志消息',
  details JSON COMMENT '详细信息',
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '时间戳',
  FOREIGN KEY (execution_id) REFERENCES executions(id) ON DELETE CASCADE,
  INDEX idx_execution_level (execution_id, level),
  INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='执行日志表';

-- 插入内置模块记录
INSERT INTO modules (type, name, category, description, version, source_path, is_builtin, is_enabled) VALUES
('data-generator', '数据生成器', 'source', '生成指定数量的测试数据', '1.0.0', 'server/modules/source/DataGenerator.js', TRUE, TRUE),
('data-transform', '数据转换', 'transform', '转换数据格式和结构', '1.0.0', 'server/modules/transform/DataTransform.js', TRUE, TRUE),
('condition-filter', '条件过滤', 'filter', '根据条件过滤数据', '1.0.0', 'server/modules/filter/ConditionFilter.js', TRUE, TRUE),
('console-output', '控制台输出', 'sink', '输出数据到控制台', '1.0.0', 'server/modules/sink/ConsoleOutput.js', TRUE, TRUE)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  version = VALUES(version),
  updated_at = CURRENT_TIMESTAMP;

-- 验证表创建
SELECT 'Pipeline tables created successfully' AS status;
