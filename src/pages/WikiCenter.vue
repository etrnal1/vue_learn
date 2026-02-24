<template>
  <div class="wiki-page">
    <div class="wiki-hero panel">
      <div>
        <h2>维基知识中心</h2>
        <p>像维基百科一样组织你的知识：检索、编辑、追溯、协作。</p>
      </div>
      <div class="hero-stats">
        <span class="stat">词条 {{ articles.length }}</span>
        <span class="stat">收藏 {{ starredCount }}</span>
        <span class="stat">总浏览 {{ totalViews }}</span>
      </div>
    </div>

    <div class="wiki-toolbar panel">
      <input v-model.trim="searchQuery" class="input" placeholder="搜索标题 / 摘要 / 标签 / 正文...">
      <select v-model="categoryFilter" class="input">
        <option value="all">全部分类</option>
        <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
      </select>
      <select v-model="sortBy" class="input">
        <option value="recent">最近更新</option>
        <option value="popular">浏览最多</option>
        <option value="title">标题 A-Z</option>
      </select>
      <label class="check"><input v-model="onlyStarred" type="checkbox"> 仅收藏</label>
      <button class="btn btn-primary" @click="createArticle">新建词条</button>
      <button class="btn" @click="openRandomArticle">随机词条</button>
      <button class="btn" :disabled="importingDoc" @click="triggerDocImport">{{ importingDoc ? '导入中...' : '导入文档' }}</button>
      <button class="btn" @click="showPalette = !showPalette">{{ showPalette ? '收起色卡' : '色卡' }}</button>
      <button class="btn" @click="exportJson">导出JSON</button>
      <button class="btn" @click="exportCsv">导出CSV</button>
      <button class="btn" @click="triggerImportJson">导入JSON</button>
      <button class="btn" @click="triggerImportCsv">导入CSV</button>
      <input ref="docImportRef" class="hidden-input" type="file" accept=".md,.markdown,.txt,.doc,.docx,.pdf" @change="importDocumentToDraft">
      <input ref="importRefJson" class="hidden-input" type="file" accept="application/json" @change="importJson">
      <input ref="importRefCsv" class="hidden-input" type="file" accept=".csv,text/csv" @change="importCsv">
      <div class="import-log-wrap">
        <div class="import-log-head">
          <strong>导入日志</strong>
          <button class="btn btn-sm" @click="clearImportLogs">清空</button>
        </div>
        <div class="import-log-panel">
          <div v-if="importLogs.length === 0" class="import-log-empty">暂无导入日志</div>
          <div v-for="log in importLogs" :key="log.id" class="import-log-line" :class="`lv-${log.level}`">
            <span class="time">{{ formatDate(log.time) }}</span>
            <span class="msg">{{ log.message }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showPalette" class="palette-panel panel">
      <div class="palette-head">
        <h3>色卡</h3>
        <span class="meta">点击颜色复制 HEX</span>
      </div>
      <div class="palette-groups">
        <section v-for="group in paletteGroups" :key="group.name" class="palette-group">
          <h4>{{ group.name }}</h4>
          <div class="swatches">
            <button
              v-for="color in group.colors"
              :key="`${group.name}_${color}`"
              class="swatch"
              :style="{ background: color }"
              :title="color"
              @click="copyColor(color)"
            >
              <span class="swatch-code">{{ color }}</span>
            </button>
          </div>
        </section>
      </div>
    </div>

    <div class="wiki-layout">
      <aside v-show="!isMobile || !mobileReadMode" class="panel list-panel">
        <h3>词条列表</h3>
        <div v-if="filteredArticles.length === 0" class="empty">没有匹配词条</div>
        <div v-else ref="articleListRef" class="article-list" @scroll.passive="onArticleListScroll">
          <div :style="{ height: `${virtualArticlePaddingTop}px` }"></div>
          <article
            v-for="item in virtualDisplayedArticles"
            :key="item.id"
            class="article-item"
            :class="{ active: item.id === activeArticleId }"
            @click="openArticle(item.id)"
          >
            <div class="item-head">
              <h4>{{ item.title }}</h4>
              <div class="item-actions">
                <button class="star-btn" @click.stop="toggleStar(item)">{{ item.starred ? '★' : '☆' }}</button>
                <button class="btn btn-sm btn-danger-inline" @click.stop="removeArticle(item.id)">删</button>
              </div>
            </div>
            <div class="meta">
              <span>{{ item.category || '未分类' }}</span>
              <span>·</span>
              <span>{{ item.views }} 浏览</span>
              <span>·</span>
              <span>{{ formatDate(item.updatedAt) }}</span>
            </div>
            <p class="summary">{{ item.summary || '暂无摘要' }}</p>
            <div v-if="item.tags.length" class="tags">
              <span v-for="tag in item.tags" :key="tag" class="tag">#{{ tag }}</span>
            </div>
          </article>
          <div :style="{ height: `${virtualArticlePaddingBottom}px` }"></div>
        </div>
      </aside>

      <section ref="contentPanelRef" class="panel content-panel">
        <div v-if="!activeArticle" class="empty">
          请先选择词条，或点击“新建词条”。
        </div>

        <template v-else>
          <div class="content-head">
            <div>
              <h3>{{ activeArticle.title }}</h3>
              <div class="meta">
                <span>{{ activeArticle.category || '未分类' }}</span>
                <span>·</span>
                <span>{{ activeArticle.views }} 浏览</span>
                <span>·</span>
                <span>更新于 {{ formatDate(activeArticle.updatedAt) }}</span>
              </div>
            </div>
            <div class="head-actions">
              <button v-if="isMobile && mobileReadMode" class="btn" @click="backToList">返回列表</button>
              <button class="btn" @click="viewTab = 'read'">阅读</button>
              <button class="btn" @click="startEdit">编辑</button>
              <button class="btn" @click="viewTab = 'history'">历史</button>
              <button class="btn" @click="viewTab = 'timeline'">时间轴</button>
              <button class="btn" @click="viewTab = 'discuss'">讨论</button>
              <button v-if="isMobile && viewTab === 'read' && toc.length" class="btn" @click="toggleMobileToc">
                {{ showMobileToc ? '收起目录' : '目录' }}
              </button>
              <button class="btn btn-danger" @click="removeArticle(activeArticle.id)">删除</button>
            </div>
          </div>

          <div v-if="viewTab === 'read'" class="read-area">
            <div class="read-layout">
              <div class="read-main">
                <div v-if="isMobile" class="mobile-read-tools">
                  <button class="btn btn-sm" @click="adjustReaderFont(-1)">A-</button>
                  <span class="tool-stat">字号 {{ readerFontSize }}px</span>
                  <button class="btn btn-sm" @click="adjustReaderFont(1)">A+</button>
                  <button class="btn btn-sm" @click="adjustReaderLineHeight(-0.05)">紧凑</button>
                  <button class="btn btn-sm" @click="adjustReaderLineHeight(0.05)">舒展</button>
                </div>
                <p v-if="activeArticle.summary" class="lead">{{ activeArticle.summary }}</p>
                <div class="markdown" :style="readerStyle" v-html="renderedHtml"></div>
              </div>

              <aside v-if="toc.length > 0" class="inline-toc">
                <h4>章节目录</h4>
                <div class="toc-list">
                  <a
                    v-for="item in toc"
                    :key="item.id"
                    class="toc-item"
                    :style="{ paddingLeft: `${(item.level - 1) * 10 + 8}px` }"
                    @click="jumpToHeading(item.id)"
                  >
                    {{ item.text }}
                  </a>
                </div>
              </aside>
            </div>
          </div>

          <div v-if="viewTab === 'edit'" class="edit-area">
            <div class="form-group">
              <label>标题 *</label>
              <input v-model.trim="draft.title" class="input" placeholder="输入词条标题">
            </div>
            <div class="form-group">
              <label>摘要</label>
              <input v-model.trim="draft.summary" class="input" placeholder="一句话摘要">
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>分类</label>
                <input v-model.trim="draft.category" class="input" placeholder="技术 / 历史 / 产品">
              </div>
              <div class="form-group">
                <label>标签（逗号分隔）</label>
                <input v-model.trim="draft.tagsText" class="input" placeholder="vue, javascript, web">
              </div>
            </div>
            <div class="form-group">
              <label>正文（支持基础 Markdown）</label>
              <textarea v-model="draft.content" class="input content-input" rows="14" placeholder="# 标题\n\n- 要点 A\n- 要点 B"></textarea>
            </div>
            <div class="form-group">
              <label>图片上传（可预览并插入正文）</label>
              <input class="input" type="file" accept="image/*" multiple @change="handleImageUpload">
            </div>
            <div v-if="draftImages.length" class="image-preview-list">
              <article v-for="item in draftImages" :key="item.id" class="image-preview-card">
                <img :src="item.url" :alt="item.name" class="image-preview" loading="lazy" decoding="async">
                <div class="image-preview-actions">
                  <button class="btn btn-sm btn-primary" @click="insertImageToDraft(item)">插入正文</button>
                  <button class="btn btn-sm" @click="removeDraftImage(item.id)">移除</button>
                </div>
              </article>
            </div>
            <div v-if="draftSavedAt" class="draft-tip">草稿已自动保存：{{ formatDate(draftSavedAt) }}</div>
            <div class="actions">
              <button class="btn btn-primary" @click="saveDraft">保存词条</button>
              <button class="btn" @click="cancelEdit">取消</button>
            </div>
          </div>

          <div v-if="viewTab === 'history'" class="history-area">
            <div v-if="!activeArticle.history.length" class="empty">暂无历史版本</div>
            <div v-else class="history-list">
              <article v-for="ver in activeArticle.history" :key="ver.id" class="history-item">
                <div>
                  <strong>{{ formatDate(ver.updatedAt) }}</strong>
                  <div class="meta">{{ ver.summary || '无摘要' }}</div>
                </div>
                <div class="history-actions">
                  <button class="btn btn-sm" @click="previewVersionDiff(ver.id)">查看对比</button>
                  <button class="btn btn-sm" @click="rollbackVersion(ver.id)">回滚到此版本</button>
                </div>
              </article>
            </div>
            <div v-if="versionDiffPreview" class="diff-panel">
              <h4>版本对比预览</h4>
              <pre class="diff-pre">{{ versionDiffPreview }}</pre>
            </div>
          </div>

          <div v-if="viewTab === 'timeline'" class="timeline-area">
            <div v-if="timelineEvents.length === 0" class="empty">暂无时间轴数据</div>
            <div v-else class="timeline-list">
              <article v-for="event in timelineEvents" :key="event.id" class="timeline-item">
                <div class="timeline-dot" :class="{ update: event.type === 'update' }"></div>
                <div class="timeline-main">
                  <div class="meta">{{ formatDate(event.time) }} · {{ event.type === 'create' ? '创建' : '更新' }}</div>
                  <button class="timeline-link" @click="openArticle(event.articleId)">{{ event.title }}</button>
                  <p v-if="event.summary" class="summary">{{ event.summary }}</p>
                </div>
              </article>
            </div>
          </div>

          <div v-if="viewTab === 'discuss'" class="discussion-area">
            <div class="form-group">
              <label>评论作者</label>
              <input v-model.trim="commentAuthor" class="input" placeholder="例如：张三">
            </div>
            <div class="form-group">
              <label>新增讨论</label>
              <textarea v-model.trim="commentText" class="input" rows="3" placeholder="写下你的补充、问题或修订建议"></textarea>
            </div>
            <div class="actions">
              <button class="btn btn-primary" @click="addComment">提交讨论</button>
            </div>
            <div v-if="!activeArticle.comments.length" class="empty">暂无讨论</div>
            <div v-else class="comment-list">
              <article v-for="comment in activeArticle.comments" :key="comment.id" class="comment-item">
                <div class="comment-head">
                  <div class="meta">{{ comment.author }} · {{ formatDate(comment.createdAt) }}</div>
                  <button class="btn btn-sm" @click="removeComment(comment.id)">删除</button>
                </div>
                <p>{{ comment.text }}</p>
              </article>
            </div>
          </div>
        </template>
      </section>

      <aside v-show="!isMobile || !mobileReadMode" class="panel side-panel">
        <div class="widget">
          <h3>相关文章</h3>
          <div v-if="relatedArticles.length === 0" class="empty mini">暂无推荐</div>
          <div v-else class="related-list">
            <button v-for="item in relatedArticles" :key="item.id" class="related-item" @click="openArticle(item.id)">
              {{ item.title }}
            </button>
          </div>
        </div>

        <div class="widget">
          <h3>最近浏览</h3>
          <div v-if="recentArticles.length === 0" class="empty mini">暂无记录</div>
          <div v-else class="recent-list">
            <button v-for="item in recentArticles" :key="item.id" class="related-item" @click="openArticle(item.id)">
              {{ item.title }}
            </button>
          </div>
        </div>
      </aside>
    </div>

    <div v-if="isMobile && showMobileToc" class="mobile-toc-mask" @click="showMobileToc = false"></div>
    <aside v-if="isMobile" class="mobile-toc-drawer panel" :class="{ open: showMobileToc }">
      <div class="mobile-toc-head">
        <h3>章节目录</h3>
        <button class="btn btn-sm" @click="showMobileToc = false">关闭</button>
      </div>
      <div v-if="toc.length === 0" class="empty mini">当前词条无目录</div>
      <div v-else class="toc-list">
        <a
          v-for="item in toc"
          :key="item.id"
          class="toc-item"
          :style="{ paddingLeft: `${(item.level - 1) * 10 + 8}px` }"
          @click="jumpToHeading(item.id)"
        >
          {{ item.text }}
        </a>
      </div>
    </aside>
  </div>
</template>

<script>
import { api } from '../utils/api.js'
import { marked } from 'marked'

const STORAGE_KEY = 'wiki_center_articles_v1'
const STATE_KEY = 'wiki_center_state_v1'
const DRAFT_KEY = 'wiki_center_draft_v1'

function escapeHtml(input) {
  return String(input || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export default {
  name: 'WikiCenter',
  data() {
    return {
      articles: [],
      activeArticleId: null,
      searchQuery: '',
      categoryFilter: 'all',
      sortBy: 'recent',
      onlyStarred: false,
      viewTab: 'read',
      draft: this.emptyDraft(),
      draftSavedAt: null,
      compareVersionId: '',
      commentText: '',
      commentAuthor: '当前用户',
      recentIds: [],
      storageMode: 'unknown',
      viewportWidth: typeof window !== 'undefined' ? window.innerWidth : 1200,
      mobileReadMode: false,
      showMobileToc: false,
      importingDoc: false,
      importLogs: [],
      articleListScrollTop: 0,
      articleListViewportHeight: 760,
      articleItemHeight: 190,
      articleRenderBuffer: 6,
      draftImages: [],
      showPalette: false,
      readerFontSize: 15,
      readerLineHeight: 1.8,
      paletteGroups: [
        { name: '主色', colors: ['#2563EB', '#0EA5E9', '#06B6D4', '#14B8A6', '#22C55E', '#84CC16'] },
        { name: '暖色', colors: ['#F97316', '#F59E0B', '#EAB308', '#EF4444', '#EC4899', '#D946EF'] },
        { name: '中性色', colors: ['#0F172A', '#1E293B', '#334155', '#475569', '#64748B', '#94A3B8'] },
        { name: '浅色背景', colors: ['#F8FAFC', '#F1F5F9', '#E2E8F0', '#E0F2FE', '#ECFEFF', '#F0FDF4'] }
      ]
    }
  },
  computed: {
    totalViews() {
      return this.articles.reduce((sum, item) => sum + (Number(item.views) || 0), 0)
    },
    starredCount() {
      return this.articles.filter((item) => item.starred).length
    },
    categories() {
      const set = new Set(this.articles.map((item) => item.category).filter(Boolean))
      return Array.from(set).sort((a, b) => a.localeCompare(b, 'zh-CN'))
    },
    filteredArticles() {
      const q = this.searchQuery.toLowerCase()
      return [...this.articles]
        .filter((item) => {
          if (this.categoryFilter !== 'all' && item.category !== this.categoryFilter) return false
          if (this.onlyStarred && !item.starred) return false
          if (!q) return true
          return String(item.searchText || '').includes(q)
        })
        .sort((a, b) => {
          if (this.sortBy === 'popular') return (b.views || 0) - (a.views || 0)
          if (this.sortBy === 'title') return a.title.localeCompare(b.title, 'zh-CN')
          return (b.updatedAt || 0) - (a.updatedAt || 0)
        })
    },
    virtualArticleStart() {
      return Math.max(
        0,
        Math.floor(this.articleListScrollTop / this.articleItemHeight) - this.articleRenderBuffer
      )
    },
    virtualArticleVisibleCount() {
      const base = Math.ceil(this.articleListViewportHeight / this.articleItemHeight)
      return base + this.articleRenderBuffer * 2
    },
    virtualArticleEnd() {
      return Math.min(this.filteredArticles.length, this.virtualArticleStart + this.virtualArticleVisibleCount)
    },
    virtualDisplayedArticles() {
      return this.filteredArticles.slice(this.virtualArticleStart, this.virtualArticleEnd)
    },
    virtualArticlePaddingTop() {
      return this.virtualArticleStart * this.articleItemHeight
    },
    virtualArticlePaddingBottom() {
      return (this.filteredArticles.length - this.virtualArticleEnd) * this.articleItemHeight
    },
    activeArticle() {
      return this.articles.find((item) => item.id === this.activeArticleId) || null
    },
    toc() {
      if (!this.activeArticle) return []
      const normalized = this.normalizeDocumentMarkdown(this.activeArticle.content || '')
      return this.extractMarkdownHeadings(normalized)
    },
    renderedHtml() {
      if (!this.activeArticle) return ''
      const normalized = this.normalizeDocumentMarkdown(this.activeArticle.content || '')
      return this.markdownToHtml(normalized)
    },
    readerStyle() {
      return {
        fontSize: `${this.readerFontSize}px`,
        lineHeight: this.readerLineHeight
      }
    },
    relatedArticles() {
      if (!this.activeArticle) return []
      const baseTags = new Set(this.activeArticle.tags)
      return this.articles
        .filter((item) => item.id !== this.activeArticle.id)
        .map((item) => {
          const sameCategory = item.category && item.category === this.activeArticle.category ? 1 : 0
          const sharedTags = item.tags.filter((tag) => baseTags.has(tag)).length
          return { item, score: sameCategory * 2 + sharedTags }
        })
        .filter((row) => row.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 6)
        .map((row) => row.item)
    },
    recentArticles() {
      return this.recentIds
        .map((id) => this.articles.find((item) => item.id === id))
        .filter(Boolean)
        .slice(0, 8)
    },
    isMobile() {
      return this.viewportWidth <= 880
    },
    timelineEvents() {
      const events = []
      for (const item of this.articles) {
        events.push({
          id: `create_${item.id}`,
          articleId: item.id,
          type: 'create',
          time: item.createdAt || item.updatedAt || Date.now(),
          title: item.title,
          summary: item.summary || ''
        })
        if (item.updatedAt && item.createdAt && item.updatedAt - item.createdAt > 60 * 1000) {
          events.push({
            id: `update_${item.id}_${item.updatedAt}`,
            articleId: item.id,
            type: 'update',
            time: item.updatedAt,
            title: item.title,
            summary: item.summary || ''
          })
        }
      }
      return events.sort((a, b) => (a.time || 0) - (b.time || 0))
    },
    versionDiffPreview() {
      if (!this.activeArticle || !this.compareVersionId) return ''
      const target = this.activeArticle.history.find((item) => item.id === this.compareVersionId)
      if (!target) return ''
      return this.buildDiffPreview(this.activeArticle.content || '', target.content || '')
    }
  },
  methods: {
    emptyDraft() {
      return {
        title: '',
        summary: '',
        category: '',
        tagsText: '',
        content: ''
      }
    },
    parseTags(input) {
      return String(input || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 20)
    },
    buildSearchText(item) {
      const title = String(item?.title || '')
      const summary = String(item?.summary || '')
      const category = String(item?.category || '')
      const tags = Array.isArray(item?.tags) ? item.tags.join(' ') : ''
      const contentPrefix = String(item?.content || '').slice(0, 600)
      return [title, summary, category, tags, contentPrefix].join(' ').toLowerCase()
    },
    onArticleListScroll(event) {
      this.articleListScrollTop = event?.target?.scrollTop || 0
    },
    measureArticleListViewport() {
      const el = this.$refs.articleListRef
      if (!el) return
      this.articleListViewportHeight = Math.max(220, el.clientHeight || 760)
    },
    resetArticleListScroll() {
      this.articleListScrollTop = 0
      const el = this.$refs.articleListRef
      if (el) el.scrollTop = 0
    },
    buildDiffPreview(currentContent, targetContent) {
      const current = String(currentContent || '').split('\n')
      const target = String(targetContent || '').split('\n')
      const max = Math.max(current.length, target.length)
      const out = []
      for (let i = 0; i < max; i += 1) {
        const c = current[i] ?? ''
        const t = target[i] ?? ''
        if (c === t) continue
        if (c) out.push(`- ${c}`)
        if (t) out.push(`+ ${t}`)
      }
      if (out.length === 0) return '当前词条与该历史版本内容一致。'
      return out.slice(0, 160).join('\n')
    },
    saveDraftCache() {
      if (this.viewTab !== 'edit') return
      const payload = {
        activeArticleId: this.activeArticleId || null,
        draft: this.draft,
        savedAt: Date.now()
      }
      localStorage.setItem(DRAFT_KEY, JSON.stringify(payload))
      this.draftSavedAt = payload.savedAt
    },
    clearDraftCache() {
      localStorage.removeItem(DRAFT_KEY)
      this.draftSavedAt = null
    },
    restoreDraftCache() {
      try {
        const raw = localStorage.getItem(DRAFT_KEY)
        if (!raw) return
        const parsed = JSON.parse(raw)
        if (!parsed || typeof parsed !== 'object') return
        const cachedDraft = parsed.draft
        if (!cachedDraft || typeof cachedDraft !== 'object') return

        const targetId = parsed.activeArticleId ? String(parsed.activeArticleId) : null
        if (targetId && this.articles.some((item) => item.id === targetId)) {
          this.activeArticleId = targetId
        }

        this.draft = {
          title: String(cachedDraft.title || ''),
          summary: String(cachedDraft.summary || ''),
          category: String(cachedDraft.category || ''),
          tagsText: String(cachedDraft.tagsText || ''),
          content: String(cachedDraft.content || '')
        }
        this.viewTab = 'edit'
        this.draftSavedAt = Number(parsed.savedAt) || null
      } catch (error) {
        console.warn('恢复草稿失败', error)
      }
    },
    makeSlug(text, seen) {
      const base = text
        .toLowerCase()
        .replace(/[^\u4e00-\u9fa5\w\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-') || 'section'
      let slug = base
      let i = 2
      while (seen.has(slug)) {
        slug = `${base}-${i}`
        i += 1
      }
      seen.add(slug)
      return slug
    },
    detectStructuredHeading(line) {
      const text = String(line || '').trim()
      if (!text || text.length > 140) return null

      const chapterStyle = text.match(/^第[一二三四五六七八九十百千万零\d]+[章节篇部分][：:\s-]*(.*)$/)
      if (chapterStyle) {
        const title = chapterStyle[1] ? `${text}` : text
        return { level: 2, text: title }
      }

      const chineseOrdered = text.match(/^[一二三四五六七八九十百千万]+[、.．]\s*(.{2,120})$/)
      if (chineseOrdered) {
        return { level: 2, text }
      }

      const numbered = text.match(/^(\d+(?:\.\d+){0,3})[)\.、\s_-]+(.{2,120})$/)
      if (numbered) {
        const depth = numbered[1].split('.').length
        const level = Math.min(4, depth + 1)
        return { level, text: numbered[2].trim() }
      }

      const chapterEn = text.match(/^chapter\s+\d+[\s:.-]+(.+)$/i)
      if (chapterEn) {
        return { level: 2, text: chapterEn[1].trim() || text }
      }

      return null
    },
    normalizeDocumentMarkdown(content) {
      const raw = String(content || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
      if (!raw) return ''

      const hasHtmlBlock = /<\s*(h[1-6]|p|ul|ol|li|table|blockquote|pre|code)\b/i.test(raw)
      if (hasHtmlBlock) return raw

      const lines = raw.split('\n').map((line) => line.replace(/\t/g, '  ').trimEnd())
      const hasMarkdownHeading = lines.some((line) => /^\s{0,3}#{1,6}\s+\S+/.test(line))
      if (hasMarkdownHeading) return lines.join('\n')

      // 保真优先：仅当明显存在多个结构化标题时才转换，避免破坏原排版
      const headingCandidates = lines
        .map((line, index) => ({ index, heading: this.detectStructuredHeading(line) }))
        .filter((item) => item.heading)

      if (headingCandidates.length < 2) {
        return lines.join('\n')
      }

      const converted = []
      const headingIndexMap = new Map(headingCandidates.map((item) => [item.index, item.heading]))

      for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i]
        if (!line.trim()) {
          converted.push('')
          continue
        }

        const heading = headingIndexMap.get(i)
        if (heading) {
          converted.push(`${'#'.repeat(heading.level)} ${heading.text}`)
        } else {
          converted.push(line)
        }
      }

      return converted.join('\n')
    },
    extractMarkdownHeadings(markdown) {
      const source = String(markdown || '')
      if (!source) return []

      const seen = new Set()
      const headings = []

      try {
        const tokens = marked.lexer(source, { gfm: true })
        for (const token of tokens) {
          if (token?.type !== 'heading') continue
          const level = Number(token.depth) || 1
          if (level > 4) continue
          const text = String(token.text || '').replace(/<[^>]+>/g, '').trim()
          if (!text) continue
          headings.push({ id: this.makeSlug(text, seen), text, level })
        }
      } catch (error) {
        // fallback regex when lexer fails
      }

      if (headings.length > 0) return headings

      // HTML 标题兼容（例如 docx 转换后的内容）
      const htmlHeadingRegex = /<h([1-4])[^>]*>(.*?)<\/h\1>/gi
      let m = htmlHeadingRegex.exec(source)
      while (m) {
        const level = Number(m[1]) || 1
        const text = String(m[2] || '').replace(/<[^>]+>/g, '').trim()
        if (text) {
          headings.push({ id: this.makeSlug(text, seen), text, level })
        }
        m = htmlHeadingRegex.exec(source)
      }
      if (headings.length > 0) return headings

      for (const line of source.split('\n')) {
        const match = line.match(/^(#{1,4})\s+(.+)$/)
        if (!match) continue
        const level = match[1].length
        const text = match[2].trim()
        headings.push({ id: this.makeSlug(text, seen), text, level })
      }

      if (headings.length > 0) return headings

      // 最后兜底：不改正文，仅从结构化行中识别目录
      for (const line of source.split('\n')) {
        const item = this.detectStructuredHeading(line)
        if (!item) continue
        headings.push({ id: this.makeSlug(item.text, seen), text: item.text, level: item.level })
      }

      return headings
    },
    formatInline(text) {
      return escapeHtml(text)
        .replace(/!\[(.*?)\]\(((?:https?:\/\/|data:image\/)[^\s)]+)\)/g, '<img src="$2" alt="$1" loading="lazy" />')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
    },
    markdownToHtml(content) {
      const source = String(content || '')
      if (!source) return ''

      const headings = this.extractMarkdownHeadings(source)
      const seen = new Set()
      let headingIndex = 0

      try {
        marked.setOptions({
          gfm: true,
          breaks: true
        })

        const renderer = new marked.Renderer()
        renderer.heading = (args) => {
          const depth = Number(args.depth) || 1
          const text = String(args.text || '').trim()
          const fallback = text || `section-${headingIndex + 1}`
          const expected = headings[headingIndex]
          const id = expected?.id || this.makeSlug(fallback, seen)
          seen.add(id)
          headingIndex += 1
          return `<h${depth} id="${id}">${args.text}</h${depth}>`
        }

        return marked.parse(source, { renderer })
      } catch (error) {
        console.warn('Markdown 渲染失败，已回退简易渲染', error)
        const safe = escapeHtml(source).replace(/\n/g, '<br>')
        return `<p>${safe}</p>`
      }
    },
    normalizeArticles(list) {
      if (!Array.isArray(list)) return []
      const now = Date.now()
      const seen = new Set()
      return list
        .map((item) => {
          if (!item || typeof item !== 'object') return null
          const title = String(item.title || '').trim()
          if (!title) return null
          const id = String(item.id || `wiki_${now}_${Math.random().toString(16).slice(2, 6)}`)
          if (seen.has(id)) return null
          seen.add(id)
          const createdAt = Number(item.createdAt) || now
          const updatedAt = Number(item.updatedAt) || createdAt
          const normalizedItem = {
            id,
            title,
            summary: String(item.summary || ''),
            content: String(item.content || ''),
            category: String(item.category || '').trim(),
            tags: Array.isArray(item.tags) ? item.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 20) : [],
            views: Number(item.views) || 0,
            starred: Boolean(item.starred),
            createdAt,
            updatedAt,
            history: Array.isArray(item.history)
              ? item.history
                .map((ver) => ({
                  id: String(ver.id || `ver_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`),
                  title: String(ver.title || title),
                  summary: String(ver.summary || ''),
                  content: String(ver.content || ''),
                  category: String(ver.category || '').trim(),
                  tags: Array.isArray(ver.tags) ? ver.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 20) : [],
                  updatedAt: Number(ver.updatedAt) || updatedAt
                }))
                .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
              : [],
            comments: Array.isArray(item.comments)
              ? item.comments
                .map((comment) => ({
                  id: String(comment.id || `comment_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`),
                  author: String(comment.author || '访客').trim() || '访客',
                  text: String(comment.text || '').trim(),
                  createdAt: Number(comment.createdAt) || now
                }))
                .filter((comment) => comment.text)
                .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
              : []
          }
          normalizedItem.searchText = this.buildSearchText(normalizedItem)
          return normalizedItem
        })
        .filter(Boolean)
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    },
    seedArticles() {
      const now = Date.now()
      return [
        {
          id: 'wiki_vue3',
          title: 'Vue 3',
          summary: '渐进式 JavaScript 框架，支持组合式 API 与高性能渲染。',
          content: '# Vue 3\n\n## 核心能力\n- 组合式 API\n- 响应式系统\n- 单文件组件\n\n## 适用场景\n适合构建中大型 Web 应用。',
          category: '技术',
          tags: ['vue', 'frontend', 'javascript'],
          views: 12,
          starred: true,
          createdAt: now - 1000 * 60 * 60 * 24 * 4,
          updatedAt: now - 1000 * 60 * 60 * 5,
          history: [],
          comments: []
        },
        {
          id: 'wiki_http',
          title: 'HTTP 状态码',
          summary: '用于表达请求处理结果的标准响应码。',
          content: '# HTTP 状态码\n\n## 2xx\n- 200 OK\n- 201 Created\n\n## 4xx\n- 400 Bad Request\n- 404 Not Found\n\n## 5xx\n- 500 Internal Server Error',
          category: '网络',
          tags: ['http', 'backend'],
          views: 8,
          starred: false,
          createdAt: now - 1000 * 60 * 60 * 24 * 3,
          updatedAt: now - 1000 * 60 * 60 * 2,
          history: [],
          comments: []
        },
        {
          id: 'wiki_product_docs',
          title: '产品文档体系',
          summary: '定义愿景、需求、方案、验收的标准化文档结构。',
          content: '# 产品文档体系\n\n## 文档分层\n- PRD\n- 技术方案\n- 测试用例\n\n## 版本管理\n通过版本记录追溯每次修改原因。',
          category: '产品',
          tags: ['product', 'documentation'],
          views: 6,
          starred: false,
          createdAt: now - 1000 * 60 * 60 * 24 * 2,
          updatedAt: now - 1000 * 60 * 60,
          history: [],
          comments: []
        }
      ]
    },
    async persistArticles() {
      const normalized = this.normalizeArticles(this.articles)
      this.articles = normalized
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
      if (this.storageMode !== 'server') return
      try {
        const saved = await api.wiki.saveLibrary(normalized)
        const merged = this.normalizeArticles(saved?.items || normalized)
        this.articles = merged
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
      } catch (error) {
        this.storageMode = 'local'
        console.warn('保存维基库失败，已回退本地存储', error)
      }
    },
    persistState() {
      localStorage.setItem(STATE_KEY, JSON.stringify({ recentIds: this.recentIds }))
    },
    async load() {
      let localItems = []
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) {
          localItems = this.normalizeArticles(JSON.parse(raw))
          this.articles = localItems
        }
      } catch (error) {
        console.warn('加载本地 wiki 数据失败', error)
      }

      if (localItems.length === 0) {
        localItems = this.seedArticles()
        this.articles = localItems
        localStorage.setItem(STORAGE_KEY, JSON.stringify(localItems))
      }

      try {
        const remote = await api.wiki.getLibrary()
        const remoteItems = this.normalizeArticles(remote?.items || [])
        this.storageMode = 'server'

        if (remoteItems.length > 0) {
          this.articles = remoteItems
          localStorage.setItem(STORAGE_KEY, JSON.stringify(remoteItems))
        } else if (localItems.length > 0) {
          const saved = await api.wiki.saveLibrary(localItems)
          const merged = this.normalizeArticles(saved?.items || localItems)
          this.articles = merged
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
        }
      } catch (error) {
        this.storageMode = 'local'
        console.warn('连接 wiki 服务失败，使用本地模式', error)
      }

      try {
        const raw = localStorage.getItem(STATE_KEY)
        if (raw) {
          const parsed = JSON.parse(raw)
          this.recentIds = Array.isArray(parsed.recentIds) ? parsed.recentIds.map((id) => String(id)) : []
        }
      } catch (error) {
        console.warn('加载 wiki 状态失败', error)
      }

      this.activeArticleId = this.articles[0]?.id || null
      this.viewTab = 'read'
      this.$nextTick(() => this.measureArticleListViewport())
      this.restoreDraftCache()
    },
    openArticle(id) {
      const article = this.articles.find((item) => item.id === id)
      if (!article) return
      this.activeArticleId = id
      article.views += 1
      this.viewTab = 'read'
      this.commentText = ''
      this.compareVersionId = ''
      if (this.isMobile) {
        this.mobileReadMode = true
        this.$nextTick(() => this.focusContentPanel())
      }

      this.recentIds = [id, ...this.recentIds.filter((item) => item !== id)].slice(0, 20)
      this.persistState()
    },
    toggleStar(item) {
      item.starred = !item.starred
      item.updatedAt = Date.now()
      this.persistArticles()
    },
    createArticle() {
      this.activeArticleId = null
      this.viewTab = 'edit'
      this.draft = this.emptyDraft()
      this.draftImages = []
      this.compareVersionId = ''
      if (this.isMobile) {
        this.mobileReadMode = true
        this.$nextTick(() => this.focusContentPanel())
      }
    },
    startEdit() {
      if (!this.activeArticle) return
      this.viewTab = 'edit'
      this.compareVersionId = ''
      this.draftImages = []
      this.draft = {
        title: this.activeArticle.title,
        summary: this.activeArticle.summary,
        category: this.activeArticle.category,
        tagsText: this.activeArticle.tags.join(', '),
        content: this.activeArticle.content
      }
      if (this.isMobile) {
        this.mobileReadMode = true
        this.$nextTick(() => this.focusContentPanel())
      }
    },
    saveDraft() {
      if (!this.draft.title.trim()) {
        alert('请填写词条标题')
        return
      }

      const now = Date.now()
      const payload = {
        title: this.draft.title.trim(),
        summary: this.draft.summary.trim(),
        category: this.draft.category.trim(),
        tags: this.parseTags(this.draft.tagsText),
        content: this.draft.content,
        updatedAt: now
      }

      if (!this.activeArticleId) {
        const id = `wiki_${now}`
        this.articles.unshift({
          id,
          views: 0,
          starred: false,
          createdAt: now,
          history: [],
          comments: [],
          ...payload
        })
        this.activeArticleId = id
      } else {
        const idx = this.articles.findIndex((item) => item.id === this.activeArticleId)
        if (idx === -1) return
        const current = this.articles[idx]
        current.history.unshift({
          id: `ver_${now}`,
          title: current.title,
          summary: current.summary,
          category: current.category,
          tags: [...current.tags],
          content: current.content,
          updatedAt: current.updatedAt
        })
        this.articles[idx] = {
          ...current,
          ...payload
        }
      }

      this.persistArticles()
      this.viewTab = 'read'
      this.draft = this.emptyDraft()
      this.draftImages = []
      this.compareVersionId = ''
      this.clearDraftCache()
    },
    cancelEdit() {
      if (this.activeArticleId) {
        this.viewTab = 'read'
      } else {
        this.viewTab = 'read'
        this.activeArticleId = this.articles[0]?.id || null
      }
      this.draft = this.emptyDraft()
      this.draftImages = []
      this.clearDraftCache()
    },
    removeArticle(id) {
      const target = this.articles.find((item) => item.id === id)
      if (!target) return
      if (!confirm(`确定删除词条“${target.title}”吗？`)) return

      this.articles = this.articles.filter((item) => item.id !== id)
      this.recentIds = this.recentIds.filter((item) => item !== id)
      this.activeArticleId = this.articles[0]?.id || null
      this.viewTab = 'read'
      this.persistArticles()
      this.persistState()
    },
    rollbackVersion(versionId) {
      if (!this.activeArticle) return
      const version = this.activeArticle.history.find((item) => item.id === versionId)
      if (!version) return
      if (!confirm('确定回滚到该历史版本吗？')) return

      const now = Date.now()
      const currentSnapshot = {
        id: `ver_${now}`,
        title: this.activeArticle.title,
        summary: this.activeArticle.summary,
        category: this.activeArticle.category,
        tags: [...this.activeArticle.tags],
        content: this.activeArticle.content,
        updatedAt: this.activeArticle.updatedAt
      }

      this.activeArticle.history.unshift(currentSnapshot)
      this.activeArticle.title = version.title
      this.activeArticle.summary = version.summary
      this.activeArticle.category = version.category
      this.activeArticle.tags = [...version.tags]
      this.activeArticle.content = version.content
      this.activeArticle.updatedAt = now

      this.persistArticles()
      this.viewTab = 'read'
      this.compareVersionId = ''
    },
    previewVersionDiff(versionId) {
      this.compareVersionId = versionId
    },
    addComment() {
      if (!this.activeArticle || !this.commentText) return
      this.activeArticle.comments.unshift({
        id: `comment_${Date.now()}`,
        author: this.commentAuthor || '当前用户',
        text: this.commentText,
        createdAt: Date.now()
      })
      this.commentText = ''
      this.persistArticles()
    },
    removeComment(commentId) {
      if (!this.activeArticle) return
      this.activeArticle.comments = this.activeArticle.comments.filter((item) => item.id !== commentId)
      this.persistArticles()
    },
    openRandomArticle() {
      if (this.articles.length === 0) return
      const pool = this.articles.filter((item) => item.id !== this.activeArticleId)
      const target = (pool.length ? pool : this.articles)[Math.floor(Math.random() * (pool.length || this.articles.length))]
      this.openArticle(target.id)
    },
    createArticleFromImport({ title, summary, content, sourceExt, sourceName }) {
      const now = Date.now()
      const cleanTitle = String(title || '').trim() || `导入词条_${now}`
      const cleanSummary = String(summary || '').trim()
      const cleanContent = String(content || '').trim()
      if (!cleanContent) {
        throw new Error('导入正文为空，无法创建词条')
      }

      const tags = ['导入文档']
      if (sourceExt) tags.push(String(sourceExt).replace(/^\./, '').toLowerCase())
      if (sourceName && sourceName.includes('.')) {
        const ext = sourceName.split('.').pop()
        if (ext) tags.push(String(ext).toLowerCase())
      }

      const id = `wiki_${now}_${Math.random().toString(16).slice(2, 6)}`
      const item = {
        id,
        title: cleanTitle,
        summary: cleanSummary,
        content: cleanContent,
        category: '导入文档',
        tags: Array.from(new Set(tags)).slice(0, 20),
        views: 0,
        starred: false,
        createdAt: now,
        updatedAt: now,
        history: [],
        comments: []
      }

      this.articles.unshift(item)
      this.activeArticleId = id
      this.viewTab = 'read'
      this.searchQuery = ''
      this.categoryFilter = 'all'
      this.onlyStarred = false
      this.sortBy = 'recent'
      this.mobileReadMode = true
      this.persistArticles()
      this.resetArticleListScroll()
      return item
    },
    jumpToHeading(id) {
      if (this.viewTab !== 'read') {
        this.viewTab = 'read'
        this.$nextTick(() => this.jumpToHeading(id))
        return
      }
      if (this.isMobile) this.showMobileToc = false
      const el = document.getElementById(id)
      if (!el) return
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    },
    formatDate(ts) {
      if (!ts) return '-'
      return new Date(ts).toLocaleString('zh-CN', { hour12: false })
    },
    escapeCsvCell(value) {
      const text = String(value ?? '')
      if (/[",\n]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`
      }
      return text
    },
    parseCsvLine(line) {
      const cells = []
      let cur = ''
      let inQuote = false
      for (let i = 0; i < line.length; i += 1) {
        const ch = line[i]
        if (inQuote) {
          if (ch === '"') {
            if (line[i + 1] === '"') {
              cur += '"'
              i += 1
            } else {
              inQuote = false
            }
          } else {
            cur += ch
          }
        } else if (ch === '"') {
          inQuote = true
        } else if (ch === ',') {
          cells.push(cur)
          cur = ''
        } else {
          cur += ch
        }
      }
      cells.push(cur)
      return cells
    },
    parseCsvText(text) {
      const lines = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
      if (lines.length === 0) return []
      const header = this.parseCsvLine(lines[0]).map((h) => h.trim())
      const rows = []
      for (let i = 1; i < lines.length; i += 1) {
        if (!lines[i].trim()) continue
        const cells = this.parseCsvLine(lines[i])
        const row = {}
        header.forEach((key, idx) => {
          row[key] = cells[idx] ?? ''
        })
        rows.push(row)
      }
      return rows
    },
    sanitizeFileName(name) {
      const base = String(name || '').replace(/\.[^.]+$/, '').trim()
      return base || `file_${Date.now()}`
    },
    fileToDataUrl(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result || ''))
        reader.onerror = () => reject(new Error('读取文件失败'))
        reader.readAsDataURL(file)
      })
    },
    exportJson() {
      const payload = {
        exportedAt: new Date().toISOString(),
        items: this.articles
      }
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `wiki-export-${Date.now()}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    },
    exportCsv() {
      const header = ['id', 'title', 'summary', 'category', 'tags', 'content', 'starred', 'views', 'createdAt', 'updatedAt']
      const lines = [header.join(',')]
      for (const item of this.articles) {
        const row = [
          item.id,
          item.title,
          item.summary || '',
          item.category || '',
          (item.tags || []).join('|'),
          item.content || '',
          item.starred ? '1' : '0',
          String(item.views || 0),
          String(item.createdAt || ''),
          String(item.updatedAt || '')
        ]
        lines.push(row.map((cell) => this.escapeCsvCell(cell)).join(','))
      }
      const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `wiki-export-${Date.now()}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    },
    triggerDocImport() {
      this.$refs.docImportRef?.click()
    },
    pushImportLog(level, message) {
      this.importLogs.unshift({
        id: `import_log_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
        time: Date.now(),
        level: String(level || 'info'),
        message: String(message || '')
      })
      if (this.importLogs.length > 120) {
        this.importLogs.splice(120)
      }
    },
    clearImportLogs() {
      this.importLogs = []
    },
    async importDocumentToDraft(event) {
      const input = event?.target
      const file = input?.files?.[0]
      if (!file) return

      const ext = `.${String(file.name || '').split('.').pop()?.toLowerCase() || ''}`
      const supported = ['.md', '.markdown', '.txt', '.doc', '.docx', '.pdf']
      if (!supported.includes(ext)) {
        alert('仅支持 md/txt/doc/docx/pdf')
        this.pushImportLog('warn', `不支持的文件格式：${file.name}`)
        if (input) input.value = ''
        return
      }

      this.importingDoc = true
      this.pushImportLog('info', `开始导入：${file.name}（${Math.round(file.size / 1024)} KB）`)
      let controller = null
      let timeoutId = null
      try {
        let nextTitle = this.sanitizeFileName(file.name)
        let nextSummary = ''
        let nextContent = ''

        if (ext === '.md' || ext === '.markdown' || ext === '.txt') {
          this.pushImportLog('info', '文本文件读取中...')
          const content = await file.text()
          nextContent = String(content || '').replace(/\r\n/g, '\n').trim()
          const lines = nextContent.split('\n').filter(Boolean)
          nextSummary = lines.slice(0, 2).join(' ').slice(0, 180)
          this.pushImportLog('success', `读取完成，提取 ${nextContent.length} 字符`)
        } else {
          this.pushImportLog('info', '正在上传文件到后端解析...')
          const dataUrl = await this.fileToDataUrl(file)
          const base64 = String(dataUrl || '').split(',').pop() || ''
          this.pushImportLog('info', `上传体积：${Math.round(file.size / 1024)} KB`)
          controller = new AbortController()
          timeoutId = setTimeout(() => controller.abort(), 120000)
          const result = await api.wiki.importDocument({
            fileName: file.name,
            dataBase64: base64
          }, { signal: controller.signal })
          nextTitle = result?.title || nextTitle
          nextSummary = result?.summary || ''
          nextContent = String(result?.content || '').trim()
          this.pushImportLog('success', `后端解析完成，提取 ${nextContent.length} 字符`)
        }

        if (!nextContent) {
          throw new Error('未从文档中提取到可用正文')
        }

        const created = this.createArticleFromImport({
          title: nextTitle,
          summary: nextSummary,
          content: nextContent,
          sourceExt: ext,
          sourceName: file.name
        })
        this.pushImportLog('success', `导入完成并创建词条：${created.title}`)
      } catch (error) {
        const msg = String(error?.message || '')
        this.pushImportLog('error', `导入失败：${msg || '未知错误'}`)
        if (msg.includes('Failed to fetch')) {
          alert('导入文档失败：后端不可用。请先启动/重启后端服务（npm run server:test 或 npm run dev）。')
        } else if (error?.name === 'AbortError') {
          alert('导入文档失败：请求超时（120秒）或被中断。')
        } else if (msg.includes('API 端点不存在') || msg.includes('404')) {
          alert('导入文档失败：后端未加载新接口。请重启后端服务后再试。')
        } else if (msg.includes('文档解析后为空')) {
          alert('导入文档失败：文件解析为空。请先确认文档有可复制文本（扫描版 PDF 可能无文本层）。')
        } else if (msg.includes('未从文档中提取到可用正文')) {
          alert('导入文档失败：文件未提取到正文内容（常见于扫描版 PDF）。')
        } else if (msg.includes('413') || msg.includes('payload')) {
          alert('导入文档失败：文件过大。请先拆分/压缩文档后再导入。')
        } else {
          alert(`导入文档失败：${msg || '请检查文件格式'}`)
        }
      } finally {
        if (timeoutId) clearTimeout(timeoutId)
        controller = null
        timeoutId = null
        this.importingDoc = false
        if (input) input.value = ''
      }
    },
    async handleImageUpload(event) {
      const input = event?.target
      const files = Array.from(input?.files || [])
      if (files.length === 0) return
      for (const file of files) {
        if (!String(file.type || '').startsWith('image/')) continue
        try {
          const url = await this.fileToDataUrl(file)
          this.draftImages.unshift({
            id: `img_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
            name: this.sanitizeFileName(file.name),
            url
          })
        } catch (error) {
          console.warn('图片读取失败', error)
        }
      }
      if (input) input.value = ''
    },
    insertImageToDraft(image) {
      const name = image?.name || 'image'
      const url = image?.url || ''
      if (!url) return
      const line = `![${name}](${url})`
      this.draft.content = this.draft.content
        ? `${this.draft.content}\n\n${line}`
        : line
    },
    removeDraftImage(id) {
      this.draftImages = this.draftImages.filter((item) => item.id !== id)
    },
    async copyColor(color) {
      const text = String(color || '').trim()
      if (!text) return
      try {
        await navigator.clipboard.writeText(text)
        alert(`已复制色值：${text}`)
      } catch (error) {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.focus()
        textarea.select()
        const ok = document.execCommand('copy')
        document.body.removeChild(textarea)
        alert(ok ? `已复制色值：${text}` : `复制失败：${text}`)
      }
    },
    triggerImportJson() {
      this.$refs.importRefJson?.click()
    },
    triggerImportCsv() {
      this.$refs.importRefCsv?.click()
    },
    async importJson(event) {
      const input = event?.target
      const file = input?.files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const parsed = JSON.parse(text)
        const items = Array.isArray(parsed) ? parsed : parsed.items
        const normalized = this.normalizeArticles(items)
        if (normalized.length === 0) {
          alert('导入失败：未发现有效词条')
        } else {
          this.articles = normalized
          this.activeArticleId = normalized[0].id
          this.viewTab = 'read'
          this.resetArticleListScroll()
          this.persistArticles()
          alert(`导入成功：${normalized.length} 条词条`)
        }
      } catch (error) {
        alert(`导入失败：${error.message || '文件格式错误'}`)
      } finally {
        if (input) input.value = ''
      }
    },
    async importCsv(event) {
      const input = event?.target
      const file = input?.files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const rows = this.parseCsvText(text)
        const items = rows.map((row, idx) => ({
          id: String(row.id || `wiki_${Date.now()}_${idx}`),
          title: String(row.title || '').trim(),
          summary: String(row.summary || ''),
          category: String(row.category || '').trim(),
          tags: String(row.tags || '').split('|').map((t) => t.trim()).filter(Boolean),
          content: String(row.content || ''),
          starred: String(row.starred || '').trim() === '1' || String(row.starred || '').toLowerCase() === 'true',
          views: Number(row.views) || 0,
          createdAt: Number(row.createdAt) || Date.now(),
          updatedAt: Number(row.updatedAt) || Date.now(),
          history: [],
          comments: []
        }))
        const normalized = this.normalizeArticles(items)
        if (normalized.length === 0) {
          alert('导入失败：CSV 中未发现有效词条')
        } else {
          this.articles = normalized
          this.activeArticleId = normalized[0].id
          this.viewTab = 'read'
          this.resetArticleListScroll()
          this.persistArticles()
          alert(`导入成功：${normalized.length} 条词条`)
        }
      } catch (error) {
        alert(`导入 CSV 失败：${error.message || '文件格式错误'}`)
      } finally {
        if (input) input.value = ''
      }
    },
    focusContentPanel() {
      const panel = this.$refs.contentPanelRef
      if (!panel || typeof panel.scrollIntoView !== 'function') return
      panel.scrollIntoView({ behavior: 'smooth', block: 'start' })
    },
    backToList() {
      this.mobileReadMode = false
      this.$nextTick(() => {
        const list = document.querySelector('.list-panel')
        if (list && typeof list.scrollIntoView === 'function') {
          list.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      })
    },
    handleResize() {
      this.viewportWidth = window.innerWidth
      this.$nextTick(() => this.measureArticleListViewport())
      if (!this.isMobile) {
        this.mobileReadMode = false
        this.showMobileToc = false
      }
    },
    toggleMobileToc() {
      this.showMobileToc = !this.showMobileToc
    },
    adjustReaderFont(delta) {
      const next = this.readerFontSize + Number(delta || 0)
      this.readerFontSize = Math.max(13, Math.min(22, next))
    },
    adjustReaderLineHeight(delta) {
      const next = Math.round((this.readerLineHeight + Number(delta || 0)) * 100) / 100
      this.readerLineHeight = Math.max(1.45, Math.min(2.2, next))
    }
  },
  watch: {
    searchQuery() {
      this.resetArticleListScroll()
    },
    categoryFilter() {
      this.resetArticleListScroll()
    },
    sortBy() {
      this.resetArticleListScroll()
    },
    onlyStarred() {
      this.resetArticleListScroll()
    },
    draft: {
      deep: true,
      handler() {
        this.saveDraftCache()
      }
    },
    viewTab() {
      if (this.viewTab !== 'edit') return
      this.saveDraftCache()
    },
    activeArticleId() {
      this.showMobileToc = false
    }
  },
  mounted() {
    this.load()
    this.$nextTick(() => this.measureArticleListViewport())
    window.addEventListener('resize', this.handleResize)
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.handleResize)
  }
}
</script>

