# 本地知识库 PWA — 从零手写复现指南

> 本文档帮助你从一个空目录开始，分 8 个阶段逐步构建出完整的离线知识库 PWA 应用。
> 每个阶段都可独立运行验证，建议每完成一个阶段就 `git commit`。

---

## 项目全貌

```
最终成果：一个运行在 iPhone 上的离线文档管理 PWA
技术栈：Vue 3.5 + Vite 5.4 + Dexie 4.2（IndexedDB）
代码量：约 6,800 行（无后端，纯前端）
支持格式：docx / xlsx / pdf / html / md / txt
```

### 架构总览

```
┌──────────────────────────────────────────────┐
│                   用户界面                      │
│  ┌──────┬──────┬──────┬──────┐               │
│  │ 文档  │ 笔记 │ 备份  │ 更多  │  ← 底部导航   │
│  └──┬───┴──┬───┴──┬───┴──┬───┘               │
│     │      │      │      │                    │
│  ┌──▼──────▼──────▼──────▼───┐               │
│  │       App.vue (~2600行)    │               │
│  │  · 文档导入/解析/阅读/编辑   │               │
│  │  · 版本管理/TTS/书签/搜索   │               │
│  │  · 文件夹/收藏/回收站/主题   │               │
│  └────────────┬──────────────┘               │
│               │                               │
│  ┌────────────▼──────────────┐               │
│  │     Dexie (IndexedDB)      │               │
│  │  docs · meta · folders     │               │
│  │  notes · noteCategories    │               │
│  │  docVersions               │               │
│  └────────────────────────────┘               │
│                                               │
│  ┌────────────────────────────┐               │
│  │   Service Worker (sw.js)    │               │
│  │   缓存优先 · 离线可用        │               │
│  └────────────────────────────┘               │
└──────────────────────────────────────────────┘
```

### 文件结构（最终）

```
knowledge-base-pwa/
├── index.html                          # HTML 入口（19行）
├── package.json                        # 依赖配置
├── vite.config.js                      # 构建配置 + 自定义插件（54行）
├── public/
│   ├── sw.js                           # Service Worker（130行）
│   ├── manifest.webmanifest            # PWA 清单（31行）
│   └── icons/                          # 应用图标
│       ├── icon-192.png
│       ├── icon-512.png
│       └── icon-1024.png
├── src/
│   ├── main.js                         # 应用入口 + SW 注册（58行）
│   ├── App.vue                         # 主组件（~2600行）
│   ├── style.css                       # 全局样式（~2760行）
│   └── features/
│       ├── knowledge-base/
│       │   └── knowledgeBaseDb.js      # 文档数据库操作（262行）
│       └── notes/
│           ├── notesDb.js              # 笔记数据库操作（243行）
│           └── PersonalNotes.vue       # 笔记组件（684行）
└── dist/                               # 构建产物（部署到 GitHub Pages）
```

---

## 前置知识检查

开始之前，确保你理解以下概念（不需要精通）：

| 知识点 | 需要程度 | 快速学习资源 |
|--------|---------|------------|
| HTML/CSS/JS 基础 | 必须 | MDN Web Docs |
| Vue 3 Options API | 必须 | vuejs.org 教程前 5 章 |
| ES6+ 语法（async/await、解构、模板字符串） | 必须 | javascript.info |
| IndexedDB 概念 | 了解即可 | Dexie 会封装它 |
| Service Worker 生命周期 | 了解即可 | 阶段 2 会详细讲 |
| CSS Flexbox | 必须 | CSS-Tricks Flexbox 指南 |

---

## 阶段 1：项目骨架 + 第一个页面

> 目标：搭建项目、显示一个能导入文件的空页面

### 1.1 初始化项目

```bash
mkdir knowledge-base-pwa && cd knowledge-base-pwa
npm init -y
npm install vue@^3.5 dexie@^4.2
npm install -D vite@^5.4 @vitejs/plugin-vue@^5.2
```

### 1.2 创建 `package.json` scripts

```json
{
  "type": "module",
  "scripts": {
    "dev": "vite --host 0.0.0.0 --port 5180",
    "build": "vite build",
    "preview": "vite preview --host 0.0.0.0 --port 4180"
  }
}
```

**为什么用 `--host 0.0.0.0`？** 这样同一局域网的手机可以通过电脑 IP 访问开发服务器。

### 1.3 创建 `vite.config.js`

```javascript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: './'   // 关键！用相对路径，否则部署到子目录时资源找不到
})
```

**`base: './'` 的坑：** 如果用默认的 `/`，部署到 `https://xxx.github.io/knowledge-base-pwa/` 时，
所有资源会去 `https://xxx.github.io/assets/xxx.js` 找文件，404。改成 `./` 就是相对当前目录。

### 1.4 创建 `index.html`

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport"
    content="width=device-width, initial-scale=1, maximum-scale=1,
             user-scalable=no, viewport-fit=cover" />
  <title>本地知识库 PWA</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

**关键属性解释：**
- `maximum-scale=1, user-scalable=no` → 禁止双指缩放，让 PWA 像原生 App
- `viewport-fit=cover` → iPhone 刘海屏适配，内容延伸到安全区域

### 1.5 创建 `src/main.js`

```javascript
import { createApp } from 'vue'
import App from './App.vue'
import './style.css'

createApp(App).mount('#app')
```

### 1.6 创建最简 `src/App.vue`

