# Reader Assist 公共模块接入说明

文件：`src/utils/readerAssist.js`

## 能力清单
- `buildInPageMatches(root, query, options)`：构建页内检索结果
- `jumpToInPageMatch(root, match, options)`：跳到某个检索命中
- `jumpReaderToTop(root, options)`：跳转到页首
- `jumpReaderToBottom(root, options)`：跳转到页尾
- `locateListItemById(listRoot, id, options)`：定位左侧（或任意列表）项
- `findReaderRoot(scopeEl, selector)`：查找阅读正文根节点
- `flashElement(element, className, duration)`：临时高亮任意元素

## 最小接入步骤（Options API）
1. 在页面中引入工具函数。
2. 约定正文节点（如 `.read-main .markdown`）和列表节点（如 `ref="articleListRef"`）。
3. 增加状态：`inPageQuery`、`inPageMatches`、`inPageActiveIndex`。
4. 在方法里调用工具函数完成检索/跳转/定位。
5. 在样式中定义高亮类（如 `.located`、`.inpage-match-focus`）。

```js
import {
  buildInPageMatches,
  findReaderRoot,
  jumpToInPageMatch,
  jumpReaderToTop,
  jumpReaderToBottom,
  locateListItemById
} from '../utils/readerAssist.js'

methods: {
  findMarkdownRoot() {
    return findReaderRoot(this.$el, '.read-main .markdown')
  },
  refreshInPageMatches() {
    const root = this.findMarkdownRoot()
    this.inPageMatches = buildInPageMatches(root, this.inPageQuery, { limit: 120 })
    this.inPageActiveIndex = this.inPageMatches.length ? 0 : -1
  },
  jumpToInPageMatch(index) {
    const hit = this.inPageMatches[index]
    const root = this.findMarkdownRoot()
    if (!hit || !root) return
    this.inPageActiveIndex = index
    jumpToInPageMatch(root, hit, { focusClass: 'inpage-match-focus' })
  },
  jumpReaderToTop() {
    jumpReaderToTop(this.findMarkdownRoot())
  },
  jumpReaderToBottom() {
    jumpReaderToBottom(this.findMarkdownRoot())
  },
  locateCurrentItem() {
    locateListItemById(this.$refs.articleListRef, this.activeArticleId, {
      dataAttr: 'data-article-id',
      highlightClass: 'located'
    })
  }
}
```
