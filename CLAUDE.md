# Vue Learning App - Claude 开发指南

> 这个文件用于记录项目架构、关键文件、开发指南和 Claude 助手的上下文信息。

## 📋 项目概览

**Vue Learning App** 是一个功能丰富的 Vue 3 学习参考应用，提供多个专业工具模块和完整的知识管理系统。

### 🎯 核心特性

- **14 个主功能标签页** - Spring 参考、Excel 参考、聊天记录、IT 服务管理、Git 管理、视频管理、音乐管理、相册管理、Wiki、日志中心、微博抓取、定时任务、文档中心、**Issue 管理**
- **FFmpeg 视频处理工具** - 转码、剪辑、元数据提取等功能
- **PWA 支持** - 离线访问、Service Worker 缓存、应用清单
- **文档中心** - Markdown 同步、搜索、版本管理、学习路径
- **Issue 管理系统** - 完整的问题跟踪、团队协作、看板视图、统计分析
- **完整的主题系统** - 6 个预设主题 + 25 个色卡预设
- **响应式设计** - 完美适配桌面、平板、手机各种尺寸

### 📊 项目统计

| 指标 | 数值 |
|------|------|
| Vue 组件 | 65+ 个 |
| 页面模块 | 25+ 个 |
| 工具函数 | 3 个 |
| 后端路由 | 25+ 个 |
| 数据库表 | 23+ 个 |
| 主题配色 | 31 种 |
| 本地提交 | 130+ 个 |
| 设计文档 | 7 份 |

## 📁 项目结构

```
vue-learning-app/
├── src/                          # 前端源代码
│   ├── pages/                    # 功能页面（24 个）
│   │   ├── HomePage.vue
│   │   ├── SpringReference.vue
│   │   ├── ExcelReference.vue
│   │   ├── ChatHistory.vue
│   │   ├── itsm/
│   │   │   └── ItsmPage.vue     # IT 服务管理
│   │   ├── GitBranchManager.vue # Git 分支管理
│   │   ├── VideoManager.vue     # 视频管理（支持 FFmpeg）
│   │   ├── MusicManager.vue
│   │   ├── AlbumManager.vue
│   │   ├── WikiCenter.vue       # Wiki 知识库
│   │   ├── LogCenter.vue        # 日志中心
│   │   ├── WeiboCrawler.vue     # 微博抓取
│   │   ├── ScheduledTaskManager.vue # 定时任务
│   │   ├── DocumentationCenter.vue  # 文档中心（Markdown）
│   │   ├── FfmpegTool.vue       # FFmpeg 工具页面
│   │   └── IssueManagement.vue  # Issue 管理系统
│   ├── components/               # 可复用组件
│   │   ├── Header.vue           # 应用头部（含 PWA 检测）
│   │   └── ... (其他组件)
│   ├── utils/                    # 工具函数
│   │   ├── api.js               # API 客户端
│   │   └── pwa.js               # PWA 检测工具
│   ├── App.vue                   # 应用主组件（色卡预设、主题）
│   ├── main.js                   # 应用入口（PWA 初始化）
│   └── style.css                 # 全局样式
│
├── server/                       # 后端 Express 服务
│   ├── index.js                  # 服务器入口
│   ├── routes/                   # API 路由（15+ 个）
│   │   ├── docs.js              # 文档同步 API
│   │   ├── wiki.js              # Wiki API
│   │   ├── videos.js            # 视频管理 API
│   │   ├── ffmpeg.js            # FFmpeg 处理 API
│   │   ├── schedulerTasks.js    # 定时任务 API
│   │   ├── issues.js            # Issue 管理 API
│   │   ├── logs.js
│   │   ├── git.js
│   │   └── ... (其他路由)
│   └── server/data/              # 数据存储
│       ├── wiki/
│       ├── videos/
│       └── scheduler/
│
├── public/                       # 静态资源
│   ├── manifest.webmanifest     # PWA 清单
│   ├── sw.js                     # Service Worker
│   ├── offline.html              # 离线页面
│   └── icons/                    # PWA 图标
│
├── docs/                         # 文档和指南
│   ├── LEARNING_GUIDE.md        # 学习指南
│   ├── QUICK_REFERENCE.md       # 快速参考
│   └── PWA_DETECTION_GUIDE.md   # PWA 检测指南
│
├── CLAUDE.md                     # 本文件
├── package.json
├── vite.config.js
└── .gitignore
```