```vue
<template>
  <div class="kb-page">
    <h1>本地知识库</h1>
    <p>共 {{ docs.length }} 篇文档</p>
    <input type="file" accept=".docx,.xlsx,.pdf" multiple @change="onFileChange" />
    <ul>
      <li v-for="doc in docs" :key="doc.id">{{ doc.name }} ({{ doc.type }})</li>
    </ul>
  </div>
</template>

<script>
export default {
  data() {
    return {
      docs: []
    }
  },
  methods: {
    onFileChange(e) {
      const files = Array.from(e.target.files || [])
      // 暂时只记录文件名，后面阶段会加解析
      for (const file of files) {
        this.docs.push({
          id: Date.now() + Math.random(),
          name: file.name,
          type: file.name.split('.').pop().toLowerCase(),
          size: file.size
        })
      }
    }
  }
}
</script>
```

### 1.7 创建 `src/style.css`（先写 20 行基础样式）

```css
* { margin: 0; padding: 0; box-sizing: border-box; }

:root {
  --primary: #0f766e;
  --bg: #f4fbf9;
  --text: #1a1a1a;
  --card-bg: #fff;
  --border: #e8e8e8;
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
}

body {
  font-family: -apple-system, 'PingFang SC', 'Helvetica Neue', sans-serif;
  background: var(--bg);
  color: var(--text);
  -webkit-tap-highlight-color: transparent;  /* 去掉移动端点击高亮 */
}
```

**`env(safe-area-inset-top)` 是什么？** iPhone 刘海/灵动岛占据了顶部空间，
这个 CSS 变量返回安全区域的内边距值，避免内容被遮挡。

### 验证

```bash
npm run dev
```

打开 `http://localhost:5180`，能看到标题和文件选择器，选文件后列表显示文件名 → 阶段 1 完成。

### 你学到了什么

- [x] Vite + Vue 3 项目初始化
- [x] `base: './'` 的重要性
- [x] 移动端 viewport 配置
- [x] CSS 变量和安全区域
- [x] Vue 3 Options API 基础（data、methods）
- [x] 文件选择 `<input type="file">` + `@change` 事件

---

## 阶段 2：IndexedDB 持久化（Dexie）

> 目标：文件信息存到 IndexedDB，刷新页面数据不丢失

### 2.1 为什么用 Dexie 而不是直接用 IndexedDB？

原生 IndexedDB API 非常繁琐（需要手动管理事务、游标、版本升级），而 Dexie 把它包装成类似 ORM 的链式调用：

```javascript
// 原生 IndexedDB（约 20 行才能完成一次查询）
const request = indexedDB.open('mydb', 1)
request.onupgradeneeded = (e) => {
  const db = e.target.result
  db.createObjectStore('docs', { keyPath: 'id', autoIncrement: true })
}
// ... 还要处理 onsuccess、onerror、事务...

// Dexie（1 行）
const docs = await db.docs.orderBy('createdAt').reverse().toArray()
```

### 2.2 创建 `src/features/knowledge-base/knowledgeBaseDb.js`

```javascript
import Dexie from 'dexie'

const DB_NAME = 'knowledge-base-pwa'

export const knowledgeBaseDb = new Dexie(DB_NAME)

// 版本 1：只有 docs 和 meta 两张表
knowledgeBaseDb.version(1).stores({
  docs: '++id, name, type, createdAt, updatedAt',
  meta: 'key'
})
```

**Schema 语法解释：**
- `++id` → 自增主键
- `name, type, createdAt` → 创建索引，用于 `.where('type').equals('pdf')` 查询
- 没列出的字段（如 `contentHtml`）仍然可以存储，只是不能按它们查询
- `meta` 表的主键是 `key`，用于存储键值对（如书签、设置）

**导出 CRUD 函数：**

```javascript
export async function listKnowledgeDocs() {
  return knowledgeBaseDb.docs.orderBy('createdAt').reverse().toArray()
}

export async function saveKnowledgeDocs(docs) {
  const now = Date.now()
  const payload = docs.map(doc => ({
    createdAt: now,
    updatedAt: now,
    ...doc
  }))
  await knowledgeBaseDb.docs.bulkAdd(payload)
  return listKnowledgeDocs()
}

export async function removeKnowledgeDoc(id) {
  await knowledgeBaseDb.docs.delete(id)
}

export async function setKnowledgeMeta(key, value) {
  await knowledgeBaseDb.meta.put({ key, value, updatedAt: Date.now() })
}

export async function getKnowledgeMeta(key) {
  const record = await knowledgeBaseDb.meta.get(key)
  return record?.value
}
```

### 2.3 在 App.vue 中使用

```javascript
import { listKnowledgeDocs, saveKnowledgeDocs } from './features/knowledge-base/knowledgeBaseDb.js'

export default {
  data() {
    return { docs: [] }
  },
  async mounted() {
    // 页面加载时从 IndexedDB 读取
    this.docs = await listKnowledgeDocs()
  },
  methods: {
    async onFileChange(e) {
      const files = Array.from(e.target.files || [])
      const newDocs = files.map(file => ({
        name: file.name,
        type: file.name.split('.').pop().toLowerCase(),
        size: file.size,
        contentHtml: '',   // 后面阶段会填充
        contentText: ''
      }))
      await saveKnowledgeDocs(newDocs)
      this.docs = await listKnowledgeDocs()
    }
  }
}
```

### 验证

导入几个文件 → 刷新页面 → 列表仍在 → 打开 DevTools → Application → IndexedDB → `knowledge-base-pwa` → `docs` 表能看到数据。

