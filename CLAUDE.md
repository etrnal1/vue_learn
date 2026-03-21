# Vue Learning App - Claude 开发指南

## gstack
Use /browse from gstack for all web browsing. Never use mcp__claude-in-chrome__* tools.
Available skills: /office-hours, /plan-ceo-review, /plan-eng-review, /plan-design-review, /design-consultation, /review, /ship, /browse, /qa, /qa-only, /design-review, /setup-browser-cookies, /retro, /investigate, /document-release, /codex, /careful, /freeze, /guard, /unfreeze, /gstack-upgrade.
If gstack skills aren't working, run `cd ~/.claude/skills/gstack && ./setup` to build the binary and register skills.

> 项目架构、关键文件、开发规范和工作流指南

## 📋 项目概览

**Vue Learning App** 是一个功能丰富的 Vue 3 学习参考应用，提供多个专业工具模块和完整的知识管理系统。

### 🎯 核心功能

- 14+ 个功能标签页（Spring、Excel、聊天、ITSM、Git、视频、音乐、Wiki、Issue管理等）
- FFmpeg 视频处理工具
- PWA 离线访问支持
- 完整的主题系统（6 个主题 + 25 个色卡预设）
- 响应式设计（桌面、平板、手机）

## 📁 项目结构

```
vue-learning-app/
├── src/
│   ├── pages/                  # 功能页面
│   │   ├── HomePage.vue
│   │   ├── workflow/          # 流程管理系统
│   │   └── ... (其他页面)
│   ├── components/            # 可复用组件
│   ├── utils/
│   │   ├── api.js             # API 客户端
│   │   └── pwa.js             # PWA 工具
│   ├── App.vue               # 主应用
│   ├── main.js               # 入口
│   └── style.css             # 全局样式
│
├── server/
│   ├── index.js              # 服务器入口
│   ├── routes/               # API 路由
│   └── data/                 # 数据存储
│
├── public/                   # PWA 静态资源
├── docs/                     # 文档
├── CLAUDE.md                 # 本文件
└── package.json
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

## 🗂️ 关键文件速览

| 文件 | 作用 |
|------|------|
| `src/App.vue` | 主应用组件，主题和标签页管理 |
| `src/main.js` | 应用入口，PWA 初始化 |
| `src/utils/api.js` | API 客户端 |
| `src/utils/pwa.js` | PWA 工具函数 |
| `server/index.js` | 服务器入口 |
| `server/routes/*.js` | API 路由 |
| `public/manifest.webmanifest` | PWA 清单 |
| `public/sw.js` | Service Worker |

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

## 📚 文档导航

| 文档 | 用途 |
|------|------|
| `CLAUDE.md` | 开发指南（本文件） |
| `COMPLETE_ARCHITECTURE_GUIDE.md` | 架构设计详情 |
| `LEARNING_GUIDE.md` | 学习路径指南 |
| `PWA_DETECTION_GUIDE.md` | PWA 功能说明 |
| `ISSUE_MANAGEMENT_DESIGN.md` | Issue 系统设计 |

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

## 💡 快速启动

```bash
# 前端开发
npm run dev

# 后端服务
cd server && npm start
```

## 📞 获取帮助

- 查看对应的详细文档（见上方导航）
- 运行 `/help` 获取 Claude Code 帮助
