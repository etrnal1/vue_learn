# 阅读助手工具 - 技术文档

**readerAssist.js 的深度技术指南**

---

## 概述

`readerAssist.js` 是一个功能强大的 DOM 操作工具库，专为长文章阅读体验优化。提供了：

- 📖 **页内快速检索** - 实时搜索文章内容
- 🎯 **精准定位** - 自动定位搜索结果并高亮
- 📍 **列表导航** - 在列表中快速定位项目
- ✨ **视觉反馈** - 动画高亮和闪烁效果
- ⚡ **高性能** - TreeWalker 优化的 DOM 遍历

**文件大小**: 124 行 | **依赖**: 仅原生 DOM API | **兼容性**: ES2015+

---

## 核心函数

### 1. buildInPageMatches(root, query, options)

**功能**：在指定 DOM 容器中构建搜索匹配项

**签名**
```typescript
function buildInPageMatches(
  root: HTMLElement,
  query: string,
  options?: {
    limit?: number;           // 最多返回结果数（默认 120）
    previewBefore?: number;   // 前缀长度（默认 14）
    previewAfter?: number;    // 后缀长度（默认 18）
  }
): Array<{
  id: string;               // 唯一匹配 ID
  blockId: string;          // 所在块的锚点 ID
  preview: string;          // 上下文预览
}>
```

**工作流程**

```
输入: root DOM 元素, query 关键词
  ↓
1. 参数验证
   - query 非空且转小写
   - root 存在
  ↓
2. DOM 遍历（使用 TreeWalker）
   - SHOW_TEXT: 只关心文本节点
   - 跳过空白节点
   - 记录每个节点的相对位置
  ↓
3. 文本合并
   - 连接所有文本，保持位置映射
   - fullText = "this is a long article..."
   - nodes = [{text:"this", start: 0}, {text:"is", start: 5}, ...]
  ↓
4. 查找匹配
   - 在 fullText 中 indexOf(query)
   - 记录所有匹配的字符位置
  ↓
5. 映射块元素
   - 为每个匹配位置找到对应的块元素
   - 自动生成 blockAnchor (data-block-anchor)
  ↓
6. 生成预览
   - 从匹配位置前后提取上下文
   - 去掉多余空白，截断到指定长度
  ↓
输出: [{ id, blockId, preview }, ...]
```

**详细实现**

```javascript
export function buildInPageMatches(root, query, options = {}) {
  // 1. 参数规范化
  const q = String(query || '').trim().toLowerCase()
  if (!root || !q) return []

  const limit = Math.max(1, Number(options.limit) || 120)
  const previewBefore = Math.max(0, Number(options.previewBefore) || 14)
  const previewAfter = Math.max(0, Number(options.previewAfter) || 18)

  // 2. 使用 TreeWalker 遍历文本节点
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT  // 只返回文本节点
  )

  const nodes = []        // 文本节点映射
  let fullText = ''       // 合并文本

  // 3. 遍历并合并文本
  let node = walker.nextNode()
  while (node) {
    const text = String(node.nodeValue || '')
    if (text.trim()) {                         // 跳过纯空白
      nodes.push({
        node,                                  // 原始 DOM 文本节点
        start: fullText.length,                // 在合并文本中的起始位置
        text                                   // 文本内容
      })
      fullText += text
    }
    node = walker.nextNode()
  }

  if (!fullText) return []

  // 4. 查找所有匹配项
  const lower = fullText.toLowerCase()
  let cursor = 0
  const output = []

  while (output.length < limit) {
    // 从 cursor 位置开始查找
    const idx = lower.indexOf(q, cursor)
    if (idx === -1) break                      // 没找到
    cursor = idx + q.length                    // 移动光标到匹配结束

    // 5. 映射到块元素
    const host = nodes.find(item =>
      idx >= item.start && idx < item.start + item.text.length
    )
    const block = host?.node?.parentElement?.closest('p, li, blockquote, h1, h2, h3, h4, h5, h6, td, th')

    // 为块元素生成或获取锚点
    let blockId = block ? block.dataset.blockAnchor : ''
    if (block && !block.dataset.blockAnchor) {
      blockId = `blk_${idx}_${output.length}`
      block.dataset.blockAnchor = blockId
    }

    // 6. 生成预览文本
    const left = Math.max(0, idx - previewBefore)
    const right = Math.min(fullText.length, idx + q.length + previewAfter)
    const preview = fullText
      .slice(left, right)
      .replace(/\s+/g, ' ')                   // 规范空白
      .trim()

    output.push({
      id: `hit_${idx}_${output.length}`,
      blockId,
      preview
    })
  }

  return output
}
```

