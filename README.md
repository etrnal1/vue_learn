# Vue Learning App - Vue 3 学习参考应用

一个使用 **Vue 3 + Vite + Express** 构建的功能丰富的学习参考平台，提供多个专业工具模块和完整的知识管理系统。

🚀 **持续演进** - 采用渐进式增强设计，支持离线使用和动态扩展。

## 🎯 核心特性

- ✨ **13 个主功能标签页** - Spring 参考、Excel 参考、聊天记录、IT 服务管理、Git 管理、视频管理、音乐管理、相册管理、Wiki、日志中心、微博抓取、定时任务、文档中心
- ⚡ **Vite 高速开发** - 闪电般的热更新体验
- 🎬 **FFmpeg 视频处理工具** - 转码、剪辑、元数据提取等功能
- 📚 **完整的文档中心** - Markdown 同步、全文搜索、版本管理、学习路径
- 🌐 **PWA 支持** - 离线访问、Service Worker 缓存、应用清单
- 🎨 **完整的主题系统** - 6 个预设主题 + 25 个色卡预设
- 📱 **响应式设计** - 完美适配桌面、平板、手机各种尺寸
- 🔐 **安全第一** - 路径验证、防止注入攻击

## 📁 项目结构

```
vue-learning-app/
├── src/                          # 前端源代码
│   ├── main.js                   # 应用入口（PWA 初始化）
│   ├── App.vue                   # 应用主组件（主题、标签页管理）
│   ├── style.css                 # 全局样式
│   ├── pages/                    # 功能页面（24 个）
│   │   ├── HomePage.vue          # 首页
│   │   ├── SpringReference.vue   # Spring 参考
│   │   ├── ExcelReference.vue    # Excel 参考
│   │   ├── ChatHistory.vue       # 聊天记录
│   │   ├── GitBranchManager.vue  # Git 分支管理
│   │   ├── VideoManager.vue      # 视频管理（支持 FFmpeg）
│   │   ├── MusicManager.vue      # 音乐管理
│   │   ├── AlbumManager.vue      # 相册管理
│   │   ├── WikiCenter.vue        # Wiki 知识库
│   │   ├── LogCenter.vue         # 日志中心
│   │   ├── WeiboCrawler.vue      # 微博抓取
│   │   ├── ScheduledTaskManager.vue # 定时任务
│   │   ├── DocumentationCenter.vue  # 文档中心
│   │   ├── FfmpegTool.vue        # FFmpeg 工具
│   │   └── ...
│   ├── components/               # 可复用组件
│   │   ├── Header.vue            # 头部组件
│   │   └── ...
│   └── utils/                    # 工具函数
│       ├── api.js                # API 客户端
│       └── pwa.js                # PWA 检测工具
│
├── server/                       # 后端 Express 服务
│   ├── index.js                  # 服务器入口
│   └── routes/                   # API 路由（15+ 个）
│       ├── docs.js               # 文档同步 API
│       ├── wiki.js               # Wiki API
│       ├── videos.js             # 视频管理 API
│       ├── ffmpeg.js             # FFmpeg 处理 API
│       ├── schedulerTasks.js     # 定时任务 API
│       └── ...
│
├── public/                       # 静态资源
│   ├── manifest.webmanifest      # PWA 清单
│   ├── sw.js                     # Service Worker
│   ├── offline.html              # 离线页面
│   └── icons/                    # PWA 图标
│
├── docs/                         # 项目文档
│   ├── LEARNING_GUIDE.md         # 学习指南
│   ├── QUICK_REFERENCE.md        # 快速参考
│   └── PWA_DETECTION_GUIDE.md    # PWA 检测指南
│
├── CLAUDE.md                     # Claude 开发指南
├── package.json                  # 项目配置
├── vite.config.js               # Vite 配置
└── .gitignore
```

## 🚀 快速开始

### 前置要求

- Node.js >= 16.0
- npm 或 yarn
- FFmpeg（可选，用于视频处理）

### 1. 安装依赖

```bash
# 安装前端依赖
npm install

# 安装后端依赖
cd server && npm install && cd ..
```

### 2. 启动开发环境

```bash
# 终端 1: 启动前端开发服务器
npm run dev

# 终端 2: 启动后端服务
cd server && npm start
```

前端会自动打开 `http://localhost:5173`
后端服务运行在 `http://localhost:3000`

### 3. 构建生产版本

```bash
npm run build
```

生产文件会输出到 `dist/` 目录

## 🛠️ 技术栈

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

### 特性技术

- **PWA** - Service Worker + Web App Manifest + 离线支持
- **主题系统** - CSS 变量 + 计算型颜色混合
- **API** - RESTful 架构
- **存储** - localStorage + MySQL

## 📊 功能模块说明

### 📚 参考资料

#### Spring 参考
- 📚 **注解参考** - 10+ 核心注解讲解
  - 响应式搜索
  - 难度分级筛选
  - 详细用法说明
- 🔄 **核心流程** - 3 种重要流程可视化
  - 启动流程
  - 请求处理流程
  - Bean 生命周期

