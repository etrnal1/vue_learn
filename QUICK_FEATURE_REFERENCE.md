# Vue 学习参考应用 - 功能速查表

> 快速查看每个功能的核心概念、实现方式和关键代码

---

## 🎯 核心功能速查表

### 1. 标签页导航系统

**核心概念**：动态切换应用功能模块，支持预加载和性能监控

| 方面 | 详情 |
|------|------|
| **实现方式** | 动态组件 + KeepAlive 缓存 |
| **切换触发** | 点击标签页按钮 → 更新 activeTab 状态 |
| **性能监控** | 记录首可见、首可交互、初始化完成、响应时间 |
| **代码位置** | `src/App.vue` (第 200-400 行) |
| **关键方法** | `switchTab()`, `preloadTab()`, `recordPerfData()` |

**实现示例**：
```javascript
// 切换标签页
switchTab(tabId) {
  this.activeTab = tabId
  this.recordSubpageResponsePerf()
}

// 预加载标签页
preloadTab(tabId) {
  this.tabLoaders[tabId]?.()
}

// 性能记录
recordSubpageResponsePerf() {
  const duration = performance.now() - this.tabStartTime
  appendPerfLog({
    action: 'subpage_response',
    name: this.activeTab,
    durationMs: duration
  })
}
```

---

### 2. 认证和授权系统

**核心概念**：JWT 令牌管理，用户身份验证，权限控制

| 方面 | 详情 |
|------|------|
| **认证方式** | JWT (JSON Web Token) |
| **令牌存储** | `localStorage['vue_learning_auth_token']` |
| **令牌过期** | 7 天 |
| **请求附加** | 自动在 `Authorization: Bearer <token>` 头 |
| **验证位置** | Express 中间件 `requireAuth()` |
| **权限检查** | 后端路由级别检查 |

**认证流程**：
```javascript
// 登录：生成令牌
POST /api/auth/login { id, password }
  ↓
验证密码 (bcrypt) → 生成 JWT → 返回令牌
  ↓
客户端保存: localStorage.setItem('...token', token)

// 请求：自动附加令牌
GET /api/flows
  ↓
请求头: { Authorization: 'Bearer <token>' }
  ↓
后端验证令牌有效性 → 继续或拒绝
```

**权限模型**：
```javascript
// 用户角色和权限
user: {
  id: 'u1',
  roles: ['admin'],           // 角色列表
  permissions: [
    'flow:create',
    'flow:edit',
    'wiki:create'
  ]
}

// 路由级权限检查
app.post('/api/flows',
  requireAuth,                           // 检查登录
  requirePermission('flow:create'),      // 检查权限
  createFlow                             // 处理请求
)
```

---

### 3. 主题系统

**核心概念**：CSS 变量动态注入，支持 6 个主题 + 25 个色卡

| 方面 | 详情 |
|------|------|
| **主题数** | 6 个（蓝、绿、紫、橙、粉、暗） |
| **色卡预设** | 25 个 |
| **实现方式** | CSS 变量 + 计算型颜色混合 |
| **切换触发** | 点击主题按钮 → 更新 CSS 变量 |
| **存储方式** | `localStorage['vue_learning_appearance']` |
| **应用范围** | 全局（`:root` 元素） |

**CSS 变量列表** (40+ 个)：
```css
/* 基础色彩 */
--app-primary       /* 主色 */
--app-text          /* 文字色 */
--app-bg            /* 背景色 */
--app-border        /* 边框色 */

/* 衍生色 */
--app-card          /* 卡片背景 */
--app-card-border   /* 卡片边框 */
--app-hover         /* 悬停效果 */
--app-active        /* 激活效果 */

/* 状态色 */
--app-success       /* 成功（绿色） */
--app-warning       /* 警告（黄色） */
--app-error         /* 错误（红色） */
--app-info          /* 信息（蓝色） */
```

**实现示例**：
```javascript
// 1. 定义主题
switchTheme(themeId) {
  this.currentTheme = themeId
  this.saveAppearance()
}

// 2. 生成 CSS 变量
computed: {
  appStyleVars() {
    return {
      '--app-primary': this.appearance.primaryColor,
      '--app-text': this.appearance.textColor,
      '--app-bg': this.appearance.bgColor,
      // ... 40+ 个变量
    }
  }
}

// 3. 绑定到根元素
<div class="app" :style="appStyleVars">
  <header><!-- 所有子元素自动使用 CSS 变量 --></header>
</div>

// 4. CSS 使用变量
header {
  background: var(--app-bg);
  color: var(--app-text);
  border-bottom: 1px solid var(--app-border);
}
```

---

### 4. 流程拖拽编辑器