## 🔧 技术栈

### 前端技术

| 技术 | 版本 | 用途 |
|------|------|------|
| Vue | 3.x | 前端框架 |
| Vite | 最新 | 构建工具 |
| Capacitor | 最新 | 原生应用支持 |
| Marked | ^17.0.3 | Markdown 渲染 |

### 后端技术

| 技术 | 用途 |
|------|------|
| Express.js | Web 服务器 |
| MySQL | 数据库 |
| FFmpeg | 视频处理 |
| Node.js | 运行环境 |

### 相关工具

- **主题系统** - CSS 变量 + 计算型颜色混合
- **PWA** - Service Worker + Web App Manifest
- **API** - RESTful 架构
- **存储** - localStorage + MySQL

## 🗂️ 关键文件说明

### 前端核心文件

#### `src/App.vue` (969 行)
**作用：** 应用主组件，管理标签页导航、主题切换、色卡预设、字体缩放

**关键功能：**
- 6 个预设主题（蓝、绿、紫、橙、粉、暗）
- 25 个色卡预设（海洋、森林、暖阳、玫瑰等）
- 字体大小范围 85%-125%
- 自定义颜色微调
- 14 个标签页管理
- 预加载和缓存控制

**状态管理：**
```javascript
data: {
  activeTab: 'home',
  currentTheme: 'blue',
  appearance: {
    fontScale: 100,
    useCustomColors: false,
    presetId: '',
    primaryColor: '#007aff',
    textColor: '#1c1c1e',
    bgColor: '#f2f2f7'
  },
  colorPresets: [
    { id: 'ocean', name: '海洋', primary: '#0EA5E9', ... },
    // 25 个预设...
  ]
}
```

**主要方法：**
- `switchTheme(id)` - 切换主题
- `applyColorPreset(presetId)` - 应用色卡预设
- `onAppearanceChange()` - 保存外观设置
- `preloadTab(tabId)` - 预加载标签页

#### `src/components/Header.vue` (215 行)
**作用：** 应用头部，显示版本、构建时间、后端状态、PWA 状态

**关键功能：**
- ✅ **PWA 检测指示**
  - 📱 PWA 已安装（绿色）- 应用以独立模式运行
  - 📱 PWA 就绪（蓝色）- 支持 PWA
- ✅ **后端健康检查** - 30 秒间隔轮询
- ✅ **状态详情展开** - 显示检查时间和错误信息

**PWA 相关代码：**
```javascript
mounted() {
  this.pwaInfo = detectPWA()
  window.addEventListener('appinstalled', () => {
    this.pwaInfo.installed = true
  })
}
```

#### `src/main.js` (47 行)
**作用：** 应用入口，初始化 PWA 和事件监听

**关键功能：**
- 全局错误处理
- Service Worker 注册
- PWA 状态检测和日志
- 应用启动信息输出

**PWA 初始化：**
```javascript
import { detectPWA, getPWAStatusDetail } from './utils/pwa.js'

const pwaInfo = detectPWA()

console.info('[boot]', {
  pwa: pwaInfo
})

if (pwaInfo.installed || pwaInfo.isPWACapable) {
  console.info('[pwa] PWA 检测:\n' + getPWAStatusDetail(pwaInfo))
}
```

### 工具函数

#### `src/utils/pwa.js` (200+ 行)
**作用：** PWA 检测和管理工具库