### 你学到了什么

- [x] Dexie 的 schema 定义和版本管理
- [x] `++id`（自增）、索引字段 vs 普通字段的区别
- [x] `bulkAdd` 批量插入、`orderBy` 排序查询
- [x] `meta` 表做键值存储的模式
- [x] Vue `mounted` 生命周期加载数据

---

## 阶段 3：文档解析（6 种格式）

> 目标：把 docx/xlsx/pdf/html/md/txt 文件解析为可展示的 HTML

### 3.1 安装解析库

```bash
npm install mammoth@^1.11 xlsx@^0.18 pdfjs-dist@^4.9 marked@^17.0
```

| 库 | 大小 | 用途 |
|----|------|------|
| mammoth | 较小 | 把 .docx 转成 HTML（保留格式） |
| xlsx (SheetJS) | 较大 | 解析 .xlsx 为 JSON 表格数据 |
| pdfjs-dist | 最大 | Mozilla 的 PDF 渲染引擎，提取文字 |
| marked | 很小 | Markdown → HTML 转换 |

### 3.2 理解解析流程

```
用户选择文件
    ↓
File 对象 → ArrayBuffer（二进制数据）
    ↓
根据文件扩展名选择解析器
    ├── .docx → mammoth.convertToHtml(arrayBuffer)
    │           返回 { value: "<p>Hello</p>..." }
    │
    ├── .xlsx → XLSX.read(arrayBuffer)
    │           返回 workbook 对象 → 遍历 sheets → 提取 headers + rows
    │
    ├── .pdf  → pdfjsLib.getDocument(data)
    │           逐页提取 textContent → 拼接成 HTML
    │
    ├── .md   → marked(text)
    │           Markdown 字符串 → HTML
    │
    ├── .html → 直接读取原始 HTML
    │
    └── .txt  → 包裹在 <pre> 标签中
    ↓
{ name, type, size, contentHtml, contentText, sheets? }
    ↓
存入 IndexedDB
```

### 3.3 编写解析函数

```javascript
import * as XLSX from 'xlsx'
import mammoth from 'mammoth/mammoth.browser'
import * as pdfjsLib from 'pdfjs-dist/build/pdf.min.mjs'
import { marked } from 'marked'

// 必须设置 worker 路径，否则 PDF 解析会报错
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).href
```

**逐个解析器的写法：**

```javascript
// ── DOCX ──
async parseDocx(file) {
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.convertToHtml({ arrayBuffer })
  return {
    name: file.name,
    type: 'docx',
    size: file.size,
    contentHtml: result.value,
    contentText: this.htmlToText(result.value)  // 提取纯文本用于搜索
  }
}

// ── XLSX ──
async parseXlsx(file) {
  const arrayBuffer = await file.arrayBuffer()
  const workbook = XLSX.read(arrayBuffer, { type: 'array' })
  const sheets = workbook.SheetNames.map(name => {
    const sheet = workbook.Sheets[name]
    const json = XLSX.utils.sheet_to_json(sheet, { header: 1 })
    // 第一行当表头，其余当数据
    return {
      name,
      headers: json[0] || [],
      rows: json.slice(1)
    }
  })
  return {
    name: file.name,
    type: 'xlsx',
    size: file.size,
    contentHtml: '',
    contentText: '',
    sheets
  }
}

// ── PDF ──
async parsePdf(file) {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise
  let fullText = ''
  let fullHtml = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items.map(item => item.str).join(' ')
    fullText += pageText + '\n'
    fullHtml += `<p>${pageText}</p>`
  }
  return {
    name: file.name,
    type: 'pdf',
    size: file.size,
    contentHtml: fullHtml,
    contentText: fullText
  }
}

// ── Markdown ──
async parseMarkdown(file) {
  const text = await file.text()
  return {
    name: file.name,
    type: 'md',
    size: file.size,
    contentHtml: marked(text),
    contentText: text
  }
}

// ── TXT ──
async parseTxt(file) {
  const text = await file.text()
  return {
    name: file.name,
    type: 'txt',
    size: file.size,
    contentHtml: '<pre class="txt-content">' + this.escHtml(text) + '</pre>',
    contentText: text
  }
}

// ── HTML ──
async parseHtml(file) {
  const html = await file.text()
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return {
    name: file.name,
    type: 'html',
    size: file.size,
    contentHtml: html,
    contentText: tmp.textContent || ''
  }
}

// 辅助：HTML → 纯文本
htmlToText(html) {
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return tmp.textContent || ''
}

// 辅助：转义 HTML 特殊字符
escHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
```

### 3.4 路由到对应解析器

```javascript
async parseFile(file) {
  const ext = file.name.split('.').pop().toLowerCase()
  switch (ext) {
    case 'docx': return this.parseDocx(file)
    case 'xlsx': return this.parseXlsx(file)
    case 'pdf':  return this.parsePdf(file)
    case 'md':   return this.parseMarkdown(file)
    case 'txt':  return this.parseTxt(file)
    case 'html':
    case 'htm':  return this.parseHtml(file)
    default: throw new Error(`不支持的格式: .${ext}`)
  }
}
```

### 易错点