<style scoped>
.wiki-page { color: var(--app-text); }
.panel {
  background: var(--app-card);
  border: 1px solid var(--app-border);
  border-radius: 14px;
  box-shadow: 0 8px 20px var(--app-shadow-light);
}

.wiki-hero {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 12px;
  margin-bottom: 12px;
  padding: 16px;
  background-image:
    radial-gradient(circle at right top, color-mix(in srgb, var(--app-primary) 22%, transparent) 0%, transparent 58%),
    linear-gradient(135deg, color-mix(in srgb, var(--app-card) 84%, white), var(--app-card));
}

.wiki-hero h2 {
  margin: 0;
  font-family: "Palatino", "Palatino Linotype", "Songti SC", serif;
  letter-spacing: 0.02em;
}

.wiki-hero p { margin: 6px 0 0; color: var(--app-text-muted); }
.hero-stats { display: flex; gap: 8px; flex-wrap: wrap; }
.stat { padding: 6px 10px; border-radius: 999px; border: 1px solid var(--app-border); background: var(--app-card-elevated); font-size: 0.82em; }

.wiki-toolbar {
  margin-bottom: 12px;
  padding: 10px;
  display: grid;
  grid-template-columns: minmax(220px, 1fr) 140px 130px repeat(8, auto);
  gap: 8px;
  align-items: center;
}
.import-log-wrap {
  grid-column: 1 / -1;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: var(--app-card-elevated);
  padding: 8px;
}
.import-log-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.import-log-panel {
  max-height: 180px;
  overflow: auto;
  border: 1px dashed var(--app-border);
  border-radius: 8px;
  padding: 6px;
  font-size: 0.78em;
  background: var(--app-card);
}
.import-log-line {
  display: grid;
  grid-template-columns: 150px 1fr;
  gap: 8px;
  padding: 3px 2px;
}
.import-log-line .time { color: var(--app-text-muted); }
.import-log-line.lv-error .msg { color: #b91c1c; }
.import-log-line.lv-warn .msg { color: #b45309; }
.import-log-line.lv-success .msg { color: #166534; }
.import-log-empty {
  color: var(--app-text-muted);
  font-size: 0.9em;
  padding: 6px 4px;
}

.wiki-layout {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr) 280px;
  gap: 12px;
}

.palette-panel { margin-bottom: 12px; padding: 12px; }
.palette-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 8px; }
.palette-head h3 { margin: 0; font-size: 0.96em; }
.palette-groups { display: grid; gap: 10px; }
.palette-group h4 { margin: 0 0 6px; font-size: 0.84em; color: var(--app-text-secondary); }
.swatches { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px; }
.swatch {
  border: 1px solid var(--app-border);
  border-radius: 10px;
  min-height: 46px;
  padding: 6px;
  text-align: left;
  cursor: pointer;
  transition: transform 0.12s ease;
}
.swatch:hover { transform: translateY(-1px); }
.swatch-code {
  font-size: 0.74em;
  font-weight: 700;
  color: #ffffff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.45);
}

.list-panel,
.content-panel,
.side-panel { padding: 12px; min-height: 640px; }
.list-panel h3,
.side-panel h3 { margin: 0 0 10px; font-size: 1em; }

.article-list { display: grid; gap: 8px; max-height: 760px; overflow: auto; }
.article-item {
  border: 1px solid var(--app-border);
  border-radius: 10px;
  padding: 10px;
  background: var(--app-card-elevated);
  cursor: pointer;
  content-visibility: auto;
  contain-intrinsic-size: 180px;
}
.list-load-more { display: flex; justify-content: center; padding: 6px 0 2px; }
.article-item.active {
  border-color: var(--app-primary);
  box-shadow: 0 0 0 2px var(--app-shadow-light);
}
.item-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.item-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.item-head h4 { margin: 0; font-size: 0.98em; }
.star-btn {
  border: none;
  background: transparent;
  color: #f59e0b;
  font-size: 1.1em;
  cursor: pointer;
}
.btn-danger-inline {
  min-width: 24px;
  padding: 2px 6px;
  border-radius: 8px;
  border-color: #fecaca;
  color: #b91c1c;
}
.summary { margin: 6px 0 0; font-size: 0.86em; color: var(--app-text-secondary); }

.content-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 12px;
}
.content-head h3 {
  margin: 0;
  font-family: "Palatino", "Palatino Linotype", "Songti SC", serif;
}

