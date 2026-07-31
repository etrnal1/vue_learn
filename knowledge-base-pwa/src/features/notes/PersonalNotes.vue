<template>
  <div class="notes-page">
    <!-- 顶部 Hero -->
    <section class="hero">
      <div>
        <p class="eyebrow">Personal Notes</p>
        <h1>个人笔记</h1>
        <p class="hero-text">轻量级笔记管理，支持分类、标签、搜索和统计可视化。离线可用。</p>
      </div>
      <div class="hero-actions">
        <button type="button" class="btn btn-primary" @click="openEditor()">新建笔记</button>
        <button type="button" class="btn" @click="showStatsPanel = !showStatsPanel">
          {{ showStatsPanel ? '关闭统计' : '数据统计' }}
        </button>
        <button type="button" class="btn" @click="showExportMenu = !showExportMenu">导出</button>
      </div>
    </section>

    <!-- 导出菜单 -->
    <section v-if="showExportMenu" class="panel export-menu">
      <strong>导出格式</strong>
      <div class="export-actions">
        <button type="button" class="mini-btn" @click="doExport('json')">JSON</button>
        <button type="button" class="mini-btn" @click="doExport('csv')">CSV</button>
        <button type="button" class="mini-btn" @click="doExport('markdown')">Markdown</button>
      </div>
    </section>

    <!-- 工具栏 -->
    <section class="toolbar panel">
      <div class="toolbar-group">
        <input v-model.trim="searchKeyword" class="input" placeholder="搜索笔记：标题 / 内容 / 标签" @input="debouncedSearch" />
      </div>
      <div class="toolbar-group">
        <select v-model="filterCategory" class="input select">
          <option value="">全部分类</option>
          <option v-for="cat in categories" :key="cat.name" :value="cat.name">{{ cat.name }}</option>
        </select>
        <select v-model="sortBy" class="input select">
          <option value="newest">最新创建</option>
          <option value="updated">最近更新</option>
          <option value="title">按标题</option>
          <option value="length">按字数</option>
          <option value="oldest">最早创建</option>
        </select>
        <button type="button" class="btn" :class="{ 'btn-active': filterStarred }" @click="filterStarred = !filterStarred">
          {{ filterStarred ? '★ 星标' : '☆ 星标' }}
        </button>
        <button type="button" class="btn" @click="viewMode = viewMode === 'card' ? 'list' : 'card'">
          {{ viewMode === 'card' ? '列表' : '卡片' }}
        </button>
      </div>
    </section>

    <!-- 统计卡片 -->
    <section class="stats">
      <article class="stat panel">
        <span>笔记总数</span>
        <strong>{{ stats.totalNotes }}</strong>
      </article>
      <article class="stat panel">
        <span>总字数</span>
        <strong>{{ formatNumber(stats.totalWords) }}</strong>
      </article>
      <article class="stat panel">
        <span>星标笔记</span>
        <strong>{{ stats.starredCount }}</strong>
      </article>
      <article class="stat panel">
        <span>平均字数</span>
        <strong>{{ stats.avgWordCount }}</strong>
      </article>
    </section>

    <!-- 统计面板 -->
    <section v-if="showStatsPanel" class="panel stats-detail">
      <div class="section-head">
        <div>
          <p class="eyebrow">Analytics</p>
          <h2>数据统计</h2>
        </div>
        <button type="button" class="mini-btn" @click="showStatsPanel = false">关闭</button>
      </div>

      <div class="stats-grid">
        <!-- 分类分布 -->
        <div class="stats-card">
          <h3>分类分布</h3>
          <div v-if="stats.categories.length === 0" class="empty compact">
            <p>暂无分类数据</p>
          </div>
          <div v-else class="cat-bars">
            <div v-for="cat in stats.categories" :key="cat.name" class="cat-bar-row">
              <span class="cat-bar-label">{{ cat.name }}</span>
              <div class="cat-bar-track">
                <div class="cat-bar-fill" :style="{ width: cat.percentage + '%' }"></div>
              </div>
              <span class="cat-bar-count">{{ cat.count }} ({{ cat.percentage }}%)</span>
            </div>
          </div>
        </div>

        <!-- 标签云 -->
        <div class="stats-card">
          <h3>标签云</h3>
          <div v-if="stats.tags.length === 0" class="empty compact">
            <p>暂无标签数据</p>
          </div>
          <div v-else class="tag-cloud">
            <span
              v-for="t in stats.tags"
              :key="t.tag"
              class="tag-cloud-item"
              :style="{ fontSize: getTagFontSize(t.count) + 'px', opacity: getTagOpacity(t.count) }"
              @click="filterByTag(t.tag)"
            >
              {{ t.tag }} <sup>{{ t.count }}</sup>
            </span>
          </div>
        </div>

        <!-- 创建趋势 -->
        <div class="stats-card wide">
          <h3>近30天趋势</h3>
          <div v-if="stats.trendData.length === 0" class="empty compact">
            <p>暂无趋势数据</p>
          </div>
          <div v-else class="trend-chart">
            <div class="trend-bars">
              <div
                v-for="d in stats.trendData"
                :key="d.date"
                class="trend-bar-col"
                :title="`${d.date}: ${d.count} 条`"
              >
                <div class="trend-bar" :style="{ height: getTrendBarHeight(d.count) + '%' }"></div>
                <span class="trend-date">{{ d.date.slice(5) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 主布局 -->
    <section class="layout">
      <!-- 侧栏：分类 -->
      <aside class="panel sidebar">
        <div class="section-head">
          <div>
            <p class="eyebrow">Categories</p>
            <h2>分类</h2>
          </div>
          <span class="pill">{{ categories.length }}</span>
        </div>

        <div class="cat-list">
          <button
            type="button"
            class="cat-item"
            :class="{ active: !filterCategory }"
            @click="filterCategory = ''"
          >
            <span>全部</span>
            <span class="cat-count">{{ stats.totalNotes }}</span>
          </button>
          <button
            v-for="cat in categoriesWithCount"
            :key="cat.name"
            type="button"
            class="cat-item"
            :class="{ active: filterCategory === cat.name }"
            @click="filterCategory = cat.name"
          >
            <span>
              <span class="cat-dot" :style="{ background: cat.color }"></span>
              {{ cat.name }}
            </span>
            <span class="cat-count">{{ cat.count }}</span>
          </button>
        </div>

        <!-- 标签快速过滤 -->
        <div class="section-head" style="margin-top: 16px">
          <div>
            <p class="eyebrow">Tags</p>
            <h2>标签</h2>
          </div>
        </div>
        <div class="tag-list">
          <button
            v-for="tag in allTags"
            :key="tag"
            type="button"
            class="tag-btn"
            :class="{ active: filterTag === tag }"
            @click="filterTag = filterTag === tag ? '' : tag"
          >
            {{ tag }}
          </button>
          <span v-if="allTags.length === 0" class="muted-text">暂无标签</span>
        </div>
      </aside>

      <!-- 主内容 -->
      <main class="content-stack">
        <!-- 编辑器 -->
        <section v-if="currentView === 'edit'" ref="editorSection" class="panel editor-panel">
          <div class="section-head">
            <div>
              <p class="eyebrow">Editor</p>
              <h2>{{ editingNote ? '编辑笔记' : '新建笔记' }}</h2>
            </div>
            <div class="editor-head-actions">
              <button v-if="editingNote" type="button" class="mini-btn" @click="openNoteVersionPanel(editingNote)">⏱ 版本历史</button>
              <button type="button" class="mini-btn" :class="{ active: previewMode }" @click="togglePreview">{{ previewMode ? '✏️ 编辑' : '👁 预览' }}</button>
              <button type="button" class="mini-btn" @click="cancelEdit">取消</button>
              <button type="button" class="mini-btn primary" @click="saveNote">保存</button>
            </div>
          </div>

          <div class="editor-form">
            <input
              ref="titleInput"
              v-model="form.title"
              type="text"
              class="input editor-title"
              placeholder="笔记标题..."
            />

            <div v-if="!previewMode" class="editor-media-toolbar">
              <button type="button" class="mini-btn" @click="insertHeading(1)" title="一级标题">H1</button>
              <button type="button" class="mini-btn" @click="insertHeading(2)" title="二级标题">H2</button>
              <button type="button" class="mini-btn" @click="insertHeading(3)" title="三级标题">H3</button>
              <span class="toolbar-sep"></span>
              <button type="button" class="mini-btn" @click="$refs.imageFileInput?.click()">🖼 插入图片</button>
              <button type="button" class="mini-btn" @click="openDoodle">✍️ 手绘</button>
              <button type="button" class="mini-btn" @click="$refs.attachmentFileInput?.click()">📎 添加附件</button>
              <input ref="imageFileInput" type="file" accept="image/*" class="hidden-input" @change="onImageFileChange" />
              <input ref="attachmentFileInput" type="file" class="hidden-input" @change="onAttachmentFileChange" />
            </div>

            <textarea
              v-if="!previewMode"
              ref="contentTextarea"
              v-model="form.content"
              class="input editor-content"
              placeholder="输入笔记内容...（支持 Markdown 语法，点击「预览」查看渲染效果；也可以直接粘贴图片）"
              @paste="onContentPaste"
            ></textarea>
            <div v-else class="editor-content docx-content markdown-preview" v-html="formPreviewHtml" @click="onContentClick"></div>

            <div class="editor-meta">
              <div class="form-group">
                <label>分类</label>
                <input v-model="form.category" type="text" class="input" placeholder="输入分类名称" list="cat-datalist" />
                <datalist id="cat-datalist">
                  <option v-for="cat in categories" :key="cat.name" :value="cat.name" />
                </datalist>
              </div>

              <div class="form-group">
                <label>标签</label>
                <div class="tag-input-wrap">
                  <span v-for="(tag, idx) in form.tags" :key="idx" class="tag-chip">
                    {{ tag }}
                    <button type="button" @click="removeFormTag(idx)">&times;</button>
                  </span>
                  <input
                    v-model="newTagInput"
                    type="text"
                    class="tag-inline-input"
                    placeholder="添加标签, Enter确认"
                    list="tag-datalist"
                    @keydown.enter.prevent="addFormTag"
                  />
                  <datalist id="tag-datalist">
                    <option v-for="t in allTags" :key="t" :value="t" />
                  </datalist>
                </div>
              </div>

              <div class="form-group">
                <label>过期时间</label>
                <input v-model="form.expiresAt" type="date" class="input" />
                <span v-if="form.expiresAt" class="muted-text" style="font-size:0.82rem">过期后笔记会标记提醒，不会自动删除</span>
              </div>

              <div class="form-group">
                <label>
                  <input v-model="form.isStarred" type="checkbox" />
                  标记为重要
                </label>
              </div>
            </div>

            <div class="editor-stats-bar">
              <span>字数: {{ form.content.length }}</span>
              <span>标签: {{ form.tags.length }}</span>
            </div>
          </div>
        </section>

        <!-- 笔记列表 -->
        <section v-else class="panel">
          <div class="section-head">
            <div>
              <p class="eyebrow">Notes</p>
              <h2>笔记列表</h2>
            </div>
            <span class="pill">{{ filteredNotes.length }}</span>
          </div>

          <div v-if="filteredNotes.length === 0" class="empty">
            <strong>{{ searchKeyword || filterCategory || filterTag || filterStarred ? '没有匹配的笔记' : '还没有笔记' }}</strong>
            <p>{{ searchKeyword || filterCategory || filterTag || filterStarred ? '试试调整搜索条件' : '点击"新建笔记"开始记录' }}</p>
          </div>

          <!-- 卡片视图 -->
          <div v-else-if="viewMode === 'card'" class="notes-card-grid">
            <div
              v-for="note in filteredNotes"
              :key="note.id"
              class="note-card"
              @click="viewNote(note)"
            >
              <div class="note-card-head">
                <strong>{{ note.title }}</strong>
                <button
                  type="button"
                  class="star-btn"
                  :class="{ starred: note.isStarred }"
                  @click.stop="doToggleStar(note.id)"
                >
                  {{ note.isStarred ? '★' : '☆' }}
                </button>
              </div>
              <p class="note-card-preview">{{ getPreview(note.content) }}</p>
              <div class="note-card-footer">
                <span v-if="isExpired(note)" class="note-expired-tag">已过期</span>
                <span v-else-if="note.expiresAt" class="note-expires-tag">{{ formatDate(note.expiresAt) }} 到期</span>
                <span v-if="note.category" class="note-cat-tag">{{ note.category }}</span>
                <span v-for="t in (note.tags || []).slice(0, 3)" :key="t" class="note-tag">{{ t }}</span>
                <span class="note-date">{{ formatDate(note.updatedAt) }}</span>
              </div>
            </div>
          </div>

          <!-- 列表视图 -->
          <div v-else class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th>星标</th>
                  <th>标题</th>
                  <th>分类</th>
                  <th>标签</th>
                  <th>字数</th>
                  <th>更新时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="note in filteredNotes" :key="note.id">
                  <td>
                    <button type="button" class="star-btn" :class="{ starred: note.isStarred }" @click="doToggleStar(note.id)">
                      {{ note.isStarred ? '★' : '☆' }}
                    </button>
                  </td>
                  <td><button type="button" class="link-btn" @click="viewNote(note)">{{ note.title }}</button></td>
                  <td>{{ note.category || '-' }}</td>
                  <td>{{ (note.tags || []).join(', ') || '-' }}</td>
                  <td>{{ note.wordCount }}</td>
                  <td>{{ formatDate(note.updatedAt) }}</td>
                  <td class="row-actions">
                    <button type="button" class="mini-btn" @click="editNote(note)">编辑</button>
                    <button type="button" class="mini-btn" @click="shareNote(note)">分享</button>
                    <button type="button" class="mini-btn danger" @click="doDelete(note)">删除</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- 笔记详情 -->
        <section v-if="viewingNote && currentView === 'list'" class="panel">
          <div class="section-head">
            <div>
              <p class="eyebrow">Detail</p>
              <h2>{{ viewingNote.title }}</h2>
            </div>
            <div class="editor-head-actions">
              <button v-if="viewingNote.sourceDocId" type="button" class="mini-btn" @click="goToSourceDoc(viewingNote)">📄 查看原文档</button>
              <button type="button" class="mini-btn" @click="openNoteVersionPanel(viewingNote)">⏱ 版本历史</button>
              <button type="button" class="mini-btn" @click="editNote(viewingNote)">编辑</button>
              <button type="button" class="mini-btn" @click="shareNote(viewingNote)">分享</button>
              <button type="button" class="mini-btn danger" @click="doDelete(viewingNote)">删除</button>
              <button type="button" class="mini-btn" @click="viewingNote = null">关闭</button>
            </div>
          </div>
          <div class="note-detail-meta">
            <span v-if="isExpired(viewingNote)" class="note-expired-tag">已过期</span>
            <span v-else-if="viewingNote.expiresAt" class="note-expires-tag">{{ formatDate(viewingNote.expiresAt) }} 到期</span>
            <span v-if="viewingNote.category" class="note-cat-tag">{{ viewingNote.category }}</span>
            <span v-for="t in viewingNote.tags" :key="t" class="note-tag">{{ t }}</span>
            <span class="note-date">创建: {{ formatDate(viewingNote.createdAt) }}</span>
            <span class="note-date">更新: {{ formatDate(viewingNote.updatedAt) }}</span>
            <span class="note-date">字数: {{ viewingNote.wordCount }}</span>
            <span v-if="viewingNote.isStarred" class="star-badge">★ 重要</span>
            <span v-if="viewingNote.sourceDocId" class="note-cat-tag" title="此笔记摘录自某篇文档">🔗 {{ viewingNote.sourceDocName || '来源文档' }}</span>
          </div>
          <div class="note-detail-content docx-content" v-html="renderMarkdown(viewingNote.content)" @click="onContentClick"></div>
        </section>
      </main>
    </section>

    <!-- 手绘涂鸦弹窗 -->
    <transition name="fade">
      <div v-if="doodleOpen" class="sheet-overlay" style="z-index:8000" @click.self="closeDoodle">
        <div class="doodle-popup">
          <h3 style="margin:0 0 8px;font-size:15px">手绘涂鸦</h3>
          <canvas
            ref="doodleCanvas"
            class="doodle-canvas"
            @mousedown="startDoodle"
            @mousemove="moveDoodle"
            @mouseup="endDoodle"
            @mouseleave="endDoodle"
            @touchstart="startDoodle"
            @touchmove="moveDoodle"
            @touchend="endDoodle"
          ></canvas>
          <div class="doodle-toolbar">
            <button
              v-for="c in ['#0f172a', '#dc2626', '#0f766e', '#2563eb', '#d97706']"
              :key="c"
              type="button"
              class="doodle-color-btn"
              :class="{ active: doodleColor === c }"
              :style="{ background: c }"
              @click="doodleColor = c"
            ></button>
            <button type="button" class="mini-btn" @click="clearDoodle">清空</button>
          </div>
          <div class="backup-actions" style="margin-top:10px">
            <button type="button" class="btn" @click="closeDoodle">取消</button>
            <button type="button" class="btn btn-primary" @click="insertDoodle">插入笔记</button>
          </div>
        </div>
      </div>
    </transition>

    <!-- 笔记版本历史面板 -->
    <transition name="sheet">
      <div v-if="noteVersionsPanelOpen" class="version-overlay" @click.self="noteVersionsPanelOpen = false">
        <div class="version-panel">
          <div class="version-header">
            <h3>笔记版本历史</h3>
            <button type="button" class="mini-btn" @click="noteVersionsPanelOpen = false">✕</button>
          </div>

          <div v-if="noteVersions.length === 0" class="empty compact" style="padding:20px">
            <strong>暂无版本记录</strong>
            <p>每次保存笔记都会自动生成一条版本快照。</p>
          </div>
          <div v-else class="version-list">
            <div v-for="(ver, idx) in noteVersions" :key="ver.id" class="version-item">
              <div class="version-dot" :class="{ first: idx === 0 }"></div>
              <div class="version-info">
                <strong>v{{ ver.version }} · {{ ver.message }}</strong>
                <span>{{ formatDate(ver.createdAt) }} · {{ (ver.content || '').length }} 字</span>
              </div>
              <div class="version-actions">
                <button v-if="idx > 0" type="button" class="mini-btn" @click="doRollbackNote(ver)">回滚</button>
                <button type="button" class="mini-btn danger" @click="doDeleteNoteVersion(ver)">删除</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- 图片放大器 -->
    <ImageLightbox v-model:src="lightboxSrc" />
  </div>
</template>

<script>
import { marked } from 'marked'
import ImageLightbox from '../../components/ImageLightbox.vue'
import {
  listNotes,
  createNote,
  updateNote,
  deleteNote,
  toggleStar,
  listCategories,
  getAllTags,
  getStats,
  exportNotes,
  getNote,
  saveNoteVersion,
  listNoteVersions,
  rollbackNoteVersion,
  deleteNoteVersion,
  addNoteAttachment,
  getNoteAttachment,
  deleteNoteAttachments,
  extractAttachmentIds
} from './notesDb.js'
import { buildNoteIndex, removeNoteIndex } from '../knowledge-base/semanticSearch.js'

export default {
  name: 'PersonalNotes',

  components: { ImageLightbox },

  props: {
    // 从文档阅读器"关联笔记"面板跳转过来时，需要自动打开的笔记 id
    focusNoteId: { type: Number, default: null }
  },

  emits: ['jump-to-doc', 'consumed-focus'],

  data() {
    return {
      notes: [],
      categories: [],
      allTags: [],
      stats: { totalNotes: 0, totalWords: 0, starredCount: 0, avgWordCount: 0, categories: [], tags: [], trendData: [] },

      searchKeyword: '',
      filterCategory: '',
      filterTag: '',
      filterStarred: false,
      sortBy: 'newest',
      viewMode: 'card',

      currentView: 'list', // list | edit
      editingNote: null,
      viewingNote: null,
      showStatsPanel: false,
      showExportMenu: false,

      form: { title: '', content: '', category: '', tags: [], isStarred: false, expiresAt: '' },
      newTagInput: '',
      previewMode: false,

      // 笔记版本历史
      noteVersionsPanelOpen: false,
      noteVersions: [],
      versioningNoteId: null,

      // 图片粘贴 / 手绘涂鸦
      doodleOpen: false,
      doodleColor: '#0f766e',
      _doodleCtx: null,
      _doodleDrawing: false,

      // 图片放大器
      lightboxSrc: '',

      _searchTimer: null
    }
  },

  computed: {
    filteredNotes() {
      let result = this.notes

      if (this.filterCategory) {
        result = result.filter(n => n.category === this.filterCategory)
      }
      if (this.filterTag) {
        result = result.filter(n => (n.tags || []).includes(this.filterTag))
      }
      if (this.filterStarred) {
        result = result.filter(n => n.isStarred)
      }

      return result
    },

    categoriesWithCount() {
      const catMap = {}
      for (const n of this.notes) {
        const cat = n.category || ''
        if (cat) catMap[cat] = (catMap[cat] || 0) + 1
      }
      return this.categories.map(c => ({
        ...c,
        count: catMap[c.name] || 0
      }))
    },

    formPreviewHtml() {
      return this.renderMarkdown(this.form.content)
    }
  },

  async mounted() {
    await this.reload()
    if (this.focusNoteId) await this.openFocusedNote()
  },

  methods: {
    // 从文档阅读器"关联笔记"面板跳转过来，自动打开指定笔记
    async openFocusedNote() {
      const note = await getNote(this.focusNoteId)
      if (note) {
        this.currentView = 'list'
        this.viewingNote = note
      } else {
        alert('该笔记不存在或已被删除')
      }
      this.$emit('consumed-focus')
    },
    goToSourceDoc(note) {
      if (!note?.sourceDocId) return
      this.$emit('jump-to-doc', note.sourceDocId)
    },
    // 笔记支持 Markdown 渲染（跟文档阅读器里 .md 文件用同一套 marked 解析）
    renderMarkdown(text) {
      try {
        return marked(text || '') || '<p></p>'
      } catch (_) {
        return `<p>${(text || '').replace(/</g, '&lt;')}</p>`
      }
    },
    togglePreview() {
      this.previewMode = !this.previewMode
    },
    // 笔记里的图片（插入的图/手绘/粘贴的图）点击放大；附件链接点击打开/预览
    onContentClick(event) {
      const link = event.target.closest?.('a')
      const href = link?.getAttribute('href') || ''
      if (href.startsWith('attachment://')) {
        event.preventDefault()
        this.openAttachment(href.slice('attachment://'.length))
        return
      }
      if (event.target.tagName === 'IMG') {
        this.lightboxSrc = event.target.currentSrc || event.target.src
      }
    },
    // ─── 图片粘贴 / 插入 ───
    insertAtCursor(text) {
      const el = this.$refs.contentTextarea
      if (!el) {
        this.form.content += text
        return
      }
      const start = el.selectionStart ?? this.form.content.length
      const end = el.selectionEnd ?? this.form.content.length
      this.form.content = this.form.content.slice(0, start) + text + this.form.content.slice(end)
      this.$nextTick(() => {
        const pos = start + text.length
        el.focus()
        el.setSelectionRange(pos, pos)
      })
    },
    // 标题快捷按钮：在光标所在行的行首插入 #/##/### （标题标记必须在行首才能被 Markdown 识别）
    insertHeading(level) {
      const prefix = '#'.repeat(level) + ' '
      const el = this.$refs.contentTextarea
      if (!el) {
        this.form.content = prefix + this.form.content
        return
      }
      const value = this.form.content
      const cursorPos = el.selectionStart ?? value.length
      const lineStart = value.lastIndexOf('\n', cursorPos - 1) + 1
      this.form.content = value.slice(0, lineStart) + prefix + value.slice(lineStart)
      this.$nextTick(() => {
        const pos = cursorPos + prefix.length
        el.focus()
        el.setSelectionRange(pos, pos)
      })
    },
    fileToDataUrl(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
    },
    async onImageFileChange(event) {
      const file = event.target.files?.[0]
      event.target.value = ''
      if (!file) return
      if (file.size > 5 * 1024 * 1024) {
        alert('图片超过 5MB，建议先压缩再插入')
        return
      }
      try {
        const dataUrl = await this.fileToDataUrl(file)
        this.insertAtCursor(`\n![图片](${dataUrl})\n`)
      } catch (err) {
        alert('图片读取失败: ' + (err.message || '未知错误'))
      }
    },
    // ─── 附件（任意文件类型，不限大小；Blob 单独存表，正文里只留引用链接） ───
    formatFileSize(bytes) {
      if (!bytes) return '0B'
      if (bytes < 1024) return bytes + 'B'
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB'
      if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + 'MB'
      return (bytes / 1024 / 1024 / 1024).toFixed(2) + 'GB'
    },
    async onAttachmentFileChange(event) {
      const file = event.target.files?.[0]
      event.target.value = ''
      if (!file) return
      try {
        const attachment = await addNoteAttachment(file)
        const label = `📎 ${file.name}（${this.formatFileSize(file.size)}）`
        this.insertAtCursor(`\n[${label}](attachment://${attachment.id})\n`)
      } catch (err) {
        console.error('[notes] attachment add failed:', err)
        const quotaHint = err?.name === 'QuotaExceededError' ? '本地存储空间不足，建议清理旧附件，或在"更多 → PWA 状态"里申请持久化存储。' : ''
        alert('附件保存失败: ' + (err.message || '未知错误') + (quotaHint ? '\n' + quotaHint : ''))
      }
    },
    // 打开/预览附件：图片用应用自带的放大器；其他类型交给浏览器（能预览的原生预览，不能的自动下载）
    async openAttachment(id) {
      // 在用户点击手势内先同步打开空白页，避免下面 await 取数据后 window.open 被浏览器当弹窗拦截
      const preOpened = window.open('', '_blank')
      const attachment = await getNoteAttachment(id)
      if (!attachment) {
        preOpened?.close()
        alert('附件不存在，可能已被删除')
        return
      }
      const url = URL.createObjectURL(attachment.blob)
      if (attachment.mimeType.startsWith('image/')) {
        preOpened?.close()
        this.lightboxSrc = url
      } else if (preOpened) {
        preOpened.location.href = url
        setTimeout(() => URL.revokeObjectURL(url), 60000)
      } else {
        window.open(url, '_blank')
        setTimeout(() => URL.revokeObjectURL(url), 60000)
      }
    },
    async onContentPaste(event) {
      const items = Array.from(event.clipboardData?.items || [])
      const imageItem = items.find(item => item.kind === 'file' && item.type.startsWith('image/'))
      if (!imageItem) return // 普通文本粘贴，交给浏览器默认行为
      event.preventDefault()
      const file = imageItem.getAsFile()
      if (!file) return
      try {
        const dataUrl = await this.fileToDataUrl(file)
        this.insertAtCursor(`\n![粘贴图片](${dataUrl})\n`)
      } catch (err) {
        console.error('[notes] paste image failed:', err)
      }
    },
    // ─── 手绘涂鸦 ───
    openDoodle() {
      this.doodleOpen = true
      this.$nextTick(() => this.setupDoodleCanvas())
    },
    closeDoodle() {
      this.doodleOpen = false
      this._doodleCtx = null
    },
    setupDoodleCanvas() {
      const canvas = this.$refs.doodleCanvas
      if (!canvas) return
      // 提高清晰度：按设备像素比放大画布
      const dpr = window.devicePixelRatio || 1
      const cssWidth = canvas.clientWidth || 320
      const cssHeight = 260
      canvas.width = cssWidth * dpr
      canvas.height = cssHeight * dpr
      canvas.style.height = cssHeight + 'px'
      const ctx = canvas.getContext('2d')
      ctx.scale(dpr, dpr)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, cssWidth, cssHeight)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.lineWidth = 3
      ctx.strokeStyle = this.doodleColor
      this._doodleCtx = ctx
    },
    doodlePointerPos(canvas, event) {
      const rect = canvas.getBoundingClientRect()
      const point = event.touches ? event.touches[0] : event
      return { x: point.clientX - rect.left, y: point.clientY - rect.top }
    },
    startDoodle(event) {
      const canvas = this.$refs.doodleCanvas
      if (!canvas || !this._doodleCtx) return
      event.preventDefault()
      this._doodleDrawing = true
      const { x, y } = this.doodlePointerPos(canvas, event)
      this._doodleCtx.strokeStyle = this.doodleColor
      this._doodleCtx.beginPath()
      this._doodleCtx.moveTo(x, y)
    },
    moveDoodle(event) {
      if (!this._doodleDrawing) return
      const canvas = this.$refs.doodleCanvas
      if (!canvas || !this._doodleCtx) return
      event.preventDefault()
      const { x, y } = this.doodlePointerPos(canvas, event)
      this._doodleCtx.lineTo(x, y)
      this._doodleCtx.stroke()
    },
    endDoodle() {
      this._doodleDrawing = false
    },
    clearDoodle() {
      this.setupDoodleCanvas()
    },
    insertDoodle() {
      const canvas = this.$refs.doodleCanvas
      if (!canvas) return
      const dataUrl = canvas.toDataURL('image/png')
      this.insertAtCursor(`\n![手绘](${dataUrl})\n`)
      this.closeDoodle()
    },
    async reload() {
      try {
        this.notes = await listNotes({
          keyword: this.searchKeyword,
          sort: this.sortBy
        })
        this.categories = await listCategories()
        this.allTags = await getAllTags()
        this.stats = await getStats()
      } catch (err) {
        console.error('[notes] reload failed:', err)
      }
    },

    debouncedSearch() {
      clearTimeout(this._searchTimer)
      this._searchTimer = setTimeout(() => this.reload(), 300)
    },

    // 编辑器
    openEditor(note) {
      if (note) {
        this.editingNote = note
        this.form = {
          title: note.title,
          content: note.content,
          category: note.category || '',
          tags: [...(note.tags || [])],
          isStarred: note.isStarred,
          expiresAt: note.expiresAt ? new Date(note.expiresAt).toISOString().slice(0, 10) : ''
        }
      } else {
        this.editingNote = null
        this.form = { title: '', content: '', category: '', tags: [], isStarred: false, expiresAt: '' }
      }
      this.newTagInput = ''
      this.previewMode = false
      this.currentView = 'edit'
      this.viewingNote = null

      // 打开编辑器后自动滚动到编辑区并聚焦标题，避免手机上要先划过统计卡片和分类侧栏才能看到表单
      this.$nextTick(() => {
        this.$refs.editorSection?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        this.$refs.titleInput?.focus({ preventScroll: true })
      })
    },

    cancelEdit() {
      this.currentView = 'list'
      this.editingNote = null
    },

    async saveNote() {
      if (!this.form.title.trim()) {
        alert('请输入笔记标题')
        return
      }

      try {
        const payload = {
          title: this.form.title,
          content: this.form.content,
          category: this.form.category,
          tags: [...this.form.tags],
          isStarred: this.form.isStarred,
          expiresAt: this.form.expiresAt ? new Date(this.form.expiresAt + 'T23:59:59').getTime() : 0
        }

        if (this.editingNote) {
          // 编辑前先给旧内容存一个版本快照，再应用更新、给新内容也存一个快照
          await saveNoteVersion(this.editingNote, '编辑前自动保存')
          await updateNote(this.editingNote.id, payload)
          const updated = await getNote(this.editingNote.id)
          if (updated) {
            await saveNoteVersion(updated, '编辑保存')
            this.autoIndexNote(updated)
          }
        } else {
          const created = await createNote(payload)
          await saveNoteVersion(created, '初始创建')
          this.autoIndexNote(created)
        }

        this.currentView = 'list'
        this.editingNote = null
        await this.reload()
      } catch (err) {
        console.error('[notes] save failed:', err)
        alert('保存失败: ' + (err.message || '未知错误'))
      }
    },
    // ─── 笔记版本历史 ───
    async openNoteVersionPanel(note) {
      if (!note) return
      this.versioningNoteId = note.id
      this.noteVersions = await listNoteVersions(note.id)
      this.noteVersionsPanelOpen = true
    },
    async doRollbackNote(ver) {
      if (!confirm(`回滚到 v${ver.version}？当前内容会被覆盖（回滚前会自动存一份快照，可以再回滚回来）。`)) return
      const current = await getNote(this.versioningNoteId)
      if (current) await saveNoteVersion(current, '回滚前自动保存')
      await rollbackNoteVersion(this.versioningNoteId, ver.id)
      this.noteVersions = await listNoteVersions(this.versioningNoteId)
      const refreshed = await getNote(this.versioningNoteId)
      if (this.viewingNote?.id === this.versioningNoteId) this.viewingNote = refreshed
      if (refreshed) this.autoIndexNote(refreshed)
      await this.reload()
    },
    async doDeleteNoteVersion(ver) {
      if (!confirm(`删除版本 v${ver.version}？此操作不可撤销。`)) return
      await deleteNoteVersion(ver.id)
      this.noteVersions = await listNoteVersions(this.versioningNoteId)
    },

    editNote(note) {
      this.openEditor(note)
    },

    viewNote(note) {
      this.viewingNote = note
    },

    async doDelete(note) {
      if (!confirm(`确定删除笔记"${note.title}"吗？`)) return
      await deleteNote(note.id)
      await removeNoteIndex(note.id)
      await deleteNoteAttachments(extractAttachmentIds(note.content))
      if (this.viewingNote?.id === note.id) this.viewingNote = null
      await this.reload()
    },
    // 笔记内容变了（新建/编辑/回滚）后台自动重建这一条的语义索引，不阻塞 UI
    async autoIndexNote(note) {
      if (!note) return
      try {
        await buildNoteIndex(note)
      } catch (err) {
        console.warn('[auto-index] 笔记自动索引失败:', note?.title, err)
      }
    },

    async doToggleStar(id) {
      await toggleStar(id)
      await this.reload()
    },

    addFormTag() {
      const tag = this.newTagInput.trim()
      if (tag && !this.form.tags.includes(tag)) {
        this.form.tags.push(tag)
      }
      this.newTagInput = ''
    },

    removeFormTag(idx) {
      this.form.tags.splice(idx, 1)
    },

    async shareNote(note) {
      const tags = (note.tags || []).length ? `标签: ${note.tags.join(', ')}` : ''
      const meta = [
        note.category ? `分类: ${note.category}` : '',
        tags,
        `创建: ${new Date(note.createdAt).toLocaleString('zh-CN')}`,
      ].filter(Boolean).join('\n')
      const text = `# ${note.title}\n\n${meta}\n\n${'─'.repeat(30)}\n\n${note.content}`

      // 优先用文件分享，对方可以直接打开阅读
      if (navigator.share && navigator.canShare) {
        try {
          const file = new File([text], `${note.title}.txt`, { type: 'text/plain' })
          const shareData = { title: note.title, files: [file] }
          if (navigator.canShare(shareData)) {
            await navigator.share(shareData)
            return
          }
        } catch (_) {}
        // 文件分享不支持时用文本分享
        try {
          await navigator.share({ title: note.title, text })
          return
        } catch (err) {
          if (err.name !== 'AbortError') console.error('[share]', err)
          return
        }
      }
      // 回退到剪贴板
      try {
        await navigator.clipboard.writeText(text)
        alert('内容已复制到剪贴板')
      } catch (_) {
        alert('当前浏览器不支持分享功能')
      }
    },

    filterByTag(tag) {
      this.filterTag = this.filterTag === tag ? '' : tag
      this.showStatsPanel = false
    },

    async doExport(format) {
      const content = await exportNotes(format)
      const ext = { json: 'json', csv: 'csv', markdown: 'md' }[format] || 'txt'
      const mime = { json: 'application/json', csv: 'text/csv', markdown: 'text/markdown' }[format] || 'text/plain'
      const blob = new Blob([content], { type: `${mime};charset=utf-8` })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `notes_export.${ext}`
      a.click()
      URL.revokeObjectURL(url)
      this.showExportMenu = false
    },

    isExpired(note) {
      return note.expiresAt && note.expiresAt < Date.now()
    },

    getPreview(content) {
      const text = (content || '').replace(/\s+/g, ' ').trim()
      return text.length > 120 ? text.slice(0, 120) + '...' : text || '暂无内容'
    },

    formatDate(ts) {
      if (!ts) return ''
      return new Date(ts).toLocaleString('zh-CN', {
        month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
      })
    },

    formatNumber(n) {
      if (n >= 10000) return (n / 10000).toFixed(1) + '万'
      if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
      return String(n)
    },

    getTagFontSize(count) {
      const max = Math.max(...this.stats.tags.map(t => t.count), 1)
      return Math.max(12, Math.min(24, 12 + (count / max) * 12))
    },

    getTagOpacity(count) {
      const max = Math.max(...this.stats.tags.map(t => t.count), 1)
      return Math.max(0.5, count / max)
    },

    getTrendBarHeight(count) {
      const max = Math.max(...this.stats.trendData.map(d => d.count), 1)
      return Math.max(8, (count / max) * 100)
    }
  },

  watch: {
    async focusNoteId(val) {
      if (val) await this.openFocusedNote()
    },
    // 附件/图片放大器的 src 从一个 blob: URL 切走后，释放掉旧的，避免累积占用内存
    lightboxSrc(newVal, oldVal) {
      if (oldVal && oldVal.startsWith('blob:') && oldVal !== newVal) {
        URL.revokeObjectURL(oldVal)
      }
    },
    sortBy() { this.reload() },
    filterCategory() { this.viewingNote = null },
    filterTag() { this.viewingNote = null }
  }
}
</script>
