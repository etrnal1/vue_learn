# 本地知识库 PWA — 设计说明书

> **版本**: 1.0.0
> **创建日期**: 2026-03-17
> **维护人**: Claude Code
> **项目路径**: `/knowledge-base-pwa/`

---

## 1. 功能概述

本地知识库 PWA 是一款**离线优先**的知识管理应用，核心定位为 iPhone / Android 用户提供完全本地化的文档阅读和笔记管理体验。用户通过 Safari 访问一次后添加到主屏幕，即可脱离网络独立使用。

**核心价值**:
- **零服务器依赖** — 所有数据存储在设备 IndexedDB 中，无需后端
- **真正离线** — Service Worker 缓存全部静态资源，飞行模式可用
- **隐私安全** — 数据不上传任何服务器，支持密码锁屏
- **跨设备迁移** — JSON 备份 + iCloud Drive 定时同步

**目标用户**: 需要在手机上离线管理文档和笔记的个人用户，尤其是 iOS 用户。

---

## 2. 核心特性

### 知识库文档管理
- ✅ 支持导入 `.docx`（Word）、`.xlsx`（Excel）、`.pdf` 三种格式
- ✅ 全屏阅读器 — 进度条、文内搜索高亮（DOM TreeWalker）、上/下篇导航
- ✅ 全文搜索 — 覆盖文件名、Word 正文、Excel 单元格、PDF 文本
- ✅ 文件分享 — Web Share API 文件级分享，回退到剪贴板
- ✅ 单文件最大 50MB

### 个人笔记
- ✅ 笔记 CRUD（软删除），支持 Markdown 内容
- ✅ 分类管理（自动创建、颜色标记）
- ✅ 标签系统 + 标签云
- ✅ 星标收藏、过期时间
- ✅ 5 种排序方式 + 多维度筛选
- ✅ 数据统计（总数、字数、趋势图）
- ✅ 导出为 JSON / CSV / Markdown

### PWA 离线能力
- ✅ Service Worker 缓存优先策略
- ✅ 构建时资源注入（Vite 插件）
- ✅ iOS Safari 离线兼容（绝对 URL 缓存匹配）
- ✅ 用户可控的版本更新（菜单项触发）
- ✅ 离线诊断面板（HTTPS / SW / 缓存状态检测）

### 数据安全
- ✅ SHA-256 密码保护（加盐哈希）
- ✅ 一键导出/导入全量数据
- ✅ 定时自动备份到 iCloud Drive（可配置间隔）
- ✅ 合并导入 / 替换导入 两种恢复模式
- ✅ 持久化存储申请（防浏览器清理）

### UI/UX
- ✅ iOS 原生风格底部导航栏（4 标签 + 更多菜单）
- ✅ 毛玻璃效果（`backdrop-filter: blur`）
- ✅ iPhone 安全区适配（刘海 + Home Indicator）
- ✅ 响应式布局（手机单列 / 桌面多列）
- ✅ 禁止缩放、原生滚动手感

---

## 3. 技术架构

### 3.1 技术栈

| 层级 | 技术 | 版本 | 用途 |
|------|------|------|------|
| 框架 | Vue 3 | 3.5.13 | 响应式 UI |
| 构建 | Vite | 5.4.14 | 开发/打包 |
| 存储 | Dexie | 4.2.0 | IndexedDB 封装 |
| 文档解析 | mammoth | 1.11.0 | DOCX → HTML |
| 文档解析 | xlsx | 0.18.5 | Excel 解析 |
| 文档解析 | pdfjs-dist | 4.9.155 | PDF 文本提取 |
| 离线 | Service Worker | 原生 | 缓存管理 |
| 部署 | GitHub Pages | — | HTTPS 静态托管 |

### 3.2 项目结构