**核心概念**：可视化流程设计，支持拖拽节点、连线、参数配置

| 方面 | 详情 |
|------|------|
| **节点类型** | 6 种（开始、用户任务、3种网关、结束） |
| **编辑方式** | 拖拽、连接、参数配置 |
| **保存方式** | 自动保存（WebSocket 推送） |
| **导出格式** | BPMN 2.0 XML |
| **移动支持** | iOS/Android 触摸拖拽 |
| **代码行数** | 3372 行 |

**节点类型**：
```javascript
{
  'StartNode': { color: '#10B981', icon: '▶' },           // 开始
  'UserTaskNode': { color: '#3B82F6', icon: '👤' },       // 用户任务
  'ExclusiveGateway': { color: '#F59E0B', icon: '◆' },    // 条件分支（一条路径）
  'ParallelGateway': { color: '#8B5CF6', icon: '▶▶' },    // 并行分支（所有路径）
  'InclusiveGateway': { color: '#EC4899', icon: '◉' },    // 包含分支（满足条件的路径）
  'EndNode': { color: '#EF4444', icon: '■' }              // 结束
}
```

**参数传递**：
```javascript
// 4 种参数来源
{
  name: 'amount',
  source: 'constant',      // 常量
  value: '1000'
},
{
  source: 'variable',      // 流程变量
  variableId: 'var_1'
},
{
  source: 'expression',    // 表达式
  expression: 'amount * 1.1'
},
{
  source: 'previous_step', // 前一步输出
  stepId: 'node_1'
}
```

**拖拽实现**：
```javascript
// 桌面版：Drag & Drop API
dragover: (event) => {
  event.preventDefault()
  event.dataTransfer.dropEffect = 'copy'
}

drop: (event) => {
  const nodeType = event.dataTransfer.getData('nodeType')
  const position = vueFlow.project({ x: event.clientX, y: event.clientY })
  createNode(nodeType, position)
}

// 移动版：Touch Events
touchstart: (event) => createVirtualElement()
touchmove: (event) => {
  updateVirtualPosition()
  checkIfInsideCanvas()
}
touchend: (event) => {
  if (isInsideCanvas) createNode(nodeType, position)
  cleanupVirtualElement()
}
```

---

### 5. 流程执行追踪

**核心概念**：实时监控流程执行，使用 WebSocket 推送状态更新

