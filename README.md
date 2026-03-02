# Vue 学习参考应用

> 一个功能完整的 Vue 3 学习参考平台，集成多个专业工具和知识管理系统，包含 **46 个页面模块**、**27 个 API 接口**、**20+ 数据库表**。

## 🎯 核心特性

✨ **完整的流程管理系统**
  - 拖拽可视化编辑器（支持 6 种节点类型）
  - 参数传递和数据映射（4 种参数来源）
  - WebSocket 实时执行监控
  - 自动化规则系统（支持 Cron 定时）

📚 **完善的知识管理**
  - Wiki 知识库（词条、版本控制、段落注解、全文搜索）
  - 文档中心（自动扫描、学习路径排序、版本检测）
  - 支持 Markdown、PDF、CSV 导入导出

🛠️ **丰富的工具集成**
  - Git 分支管理和可视化
  - FFmpeg 视频处理（转码、剪辑、元数据提取）
  - Docker 容器管理
  - 在线终端执行

🎨 **完整的主题系统**
  - 6 个预设主题 + 25 个色卡预设
  - 自定义颜色调整
  - 字体缩放（85%-125%）
  - 响应式设计（桌面、平板、手机）

🔐 **企业级安全和性能**
  - JWT 令牌认证 + 角色权限管理
  - 性能监控面板（FCP、FID、p50/p95 统计）
  - WebSocket 实时推送
  - PWA 离线支持

## 📁 项目结构

```
vue-learning-app/
├── src/
│   ├── pages/                     # 46 个功能页面
│   │   ├── HomePage.vue           # 首页
│   │   ├── workflow/              # 工作流管理（8个页面）
│   │   │   ├── FlowDiagramEditor.vue    # 拖拽编辑器 (3372 行)
│   │   │   ├── FlowInstances.vue       # 执行追踪
│   │   │   ├── FlowTracking.vue        # 实时追踪
│   │   │   └── ...
│   │   ├── WikiCenter.vue              # Wiki 知识库
│   │   ├── DocumentationCenter.vue      # 文档中心
│   │   ├── VideoManager.vue            # 视频管理
│   │   ├── GitBranchManager.vue        # Git 分支
│   │   ├── admin/                      # 系统管理
│   │   │   ├── MenuManagement.vue      # 菜单管理
│   │   │   ├── RoleManagement.vue      # 角色管理
│   │   │   └── UserAdminConsole.vue    # 用户管理
│   │   └── ... (38 个其他页面)
│   ├── components/                # 52 个可复用组件
│   │   ├── Header.vue             # 应用头部
│   │   ├── flow-editor/           # 流程编辑器组件
│   │   ├── article/               # 文章阅读组件
│   │   └── ...
│   ├── utils/
│   │   ├── api.js                 # API 客户端（缓存、离线队列）
│   │   ├── pwa.js                 # PWA 检测工具
│   │   ├── websocket.js           # WebSocket 客户端
│   │   └── ...
│   ├── App.vue                    # 应用主组件
│   ├── main.js                    # 应用入口
│   └── style.css                  # 全局样式
│
├── server/                        # 后端服务 (Express.js)
│   ├── index.js                   # 服务器入口
│   ├── routes/                    # 27 个 API 路由
│   │   ├── flows.js               # 流程 API (734 行)
│   │   ├── wiki.js                # Wiki API
│   │   ├── ffmpeg.js              # FFmpeg API
│   │   ├── docs.js                # 文档 API
│   │   └── ... (23 个其他路由)
│   ├── websocket.js               # WebSocket 服务器
│   ├── services/                  # 业务逻辑
│   │   ├── conditionEvaluator.js  # 条件表达式引擎
│   │   ├── parameterEvaluator.js  # 参数评估引擎
│   │   └── executionEventEmitter.js # 事件发射器
│   ├── init-db.js                 # 数据库初始化
│   └── package.json               # 后端依赖
│
├── docs/                          # 项目文档 (10+个)
│   ├── COMPLETE_ARCHITECTURE_GUIDE.md    # 完整架构设计 ⭐
│   ├── DOCUMENTATION_INDEX.md            # 文档导航索引 ⭐
│   ├── QUICK_FEATURE_REFERENCE.md        # 功能速查表 ⭐
│   └── ... (7 个其他文档)
│
├── public/                        # 静态资源
│   ├── manifest.webmanifest       # PWA 清单
│   ├── sw.js                      # Service Worker
│   ├── offline.html               # 离线页面
│   └── icons/                     # PWA 图标
│
├── CLAUDE.md                      # 开发指南
├── COMPLETE_ARCHITECTURE_GUIDE.md # ⭐ 完整功能设计文档
├── DOCUMENTATION_INDEX.md         # ⭐ 文档导航中心
├── QUICK_FEATURE_REFERENCE.md     # ⭐ 功能速查表
├── package.json                   # 前端依赖
├── vite.config.js                # Vite 配置
└── README.md                      # 本文件
```