```
knowledge-base-pwa/
├── index.html                          # 入口 HTML（iOS PWA meta）
├── vite.config.js                      # Vite + 自定义 SW 注入插件
├── package.json                        # 依赖声明
├── public/
│   ├── sw.js                           # Service Worker（缓存策略）
│   ├── manifest.webmanifest            # PWA 清单
│   └── icons/                          # 应用图标 192/512/1024
├── src/
│   ├── main.js                         # 入口：Vue 挂载 + SW 注册/更新检测
│   ├── App.vue                         # 主组件（1400+ 行）
│   ├── style.css                       # 全局样式（1600+ 行）
│   └── features/
│       ├── knowledge-base/
│       │   └── knowledgeBaseDb.js       # 文档/密码/备份 DB 层
│       └── notes/
│           ├── notesDb.js              # 笔记/分类/统计 DB 层
│           └── PersonalNotes.vue       # 笔记管理组件
├── dist/                               # 构建产物（独立 git 仓库 → GitHub Pages）
└── docs/                               # 本文档目录
```

### 3.3 数据流

```
┌─────────────┐     ┌──────────────┐     ┌──────────────────┐
│  用户操作    │────▶│  Vue 组件     │────▶│  Dexie (IndexedDB)│
│ (导入/编辑)  │     │ App.vue      │     │  knowledgeBaseDb  │
│             │     │ PersonalNotes │     │  notesDb          │
└─────────────┘     └──────┬───────┘     └──────────────────┘
                           │
                    ┌──────┴───────┐
                    │  文件解析器   │
                    │ mammoth/xlsx │
                    │ pdfjs-dist   │
                    └──────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│  Service      │────▶│  Cache API   │────▶│  离线访问         │
│  Worker       │     │  静态缓存    │     │  (飞行模式可用)    │
└──────────────┘     └──────────────┘     └──────────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│  定时备份     │────▶│  JSON 导出   │────▶│  iCloud Drive     │
│  (setInterval)│     │  下载到本地   │     │  (Safari 自动同步) │
└──────────────┘     └──────────────┘     └──────────────────┘
```

---

## 4. 数据库设计

### 4.1 Dexie Schema

**数据库名**: `knowledge-base-pwa`

```javascript
// Version 1 — 知识库文档
db.version(1).stores({
  docs: '++id, name, type, createdAt, updatedAt',
  meta: 'key'
})

// Version 2 — 扩展笔记系统
db.version(2).stores({
  docs: '++id, name, type, createdAt, updatedAt',
  meta: 'key',
  notes: '++id, title, category, isStarred, createdAt, updatedAt, deletedAt',
  noteCategories: '++id, &name, sortOrder'
})
```

### 4.2 数据结构

**文档对象 (docs)**:
```javascript
{
  id: Number,              // 自增主键
  name: String,            // 文件名 "report.docx"
  type: 'docx'|'xlsx'|'pdf',
  size: Number,            // 文件大小（字节）
  contentHtml: String,     // 解析后的 HTML（docx/pdf）
  contentText: String,     // 纯文本（用于搜索）
  sheets: Array,           // Excel 工作表 [{name, headers, rows}]
  parseWarnings: Array,    // 解析警告
  createdAt: Number,       // 导入时间戳
  updatedAt: Number
}
```

**笔记对象 (notes)**:
```javascript
{
  id: Number,
  title: String,
  content: String,         // 笔记正文
  category: String,        // 分类名
  tags: String[],          // 标签数组
  isStarred: Boolean,
  expiresAt: Number,       // 过期时间（0=永不过期）
  wordCount: Number,       // 字数
  createdAt: Number,
  updatedAt: Number,
  deletedAt: Number        // 软删除（0=未删除）
}
```

**元数据 (meta)**:
```javascript
{ key: 'lastOpenedDocId', value: Number }
{ key: 'password_hash', value: String }   // SHA-256 哈希
```

**笔记分类 (noteCategories)**:
```javascript
{
  id: Number,
  name: String,            // 唯一约束
  color: String,           // HEX 颜色
  sortOrder: Number,
  createdAt: Number
}
```

### 4.3 API 层（DB 函数）

**knowledgeBaseDb.js** — 16 个导出函数:

