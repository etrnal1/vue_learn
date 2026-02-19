<template>
  <div class="knowledge-articles" :class="{ 'viewing-article': selectedArticle }">
    <div class="section-header">
      <h2>📚 知识库文章</h2>
      <div class="header-actions">
        <input
          v-model="searchQuery"
          type="text"
          class="search-input"
          placeholder="搜索文章..."
        >
      </div>
    </div>

    <div class="articles-nav">
      <button
        v-for="category in categories"
        :key="category"
        @click="selectedCategory = category"
        :class="{ active: selectedCategory === category }"
        class="category-btn"
      >
        {{ category }}
      </button>
    </div>

    <div class="articles-list">
      <div
        v-for="article in filteredArticles"
        :key="article.id"
        @click="selectArticle(article)"
        class="article-item"
        :class="{ active: selectedArticle?.id === article.id }"
      >
        <div class="article-icon">{{ article.icon }}</div>
        <div class="article-title">{{ article.title }}</div>
        <div class="article-time">{{ formatDate(article.updatedAt) }}</div>
      </div>
    </div>

    <!-- 文章详情面板 -->
    <div v-if="selectedArticle" class="article-detail">
      <div class="detail-header">
        <button @click="selectedArticle = null" class="btn-back">← 返回列表</button>
        <div class="detail-title-row">
          <div>
            <h2>{{ selectedArticle.title }}</h2>
            <p class="detail-meta">
              <span>{{ selectedArticle.category }}</span>
              <span>{{ formatDate(selectedArticle.updatedAt) }}</span>
            </p>
          </div>
          <button @click="selectedArticle = null" class="btn-close">✕</button>
        </div>
      </div>

      <div class="detail-content">
        <MarkdownRenderer :content="selectedArticle.content" />
      </div>
    </div>

    <!-- 未选择文章时的提示（桌面端右侧空白区域） -->
    <div v-if="!selectedArticle" class="article-placeholder">
      <div class="placeholder-icon">📖</div>
      <p>请从左侧选择一篇文章阅读</p>
    </div>
  </div>
</template>

<script>
import MarkdownRenderer from '../../components/itsm/MarkdownRenderer.vue'