**性能分析**

| 操作 | 复杂度 | 说明 |
|------|--------|------|
| TreeWalker 遍历 | O(n) | n = 文本节点数 |
| 文本合并 | O(m) | m = 总文本长度 |
| 查找匹配 | O(m) | 使用内置 indexOf |
| 总体 | O(n + m) | 线性时间 |

**优化技巧**

```javascript
// 优化 1: 限制搜索范围，加快返回
const matches = buildInPageMatches(root, query, { limit: 50 })

// 优化 2: 对于非常长的文档，可以分段搜索
const sections = root.querySelectorAll('section, article')
for (const section of sections) {
  const matches = buildInPageMatches(section, query)
  results.push(...matches)
}

// 优化 3: 缓存合并文本，避免重复遍历
const textCache = new Map()
function getCachedFullText(root) {
  if (!textCache.has(root)) {
    // 重新计算
  }
  return textCache.get(root)
}
```

---

### 2. jumpToInPageMatch(root, match, options)

**功能**：在页面中定位并高亮某个搜索结果

**签名**
```typescript
function jumpToInPageMatch(
  root: HTMLElement,
  match: {
    id: string;
    blockId: string;
    preview: string;
  },
  options?: {
    behavior?: 'smooth' | 'auto';     // 滚动动画
    block?: 'start' | 'center' | 'end'; // 对齐位置
    focusClass?: string;               // 高亮 CSS 类名
    focusDuration?: number;            // 高亮持续时间（ms）
  }
): boolean
```

**工作流程**

```
输入: root 容器, match 对象, options 选项
  ↓
1. 查询目标块元素
   - 通过 data-block-anchor 属性查询
   - CSS.escape 防止特殊字符问题
  ↓
2. 定位到屏幕
   - scrollIntoView 设定滚动动画
   - block 参数控制对齐位置
  ↓
3. 应用高亮
   - 添加 focusClass （默认 'inpage-match-focus'）
   - 设置定时器，在指定时间后移除
  ↓
输出: boolean 表示是否成功定位
```

**详细实现**

```javascript
export function jumpToInPageMatch(root, match, options = {}) {
  if (!root || !match?.blockId) return false

  // 选项默认值
  const behavior = options.behavior || 'smooth'
  const block = options.block || 'center'
  const focusClass = options.focusClass || 'inpage-match-focus'
  const focusDuration = Number(options.focusDuration) || 1000

  // 查询目标块元素
  // CSS.escape 处理特殊字符（如空格、括号等）
  const escapedId = safeCssEscape(match.blockId)
  const target = root.querySelector(`[data-block-anchor="${escapedId}"]`)

  if (!target) return false

  // 滚动到目标位置
  target.scrollIntoView({
    behavior,      // 'smooth' 动画，'auto' 立即
    block           // 'start' 顶部, 'center' 中心, 'end' 底部
  })

  // 临时高亮
  flashElement(target, focusClass, focusDuration)

  return true
}

// 安全处理 CSS 选择器中的特殊字符
function safeCssEscape(value) {
  const text = String(value || '')
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(text)  // 推荐用法
  }
  // 降级方案
  return text.replace(/"/g, '\\"')
}
```

**使用示例**

```javascript
// 页内搜索，跳转到结果
const matches = buildInPageMatches(root, 'important')
if (matches.length > 0) {
  const success = jumpToInPageMatch(root, matches[0], {
    behavior: 'smooth',
    block: 'center',
    focusClass: 'highlight-yellow',
    focusDuration: 2000  // 高亮 2 秒
  })
  console.log(success ? '定位成功' : '定位失败')
}
```

**scrollIntoView 选项详解**

```javascript
// behavior: 滚动方式
target.scrollIntoView({ behavior: 'smooth' })  // 平滑滚动
target.scrollIntoView({ behavior: 'auto' })    // 立即跳转

// block: 对齐位置
// 假设视口 500px 高，目标 100px 高
target.scrollIntoView({ block: 'start' })   // 目标顶部对齐视口顶部
target.scrollIntoView({ block: 'center' })  // 目标中心对齐视口中心
target.scrollIntoView({ block: 'end' })     // 目标底部对齐视口底部

// inline: 水平对齐（如有需要）
target.scrollIntoView({ inline: 'nearest' }) // 最少滚动

// 完整示例
target.scrollIntoView({
  behavior: 'smooth',
  block: 'center',
  inline: 'nearest'
})
```