**导出函数：**
```javascript
// 检测相关
detectPWA()                    // 检测 PWA 状态
getPWAStatusText(info)         // 获取状态文本
getPWAStatusDetail(info)       // 获取详细信息

// 事件相关
onPWAInstalled(callback)       // 监听安装事件
getPWAInstallPrompt()          // 获取安装提示
triggerPWAInstall(prompt)      // 触发安装

// 更新相关
checkForUpdate()               // 检查应用更新
```

**返回数据结构：**
```javascript
{
  installed: boolean,          // 是否已安装
  mode: string|null,          // 运行模式 ('ios' 等)
  displayMode: string|null,   // 显示模式
  standalone: boolean,        // 独立模式
  hasServiceWorker: boolean,  // Service Worker 已注册
  isPWACapable: boolean      // 支持 PWA
}
```

#### `src/utils/api.js`
**作用：** API 客户端，封装所有后端请求

**API 分组：**
```javascript
// 核心 API
api.health              // 后端健康检查
api.git                 // Git 相关
api.chat                // 聊天记录
api.excel               // Excel 参考

// 文档相关
api.docs.list()         // 获取文档列表
api.docs.getContent()   // 获取文档内容
api.docs.sync()         // 同步文档
api.docs.search()       // 搜索文档

// 视频相关
api.videos.list()       // 获取视频列表
api.videos.upload()     // 上传视频
api.ffmpeg.convert()    // FFmpeg 转码

// Wiki 相关
api.wiki.list()         // 获取 Wiki 列表
api.wiki.get()          // 获取 Wiki 内容

// 其他 API...
```

### 后端核心路由

#### `server/routes/docs.js` (300+ 行)
**作用：** 文档中心 API - Markdown 同步、搜索、版本管理

**端点：**
- `GET /api/docs/list` - 获取文档列表（支持版本检测和学习顺序）
- `GET /api/docs/content` - 获取文档内容（安全验证）
- `POST /api/docs/sync` - 同步项目文档
- `GET /api/docs/search` - 全文搜索（排序和评分）

**关键功能：**
- 文件版本检测 (`v1.0`, `@v1.0` 等格式)
- 学习路径排序 (README > QUICK_START > LEARNING_GUIDE 等)
- 全文搜索和结果评分
- 路径遍历防护

**学习顺序配置：**
```javascript
const LEARNING_ORDER_HINTS = [
  'README', 'QUICK_START', 'STARTUP_GUIDE', 'LEARNING_GUIDE',
  'API', 'REFERENCE', 'GUIDE', 'TUTORIAL', 'EXAMPLE'
]
```

#### `server/routes/ffmpeg.js` (新增)
**作用：** FFmpeg 视频处理 API

**功能：**
- 视频转码 (支持 H264, VP9 等格式)
- 视频剪辑 (起始时间、时长)
- 元数据提取 (分辨率、帧率、时长)
- 缩略图生成
- 字幕提取

#### `server/routes/videos.js` (扩展)
**作用：** 视频管理 API

**端点：**
- `GET /api/videos/list` - 获取视频列表
- `POST /api/videos/upload` - 上传视频
- `POST /api/videos/process` - 调用 FFmpeg 处理
- `GET /api/videos/:id` - 获取视频详情

#### `server/routes/schedulerTasks.js` (扩展)
**作用：** 定时任务管理 API

**功能：**
- 任务创建和删除
- 任务执行状态跟踪
- 任务日志查询
- 支持 Cron 表达式

#### `server/routes/issues.js` (新增)
**作用：** Issue 管理 API - 问题追踪、协作、统计分析