1. **mammoth 的导入路径**：必须用 `mammoth/mammoth.browser`，不是 `mammoth`，否则 Vite 打包会报 Node.js 模块找不到
2. **pdfjs-dist 的 Worker**：必须设置 `workerSrc`，否则 PDF 解析在生产环境会失败
3. **XLSX 的 `{ header: 1 }`**：不加的话返回对象数组（用第一行做 key），加了返回二维数组（更灵活）
4. **file.arrayBuffer() vs file.text()**：二进制格式（docx/xlsx/pdf）用 `arrayBuffer()`，文本格式（md/txt/html）用 `text()`

### 验证

导入各种格式文件 → 在列表中点击能看到解析后的内容 → DevTools → IndexedDB 查看 `contentHtml` 有值。

### 你学到了什么

- [x] File API：`file.arrayBuffer()`、`file.text()`
- [x] mammoth、xlsx、pdfjs-dist、marked 四大解析库的使用
- [x] 解析器模式：统一输入输出接口 + switch 路由
- [x] HTML 转纯文本的技巧（创建临时 DOM 元素）
- [x] `import.meta.url` 在 ES Module 中获取当前文件路径

---

## 阶段 4：全屏阅读器

> 目标：点击文档进入沉浸式阅读，支持滚动进度、字体调节、书签

### 4.1 阅读器结构设计

```
┌────────────────────────────────┐
│ ← 返回  文档标题    🔍 ✏️ ⋯  │  ← reader-header（固定顶部）
├────────────────────────────────┤
│ ‹ 上一篇    2/10     下一篇 › │  ← reader-nav-bar
├────────────────────────────────┤
│                                │
│    这里是文档内容               │  ← reader-body（可滚动）
│    contentHtml 渲染在这里       │
│    xlsx 渲染为 <table>         │
│    html 用 <iframe> 渲染       │
│                                │
├────────────────────────────────┤
│  ━━━━━━━━━━━━━━━━━            │  ← reader-progress-bar
└────────────────────────────────┘
```

### 4.2 核心 data 属性

```javascript
data() {
  return {
    docs: [],
    activeDocId: null,    // 当前打开的文档 ID
    readerOpen: false,     // 阅读器是否展开
    readerProgress: 0,     // 滚动进度 0~100
    readerFontSize: 16,    // 字体大小
    bookmarks: {},         // { [docId]: { scrollRatio, progress, updatedAt } }
  }
}
```

### 4.3 核心 computed

```javascript
computed: {
  activeDoc() {
    return this.docs.find(doc => doc.id === this.activeDocId) || null
  },
  filteredDocs() {
    // 后续会加文件夹/类型/关键词筛选，现在先返回全部
    return this.docs
  }
}
```

### 4.4 阅读器模板

```html
<!-- 全屏覆盖层 -->
<div v-if="activeDoc && readerOpen" class="reader-overlay">
  <!-- 进度条 -->
  <div class="reader-progress-bar">
    <div class="reader-progress-fill" :style="{ width: readerProgress + '%' }"></div>
  </div>

  <!-- 顶部栏 -->
  <div class="reader-header">
    <button @click="closeReader">← 返回</button>
    <div class="reader-title">{{ activeDoc.name }}</div>
  </div>

  <!-- 内容区 -->
  <div ref="readerBody" class="reader-body"
       :style="{ fontSize: readerFontSize + 'px' }"
       @scroll="onReaderScroll">
    <!-- HTML 类型：用 iframe 沙盒渲染 -->
    <div v-if="activeDoc.type === 'html'">
      <iframe sandbox="allow-scripts allow-same-origin"
              :srcdoc="activeDoc.contentHtml"></iframe>
    </div>
    <!-- 文本类型：直接渲染 HTML -->
    <div v-else-if="['docx','pdf','md','txt'].includes(activeDoc.type)">
      <article v-html="activeDoc.contentHtml"></article>
    </div>
    <!-- 表格类型：渲染为 table -->
    <div v-else>
      <!-- xlsx 表格渲染，见阶段 3 -->
    </div>
  </div>
</div>
```

### 4.5 滚动进度追踪

```javascript
onReaderScroll() {
  const el = this.$refs.readerBody
  if (!el) return
  const scrollable = el.scrollHeight - el.clientHeight
  this.readerProgress = scrollable > 0
    ? Math.round((el.scrollTop / scrollable) * 100)
    : 100
}
```

**为什么要追踪滚动？** 两个用途：
1. 顶部进度条视觉反馈
2. 自动保存书签位置（下次打开恢复）

### 4.6 书签系统

```javascript
// 自动保存（滚动停止 2 秒后触发）
onReaderScroll() {
  // ... 进度计算 ...
  clearTimeout(this.bookmarkSaveTimer)
  this.bookmarkSaveTimer = setTimeout(() => this.autoSaveBookmark(), 2000)
},

async autoSaveBookmark() {
  const el = this.$refs.readerBody
  const ratio = el.scrollHeight > el.clientHeight
    ? el.scrollTop / (el.scrollHeight - el.clientHeight)
    : 0
  this.bookmarks[this.activeDocId] = {
    scrollRatio: ratio,        // 0~1 的滚动比例
    progress: this.readerProgress,
    updatedAt: Date.now()
  }
  await setKnowledgeMeta('bookmarks', this.bookmarks)
},

// 恢复书签
restoreBookmark() {
  const bm = this.bookmarks[this.activeDocId]
  if (!bm) return
  this.$nextTick(() => {
    const el = this.$refs.readerBody
    if (!el) return
    el.scrollTop = bm.scrollRatio * (el.scrollHeight - el.clientHeight)
  })
}
```

**为什么存 `scrollRatio` 而不是 `scrollTop`？** 因为字体大小变化后，`scrollHeight` 会改变，
但比例不变。用比例恢复位置更准确。