---

### 3. flashElement(element, className, duration)

**功能**：临时给元素添加 CSS 类，制造闪烁高亮效果

**签名**
```typescript
function flashElement(
  element: HTMLElement,
  className: string,
  duration?: number    // 毫秒数（默认 1000）
): void
```

**实现**

```javascript
export function flashElement(element, className, duration = 1000) {
  if (!element || !className) return

  // 添加高亮类
  element.classList.add(className)

  // 定时移除
  window.setTimeout(() => {
    element.classList.remove(className)
  }, Math.max(120, Number(duration) || 1000))  // 最少 120ms
}
```

**CSS 配置示例**

```css
/* 黄色高亮，带左边框 */
.inpage-match-focus {
  background-color: rgba(255, 195, 0, 0.4);
  border-left: 3px solid #ffc300;
  transition: all 0.2s ease;
}

/* 绿色高亮，带阴影 */
.highlight-green {
  background-color: rgba(16, 185, 129, 0.3);
  box-shadow: inset 0 0 10px rgba(16, 185, 129, 0.5);
  border-radius: 4px;
}

/* 脉冲动画 */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.inpage-match-focus {
  animation: pulse 0.5s ease-out;
}
```

---

### 4. jumpReaderToTop(root, options)

**功能**：快速返回文章顶部

**实现**

```javascript
export function jumpReaderToTop(root, options = {}) {
  if (!root) return false
  root.scrollIntoView({
    behavior: options.behavior || 'smooth',
    block: options.block || 'start'
  })
  return true
}
```

---

### 5. jumpReaderToBottom(root, options)

**功能**：快速跳到文章底部

**实现**

```javascript
export function jumpReaderToBottom(root, options = {}) {
  if (!root) return false
  const anchor = root.lastElementChild || root
  anchor.scrollIntoView({
    behavior: options.behavior || 'smooth',
    block: options.block || 'end'
  })
  return true
}
```

---

### 6. locateListItemById(listRoot, id, options)

**功能**：在列表中定位某个项，并临时高亮

**签名**
```typescript
function locateListItemById(
  listRoot: HTMLElement,
  id: string,
  options?: {
    dataAttr?: string;           // 数据属性名（默认 'data-article-id'）
    highlightClass?: string;     // 高亮类名（默认 'located'）
    highlightDuration?: number;  // 高亮时长（默认 1200ms）
    behavior?: string;           // 滚动动画
    block?: string;              // 对齐位置
  }
): boolean
```

**实现**

```javascript
export function locateListItemById(listRoot, id, options = {}) {
  if (!listRoot || !id) return false

  const dataAttr = String(options.dataAttr || 'data-article-id')
  const highlightClass = String(options.highlightClass || 'located')
  const highlightDuration = Number(options.highlightDuration) || 1200

  // 通过数据属性查询项
  const escaped = safeCssEscape(id)
  const item = listRoot.querySelector(`[${dataAttr}="${escaped}"]`)

  if (!item) return false

  // 滚动到可见
  item.scrollIntoView({
    behavior: options.behavior || 'smooth',
    block: options.block || 'center'
  })

  // 临时高亮
  flashElement(item, highlightClass, highlightDuration)

  return true
}
```

**使用示例**

```javascript
// 在左侧词条列表中定位当前项
const articleId = 'article_1698765432100'
locateListItemById(
  this.$refs.articleListRef,
  articleId,
  {
    dataAttr: 'data-article-id',
    highlightClass: 'located',
    highlightDuration: 1200
  }
)
```

---

### 7. findReaderRoot(scopeEl, selector)

**功能**：查找阅读正文的根容器

**签名**
```typescript
function findReaderRoot(
  scopeEl: HTMLElement,
  selector?: string  // CSS 选择器（默认 '.read-main .markdown'）
): HTMLElement | null
```

**实现**

```javascript
export function findReaderRoot(scopeEl, selector = '.read-main .markdown') {
  return scopeEl?.querySelector?.(selector) || null
}
```

**自定义选择器**

```javascript
// 默认选择器
findReaderRoot(this.$el)  // 查找 .read-main .markdown

// 自定义选择器
findReaderRoot(this.$el, '.article-content')
findReaderRoot(this.$el, '[data-role="main-content"]')
findReaderRoot(this.$el, '#markdown-body')
```