**主要端点：**
- `GET /api/issues` - 获取 Issue 列表（支持分页、筛选、搜索）
- `POST /api/issues` - 创建 Issue
- `GET /api/issues/:issue_number` - 获取 Issue 详情
- `PUT /api/issues/:issue_number` - 更新 Issue
- `POST /api/issues/:issue_number/close` - 关闭 Issue
- `POST /api/issues/:issue_number/reopen` - 重新打开 Issue
- `GET /api/issues/:issue_number/comments` - 获取评论列表
- `POST /api/issues/:issue_number/comments` - 添加评论
- `PUT /api/issues/:issue_number/comments/:comment_id` - 编辑评论
- `DELETE /api/issues/:issue_number/comments/:comment_id` - 删除评论
- `PUT /api/issues/:issue_number/labels` - 更新 Issue 标签
- `GET /api/labels` - 获取所有标签
- `POST /api/labels` - 创建标签
- `GET /api/milestones` - 获取里程碑列表
- `POST /api/milestones` - 创建里程碑
- `GET /api/issues/:issue_number/activities` - 获取活动历史
- `GET /api/issues/stats` - 获取 Issue 统计数据

**关键功能：**
- Issue CRUD 操作（创建、编辑、删除、关闭、重开）
- 评论系统（Markdown 支持、编辑、删除）
- 标签管理（颜色、分类）
- 里程碑追踪（进度统计）
- 用户指派和关注
- 时间追踪（预估和实际工时）
- 活动日志（所有操作记录）
- 高级搜索和筛选
- 批量操作

### 数据存储

#### `server/server/data/wiki/library.json`
**作用：** Wiki 库元数据存储

**结构：**
```json
{
  "articles": [
    {
      "id": "001",
      "title": "文章标题",
      "category": "分类",
      "tags": ["标签1", "标签2"],
      "content": "内容摘要",
      "created": "2026-02-24",
      "updated": "2026-02-24"
    }
  ]
}
```

#### `server/server/data/videos/`
**作用：** 视频文件存储和元数据

**结构：**
```
videos/
├── uploads/           # 上传的视频文件
├── processed/         # 处理后的视频
├── thumbnails/        # 缩略图
└── metadata.json      # 视频元数据
```

#### `server/server/data/scheduler/`
**作用：** 定时任务存储

**结构：**
```
scheduler/
├── tasks.json         # 任务定义
└── logs/             # 执行日志
```

#### Issue 管理数据库表
**作用：** 存储 Issue、评论、标签、里程碑等数据

**核心表：**
- `issues` - Issue 主表（issue_number、title、status、priority、author_id 等）
- `issue_comments` - 评论表（content、user_id、is_edited 等）
- `issue_labels` - 标签表（name、color、description）
- `issue_label_relations` - Issue 与标签的关联表
- `milestones` - 里程碑表（title、due_date、progress 等）
- `issue_watchers` - Issue 关注者表
- `issue_activities` - 活动日志表（所有操作记录）
- `issue_attachments` - 附件表（图片、文档等）
- `issue_templates` - Issue 模板表（Bug 报告、功能请求等）

**表结构详见：** `ISSUE_MANAGEMENT_DESIGN.md` - 数据库设计部分

### PWA 相关文件

#### `public/manifest.webmanifest`
**作用：** PWA 应用清单

**关键配置：**
```json
{
  "name": "Vue 学习参考应用",
  "short_name": "Vue学习参考",
  "description": "Vue 3 学习参考应用，支持离线阅读核心页面。",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "theme_color": "#2563eb",
  "background_color": "#f5f7fa",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-1024.png", "sizes": "1024x1024", "type": "image/png" }
  ]
}
```

#### `public/sw.js`
**作用：** Service Worker - 离线支持和缓存管理

**缓存策略：**
- **API 请求：** 网络优先 + 缓存降级
- **静态资源：** 缓存优先 + 后台更新
- **导航请求：** 网络优先 + 缓存降级

#### `public/offline.html`
**作用：** 离线页面 - 网络断开时显示

## 🚀 常见开发任务

### 添加新页面

1. 创建页面组件 `src/pages/NewPage.vue`
2. 在 `src/App.vue` 中添加路由：
   ```javascript
   // tabLoaders 中添加
   newpage: () => import('./pages/NewPage.vue')

   // tabs 中添加
   { id: 'newpage', label: '新页面' }
   ```