### 4.7 关键 CSS

```css
.reader-overlay {
  position: fixed;
  inset: 0;                    /* 等于 top:0;right:0;bottom:0;left:0 */
  z-index: 5000;
  display: flex;
  flex-direction: column;
  background: var(--bg);
}

.reader-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: calc(var(--safe-top) + 8px) 12px 8px;  /* safe-area 适配 */
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(20px);   /* iOS 毛玻璃效果 */
  -webkit-backdrop-filter: blur(20px);
}

.reader-body {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;  /* iOS 平滑滚动 */
  padding: 16px;
  padding-bottom: calc(16px + var(--safe-bottom));  /* 底部安全区域 */
}

.reader-progress-bar {
  height: 3px;
  background: var(--border);
}
.reader-progress-fill {
  height: 100%;
  background: var(--primary);
  transition: width 0.3s;
}
```

### 你学到了什么

- [x] 全屏覆盖层的 CSS 布局（fixed + inset + flex）
- [x] iOS 安全区域适配（`env(safe-area-inset-*)` + `calc`）
- [x] 毛玻璃效果（`backdrop-filter`）
- [x] 滚动进度计算公式
- [x] 防抖书签保存（`setTimeout` + `clearTimeout`）
- [x] `scrollRatio` 比 `scrollTop` 更可靠
- [x] `$nextTick` 等待 DOM 更新后操作
- [x] `v-html` 渲染 HTML、`iframe srcdoc` 沙盒渲染

---

## 阶段 5：PWA 离线支持

> 目标：添加 Service Worker，让应用可以离线打开

### 5.1 PWA 三要素

```
PWA = HTTPS + manifest.webmanifest + Service Worker
```

| 要素 | 作用 | 没有会怎样 |
|------|------|-----------|
| HTTPS | 安全环境 | SW 无法注册（localhost 除外） |
| Manifest | 告诉系统这是个"应用" | 不能添加到主屏幕 |
| Service Worker | 拦截网络请求，缓存资源 | 离线时打不开 |

### 5.2 创建 `public/manifest.webmanifest`

```json
{
  "name": "本地知识库 PWA",
  "short_name": "知识库",
  "description": "在 iPhone 上离线管理和阅读文档",
  "start_url": "./index.html",
  "scope": "./",
  "display": "standalone",
  "background_color": "#f4fbf9",
  "theme_color": "#0f766e",
  "icons": [
    { "src": "./icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "./icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

**`display: "standalone"` 是什么？** 从主屏幕打开时不显示浏览器地址栏，看起来像原生 App。

在 `index.html` 的 `<head>` 中加上：

```html
<meta name="theme-color" content="#0f766e" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<link rel="manifest" href="./manifest.webmanifest" />
<link rel="icon" href="./icons/icon-192.png" />
```

### 5.3 理解 Service Worker 生命周期

```
① 浏览器加载页面
    ↓
② main.js 调用 navigator.serviceWorker.register('./sw.js')
    ↓
③ 浏览器下载 sw.js，触发 install 事件
    ↓  ← 在这里预缓存所有资源
④ install 完成后，SW 进入 waiting 状态
    ↓  ← 旧的 SW 还在控制页面
⑤ 所有使用旧 SW 的标签页关闭后
    ↓  ← 或者手动调用 skipWaiting()
⑥ 新 SW 激活，触发 activate 事件
    ↓  ← 在这里清理旧缓存
⑦ SW 开始拦截所有 fetch 请求
    └── 缓存有 → 返回缓存（快）
    └── 缓存没有 → 发网络请求 → 存入缓存 → 返回
```

### 5.4 编写 `public/sw.js`

```javascript
const CACHE_VERSION = 'kb-pwa-v1'
const STATIC_CACHE = `knowledge-base-static-${CACHE_VERSION}`

// 构建时由 Vite 插件注入资源列表
const BUILD_ASSETS = /*__BUILD_ASSETS__*/[]

const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
]

const PRECACHE_URLS = [...APP_SHELL, ...BUILD_ASSETS]

// ─── 安装：预缓存 ───
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE)
    for (const url of PRECACHE_URLS) {
      try {
        await cache.add(url)
      } catch (err) {
        console.warn('[sw] precache failed:', url)
      }
    }
    // 不自动 skipWaiting，等用户手动更新
  })())
})

// ─── 激活：清旧缓存 ───
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(
      keys.filter(key => key !== STATIC_CACHE).map(key => caches.delete(key))
    )
    await self.clients.claim()  // 立即接管所有页面
  })())
})

// ─── 拦截请求：缓存优先 ───
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return  // 不缓存第三方请求

  // 导航请求 → 返回 index.html（SPA 路由支持）
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then(cached => cached || fetch(event.request))
    )
    return
  }

  // 静态资源 → 缓存优先
  event.respondWith((async () => {
    const cached = await caches.match(event.request)
    if (cached) return cached
    const response = await fetch(event.request)
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE)
      cache.put(event.request, response.clone())
    }
    return response
  })())
})

// ─── 接收手动更新消息 ───
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
```

### 5.5 Vite 插件：构建时注入资源列表

在 `vite.config.js` 中添加自定义插件：

```javascript
import fs from 'fs'
import path from 'path'

