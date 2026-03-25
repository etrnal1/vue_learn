-- 录制服务数据库表
-- 执行: mysql -u root -p <db_name> < server/sql/screen_recorder_tables.sql

CREATE TABLE IF NOT EXISTS screen_recorder_sessions (
  id            VARCHAR(64)   NOT NULL,
  status        ENUM('active','completed','aborted') NOT NULL DEFAULT 'active',
  quality       VARCHAR(16)   NOT NULL DEFAULT 'high',
  frame_rate    TINYINT       NOT NULL DEFAULT 30,
  capture_audio TINYINT(1)    NOT NULL DEFAULT 1,
  capture_mic   TINYINT(1)    NOT NULL DEFAULT 0,
  chunk_count   INT           NOT NULL DEFAULT 0,
  tmp_dir       VARCHAR(1024) NOT NULL,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at  DATETIME      NULL,
  PRIMARY KEY (id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS screen_recordings (
  id              INT           NOT NULL AUTO_INCREMENT,
  session_id      VARCHAR(64)   NOT NULL DEFAULT '',
  name            VARCHAR(255)  NOT NULL,
  filename        VARCHAR(512)  NOT NULL,
  file_path       VARCHAR(1024) NOT NULL,
  format          VARCHAR(16)   NOT NULL DEFAULT 'webm',
  size_byte       BIGINT        NOT NULL DEFAULT 0,
  duration_sec    INT           NOT NULL DEFAULT 0,
  has_thumbnail   TINYINT(1)    NOT NULL DEFAULT 0,
  thumbnail_path  VARCHAR(1024) NULL,
  converted_from  INT           NULL,
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_session_id (session_id),
  INDEX idx_format (format),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS screen_recorder_tasks (
  id            VARCHAR(64)   NOT NULL,
  type          VARCHAR(32)   NOT NULL DEFAULT 'convert',
  status        ENUM('pending','running','done','error') NOT NULL DEFAULT 'pending',
  recording_id  INT           NOT NULL,
  output_id     INT           NULL,
  params        JSON          NOT NULL,
  progress      TINYINT       NOT NULL DEFAULT 0,
  error_msg     TEXT          NULL,
  started_at    DATETIME      NULL,
  completed_at  DATETIME      NULL,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_status (status),
  INDEX idx_recording_id (recording_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