#### Excel 参考
- 📐 数学函数 - SUM、AVERAGE、MAX 等
- 🔀 逻辑函数 - IF、AND、OR 等
- 🔍 查找函数 - VLOOKUP、INDEX 等
- ✏️ 文本函数 - CONCATENATE、LEFT 等
- 📅 日期函数 - TODAY、NOW 等

### 🎬 媒体管理

#### 视频管理
- 视频库、播放器、本地扫描三分区
- 支持播放/暂停、快进后退、全屏、下载
- 自动优化（FFmpeg faststart）
- 流式播放（Range 请求）

#### 音乐管理
- 音乐库、播放器、本地扫描
- 支持播放/暂停、快进后退、下载
- 流式播放支持

#### 相册管理
- 图片库浏览
- 分类管理
- 缩略图预览

### 📖 知识管理

#### 文档中心
- 📄 Markdown 同步支持
- 🔍 全文搜索和评分
- 📌 学习路径排序
- 📋 版本检测
- 🛡️ 路径遍历防护

#### Wiki 知识库
- 分类管理
- 标签系统
- 快速搜索
- 详细内容展示

### 🔧 工具和管理

#### Git 分支管理
- 分支列表
- 分支切换
- 提交历史

#### IT 服务管理
- 工单管理
- 服务分类
- 状态跟踪

#### 定时任务
- 任务创建和删除
- 执行状态跟踪
- 任务日志查询
- Cron 表达式支持

#### 微博抓取
- 目标爬取
- 数据解析
- 内容存储

### 📊 日志中心
- 事件记录和查询
- 慢加载高亮
- Top10 统计
- 性能分析

## 🎨 主题和外观系统

### 6 个预设主题
- 🔵 经典蓝 - 清爽、专业
- 🟢 森林绿 - 自然、舒适
- 🟣 紫色 - 优雅、神秘
- 🟠 暖阳 - 温暖、活力
- 🩷 樱花粉 - 甜美、温柔
- ⬛ 深空黑 - 酷炫、护眼

### 25 个色卡预设
海洋、森林、暖阳、玫瑰、紫晶、薄荷、柠檬、樱桃、天空、草地、火焰、冰川、沙漠、雨林、极光等...

### 自定义功能
- 字体大小缩放 (85%-125%)
- 颜色微调工具
- 实时预览
- 自动保存设置

## 🌐 PWA 功能

### 离线支持
- ✅ Service Worker 缓存
- ✅ 离线模式访问
- ✅ 缓存策略优化
- ✅ 后台同步

### 应用功能
- 📱 独立窗口运行
- 📱 快捷方式启动
- 📱 离线页面
- 📱 应用清单配置

### PWA 检测
在应用头部实时显示：
- 📱 PWA 已安装（绿色）- 应用以独立模式运行
- 📱 PWA 就绪（蓝色）- 支持 PWA 安装
- 💾 后端状态 - 30 秒间隔健康检查

## 💡 媒体模块技术细节

### 本地扫描与播放链路
- 前端通过 `POST /api/videos/scan`、`POST /api/music/scan` 扫描本地绝对路径目录
- 扫描结果返回 `streamUrl` / `downloadUrl`，导入后可直接在页面播放与下载

### 流式播放与大文件支持
- 后端 `GET /api/videos/stream`、`GET /api/music/stream` 支持 `Range` 请求
- 视频流采用分片策略（首段更大、后续分片）降低首播等待，适配大文件快进拖动
- 按文件扩展名返回正确 `Content-Type`，提升浏览器兼容性

### 慢加载观测方法
- `metadata_loaded`：用于判断"拿到元数据"耗时
- `play_start`：用于判断"可开始播放"总耗时
- 经验阈值：`play_start > 10000ms` 可判定为慢加载，优先排查文件与磁盘 I/O

### 自动优化（点击播放触发）
- `POST /api/videos/optimize`：本地视频可在播放前自动执行 `ffmpeg -movflags +faststart`
- 优化文件缓存到系统临时目录，首次可能等待，后续同文件复用缓存并加速首播
- 若 `ffmpeg` 不可用，会回退原始播放并记录 `optimize_error`

### 输入与运行防呆
- 手工添加视频时拦截"把本地目录当 URL"误填，提示改用"本地扫描"
- 播放本地视频前检查后端健康状态，后端不可用时提示先启动服务

### 依赖与启动要求
- 本地媒体播放需前后端同时运行（`npm run dev`）
- 自动优化依赖 `ffmpeg` 安装可用（命令行可执行 `ffmpeg -version`）

## 💡 关键文件说明

### 前端核心文件

#### `src/App.vue` (969 行)
**作用：** 应用主组件，管理标签页导航、主题切换、色卡预设、字体缩放
- 6 个预设主题
- 25 个色卡预设
- 字体大小范围 85%-125%
- 自定义颜色微调
- 14 个标签页管理
- 预加载和缓存控制

#### `src/components/Header.vue` (215 行)
**作用：** 应用头部，显示版本、构建时间、后端状态、PWA 状态
- PWA 检测指示
- 后端健康检查（30 秒间隔）
- 状态详情展开