function injectSwAssets() {
  return {
    name: 'inject-sw-assets',
    closeBundle() {
      // 读取 Vite 生成的 manifest
      const manifestPath = path.resolve('dist/.vite/manifest.json')
      if (!fs.existsSync(manifestPath)) return

      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
      const assets = Object.values(manifest)
        .flatMap(entry => [entry.file, ...(entry.css || [])])
        .filter(Boolean)
        .map(f => `./${f}`)

      // 替换 sw.js 中的占位符
      const swPath = path.resolve('dist/sw.js')
      let swCode = fs.readFileSync(swPath, 'utf-8')
      swCode = swCode.replace(
        '/*__BUILD_ASSETS__*/[]',
        JSON.stringify(assets)
      )
      fs.writeFileSync(swPath, swCode)
      console.log(`[inject-sw] 注入 ${assets.length} 个构建资源到 sw.js`)
    }
  }
}

export default defineConfig({
  plugins: [vue(), injectSwAssets()],
  base: './',
  build: { manifest: true }  // 生成 .vite/manifest.json
})
```

**为什么不在运行时 fetch manifest？** 因为 SW install 事件中发起的 fetch 可能会失败（离线场景），
构建时注入确保资源列表始终可用。

### 5.6 在 main.js 中注册 SW

```javascript
// SW 注册 + 更新检测
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    const reg = await navigator.serviceWorker.register('./sw.js')

    // 检测到新版本
    reg.addEventListener('updatefound', () => {
      const newSW = reg.installing
      newSW.addEventListener('statechange', () => {
        if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
          // 新 SW 已安装，通知用户更新
          window.__swReg = reg
          window.dispatchEvent(new Event('sw-update-available'))
        }
      })
    })

    // 每 60 秒检查一次更新
    setInterval(() => reg.update(), 60000)
  })

  // 新 SW 接管后自动刷新
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload()
  })
}
```

### 5.7 更新缓存版本号

**每次发布新版本，必须修改 `CACHE_VERSION`**（如 `kb-pwa-v1` → `kb-pwa-v2`），否则用户手机会一直使用旧缓存。

```
开发新功能 → 修改 CACHE_VERSION → npm run build → 部署
```

### 验证

1. `npm run build && npm run preview`
2. 打开 `http://localhost:4180`
3. DevTools → Application → Service Workers → 看到 `sw.js` 已注册
4. Network → 勾选 Offline → 刷新页面 → 仍然能打开（从缓存加载）

### 你学到了什么

- [x] PWA 三要素：HTTPS + Manifest + SW
- [x] SW 生命周期：install → waiting → activate → fetch
- [x] 缓存优先策略（Cache-First）的实现
- [x] 为什么不在 install 中调用 `skipWaiting()`（避免用户正在使用时突然更新）
- [x] Vite 自定义插件（`closeBundle` 钩子）
- [x] `event.waitUntil()` 保证异步操作完成
- [x] `response.clone()` 为什么必须（Response body 只能读取一次）
- [x] 版本号管理的重要性

---

## 阶段 6：深色模式 + 搜索 + 收藏

> 目标：完善日常使用体验

### 6.1 深色模式

**原理：** CSS 变量 + `data-theme` 属性切换

```css
/* 默认（亮色） */
:root {
  --bg: #f4fbf9;
  --text: #1a1a1a;
  --card-bg: #fff;
}

/* 深色覆盖 */
[data-theme="dark"] {
  --bg: #0f0f0f;
  --text: #e0e0e0;
  --card-bg: #1e1e1e;
}
```

```javascript
toggleTheme() {
  this.darkMode = !this.darkMode
  document.documentElement.setAttribute('data-theme', this.darkMode ? 'dark' : 'light')
  localStorage.setItem('kb-theme', this.darkMode ? 'dark' : 'light')
}
```

**为什么用 CSS 变量而不是两套样式？** 只需要在根元素改变量值，所有使用变量的地方自动更新。写两套样式代码量翻倍且难以维护。

### 6.2 全局搜索

```javascript
doGlobalSearch() {
  const kw = this.globalSearchKeyword.toLowerCase()
  if (!kw) { this.globalSearchResults = []; return }

  const results = []
  for (const doc of this.docs) {
    if (`${doc.name} ${doc.contentText || ''}`.toLowerCase().includes(kw)) {
      results.push({ ...doc, source: 'doc' })
    }
  }
  this.globalSearchResults = results.slice(0, 20)  // 限制结果数
}
```

### 6.3 文档收藏

给 doc 对象加 `starred` 字段，筛选时支持 `typeFilter === 'starred'`：

```javascript
async toggleStar(doc) {
  doc.starred = !doc.starred
  await updateKnowledgeDoc(doc.id, { starred: doc.starred })
}
```

### 你学到了什么

- [x] CSS 变量实现主题切换（零 JS 样式代码）
- [x] `localStorage` 持久化用户偏好
- [x] 全文搜索的简易实现（遍历 + includes）
- [x] 布尔字段切换的反模式注意：先更新 UI 再写数据库

---

## 阶段 7：版本管理 + 编辑 + 文件夹

> 目标：给文档加上 Git 式版本管理、在线编辑、文件夹分类

### 7.1 Dexie 版本升级

```javascript
// 在 notesDb.js 中（因为这个文件统一管理 schema 升级）
knowledgeBaseDb.version(4).stores({
  docs: '++id, name, type, folderId, createdAt, updatedAt',  // 新增 folderId
  meta: 'key',
  notes: '++id, title, category, isStarred, createdAt, updatedAt, deletedAt',
  noteCategories: '++id, &name, sortOrder',
  docVersions: '++id, docId, version, createdAt',  // 新表
  folders: '++id, &name, sortOrder, createdAt'       // 新表
})
```