---

## 集成到 Vue 组件

### 完整示例：WikiCenter.vue

```javascript
import {
  buildInPageMatches,
  jumpToInPageMatch,
  jumpReaderToTop,
  jumpReaderToBottom,
  locateListItemById,
  findReaderRoot
} from '@/utils/readerAssist.js'

export default {
  data() {
    return {
      inPageQuery: '',           // 搜索关键词
      inPageMatches: [],         // 搜索结果
      inPageActiveIndex: -1,     // 当前结果索引
      showReaderModule: true     // 是否显示工具条
    }
  },

  methods: {
    // 查找正文容器
    findMarkdownRoot() {
      return findReaderRoot(this.$el, '.read-main .markdown')
    },

    // 构建搜索结果
    refreshInPageMatches() {
      const root = this.findMarkdownRoot()
      if (!root) {
        this.inPageMatches = []
        return
      }

      this.inPageMatches = buildInPageMatches(root, this.inPageQuery, {
        limit: 120
      })

      // 重置索引
      this.inPageActiveIndex = this.inPageMatches.length ? 0 : -1
    },

    // 跳转到搜索结果
    jumpToMatch(index) {
      const hit = this.inPageMatches[index]
      if (!hit) return

      const root = this.findMarkdownRoot()
      if (!root) return

      const success = jumpToInPageMatch(root, hit, {
        behavior: 'smooth',
        block: 'center',
        focusClass: 'inpage-match-focus',
        focusDuration: 1000
      })

      if (success) {
        this.inPageActiveIndex = index
      }
    },

    // 上一个/下一个
    jumpToNextMatch() {
      if (this.inPageMatches.length === 0) return
      const nextIndex = (this.inPageActiveIndex + 1) % this.inPageMatches.length
      this.jumpToMatch(nextIndex)
    },

    jumpToPrevMatch() {
      if (this.inPageMatches.length === 0) return
      const prevIndex = (this.inPageActiveIndex - 1 + this.inPageMatches.length) % this.inPageMatches.length
      this.jumpToMatch(prevIndex)
    },

    // 页面导航
    scrollToTop() {
      const root = this.findMarkdownRoot()
      jumpReaderToTop(root)
    },

    scrollToBottom() {
      const root = this.findMarkdownRoot()
      jumpReaderToBottom(root)
    },

    // 定位列表项
    locateActiveArticle() {
      locateListItemById(
        this.$refs.articleListRef,
        this.activeArticleId,
        {
          dataAttr: 'data-article-id',
          highlightClass: 'located'
        }
      )
    }
  },

  watch: {
    // 监听搜索关键词变化
    inPageQuery: {
      handler() {
        this.refreshInPageMatches()
      }
    },

    // 监听词条变化
    activeArticleId() {
      // 清空搜索状态
      this.inPageQuery = ''
      this.inPageMatches = []
      this.inPageActiveIndex = -1
    }
  }
}
```

### 模板集成

```vue
<template>
  <!-- 阅读工具条 -->
  <ArticleReaderModule
    :query="inPageQuery"
    :hit-count="inPageMatches.length"
    :can-navigate="inPageMatches.length > 0"
    :visible="showReaderModule"
    @update:query="inPageQuery = $event"
    @prev="jumpToPrevMatch()"
    @next="jumpToNextMatch()"
    @top="scrollToTop()"
    @bottom="scrollToBottom()"
    @toggle-visible="showReaderModule = $event"
  />

  <!-- 正文容器，需要匹配 findReaderRoot 的选择器 -->
  <div class="read-main">
    <div class="markdown" v-html="renderedContent"></div>
  </div>
</template>
```

---

## 常见问题和解决方案

### Q1: 搜索结果不高亮

**原因**：CSS 类名不匹配或样式未定义

**解决方案**：
```javascript
// 1. 确认 CSS 类存在
.inpage-match-focus {
  background-color: rgba(255, 195, 0, 0.4);
  border-left: 3px solid #ffc300;
}

// 2. 检查高亮类名参数
jumpToInPageMatch(root, match, {
  focusClass: 'inpage-match-focus'  // 确认与 CSS 类名一致
})

// 3. 在浏览器检查
console.log(document.querySelector('[data-block-anchor]'))
```

### Q2: 查询不到块元素

**原因**：块元素选择器不正确