.head-actions,
.actions,
.tags { display: flex; gap: 6px; flex-wrap: wrap; }

.read-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 240px;
  gap: 12px;
}
.read-main { min-width: 0; }
.inline-toc {
  position: sticky;
  top: 10px;
  align-self: start;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: var(--app-card-elevated);
  padding: 10px;
  max-height: 72dvh;
  overflow: auto;
}
.inline-toc h4 {
  margin: 0 0 8px;
  font-size: 0.9em;
  color: var(--app-text-secondary);
}
.mobile-read-tools {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 10px;
  padding: 8px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: var(--app-card-elevated);
}
.tool-stat {
  font-size: 0.8em;
  color: var(--app-text-muted);
}

.markdown {
  line-height: 1.8;
  font-family: "Georgia", "Times New Roman", "Songti SC", serif;
  font-size: 15px;
}
.markdown :deep(h1),
.markdown :deep(h2),
.markdown :deep(h3) {
  margin-top: 22px;
  margin-bottom: 8px;
  font-family: "Palatino", "Palatino Linotype", "Songti SC", serif;
}
.markdown :deep(h1) {
  font-size: 1.52em;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--app-border);
}
.markdown :deep(h2) {
  font-size: 1.24em;
  padding-left: 8px;
  border-left: 3px solid color-mix(in srgb, var(--app-primary) 55%, transparent);
}
.markdown :deep(h3) {
  font-size: 1.08em;
}
.markdown :deep(p) { margin: 10px 0; }
.markdown :deep(code) {
  background: color-mix(in srgb, var(--app-primary) 14%, transparent);
  padding: 2px 6px;
  border-radius: 6px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
.markdown :deep(pre) {
  margin: 10px 0;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid var(--app-border);
  background: var(--app-card-elevated);
  overflow: auto;
}
.markdown :deep(pre code) {
  background: transparent;
  padding: 0;
  border-radius: 0;
}
.markdown :deep(ul),
.markdown :deep(ol) { padding-left: 24px; margin: 10px 0; }
.markdown :deep(li) { margin: 4px 0; }
.markdown :deep(blockquote) {
  margin: 10px 0;
  padding: 8px 12px;
  border-left: 4px solid color-mix(in srgb, var(--app-primary) 45%, transparent);
  background: color-mix(in srgb, var(--app-primary) 8%, transparent);
  color: var(--app-text-secondary);
}
.markdown :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 12px 0;
  font-size: 0.95em;
}
.markdown :deep(th),
.markdown :deep(td) {
  border: 1px solid var(--app-border);
  padding: 6px 8px;
  text-align: left;
}
.markdown :deep(th) {
  background: var(--app-card-elevated);
}
.markdown :deep(a) { color: var(--app-primary); }
.markdown :deep(img) {
  max-width: 100%;
  border-radius: 10px;
  border: 1px solid var(--app-border);
  margin: 10px 0;
  display: block;
}

