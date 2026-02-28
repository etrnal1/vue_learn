# Vue Learning App - 快速参考卡

## 🎯 项目快速导航

### 目录速记

```
前端：src/
  pages/           ← 13 个页面组件
  components/      ← 可复用组件
  utils/api.js     ← API 客户端

后端：server/
  routes/          ← 19 个 API 模块
  db.js            ← 数据库连接
  index.js         ← 服务器入口
```

---

## 🚀 常用命令

```bash
# 启动开发服务器
npm run dev

# 初始化数据库
npm run init-db:test

# 初始化测试数据
npm run init-data:test

# 构建生产版本
npm run build

# 启动生产服务器
npm run server:prod
```

---

## 📱 前端常用代码片段

### 导入 API 客户端
```javascript
import { api } from '../utils/api'
```

### 获取数据
```javascript
const items = await api.tickets.getAll()
const item = await api.tickets.getOne(id)
```

### 创建数据
```javascript
const newItem = await api.tickets.create({
  title: '标题',
  description: '描述',
  category: 'bug'
})
```

### 更新数据
```javascript
await api.tickets.update(id, {
  title: '新标题',
  status: 'in_progress'
})
```

### 删除数据
```javascript
await api.tickets.delete(id)
```

### 组件生命周期
```javascript
import { onMounted, onUnmounted } from 'vue'

export default {
  setup() {
    onMounted(() => {
      console.log('组件挂载')
    })

    onUnmounted(() => {
      console.log('组件卸载')
    })
  }
}
```

### Props 定义
```javascript
const props = defineProps({
  title: String,
  count: Number,
  items: Array,
  required: { type: String, required: true }
})
```

### 事件发射
```javascript
const emit = defineEmits(['update', 'delete'])

function handleUpdate() {
  emit('update', newValue)
}
```

### 响应式状态
```javascript
import { ref, reactive } from 'vue'

const count = ref(0)
const form = reactive({ name: '', email: '' })
```

---

## 🔧 后端常用代码片段

### 基本路由
```javascript
import express from 'express'
import pool from '../db.js'

const router = express.Router()

router.get('/', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM table')
  res.json(rows)
})

export default router
```

### 注册路由
```javascript
import myRouter from './routes/myroute.js'
app.use('/api/myroute', myRouter)
```

### 查询数据库
```javascript
// 查询所有
const [rows] = await pool.query('SELECT * FROM table')

// 查询一条
const [rows] = await pool.query(
  'SELECT * FROM table WHERE id = ?',
  [id]
)

// 插入
const result = await pool.query(
  'INSERT INTO table (name, email) VALUES (?, ?)',
  [name, email]
)

// 更新
await pool.query(
  'UPDATE table SET name = ? WHERE id = ?',
  [newName, id]
)

// 删除
await pool.query('DELETE FROM table WHERE id = ?', [id])
```

### 错误处理
```javascript
if (!name) {
  return res.status(400).json({ error: '名称必填' })
}

try {
  // ... 操作
} catch (error) {
  res.status(500).json({ error: error.message })
}
```

### CORS 和中间件
```javascript
import cors from 'cors'

app.use(cors())
app.use(express.json())
app.use((req, res, next) => {
  console.log(req.method, req.path)
  next()
})
```

---

## 📊 API 端点速查

### 用户 API
```
GET    /api/users                    # 获取所有用户
GET    /api/users/current            # 获取当前用户
POST   /api/users                    # 创建用户
PUT    /api/users/:id                # 更新用户
DELETE /api/users/:id                # 删除用户
```

### 事件 API
```
GET    /api/tickets                  # 获取事件列表
GET    /api/tickets/:id              # 获取事件详情
POST   /api/tickets                  # 创建事件
PUT    /api/tickets/:id              # 更新事件
DELETE /api/tickets/:id              # 删除事件
POST   /api/tickets/:id/comments     # 添加评论
DELETE /api/tickets/:id/comments/:cid # 删除评论
```

### 服务请求 API
```
GET    /api/service-requests         # 获取请求列表
GET    /api/service-requests/:id     # 获取请求详情
POST   /api/service-requests         # 创建请求
PUT    /api/service-requests/:id     # 更新请求
DELETE /api/service-requests/:id     # 删除请求
POST   /api/service-requests/:id/comments
DELETE /api/service-requests/:id/comments/:cid
```

### 文章 API
```
GET    /api/articles                 # 获取文章列表
GET    /api/articles/:id             # 获取文章详情
POST   /api/articles                 # 创建文章
PUT    /api/articles/:id             # 更新文章
DELETE /api/articles/:id             # 删除文章
POST   /api/articles/:id/view        # 增加浏览量
```

