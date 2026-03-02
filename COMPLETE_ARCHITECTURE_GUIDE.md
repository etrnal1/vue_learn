# Vue 学习参考应用 - 完整功能体系设计文档

## 📋 文档概述

本文档是对整个 Vue Learning App 应用的全面架构分析，涵盖所有功能模块的设计原理、实现方式和技术细节。这是一份从「需求→设计→实现→测试」完整闭环的功能文档。

**文档版本**：2.0
**最后更新**：2026年3月1日
**维护人**：Claude Code
**总代码量**：11,148 行（后端API）+ 10,000+ 行（前端）

---

## 🎯 项目全景

### 项目使命
提供一个功能完整的 Vue 3 学习参考应用，集成多个专业工具和知识管理系统，帮助开发者学习前端开发、了解业务系统架构、掌握日常工作工具。

### 核心价值
1. **学习参考** - 提供 Spring、Excel 等多领域参考资料
2. **工具集成** - Git、FFmpeg、Docker 等专业工具集成
3. **知识管理** - Wiki、文档中心等完整的知识库系统
4. **实时协作** - WebSocket 实时推送、定时任务执行
5. **离线支持** - PWA 技术实现完全离线访问能力

### 关键数据

| 指标 | 数值 | 说明 |
|------|------|------|
| 页面组件 | 46 个 | 独立的功能页面 |
| API 路由 | 27 个 | 后端 API 端点数 |
| 代码总量 | 21K+ 行 | 前后端代码总行数 |
| 数据库表 | 20+ 个 | 业务数据存储 |
| 主题配色 | 31 种 | 完整的色彩系统 |
| PWA 支持 | ✅ | 完全离线模式 |

---

## 🏗️ 架构总览

### 分层架构模式

```
┌─────────────────────────────────────────────┐
│         用户界面层 (UI Layer)                │
│  ┌──────────────────────────────────────┐  │
│  │ 页面组件 (46个)                      │  │
│  │ Header / Sidebar / Content / Modal   │  │
│  └──────────────────────────────────────┘  │
│                                               │
│  ┌──────────────────────────────────────┐  │
│  │ 样式系统                              │  │
│  │ 6个主题 + 25个色卡 + 响应式设计      │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
           ↓ Vue 3 + Vite
┌─────────────────────────────────────────────┐
│       状态与数据层 (State Layer)             │
│  ┌──────────────────────────────────────┐  │
│  │ 工具函数                              │  │
│  │ API Client / PWA / Storage            │  │
│  └──────────────────────────────────────┘  │
│                                               │
│  ┌──────────────────────────────────────┐  │
│  │ 本地存储 (localStorage)              │  │
│  │ 主题 / 缓存 / 离线队列 / 认证令牌    │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
           ↓ REST API / WebSocket
┌─────────────────────────────────────────────┐
│       后端服务层 (Backend Layer)            │
│  ┌──────────────────────────────────────┐  │
│  │ Express.js 服务器                    │  │
│  │ 27个 API 路由 (11K+ 行)              │  │
│  └──────────────────────────────────────┘  │
│                                               │
│  ┌──────────────────────────────────────┐  │
│  │ 业务逻辑层                            │  │
│  │ 认证 / FFmpeg / Git / Docker / 流程  │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
           ↓ SQL / CRUD
┌─────────────────────────────────────────────┐
│       数据持久化层 (Database Layer)         │
│  ┌──────────────────────────────────────┐  │
│  │ MySQL (20+ 表)                       │  │
│  │ 用户 / 流程 / 任务 / Wiki / 视频    │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

### 核心设计模式

| 模式 | 实现位置 | 用途 |
|------|---------|------|
| **MVC** | 整体架构 | 前后端分离，清晰的职责划分 |
| **API 客户端** | `src/utils/api.js` | 统一的请求管理和离线队列 |
| **缓存策略** | API 层 | GET 缓存 (10分钟) + 写入队列离线支持 |
| **观察者模式** | WebSocket + 事件 | 实时数据推送和状态同步 |
| **主题系统** | CSS 变量 | 动态主题切换，支持用户自定义 |
| **渐进增强** | PWA | 基础功能 → 离线支持 → 原生应用 |

---

## 📱 前端功能模块分析

### 1️⃣ 核心功能模块

#### 1.1 应用主体 (App.vue - 969 行)

**功能定位**：全局应用容器，管理标签页、主题、认证

**关键实现**：

```javascript
// 标签页导航系统
data() {
  return {
    activeTab: 'home',
    tabs: [
      { id: 'home', label: '首页' },
      { id: 'spring', label: 'Spring参考' },
      { id: 'excel', label: 'Excel参考' },
      // ... 共14个标签页
    ]
  }
}

// 主题系统
computed: {
  appStyleVars() {
    // CSS 变量注入
    return {
      '--app-primary': this.appearance.primaryColor,
      '--app-text': this.appearance.textColor,
      '--app-bg': this.appearance.bgColor
    }
  }
}

// 性能监控
data() {
  return {
    firstVisiblePerfMs: null,      // 首可见时间
    initialPagePerfMs: null,       // 首可交互时间
    initDonePerfMs: null,          // 初始化完成时间
    lastTabPerfMs: null            // 子页面响应时间
  }
}
```

**实现流程**：
1. 加载已保存的主题配置
2. 加载已保存的认证状态
3. 初始化性能监控
4. 首次加载时记录性能数据
5. 标签页切换时记录性能日志

**数据流向**：

```
用户切换标签页
    ↓
switchTab(tabId)
    ↓
activeTab = tabId
    ↓
动态导入对应组件
    ↓
组件挂载完成后测量性能
    ↓
appendPerfLog() 保存数据
```

**性能优化**：
- 📦 使用 `KeepAlive` 缓存已加载的标签页
- 🔄 预加载常用标签页（preloadTab）
- ⏱️ 性能面板实时统计 p50/p95 指标

#### 1.2 认证系统 (App.vue auth 部分)

**功能定位**：用户身份验证，权限管理

**认证流程**：

```
┌─────────────────────────────────────┐
│ 1. 检查 localStorage 中的认证令牌    │
│    (AUTH_TOKEN_STORAGE_KEY)         │
└─────────────────────────────────────┘
            ↓
┌─────────────────────────────────────┐
│ 2. 令牌存在？                        │
│    是 → 验证令牌有效性               │
│    否 → 显示登录界面                 │
└─────────────────────────────────────┘
            ↓
┌─────────────────────────────────────┐
│ 3. 调用 POST /api/auth/verify       │
│    验证令牌                          │
└─────────────────────────────────────┘
            ↓