> ⭐ 新增：3 份完整的功能设计文档（共 3,081 行）

## 🚀 快速开始

### 1. 安装依赖

```bash
cd /Users/mac/vue-learning-app
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

浏览器会自动打开 `http://localhost:5173`

### 3. 构建生产版本

```bash
npm run build
```

生产文件会输出到 `dist/` 目录

## 🛠️ 技术栈

- **Vue 3** - 现代的 JavaScript 框架
- **Vite** - 闪电般的构建工具
- **CSS 3** - 现代样式方案
- **JavaScript ES6+** - 最新的 JavaScript 标准

## 📊 功能模块总览

### 🚀 核心功能模块

| 模块 | 页面数 | 关键功能 |
|------|--------|---------|
| **工作流管理** | 8 | 拖拽编辑、执行追踪、自动化规则、参数映射 |
| **知识管理** | 3 | Wiki 词条、文档中心、搜索和版本控制 |
| **视频管理** | 2 | FFmpeg 转码、元数据提取、缩略图 |
| **系统管理** | 3 | 用户管理、菜单管理、角色权限 |
| **工具集成** | 10 | Git、Docker、终端、数据库、微博爬虫 |
| **参考资料** | 8 | Spring、Excel、聊天记录、调度任务等 |
| **其他模块** | 12 | 日志中心、文档中心、个人主页等 |

### 💎 核心功能特性

#### 1. 流程管理系统
- **拖拽编辑器** - 支持 6 种节点类型（开始、用户任务、3种网关、结束）
- **参数传递** - 4 种参数来源（常量、变量、表达式、前一步输出）
- **实时执行** - WebSocket 实时监控，无需刷新
- **自动化规则** - Cron 表达式定时执行，支持事件和条件触发
- **数据映射** - 20+ 内置函数，参数自动评估

#### 2. Wiki 知识库
- **完整的词条管理** - 创建、编辑、发布版本
- **版本控制** - 历史版本查看、恢复、对比
- **全文搜索** - 精准评分排序（标题权重最高）
- **段落注解** - Word 风格的侧栏注解
- **阅读增强** - 全屏阅读、页内搜索、高亮
- **分类标签** - 支持自定义分类和标签

#### 3. 文档中心
- **自动扫描** - 递归扫描 `docs/` 目录
- **学习路径** - 自动排序（README > GUIDE > TUTORIAL）
- **版本检测** - 识别 `v1.0`, `@v2.1` 等版本号
- **全文搜索** - 基于内容、文件名、修改时间的评分排序
- **安全防护** - 防止路径遍历攻击

#### 4. 视频处理
- **格式转码** - 支持 H.264、VP9、AV1 等编码
- **视频剪辑** - 指定起始时间和时长
- **元数据提取** - 分辨率、帧率、时长、文件大小
- **缩略图生成** - 支持自定义位置
- **后台队列** - 异步处理，轮询进度