| 函数 | 功能 |
|------|------|
| `listKnowledgeDocs()` | 获取全部文档（按创建时间倒序） |
| `saveKnowledgeDocs(docs)` | 批量保存文档 |
| `removeKnowledgeDoc(id)` | 删除单个文档 |
| `clearKnowledgeDocs()` | 清空全部文档 |
| `setKnowledgeMeta(key, value)` | 存储元数据 |
| `getKnowledgeMeta(key)` | 读取元数据 |
| `setPassword(password)` | 设置/清除密码（SHA-256 + salt） |
| `verifyPassword(password)` | 验证密码 |
| `hasPassword()` | 检查是否设置密码 |
| `exportAllData()` | 导出全量数据为 JSON 结构 |
| `importAllData(backup, mode)` | 导入数据（merge/replace 模式） |

**notesDb.js** — 13 个导出函数:

| 函数 | 功能 |
|------|------|
| `listNotes(filters)` | 查询笔记（支持分类/标签/关键词/星标/排序） |
| `getNote(id)` | 获取单条笔记 |
| `createNote(data)` | 创建笔记（自动创建分类） |
| `updateNote(id, changes)` | 部分更新 |
| `deleteNote(id)` | 软删除（标记 deletedAt） |
| `toggleStar(id)` | 切换星标 |
| `listCategories()` | 获取分类列表 |
| `createCategory(name, color)` | 创建分类 |
| `deleteCategory(id)` | 删除分类 |
| `getStats()` | 综合统计（总数/字数/分类分布/标签/趋势） |
| `getAllTags()` | 获取全部标签 |
| `exportNotes(format)` | 导出为 JSON/CSV/Markdown |

---

## 5. Service Worker 缓存策略

### 5.1 缓存架构

```
安装阶段 (install)
  ├── 预缓存 App Shell
  │   ├── ./
  │   ├── ./index.html
  │   ├── ./manifest.webmanifest
  │   └── ./icons/icon-192.png, icon-512.png, icon-1024.png
  ├── 预缓存构建资源（Vite 插件注入）
  │   ├── ./assets/index-XXXXX.js
  │   └── ./assets/index-XXXXX.css
  └── 不自动 skipWaiting（等待用户确认更新）

激活阶段 (activate)
  ├── 清除旧版本缓存
  └── clients.claim() 立即接管

请求拦截 (fetch)
  ├── 导航请求 → 缓存优先 + 后台静默更新
  └── 静态资源 → 缓存优先 → 网络回退
```

### 5.2 缓存版本管理

```javascript
const CACHE_VERSION = 'kb-pwa-v6'
const STATIC_CACHE = `knowledge-base-static-${CACHE_VERSION}`
```

每次部署新版本：
1. 构建产物 hash 变化 → 新 JS/CSS 文件名
2. Vite 插件注入新资源列表到 `sw.js`
3. 浏览器检测 `sw.js` 字节变化 → 触发 `updatefound`
4. 新 SW 安装完成 → 进入 `waiting` 状态
5. 用户在"更多"菜单中看到"新版本可用" → 点击更新

### 5.3 iOS Safari 兼容

**问题**: Safari 的 `caches.match()` 对相对路径匹配不可靠。

**解决方案**: 使用 `self.registration.scope` 构建绝对 URL：
```javascript
const swScope = self.registration.scope
const indexUrl = new URL('index.html', swScope).href
// 同时缓存多个 key，确保命中：
cache.put(indexUrl, res.clone())
cache.put(new URL('./', swScope).href, res.clone())
```

### 5.4 更新检测机制

```
main.js                              sw.js
  │                                     │
  ├── register('./sw.js')               │
  ├── 每 60s → registration.update()    │
  ├── visibilitychange → update()       │
  │                                     │
  │   updatefound ◄─────────────────────┤ 新 SW 开始安装
  │     └── statechange: 'installed'    │
  │           └── window.__swUpdate     │ SW 进入 waiting
  │                 = { available, worker }
  │                                     │
  │   用户点击"新版本可用"               │
  │     └── worker.postMessage          │
  │          ({ type: 'SKIP_WAITING' }) ├──▶ self.skipWaiting()
  │                                     │
  │   controllerchange ◄────────────────┤ 新 SW 激活
  │     └── window.location.reload()    │
```

---

## 6. UI 设计

### 6.1 导航结构