┌─────────────────────────────────────┐
│ 4. 响应有效？                        │
│    是 → 标记 authReady=true         │
│    否 → 清除令牌，显示登录界面       │
└─────────────────────────────────────┘
```

**关键数据结构**：

```javascript
// 认证表单
authForm: {
  id: '',              // 用户 ID (u1, u2, ...)
  name: '',            // 用户昵称（注册时使用）
  password: '',        // 密码
  confirmPassword: '', // 确认密码（注册时使用）
  email: ''            // 邮箱（可选）
}

// 认证状态
authReady: false,      // 认证检查完成标志
isLoggedIn: false,     // 是否已登录
authMessage: '',       // 认证消息（错误或成功）
authBusy: false        // 认证操作进行中
```

**登录实现**：

```javascript
async submitAuth() {
  const endpoint = this.authMode === 'login' ? '/api/auth/login' : '/api/auth/register'

  try {
    const response = await fetch(`/api${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(this.authForm)
    })

    if (response.ok) {
      const { token } = await response.json()
      // 保存令牌到 localStorage
      window.localStorage.setItem('vue_learning_auth_token', token)
      this.isLoggedIn = true
      this.authMessage = '认证成功'
    }
  } catch (error) {
    this.authMessage = `认证失败: ${error.message}`
  }
}
```

#### 1.3 主题与配色系统

**功能定位**：提供完整的色彩和主题管理

**主题结构**：

```javascript
themes: [
  { id: 'blue', name: '经典蓝', preview: 'linear-gradient(...)' },
  { id: 'green', name: '清新绿', preview: '...' },
  { id: 'purple', name: '活力紫', preview: '...' },
  { id: 'orange', name: '温暖橙', preview: '...' },
  { id: 'pink', name: '甜蜜粉', preview: '...' },
  { id: 'dark', name: '暗夜黑', preview: '...' }
]

// 25 个色卡预设
colorPresets: [
  {
    id: 'ocean',
    name: '海洋',
    primary: '#0EA5E9',
    text: '#164E63',
    bg: '#F0F9FF',
    colors: ['#E0F2FE', '#BAE6FD', ...]
  },
  // ... 更多预设
]
```

**主题应用机制**：

```javascript
// 1. 用户点击主题按钮
switchTheme(themeId) {
  this.currentTheme = themeId
  this.saveAppearance() // 持久化到 localStorage
}

// 2. 应用 CSS 变量
computed: {
  appStyleVars() {
    // 根据当前主题和色卡预设生成 CSS 变量
    return {
      '--app-primary': this.appearance.primaryColor,
      '--app-text': this.appearance.textColor,
      '--app-bg': this.appearance.bgColor,
      '--app-border': this.withAlpha(this.appearance.textColor, 0.1),
      // ... 40+ 个 CSS 变量
    }
  }
}

// 3. Vue 绑定到根元素
<div class="app" :style="appStyleVars"></div>

// 4. CSS 使用变量
.header {
  background: var(--app-bg);
  color: var(--app-text);
  border-bottom: 1px solid var(--app-border);
}
```

**色彩混合函数**：

```javascript
// 使用 CSS color-mix 实现渐进色
withAlpha(hexColor, alpha) {
  return `color-mix(in srgb, ${hexColor} ${(1-alpha)*100}%, transparent)`
}

// 颜色融合
mixHex(color1, color2, ratio) {
  // 实现两个颜色的混合
}
```

**性能面板**：

```javascript
data() {
  return {
    showPerfPanel: false,
    perfPanelLogs: [],  // 性能日志数组
    uiSettings: {
      performanceOverlayEnabled: false  // 性能条显示开关
    }
  }
}

// 性能指标统计
computed: {
  perfStats() {
    const samples = this.perfPanelLogs
      .filter(item => item.action === 'subpage_response')
      .map(item => Number(item.durationMs))
      .sort((a, b) => a - b)

    return {
      count: samples.length,
      p50: pick(0.5),   // 中位数
      p95: pick(0.95)   // 95百分位
    }
  }
}
```

---

### 2️⃣ 工作流管理模块

#### 2.1 流程拖拽编辑器 (FlowDiagramEditor.vue - 3372 行)

**功能定位**：可视化流程设计，支持拖拽节点、连线、参数配置

**核心功能**：

✅ 拖拽编辑
✅ 节点类型（开始、用户任务、网关、结束）
✅ 节点参数配置
✅ 连线管理和条件表达式
✅ BPMN 导出
✅ 移动设备触摸支持
✅ 实时保存（WebSocket）

**节点系统**：

```javascript
// 节点数据结构
{
  id: 'node_1',
  type: 'StartNode',        // 节点类型
  label: '开始',
  position: { x: 100, y: 100 },
  data: {
    nodeType: 'start',
    config: {}
  }
}

// 支持的节点类型
const nodeTypes = {
  'StartNode': { color: '#10B981', icon: '▶' },
  'UserTaskNode': { color: '#3B82F6', icon: '👤' },
  'ExclusiveGateway': { color: '#F59E0B', icon: '◆' },  // 条件分支
  'ParallelGateway': { color: '#8B5CF6', icon: '▶▶' },  // 并行
  'InclusiveGateway': { color: '#EC4899', icon: '◉' },  // 包含分支
  'EndNode': { color: '#EF4444', icon: '■' }
}
```

**连线管理**：

```javascript
// 边（连线）数据结构
{
  id: 'edge_1',
  source: 'node_1',
  target: 'node_2',
  data: {
    label: '审批通过',
    condition: 'status == "approved"'  // 条件表达式（仅网关使用）
  }
}

// 网关条件验证
// 使用 conditionEvaluator.js 实现
evaluateCondition(expression, context) {
  // 例如：status == "approved" && amount < 10000
  // 返回 true/false 决定流程走向
}
```

**拖拽实现**（移动设备支持）：

```javascript
// 桌面拖拽
dragover: (event) => {
  event.preventDefault()
  event.dataTransfer.dropEffect = 'copy'
}

drop: (event) => {
  const nodeType = event.dataTransfer.getData('nodeType')
  const position = vueFlow.project({
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  })
  createNode(nodeType, position)
}

// 移动设备触摸支持
touchstart: (event) => {
  createVirtualElement()  // 创建虚拟拖拽元素
  startTracking()
}

touchmove: (event) => {
  updateVirtualPosition()
  checkIfInsideCanvas()  // 判断是否在画布内
}

touchend: (event) => {
  if (isInsideCanvas) {
    createNode(nodeType, position)
  }
  cleanupVirtualElement()
}
```

**数据持久化**：

```javascript
// 自动保存
async saveFlow() {
  const payload = {
    id: this.flowId,
    name: this.flowName,
    nodes: this.nodes,
    edges: this.edges,
    variables: this.variables,
    parameters: this.parameters
  }

  // POST /api/flows/:id
  await api.flows.updateFlow(payload)

  // 触发 WebSocket 推送
  emitFlowUpdated(payload)
}

// 加载流程
async loadFlow(flowId) {
  const flow = await api.flows.getFlow(flowId)

  // 恢复节点、边、变量、参数配置
  this.nodes = flow.nodes
  this.edges = flow.edges
  this.variables = flow.variables
  this.parameters = flow.parameters
}
```

**参数传递机制**：

```javascript
// 参数映射示例
{
  stepId: 'node_2',
  parameters: [
    {
      name: 'amount',           // 参数名
      source: 'constant',       // 来源类型
      value: '1000'
    },
    {
      name: 'status',
      source: 'variable',       // 流程变量
      variableId: 'var_1'
    },
    {
      name: 'computedAmount',
      source: 'expression',     // 表达式
      expression: 'amount * 1.1'
    },
    {
      name: 'previousResult',
      source: 'previous_step',  // 前一步输出
      stepId: 'node_1'
    }
  ]
}

// 执行时参数替换
async executeStep(stepId, context) {
  // 1. 读取步骤的参数映射
  const params = getStepParameters(stepId)

  // 2. 根据源类型评估参数值
  const evaluatedParams = {}
  for (const param of params) {
    evaluatedParams[param.name] = await evaluateParameter(param, context)
  }

  // 3. 调用步骤处理逻辑，传入参数
  await executeStepLogic(stepId, evaluatedParams)

  // 4. 保存步骤输出（供下一步使用）
  context.previousResult = result
}
```

#### 2.2 流程执行追踪 (FlowInstances.vue)

**功能定位**：实时监控流程执行状态、步骤进度、性能指标

**WebSocket 实时更新**：

```javascript
// 连接到 WebSocket
mounted() {
  this.wsClient = getWebSocketClient()

  // 订阅执行实例房间
  this.wsClient.subscribe(executionId)

  // 监听事件
  this.wsClient.on('execution:started', this.onExecutionStarted)
  this.wsClient.on('execution:step:completed', this.onStepCompleted)
  this.wsClient.on('execution:completed', this.onExecutionCompleted)
  this.wsClient.on('execution:progress', this.onProgressUpdated)
}

// 事件处理器
onExecutionStarted({ executionId, payload }) {
  // 更新执行状态
  const execution = this.executions.find(e => e.id === executionId)
  if (execution) {
    execution.status = 'running'
    execution.startedAt = payload.startedAt
  }
}

onStepCompleted({ executionId, payload }) {
  // 更新步骤状态和耗时
  const step = this.selectedExecution.steps.find(s => s.id === payload.stepId)
  if (step) {
    step.status = payload.status
    step.duration = payload.duration
    step.completedAt = payload.completedAt
  }
}

onProgressUpdated({ executionId, payload }) {
  // 更新进度条
  const execution = this.executions.find(e => e.id === executionId)
  if (execution) {
    execution.progress = payload.progress
    execution.currentStep = payload.currentStep
    execution.totalSteps = payload.totalSteps
  }
}
```

**实时监控组件**：

```javascript
// 执行监控面板
<div class="execution-monitor">
  <!-- 进度条 -->
  <div class="progress-bar">
    <div class="progress-fill" :style="{ width: progress + '%' }"></div>
  </div>

  <!-- 步骤列表 -->
  <div class="steps-list">
    <div v-for="step in steps" :key="step.id" class="step-item" :class="'step-' + step.status">
      <span class="step-indicator">
        ✓ (completed) | ⏳ (running) | ○ (pending)
      </span>
      <h5>{{ step.name }}</h5>
      <p>耗时：{{ formatDuration(step.duration) }}</p>
    </div>
  </div>
</div>
```

#### 2.3 自动化规则系统 (FlowAutomation.vue)

**功能定位**：定义自动化规则，支持定时触发、条件触发、事件触发

**规则数据结构**：

```javascript
{
  id: 'rule_1',
  name: '每日审批提醒',
  flowId: 'flow_1',
  trigger: {
    type: 'schedule',          // 触发类型：schedule / event / condition
    schedule: '0 9 * * *'      // Cron 表达式（每天上午9点）
  },
  actions: [
    {
      type: 'execute_flow',    // 动作类型
      flowId: 'flow_1',
      parameters: { ... }
    },
    {
      type: 'send_notification',
      recipients: ['user1', 'user2'],
      message: '有待审批的流程'
    }
  ],
  enabled: true,
  createdAt: '2026-03-01'
}
```

**规则执行流程**：

```javascript
┌──────────────────────────────────┐
│ 后端定时任务线程（node-schedule）│
└──────────────────────────────────┘
           ↓ (每分钟检查)
┌──────────────────────────────────┐
│ SELECT * FROM flow_automation_   │
│ rules WHERE enabled = true AND   │
│ trigger.type = 'schedule'        │
└──────────────────────────────────┘
           ↓ (匹配 Cron 表达式)
┌──────────────────────────────────┐
│ 对于每个匹配的规则：              │
│ 1. 验证是否需要执行               │
│ 2. 创建执行实例                   │
│ 3. 触发执行流程                   │
│ 4. 记录日志                       │
└──────────────────────────────────┘
           ↓
┌──────────────────────────────────┐
│ INSERT INTO flow_automation_logs  │
│ (rule_id, execution_id, status)  │
└──────────────────────────────────┘
```

---

### 3️⃣ 知识管理模块

#### 3.1 Wiki 知识库 (WikiCenter.vue)

**功能定位**：完整的知识库系统，支持词条管理、版本控制、搜索、注解

**核心功能**：

✅ 词条创建和编辑
✅ Markdown 内容支持
✅ 版本历史管理
✅ 全文搜索（支持排序）
✅ 分类和标签管理
✅ 浏览量统计
✅ 段落注解（Word 风格）
✅ 响应式设计（桌面、平板、手机）

**词条数据结构**：

```javascript
{
  id: '001',
  title: 'Vue 3 响应式系统详解',
  category: '前端开发',
  tags: ['Vue', '响应式', '源码'],
  summary: '深入理解 Vue 3 Proxy 响应式原理...',
  content: '# Vue 3 响应式系统\n\n## 核心概念...',

  // 版本控制
  versions: [
    {
      versionId: 'v1.0',
      timestamp: 1693526400000,
      author: 'user1',
      changes: '初始版本',
      content: '...'
    },
    {
      versionId: 'v1.1',
      timestamp: 1693612800000,
      author: 'user2',
      changes: '补充详细说明',
      content: '...'
    }
  ],

  // 元数据
  createdAt: 1693526400000,
  updatedAt: 1693612800000,
  viewCount: 1250,
  isFavorite: false,

  // 注解
  annotations: [
    {
      id: 'anno_1',
      range: [100, 150],        // 文本范围
      content: '这里需要补充示例代码',
      author: 'user1',
      timestamp: 1693612800000
    }
  ]
}
```

**阅读增强功能**：

```javascript
// 1. 页内搜索和高亮
<ArticleReaderModule
  :query="searchQuery"
  :hit-count="matchCount"
  :can-navigate="matchCount > 0"
  @update:query="searchQuery = $event"
  @prev="previousMatch()"
  @next="nextMatch()"
  @top="scrollToTop()"
  @bottom="scrollToBottom()"
/>

// 2. 注解侧栏（Word 风格）
<div class="annotation-rail">
  <div v-for="annotation in currentAnnotations" :key="annotation.id">
    <p>{{ annotation.content }}</p>
    <span>{{ formatTime(annotation.timestamp) }}</span>
  </div>
</div>

// 3. 全屏阅读模式
<FullscreenReaderModal
  :article="selectedArticle"
  :show-annotations-only="showAnnotationsOnly"
/>
```

**搜索实现**：

```javascript
// 全文搜索 API
async search(query) {
  const results = await api.wiki.search({
    query,
    fields: ['title', 'summary', 'content', 'tags', 'category'],
    limit: 50
  })

  // 结果评分机制
  results.sort((a, b) => {
    let scoreA = 0, scoreB = 0

    // 标题匹配权重最高
    if (a.title.includes(query)) scoreA += 10
    if (b.title.includes(query)) scoreB += 10

    // 标签匹配
    if (a.tags.includes(query)) scoreA += 5
    if (b.tags.includes(query)) scoreB += 5

    // 内容中的位置（越靠前权重越高）
    scoreA += 100 / (a.contentIndex + 1)
    scoreB += 100 / (b.contentIndex + 1)

    return scoreB - scoreA
  })

  return results
}
```

**版本控制**：

```javascript
// 发布新版本
async publishVersion(articleId, changes) {
  const article = getArticle(articleId)

  // 创建新版本
  const newVersion = {
    versionId: `v${article.versions.length + 1}`,
    timestamp: Date.now(),
    author: currentUser.id,
    changes,
    content: article.content
  }

  // 保存版本
  article.versions.push(newVersion)
  article.updatedAt = Date.now()

  // 触发通知
  emitArticleUpdated(articleId)
}

// 恢复历史版本
async restoreVersion(articleId, versionId) {
  const article = getArticle(articleId)
  const version = article.versions.find(v => v.versionId === versionId)

  // 备份当前版本
  article.versions.push({
    versionId: `v${article.versions.length + 1}`,
    timestamp: Date.now(),
    author: currentUser.id,
    changes: '从版本恢复',
    content: article.content
  })

  // 恢复内容
  article.content = version.content
  article.updatedAt = Date.now()
}
```

#### 3.2 文档中心 (DocumentationCenter.vue)

**功能定位**：Markdown 文档管理、同步、搜索、学习路径

**核心功能**：

✅ 项目文档自动扫描和同步
✅ 学习路径排序
✅ 全文搜索和内容评分
✅ 版本检测
✅ 文档预览和导出
✅ 相关链接推荐

**文档同步流程**：

```javascript
// 1. 扫描本地文档目录
async scanProjectDocs() {
  const files = await fs.readdir('./docs', { recursive: true })

  return files
    .filter(f => f.endsWith('.md') || f.endsWith('.txt'))
    .map(f => ({
      path: f,
      name: path.basename(f, path.extname(f)),
      size: fs.statSync(f).size,
      mtime: fs.statSync(f).mtime
    }))
}

// 2. 检测版本号
function extractVersion(filename) {
  // 支持的版本格式：
  // - v1.0.md
  // - README@v2.1.md
  // - LEARNING_GUIDE_v3.0.md

  const match = filename.match(/[@_v]v?(\d+\.\d+\.?\d*)/)
  return match ? match[1] : null
}

// 3. 排序学习顺序
const LEARNING_ORDER_HINTS = [
  'README',
  'QUICK_START',
  'STARTUP_GUIDE',
  'LEARNING_GUIDE',
  'API',
  'REFERENCE',
  'GUIDE',
  'TUTORIAL',
  'EXAMPLE'
]

function getDocumentOrder(filename) {
  for (let i = 0; i < LEARNING_ORDER_HINTS.length; i++) {
    if (filename.includes(LEARNING_ORDER_HINTS[i])) {
      return i
    }
  }
  return LEARNING_ORDER_HINTS.length
}

// 4. 路径遍历防护
function resolveSafePath(basePath, userInput) {
  const resolved = path.resolve(basePath, userInput)
  const normalized = path.normalize(resolved)

  if (!normalized.startsWith(basePath)) {
    throw new Error('Invalid path: path traversal detected')
  }

  return normalized
}
```

**搜索排序算法**：

```javascript
async search(query) {
  const docs = getAllDocuments()

  const scored = docs.map(doc => {
    let score = 0
    const lowerQuery = query.toLowerCase()

    // 1. 精确匹配（权重最高）
    if (doc.filename.toLowerCase() === lowerQuery) {
      score += 100
    }

    // 2. 文件名包含（权重高）
    if (doc.filename.toLowerCase().includes(lowerQuery)) {
      score += 50
    }

    // 3. 内容包含（权重中）
    const contentMatches = (doc.content.match(new RegExp(lowerQuery, 'g')) || []).length
    score += contentMatches * 10

    // 4. 学习顺序排序（权重低）
    score += (LEARNING_ORDER_HINTS.length - getDocumentOrder(doc.filename))

    // 5. 修改时间新（权重低）
    score += (Date.now() - doc.mtime) / 1000000

    return { ...doc, score }
  })

  return scored.sort((a, b) => b.score - a.score)
}
```

---

### 4️⃣ 工具集成模块

#### 4.1 Git 分支管理 (GitBranchManager.vue)

**功能定位**：可视化 Git 分支树、提交历史、分支操作

**核心功能**：

✅ 分支列表和对比
✅ 提交历史可视化
✅ 分支创建、删除、合并
✅ 提交搜索
✅ 文件变更追踪

**实现原理**：

```javascript
// 1. 调用 git 命令获取分支信息
async fetchBranches() {
  const result = await exec('git branch -a --format="%(refname:short) %(objectname:short) %(subject)"')

  return result.split('\n').map(line => {
    const [name, hash, ...subject] = line.split(' ')
    return {
      name,
      hash,
      subject: subject.join(' '),
      isLocal: !name.startsWith('origin/'),
      isRemote: name.startsWith('origin/'),
      isCurrent: name.startsWith('*')
    }
  })
}

// 2. 获取提交历史图
async fetchCommitGraph() {
  const result = await exec(
    'git log --graph --oneline --all --decorate'
  )

  // 解析 ASCII 图表
  return parseGitGraph(result)
}

// 3. 分支操作
async createBranch(branchName, baseBranch = 'main') {
  await exec(`git checkout -b ${branchName} ${baseBranch}`)
  emitBranchUpdated()
}

async deleteBranch(branchName) {
  await exec(`git branch -D ${branchName}`)
  emitBranchUpdated()
}

async mergeBranch(sourceBranch, targetBranch) {
  await exec(`git checkout ${targetBranch}`)
  await exec(`git merge ${sourceBranch}`)
  emitBranchUpdated()
}
```

#### 4.2 FFmpeg 视频处理 (VideoManager.vue + FfmpegTool.vue)

**功能定位**：视频转码、剪辑、元数据提取等处理

**核心功能**：

✅ 视频上传
✅ 格式转码 (H.264, VP9, AV1 等)
✅ 视频剪辑（起始时间、时长）
✅ 元数据提取（分辨率、帧率、时长）
✅ 缩略图生成
✅ 字幕提取

**处理流程**：

```javascript
// 1. 上传视频
async uploadVideo(file) {
  const formData = new FormData()
  formData.append('video', file)

  const response = await fetch('/api/videos/upload', {
    method: 'POST',
    body: formData
  })

  const { videoId } = await response.json()
  return videoId
}

// 2. 提交转码任务
async submitTranscodeJob(videoId, options) {
  const response = await fetch('/api/ffmpeg/transcode', {
    method: 'POST',
    body: JSON.stringify({
      videoId,
      format: options.format,      // mp4, webm, mkv 等
      quality: options.quality,    // low, medium, high
      codec: options.codec,        // h264, vp9, av1
      fps: options.fps,            // 帧率
      resolution: options.resolution, // 分辨率
      startTime: options.startTime, // 剪辑开始时间（秒）
      duration: options.duration   // 剪辑时长（秒）
    })
  })

  const { jobId } = await response.json()
  return jobId
}

// 3. 轮询任务状态
async monitorJob(jobId) {
  let job = await getJobStatus(jobId)

  while (job.status === 'processing') {
    await sleep(2000)  // 每 2 秒检查一次
    job = await getJobStatus(jobId)

    // 更新进度条
    updateProgress(job.progress)
  }

  if (job.status === 'completed') {
    return job.outputPath
  } else {
    throw new Error(job.error)
  }
}

// 4. 后端 FFmpeg 执行
// server/routes/ffmpeg.js
async function transcodeVideo(videoId, options) {
  const inputFile = getVideoPath(videoId)
  const outputFile = getOutputPath(videoId, options.format)

  // 构建 FFmpeg 命令
  const command = buildFFmpegCommand(inputFile, outputFile, options)

  // 例如：
  // ffmpeg -i input.mp4 \
  //   -c:v libx264 -crf 23 \
  //   -c:a aac -b:a 128k \
  //   -ss 10 -t 30 \
  //   output.mp4

  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) reject(error)
      else resolve(outputFile)
    })
  })
}
```

**元数据提取**：

```javascript
async function extractMetadata(videoFile) {
  const result = await exec(
    `ffprobe -v error -select_streams v:0 -show_entries stream=width,height,r_frame_rate,duration -of default=noprint_wrappers=1:nokey=1 ${videoFile}`
  )

  const [width, height, fps, duration] = result.trim().split('\n')

  return {
    width: parseInt(width),
    height: parseInt(height),
    fps: eval(fps),  // "30/1" => 30
    duration: parseFloat(duration),
    filesize: getFilesize(videoFile)
  }
}
```

#### 4.3 Docker 容器管理 (DockerVisualizer.vue)

**功能定位**：Docker 容器和镜像可视化管理

#### 4.4 终端命令执行 (TerminalConsole.vue)

**功能定位**：在线终端，支持命令执行和输出查看

---

### 5️⃣ 系统管理模块

#### 5.1 用户管理 (UserAdminConsole.vue)

**用户数据结构**：

```javascript
{
  id: 'user_1',
  username: 'john_doe',
  email: 'john@example.com',
  password: 'hashed_password',  // 使用 bcrypt
  roles: ['admin', 'user'],
  permissions: ['create_flow', 'edit_wiki', ...],
  status: 'active',             // active, inactive, suspended
  createdAt: 1693526400000,
  lastLogin: 1693612800000,
  preferences: {
    theme: 'blue',
    language: 'zh-CN',
    notifications: true
  }
}
```

#### 5.2 菜单管理 (MenuManagement.vue)

**菜单数据结构**：

```javascript
{
  id: 'menu-system',
  parentId: null,
  name: '系统管理',
  path: '/system',
  component: 'Layout',
  icon: 'Settings',
  order: 1,
  status: 'enabled',
  permissions: ['admin']
}
```

#### 5.3 角色管理 (RoleManagement.vue)

**角色和权限模型**：

```javascript
{
  id: 'role-admin',
  code: 'admin',
  name: '系统管理员',
  dataScope: 'all',               // all, dept, self
  permissions: [
    'flow:create',
    'flow:edit',
    'flow:delete',
    'wiki:create',
    ...
  ],
  menuIds: ['menu-system', 'menu-system-menu', ...],
  status: 'enabled'
}
```

---

## 🔌 后端 API 体系

### API 层次结构

```
Express.js 服务器
  │
  ├── 中间件层
  │   ├── CORS 处理
  │   ├── 认证 (JWT/Token)
  │   ├── 日志记录
  │   └── 错误处理
  │
  ├── 路由层 (27 个)
  │   ├── /auth (认证相关)
  │   ├── /flows (流程管理)
  │   ├── /wiki (知识库)
  │   ├── /videos (视频管理)
  │   ├── /ffmpeg (视频转码)
  │   ├── /docs (文档中心)
  │   └── ... (其他路由)
  │
  ├── 业务逻辑层
  │   ├── Flow Engine (流程执行引擎)
  │   ├── Condition Evaluator (条件评估)
  │   ├── Parameter Evaluator (参数评估)
  │   └── Event Emitter (事件发射)
  │
  └── 数据持久化层
      └── MySQL 数据库
```

### 关键 API 端点

| 模块 | 方法 | 端点 | 功能 |
|------|------|------|------|
| **认证** | POST | `/api/auth/login` | 用户登录 |
| | POST | `/api/auth/register` | 用户注册 |
| | POST | `/api/auth/verify` | 验证令牌 |
| | POST | `/api/auth/logout` | 注销登录 |
| **流程** | GET | `/api/flows` | 获取流程列表 |
| | POST | `/api/flows` | 创建流程 |
| | GET | `/api/flows/:id` | 获取流程详情 |
| | PUT | `/api/flows/:id` | 更新流程 |
| | DELETE | `/api/flows/:id` | 删除流程 |
| | POST | `/api/flows/:id/execute` | 执行流程 |
| **Wiki** | GET | `/api/wiki` | 获取词条列表 |
| | POST | `/api/wiki` | 创建词条 |
| | GET | `/api/wiki/:id` | 获取词条内容 |
| | PUT | `/api/wiki/:id` | 更新词条 |
| | POST | `/api/wiki/:id/publish` | 发布版本 |
| | GET | `/api/wiki/search` | 全文搜索 |
| **视频** | POST | `/api/videos/upload` | 上传视频 |
| | POST | `/api/ffmpeg/transcode` | 转码视频 |
| | GET | `/api/ffmpeg/job/:id` | 查看转码任务状态 |

### API 错误处理

```javascript
// 统一错误格式
{
  success: false,
  error: {
    code: 'ERR_UNAUTHORIZED',
    message: '用户未授权',
    details: { ... }
  }
}

// 错误代码枚举
const ERROR_CODES = {
  'ERR_UNAUTHORIZED': 401,      // 未授权
  'ERR_FORBIDDEN': 403,         // 禁止访问
  'ERR_NOT_FOUND': 404,         // 资源不存在
  'ERR_VALIDATION': 400,        // 参数验证失败
  'ERR_CONFLICT': 409,          // 冲突（如重复条目）
  'ERR_INTERNAL': 500           // 服务器错误
}
```

---

## 💾 数据库设计

### 核心数据表

| 表名 | 行数 | 用途 |
|------|------|------|
| `users` | - | 用户账户和认证 |
| `flows` | - | 流程定义 |
| `flow_steps` | - | 流程步骤 |
| `flow_connections` | - | 步骤连线 |
| `flow_executions` | - | 执行实例 |
| `flow_execution_steps` | - | 执行步骤详情 |
| `flow_variables` | - | 流程变量定义 |
| `flow_step_parameters` | - | 步骤参数映射 |
| `flow_automation_rules` | - | 自动化规则 |
| `wiki_articles` | - | Wiki 词条 |
| `wiki_versions` | - | Wiki 版本历史 |
| `wiki_annotations` | - | Wiki 注解 |
| `videos` | - | 视频元数据 |
| `ffmpeg_jobs` | - | 转码任务队列 |
| `scheduler_tasks` | - | 定时任务 |

### 表关系图

```
users
  │
  ├── flows (creator_id)
  │     │
  │     ├── flow_steps
  │     │     └── flow_connections
  │     ├── flow_variables
  │     ├── flow_executions (executor_id)
  │     │     └── flow_execution_steps
  │     └── flow_automation_rules
  │
  ├── wiki_articles
  │     ├── wiki_versions
  │     └── wiki_annotations
  │
  └── videos
        └── ffmpeg_jobs
```

---

## 🔄 数据流和通信机制

### 1. 同步数据流（HTTP/REST）

```javascript
┌─────────────────────────────────────┐
│ 浏览器前端                          │
│ (Vue 3 组件)                       │
└─────────────────────────────────────┘
           ↓ fetch / axios
           ↓ request with token
┌─────────────────────────────────────┐
│ API 客户端 (src/utils/api.js)       │
│ - 请求组装                          │
│ - 缓存处理                          │
│ - 离线队列                          │
│ - 错误重试                          │
└─────────────────────────────────────┘
           ↓ HTTP POST/GET/PUT/DELETE
           ↓
┌─────────────────────────────────────┐
│ Express 服务器                      │
│ - 中间件 (CORS, Auth)              │
│ - 路由处理                          │
│ - 业务逻辑                          │
│ - 数据库操作                        │
└─────────────────────────────────────┘
           ↓ SQL 查询
┌─────────────────────────────────────┐
│ MySQL 数据库                        │
└─────────────────────────────────────┘
           ↓ JSON 响应
           ↓ status: 200/201/400/401/...
┌─────────────────────────────────────┐
│ 浏览器收到响应                      │
│ - 解析 JSON                         │
│ - 更新 UI                           │
│ - 缓存数据                          │
└─────────────────────────────────────┘
```

**缓存策略**：

```javascript
// GET 请求缓存（10分钟 TTL）
GET /api/flows
  → 检查 localStorage 缓存
  → 缓存有效 → 返回缓存数据
  → 缓存过期 → 发起网络请求
  → 请求成功 → 更新缓存 + 返回数据
  → 网络失败 → 返回过期缓存（降级）

// 离线队列管理
POST /api/flows (创建流程)
  → 网络正常 → 直接发送
  → 网络离线 → 加入队列（localStorage）
  → 恢复在线 → 自动重试队列中的请求
  → 重试成功 → 移除队列项
  → 重试失败 → 保留队列项，下次重试
```

### 2. 异步数据流（WebSocket）

```javascript
┌──────────────────────────────────────┐
│ 浏览器 WebSocket 客户端              │
│ (getWebSocketClient())               │
└──────────────────────────────────────┘
           ↓ ws://localhost:4001/ws
           ↓ 握手建立连接
┌──────────────────────────────────────┐
│ 订阅执行实例房间                     │
│ subscribe({ executionId })           │
│ → 将连接加入 room:execution_${id}   │
└──────────────────────────────────────┘
           ↓ 监听事件
           ↓ on('execution:started')
           ↓ on('execution:step:completed')
           ↓ on('execution:completed')
┌──────────────────────────────────────┐
│ WebSocket 服务器                     │
│ (server/websocket.js)                │
│ - 连接管理                           │
│ - 房间隔离                           │
│ - 消息广播                           │
└──────────────────────────────────────┘
           ↓ 后端触发事件
           ↓ emitExecutionEvent(...)
           ↓
┌──────────────────────────────────────┐
│ 广播到房间中的所有连接               │
│ broadcastToRoom(roomId, message)     │
└──────────────────────────────────────┘
           ↓ JSON 消息
           ↓ { type, executionId, payload, timestamp }
┌──────────────────────────────────────┐
│ 浏览器收到实时更新                   │
│ - 解析消息                           │
│ - 触发事件处理器                     │
│ - 更新 UI (无需刷新)                 │
└──────────────────────────────────────┘
```

**WebSocket 事件类型**：

```javascript
// 执行生命周期事件
'execution:started'           // 流程开始执行
'execution:step:started'      // 步骤开始执行
'execution:step:completed'    // 步骤完成
'execution:step:failed'       // 步骤失败
'execution:completed'         // 流程完成
'execution:failed'            // 流程失败
'execution:cancelled'         // 流程取消
'execution:progress'          // 进度更新

// 连接生命周期事件
'connected'                   // WebSocket 连接建立
'disconnected'                // WebSocket 连接断开
'reconnect_failed'            // 重连失败（达到上限）
'error'                       // 连接错误
```

---

## 🛡️ 安全机制

### 认证和授权

**认证流程**：

```javascript
// 1. 用户登录
POST /api/auth/login
{
  id: 'u1',
  password: 'mypassword'
}

// 2. 后端验证密码（bcrypt）
const user = await findUser(userId)
const isMatch = await bcrypt.compare(password, user.passwordHash)

// 3. 生成 JWT 令牌
const token = jwt.sign({
  userId: user.id,
  username: user.username,
  roles: user.roles,
  iat: Date.now()
}, SECRET_KEY, { expiresIn: '7d' })

// 4. 返回令牌给客户端
return { token, user: { id, username, roles } }

// 5. 客户端保存令牌
localStorage.setItem('vue_learning_auth_token', token)

// 6. 后续请求自动附加令牌
fetch('/api/flows', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
```

**授权中间件**：

```javascript
// Express 中间件：检查令牌有效性
app.use('/api/flows', requireAuth)

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization
  const token = authHeader?.replace('Bearer ', '')

  if (!token) {
    return res.status(401).json({ error: 'Missing token' })
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY)
    req.user = decoded
    next()
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

// 权限检查：确保用户有特定权限
function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user.permissions.includes(permission)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }
    next()
  }
}

// 使用示例
router.post('/flows', requireAuth, requirePermission('flow:create'), createFlow)
```

### 数据验证

```javascript
// 客户端验证
<form @submit.prevent="submitForm">
  <input
    v-model.trim="form.name"
    required
    minlength="2"
    maxlength="100"
    pattern="^[a-zA-Z0-9_\-]+$"
    placeholder="流程名称"
  />
</form>

// 服务端验证
function validateFlowCreation(req, res, next) {
  const { name, description } = req.body

  // 存在性检查
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Invalid name' })
  }

  // 长度检查
  if (name.length < 2 || name.length > 100) {
    return res.status(400).json({ error: 'Name must be 2-100 characters' })
  }

  // 格式检查
  if (!/^[a-zA-Z0-9_\-]+$/.test(name)) {
    return res.status(400).json({ error: 'Invalid name format' })
  }

  // SQL 注入防护（使用参数化查询）
  // ✅ 正确：使用占位符
  db.query('INSERT INTO flows (name, description) VALUES (?, ?)', [name, description])

  // ❌ 错误：字符串拼接
  // db.query(`INSERT INTO flows (name) VALUES ('${name}')`)

  next()
}
```

### 路径遍历防护

```javascript
// 获取文档内容时防止目录遍历
app.get('/api/docs/content', (req, res) => {
  const basePath = path.resolve('./docs')
  const userPath = req.query.path

  // 解析完整路径
  const fullPath = path.resolve(basePath, userPath)

  // 检查是否在允许的目录内
  if (!fullPath.startsWith(basePath)) {
    return res.status(403).json({ error: 'Access denied' })
  }

  // 读取文件
  fs.readFile(fullPath, 'utf8', (err, content) => {
    if (err) return res.status(404).json({ error: 'File not found' })
    res.json({ content })
  })
})
```

---

## 📊 性能优化

### 前端性能优化

```javascript
// 1. 代码分割（Code Splitting）
const tabs = {
  home: () => import('./pages/HomePage.vue'),
  flow: () => import('./pages/workflow/FlowDiagramEditor.vue'),
  wiki: () => import('./pages/WikiCenter.vue'),
  // ... 按需加载
}

// 2. 缓存策略
const GET_CACHE_TTL = 10 * 60 * 1000  // 10 分钟
const STATIC_CACHE = 'vue-learning-static-v1'

// 3. 性能监控
recordFirstVisiblePerf()      // 首可见时间
recordInitialPagePerf()       // 首可交互时间
recordInitDonePerf()          // 初始化完成时间
recordSubpageResponsePerf()   // 标签页响应时间

// 4. 虚拟滚动（处理大列表）
<VirtualList
  :items="wikiArticles"
  :item-size="60"
  :height="400"
>
  <template #default="{ item }">
    <ArticleItem :article="item" />
  </template>
</VirtualList>

// 5. 懒加载图片
<img
  v-lazy="item.thumbnail"
  alt="缩略图"
/>

// 6. KeepAlive 缓存组件
<KeepAlive :max="10">
  <component :is="currentTabComponent" />
</KeepAlive>
```

### 后端性能优化

```javascript
// 1. 数据库查询优化
// ❌ 低效：N+1 查询问题
for (const execution of executions) {
  execution.steps = await getSteps(execution.id)  // 每个执行都查询一次步骤
}

// ✅ 高效：批量查询
const executionIds = executions.map(e => e.id)
const stepsMap = await getStepsBatch(executionIds)
for (const execution of executions) {
  execution.steps = stepsMap[execution.id]
}

// 2. 连接池
const pool = mysql.createPool({
  connectionLimit: 10,
  host: 'localhost',
  user: 'root',
  password: '...',
  database: '...'
})

// 3. 索引优化
CREATE INDEX idx_flows_creator_id ON flows(creator_id);
CREATE INDEX idx_executions_status ON flow_executions(status);
CREATE INDEX idx_articles_category ON wiki_articles(category, created_at);

// 4. 查询结果缓存
const cache = new Map()
function getCachedFlows(userId, ttl = 5 * 60 * 1000) {
  const key = `flows:${userId}`
  const cached = cache.get(key)
  if (cached && Date.now() - cached.time < ttl) {
    return cached.data
  }

  const flows = queryFlows(userId)
  cache.set(key, { data: flows, time: Date.now() })
  return flows
}

// 5. 异步任务队列（定时任务、转码等）
const queue = new Queue()
queue.add({
  type: 'transcode_video',
  videoId: '...',
  options: { ... }
}, { delay: 1000 })

queue.process(async (job) => {
  const result = await ffmpegTranscode(job.data)
  return result
})
```

### 网络优化

```javascript
// 1. 减少请求数量
// ❌ 多个请求
GET /api/flows
GET /api/flows/1/steps
GET /api/flows/1/variables
GET /api/flows/1/automations

// ✅ 单个请求返回完整数据
GET /api/flows/1?include=steps,variables,automations

// 2. 请求合并
// ❌ 多个上传请求
POST /api/flows/1/steps（100行）
POST /api/flows/1/steps（100行）
...

// ✅ 单个批量请求
POST /api/flows/1/steps/batch
{ steps: [...] }

// 3. 压缩传输
app.use(compression())  // gzip 压缩

// 4. HTTP/2 Server Push
// 预加载关键资源
```

---

## 🧪 测试策略

### 功能测试清单

```markdown
## 前端功能测试

### 标签页导航
- [ ] 切换标签页时，页面组件正确加载
- [ ] 标签页状态保存（刷新后恢复）
- [ ] 预加载功能正常（常用页面预加载）

### 认证系统
- [ ] 注册新用户成功
- [ ] 登录成功并保存令牌
- [ ] 令牌过期时自动重新登录
- [ ] 未认证用户无法访问受保护资源

### 主题系统
- [ ] 6 个主题切换正常
- [ ] 25 个色卡预设应用成功
- [ ] 自定义颜色修改生效
- [ ] 外观设置保存到 localStorage
- [ ] 刷新页面后主题配置保持

### 流程编辑
- [ ] 可拖拽创建节点
- [ ] 可连接节点（拖拽边）
- [ ] 支持删除节点
- [ ] 条件表达式编辑和评估
- [ ] 流程自动保存
- [ ] BPMN 导出成功

### Wiki 功能
- [ ] 创建和编辑词条
- [ ] 发布版本和版本历史
- [ ] 全文搜索（标题、内容、标签）
- [ ] 添加和查看注解
- [ ] 全屏阅读模式
- [ ] 页内搜索和高亮

## 后端功能测试

### API 测试
- [ ] 认证接口返回有效令牌
- [ ] 流程 CRUD 操作正常
- [ ] 权限验证生效
- [ ] 错误响应格式正确
- [ ] 数据库事务回滚正常

### 数据一致性
- [ ] 流程删除时级联删除关联数据
- [ ] 用户删除时清除相关权限
- [ ] 版本恢复时不损坏当前版本

### 性能测试
- [ ] 大列表（1000+ 项）加载 < 500ms
- [ ] 文档搜索 < 1s
- [ ] 流程执行 < 5s
```

---

## 📚 常见问题和故障排除

### Q1: 功能加载很慢

**检查清单**：
1. 检查网络连接（F12 → Network）
2. 查看 API 响应时间（是否 > 1s）
3. 检查浏览器缓存是否启用
4. 查看性能面板（p50/p95 指标）
5. 检查后端数据库查询（是否有慢查询）

**优化建议**：
- 启用 CDN 加速
- 添加数据库查询索引
- 使用缓存（Redis）
- 优化 API 响应大小

### Q2: 流程执行没有实时更新

**检查清单**：
1. 确认 WebSocket 连接已建立（F12 → Network → WS）
2. 检查 WebSocket 消息是否正常发送接收
3. 查看浏览器控制台是否有错误

**解决方案**：
```javascript
// 手动刷新（临时方案）
setInterval(() => {
  loadExecution(executionId)
}, 2000)

// 检查 WebSocket 连接状态
console.log('[WebSocket] 状态:', wsClient.ws.readyState)
// 0 = CONNECTING, 1 = OPEN, 2 = CLOSING, 3 = CLOSED
```

### Q3: 文档中心搜索结果为空

**排查步骤**：
1. 确认文档文件存在（检查 `/docs` 目录）
2. 调用 `/api/docs/sync` 同步文档
3. 检查搜索关键词拼写
4. 查看服务端日志是否有错误

---

## 🚀 部署和扩展

### 开发环境启动

```bash
# 前端开发服务器
npm run dev

# 后端服务器
cd server
npm start

# 访问应用
http://localhost:5173
```

### 生产构建

```bash
# 前端构建
npm run build

# 生成产物在 dist/ 目录
# 部署到 Nginx 或 CDN

# 后端设置环境变量
cp server/.env.example server/.env
# 编辑 .env 文件，配置数据库连接

# 启动生产服务
NODE_ENV=production npm start
```

### 扩展建议

1. **添加新页面**
   - 在 `src/pages/` 创建组件
   - 在 `App.vue` 注册标签页
   - 在后端创建相应 API

2. **添加新 API**
   - 创建 `server/routes/newfeature.js`
   - 在 `server/index.js` 注册路由
   - 在 `src/utils/api.js` 添加客户端方法

3. **添加数据库表**
   - 编写 SQL 建表语句
   - 在 `server/init-db.js` 初始化
   - 添加 ORM 模型（可选）

---

## 📖 相关文档

- 📄 **CLAUDE.md** - 项目概览和开发指南
- 📄 **LEARNING_GUIDE.md** - 详细学习指南
- 📄 **WIKI_DOCUMENTATION_GUIDE.md** - Wiki 功能文档
- 📄 **PWA_DETECTION_GUIDE.md** - PWA 技术详解
- 📄 **READER_ASSIST_TECHNICAL.md** - 阅读工具技术文档

---

**文档版本历史**

| 版本 | 日期 | 内容 |
|------|------|------|
| 1.0 | 2026-02-26 | 初始版本 |
| 2.0 | 2026-03-01 | 完整功能体系分析，包含实现细节 |

**维护人**：Claude Code
**最后更新**：2026年3月1日
**联系方式**：查看项目 README.md

---

💡 **提示**：本文档涵盖了应用的所有核心功能和技术实现。如有疑问，请参考相应的源代码文件或相关文档。