#### 5. 认证和权限
- **JWT 认证** - 7 天有效期，自动刷新
- **角色权限** - 基于角色和权限的访问控制
- **数据隔离** - 各用户数据完全隔离
- **离线支持** - 离线操作队列，恢复在线后自动同步

#### 6. 性能监控
- **关键指标** - FCP、FID、初始化完成、响应时间
- **实时统计** - p50、p95 百分位数
- **性能面板** - 查看详细日志和优化建议
- **性能优化** - 代码分割、缓存策略、虚拟滚动

## 🏗️ 技术架构

### 前端技术栈

| 技术 | 用途 | 版本 |
|------|------|------|
| Vue 3 | 前端框架 | 3.3+ |
| Vite | 构建工具 | 最新 |
| Vue Flow | 拖拽编辑器 | 最新 |
| ECharts | 图表可视化 | 最新 |
| Marked | Markdown 渲染 | 17.0+ |

### 后端技术栈

| 技术 | 用途 |
|------|------|
| Express.js | Web 服务器 |
| MySQL 5.7+ | 数据库 |
| FFmpeg | 视频处理 |
| Node.js | 运行环境 |
| WebSocket | 实时通信 |

### 核心特性

**分层架构**：UI 层 → 状态层 → 业务逻辑层 → 数据持久化层

**设计模式**：MVC、观察者模式、缓存策略、渐进增强

**安全机制**：JWT 认证、参数化查询、路径防护、数据验证

**性能优化**：代码分割、请求缓存、虚拟滚动、异步队列

## 💾 数据库设计

### 核心表结构

| 表名 | 用途 | 关键字段 |
|------|------|---------|
| `users` | 用户账户 | id, username, password, roles, permissions |
| `flows` | 流程定义 | id, name, nodes, edges, variables |
| `flow_steps` | 流程步骤 | id, flow_id, name, type, config |
| `flow_connections` | 节点连线 | id, source_id, target_id, condition |
| `flow_executions` | 执行实例 | id, flow_id, status, started_at, completed_at |
| `flow_execution_steps` | 执行步骤 | id, execution_id, step_id, status, duration |
| `flow_variables` | 流程变量 | id, flow_id, name, type, default_value |
| `flow_step_parameters` | 步骤参数 | id, step_id, param_name, source_type, value |
| `flow_automation_rules` | 自动化规则 | id, flow_id, trigger_type, schedule, enabled |
| `wiki_articles` | Wiki 词条 | id, title, category, tags, content, view_count |
| `wiki_versions` | Wiki 版本 | id, article_id, version_id, content, author |
| `wiki_annotations` | Wiki 注解 | id, article_id, range_start, range_end, content |
| `videos` | 视频元数据 | id, filename, duration, width, height, filesize |
| `ffmpeg_jobs` | 转码任务 | id, video_id, status, progress, output_path |

### 表关系设计

```
users (1) ────┬──── (N) flows
              ├──── (N) wiki_articles
              └──── (N) ffmpeg_jobs

flows (1) ───┬──── (N) flow_steps
             ├──── (N) flow_connections
             ├──── (N) flow_executions
             ├──── (N) flow_variables
             └──── (N) flow_automation_rules

flow_steps (1) ───┬──── (N) flow_execution_steps
                  └──── (N) flow_step_parameters

wiki_articles (1) ───┬──── (N) wiki_versions
                     └──── (N) wiki_annotations
```

## 📖 文档导航

### ⭐ 完整功能设计文档（新增）

本项目包含 **3 份完整的功能设计文档**（共 3,081 行），涵盖所有功能的实现原理和代码示例：

#### 📘 [COMPLETE_ARCHITECTURE_GUIDE.md](COMPLETE_ARCHITECTURE_GUIDE.md)
**完整功能体系架构设计文档（1946 行）**