.lead {
  margin: 0 0 12px;
  padding: 10px;
  border-left: 4px solid var(--app-primary);
  background: color-mix(in srgb, var(--app-primary) 8%, transparent);
  color: var(--app-text-secondary);
}

.form-group { margin-bottom: 10px; }
.form-group label { display: block; margin-bottom: 5px; color: var(--app-text-secondary); font-size: 0.86em; font-weight: 700; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.input {
  width: 100%;
  border: 1px solid var(--app-border);
  background: var(--app-card-elevated);
  color: var(--app-text);
  border-radius: 9px;
  padding: 8px 10px;
  font: inherit;
}
.input:focus { outline: none; border-color: var(--app-primary); }
.content-input { min-height: 280px; }

.meta {
  color: var(--app-text-muted);
  font-size: 0.8em;
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
}
.tag {
  font-size: 0.74em;
  padding: 2px 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--app-primary) 14%, transparent);
  color: var(--app-primary);
}

.widget { margin-bottom: 14px; }
.toc-list,
.related-list,
.recent-list,
.history-list,
.comment-list { display: grid; gap: 8px; }
.toc-item,
.related-item {
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-card-elevated);
  color: var(--app-text-secondary);
  text-align: left;
  padding: 7px 8px;
  cursor: pointer;
  text-decoration: none;
  white-space: normal;
  line-height: 1.4;
}
.related-item:hover,
.toc-item:hover { border-color: var(--app-primary); color: var(--app-primary); }