export default {
  name: 'KnowledgeArticlesSection',
  components: { MarkdownRenderer },
  data() {
    return {
      searchQuery: '',
      selectedCategory: '全部',
      selectedArticle: null,
      categories: ['全部', '系统架构', '代码编辑器', '响应式设计', '功能指南', 'API 文档'],
      articles: [
        {
          id: 1,
          icon: '🏗️',
          title: 'ITSM 系统完整架构',
          category: '系统架构',
          updatedAt: Date.now(),
          content: `# ITSM 系统完整架构

## 项目结构

\`\`\`
src/
├── pages/itsm/
│   ├── ItsmPage.vue                 ← 主容器（数据中心）
│   ├── ItsmDashboard.vue            ← 仪表板
│   ├── IncidentSection.vue          ← 事件管理（工单）
│   ├── ServiceRequestSection.vue    ← 服务请求
│   ├── KnowledgeBaseSection.vue     ← 知识库
│   ├── ProcessFlowSection.vue       ← 流程管理
│   ├── CodePlaygroundSection.vue    ← 代码编辑器
│   └── ItsmSettings.vue             ← 设置
└── components/itsm/
    ├── 状态组件（StatusBadge, PriorityBadge）
    ├── 用户组件（UserSwitcher, UserSelector）
    ├── 表单组件（TicketForm, ServiceRequestForm）
    ├── 编辑器组件（CodeEditor, CodeExecutor, ArticleEditor）
    └── 工具组件（ItsmModal, SearchFilter, StatCard）
\`\`\`

## 数据流

### ItsmPage.vue（数据中心）
\`\`\`javascript
data() {
  return {
    users: [],           // 用户列表
    tickets: [],         // 工单
    serviceRequests: [], // 服务请求
    articles: [],        // 知识库文章
    flows: [],          // 流程
    counters: {}        // 计数器
  }
}

// 通过 props 向下传递数据
// 通过 emits 处理事件
\`\`\`

### localStorage 持久化
\`\`\`javascript
const keys = [
  'itsm_users',              // 用户数据
  'itsm_current_user',       // 当前用户
  'itsm_tickets',            // 工单
  'itsm_service_requests',   // 服务请求
  'itsm_articles',           // 知识库文章
  'itsm_flows',             // 流程
  'itsm_counters'           // 计数器
]
\`\`\`

## 核心功能

### 1. 事件管理（工单）
- 创建、编辑、删除工单
- 优先级分配（低、中、高、紧急）
- 状态流转（新建 → 处理中 → 已解决 → 已关闭）
- 工单评论系统
- 文件附件上传（最大 10GB）

### 2. 服务请求
- 服务目录浏览
- 提交服务请求
- 审批工作流
- 状态跟踪

### 3. 知识库
- Markdown 编辑器
- 文章分类和标签
- 实时搜索
- 文章关联

### 4. 流程管理
- 创建自定义流程
- 定义流程步骤
- 可视化时间线展示

### 5. 代码编辑器
- 支持多种语言（Python、JavaScript、Bash、HTML、SQL）
- 实时执行和结果显示
- 代码片段保存和管理

### 6. 仪表板
- 统计概览
- 最近工单和请求
- 快速操作入口

## 响应式设计

支持三个断点：
- **手机** (&lt; 480px)：单列布局
- **平板** (480px - 1024px)：两列或三列网格
- **桌面** (&gt; 1024px)：完整多列布局

## 技术栈

- Vue 3（组合式 API 和选项式 API 混合）
- Vite（快速构建）
- CSS 3（Grid、Flexbox、媒体查询）
- localStorage（数据持久化）
- 无外部依赖的 Markdown 解析器
`
        },
        {
          id: 2,
          icon: '💻',
          title: '代码编辑器实现详解',
          category: '代码编辑器',
          updatedAt: Date.now(),
          content: `# 代码编辑器实现详解

## 三层架构

### 层级 1：CodePlaygroundSection（容器）
存储应用状态和业务逻辑

\`\`\`javascript
data() {
  return {
    currentCode: '',           // 当前编写的代码
    currentLanguage: 'python', // 选中的语言
    snippets: []              // 保存的代码片段
  }
}

methods: {
  saveSnippet() {
    // 保存代码片段到 localStorage
    const snippet = {
      name: '片段名',
      code: this.currentCode,
      language: this.currentLanguage,
      timestamp: Date.now()
    }
    localStorage.setItem('code_snippets', JSON.stringify(this.snippets))
  }
}
\`\`\`

### 层级 2：CodeEditor（编辑器）
处理用户输入

\`\`\`vue
&lt;textarea
  v-model="code"
  class="code-textarea"
  placeholder="输入代码..."
&gt;&lt;/textarea&gt;

&lt;script&gt;
computed: {
  code: {
    get() { return this.modelValue },
    set(val) { this.$emit('update:modelValue', val) }
  }
}
&lt;/script&gt;
\`\`\`

### 层级 3：CodeExecutor（执行器）
运行代码并显示结果

\`\`\`javascript
async execute() {
  // 1. 尝试调用后端 API
  const response = await fetch('/api/code/execute', {...})

  // 2. 如果失败，使用本地模拟
  if (!response.ok) {
    this.simulateExecution()
  }
}

simulateExecution() {
  if (this.language === 'python') {
    this.simulatePython()
  } else if (this.language === 'javascript') {
    this.simulateJavaScript()
  }
}

simulatePython() {
  const match = this.code.match(/print\\((.*?)\\)/)
  if (match) {
    this.stdout = match[1].replace(/["']/g, '')
  }
}
\`\`\`

## 数据流

\`\`\`
用户输入 → textarea 变化 → code computed setter → emit → 父组件更新 → 传给 CodeExecutor

用户点击运行 → execute() → simulateExecution() → 处理语言 → 显示结果
\`\`\`

## 支持的语言

| 语言 | 模拟方式 | 实际执行 |
|------|---------|---------|
| Python | 正则提取 print() | 需要后端 |
| JavaScript | Function() + console.log 劫持 | 可在浏览器执行 |
| Bash | 正则提取 echo | 需要后端 |
| HTML | 验证有效性 | 需要预览器 |
| SQL | 语法检查 | 需要数据库 |

## 代码片段保存

\`\`\`javascript
// localStorage 结构
{
  "code_snippets": [
    {
      "name": "快速排序",
      "code": "def quicksort(arr):\\n  ...",
      "language": "python",
      "timestamp": 1708100000000
    }
  ]
}
\`\`\`

## 执行流程图

\`\`\`
点击运行按钮
    ↓
记录开始时间
    ↓
尝试 fetch API
    ↓
┌─ API 成功？
│  ├─ 是 → 返回结果
│  └─ 否 → 本地模拟
│
└─ 本地模拟
   ├─ Python: 正则匹配 print()
   ├─ JavaScript: new Function() 执行
   ├─ Bash: 正则匹配 echo
   └─ 其他: 显示提示

    ↓
计算耗时
    ↓
更新 UI（stdout/stderr/info）
    ↓
用户看到结果
\`\`\`

## 性能优化

1. **使用 Function() 代替 eval**
   - 更安全（代码在全局作用域）
   - 易于检测
   - 引擎优化更好

2. **避免频繁渲染**
   - 使用 computed 缓存结果
   - 懒加载代码片段列表

3. **localStorage 限制**
   - 每个域 5-10MB
   - 大代码片段可压缩
   - 定期清理旧片段
`
        },
        {
          id: 3,
          icon: '📱',
          title: '响应式设计完全指南',
          category: '响应式设计',
          updatedAt: Date.now(),
          content: `# 响应式设计完全指南

## 三个核心断点

\`\`\`css
/* 手机 &lt; 480px */
@media (max-width: 480px) {
  grid-template-columns: 1fr;      /* 单列 */
  padding: 10px;                   /* 紧凑间距 */
  font-size: 0.75em;               /* 小字号 */
}

/* 平板 480px - 1024px */
@media (max-width: 768px) {
  grid-template-columns: repeat(2, 1fr);  /* 两列 */
  padding: 12px;
  font-size: 0.85em;
}

/* 桌面 > 1024px */
/* 无限制，完整功能 */
grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
padding: 20px;
font-size: 0.95em;
\`\`\`

## 各模块适配

### 代码编辑器
\`\`\`
桌面：左右分割 400px | 400px
平板：上下堆叠 300px + 300px
手机：全宽堆叠  250px + 200px
\`\`\`

### 工单卡片网格
\`\`\`
桌面：3-4 列自动填充
平板：2 列网格
手机：1 列单列
\`\`\`

### 按钮宽度
\`\`\`
桌面：固定宽度 120-200px
平板：自适应宽度
手机：100% 全宽
\`\`\`

## 字体大小对照

| 元素 | 手机 | 平板 | 桌面 |
|------|------|------|------|
| h1 | 1.0em | 1.2em | 1.6em |
| h2 | 0.95em | 1.05em | 1.1em |
| body | 0.8em | 0.85em | 0.95em |
| button | 0.75em | 0.85em | 0.9em |

## 间距对照

| 属性 | 手机 | 平板 | 桌面 |
|------|------|------|------|
| padding | 8-10px | 12-16px | 20-22px |
| gap | 8px | 12px | 16-20px |
| border-radius | 6px | 8px | 10-12px |

## 触屏优化

\`\`\`css
/* 最小点击区域 40x40px */
button {
  min-width: 40px;
  min-height: 40px;
  padding: 8px 12px;
}

/* 输入框避免自动缩放 */
input {
  font-size: 16px;  /* iOS 要求 */
}

/* 平滑滚动 */
.list {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
\`\`\`

## 灵活网格

\`\`\`css
/* 自动适应列数 */
grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));

/* 手动控制 */
@media (max-width: 1024px) {
  grid-template-columns: repeat(2, 1fr);
}

@media (max-width: 768px) {
  grid-template-columns: 1fr;
}
\`\`\`

## 模态框适配

\`\`\`css
/* 桌面：居中，有边距 */
.modal {
  max-width: 600px;
  width: 90%;
}

/* 平板：全宽 */
@media (max-width: 768px) {
  .modal {
    width: 95%;
  }
}

/* 手机：全屏底部弹出 */
@media (max-width: 480px) {
  .modal {
    width: 100%;
    max-height: 100vh;
    border-radius: 8px 8px 0 0;  /* 上方弧形 */
  }
}
\`\`\`

## 测试清单

**手机视图**
- [ ] 单列布局
- [ ] 按钮全宽且可点击
- [ ] 无横向滚动条
- [ ] 文本可读（≥ 14px）

**平板视图**
- [ ] 2-3 列网格
- [ ] Tab 导航合理换行
- [ ] 模态框有边距

**桌面视图**
- [ ] 完整功能显示
- [ ] 3+ 列网格
- [ ] 侧边栏布局
`
        },
        {
          id: 4,
          icon: '🎯',
          title: '功能使用指南',
          category: '功能指南',
          updatedAt: Date.now(),
          content: `# ITSM 系统功能使用指南

## 🎫 事件管理（工单）

### 创建工单
1. 点击"新建工单"按钮
2. 填写标题和描述
3. 选择分类和优先级
4. （可选）上传附件（最大 10GB）
5. （可选）指派给处理人
6. 点击"创建"

### 状态流转
\`\`\`
新建 → 处理中 → 已解决 → 已关闭
  ↑                      ↓
  └──────── 可回退 ─────┘
\`\`\`

### 添加评论
1. 打开工单详情
2. 在评论区输入内容
3. 点击"发表评论"
4. 评论会实时显示

### 上传附件
1. 在创建工单时选择"附件"
2. 拖拽文件或点击选择
3. 支持多文件上传
4. 最大单文件 10GB

## 📋 服务请求

### 提交服务请求
1. 点击"服务请求"标签
2. 选择服务类型（账号、软件、硬件等）
3. 填写标题和描述
4. 选择优先级
5. 提交或保存为草稿

### 审批流程
**管理员视角：**
1. 进入服务请求列表
2. 找到待审批的请求
3. 点击进入详情
4. 填写审批意见
5. 选择"批准"或"拒绝"

### 请求状态
\`\`\`
草稿 → 已提交 → 已审批/已拒绝 → 处理中 → 已完成
\`\`\`

## 📚 知识库

### 创建文章
1. 点击"知识库"标签
2. 点击"新建文章"
3. 输入标题和内容
4. 支持 Markdown 语法
5. 添加分类和标签
6. 点击"发布"

### Markdown 语法支持
\`\`\`markdown
# 一级标题
## 二级标题

**粗体文本**
*斜体文本*

\`代码\`
\`\`\`
代码块
\`\`\`

- 列表项 1
- 列表项 2

[链接文本](https://example.com)

> 引用文本
\`\`\`

## 🔄 流程管理

### 创建流程
1. 点击"流程管理"标签
2. 点击"新建流程"
3. 输入流程名称
4. 选择流程图标
5. 添加流程步骤
6. 可拖拽调整顺序
7. 点击"创建"

### 步骤编辑
- 点击向上/向下箭头移动顺序
- 编辑步骤标题和描述
- 点击删除按钮移除步骤

## 💻 代码编辑器

### 编写和运行代码
1. 选择编程语言
2. 在编辑区输入代码
3. 点击"运行代码"按钮
4. 在右侧查看执行结果

### 支持的语言
- **Python** 🐍：支持 print() 输出
- **JavaScript** 📜：支持 console.log()
- **Bash** 🖥️：支持 echo 输出
- **HTML** 🌐：验证 HTML 有效性
- **SQL** 💾：语法检查

### 保存代码片段
1. 点击"保存片段"按钮
2. 输入片段名称
3. 填写描述（可选）
4. 点击"保存"
5. 下次可快速加载

### 代码片段管理
- 在底部"代码片段历史"列表中查看
- 点击"加载"快速恢复代码
- 点击"复制"复制到剪贴板
- 点击"删除"移除片段

## ⚙️ 设置

### 用户管理
1. 点击"设置"标签
2. 在用户列表中管理
3. 点击"添加用户"创建新用户
4. 编辑用户信息（名称、邮箱、角色）
5. 选择用户头像

### 用户角色
- **管理员**：完全权限
- **审批人**：可审批请求
- **成员**：基本操作权限

### 数据管理
1. 点击"数据管理"卡片
2. **导出数据**：下载 JSON 备份
3. **导入数据**：恢复之前的备份
4. **清空数据**：删除所有数据（谨慎）

## 👤 用户切换

在页面顶部右侧点击当前用户，可快速切换用户身份进行测试。

## 🔍 搜索和筛选

### 搜索功能
- 支持标题、描述、标签搜索
- 搜索框会实时过滤结果

### 筛选选项
- 按状态筛选
- 按优先级筛选
- 按分类筛选
- 可组合使用

## 💾 数据持久化

所有数据自动保存到浏览器本地存储（localStorage）
- 刷新页面数据不丢失
- 定期备份很重要
- 清除浏览器数据会丢失所有数据
`
        },
        {
          id: 5,
          icon: '🔌',
          title: 'API 集成文档',
          category: 'API 文档',
          updatedAt: Date.now(),
          content: `# API 集成文档

## 概述

ITSM 系统当前使用本地 localStorage 存储数据。如果需要连接后端服务，可按照以下方式集成。

## 代码执行 API

### 端点
\`\`\`
POST /api/code/execute
\`\`\`

### 请求格式
\`\`\`json
{
  "code": "print('hello')",
  "language": "python",
  "timeout": 30000
}
\`\`\`

### 响应格式
\`\`\`json
{
  "stdout": "hello",
  "stderr": "",
  "exitCode": 0,
  "duration": 150
}
\`\`\`

### 支持的语言
- \`python\` - Python 3.x
- \`javascript\` - Node.js
- \`bash\` - Bash shell
- \`ruby\` - Ruby
- \`go\` - Go
- \`java\` - Java

### 示例（后端 Node.js）
\`\`\`javascript
app.post('/api/code/execute', async (req, res) => {
  const { code, language, timeout } = req.body

  try {
    // 使用 vm 模块或 child_process 执行代码
    const { execSync } = require('child_process')
    const result = execSync(\`python -c "\${code}"\`, {
      timeout: timeout,
      encoding: 'utf-8'
    })

    res.json({
      stdout: result,
      stderr: '',
      exitCode: 0,
      duration: 0
    })
  } catch (error) {
    res.json({
      stdout: '',
      stderr: error.message,
      exitCode: 1,
      duration: 0
    })
  }
})
\`\`\`

## 数据导入/导出 API

### 数据结构
\`\`\`json
{
  "itsm_users": [...],
  "itsm_tickets": [...],
  "itsm_service_requests": [...],
  "itsm_articles": [...],
  "itsm_flows": [...],
  "itsm_counters": {...}
}
\`\`\`

### 集成步骤
1. 点击"设置" → "数据管理" → "导出数据"
2. 发送 JSON 到后端 API
3. 后端保存到数据库
4. 需要恢复时，从后端获取数据
5. 在"导入数据"中上传 JSON 文件

## 用户认证

如果需要多用户支持，建议集成以下认证方式：

### 方案 1：JWT Token
\`\`\`javascript
// 登录
POST /api/auth/login
{
  "username": "user@example.com",
  "password": "password"
}

// 响应
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { id, name, role }
}

// 使用 Token
Authorization: Bearer &lt;token&gt;
\`\`\`

### 方案 2：Session Cookie
\`\`\`javascript
// 登录后获得 Session Cookie
// 后续请求自动携带 Cookie
// 服务器根据 Session 确认用户身份
\`\`\`

## 数据库模型示例

### users 表
\`\`\`sql
CREATE TABLE users (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(100),
  role ENUM('admin', 'member', 'approver'),
  avatar VARCHAR(10),
  created_at TIMESTAMP
)
\`\`\`

### tickets 表
\`\`\`sql
CREATE TABLE tickets (
  id VARCHAR(50) PRIMARY KEY,
  ticket_no VARCHAR(20) UNIQUE,
  title VARCHAR(200),
  description TEXT,
  category VARCHAR(50),
  priority VARCHAR(20),
  status VARCHAR(20),
  assignee_id VARCHAR(50),
  reporter_id VARCHAR(50),
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  resolved_at TIMESTAMP,
  closed_at TIMESTAMP,
  FOREIGN KEY (assignee_id) REFERENCES users(id),
  FOREIGN KEY (reporter_id) REFERENCES users(id)
)
\`\`\`

### tickets_comments 表
\`\`\`sql
CREATE TABLE tickets_comments (
  id VARCHAR(50) PRIMARY KEY,
  ticket_id VARCHAR(50),
  user_id VARCHAR(50),
  text TEXT,
  created_at TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
)
\`\`\`

## 环境变量配置

\`\`\`bash
# .env
VITE_API_BASE_URL=http://localhost:3000
VITE_API_TIMEOUT=30000
VITE_CODE_EXECUTION_ENABLED=true
\`\`\`

## 错误处理

### 通用错误码
\`\`\`
200 - 成功
400 - 请求错误
401 - 未认证
403 - 无权限
404 - 不存在
500 - 服务器错误
\`\`\`

### 错误响应格式
\`\`\`json
{
  "error": true,
  "message": "错误描述",
  "code": "ERROR_CODE",
  "details": {}
}
\`\`\`

## 速率限制

建议为 API 实现速率限制，防止滥用：

\`\`\`
POST /api/code/execute: 10 requests/minute
GET /api/articles: 100 requests/minute
POST /api/tickets: 30 requests/minute
\`\`\`

## 安全建议

1. **输入验证**：服务器端验证所有输入
2. **代码执行隔离**：在容器或虚拟机中执行用户代码
3. **权限检查**：验证用户是否有权限执行操作
4. **日志记录**：记录所有重要操作
5. **HTTPS**：生产环境使用 HTTPS
6. **CORS**：配置合理的 CORS 策略
7. **SQL 注入防护**：使用参数化查询
8. **XSS 防护**：对用户输入进行转义
`
        },
        {
          id: 6,
          icon: '🚀',
          title: 'VSCode 远程连接指南',
          category: '功能指南',
          updatedAt: Date.now(),
          content: `# VSCode 远程连接指南

## 系统信息

你的 Mac 信息：
- **用户名**：\`mac\`
- **主机名**：\`macdeMac-mini.local\`
- **IP 地址**：\`192.168.1.10\`（推荐）
- **VPN IP**：\`100.74.243.83\`

## 快速开始

### 步骤 1：安装 VSCode 扩展

1. 打开 VSCode
2. 按 \`Cmd + Shift + X\` 打开扩展市场
3. 搜索 **"Remote - SSH"**
4. 点击安装（微软官方）

### 步骤 2：添加 SSH 连接

#### 方法 A：快速连接（推荐）
1. 按 \`Cmd + Shift + P\` 打开命令面板
2. 输入 \`Remote-SSH: Connect to Host...\`
3. 选择 \`+ Add New SSH Host...\`
4. 输入连接信息：
   \`\`\`
   ssh mac@192.168.1.10
   \`\`\`
5. 选择保存位置（\`~/.ssh/config\`）
6. 点击"连接"

#### 方法 B：编辑配置文件
1. 按 \`Cmd + Shift + P\`
2. 输入 \`Remote-SSH: Open Configuration File...\`
3. 选择 \`~/.ssh/config\`
4. 添加以下内容：
   \`\`\`
   Host mac-mini
     HostName 192.168.1.10
     User mac
     Port 22
     AddKeysToAgent yes
     IdentityFile ~/.ssh/id_rsa
   \`\`\`
5. 保存文件
6. 使用命令 \`Remote-SSH: Connect to Host...\` 选择 \`mac-mini\`

### 步骤 3：首次连接

1. 系统会询问"Host key verification"
   - 输入 \`yes\` 并回车
2. 输入 Mac 的登录密码
3. VSCode 会在远程安装 VS Code Server
4. 连接建立后，左下角会显示 \`SSH: mac-mini\`

### 步骤 4：打开项目文件夹

1. 连接成功后，点击"文件" → "打开文件夹"
2. 输入项目路径：
   \`\`\`
   /Users/mac/vue-learning-app
   \`\`\`
3. 点击"打开"
4. 选择"是，我信任此项目"
5. 项目已加载到 VSCode

## 🔐 配置 SSH 密钥（免密码登录）

### 生成密钥对

在本地电脑上执行：
\`\`\`bash
ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa
\`\`\`

按 Enter 三次（不需要设置密码）

### 复制公钥到 Mac

\`\`\`bash
ssh-copy-id -i ~/.ssh/id_rsa.pub mac@192.168.1.10
\`\`\`

输入 Mac 密码后，以后连接就不需要密码了！

## 🌐 选择正确的地址

| 地址 | 场景 | 延迟 |
|------|------|------|
| \`192.168.1.10\` | 同一局域网 | 最低 ✅ |
| \`100.74.243.83\` | VPN/Tailscale | 中等 |
| \`macdeMac-mini.local\` | mDNS 局域网 | 低 |

**推荐：使用 \`192.168.1.10\`**（如果在同一网络）

## 常见问题

### Q1：连接超时
\`\`\`bash
# 检查 SSH 是否启用
system_preferences → 共享 → 远程登录

# 如果没有开启，需要在 Mac 上启用 SSH
sudo systemsetup -setremotelogin on
\`\`\`

### Q2：权限拒绝
\`\`\`bash
# 检查密钥权限
chmod 700 ~/.ssh
chmod 600 ~/.ssh/id_rsa
chmod 644 ~/.ssh/id_rsa.pub

# 检查 Mac 上的权限
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
\`\`\`

### Q3：找不到扩展
- 确保 VSCode 已更新到最新版本
- 尝试手动安装：\`code --install-extension ms-vscode-remote.remote-ssh\`

## 远程开发工作流

### 启动开发服务器
\`\`\`bash
# 在 VSCode 终端中（自动连接到 Mac）
cd /Users/mac/vue-learning-app
npm run dev
\`\`\`

### 端口转发
VSCode 会自动处理本地端口转映射，你可以：
1. 在 VSCode 输出中看到 \`http://localhost:5173\`
2. 点击链接或在本地浏览器访问
3. 自动转发到 Mac 上的端口

### 编辑和调试
- 编辑文件时保存会同步到 Mac
- 可以使用 VSCode 调试器调试远程代码
- 所有 VSCode 扩展都支持远程开发

## 性能优化

### 降低网络延迟
1. 使用有线连接而非 WiFi
2. 尽量靠近路由器
3. 关闭其他占用带宽的应用

### 提升编辑速度
1. 禁用不必要的扩展
2. 排除大的 node_modules 文件夹
3. 使用 \`.gitignore\` 排除临时文件

## 断开连接

VSCode 中：
1. 按 \`Cmd + Shift + P\`
2. 输入 \`Remote-SSH: Close Remote Connection\`
3. 或直接关闭 VSCode

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| \`Cmd + Shift + P\` | 命令面板 |
| \`Cmd + '\` | 打开终端 |
| \`Cmd + K Cmd + O\` | 打开文件夹 |
| \`Cmd + Shift + D\` | 打开调试 |

## 下一步

- [VSCode Remote 官方文档](https://code.visualstudio.com/docs/remote/remote-overview)
- [SSH 配置高级选项](https://code.visualstudio.com/docs/remote/troubleshooting)
- [远程容器开发](https://code.visualstudio.com/docs/remote/containers)
`
        },
        {
          id: 7,
          icon: '🔬',
          title: '代码编辑器深度源码分析',
          category: '代码编辑器',
          updatedAt: Date.now(),
          content: `# 代码编辑器深度源码分析

## 整体架构

代码编辑器采用 **三层组件架构**，职责分明：

\`\`\`
┌─────────────────────────────────────────────┐
│         CodePlaygroundSection.vue           │
│     (容器层 - 状态管理 + 片段存储)           │
│                                             │
│  ┌──────────────────┐ ┌──────────────────┐  │
│  │  CodeEditor.vue  │ │ CodeExecutor.vue │  │
│  │  (输入层 - UI)   │ │  (执行层 - 逻辑) │  │
│  └──────────────────┘ └──────────────────┘  │
└─────────────────────────────────────────────┘
\`\`\`

| 组件 | 文件路径 | 职责 | 代码行数 |
|------|---------|------|---------|
| CodePlaygroundSection | pages/itsm/ | 容器、片段管理、localStorage | 472行 |
| CodeEditor | components/itsm/ | 编辑器UI、语言切换、格式化 | 221行 |
| CodeExecutor | components/itsm/ | 代码执行、输出展示、状态管理 | 520行 |

---

## 第一层：CodePlaygroundSection（容器层）

### 核心数据结构

\`\`\`javascript
data() {
  return {
    currentCode: '# 输入 Python 代码\\nprint("Hello, World!")',
    currentLanguage: 'python',
    snippets: [],          // 代码片段历史
    showSaveModal: false,  // 保存弹窗
    snippetName: '',
    snippetDesc: ''
  }
}
\`\`\`

### 数据流向

\`\`\`
┌─────────────┐  v-model   ┌──────────┐
│ currentCode │ ──────────→ │CodeEditor│
│             │ ←────────── │          │
└─────────────┘  emit       └──────────┘
       │
       │  :code (单向)
       ▼
┌──────────────┐
│ CodeExecutor │ → 读取 code 执行
└──────────────┘
\`\`\`

**关键点**：CodeEditor 通过 v-model 双向绑定，CodeExecutor 通过 :code 单向接收。

### 片段存储机制

\`\`\`javascript
// 保存片段到 localStorage
confirmSave() {
  const snippet = {
    name: this.snippetName,
    description: this.snippetDesc,
    code: this.currentCode,       // 完整代码内容
    language: this.currentLanguage, // 语言类型
    timestamp: Date.now()          // 保存时间戳
  }
  this.snippets.unshift(snippet)   // 插入到数组头部（最新在前）
  this.saveToStorage()             // 持久化到 localStorage
}

saveToStorage() {
  localStorage.setItem('code_snippets', JSON.stringify(this.snippets))
}
\`\`\`

**localStorage Key**: \`code_snippets\`
**数据格式**: JSON 数组，每个元素包含 name、code、language、timestamp

### 生命周期

\`\`\`javascript
mounted() {
  this.loadSnippet()  // 页面加载时自动从 localStorage 恢复片段
}
\`\`\`

### 模板结构

\`\`\`
CodePlaygroundSection
├── playground-header        → 标题 + 操作按钮（保存/加载/清空）
├── playground-container     → Grid 布局（左右分栏）
│   ├── editor-section       → CodeEditor 组件
│   └── executor-section     → CodeExecutor 组件
├── snippets-section         → 片段历史列表
│   └── snippet-item[]       → 每个片段（语言标签+时间+预览+操作）
└── ItsmModal (条件渲染)     → 保存片段弹窗
\`\`\`

### 布局实现

\`\`\`css
.playground-container {
  display: grid;
  grid-template-columns: 1fr 1fr;  /* 桌面：左右等宽 */
  gap: 20px;
}

/* 平板以下：上下堆叠 */
@media (max-width: 1024px) {
  .playground-container {
    grid-template-columns: 1fr;     /* 单列 */
  }
}
\`\`\`

---

## 第二层：CodeEditor（输入层）

### v-model 实现原理

这是 Vue 3 自定义组件 v-model 的经典用法：

\`\`\`javascript
// 父组件使用
// v-model="currentCode" 等价于
// :modelValue="currentCode" @update:modelValue="currentCode = $event"

// 子组件接收
props: {
  modelValue: { type: String, default: '' },  // 接收 v-model 的值
  lang: { type: String, default: 'python' }
},
emits: ['update:modelValue'],

// 通过 computed 实现双向绑定
computed: {
  code: {
    get() { return this.modelValue },             // 读取父组件的值
    set(val) { this.$emit('update:modelValue', val) } // 写回父组件
  }
}
\`\`\`

**工作流程**：
1. 用户在 textarea 中输入
2. v-model="code" 触发 computed setter
3. setter 通过 emit 通知父组件
4. 父组件更新 currentCode
5. currentCode 变化通过 props 传回（单向数据流）

### 语言切换机制

\`\`\`javascript
data() {
  return {
    language: this.lang  // 从 prop 初始化本地状态
  }
},
watch: {
  lang(newVal) {
    this.language = newVal  // 父组件改变时同步
  }
}
\`\`\`

**为什么不直接用 prop？** 因为 select 需要 v-model 双向绑定，而 Vue 不允许直接修改 prop。所以用本地 data 做中间层。

### 代码格式化算法

\`\`\`javascript
formatCode() {
  const lines = this.code.split('\\n')
  let indentLevel = 0
  const formatted = lines.map(line => {
    const trimmed = line.trim()
    // 遇到闭合符号先减少缩进
    if (trimmed.startsWith('}') || trimmed.startsWith(']') || trimmed.startsWith(')')) {
      indentLevel = Math.max(0, indentLevel - 1)
    }
    // 应用当前缩进
    const result = '  '.repeat(indentLevel) + trimmed
    // 遇到开启符号增加缩进
    if (trimmed.endsWith('{') || trimmed.endsWith('[') || trimmed.endsWith('(')) {
      indentLevel++
    }
    return result
  }).join('\\n')
  this.code = formatted
}
\`\`\`

**算法逻辑**：
- 逐行扫描，维护 indentLevel 计数器
- 遇到 \`}\` / \`]\` / \`)\` 开头 → 先减缩进再输出
- 遇到 \`{\` / \`[\` / \`(\` 结尾 → 输出后增缩进
- 使用 2 空格作为缩进单位

**局限性**：
- 只处理单字符括号，不处理 Python 的冒号缩进
- 不处理字符串中的括号（可能误判）
- 适合 JavaScript/JSON/CSS 等大括号语言

### 编辑器 UI 设计

\`\`\`css
.code-textarea {
  width: 100%;
  height: 400px;                               /* 桌面默认高度 */
  background: #1e293b;                         /* 深色背景（Slate 800） */
  color: #e2e8f0;                              /* 浅色文字（Slate 200） */
  font-family: 'Monaco', 'Courier New', monospace; /* 等宽字体 */
  font-size: 0.95em;
  line-height: 1.6;                            /* 行高 1.6 提升可读性 */
  tab-size: 2;                                 /* Tab 宽度 2 字符 */
  white-space: pre;                            /* 保留空白和换行 */
  resize: vertical;                            /* 只允许垂直拖拽 */
}

.code-textarea:focus {
  background: #0f172a;                         /* 聚焦时更深（Slate 900） */
}
\`\`\`

**响应式高度变化**：
| 断点 | 高度 | 字号 |
|------|------|------|
| 桌面 &gt; 1024px | 400px | 0.95em |
| 平板 &lt;= 1024px | 300px | 0.85em |
| 手机 &lt;= 768px | 250px | 0.8em |
| 小屏 &lt;= 480px | 200px | 0.75em |

---

## 第三层：CodeExecutor（执行层）

### 执行策略（双重降级）

\`\`\`javascript
async execute() {
  const startTime = performance.now()  // 精确计时

  try {
    // 策略1：尝试调用后端 API
    const response = await fetch('/api/code/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: this.code,
        language: this.language,
        timeout: 30000              // 30秒超时
      })
    })

    if (!response.ok) {
      this.simulateExecution()       // 策略2：本地模拟
      return
    }

    const result = await response.json()
    this.stdout = result.stdout
    this.stderr = result.stderr
  } catch (e) {
    this.simulateExecution()         // 网络错误也降级到本地
  } finally {
    this.lastExecutionTime = Math.round(performance.now() - startTime)
    this.isRunning = false
  }
}
\`\`\`

**执行流程图**：
\`\`\`
用户点击运行
    │
    ▼
清空输出 + 开始计时
    │
    ▼
fetch('/api/code/execute')
    │
    ├── 成功 → 解析 JSON → 显示 stdout/stderr
    │
    └── 失败（404/网络错误）
         │
         ▼
    simulateExecution()
         │
         ├── Python  → simulatePython()
         ├── JS      → simulateJavaScript()
         ├── Bash    → simulateBash()
         ├── HTML    → simulateHtml()
         └── SQL     → simulateSql()
\`\`\`

### JavaScript 执行原理（核心亮点）

\`\`\`javascript
simulateJavaScript() {
  try {
    if (this.code.includes('console.log(')) {
      const logs = []

      // 1. 保存原始 console.log
      const originalLog = console.log

      // 2. 替换为自定义函数（猴子补丁）
      console.log = (...args) => {
        logs.push(
          args.map(a =>
            typeof a === 'string' ? a : JSON.stringify(a)
          ).join(' ')
        )
      }

      // 3. 使用 Function 构造器执行代码（比 eval 更安全）
      const fn = new Function(this.code)
      fn()

      // 4. 恢复原始 console.log
      console.log = originalLog

      // 5. 收集所有输出
      this.stdout = logs.join('\\n')
    }
  } catch (e) {
    this.stderr = '❌ JavaScript 错误: ' + e.message
  }
}
\`\`\`

**为什么用 Function() 而不是 eval()？**

| 特性 | eval() | new Function() |
|------|--------|----------------|
| 作用域 | 访问当前作用域所有变量 | 只能访问全局作用域 |
| 安全性 | 可修改局部变量，风险更高 | 隔离性更好 |
| 性能 | 无法被引擎优化 | 可被部分优化 |
| ESLint | no-eval 规则禁止 | no-new-func 可配置 |

**猴子补丁（Monkey Patching）技术**：
1. 保存 \`console.log\` 原始引用
2. 替换为自定义函数，将输出存入数组
3. 执行用户代码（所有 console.log 调用都被拦截）
4. 恢复原始函数
5. 将收集的输出显示在界面上

### Python 模拟原理

\`\`\`javascript
simulatePython() {
  if (this.code.includes('print(')) {
    // 正则匹配 print() 的内容
    const match = this.code.match(/print\\((.*?)\\)/s)
    //                                    ^^^^  ^
    //                                    |     |
    //                              捕获括号内容  s 标志（跨行匹配）
    if (match) {
      let content = match[1]
      content = content.replace(/^["']|["']$/g, '')  // 去掉引号
      this.stdout = content
    }
  } else if (this.code.includes('import')) {
    this.stdout = '✅ 模块导入成功'
  } else {
    this.stdout = '✅ Python 代码执行成功（本地模拟）'
  }
}
\`\`\`

**正则表达式详解**：
- \`/print\\((.*?)\\)/s\` → 匹配 \`print(\` 和 \`)\` 之间的内容
- \`.*?\` → 非贪婪匹配（匹配最少的字符）
- \`s\` 标志 → 让 \`.\` 可以匹配换行符
- \`match[1]\` → 第一个捕获组（括号内的内容）

**局限性**：
- 只能捕获第一个 print() 语句
- 不处理嵌套括号 \`print(len([1,2,3]))\`
- 不执行变量赋值和计算
- 建议：实际项目应使用 Pyodide（WASM 版 Python）

### Bash 模拟原理

\`\`\`javascript
simulateBash() {
  if (this.code.includes('echo')) {
    const match = this.code.match(/echo\\s+["']?(.*?)["']?$/m)
    //                                  ^^^   ^^^^^      ^
    //                                  |     |          |
    //                          空白字符  可选引号   m标志（多行匹配）
    if (match) {
      this.stdout = match[1]
    }
  } else {
    this.stdout = '⚠️ Bash 命令需要后端支持\\n模拟输出: 命令执行成功'
  }
}
\`\`\`

### 状态机设计

\`\`\`
executionStatus 的四种状态：

  idle ──────→ running ──────→ success
   ▲            │                │
   │            │                │
   │            └───────→ error  │
   │                       │     │
   └───────────────────────┴─────┘
        (下次执行时重置)
\`\`\`

\`\`\`javascript
data() {
  return {
    isRunning: false,          // 控制 UI（显示停止按钮、执行动画）
    stdout: '',                // 标准输出
    stderr: '',                // 标准错误
    lastExecutionTime: null,   // 执行耗时（毫秒）
    outputTab: 'stdout',       // 当前输出标签（stdout/stderr/info）
    executionStatus: 'idle'    // 状态机（idle/running/success/error）
  }
}
\`\`\`

### 输出 Tab 系统

\`\`\`
┌──────────┬──────────┬──────────┐
│ 📤 输出  │ ❌ 错误  │ ℹ️ 信息  │
└──────────┴──────────┴──────────┘
│                                │
│  stdout Tab:                   │
│    显示程序标准输出             │
│                                │
│  stderr Tab:                   │
│    显示程序错误输出（红色背景）  │
│                                │
│  info Tab:                     │
│    语言: Python 🐍             │
│    状态: 执行成功 ✅            │
│    执行时间: 12ms              │
│    代码行数: 5                 │
│                                │
└────────────────────────────────┘
\`\`\`

### 计时实现

\`\`\`javascript
const startTime = performance.now()  // 高精度时间戳（微秒级）
// ... 执行代码 ...
this.lastExecutionTime = Math.round(performance.now() - startTime)
\`\`\`

使用 \`performance.now()\` 而非 \`Date.now()\`，精度从毫秒级提升到微秒级。

---

## 组件通信完整链路

\`\`\`
                    ItsmPage.vue
                        │
                        │ 无 props（CodePlayground 独立运行）
                        ▼
              CodePlaygroundSection.vue
               │                    │
    v-model="currentCode"     :code="currentCode"
    :lang="currentLanguage"   :language="currentLanguage"
               │                    │
               ▼                    ▼
         CodeEditor.vue      CodeExecutor.vue
\`\`\`

**数据独立性**：CodePlaygroundSection 不接收任何 props，也不向 ItsmPage 发送 events。它是完全自治的模块，数据通过自己的 localStorage 管理。

---

## 安全机制分析

### 1. Function 构造器隔离

\`\`\`javascript
const fn = new Function(this.code)
// 等价于：
// function anonymous() { /* this.code 的内容 */ }
\`\`\`

创建的函数只能访问全局变量，不能访问 Vue 组件的 this、data、methods。

### 2. try-catch 错误捕获

每个 simulate 方法都包裹在 try-catch 中，语法错误、运行时错误都会被捕获并显示在 stderr Tab。

### 3. console.log 恢复保证

即使代码执行出错（catch 分支），finally 块会确保 console.log 被恢复。但当前代码的恢复逻辑在 catch 之外 —— 如果 \`fn()\` 抛出异常，catch 中设置了 stderr，但 console.log 的恢复在 catch 后的隐式 finally 中。

### 4. 潜在风险

- \`new Function()\` 仍可访问 window、document 等全局对象
- 恶意代码可以修改 DOM、发起网络请求
- 生产环境建议使用 Web Worker 或 iframe sandbox

---

## 各语言执行能力对比

| 语言 | 执行方式 | 能力 | 限制 |
|------|---------|------|------|
| **JavaScript** | Function() 真实执行 | 完整 JS 语法，捕获 console.log | 无法访问 Node.js API |
| **Python** | 正则模拟 | 识别 print() 和 import | 不能执行真正的计算 |
| **Bash** | 正则模拟 | 识别 echo 命令 | 无法执行文件系统操作 |
| **HTML** | 语法验证 | 提示有效 | 不渲染实际页面 |
| **SQL** | 语法验证 | 提示有效 | 无数据库连接 |

---

## 样式系统详解

### 深色编辑器主题

\`\`\`
配色方案（Tailwind Slate 色系）：
┌──────────────────────────────┐
│ Toolbar:  #0f172a (Slate 900) │
│ Editor:   #1e293b (Slate 800) │
│ Focus:    #0f172a (Slate 900) │
│ Text:     #e2e8f0 (Slate 200) │
│ Border:   #334155 (Slate 700) │
│ Hover:    #64748b (Slate 500) │
│ Placeholder: #64748b          │
└──────────────────────────────┘
\`\`\`

### 执行器主题（浅色）

\`\`\`
执行按钮:    #10b981 (Emerald 500)  → hover: #059669
停止按钮:    #ef4444 (Red 500)
执行中动画:  #f59e0b (Amber 500) + pulse 动画
成功状态:    #10b981 (Emerald 500)
错误状态:    #ef4444 (Red 500)
\`\`\`

### pulse 动画

\`\`\`css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
/* 应用于：执行中文字 + running 状态文字 */
\`\`\`

---

## 可扩展设计

### 如何添加新语言支持

1. **CodeEditor.vue** - 添加 option
\`\`\`html
&lt;option value="go"&gt;Go 🦫&lt;/option&gt;
\`\`\`

2. **CodeEditor.vue** - 添加 placeholder
\`\`\`javascript
go: '// Go 代码\\npackage main\\nimport "fmt"\\nfunc main() {\\n  fmt.Println("Hello")\\n}'
\`\`\`

3. **CodeExecutor.vue** - 添加 label
\`\`\`javascript
go: 'Go 🦫'
\`\`\`

4. **CodeExecutor.vue** - 添加模拟方法
\`\`\`javascript
simulateGo() {
  const match = this.code.match(/fmt\\.Println\\("(.*?)"\\)/)
  if (match) this.stdout = match[1]
}
\`\`\`

5. **simulateExecution()** - 添加分支
\`\`\`javascript
} else if (this.language === 'go') {
  this.simulateGo()
}
\`\`\`

### 如何接入真实后端

\`\`\`javascript
// 已预留 API 接口：
POST /api/code/execute
Content-Type: application/json

{
  "code": "print('Hello')",
  "language": "python",
  "timeout": 30000
}

// 期望响应：
{
  "stdout": "Hello",
  "stderr": "",
  "exitCode": 0,
  "executionTime": 125
}
\`\`\`

后端实现建议：
- Python: 使用 subprocess + Docker 容器沙箱
- Node.js: 使用 vm2 模块
- 通用: 使用 Judge0 开源评判系统

---

## 总结

代码编辑器的核心设计理念：

1. **渐进式降级** — 优先调用后端API，失败后无缝切换到本地模拟
2. **组件解耦** — 编辑器(输入)与执行器(输出)完全分离，通过父组件桥接
3. **安全第一** — Function() 替代 eval()，try-catch 防止崩溃
4. **独立自治** — 不依赖 ItsmPage 的全局状态，自己管理 localStorage
5. **响应式** — 四个断点适配从手机到桌面的所有设备
`
        }
      ]
    }
  },
  computed: {
    filteredArticles() {
      return this.articles.filter(article => {
        const matchCategory = this.selectedCategory === '全部' ||
                             article.category === this.selectedCategory
        const matchSearch = !this.searchQuery ||
                          article.title.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                          article.content.toLowerCase().includes(this.searchQuery.toLowerCase())
        return matchCategory && matchSearch
      })
    }
  },
  methods: {
    selectArticle(article) {
      this.selectedArticle = article
      // 移动端选中文章后滚动到顶部
      this.$nextTick(() => {
        const detail = this.$el.querySelector('.article-detail')
        if (detail) detail.scrollTop = 0
      })
    },
    formatDate(ts) {
      return new Date(ts).toLocaleDateString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  },
  mounted() {
    // 自动选中第一篇文章
    if (this.articles.length > 0) {
      this.selectedArticle = this.articles[0]
    }
  }
}
</script>

<style scoped>
.knowledge-articles {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 20px;
  height: calc(100vh - 200px);
}

.section-header {
  grid-column: 1 / -1;
  margin-bottom: 10px;
}

.section-header h2 {
  margin: 0 0 12px;
  color: #333;
  font-size: 1.4em;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.search-input {
  flex: 1;
  padding: 10px 14px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.95em;
}

.search-input:focus {
  outline: none;
  border-color: #3b82f6;
}

.articles-nav {
  grid-column: 1 / -1;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.category-btn {
  padding: 8px 16px;
  border: 2px solid #e5e7eb;
  background: white;
  border-radius: 20px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.85em;
  color: #666;
  transition: all 0.3s;
}

.category-btn:hover {
  border-color: #3b82f6;
  color: #3b82f6;
}

.category-btn.active {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.articles-list {
  background: white;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  overflow-y: auto;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.article-item {
  padding: 14px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 10px;
}

.article-item:hover {
  background: #f9fafb;
}

.article-item.active {
  background: #eff6ff;
  border-left: 4px solid #3b82f6;
  padding-left: 10px;
}

.article-icon {
  font-size: 1.3em;
  flex-shrink: 0;
}

.article-title {
  flex: 1;
  font-weight: 600;
  color: #333;
  font-size: 0.9em;
  line-height: 1.3;
}

.article-time {
  font-size: 0.75em;
  color: #999;
  white-space: nowrap;
}

.article-detail {
  background: white;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  padding: 24px;
  overflow-y: auto;
  border: 1px solid #e5e7eb;
}

.detail-header {
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 2px solid #f0f0f0;
}

.btn-back {
  display: none;
}

.detail-title-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.detail-header h2 {
  margin: 0 0 8px;
  color: #333;
  font-size: 1.5em;
}

.detail-meta {
  display: flex;
  gap: 12px;
  font-size: 0.85em;
  color: #999;
  margin: 0;
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.5em;
  cursor: pointer;
  color: #999;
  padding: 4px 8px;
  flex-shrink: 0;
}

.btn-close:hover {
  color: #333;
}

.detail-content {
  color: #333;
  line-height: 1.7;
}

.article-placeholder {
  background: white;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 1em;
}

.placeholder-icon {
  font-size: 3em;
  margin-bottom: 12px;
}

/* === 平板 === */
@media (max-width: 1024px) {
  .knowledge-articles {
    grid-template-columns: 250px 1fr;
    gap: 16px;
    height: auto;
  }
}

/* === 手机 + 小平板：钻入式导航 === */
@media (max-width: 768px) {
  .knowledge-articles {
    display: flex;
    flex-direction: column;
    gap: 12px;
    height: auto;
  }

  /* 默认：显示列表 */
  .articles-list {
    max-height: 60vh;
    order: 3;
  }

  .article-placeholder {
    display: none;
  }

  /* 选中文章后：隐藏搜索、分类、列表，只显示文章详情 */
  .viewing-article .section-header,
  .viewing-article .articles-nav,
  .viewing-article .articles-list {
    display: none;
  }

  .viewing-article .article-detail {
    flex: 1;
    max-height: none;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }

  /* 显示返回按钮 */
  .btn-back {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 10px 16px;
    background: #f3f4f6;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    font-size: 0.9em;
    font-weight: 600;
    color: #3b82f6;
    cursor: pointer;
    margin-bottom: 14px;
    transition: all 0.2s;
    width: 100%;
    justify-content: center;
  }

  .btn-back:hover {
    background: #eff6ff;
    border-color: #3b82f6;
  }

  .btn-close {
    display: none;
  }

  .article-detail {
    padding: 16px;
  }

  .detail-header h2 {
    font-size: 1.2em;
  }

  .detail-content {
    font-size: 0.92em;
    line-height: 1.6;
  }
}

/* === 小屏手机 === */
@media (max-width: 480px) {
  .section-header h2 {
    font-size: 1.1em;
  }

  .search-input {
    font-size: 14px;
    padding: 10px 12px;
  }

  .articles-nav {
    overflow-x: auto;
    flex-wrap: nowrap;
    -webkit-overflow-scrolling: touch;
    padding-bottom: 4px;
  }

  .category-btn {
    padding: 8px 14px;
    font-size: 0.8em;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .articles-list {
    max-height: 55vh;
  }

  .article-item {
    padding: 12px;
    min-height: 48px;
  }

  .article-icon {
    font-size: 1.1em;
  }

  .article-title {
    font-size: 0.9em;
  }

  .article-time {
    display: none;
  }

  .article-detail {
    padding: 14px;
  }

  .detail-header h2 {
    font-size: 1.05em;
  }

  .detail-meta {
    gap: 8px;
    font-size: 0.8em;
  }

  .btn-back {
    padding: 12px 16px;
    font-size: 0.85em;
  }

  .detail-content {
    font-size: 0.88em;
    line-height: 1.55;
  }
}
</style>