包含内容：
- 🏗️ 分层架构和核心设计模式
- 💻 46 个页面组件的详细实现
- 🔌 27 个 API 端点的完整文档
- 💾 20+ 数据库表的 ER 关系图
- 🔄 HTTP 和 WebSocket 数据流分析
- 🔐 完整的安全机制（认证、授权、防护）
- ⚡ 前后端性能优化指南
- 📋 测试清单和故障排除
- 🚀 部署和扩展建议

**适合人群**：需要全面了解项目架构的开发者

---

#### 📗 [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md)
**快速导航索引中心（489 行）**

包含内容：
- 🎯 5 分钟快速开始指南
- 📊 22 个功能模块的快速查询表
- 📞 快速导航和相关链接
- ❓ 常见问题和故障排除
- 📈 项目统计数据

**适合人群**：需要快速查找特定功能的开发者

---

#### 📙 [QUICK_FEATURE_REFERENCE.md](QUICK_FEATURE_REFERENCE.md)
**功能速查表（646 行）**

包含内容：
- 🔍 10 个核心功能的速查表
- 💡 关键概念和实现示例
- 🔌 API 端点列表（27个）
- 💾 数据库表速查（20+表）
- 🛡️ 安全和性能检查清单

**适合人群**：需要快速查询 API 和参数的开发者

---

### 📚 其他文档

- **[CLAUDE.md](CLAUDE.md)** - 项目开发指南和架构说明
- **[QUICK_REFERENCE.md](docs/QUICK_REFERENCE.md)** - 功能快速参考
- **[PWA_DETECTION_GUIDE.md](docs/PWA_DETECTION_GUIDE.md)** - PWA 技术详解
- **[WIKI_DOCUMENTATION_GUIDE.md](docs/WIKI_DOCUMENTATION_GUIDE.md)** - Wiki 功能完整指南

### 🎯 推荐阅读路径

1. **5 分钟快速了解** → [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md)
2. **30 分钟深入学习** → [COMPLETE_ARCHITECTURE_GUIDE.md](COMPLETE_ARCHITECTURE_GUIDE.md)
3. **开发时快速查询** → [QUICK_FEATURE_REFERENCE.md](QUICK_FEATURE_REFERENCE.md)
4. **详细功能说明** → 各功能对应的专题文档

## 🎓 技术亮点

### 核心创新点

1. **拖拽流程编辑器** - 基于 Vue Flow，支持 6 种节点和条件表达式
2. **参数传递引擎** - 4 种参数来源 + 20+ 内置函数
3. **WebSocket 实时推送** - 房间隔离、自动重连、心跳检测
4. **完整的 Wiki 系统** - 版本控制、段落注解、全文搜索
5. **性能监控面板** - 实时统计 FCP、FID、p50/p95 指标

### 架构优势

- ✅ **分层架构** - UI 层、状态层、业务逻辑层、数据层清晰分离
- ✅ **模块化设计** - 46 个独立的功能页面，高度可复用
- ✅ **完整的安全机制** - JWT 认证、权限控制、数据验证、防护防具
- ✅ **性能优化** - 代码分割、缓存策略、虚拟滚动、异步队列
- ✅ **可扩展性** - 易于添加新功能、新 API、新数据库表

## 📈 项目统计

| 指标 | 数值 |
|------|------|
| 总代码行数 | 21,000+ 行 |
| 前端代码 | 10,000+ 行 (Vue 3) |
| 后端代码 | 11,000+ 行 (Express.js) |
| 文档代码 | 3,081 行 (新增) |
| 页面组件 | 46 个 |
| API 端点 | 27 个 |
| 数据库表 | 20+ 个 |
| 主题配色 | 31 种 |
| Git 提交 | 127+ 个 |

## 🚀 快速开始

### 前端开发

```bash
# 1. 安装依赖
npm install

# 2. 启动开发服务器
npm run dev

# 访问 http://localhost:5173
```

### 后端服务