```
底部导航栏（固定）
  ├── 📄 文档    → 知识库主页（文档列表/管理/搜索/阅读器）
  ├── ✏️ 笔记    → 个人笔记（编辑器/列表/统计）
  ├── 💾 备份    → 导出/导入/自动备份/密码设置
  └── ⋮ 更多    → 上滑菜单 (Action Sheet)
                    ├── 🆕 检查更新 / 新版本可用
                    ├── 📖 关于
                    ├── 🩺 离线诊断
                    └── 🔒 密码与安全
```

### 6.2 全屏阅读器

```
┌─────────────────────────────────┐
│ ████████░░░░░░░░░░░ 45%        │ 进度条
├─────────────────────────────────┤
│ ← 返回列表  文档标题   🔍 分享  │ 顶部栏
├─────────────────────────────────┤
│ ‹ 上一篇     2 / 5   下一篇 ›  │ 文章导航
├─────────────────────────────────┤
│ [搜索框] 3/12  ▲ ▼ ✕           │ 搜索栏（可折叠）
├─────────────────────────────────┤
│                                 │
│  文档正文内容                    │ 滚动区域
│  搜索匹配词会高亮显示            │
│                                 │
│                        [↑ 顶部] │ 浮动按钮
└─────────────────────────────────┘
```

### 6.3 设计语言

| 属性 | 值 | 说明 |
|------|-----|------|
| 主色 | `#0f766e` (Teal 700) | 按钮、活跃标签 |
| 背景 | `#eef7f4` | 浅绿灰 |
| 卡片 | `rgba(255,255,255,0.72)` + `blur(12px)` | 毛玻璃 |
| 圆角 | 16px（卡片）/ 10px（按钮/输入框） | iOS 风格 |
| 边框 | `0.5px solid rgba(0,0,0,0.04)` | 极细边框 |
| 阴影 | `0 2px 12px rgba(15,23,42,0.06)` | 轻柔投影 |
| 字体 | SF Pro / PingFang SC / system-ui | 系统字体栈 |
| 导航 | `backdrop-filter: saturate(180%) blur(20px)` | iOS 原生风格 |

### 6.4 响应式断点

| 断点 | 布局 |
|------|------|
| < 980px | 单列，统计卡片 3 列，表格横向滚动 |
| ≥ 980px | 双列（340px 侧栏 + 弹性内容），统计 5 列 |

---

## 7. 使用指南

### 7.1 首次安装

1. 用 iPhone Safari 打开 `https://etrnal1.github.io/knowledge-base-pwa/`
2. 等待页面完全加载（Service Worker 缓存资源）
3. 点击 Safari 底部**分享按钮** → **添加到主屏幕**
4. 从主屏幕打开，进入全屏独立模式
5. 开启飞行模式验证离线可用

### 7.2 导入文档

1. 点击**导入文档**按钮
2. 选择 `.docx` / `.xlsx` / `.pdf` 文件（可多选）
3. 等待解析完成（进度队列实时显示）
4. 点击文档列表中的项目 → 进入全屏阅读器

### 7.3 配置定时备份

1. 切到**备份**标签页
2. 找到**定时备份到 iCloud** 区域
3. 打开开关 → 选择备份间隔（每小时 ~ 每周）
4. 确保 iPhone 设置中 iCloud Drive 已开启
5. 备份文件自动下载到 Safari 下载目录 → 同步到 iCloud Drive

### 7.4 版本更新

1. 底部导航点击**更多** ⋮
2. 查看菜单顶部：
   - 🔄 **检查更新** — 点击手动检查
   - 🆕 **新版本可用** — 有更新时显示红色 UPDATE 标签
3. 点击**新版本可用** → 自动更新并刷新页面
4. 不点则不更新，完全用户自主控制

---

## 8. 故障排除

### 问题 1: 离线打不开

**症状**: 飞行模式下打开 App 显示空白或错误页面

**排查步骤**:
1. 进入**更多 → 离线诊断**页面
2. 检查各项指标：
   - **协议** — 必须是 HTTPS 或 localhost
   - **SW 状态** — 必须是 "activated"
   - **缓存** — HTML/JS/CSS 三项必须完整
