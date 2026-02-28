# 🚨 注册失败 500 错误完整排查指南

## 🎯 快速修复（99% 有效）

```bash
# 1. 初始化数据库
npm run init-db:test

# 2. 重启后端
npm run server:test

# 3. 在新终端启动前端
npm run client:test

# 4. 尝试注册
# 访问 http://localhost:5173
```

如果上述步骤不能解决问题，继续按照下面的详细步骤排查。

---

## 📋 详细问题诊断

### 第 1 步：检查 MySQL 是否运行

```bash
# macOS 使用 Homebrew 安装的 MySQL
brew services list | grep mysql

# 如果 MySQL 未运行，启动它
brew services start mysql-community-server

# 或使用其他方式启动的 MySQL（如 Docker、XAMPP 等）
```

**验证连接：**
```bash
mysql -u root -p

# 输入密码（如果有的话），应该看到 mysql> 提示符
mysql> exit
```

---

### 第 2 步：检查数据库和表结构

```bash
# 连接到 MySQL
mysql -u root -p

# 在 MySQL 中执行以下命令：

# 查看数据库是否存在
SHOW DATABASES;

# 选择数据库（应该能看到 itsm）
USE itsm;

# 查看表是否存在
SHOW TABLES;

# 查看 users 表的结构
DESC users;

# 查看 auth_sessions 表的结构
DESC auth_sessions;
```

**应该看到的结果：**

**users 表应该包含：**
```
Field          | Type                          | Null | Key | Default | Extra
id             | varchar(50)                   | NO   | PRI |         |
name           | varchar(100)                  | NO   |     |         |
role           | enum('admin','member','app..') | NO   |     | member  |
avatar         | varchar(10)                   | YES  |     | 👨‍💻    |
email          | varchar(255)                  | YES  |     |         |
password_hash  | varchar(255)                  | YES  |     |         |
created_at     | bigint(20)                    | NO   |     |         |
```

**auth_sessions 表应该包含：**
```
Field       | Type          | Null | Key | Default | Extra
id          | bigint(20)    | NO   | PRI |         | auto_increment
token_hash  | char(64)      | NO   | MUL |         |
user_id     | varchar(50)   | NO   | MUL |         |
created_at  | bigint(20)    | NO   |     |         |
expires_at  | bigint(20)    | NO   | MUL |         |
revoked_at  | bigint(20)    | YES  |     |         |
```

---

### 第 3 步：如果表结构不对，修复它

**如果 password_hash 列不存在：**
```sql
ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) AFTER email;
```

**如果 auth_sessions 表不存在：**
```sql
CREATE TABLE auth_sessions (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 第 4 步：检查后端环境配置

**查看 server/.env 文件：**
```bash
cat /Users/mac/vue-learning-app/server/.env
```

**应该包含：**
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=（可能为空或有密码）
DB_NAME=itsm
DB_PORT=3306
NODE_ENV=test
```

**如果缺少这些变量，创建或编辑 .env：**
```bash
# 编辑 server/.env
cat > /Users/mac/vue-learning-app/server/.env << 'EOF'
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=itsm
DB_PORT=3306
NODE_ENV=test
EOF
```

---

### 第 5 步：检查后端日志

**启动后端并观察日志：**
```bash
npm run server:test
```

**应该看到的日志：**
```
✅ 表 users 已创建
✅ 表 users 密码字段已校准
✅ 认证模块已初始化
🚀 ITSM 后端服务器启动成功！
```

**常见错误日志：**
```
❌ 无法连接到数据库
   → 检查 MySQL 是否运行
   → 检查 .env 配置

❌ 数据库不存在
   → 运行 npm run init-db:test

❌ 表或列不存在
   → 运行 npm run init-db:test
```

---

## 🧪 测试注册接口

### 使用 curl 测试

**在启动了后端后，运行：**
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "id": "testuser001",
    "name": "测试用户",
    "password": "password123",
    "email": "test@example.com"
  }'
```

**成功的响应 (201)：**
```json
{
  "token": "长的十六进制字符串...",
  "expiresAt": 1234567890000,
  "user": {
    "id": "testuser001",
    "name": "测试用户",
    "role": "member",
    "avatar": "👨‍💻",
    "email": "test@example.com",
    "createdAt": 1234567890000
  }
}
```

**错误响应 (400)：**
```json
{
  "error": "缺少必填字段：id/name/password"
}
```
→ 检查请求体

**错误响应 (500)：**
```json
{
  "error": "数据库字段缺失，请先执行数据库迁移（init-db）并重启后端"
}
```
→ 运行 `npm run init-db:test`

---

## 🔄 完整恢复流程

如果一切都坏了，按照这个步骤从头开始：

### 步骤 1：停止所有服务
```bash
# 按 Ctrl+C 停止当前运行的后端和前端
```

### 步骤 2：重置数据库
```bash
# 完全重新初始化数据库
npm run init-db:test
```

### 步骤 3：验证数据库
```bash
mysql -u root -p
USE itsm;
SHOW TABLES;
DESC users;
DESC auth_sessions;
```

### 步骤 4：重启后端
```bash
npm run server:test
```

**应该看到的日志：**
```
✅ 认证模块已初始化
🚀 ITSM 后端服务器启动成功！
🟢 环境: DEVELOPMENT
📍 监听端口: http://localhost:4000
```

### 步骤 5：在新终端启动前端
```bash
npm run client:test
```

### 步骤 6：测试注册
```bash
# 访问 http://localhost:5173
# 点击注册
# 填写表单并提交

# 或使用 curl 测试
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"id":"testuser","name":"Test","password":"123456"}'
```

---

## 🛠️ 如果问题仍未解决

### 检查项目依赖
```bash
npm install
cd server && npm install
```

### 检查 Node.js 版本
```bash
node --version
# 应该是 v16 或更高
```

### 查看完整的错误信息
```bash
# 重启后端并捕获完整错误
npm run server:test 2>&1 | tee server.log

# 查看日志文件
cat server.log
```

### 清除所有缓存并重新初始化
```bash
# 清除 npm 缓存
npm cache clean --force

# 删除 node_modules
rm -rf node_modules
rm -rf server/node_modules

# 重新安装依赖
npm install
cd server && npm install

# 重新初始化数据库
npm run init-db:test
```

---

## 📞 求助时需要提供的信息

如果问题仍未解决，请提供：

1. **MySQL 版本和状态**
```bash
mysql --version
brew services list | grep mysql
```

2. **后端启动日志**
```bash
npm run server:test 2>&1 | head -50
```

3. **数据库表结构**
```bash
mysql -u root -p -e "USE itsm; SHOW TABLES; DESC users; DESC auth_sessions;"
```

4. **注册请求的完整错误响应**
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"id":"test","name":"test","password":"123456"}' \
  -v
```

5. **Node.js 和 npm 版本**
```bash
node --version
npm --version
```

---

## ✅ 验证修复成功的标志

1. ✅ `npm run init-db:test` 执行成功
2. ✅ `npm run server:test` 显示"认证模块已初始化"
3. ✅ curl 注册请求返回 201 状态码
4. ✅ 前端注册表单可以提交成功
5. ✅ 注册后能自动登录和跳转

---

**最后更新：** 2026-02-24