```bash
# 1. 进入 server 目录
cd server

# 2. 安装依赖
npm install

# 3. 配置数据库
# 编辑 .env 文件，配置 MySQL 连接信息

# 4. 初始化数据库
npm run init-db

# 5. 启动服务器
npm start

# 服务运行在 http://localhost:4001
```

### 生产构建

```bash
# 前端构建
npm run build

# 后端启动（生产环境）
NODE_ENV=production npm start
```

## 📝 开发指南

### 添加新页面

1. **创建页面组件**
   ```vue
   <!-- src/pages/NewPage.vue -->
   <template>
     <div class="new-page">
       <!-- 页面内容 -->
     </div>
   </template>

   <script>
   export default {
     name: 'NewPage',
     data() { return { } },
     mounted() { }
   }
   </script>

   <style scoped>
     .new-page { }
   </style>
   ```

2. **在 App.vue 注册**
   ```javascript
   // 在 tabLoaders 中添加
   newpage: () => import('./pages/NewPage.vue'),

   // 在 tabs 数组中添加
   { id: 'newpage', label: '新页面' }
   ```

### 添加新 API

1. **创建路由文件** `server/routes/newfeature.js`
2. **在 server/index.js 注册路由**
3. **在 src/utils/api.js 添加客户端方法**

### 数据库操作

```bash
# 初始化数据库
npm run init-db

# 重置数据库（谨慎使用）
npm run reset-db
```

## 🎨 主题系统

项目支持完整的主题定制：

```javascript
// 6 个预设主题
themes: ['blue', 'green', 'purple', 'orange', 'pink', 'dark']

// 25 个色卡预设
colorPresets: [
  { id: 'ocean', name: '海洋', primary: '#0EA5E9', ... },
  { id: 'forest', name: '森林', primary: '#10B981', ... },
  // ... 更多色卡
]

// CSS 变量注入
--app-primary    /* 主色 */
--app-text       /* 文字色 */
--app-bg         /* 背景色 */
--app-border     /* 边框色 */
// ... 40+ 个 CSS 变量
```

## 🐛 故障排除

### 常见问题

**问题 1：WebSocket 连接失败**
- 确保后端服务正常运行
- 检查 WebSocket 端口（默认 4001）是否开放
- 查看浏览器控制台是否有错误信息

**问题 2：视频转码失败**
- 确保安装了 FFmpeg：`ffmpeg -version`
- 检查视频文件格式是否支持
- 查看后端日志获取详细错误

**问题 3：Wiki 搜索无结果**
- 确认文档已同步：调用 `/api/docs/sync`
- 检查搜索关键词拼写
- 查看数据库是否有数据

### 调试技巧

```bash
# 查看后端日志
tail -f server.log

# 检查数据库连接
mysql -h localhost -u root -p

# 网络诊断
curl http://localhost:4001/api/health
```

## 📞 获取帮助

1. **查看文档**
   - [COMPLETE_ARCHITECTURE_GUIDE.md](COMPLETE_ARCHITECTURE_GUIDE.md) - 完整架构
   - [QUICK_FEATURE_REFERENCE.md](QUICK_FEATURE_REFERENCE.md) - 快速查询
   - [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md) - 文档导航

2. **检查源代码**
   - 相关注释和代码示例
   - 类型定义和接口说明

3. **查看日志**
   - 浏览器控制台（前端错误）
   - 服务器日志（后端错误）
   - 数据库日志（数据库错误）

## 📄 许可证

MIT License

---

## 🔗 相关资源

- 📖 [Vue 3 官方文档](https://vuejs.org)
- 📖 [Express.js 官方文档](https://expressjs.com)
- 📖 [Vue Flow 文档](https://vueflow.dev)
- 📖 [ECharts 文档](https://echarts.apache.org)
- 📖 [MySQL 官方文档](https://dev.mysql.com)

---

**祝你开发愉快！🎉**

> **最后更新**：2026年3月2日
> **版本**：2.0.0
> **维护人**：Claude Code