3. 创建 API 路由 `server/routes/newpage.js`
4. 注册路由 `server/index.js`

### 添加 API 端点

1. 在对应的 `server/routes/xxx.js` 中添加：
   ```javascript
   router.get('/api/xxx/endpoint', (req, res) => {
     // 处理逻辑
     res.json({ data: result })
   })
   ```

2. 在 `src/utils/api.js` 中注册：
   ```javascript
   xxx: {
     endpoint: () => fetch('/api/xxx/endpoint')
   }
   ```

3. 在组件中调用：
   ```javascript
   const result = await api.xxx.endpoint()
   ```

### 修改主题

#### 方式 1：修改预设主题
在 `src/App.vue` 中的 `themes` 数组修改：
```javascript
themes: [
  { id: 'blue', name: '经典蓝', preview: 'linear-gradient(135deg, #667eea, #764ba2)' },
  // ...
]
```

#### 方式 2：添加色卡预设
在 `colorPresets` 数组添加：
```javascript
{ id: 'custom', name: '自定义名称', primary: '#XXXXXX', text: '#XXXXXX', bg: '#XXXXXX' }
```

#### 方式 3：自定义颜色
用户在应用中使用"最后微调"选项进行自定义颜色调整。

### 修改 PWA 配置

#### 清单配置
编辑 `public/manifest.webmanifest`：
- 修改 `name`, `short_name`, `description`
- 调整 `theme_color`, `background_color`
- 更新 `icons` 路径

#### Service Worker 缓存策略
编辑 `public/sw.js`：
```javascript
const CACHE_VERSION = 'v1.1.0'
const APP_SHELL = [
  '/',
  '/index.html',
  // 添加需要预缓存的资源
]
```

### Issue 管理系统开发

#### 页面和组件

创建 Issue 管理页面 `src/pages/IssueManagement.vue`：
```javascript
// tabLoaders 中添加到 src/App.vue
issuemanagement: () => import('./pages/IssueManagement.vue')

// tabs 中添加标签页
{ id: 'issuemanagement', label: 'Issue 管理' }
```

主要组件位置：
```
src/pages/
├── IssueManagement.vue        # Issue 管理主页面
└── workflow/
    └── components/
        ├── IssueList.vue      # Issue 列表
        ├── IssueDetail.vue    # Issue 详情
        ├── IssueBoard.vue     # 看板视图
        ├── IssueCard.vue      # Issue 卡片
        ├── IssueForm.vue      # 创建/编辑表单
        ├── CommentEditor.vue  # 评论编辑器
        ├── LabelManager.vue   # 标签管理
        └── MilestoneCard.vue  # 里程碑卡片
```

#### 数据库初始化

执行 Issue 相关的 SQL 初始化脚本：
```bash
mysql -u root -p < sql/issue_tables.sql
```

#### API 集成

在 `src/utils/api.js` 中注册 Issue API：
```javascript
issues: {
  list: (params) => fetch(`/api/issues?${new URLSearchParams(params)}`),
  create: (data) => fetch('/api/issues', { method: 'POST', body: JSON.stringify(data) }),
  get: (issueNumber) => fetch(`/api/issues/${issueNumber}`),
  update: (issueNumber, data) => fetch(`/api/issues/${issueNumber}`, { method: 'PUT', body: JSON.stringify(data) }),
  close: (issueNumber) => fetch(`/api/issues/${issueNumber}/close`, { method: 'POST' }),
  comments: (issueNumber) => fetch(`/api/issues/${issueNumber}/comments`),
  labels: () => fetch('/api/labels'),
  milestones: () => fetch('/api/milestones')
}
```

## 📝 代码规范和最佳实践

### Vue 组件规范