#### `src/main.js` (47 行)
**作用：** 应用入口，初始化 PWA 和事件监听
- 全局错误处理
- Service Worker 注册
- PWA 状态检测

#### `src/utils/pwa.js` (200+ 行)
**作用：** PWA 检测和管理工具库
- PWA 状态检测
- 安装提示管理
- 更新检查

#### `src/utils/api.js`
**作用：** API 客户端，封装所有后端请求
- 文档 API
- 视频 API
- Wiki API
- Git API
- 聊天 API 等

### 后端核心文件

#### `server/index.js`
**作用：** Express 服务器入口，路由注册、CORS 配置

#### `server/routes/docs.js` (300+ 行)
**作用：** 文档中心 API - Markdown 同步、搜索、版本管理
- `GET /api/docs/list` - 获取文档列表
- `GET /api/docs/content` - 获取文档内容
- `POST /api/docs/sync` - 同步项目文档
- `GET /api/docs/search` - 全文搜索

#### `server/routes/ffmpeg.js`
**作用：** FFmpeg 视频处理 API
- 视频转码
- 视频剪辑
- 元数据提取
- 缩略图生成
- 字幕提取

#### `server/routes/videos.js`
**作用：** 视频管理 API
- 视频列表
- 视频上传
- 视频处理
- 流媒体支持

### PWA 相关文件

#### `public/manifest.webmanifest`
**作用：** PWA 应用清单

#### `public/sw.js`
**作用：** Service Worker - 离线支持和缓存管理

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
在 `src/App.vue` 中的 `themes` 数组修改

#### 方式 2：添加色卡预设
在 `colorPresets` 数组添加新配置

#### 方式 3：自定义颜色
用户在应用中使用"最后微调"选项进行自定义颜色调整

### 修改 PWA 配置

编辑 `public/manifest.webmanifest`：
- 修改 `name`, `short_name`, `description`
- 调整 `theme_color`, `background_color`
- 更新 `icons` 路径

## 📝 代码规范

### Vue 组件规范
- 组件文件：PascalCase (如 `VideoManager.vue`)
- 方法：camelCase (如 `checkBackendHealth`)
- 常量：UPPER_SNAKE_CASE (如 `CACHE_VERSION`)

### Git 提交规范
**格式：** `<类型>: <描述>`

**类型：**
- `添加` - 新增功能或页面
- `更新` - 修改现有功能
- `修复` - 修复 bug
- `文档` - 文档更新
- `配置` - 配置变更

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

2. **HTTPS** - 生产环境必须使用 HTTPS（特别是 PWA）

3. **Service Worker** - 确保只缓存安全资源

4. **环境变量** - 敏感信息使用 `.env` 文件

## 🧪 测试

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

## 🔧 常见命令

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview

# 清理依赖
rm -rf node_modules
npm install
```

## 📝 开发建议

### 添加新功能的步骤：

1. **在 `src/pages/` 或 `src/components/` 中创建新组件**
   ```vue
   <template>
     <!-- 组件模板 -->
   </template>

   <script>
   export default {
     name: 'NewComponent'
   }
   </script>

   <style scoped>
     /* 组件样式 */
   </style>
   ```

2. **在 `App.vue` 中导入并使用**
   ```javascript
   import NewComponent from './pages/NewComponent.vue'
   ```

3. **在模板中使用**
   ```html
   <NewComponent v-if="activeTab === 'new'" />
   ```

## 🎨 样式系统

项目使用一致的色彩方案：
- **主色** - #667eea (紫蓝色)
- **辅色** - #10b981 (绿色)
- **强调** - #764ba2 (深紫色)
- **中立** - #666, #999 (灰色)

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

**Q: FFmpeg 处理出错**
- 确认已安装 FFmpeg：`ffmpeg -version`
- 检查文件权限
- 查看后端日志

## 📚 文档和指南

| 文档 | 内容 |
|------|------|
| `LEARNING_GUIDE.md` | 项目架构和开发指南 |
| `QUICK_REFERENCE.md` | 快速参考和代码片段 |
| `PWA_DETECTION_GUIDE.md` | PWA 检测功能完整指南 |
| `CLAUDE.md` | Claude 开发指南 |

## 📊 项目统计

| 指标 | 数值 |
|------|------|
| Vue 组件 | 52 个 |
| 页面模块 | 24 个 |
| 工具函数 | 3 个 |
| 后端路由 | 15+ 个 |
| 数据库表 | 15+ 个 |
| 主题配色 | 31 种 |
| 代码行数 | ~10,000+ 行 |
| 本地提交 | 34+ 个 |

## 📞 获取帮助

- 查看 `LEARNING_GUIDE.md` 了解项目架构
- 查看 `QUICK_REFERENCE.md` 获取代码示例
- 查看 `PWA_DETECTION_GUIDE.md` 了解 PWA 功能
- 查看 `CLAUDE.md` 了解开发指南
- 查看 Console 日志排查问题

## 📄 许可证

MIT License

---

**Enjoy Learning! 🎉**

**最后更新：** 2026-03-04
**项目主页特性完成情况：** 95%
河南郑州风景太好了
河南郑州风景太好了
