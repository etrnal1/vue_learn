# Vue Learning App - 完整学习指南

## 📚 目录
1. [快速开始](#快速开始)
2. [项目架构](#项目架构)
3. [核心概念](#核心概念)
4. [前端开发指南](#前端开发指南)
5. [后端开发指南](#后端开发指南)
6. [常见场景解析](#常见场景解析)
7. [最佳实践](#最佳实践)

---

## 🚀 快速开始

### 环境要求
- Node.js 16+
- MySQL 5.7+
- npm 8+

### 安装步骤
```bash
# 1. 安装依赖
npm install
cd server && npm install && cd ..

# 2. 初始化数据库
npm run init-db:test

# 3. 初始化测试数据
npm run init-data:test

# 4. 启动开发服务器
npm run dev
```

### 访问应用
- 前端：http://localhost:5173
- 后端 API：http://localhost:4000/api

---

## 🏗️ 项目架构

### 目录结构
```
vue-learning-app/
├── src/                          # Vue 3 前端应用
│   ├── pages/                    # 页面组件（13个标签页）
│   │   ├── HomePage.vue          # 首页
│   │   ├── ItsmPage.vue          # ITSM 系统（主体）
│   │   ├── GitBranchManager.vue  # Git 分支管理
│   │   ├── LogCenter.vue         # 日志中心
│   │   ├── WikiCenter.vue        # Wiki 文档管理
│   │   ├── VideoManager.vue      # 视频管理
│   │   ├── MusicManager.vue      # 音乐管理
│   │   ├── AlbumManager.vue      # 相册管理
│   │   ├── ScheduledTaskManager  # 定时任务
│   │   ├── WeiboCrawler.vue      # 微博爬虫
│   │   ├── ChatHistory.vue       # 聊天历史
│   │   ├── SpringReference.vue   # Spring 文档
│   │   └── ExcelReference.vue    # Excel 函数库
│   ├── components/               # 可复用组件
│   │   ├── itsm/                 # ITSM 特定组件
│   │   │   ├── IncidentSection   # 事件管理
│   │   │   ├── ServiceRequestSection  # 服务请求
│   │   │   ├── KnowledgeBaseSection   # 知识库
│   │   │   ├── ItsmDashboard    # 仪表板
│   │   │   └── ... (8 更多组件)
│   │   ├── Header.vue            # 导航头
│   │   ├── ChatCard.vue          # 聊天卡片
│   │   └── FunctionCard.vue      # 功能卡片
│   ├── utils/
│   │   └── api.js                # API 客户端
│   ├── App.vue                   # 根组件
│   ├── main.js                   # 入口文件
│   └── style.css                 # 全局样式
├── server/                       # Express 后端
│   ├── index.js                  # 服务器入口
│   ├── db.js                     # MySQL 连接池
│   ├── init-db.js                # 数据库初始化脚本
│   ├── routes/                   # API 路由（19 个模块）
│   ├── data/                     # 持久化数据
│   └── package.json
├── package.json                  # 前端依赖配置
└── vite.config.js                # Vite 构建配置
```

### 分层架构

```
┌─────────────────────────────────────────┐
│         🎨 Vue 3 前端                    │
│  ┌──────────────────────────────────┐  │
│  │ Page Components (页面/功能)       │  │
│  │ - ItsmPage, GitBranchManager...   │  │
│  └──────────────────────────────────┘  │
│              ↓                          │
│  ┌──────────────────────────────────┐  │
│  │ Component Components (可复用)      │  │
│  │ - IncidentSection, ServiceForm... │  │
│  └──────────────────────────────────┘  │
│              ↓                          │
│  ┌──────────────────────────────────┐  │
│  │ API Client (src/utils/api.js)    │  │
│  │ - Organized by domain            │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
              HTTP/JSON
         (Fetch API, RESTful)
              ↓
┌─────────────────────────────────────────┐
│       🔧 Express 后端                    │
│  ┌──────────────────────────────────┐  │
│  │ Route Handlers (routes/*.js)     │  │
│  │ - 19 个 API 端点模块             │  │
│  └──────────────────────────────────┘  │
│              ↓                          │
│  ┌──────────────────────────────────┐  │
│  │ Middleware                       │  │
│  │ - camelCaseResponse, CORS...     │  │
│  └──────────────────────────────────┘  │
│              ↓                          │
│  ┌──────────────────────────────────┐  │
│  │ Database Layer (db.js)           │  │
│  │ - MySQL Connection Pool          │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│       💾 MySQL 数据库                    │
│  - 15+ 张表，完整关系型设计             │
└─────────────────────────────────────────┘
```

---

## 💡 核心概念

### 1. 单页应用（SPA）设计

这是一个 **Tab-Based SPA**（基于标签的单页应用）：

```javascript
// App.vue 中的标签定义
const tabs = [
  { name: 'Home', component: HomePage },
  { name: 'ITSM', component: ItsmPage },      // 主业务系统
  { name: 'Git', component: GitBranchManager },
  // ... 更多标签
]

// 当前标签页存储在响应式状态
const currentTab = ref('Home')
```

**优势**：
- 无刷新切换页面
- 组件缓存提升性能（KeepAlive）
- 共享全局状态（主题、用户信息）

### 2. 响应式状态管理

使用 Vue 3 的 `ref` 和 `reactive`：

```javascript
// App.vue - 全局主题状态
const currentTheme = ref('blue')
const appearance = reactive({
  fontScale: 100,
  useCustomColors: false,
  primaryColor: '#3b82f6'
})

// 子组件访问
<div :style="{ color: appearance.primaryColor }">
  {{ message }}
</div>
```

**数据流**：
```
用户改变主题 → currentTheme.value = 'green'
  ↓
Vue 检测到变化（响应式）
  ↓
CSS 变量更新
  ↓
所有子组件自动重新渲染
```

### 3. 组件通信模式

**Props Down（属性向下传递）**：
```javascript
// 父组件 (ItsmPage.vue)
<IncidentSection
  :tickets="tickets"
  :currentUser="currentUser"
/>

// 子组件 (IncidentSection.vue)
const props = defineProps({
  tickets: Array,
  currentUser: Object
})
```

**Events Up（事件向上触发）**：
```javascript
// 子组件触发事件
const emit = defineEmits(['create-ticket', 'delete-ticket'])

function handleCreate(ticketData) {
  emit('create-ticket', ticketData)
}

// 父组件监听事件
<IncidentSection
  @create-ticket="createTicket"
  @delete-ticket="deleteTicket"
/>
```

### 4. API 调用流程

**API 客户端组织** (src/utils/api.js)：

```javascript
// 按域组织 API 调用
export const api = {
  // 用户管理
  users: {
    getAll: () => apiRequest('/users'),
    getCurrent: () => apiRequest('/users/current'),
  },

  // 事件管理
  tickets: {
    getAll: () => apiRequest('/tickets'),
    create: (ticket) => apiRequest('/tickets', {
      method: 'POST',
      body: JSON.stringify(ticket)
    }),
    update: (id, data) => apiRequest(`/tickets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  },

  // ... 更多 API
}
```

**在组件中使用**：

```javascript
// IncidentSection.vue
import { api } from '../../utils/api'

export default {
  async mounted() {
    // 获取数据
    this.tickets = await api.tickets.getAll()
  },

  methods: {
    async createTicket(formData) {
      const newTicket = await api.tickets.create(formData)
      this.tickets.push(newTicket)
    }
  }
}
```

### 5. 数据库关系设计

**ITSM 核心表关系**：

```
users (用户)
  ├── 1 : N → tickets (通过 assignee_id)
  ├── 1 : N → tickets (通过 reporter_id)
  ├── 1 : N → ticket_comments
  ├── 1 : N → service_requests
  └── 1 : N → service_requests (approver)

tickets (事件)
  ├── 1 : N → ticket_comments
  ├── Many : 1 → users (assignee)
  └── Many : 1 → users (reporter)

service_catalog (服务目录)
  └── 1 : N → service_requests

service_requests (服务请求)
  ├── 1 : N → request_comments
  ├── Many : 1 → service_catalog
  └── Many : 1 → users (approver)
```

### 6. 工作流状态机

**事件工作流**：
```
┌─────┐
│ NEW │ (新建)
└──┬──┘
   │ (分配给处理人)
   ↓
┌─────────────┐
│ IN_PROGRESS │ (进行中)
└──┬──────────┘
   │ (解决)
   ↓
┌──────────┐
│ RESOLVED │ (已解决)
└──┬───────┘
   │ (关闭)
   ↓
┌──────┐
│CLOSED│ (已关闭)
└──────┘
```

**服务请求工作流** (更复杂)：
```
DRAFT → SUBMITTED → APPROVED/REJECTED → IN_PROGRESS → COMPLETED
```

---

## 📱 前端开发指南

### 创建新页面组件

**步骤 1**：创建 Vue 文件 (`src/pages/MyFeature.vue`)

```vue
<template>
  <div class="my-feature">
    <h1>我的功能</h1>
    <p>{{ message }}</p>
    <button @click="doSomething">点击我</button>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { api } from '../utils/api'

export default {
  name: 'MyFeature',
  setup() {
    const message = ref('Hello, Vue!')
    const data = ref([])

    async function fetchData() {
      try {
        data.value = await api.articles.getAll()
      } catch (error) {
        console.error('加载失败:', error)
      }
    }

    function doSomething() {
      message.value = '已点击！'
    }

    onMounted(() => {
      fetchData()
    })

    return {
      message,
      data,
      doSomething
    }
  }
}
</script>

<style scoped>
.my-feature {
  padding: 20px;
}
</style>
```

**步骤 2**：在 `App.vue` 中添加标签

```javascript
// App.vue
const tabs = [
  // ... 现有标签
  {
    id: 'my-feature',
    label: '我的功能',
    icon: '✨',
    component: () => import('./pages/MyFeature.vue')
  }
]
```

### 创建可复用组件

**步骤 1**：创建组件 (`src/components/MyCard.vue`)

```vue
<template>
  <div class="my-card">
    <div class="header">
      <h2>{{ title }}</h2>
      <button @click="$emit('close')">×</button>
    </div>
    <div class="content">
      <slot></slot>
    </div>
    <div class="footer">
      <button @click="$emit('action')">{{ actionLabel }}</button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'MyCard',
  props: {
    title: {
      type: String,
      required: true
    },
    actionLabel: {
      type: String,
      default: '确定'
    }
  },
  emits: ['close', 'action']
}
</script>

<style scoped>
.my-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.footer {
  margin-top: 16px;
  text-align: right;
}
</style>
```

**步骤 2**：在页面中使用

```vue
<template>
  <MyCard
    title="我的卡片"
    actionLabel="保存"
    @close="handleClose"
    @action="handleAction"
  >
    <p>卡片内容</p>
  </MyCard>
</template>

<script>
import MyCard from '../components/MyCard.vue'

export default {
  components: { MyCard },
  methods: {
    handleClose() { console.log('关闭') },
    handleAction() { console.log('点击动作') }
  }
}
</script>
```

### 列表和表单操作

**列表展示和删除**：

```vue
<template>
  <div>
    <button @click="addItem">新增</button>

    <table>
      <tr v-for="item in items" :key="item.id">
        <td>{{ item.name }}</td>
        <td>{{ item.status }}</td>
        <td>
          <button @click="editItem(item)">编辑</button>
          <button @click="deleteItem(item.id)">删除</button>
        </td>
      </tr>
    </table>

    <!-- 编辑表单 -->
    <div v-if="editingItem" class="form">
      <input v-model="editingItem.name" placeholder="名称">
      <select v-model="editingItem.status">
        <option>new</option>
        <option>in_progress</option>
        <option>done</option>
      </select>
      <button @click="saveItem">保存</button>
      <button @click="editingItem = null">取消</button>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'
import { api } from '../utils/api'

export default {
  setup() {
    const items = ref([])
    const editingItem = ref(null)

    async function loadItems() {
      items.value = await api.tickets.getAll()
    }

    function addItem() {
      editingItem.value = { name: '', status: 'new' }
    }

    function editItem(item) {
      editingItem.value = { ...item }
    }

    async function saveItem() {
      if (editingItem.value.id) {
        // 更新
        await api.tickets.update(editingItem.value.id, editingItem.value)
      } else {
        // 新建
        const newItem = await api.tickets.create(editingItem.value)
        items.value.push(newItem)
      }
      editingItem.value = null
      await loadItems()
    }

    async function deleteItem(id) {
      await api.tickets.delete(id)
      items.value = items.value.filter(item => item.id !== id)
    }

    return {
      items,
      editingItem,
      addItem,
      editItem,
      saveItem,
      deleteItem,
      loadItems
    }
  },
  mounted() {
    this.loadItems()
  }
}
</script>
```

### 主题定制

**使用全局主题**：

```vue
<template>
  <div :class="`bg-${currentTheme}`">
    <p :style="{ color: appearance.textColor }">
      {{ message }}
    </p>
  </div>
</template>

<script>
import { getCurrentInstance } from 'vue'

export default {
  setup() {
    // 获取根组件的全局状态
    const root = getCurrentInstance().appContext.config.globalProperties

    return {
      currentTheme: root.currentTheme,
      appearance: root.appearance
    }
  }
}
</script>

<style scoped>
.bg-blue { background: #e3f2fd; }
.bg-green { background: #e8f5e9; }
.bg-purple { background: #f3e5f5; }
</style>
```

---

## 🔧 后端开发指南

### 添加新的 API 路由

**步骤 1**：创建路由文件 (`server/routes/myfeature.js`)

```javascript
import express from 'express'
import pool from '../db.js'

const router = express.Router()

// GET /api/myfeature - 获取列表
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM my_table ORDER BY created_at DESC'
    )
    res.json(rows)
  } catch (error) {
    console.error('获取列表失败:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /api/myfeature/:id - 获取详情
router.get('/:id', async (req, res) => {
  const { id } = req.params
  try {
    const [rows] = await pool.query(
      'SELECT * FROM my_table WHERE id = ?',
      [id]
    )
    if (rows.length === 0) {
      return res.status(404).json({ error: '未找到' })
    }
    res.json(rows[0])
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// POST /api/myfeature - 创建
router.post('/', async (req, res) => {
  const { name, description } = req.body

  if (!name) {
    return res.status(400).json({ error: '名称必填' })
  }

  try {
    const result = await pool.query(
      'INSERT INTO my_table (name, description, created_at) VALUES (?, ?, NOW())',
      [name, description]
    )

    const [newRow] = await pool.query(
      'SELECT * FROM my_table WHERE id = ?',
      [result[0].insertId]
    )

    res.status(201).json(newRow[0])
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// PUT /api/myfeature/:id - 更新
router.put('/:id', async (req, res) => {
  const { id } = req.params
  const { name, description } = req.body

  try {
    await pool.query(
      'UPDATE my_table SET name = ?, description = ?, updated_at = NOW() WHERE id = ?',
      [name, description, id]
    )

    const [rows] = await pool.query(
      'SELECT * FROM my_table WHERE id = ?',
      [id]
    )
    res.json(rows[0])
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// DELETE /api/myfeature/:id - 删除
router.delete('/:id', async (req, res) => {
  const { id } = req.params

  try {
    await pool.query('DELETE FROM my_table WHERE id = ?', [id])
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
```

**步骤 2**：在 `server/index.js` 中注册路由

```javascript
import myfeatureRouter from './routes/myfeature.js'

// ... 其他路由
app.use('/api/myfeature', myfeatureRouter)
```

### 数据库操作

**创建数据库表** (`server/init-db.js`)

```javascript
export async function initDatabase() {
  const queries = [
    // ... 其他表

    // 新增表定义
    `CREATE TABLE IF NOT EXISTS my_table (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      status ENUM('new', 'active', 'inactive') DEFAULT 'new',
      user_id INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      INDEX idx_status (status),
      INDEX idx_created (created_at)
    )`
  ]

  // 执行所有查询
  for (const query of queries) {
    await pool.query(query)
  }
}
```

**常见数据库查询**：

```javascript
// 1. 简单查询
const [rows] = await pool.query('SELECT * FROM table')

// 2. 带条件查询
const [rows] = await pool.query(
  'SELECT * FROM table WHERE status = ? AND user_id = ?',
  ['active', 123]
)

// 3. JOIN 查询
const [rows] = await pool.query(`
  SELECT t.*, u.name as user_name
  FROM tickets t
  LEFT JOIN users u ON t.assignee_id = u.id
  WHERE t.status = ?
`, ['open'])

// 4. 分组和聚合
const [stats] = await pool.query(`
  SELECT status, COUNT(*) as count
  FROM tickets
  GROUP BY status
`)

// 5. 事务（多步骤操作）
const connection = await pool.getConnection()
try {
  await connection.beginTransaction()

  await connection.query('INSERT INTO table1 ...')
  await connection.query('UPDATE table2 ...')

  await connection.commit()
} catch (error) {
  await connection.rollback()
  throw error
} finally {
  connection.release()
}
```

### 错误处理

**标准错误响应**：

```javascript
// 验证错误
if (!name || name.trim() === '') {
  return res.status(400).json({
    error: 'name 不能为空',
    field: 'name'
  })
}

// 权限错误
if (user.role !== 'admin') {
  return res.status(403).json({
    error: '权限不足'
  })
}

// 未找到
if (rows.length === 0) {
  return res.status(404).json({
    error: '资源不存在'
  })
}

// 数据库错误
try {
  // ... database operation
} catch (error) {
  console.error('Database error:', error)
  res.status(500).json({
    error: '服务器错误',
    message: process.env.NODE_ENV === 'development' ? error.message : undefined
  })
}
```

---

## 🎯 常见场景解析

### 场景 1：创建事件（Ticket）工作流

**前端流程**：

1. 用户导航到 ITSM → 事件 → 点击"新建事件"
2. IncidentSection 组件显示 TicketForm 表单
3. 用户填写：标题、描述、分类、优先级
4. 点击"提交" → 触发 `@create-ticket` 事件
5. 父组件 ItsmPage 捕获事件 → 调用 `createTicket()`
6. `createTicket()` 调用 `api.tickets.create(formData)`

**后端流程**：

1. 前端发送 `POST /api/tickets` 请求
2. `server/routes/tickets.js` 中的 POST 处理器接收
3. 验证必填字段（title, description）
4. 生成唯一的 ticket_no（使用 counters 表）
5. 插入 tickets 表：
   ```sql
   INSERT INTO tickets (
     ticket_no, title, description,
     category, priority, status, reporter_id, created_at
   ) VALUES (?, ?, ?, ?, ?, 'new', ?, NOW())
   ```
6. 返回新建的 ticket 对象（包含 ID 和 ticket_no）

**数据库状态**：

```
tickets 表新增一行：
id: 15
ticket_no: TK000042
title: 用户无法登录
status: new
priority: high
created_at: 2026-02-24 10:30:00
```

**完整代码示例**：

```vue
<!-- IncidentSection.vue -->
<template>
  <div class="incident-section">
    <button @click="showForm = true">新建事件</button>

    <div v-if="showForm" class="modal">
      <TicketForm
        @submit="handleCreateTicket"
        @cancel="showForm = false"
      />
    </div>

    <table>
      <tr v-for="ticket in tickets" :key="ticket.id">
        <td>{{ ticket.ticketNo }}</td>
        <td>{{ ticket.title }}</td>
        <td>{{ ticket.status }}</td>
        <td>
          <button @click="editTicket(ticket)">编辑</button>
          <button @click="deleteTicket(ticket.id)">删除</button>
        </td>
      </tr>
    </table>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { api } from '../../utils/api'
import TicketForm from './TicketForm.vue'

export default {
  components: { TicketForm },
  props: {
    currentUserId: Number
  },
  setup(props) {
    const tickets = ref([])
    const showForm = ref(false)

    async function loadTickets() {
      tickets.value = await api.tickets.getAll()
    }

    async function handleCreateTicket(formData) {
      const newTicket = await api.tickets.create({
        ...formData,
        reporterId: props.currentUserId
      })
      tickets.value.unshift(newTicket)
      showForm.value = false
    }

    async function deleteTicket(id) {
      await api.tickets.delete(id)
      tickets.value = tickets.value.filter(t => t.id !== id)
    }

    onMounted(loadTickets)

    return { tickets, showForm, handleCreateTicket, deleteTicket }
  }
}
</script>
```

### 场景 2：服务请求自动路由

**流程描述**：

1. 用户选择"硬件申请"服务
2. 系统查询 service_catalog 表
3. 找到对应的 form_schema（动态表单定义）
4. 用户填写表单：设备类型、数量、用途
5. 提交 → 系统自动从 service_catalog 读取配置
6. 自动分配审批人（default_approver_role='approver'）
7. 创建 service_request 记录
8. 系统发送审批通知

**关键 SQL**：

```sql
-- 查询服务目录配置
SELECT form_schema, default_priority, requires_approval,
       default_approver_role
FROM service_catalog
WHERE service_type = 'hardware'

-- 查询审批人
SELECT id, name, email
FROM users
WHERE role = 'approver'
LIMIT 1

-- 创建服务请求
INSERT INTO service_requests (
  request_no, service_type, title, form_data,
  priority, status, approver_id, created_at
) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
```

### 场景 3：Git 提交日志显示

**前端**：

```vue
<template>
  <div class="git-logs">
    <div v-for="commit in commits" :key="commit.hash" class="commit">
      <div class="header">
        <span class="hash">{{ commit.hash.slice(0, 7) }}</span>
        <span class="author">{{ commit.author }}</span>
        <span class="date">{{ formatDate(commit.date) }}</span>
      </div>
      <div class="message">{{ commit.subject }}</div>
      <div class="files">
        <span v-for="file in commit.files" :key="file.path">
          <span class="status">{{ file.status }}</span>
          {{ file.path }}
        </span>
      </div>
    </div>
  </div>
</template>

<script>
import { api } from '../utils/api'

export default {
  data() {
    return { commits: [] }
  },
  async mounted() {
    this.commits = await api.git.getHistory({ ref: 'HEAD', limit: 50 })
  }
}
</script>
```

**后端** (`server/routes/git.js`)：

```javascript
// GET /api/git/history
router.get('/history', async (req, res) => {
  const ref = req.query.ref || 'HEAD'
  const limit = parseInt(req.query.limit) || 50

  try {
    const logResult = await runGitCommand([
      'log',
      ref,
      `-${limit}`,
      '--pretty=format:%H%x1f%h%x1f%an%x1f%aI%x1f%s',
      '--name-status'
    ])

    // 解析 git log 输出并返回结构化数据
    const commits = parseGitLog(logResult.stdout)
    res.json(commits)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})
```

---

## 📋 最佳实践

### 前端最佳实践

#### 1. 组件设计原则

```vue
<!-- ❌ 不好：紧耦合的组件 -->
<template>
  <div>
    <!-- 直接写逻辑在组件中 -->
    <input v-model="name">
    <button @click="saveName">保存</button>
    {{ message }}
  </div>
</template>

<!-- ✅ 好：关注分离的组件 -->
<template>
  <div>
    <NameInput
      :value="name"
      @input="name = $event"
    />
    <SaveButton
      :loading="loading"
      @click="save"
    />
    <Message :text="message" />
  </div>
</template>
```

#### 2. 错误处理

```javascript
// ❌ 不好：忽略错误
async function fetchData() {
  const data = await api.get('/endpoint')
  return data
}

// ✅ 好：捕获和处理错误
async function fetchData() {
  try {
    const data = await api.get('/endpoint')
    return data
  } catch (error) {
    console.error('获取数据失败:', error)
    this.showErrorMessage('加载失败，请重试')
    throw error
  }
}
```

#### 3. 异步操作管理

```javascript
// ❌ 不好：没有加载状态
async function createItem(data) {
  await api.items.create(data)
  this.items = await api.items.getAll()
}

// ✅ 好：显示加载状态
async function createItem(data) {
  this.loading = true
  try {
    await api.items.create(data)
    this.items = await api.items.getAll()
  } catch (error) {
    this.error = error.message
  } finally {
    this.loading = false
  }
}
```

### 后端最佳实践

#### 1. 输入验证

```javascript
// ❌ 不好：没有验证
router.post('/', async (req, res) => {
  const item = await pool.query('INSERT ...')
  res.json(item)
})

// ✅ 好：完整验证
router.post('/', async (req, res) => {
  const { name, email } = req.body

  // 验证必填字段
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'name 必填' })
  }

  // 验证格式
  if (!email.includes('@')) {
    return res.status(400).json({ error: 'email 格式不正确' })
  }

  try {
    const result = await pool.query(
      'INSERT INTO items (name, email) VALUES (?, ?)',
      [name, email]
    )
    res.json({ id: result[0].insertId })
  } catch (error) {
    res.status(500).json({ error: '创建失败' })
  }
})
```

#### 2. 数据库查询优化

```javascript
// ❌ 不好：N+1 查询问题
const tickets = await pool.query('SELECT * FROM tickets')
for (const ticket of tickets) {
  ticket.assignee = await pool.query(
    'SELECT * FROM users WHERE id = ?',
    [ticket.assignee_id]
  )
}

// ✅ 好：使用 JOIN
const tickets = await pool.query(`
  SELECT t.*, u.name as assignee_name, u.email as assignee_email
  FROM tickets t
  LEFT JOIN users u ON t.assignee_id = u.id
  ORDER BY t.created_at DESC
`)
```

#### 3. 事务管理

```javascript
// ✅ 好：确保数据一致性
async function transferOwnership(ticketId, newOwnerId) {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()

    // 更新 ticket 所有者
    await connection.query(
      'UPDATE tickets SET assignee_id = ? WHERE id = ?',
      [newOwnerId, ticketId]
    )

    // 记录变更历史
    await connection.query(
      'INSERT INTO audit_log (ticket_id, action) VALUES (?, ?)',
      [ticketId, 'ownership_changed']
    )

    await connection.commit()
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}
```

### 安全最佳实践

#### 1. SQL 注入防护

```javascript
// ❌ 不好：字符串拼接
const query = `SELECT * FROM users WHERE id = ${userId}`

// ✅ 好：使用参数化查询
const [rows] = await pool.query(
  'SELECT * FROM users WHERE id = ?',
  [userId]
)
```

#### 2. 权限验证

```javascript
// ❅ 不好：没有权限检查
router.delete('/tickets/:id', async (req, res) => {
  await pool.query('DELETE FROM tickets WHERE id = ?', [req.params.id])
  res.json({ success: true })
})

// ✅ 好：验证权限
router.delete('/tickets/:id', async (req, res) => {
  const ticketId = req.params.id
  const userId = req.session.userId

  // 检查用户是否是该 ticket 的创建者或管理员
  const [rows] = await pool.query(
    'SELECT * FROM tickets WHERE id = ? AND (reporter_id = ? OR ? IN (SELECT id FROM users WHERE role = "admin"))',
    [ticketId, userId, userId]
  )

  if (rows.length === 0) {
    return res.status(403).json({ error: '无权删除' })
  }

  await pool.query('DELETE FROM tickets WHERE id = ?', [ticketId])
  res.json({ success: true })
})
```

---

## 📚 进阶话题

### 性能优化

**前端**：
- 使用 KeepAlive 缓存组件
- 虚拟滚动处理大列表
- 代码分割和异步组件加载
- 防抖和节流事件处理

**后端**：
- 数据库连接池（已使用）
- 查询优化（添加索引）
- 缓存热数据（Redis）
- 异步处理耗时操作

### 测试

```javascript
// 前端单元测试示例
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TicketForm from './TicketForm.vue'

describe('TicketForm', () => {
  it('验证必填字段', async () => {
    const wrapper = mount(TicketForm)
    await wrapper.find('button').trigger('click')
    expect(wrapper.vm.errors).toContain('title 必填')
  })
})
```

### 部署

```bash
# 构建
npm run build

# 产生 dist/ 文件夹
# 后端启动：npm run server:prod
# 前端部署到 Nginx/CDN
```

---

## 🤔 常见问题

**Q1: 如何添加新的用户角色？**

A: 修改 `server/init-db.js` 中的 users 表，更新 role ENUM，然后在相应的权限检查逻辑中处理新角色。

**Q2: 如何实现实时通知？**

A: 可以使用 WebSocket（socket.io）或 Server-Sent Events（SSE）。在当前架构中添加 `npm install socket.io`，然后在服务器上广播事件。

**Q3: 如何处理大文件上传？**

A: 使用分片上传 + 断点续传。前端分割文件，后端合并。参考 VideoManager 的实现。

**Q4: 数据库备份策略？**

A: 定期使用 `mysqldump` 备份，或使用云数据库的自动备份功能。

---

## 📖 相关资源

- [Vue 3 官方文档](https://vuejs.org/)
- [Express 官方文档](https://expressjs.com/)
- [MySQL 官方文档](https://dev.mysql.com/doc/)
- [MDN Web Docs](https://developer.mozilla.org/)

---

**祝你学习愉快！有任何问题欢迎提出。** 🚀