**解决方案**：
```javascript
// 默认 BLOCK_SELECTOR
'p, li, blockquote, h1, h2, h3, h4, h5, h6, td, th'

// 如果使用了自定义标签，修改选择器
const BLOCK_SELECTOR = 'p, li, blockquote, h1, h2, h3, h4, h5, h6, td, th, .custom-block'
```

### Q3: 特殊字符导致 CSS 选择器失败

**原因**：blockId 中包含特殊字符（如空格、引号、括号）

**解决方案**：
```javascript
// 已在 jumpToInPageMatch 中处理
const escapedId = safeCssEscape(match.blockId)
const target = root.querySelector(`[data-block-anchor="${escapedId}"]`)

// safeCssEscape 会自动转义特殊字符
// "Block (1)" → "Block \\(1\\)"
```

### Q4: 性能问题，搜索很慢

**原因**：文本过多或文本节点过多

**解决方案**：
```javascript
// 1. 限制结果数
const matches = buildInPageMatches(root, query, { limit: 50 })

// 2. 对长文档分段搜索
const sections = root.querySelectorAll('section')
for (const section of sections) {
  const matches = buildInPageMatches(section, query)
  results.push(...matches)
}

// 3. 使用防抖避免频繁搜索
watch: {
  query: {
    handler() {
      clearTimeout(this.searchTimeout)
      this.searchTimeout = setTimeout(() => {
        this.refreshMatches()
      }, 300)
    }
  }
}
```

---

## 浏览器兼容性

| 特性 | Chrome | Firefox | Safari | Edge |
|------|--------|---------|--------|------|
| TreeWalker | ✅ 全部 | ✅ 全部 | ✅ 全部 | ✅ 全部 |
| scrollIntoView | ✅ 9+ | ✅ 全部 | ✅ 全部 | ✅ 全部 |
| CSS.escape | ✅ 49+ | ✅ 55+ | ✅ 10.1+ | ✅ 79+ |
| classList | ✅ 全部 | ✅ 全部 | ✅ 全部 | ✅ 全部 |

**降级处理**：
- CSS.escape 不可用时，使用简单的 replace 替换
- scrollIntoView smooth 不支持时，退回到 auto

---

## 性能优化建议

### 优化 1: 缓存 TreeWalker 结果

```javascript
const cache = new WeakMap()

function getCachedMatches(root, query) {
  if (!cache.has(root)) {
    cache.set(root, {
      text: null,
      nodes: null
    })
  }
  // 重用已计算的文本和节点
}
```

### 优化 2: 延迟加载和虚拟滚动

```javascript
// 只在用户进入阅读视图时初始化搜索功能
mounted() {
  if (this.viewTab === 'read') {
    this.initializeSearch()
  }
}

watch: {
  viewTab(newVal) {
    if (newVal === 'read') {
      this.initializeSearch()
    }
  }
}
```

### 优化 3: 批量操作

```javascript
// 一次性添加多个类
elements.forEach(el => {
  el.classList.add('matched', 'highlighted')
})

// 使用 DocumentFragment 减少 DOM 操作
const frag = document.createDocumentFragment()
// ... 构建 fragment
root.appendChild(frag)
```

---

## 扩展功能建议

### 扩展 1: 正则表达式搜索

```javascript
export function buildInPageMatchesRegex(root, pattern, options = {}) {
  const regex = new RegExp(pattern, 'gi')
  // 类似实现，但使用 regex.exec()
}
```

### 扩展 2: 上下文感知搜索

```javascript
export function buildSmartMatches(root, query, options = {}) {
  // 支持同义词、拼音、模糊匹配
  // 使用专门的搜索库如 fuse.js
}
```

### 扩展 3: 搜索历史

```javascript
class SearchHistory {
  constructor(maxSize = 10) {
    this.history = []
    this.maxSize = maxSize
  }

  add(query) {
    // 去重，添加到历史
  }

  get() {
    return this.history
  }

  clear() {
    this.history = []
  }
}
```

---

## 相关文件

- 📄 **src/utils/readerAssist.js** - 本工具库源码
- 📄 **docs/reader-assist-usage.md** - 使用说明
- 📄 **src/pages/WikiCenter.vue** - 集成示例
- 📄 **src/components/article/ArticleReaderModule.vue** - UI 组件

---

**版本**: 1.0
**创建日期**: 2026年3月1日
**维护人**: Claude Code
**代码行数**: 124 行
**导出函数**: 7 个