3. 如果缓存不完整：联网状态下刷新 2 次，等待 SW 缓存所有资源

**根本原因**: 首次加载未完成就添加到主屏幕，SW 未缓存全部资源。

### 问题 2: 笔记功能异常（Safari）

**症状**: 笔记列表为空或查询报错

**根本原因**: Safari 的 IndexedDB `where().equals(0)` 对数字 0 匹配不可靠。

**解决方案**: 已使用 `toArray().filter(n => !n.deletedAt)` 替代。

### 问题 3: 文档阅读器内容被截断

**症状**: 长文档只显示一部分

**排查**: 检查 `.reader-block` 的 `overflow` 属性，确保 `reader-body` 内的 block 为 `overflow: visible`。

### 问题 4: PDF 解析很慢

**症状**: 大型 PDF（50+ 页）导入时间长

**原因**: pdfjs-dist 逐页提取文本，CPU 密集型操作。

**缓解**: 超过 50 页会显示 `parseWarnings` 提示。

### 调试技巧

**查看 SW 日志**:
- Mac: Safari → 开发 → [设备名] → Service Worker
- Console 中搜索 `[pwa]` 前缀的日志

**查看 IndexedDB**:
- Safari → 开发 → [设备名] → Storage → IndexedDB → `knowledge-base-pwa`

**查看缓存**:
- Safari → 开发 → [设备名] → Storage → Cache Storage

---

## 9. 性能考虑

### 关键指标

| 指标 | 目标 | 实际 |
|------|------|------|
| 首次加载 | < 3s | ~2s（含 pdfjs worker 1.3MB） |
| 离线启动 | < 1s | 缓存命中，接近即时 |
| DOCX 解析 | < 2s | 取决于文件大小 |
| PDF 解析 | < 5s/50页 | 逐页提取 |
| 笔记搜索 | < 100ms | 内存 filter，300ms debounce |
| 构建产物 | JS ~1.4MB | 含 pdfjs，gzip ~428KB |

### 优化建议

1. **Code Splitting** — pdfjs-dist (1.3MB) 可改为动态 `import()`，仅在导入 PDF 时加载
2. **虚拟滚动** — 文档列表超过 100 项时考虑虚拟化
3. **Web Worker 解析** — 大文件解析可移入 Worker 避免阻塞 UI
4. **缓存清理** — 定期清理旧版本缓存，避免存储膨胀

---

## 10. 测试清单

### 核心功能

- [ ] 导入 DOCX 文件并在阅读器中正确显示
- [ ] 导入 XLSX 文件，工作表切换正常
- [ ] 导入 PDF 文件，分页显示正确
- [ ] 全文搜索覆盖三种文件类型
- [ ] 阅读器内搜索高亮和导航正常
- [ ] 上一篇/下一篇导航正确
- [ ] 删除文档确认弹窗正常

### 笔记功能

- [ ] 创建笔记并保存
- [ ] 编辑已有笔记
- [ ] 分类筛选和标签筛选
- [ ] 星标切换
- [ ] 过期时间标记正确显示
- [ ] 导出为 JSON / CSV / Markdown
- [ ] 统计数据正确

### PWA 离线

- [ ] HTTPS 下 SW 注册成功
- [ ] 缓存资源完整（HTML + JS + CSS）
- [ ] 飞行模式下打开 App 正常
- [ ] 离线状态下导入文档、创建笔记正常
- [ ] 诊断面板各项指标准确

### 数据管理

- [ ] 导出全量备份为 JSON
- [ ] 合并导入不覆盖现有数据
- [ ] 替换导入清空后恢复
- [ ] 密码设置/验证/清除
- [ ] 定时备份按间隔触发
- [ ] 持久化存储申请

### 更新机制

- [ ] 新版本部署后检测到更新
- [ ] "更多"菜单显示"新版本可用"
- [ ] 点击更新后页面刷新到新版本
- [ ] 不点击则不更新

### 兼容性