### 视频 API
```
GET    /api/videos/library           # 获取视频库
PUT    /api/videos/library           # 更新视频库
POST   /api/videos/scan              # 扫描视频文件
GET    /api/videos/stream            # 流式播放视频
```

### 其他 API
```
GET    /api/flows                    # 流程定义
GET    /api/chats                    # 聊天记录
GET    /api/code-snippets            # 代码片段
GET    /api/git/history              # Git 提交历史
GET    /api/scheduler-tasks          # 定时任务列表
GET    /api/runtime-logs             # 运行时日志
```

---

## 🗄️ 数据库表速查

### 核心表

| 表名 | 用途 | 主要字段 |
|-----|------|--------|
| users | 用户管理 | id, name, role, email |
| tickets | 事件管理 | id, ticket_no, title, status, priority, assignee_id |
| ticket_comments | 事件评论 | id, ticket_id, user_id, text |
| service_requests | 服务请求 | id, request_no, service_type, status, approver_id |
| service_catalog | 服务目录 | id, service_type, name, form_schema, requires_approval |
| articles | 知识库 | id, article_no, title, content, author_id |
| flows | 流程定义 | id, flow_no, name, author_id |
| chats | 聊天记录 | id, title, content |
| code_snippets | 代码片段 | id, language, code |

---

## 🔐 用户角色权限

| 角色 | 权限 |
|-----|------|
| admin | 全部权限 |
| approver | 审批服务请求 |
| member | 创建/查看自己的请求 |

---

## 🐛 常见调试技巧

### 前端
```javascript
// 检查 API 响应
console.log(await api.tickets.getAll())

// 检查组件状态
console.log(this.$data)

// 浏览器开发者工具
F12 → Network 标签查看 HTTP 请求
```

### 后端
```javascript
// 打印日志
console.log('调试信息:', variable)

// 检查数据库连接
pool.query('SELECT 1')

// 测试 API
curl http://localhost:4000/api/tickets
```

### 数据库
```sql
-- 查看所有表
SHOW TABLES;

-- 查看表结构
DESCRIBE tickets;

-- 查看数据
SELECT * FROM tickets LIMIT 10;

-- 查看索引
SHOW INDEX FROM tickets;
```

---

## 📝 常见编码模式

### 页面加载数据
```javascript
export default {
  setup() {
    const items = ref([])
    const loading = ref(false)
    const error = ref(null)

    async function loadData() {
      loading.value = true
      try {
        items.value = await api.items.getAll()
      } catch (e) {
        error.value = e.message
      } finally {
        loading.value = false
      }
    }

    onMounted(loadData)

    return { items, loading, error }
  }
}
```

### 表单提交
```javascript
const form = reactive({ name: '', email: '' })
const submitting = ref(false)

async function handleSubmit() {
  if (!form.name) {
    alert('名称必填')
    return
  }

  submitting.value = true
  try {
    await api.items.create(form)
    alert('创建成功')
    form.name = ''
    form.email = ''
  } catch (error) {
    alert('创建失败: ' + error.message)
  } finally {
    submitting.value = false
  }
}
```

### 列表操作
```javascript
const items = ref([])

async function deleteItem(id) {
  if (confirm('确认删除？')) {
    await api.items.delete(id)
    items.value = items.value.filter(item => item.id !== id)
  }
}

async function editItem(item) {
  const newName = prompt('新名称:', item.name)
  if (newName) {
    await api.items.update(item.id, { name: newName })
    item.name = newName
  }
}
```

---

## 🌐 环境变量

### 前端 (.env)
```
VITE_API_BASE_URL=http://localhost:4000
```

### 后端 (.env.test 或 .env.production)
```
NODE_ENV=test/production
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=itsm_db
DB_PORT=3306
PORT=4000
```

---

## 📦 依赖速查

### 前端主要依赖
- vue@3.3.4 - 框架
- vite@4.3.9 - 构建工具
- echarts@6.0.0 - 图表库

### 后端主要依赖
- express@4.18.2 - Web 框架
- mysql2@3.6.5 - 数据库驱动
- cors@2.8.5 - 跨域中间件

---

## 🎯 新功能检查清单

新增功能时，按以下步骤：

- [ ] 创建后端 API 路由 (server/routes/xxx.js)
- [ ] 在 server/index.js 注册路由
- [ ] 创建数据库表 (server/init-db.js)
- [ ] 在 src/utils/api.js 添加 API 调用
- [ ] 创建前端页面或组件 (src/pages/xxx.vue)
- [ ] 在 App.vue 添加标签页（如需要）
- [ ] 测试前后端交互
- [ ] 更新文档

---

**💡 提示：** 遇到问题时，先查看浏览器控制台和服务器日志！