.history-item,
.comment-item {
  border: 1px solid var(--app-border);
  border-radius: 10px;
  padding: 10px;
  background: var(--app-card-elevated);
}
.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}
.history-actions { display: flex; gap: 6px; flex-wrap: wrap; }
.diff-panel {
  margin-top: 10px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  padding: 10px;
  background: var(--app-card-elevated);
}
.diff-panel h4 { margin: 0 0 8px; font-size: 0.92em; }
.diff-pre {
  margin: 0;
  max-height: 220px;
  overflow: auto;
  white-space: pre-wrap;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.78em;
  line-height: 1.5;
}
.draft-tip { margin: -2px 0 8px; font-size: 0.8em; color: var(--app-text-muted); }
.image-preview-list {
  margin-bottom: 10px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 8px;
}
.image-preview-card {
  border: 1px solid var(--app-border);
  border-radius: 10px;
  padding: 8px;
  background: var(--app-card-elevated);
}
.image-preview {
  width: 100%;
  height: 120px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid var(--app-border);
}
.image-preview-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 8px;
}
.comment-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.comment-item p { margin: 6px 0 0; white-space: pre-wrap; }
.timeline-list { display: grid; gap: 10px; }
.timeline-item {
  display: grid;
  grid-template-columns: 16px 1fr;
  gap: 8px;
  padding: 10px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: var(--app-card-elevated);
}
.timeline-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #22c55e;
  margin-top: 6px;
  box-shadow: 0 0 0 3px color-mix(in srgb, #22c55e 22%, transparent);
}
.timeline-dot.update {
  background: #3b82f6;
  box-shadow: 0 0 0 3px color-mix(in srgb, #3b82f6 22%, transparent);
}
.timeline-link {
  margin-top: 3px;
  border: none;
  padding: 0;
  background: transparent;
  color: var(--app-primary);
  text-align: left;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.btn {
  border: 1px solid var(--app-border);
  background: var(--app-card-elevated);
  color: var(--app-text-secondary);
  border-radius: 8px;
  padding: 7px 10px;
  cursor: pointer;
}
.btn-primary { background: var(--app-primary); color: var(--app-on-primary); border-color: transparent; box-shadow: 0 8px 18px var(--app-shadow); }
.btn-danger { background: #ef4444; color: #fff; border-color: #ef4444; }
.btn-sm { padding: 5px 8px; font-size: 0.8em; }

.empty {
  text-align: center;
  border: 1px dashed var(--app-border);
  color: var(--app-text-muted);
  border-radius: 10px;
  padding: 28px 10px;
}
.empty.mini { padding: 14px 8px; font-size: 0.82em; }

.check { font-size: 0.84em; color: var(--app-text-secondary); display: inline-flex; align-items: center; gap: 6px; }
.hidden-input { display: none; }
.mobile-toc-mask {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.35);
  z-index: 49;
}
.mobile-toc-drawer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  max-height: 72dvh;
  overflow: auto;
  z-index: 50;
  border-radius: 16px 16px 0 0;
  transform: translateY(105%);
  transition: transform 0.22s ease;
}
.mobile-toc-drawer.open {
  transform: translateY(0);
}
.mobile-toc-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.mobile-toc-head h3 {
  margin: 0;
  font-size: 0.95em;
}

@media (max-width: 1080px) {
  .wiki-layout { grid-template-columns: 280px minmax(0, 1fr); }
  .side-panel { grid-column: 1 / -1; min-height: auto; }
  .read-layout { grid-template-columns: 1fr; }
  .inline-toc { display: none; }
}

@media (max-width: 880px) {
  .wiki-toolbar {
    grid-template-columns: 1fr;
  }
  .import-log-line {
    grid-template-columns: 1fr;
    gap: 2px;
  }
  .swatches { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .wiki-layout { grid-template-columns: 1fr; }
  .list-panel,
  .content-panel,
  .side-panel { min-height: auto; }
  .content-head { flex-direction: column; }
  .form-row { grid-template-columns: 1fr; }
  .mobile-read-tools .btn {
    padding: 6px 8px;
    font-size: 0.78em;
  }
}
</style>