**Dexie 版本升级规则：**
- 版本号**只能递增**，不能修改已有版本的 schema
- 新版本必须包含**所有表**的完整 schema（不只是新增的）
- 已有数据会自动保留，新字段默认 `undefined`

### 7.2 版本快照保存

```javascript
export async function saveDocVersion(doc, message = '') {
  // 关键：深拷贝去除 Vue 响应式 Proxy
  // 否则 IndexedDB 的 structuredClone 会报 DataCloneError
  const docId = Number(doc.id)
  const html = String(doc.contentHtml || '')
  const text = String(doc.contentText || '')

  const versions = await knowledgeBaseDb.docVersions
    .where('docId').equals(docId).toArray()

  await knowledgeBaseDb.docVersions.add({
    docId,
    version: versions.length + 1,
    message: message || `v${versions.length + 1}`,
    contentHtml: html,
    contentText: text,
    size: Number(doc.size) || 0,
    createdAt: Date.now()
  })
}
```

**DataCloneError 的坑：** Vue 3 用 `Proxy` 实现响应式，`this.activeDoc` 不是普通对象。
IndexedDB 存储数据时使用 `structuredClone`，无法克隆 Proxy。
**解决方案：** 逐字段用 `String()`、`Number()` 提取原始值，或 `JSON.parse(JSON.stringify(obj))`。

### 7.3 文档编辑

不同文档类型的编辑方式不同：

| 类型 | 编辑方式 | HTML 元素 |
|------|---------|----------|
| md / txt | 纯文本编辑 | `<textarea>` |
| html | 源码编辑 | `<textarea>` |
| docx / pdf | 富文本编辑 | `<div contenteditable>` |
| xlsx | 不支持 | — |

```javascript
toggleEditMode() {
  if (this.activeDoc.type === 'xlsx') {
    alert('表格文档暂不支持编辑')
    return
  }
  if (['md', 'txt'].includes(this.activeDoc.type)) {
    this.editContent = this.activeDoc.contentText  // 编辑原始文本
  } else {
    this.editContent = this.activeDoc.contentHtml  // 编辑 HTML
  }
  this.editMode = true
}
```

**`contenteditable` 简介：** 给任何 HTML 元素加上 `contenteditable="true"`，
浏览器就把它变成一个富文本编辑器。配合 `document.execCommand('bold')` 等命令实现加粗、斜体等格式。

### 7.4 文件夹系统

```
数据结构：
folders: [{ id, name, color, sortOrder }]
docs: [{ ..., folderId }]  // folderId=0 或 undefined 表示根目录

筛选逻辑（在 filteredDocs 中）：
if (activeFolderId === 0) → 只显示 folderId 为 0 或 undefined 的
if (activeFolderId === 3) → 只显示 folderId === 3 的
if (activeFolderId === null) → 显示全部
```

### 你学到了什么

- [x] Dexie 多版本 schema 升级策略
- [x] Vue Proxy 导致的 DataCloneError 及解决方案
- [x] `contenteditable` 实现富文本编辑
- [x] `document.execCommand` 格式化命令
- [x] 文件夹分类的数据模型设计

---

## 阶段 8：TTS 朗读 + 最近阅读 + 部署

> 目标：添加最后的体验增强功能，然后部署到 GitHub Pages

### 8.1 TTS 全文朗读

```javascript
toggleTTS() {
  if (this.ttsPlaying) {
    speechSynthesis.cancel()
    this.ttsPlaying = false
    return
  }
  const text = this.activeDoc.contentText
  // 分段朗读（每段 200 字），避免长文本被系统截断
  const chunks = []
  for (let i = 0; i < text.length; i += 200) {
    chunks.push(text.slice(i, i + 200))
  }
  this._ttsChunks = chunks
  this._ttsIndex = 0
  this.ttsPlaying = true
  this._speakNext()
},

_speakNext() {
  if (this._ttsIndex >= this._ttsChunks.length) {
    this.ttsPlaying = false
    return
  }
  const utter = new SpeechSynthesisUtterance(this._ttsChunks[this._ttsIndex])
  utter.lang = 'zh-CN'
  utter.rate = this.ttsRate   // 语速（0.5~2.5）
  utter.onend = () => {
    this._ttsIndex++
    this._speakNext()
  }
  speechSynthesis.speak(utter)
}
```

**为什么要分段？** `SpeechSynthesisUtterance` 在 iOS Safari 上对超长文本会静默失败。
分成 200 字的小段，每段结束后播放下一段。

### 8.2 一键继续阅读

```javascript
computed: {
  lastReadDoc() {
    // 找到进度 > 0 且 < 100 的最近一篇
    return this.docs
      .filter(d => {
        const bm = this.bookmarks[d.id]
        return bm && bm.progress > 0 && bm.progress < 100
      })
      .sort((a, b) =>
        (this.bookmarks[b.id]?.updatedAt || 0) -
        (this.bookmarks[a.id]?.updatedAt || 0)
      )[0] || null
  }
}
```

仪表盘模板：

```html
<div v-if="lastReadDoc" class="continue-reading" @click="openDoc(lastReadDoc)">
  📖 继续阅读 · {{ lastReadDoc.name }} · {{ bookmarks[lastReadDoc.id].progress }}%
</div>
```

### 8.3 部署到 GitHub Pages