1. **组件结构**
   ```vue
   <template><!-- 模板 --></template>
   <script>
   export default {
     name: 'ComponentName',
     components: { /* ... */ },
     props: { /* ... */ },
     data() { return { /* ... */ } },
     computed: { /* ... */ },
     watch: { /* ... */ },
     methods: { /* ... */ },
     mounted() { /* ... */ }
   }
   </script>
   <style scoped>/* 样式 */</style>
   ```

2. **命名规范**
   - 组件文件：PascalCase (如 `VideoManager.vue`)
   - 方法：camelCase (如 `checkBackendHealth`)
   - 常量：UPPER_SNAKE_CASE (如 `CACHE_VERSION`)

3. **性能优化**
   - 使用 `KeepAlive` 缓存标签页
   - 预加载常用标签页
   - 使用 `v-show` 而不是 `v-if` 来切换标签页（如可行）
   - 延迟加载组件

### API 调用规范

1. **错误处理**
   ```javascript
   try {
     const response = await fetch(url, options)
     if (!response.ok) throw new Error(`HTTP ${response.status}`)
     return await response.json()
   } catch (error) {
     console.error('API 错误:', error)
     throw error
   }
   ```

2. **超时处理**
   ```javascript
   const controller = new AbortController()
   const timeout = setTimeout(() => controller.abort(), 3500)

   try {
     const response = await fetch(url, { signal: controller.signal })
   } finally {
     clearTimeout(timeout)
   }
   ```

### Git 提交规范

**格式：** `<类型>: <描述>`

**类型：**
- `添加` - 新增功能或页面
- `更新` - 修改现有功能
- `修复` - 修复 bug
- `文档` - 文档更新
- `配置` - 配置变更
- `样式` - 样式调整
- `重构` - 代码重构

**示例：**
```
添加: FFmpeg 视频处理 API 服务
更新: 视频管理功能完善和 FFmpeg 集成
文档: 添加 PWA 检测功能完整指南
```

## 🧪 测试指南

### 单元测试
- 位置：`__tests__` 目录
- 框架：Vitest
- 命令：`npm run test`

### 集成测试
- 测试 API 端点
- 测试数据流
- 命令：`npm run test:integration`

### 手动测试检查表

- [ ] 所有标签页可正常切换
- [ ] 主题切换生效
- [ ] 色卡预设应用成功
- [ ] 自定义颜色保存
- [ ] 后端健康检查正常
- [ ] PWA 指示器显示正确
- [ ] 响应式设计在各尺寸正常显示
- [ ] Service Worker 已注册
- [ ] 离线模式可访问
- [ ] 文档同步成功
- [ ] FFmpeg 转码功能正常
- [ ] 定时任务执行正常

## 📚 文档和指南

| 文档 | 内容 |
|------|------|
| `CLAUDE.md` | 本文件 - Claude 开发指南 |
| `COMPLETE_ARCHITECTURE_GUIDE.md` | 完整架构设计指南 (1,946 行) |
| `DOCUMENTATION_INDEX.md` | 文档导航索引 (489 行) |
| `QUICK_FEATURE_REFERENCE.md` | 功能快速参考 (646 行) |
| `LEARNING_GUIDE.md` | 项目架构和开发指南 (1,346 行) |
| `QUICK_REFERENCE.md` | 快速参考和代码片段 (458 行) |
| `PWA_DETECTION_GUIDE.md` | PWA 检测功能完整指南 (410 行) |
| `ISSUE_MANAGEMENT_DESIGN.md` | **Issue 管理系统设计说明书 (1,411 行)** |

## 🔐 安全注意事项

1. **路径验证** - 防止路径遍历攻击
   ```javascript
   // 检查文件路径是否在允许范围内
   const allowedDir = path.resolve('./docs')
   const filePath = path.resolve(allowedDir, userInput)
   if (!filePath.startsWith(allowedDir)) {
     throw new Error('Invalid path')
   }
   ```

2. **HTTPS** - 生产环境必须使用 HTTPS

3. **Service Worker** - 确保 Service Worker 只缓存安全资源

