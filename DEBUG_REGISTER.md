# 注册失败 500 错误诊断指南

## 🔍 可能的原因

### 1. **数据库未初始化或字段缺失** ❌ 最常见

**症状：**
- 返回 500 错误
- 后端日志显示 "ER_BAD_FIELD_ERROR" 或 "unknown column"

**解决方案：**
```bash
# 初始化或重置数据库
npm run init-db:test

# 或生产环境
npm run init-db:prod

# 然后重启后端
npm run server:test
```

---

### 2. **users 表不存在或结构不正确**

**诊断：** 在 MySQL 中检查表结构
```sql
DESC users;
SHOW CREATE TABLE users;
```

**应该包含的列：**
- id (VARCHAR(50), PRIMARY KEY)
- name (VARCHAR(100))
- role (ENUM)
- avatar (VARCHAR(10))
- email (VARCHAR(255))
- password_hash (VARCHAR(255)) ⭐ **关键**
- created_at (BIGINT)

**修复：** 如果缺少 password_hash 列
```sql
ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) AFTER email;
```

---

### 3. **auth_sessions 表不存在**

**诊断：** 检查是否存在
```sql
SHOW TABLES LIKE 'auth_sessions';
DESC auth_sessions;
```

**应该包含的列：**
- id (BIGINT, PRIMARY KEY, AUTO_INCREMENT)
- token_hash (CHAR(64), NOT NULL, INDEX)
- user_id (VARCHAR(50), NOT NULL, INDEX)
- created_at (BIGINT)
- expires_at (BIGINT, INDEX)
- revoked_at (BIGINT)
- FOREIGN KEY 指向 users.id

**修复：** 重新初始化数据库
```bash
npm run init-db:test
```

---

### 4. **后端没有正确初始化认证模块**

**诊断：** 检查后端启动日志
```bash
npm run server:test
```

**应该看到的日志：**
```
✅ 表 users 已创建
✅ 表 users 密码字段已校准
✅ 认证模块已初始化
```

**如果没有看到这些日志：** 说明 ensureAuthSchema() 未被调用

---

### 5. **密码哈希计算失败**

**症状：**
- 注册时 password_hash 为 NULL
- 登录无法验证密码

**诊断：** 查看后端错误日志
```bash
# 在后端启动时查看是否有密码相关错误
npm run server:test 2>&1 | grep -i password
```

---

## 🛠️ 快速诊断步骤

### 第 1 步：验证数据库连接
```bash
# 检查 server/.env 配置
cat server/.env | grep -E "DB_|DATABASE_"
```

**应该包含：**
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=password (或为空)
DB_NAME=itsm
DB_PORT=3306
```

### 第 2 步：验证表结构
```bash
# 登录 MySQL
mysql -u root -p

# 选择数据库
USE itsm;

# 检查表
SHOW TABLES;

# 检查 users 表
DESC users;

# 检查 auth_sessions 表
DESC auth_sessions;
```

### 第 3 步：查看后端错误日志
```bash
# 启动后端并查看日志
npm run server:test

# 在另一个终端测试注册
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "id": "testuser",
    "name": "Test User",
    "password": "password123"
  }'
```

### 第 4 步：查看返回的具体错误信息

**如果返回：**
```json
{
  "error": "缺少必填字段：id/name/password"
}
```
→ 检查请求体是否正确

**如果返回：**
```json
{
  "error": "数据库字段缺失，请先执行数据库迁移（init-db）并重启后端"
}
```
→ 运行 `npm run init-db:test`

**如果返回：**
```json
{
  "error": "认证模块初始化失败，请先执行数据库迁移并重启后端"
}
```
→ 说明 ensureAuthSchema() 执行失败

---

## 🔧 完整恢复步骤（如果一切都坏了）

```bash
# 1. 停止后端和前端
# 按 Ctrl+C 停止运行的服务

# 2. 重置数据库
npm run init-db:test

# 3. 重启后端
npm run server:test

# 4. 在新终端启动前端
npm run client:test

# 5. 尝试注册
# 访问 http://localhost:5173
# 点击注册按钮
# 填写表单并提交
```

---

## 📝 注册请求格式

**正确的请求：**
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "id": "user123",
    "name": "张三",
    "password": "password123",
    "email": "user@example.com",
    "avatar": "🙂",
    "role": "member"
  }'
```

**最小请求（必填字段）：**
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "id": "user123",
    "name": "张三",
    "password": "password123"
  }'
```

---

## ✅ 成功的响应

```json
{
  "token": "长字符串token...",
  "expiresAt": 1703088000000,
  "user": {
    "id": "user123",
    "name": "张三",
    "role": "member",
    "avatar": "👨‍💻",
    "email": "user@example.com",
    "createdAt": 1702484000000
  }
}
```

---

## 🐛 常见错误及解决方案

| 错误信息 | 原因 | 解决方案 |
|---------|------|--------|
| "ER_BAD_FIELD_ERROR" | 表结构不对 | 运行 `npm run init-db:test` |
| "用户 ID 已存在" | ID 重复 | 换个新 ID |
| "密码长度至少 6 位" | 密码太短 | 输入至少 6 个字符 |
| "缺少必填字段" | 请求参数不完整 | 检查 id、name、password 都填了 |
| 数据库连接失败 | DB 连接错误 | 检查 .env 配置和 MySQL 状态 |

---

**更新日期：** 2026-02-24