```bash
# 1. 构建
npm run build

# 2. 进入 dist 目录，初始化为独立 Git 仓库
cd dist
git init
git add -A
git commit -m "deploy"

# 3. 推送到 GitHub 仓库的 main 分支
git remote add origin git@github.com:你的用户名/knowledge-base-pwa.git
git push -f origin main

# 4. GitHub 仓库 Settings → Pages → Source: Deploy from branch → main
```

**后续更新流程：**
```bash
# 修改 public/sw.js 中的 CACHE_VERSION（必须！）
npm run build
cd dist && git add -A && git commit -m "update" && git push origin main
```

### 你学到了什么

- [x] Web Speech API（`speechSynthesis`）
- [x] iOS Safari 的 TTS 限制及分段解决方案
- [x] 基于书签数据的"继续阅读"推荐算法
- [x] GitHub Pages 部署流程
- [x] SW 缓存版本号与部署的关系

---

## 关键踩坑清单

在手写过程中你大概率会遇到以下问题，这里提前告诉你原因和解法：

### 1. DataCloneError: The object can not be cloned

**场景：** 把 Vue 响应式对象存入 IndexedDB
**原因：** Vue 3 用 Proxy 包装数据，IndexedDB 的 structuredClone 无法克隆 Proxy
**解法：** 存储前逐字段提取原始值

```javascript
// ✗ 报错
await db.docs.add(this.activeDoc)

// ✓ 正确
const plain = {
  contentHtml: String(doc.contentHtml || ''),
  contentText: String(doc.contentText || ''),
  size: Number(doc.size) || 0
}
await db.docs.update(id, plain)
```

### 2. 手机上看不到新功能（SW 缓存旧版本）

**场景：** 代码已更新部署，但手机打开仍是旧版
**原因：** SW 的缓存优先策略返回了旧的 JS/CSS 文件
**解法：** 每次部署必须修改 `sw.js` 中的 `CACHE_VERSION`

### 3. mammoth 导入报错

**场景：** `import mammoth from 'mammoth'` 打包失败
**原因：** mammoth 默认入口是 Node.js 版本，浏览器不支持
**解法：** `import mammoth from 'mammoth/mammoth.browser'`

### 4. PDF 解析在生产环境失败

**场景：** 开发环境正常，`npm run build` 后 PDF 解析报 Worker 错误
**原因：** pdfjs-dist 需要一个独立的 Worker 文件
**解法：** 必须设置 `pdfjsLib.GlobalWorkerOptions.workerSrc`

### 5. 阅读器菜单点不到（被遮挡）

**场景：** 弹出菜单在阅读器内容下面
**原因：** z-index 层级问题，阅读器是 5000，菜单低于它
**解法：** 弹出菜单的 z-index 必须高于阅读器（如 6000）

### 6. iOS 上 `overflow: hidden` 导致内容截断

**场景：** 仪表盘内容在手机上被截断
**原因：** 父容器的 `overflow: hidden` 把子内容裁剪了
**解法：** 在需要展示完整内容的容器上加 `overflow: visible !important`

### 7. 备份导入主键冲突

**场景：** 导入备份文件时报"主键已存在"
**原因：** 备份数据中的 `id` 与现有数据冲突
**解法：** 导入时去除 id，让 Dexie 自动分配新 id

```javascript
const cleaned = docs.map(({ id, ...rest }) => rest)
await db.docs.bulkAdd(cleaned)
```

---

## 推荐的手写顺序

```
Week 1: 阶段 1-2（骨架 + 数据库）
         → 重点理解：Vite 项目结构、Dexie schema

Week 2: 阶段 3（文档解析）
         → 重点理解：File API、各解析库的用法

Week 3: 阶段 4（阅读器）
         → 重点理解：CSS 布局、滚动计算、书签系统

Week 4: 阶段 5（PWA）
         → 重点理解：SW 生命周期、缓存策略

Week 5: 阶段 6-7（主题/搜索/版本/编辑/文件夹）
         → 重点理解：CSS 变量、版本升级、contenteditable

Week 6: 阶段 8（TTS/部署）+ 自由扩展
         → 重点理解：Web Speech API、部署流程
```

每完成一个阶段就 `git commit`，这样可以随时回退。如果某个阶段卡住了，对照本文档的代码片段找差异。

---

## 完整 npm 依赖速查

```json
{
  "dependencies": {
    "vue": "^3.5.13",
    "dexie": "^4.2.0",
    "mammoth": "^1.11.0",
    "marked": "^17.0.4",
    "pdfjs-dist": "^4.9.155",
    "xlsx": "^0.18.5"
  },
  "devDependencies": {
    "vite": "^5.4.14",
    "@vitejs/plugin-vue": "^5.2.1"
  }
}
```

---

## 扩展挑战（完成基础后）

- [ ] 把 App.vue 拆分为多个组件（DocumentList、Reader、Dashboard）
- [ ] 用 Vue Router 替代手动 tab 切换
- [ ] 用 Pinia 替代 data() 做状态管理
- [ ] 添加拖拽排序文档
- [ ] 添加 WebDAV 云同步
- [ ] 添加目录大纲（自动提取 H1-H3）
- [ ] 把 CSS 改为 Tailwind CSS

---

**文档版本**: 1.0
**创建日期**: 2026年3月19日
**项目总代码量**: ~6,800 行
**覆盖功能**: 文档导入/解析/阅读/编辑/版本管理/TTS/书签/搜索/文件夹/暗色模式/PWA 离线