4. **环境变量** - 敏感信息使用 `.env` 文件

## 🐛 调试技巧

### 浏览器 DevTools

1. **查看 PWA 状态**
   - Applications → Manifest - 查看应用清单
   - Applications → Service Workers - 查看 Service Worker
   - Applications → Storage - 查看缓存

2. **模拟离线**
   - Network → Offline - 切换离线模式
   - 验证缓存内容可正常访问

3. **查看日志**
   - Console 中查看 `[boot]`, `[pwa]` 标记的日志

### 常见问题排查

**Q: PWA 指示器不显示**
- 检查 `public/manifest.webmanifest` 是否存在
- 检查 Service Worker 是否成功注册
- 查看 Console 中的错误信息

**Q: Service Worker 不生效**
- 确保使用 HTTPS（生产环境）
- 检查 `public/sw.js` 是否正确
- 清除浏览器缓存后重试

**Q: 标签页加载缓慢**
- 检查网络连接
- 查看 Network 标签是否有卡住的请求
- 检查后端是否正常运行

## 🚀 部署和发布

### 开发环境

```bash
npm run dev          # 启动开发服务器
cd server && npm start  # 启动后端服务
```

### 生产环境

```bash
npm run build        # 构建前端
npm run preview      # 预览生产构建
```

### PWA 发布

1. 确保 HTTPS 配置
2. 验证 `manifest.webmanifest` 配置
3. 测试 Service Worker 功能
4. 在应用市场发布（可选）

## 📞 获取帮助

- 查看 `CLAUDE.md` 了解项目结构和开发指南（本文件）
- 查看 `COMPLETE_ARCHITECTURE_GUIDE.md` 了解完整架构设计
- 查看 `QUICK_FEATURE_REFERENCE.md` 获取功能快速参考
- 查看 `LEARNING_GUIDE.md` 了解项目架构
- 查看 `QUICK_REFERENCE.md` 获取代码示例
- 查看 `PWA_DETECTION_GUIDE.md` 了解 PWA 功能
- 查看 `ISSUE_MANAGEMENT_DESIGN.md` 了解 Issue 管理系统
- 运行 `/help` 获取 Claude Code 帮助

## 🎯 Issue 管理系统快速开始

### 功能概览

Issue 管理系统是一个类似 GitHub Issues 的完整问题跟踪平台，包含：

- **基础功能** - Issue CRUD、状态流转、优先级管理
- **协作功能** - 评论、@提及、指派、关注者
- **高级功能** - 看板视图、里程碑、标签、时间追踪
- **分析功能** - 统计图表、活动日志、工作量分布

### 开发实施步骤

**第一阶段：基础设施（1-2 周）**
1. 数据库表创建（8 个表）
2. 后端 API 实现（17 个端点）
3. 前端列表和详情页面
4. 基础的创建和编辑功能

**第二阶段：协作功能（1 周）**
1. 评论系统（Markdown 编辑、删除、引用）
2. 标签和里程碑管理
3. 用户指派和关注
4. 活动日志记录

**第三阶段：高级功能（1-2 周）**
1. 看板视图（拖拽管理）
2. 高级搜索和筛选
3. 时间追踪和统计
4. 批量操作

**第四阶段：优化和集成（1 周）**
1. 性能优化（虚拟滚动、缓存）
2. WebSocket 实时更新
3. 第三方集成（GitHub、GitLab）
4. 移动端优化

### 详细参考

- **完整设计文档** - 见 `ISSUE_MANAGEMENT_DESIGN.md` (1,411 行)
  - 包含所有功能设计、API 规范、数据库设计、前端组件结构
  - 有故障排除、性能优化、安全考虑、测试清单

---

**最后更新：** 2026-03-02
**主要功能完成情况：** 100%（设计完成）
**代码行数：** ~20,000+ 行（含文档）
**提交记录：** 130+ 个
**设计文档：** 8 份（包含新增的 Issue 管理系统设计）