- [ ] iPhone Safari 16+ 正常
- [ ] 添加到主屏幕后全屏运行
- [ ] Android Chrome 正常
- [ ] 桌面 Chrome / Edge 正常
- [ ] 安全区（刘海/Home Indicator）适配

---

## 11. 开发扩展

### 添加新文件格式

1. 安装解析库（如 `epub.js`）
2. 在 `App.vue` 的 `parseFile()` 方法中添加分支：
   ```javascript
   if (lowerName.endsWith('.epub')) return this.parseEpub(file)
   ```
3. 实现 `parseEpub(file)` 方法，返回标准结构：
   ```javascript
   { name, type: 'epub', size, contentHtml, contentText, sheets: [], parseWarnings: [] }
   ```
4. 更新 `<input accept="...">`、类型筛选 `<select>`、统计卡片
5. 添加 `.doc-icon.epub` CSS 样式

### 添加新的"更多"菜单项

在 `App.vue` 模板的 `.sheet-menu` 中添加 `<button class="sheet-item">`:
```html
<button type="button" class="sheet-item" @click="goTab('newFeature')">
  <span class="sheet-item-icon">🎯</span>
  <div class="sheet-item-body">
    <strong>新功能</strong>
    <p>功能描述</p>
  </div>
  <span class="sheet-arrow">›</span>
</button>
```

### 添加新标签页

1. 在模板中添加 `<div v-if="activeTab === 'newTab'" class="kb-scroll-area">` 区域
2. 在底部导航或"更多"菜单中添加入口
3. 如需独立组件，创建 `src/features/new-feature/NewFeature.vue`

### 修改主题色

修改 CSS 变量：
```css
:root {
  --primary: #0f766e;  /* 改为你的颜色 */
}
```
同时更新 `manifest.webmanifest` 中的 `theme_color` 和 `background_color`。

### 相关文件速查

| 文件 | 行数 | 职责 |
|------|------|------|
| `src/App.vue` | ~1400 | 主组件：导航/文档/阅读器/备份/诊断 |
| `src/style.css` | ~1600 | 全局样式：布局/组件/响应式/动画 |
| `src/main.js` | ~60 | SW 注册和更新检测 |
| `public/sw.js` | ~130 | 缓存策略和离线处理 |
| `src/features/knowledge-base/knowledgeBaseDb.js` | ~140 | 文档/密码/备份 DB 层 |
| `src/features/notes/notesDb.js` | ~225 | 笔记/分类/统计 DB 层 |
| `src/features/notes/PersonalNotes.vue` | ~800 | 笔记管理完整组件 |
| `vite.config.js` | ~50 | 构建配置 + SW 资源注入插件 |

---

## 12. 部署流程

### 构建

```bash
cd knowledge-base-pwa
npx vite build
# 产出 → dist/ 目录
# Vite 插件自动注入构建资源到 sw.js
```

### 部署到 GitHub Pages

```bash
cd dist
git add -A
git commit -m "部署: 功能描述"
git push origin main
# GitHub Pages 自动部署
# 访问: https://etrnal1.github.io/knowledge-base-pwa/
```

### 源码提交

```bash
cd /Users/mac/vue-learning-app
git add knowledge-base-pwa/
git commit -m "功能描述"
# 源码在 codex/knowledge-base-pwa-extract 分支
```

---

## 13. 版本历史

| 日期 | 版本 | 变更 |
|------|------|------|
| 2026-03-14 | 0.1.0 | 初始版本：文档导入、离线缓存 |
| 2026-03-14 | 0.2.0 | 部署 GitHub Pages，修复 SW 缓存匹配 |
| 2026-03-15 | 0.3.0 | 笔记功能、备份迁移、密码保护 |
| 2026-03-15 | 0.4.0 | iOS 适配、全屏阅读器、文内搜索 |
| 2026-03-16 | 0.5.0 | PDF 支持、文章导航、自动备份 |
| 2026-03-16 | 0.6.0 | 底部导航重构、毛玻璃 UI、多级菜单 |
| 2026-03-16 | 1.0.0 | 定时 iCloud 备份、用户可控更新 |

---

**文档版本**: 1.0
**最后更新**: 2026-03-17
**维护人**: Claude Code