| 方面 | 详情 |
|------|------|
| **实时方式** | WebSocket (ws://localhost:4001/ws) |
| **房间隔离** | 每个执行实例一个房间 |
| **事件类型** | 7 种（启动、步骤开始/完成/失败、完成、失败、取消） |
| **自动重连** | 最多 10 次，间隔 3 秒 |
| **心跳检测** | 服务端 30 秒，客户端 25 秒 |
| **进度展示** | 进度条 + 步骤列表 + 耗时统计 |

**WebSocket 事件**：
```javascript
// 订阅执行实例
wsClient.subscribe(executionId)

// 监听事件
wsClient.on('execution:started', (data) => {
  // 流程启动
})

wsClient.on('execution:step:completed', (data) => {
  // 步骤完成（包含耗时）
})

wsClient.on('execution:completed', (data) => {
  // 流程完成
})

wsClient.on('execution:progress', (data) => {
  // 进度更新 (0-100%)
})
```

**连接管理**：
```javascript
// 自动重连
if (连接断开 && 重连次数 < 10) {
  等待 3 秒 → 重新连接
}

// 心跳检测
客户端: 每 25 秒发送 ping
服务端: 收到 pong 则连接活跃，否则 30 秒后断开
```

---

### 6. Wiki 知识库

**核心概念**：完整的词条管理系统，支持版本控制、全文搜索、段落注解

| 方面 | 详情 |
|------|------|
| **词条数** | 无限（建议 < 10,000） |
| **版本管理** | 自动保存所有历史版本 |
| **搜索方式** | 全文搜索（标题权重最高） |
| **注解功能** | Word 风格段落注解 |
| **阅读模式** | 全屏阅读 + 注解侧栏 |
| **存储方式** | localStorage + JSON 备份 |

**词条数据结构**：
```javascript
{
  id: '001',
  title: '词条标题',
  category: '分类',
  tags: ['标签1', '标签2'],
  summary: '内容摘要',
  content: '# Markdown\n\n完整内容...',

  // 版本管理
  versions: [
    {
      versionId: 'v1.0',
      timestamp: 1693526400000,
      author: 'user1',
      changes: '初始版本',
      content: '...'
    }
  ],

  // 注解
  annotations: [
    {
      id: 'anno_1',
      range: [100, 150],        // 文本范围
      content: '注解内容',
      author: 'user1',
      timestamp: 1693612800000
    }
  ],

  // 元数据
  createdAt: 1693526400000,
  updatedAt: 1693612800000,
  viewCount: 1250,
  isFavorite: false
}
```

**搜索评分**：
```javascript
精确匹配（标题 == 查询）      → +100 分
包含匹配（标题 contains 查询） → +50 分
内容匹配（每次出现）          → +10 分
标签匹配                      → +5 分
学习顺序权重                  → +(8-index) 分
修改时间新鲜度                → +(日期差值) 分
───────────────────────────
最终得分（按降序排序）
```

---

### 7. 文档中心

**核心概念**：自动扫描项目文档，支持版本检测、学习路径排序、全文搜索

| 方面 | 详情 |
|------|------|
| **扫描目录** | `./docs` 递归扫描 |
| **支持格式** | `.md`, `.txt`, `.pdf` |
| **版本检测** | `@v1.0`, `_v2.1` 等格式 |
| **学习排序** | README > QUICK_START > GUIDE > TUTORIAL |
| **搜索评分** | 精确 > 文件名 > 内容 > 顺序 > 时间 |
| **安全防护** | 路径遍历防护（防止 `../../../etc/passwd`） |

**学习顺序**：
```javascript
const LEARNING_ORDER_HINTS = [
  'README',           // 优先级 0
  'QUICK_START',      // 优先级 1
  'LEARNING_GUIDE',   // 优先级 2
  'API',              // 优先级 3
  'REFERENCE',        // 优先级 4
  'GUIDE',            // 优先级 5
  'TUTORIAL',         // 优先级 6
  '其他'              // 优先级 7+
]

// 排序依据：优先级最低的排在前面
```

**安全防护**：
```javascript
// ✅ 正确：防止目录遍历
app.get('/api/docs/content', (req, res) => {
  const basePath = path.resolve('./docs')
  const fullPath = path.resolve(basePath, req.query.path)

  // 检查：fullPath 必须在 basePath 内
  if (!fullPath.startsWith(basePath)) {
    return res.status(403).json({ error: 'Access denied' })
  }

  fs.readFile(fullPath, 'utf8', (err, content) => {
    // 读取文件
  })
})

// ❌ 错误：容易被攻击
fs.readFile(`.docs/${userInput}`)  // 用户输入 `../../../etc/passwd`
```

---

### 8. FFmpeg 视频处理

**核心概念**：视频转码、剪辑、元数据提取

| 方面 | 详情 |
|------|------|
| **支持格式** | MP4, WebM, MKV, AVI, MOV, FLV |
| **转码编码** | H.264, VP9, AV1 |
| **功能** | 转码、剪辑、元数据、缩略图、字幕 |
| **进度监控** | 轮询任务状态（2秒间隔） |
| **处理方式** | 异步队列（后台处理） |

**转码流程**：
```javascript
┌─────────────┐
│ 1. 上传视频  │ POST /api/videos/upload
└──────┬──────┘
       ↓
┌──────────────────────┐
│ 2. 提交转码任务      │ POST /api/ffmpeg/transcode
│    - 格式: mp4       │
│    - 编码: h264      │
│    - 质量: high      │
└──────┬───────────────┘
       ↓
┌──────────────────────┐
│ 3. 后端 FFmpeg 执行  │ ffmpeg -i input.mp4 -c:v libx264 ...
└──────┬───────────────┘
       ↓
┌──────────────────────┐
│ 4. 轮询任务状态      │ GET /api/ffmpeg/job/:id (间隔 2 秒)
└──────┬───────────────┘
       ↓
┌──────────────────────┐
│ 5. 任务完成          │ 返回输出文件路径
└──────────────────────┘
```

**FFmpeg 命令示例**：
```bash
# 基础转码
ffmpeg -i input.mp4 \
  -c:v libx264 -crf 23 \
  -c:a aac -b:a 128k \
  output.mp4

# 带剪辑
ffmpeg -i input.mp4 \
  -ss 10 -t 30 \
  -c:v libx264 -c:a aac \
  output.mp4

# 提取缩略图
ffmpeg -i input.mp4 \
  -ss 5 -vframes 1 -vf scale=320:180 \
  thumbnail.jpg

# 提取元数据
ffprobe -v error -select_streams v:0 \
  -show_entries stream=width,height,r_frame_rate \
  input.mp4
```

---

### 9. 自动化规则系统

**核心概念**：定时或触发执行流程，支持 Cron 表达式

| 方面 | 详情 |
|------|------|
| **触发类型** | 定时（Cron）、事件、条件 |
| **执行方式** | 后台定时任务线程（node-schedule） |
| **检查频率** | 每分钟检查一次 |
| **日志记录** | 每次执行都记录日志 |
| **启用控制** | 可随时启用/禁用规则 |

**Cron 表达式** (标准格式)：
```
┌───────────── 分 (0 - 59)
│ ┌───────────── 小时 (0 - 23)
│ │ ┌───────────── 日期 (1 - 31)
│ │ │ ┌───────────── 月份 (1 - 12)
│ │ │ │ ┌───────────── 周几 (0 - 7, 0 和 7 都是周日)
│ │ │ │ │
│ │ │ │ │
* * * * *

例子：
0 9 * * *   → 每天上午 9:00
0 0 * * 1   → 每周一午夜 00:00
0 */6 * * * → 每 6 小时
30 2 * * 1-5 → 周一至周五凌晨 2:30
```

---

### 10. 性能监控

**核心概念**：记录关键性能指标，提供性能面板

| 指标 | 说明 |
|------|------|
| **首可见 (FCP)** | 第一个内容开始渲染 |
| **首可交互 (FID)** | 首次与用户交互响应 |
| **初始化完成** | 应用初始化完毕 |
| **子页面响应** | 标签页切换响应时间 |
| **p50/p95** | 中位数 / 95百分位数 |

**性能面板**：
```javascript
// 显示指标
┌─────────────────────────────┐
│ 首可见：145ms               │
│ 首可交互：234ms             │
│ 初始化完成：512ms           │
│ 子页面响应：89ms 最近子页面 │
│ [性能面板] 按钮             │
└─────────────────────────────┘

// 性能面板详情
┌─────────────────────────────┐
│ 最近子页面 p50: 85ms        │
│ 最近子页面 p95: 245ms       │
│ 样本数: 28                  │
│ [刷新] [清空日志]           │
│                             │
│ 最近 10 次操作日志:         │
│ subpage_response  89ms  home│
│ subpage_response  123ms wiki│
│ ...                         │
└─────────────────────────────┘
```

---

## 🔌 API 速查

### 认证接口

```
POST   /api/auth/login          登录
POST   /api/auth/register       注册
POST   /api/auth/verify         验证令牌
POST   /api/auth/logout         登出
```

### 流程接口

```
GET    /api/flows               流程列表
POST   /api/flows               创建流程
GET    /api/flows/:id           流程详情
PUT    /api/flows/:id           更新流程
DELETE /api/flows/:id           删除流程
POST   /api/flows/:id/execute   执行流程
GET    /api/flows/:id/executions 执行历史
```

### Wiki 接口

```
GET    /api/wiki                词条列表
POST   /api/wiki                创建词条
GET    /api/wiki/:id            词条详情
PUT    /api/wiki/:id            更新词条
POST   /api/wiki/:id/publish    发布版本
GET    /api/wiki/search         全文搜索
```

### 视频接口

```
POST   /api/videos/upload       上传视频
POST   /api/ffmpeg/transcode    转码任务
GET    /api/ffmpeg/job/:id      任务状态
```

### 文档接口

```
GET    /api/docs/list           文档列表
GET    /api/docs/content        文档内容
POST   /api/docs/sync           同步文档
GET    /api/docs/search         文档搜索
```

---

## 💾 数据库表速查

| 表名 | 用途 |
|------|------|
| `users` | 用户账户 |
| `flows` | 流程定义 |
| `flow_steps` | 步骤 |
| `flow_connections` | 连线 |
| `flow_executions` | 执行实例 |
| `flow_execution_steps` | 执行步骤 |
| `flow_variables` | 流程变量 |
| `flow_step_parameters` | 步骤参数 |
| `flow_automation_rules` | 自动化规则 |
| `wiki_articles` | Wiki 词条 |
| `wiki_versions` | Wiki 版本 |
| `wiki_annotations` | Wiki 注解 |
| `videos` | 视频元数据 |
| `ffmpeg_jobs` | 转码任务 |
| `scheduler_tasks` | 定时任务 |

---

## 🛡️ 安全速查

**认证**：JWT 令牌 (7 天过期)
**授权**：基于角色和权限的访问控制
**数据验证**：客户端 + 服务端双层验证
**SQL 注入防护**：参数化查询
**路径遍历防护**：路径规范化和检查
**XSS 防护**：Vue 自动转义 + 内容安全策略

---

## ⚡ 性能优化速查

**前端**：代码分割、缓存、虚拟滚动、懒加载
**后端**：连接池、查询索引、结果缓存、N+1 防护
**网络**：请求合并、批量操作、gzip 压缩

---

**最后更新**：2026年3月1日
**维护人**：Claude Code

💡 提示：配合 COMPLETE_ARCHITECTURE_GUIDE.md 和 DOCUMENTATION_INDEX.md 使用效果最佳。
