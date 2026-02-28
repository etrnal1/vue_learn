<template>
  <div class="kb-section">
    <div class="section-header">
      <h2>知识库</h2>
      <button @click="openCreate" class="btn-create">+ 新建文章</button>
    </div>

    <section class="doc-panel">
      <div class="doc-panel-head">
        <h3>文档扫描中心</h3>
        <span class="doc-tip">扫描本地目录下的文本文档并在线阅读</span>
      </div>

      <div class="doc-controls">
        <textarea
          v-model.trim="docRootPathsText"
          class="doc-input doc-textarea"
          placeholder="输入文档目录绝对路径，每行一个，例如：&#10;/Users/mac/Documents&#10;/Users/mac/Desktop/notes"
        ></textarea>
        <label class="doc-check"><input type="checkbox" v-model="docRecursive"> 递归子目录</label>
        <button class="btn-primary" :disabled="docScanning" @click="scanDocs">
          {{ docScanning ? '扫描中...' : '立即扫描' }}
        </button>
      </div>

      <div class="format-controls">
        <span class="format-label">扫描格式：</span>
        <label v-for="f in docFormatOptions" :key="f.value" class="doc-check">
          <input type="checkbox" :value="f.value" v-model="selectedDocFormats">
          {{ f.label }}
        </label>
      </div>

      <div class="result-controls">
        <label class="doc-check">
          <input type="checkbox" v-model="preserveScanResults">
          重新扫描保留已有结果（合并去重）
        </label>
        <label class="doc-check">
          <input type="checkbox" v-model="autoImportAsArticles">
          扫描后自动加入知识库文章
        </label>
        <button class="btn-secondary" @click="clearScanResults">清空扫描结果</button>
      </div>

      <div class="schedule-controls">
        <label class="schedule-item">
          定时频率(分钟)
          <input v-model.number="scheduleIntervalMinutes" type="number" min="1" max="1440" class="doc-input small">
        </label>
        <button class="btn-secondary" @click="startSchedule">启动定时</button>
        <button class="btn-secondary" @click="runScheduleNow">立即执行</button>
        <button class="btn-danger" @click="stopSchedule">停止定时</button>
      </div>

      <div class="schedule-status">
        <span>状态：{{ scheduleStatus.enabled ? '运行中' : '已停止' }}</span>
        <span v-if="scheduleStatus.config">目录：{{ (scheduleStatus.config.rootPaths || [scheduleStatus.config.rootPath]).filter(Boolean).join('；') }}</span>
        <span v-if="scheduleStatus.lastRunAt">最近执行：{{ formatDateTime(scheduleStatus.lastRunAt) }}</span>
      </div>

      <div v-if="docError" class="doc-error">{{ docError }}</div>

      <div v-if="docSummary" class="doc-summary">
        <span>扫描目录：{{ (docSummary.rootPaths || [docSummary.rootPath]).filter(Boolean).join('；') }}</span>
        <span>文档总数：{{ docSummary.count }}</span>
      </div>

      <div v-if="displayedDocs.length === 0" class="doc-empty">暂无扫描结果</div>
      <div v-else class="doc-list">
        <div v-for="item in displayedDocs" :key="item.path" class="doc-item">
          <div class="doc-main">
            <div class="doc-name">{{ item.name }}</div>
            <div class="doc-path">{{ item.path }}</div>
          </div>
          <div class="doc-meta">
            <span>{{ item.ext || '-' }}</span>
            <span>{{ formatSize(item.size) }}</span>
            <button class="btn-secondary" @click="openDoc(item)">阅读</button>
          </div>
        </div>
      </div>
    </section>

    <SearchFilter
      v-model:searchQuery="searchQuery"
      v-model:activeFilter="categoryFilter"
      :filters="categoryFilters"
      placeholder="搜索文章标题、内容或标签..."
    />

    <div v-if="filteredArticles.length === 0" class="empty-state">暂无知识库文章</div>
    <div v-else class="articles-grid">
      <ArticleCard
        v-for="a in filteredArticles"
        :key="a.id"
        :article="a"
        :users="users"
        @view="openDetail"
      />
    </div>

    <ItsmModal v-if="showForm" :title="editingArticle ? '编辑文章' : '新建文章'" size="large" @close="closeForm">
      <ArticleEditor v-model="formData" />
      <template #footer>
        <button @click="closeForm" class="btn-secondary">取消</button>
        <button @click="saveArticle" class="btn-primary">{{ editingArticle ? '保存' : '发布' }}</button>
      </template>
    </ItsmModal>

    <ItsmModal v-if="viewingArticle" :title="viewingArticle.articleNo" size="large" @close="viewingArticle = null">
      <div class="detail-header">
        <h3>{{ viewingArticle.title }}</h3>
      </div>
      <div class="detail-meta">
        <span class="category-tag">{{ viewingArticle.category }}</span>
        <span v-for="tag in viewingArticle.tags" :key="tag" class="tag">{{ tag }}</span>
        <span class="meta-text">{{ getAuthorName(viewingArticle.authorId) }}</span>
        <span class="meta-text">{{ formatDate(viewingArticle.updatedAt) }}</span>
        <span class="meta-text">👁 {{ viewingArticle.viewCount }}</span>
      </div>
      <div class="article-content">
        <MarkdownRenderer :content="viewingArticle.content" />
      </div>
      <template #footer>
        <button @click="editFromDetail" class="btn-secondary">编辑</button>
        <button @click="deleteArticle" class="btn-danger">删除</button>
        <button @click="viewingArticle = null" class="btn-primary">关闭</button>
      </template>
    </ItsmModal>

    <ItsmModal v-if="readingDoc" :title="readingDoc.name" size="large" @close="readingDoc = null">
      <div class="doc-read-meta">
        <span>{{ readingDoc.path }}</span>
        <span>{{ formatSize(readingDoc.size) }}</span>
        <span v-if="readingDoc.truncated" class="doc-warn">内容已截断（最多 1MB）</span>
      </div>
      <div class="doc-read-content">
        <MarkdownRenderer v-if="isMarkdownDoc(readingDoc.name)" :content="readingDoc.content" />
        <pre v-else>{{ readingDoc.content }}</pre>
      </div>
      <template #footer>
        <button @click="readingDoc = null" class="btn-primary">关闭</button>
      </template>
    </ItsmModal>
  </div>
</template>

<script>
import SearchFilter from '../../components/itsm/SearchFilter.vue'
import ArticleCard from '../../components/itsm/ArticleCard.vue'
import ArticleEditor from '../../components/itsm/ArticleEditor.vue'
import MarkdownRenderer from '../../components/itsm/MarkdownRenderer.vue'
import ItsmModal from '../../components/itsm/ItsmModal.vue'
import { api } from '../../utils/api.js'

export default {
  name: 'KnowledgeBaseSection',
  components: { SearchFilter, ArticleCard, ArticleEditor, MarkdownRenderer, ItsmModal },
  props: {
    articles: { type: Array, required: true },
    users: { type: Array, required: true },
    currentUserId: { type: String, required: true }
  },
  emits: ['create-article', 'update-article', 'delete-article'],
  data() {
    return {
      searchQuery: '',
      categoryFilter: 'all',
      showForm: false,
      editingArticle: null,
      viewingArticle: null,
      formData: this.emptyForm(),
      categoryFilters: [
        { value: 'all', label: '全部' },
        { value: '故障排除', label: '故障排除' },
        { value: '操作指南', label: '操作指南' },
        { value: '常见问题', label: '常见问题' },
        { value: '最佳实践', label: '最佳实践' },
        { value: '系统文档', label: '系统文档' }
      ],

      docRootPathsText: '/Users/mac/Documents',
      docRecursive: true,
      docScanning: false,
      docError: '',
      docSummary: null,
      scannedDocs: [],
      readingDoc: null,
      preserveScanResults: true,
      autoImportAsArticles: true,
      importingDocs: false,
      selectedDocFormats: ['md', 'doc', 'excel', 'txt'],
      docFormatOptions: [
        { value: 'md', label: 'MD' },
        { value: 'doc', label: 'DOC' },
        { value: 'excel', label: 'EXCEL' },
        { value: 'txt', label: 'TXT' }
      ],

      scheduleIntervalMinutes: 30,
      scheduleStatus: {
        enabled: false,
        config: null,
        lastRunAt: null,
        lastError: '',
        lastResult: null
      }
    }
  },
  computed: {
    filteredArticles() {
      return this.articles.filter(a => {
        const q = this.searchQuery.toLowerCase()
        const matchSearch = !q ||
          a.title.toLowerCase().includes(q) ||
          a.content.toLowerCase().includes(q) ||
          a.tags.some(t => t.toLowerCase().includes(q))
        const matchCategory = this.categoryFilter === 'all' || a.category === this.categoryFilter
        return matchSearch && matchCategory
      }).sort((a, b) => b.updatedAt - a.updatedAt)
    },
    displayedDocs() {
      const active = new Set(this.selectedDocFormats)
      const extByGroup = {
        md: ['.md', '.markdown'],
        doc: ['.doc', '.docx'],
        excel: ['.xls', '.xlsx'],
        txt: ['.txt']
      }
      const allowed = new Set([...active].flatMap((k) => extByGroup[k] || []))
      if (allowed.size === 0) return this.scannedDocs
      return this.scannedDocs.filter((item) => allowed.has(String(item.ext || '').toLowerCase()))
    }
  },
  methods: {
    emptyForm() {
      return { title: '', content: '', category: '操作指南', tags: [] }
    },
    openCreate() {
      this.editingArticle = null
      this.formData = this.emptyForm()
      this.showForm = true
    },
    openDetail(article) {
      this.viewingArticle = JSON.parse(JSON.stringify(article))
      this.$emit('update-article', { ...article, viewCount: article.viewCount + 1 })
    },
    closeForm() {
      this.showForm = false
      this.editingArticle = null
    },
    saveArticle() {
      if (!this.formData.title.trim() || !this.formData.content.trim()) {
        alert('请填写标题和内容')
        return
      }
      if (this.editingArticle) {
        this.$emit('update-article', { ...this.editingArticle, ...this.formData, updatedAt: Date.now() })
      } else {
        this.$emit('create-article', { ...this.formData })
      }
      this.closeForm()
    },
    editFromDetail() {
      this.editingArticle = this.viewingArticle
      this.formData = {
        title: this.viewingArticle.title,
        content: this.viewingArticle.content,
        category: this.viewingArticle.category,
        tags: [...this.viewingArticle.tags]
      }
      this.viewingArticle = null
      this.showForm = true
    },
    deleteArticle() {
      if (confirm('确定删除此文章？')) {
        this.$emit('delete-article', this.viewingArticle.id)
        this.viewingArticle = null
      }
    },
    getAuthorName(id) {
      const user = this.users.find(u => u.id === id)
      return user ? `${user.avatar} ${user.name}` : '未知'
    },
    formatDate(ts) {
      return new Date(ts).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
    },
    formatDateTime(ts) {
      if (!ts) return '-'
      return new Date(ts).toLocaleString('zh-CN', { hour12: false })
    },
    formatSize(bytes) {
      const n = Number(bytes || 0)
      if (n < 1024) return `${n} B`
      if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
      if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`
      return `${(n / (1024 * 1024 * 1024)).toFixed(1)} GB`
    },
    parseRootPathsInput() {
      return String(this.docRootPathsText || '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
    },
    setRootPathsInput(paths) {
      if (!Array.isArray(paths) || paths.length === 0) return
      this.docRootPathsText = paths.join('\n')
    },
    isMarkdownDoc(name) {
      return /\.(md|markdown)$/i.test(String(name || ''))
    },
    isPreviewablePath(filePath) {
      return /\.(md|markdown|txt)$/i.test(String(filePath || ''))
    },
    applyScanResult(result) {
      const incoming = Array.isArray(result?.items) ? result.items : []
      if (!this.preserveScanResults) {
        this.scannedDocs = incoming
        return
      }
      const map = new Map(this.scannedDocs.map((item) => [item.path, item]))
      for (const item of incoming) {
        map.set(item.path, item)
      }
      this.scannedDocs = [...map.values()].sort((a, b) => (b.mtime || 0) - (a.mtime || 0))
    },
    normalizeTags(tags) {
      if (Array.isArray(tags)) return tags
      if (typeof tags === 'string') {
        try {
          const parsed = JSON.parse(tags)
          return Array.isArray(parsed) ? parsed : []
        } catch (error) {
          return []
        }
      }
      return []
    },
    hasImportedDocPath(filePath) {
      const token = `docpath:${filePath}`
      return this.articles.some((a) => this.normalizeTags(a.tags).includes(token))
    },
    async importScannedDocsToArticles(items) {
      if (!this.autoImportAsArticles) return
      if (!Array.isArray(items) || items.length === 0) return
      if (this.importingDocs) return

      this.importingDocs = true
      let imported = 0
      let skipped = 0
      const limit = 120
      const targets = items.slice(0, limit)

      for (const item of targets) {
        if (this.hasImportedDocPath(item.path)) {
          skipped += 1
          continue
        }

        let content = `# ${item.name}\n\n- 路径：\`${item.path}\`\n- 大小：${this.formatSize(item.size)}\n- 扫描时间：${this.formatDateTime(Date.now())}\n`
        if (this.isPreviewablePath(item.path)) {
          try {
            const detail = await api.docScanner.read(item.path)
            content = detail.content || content
          } catch (error) {
            content += '\n\n> 读取正文失败，保留元信息。'
          }
        } else {
          content += '\n\n> 该格式暂不支持文本预览（已建立索引，可后续扩展解析）。'
        }

        this.$emit('create-article', {
          title: item.name,
          content,
          category: '系统文档',
          tags: ['doc-scan', `docpath:${item.path}`, String(item.ext || '').replace('.', '')]
        })
        imported += 1
      }

      this.importingDocs = false
      alert(`文档入库完成：新增 ${imported} 篇，跳过 ${skipped} 篇（已存在）`)
    },
    clearScanResults() {
      this.scannedDocs = []
      this.docSummary = null
    },
    async scanDocs() {
      const rootPaths = this.parseRootPathsInput()
      if (rootPaths.length === 0) {
        alert('请先输入至少一个文档目录绝对路径（每行一个）')
        return
      }
      if (this.selectedDocFormats.length === 0) {
        alert('请至少选择一种扫描格式')
        return
      }
      this.docScanning = true
      this.docError = ''
      try {
        const result = await api.docScanner.scan({
          rootPaths,
          recursive: this.docRecursive,
          maxFiles: 2000,
          includeExts: this.selectedDocFormats
        })
        this.docSummary = result.summary || null
        this.applyScanResult(result)
        if (Array.isArray(result.includeExts) && result.includeExts.length) {
          this.selectedDocFormats = result.includeExts
        }
        await this.importScannedDocsToArticles(result.items || [])
      } catch (error) {
        this.docError = error.message || '扫描失败'
      } finally {
        this.docScanning = false
      }
    },
    async openDoc(item) {
      if (!this.isPreviewablePath(item.path)) {
        alert('该格式暂不支持在线阅读预览（可先扫描管理，后续可扩展解析）')
        return
      }
      try {
        const detail = await api.docScanner.read(item.path)
        this.readingDoc = detail
      } catch (error) {
        alert(`读取失败: ${error.message || 'unknown error'}`)
      }
    },
    async refreshSchedulerStatus() {
      try {
        const status = await api.docScanner.getScheduler()
        this.scheduleStatus = status
        if (Array.isArray(status.config?.rootPaths) && status.config.rootPaths.length) {
          this.setRootPathsInput(status.config.rootPaths)
        } else if (status.config?.rootPath) {
          this.setRootPathsInput([status.config.rootPath])
        }
        if (status.config?.intervalMinutes) {
          this.scheduleIntervalMinutes = status.config.intervalMinutes
        }
        if (Array.isArray(status.config?.includeExts) && status.config.includeExts.length) {
          this.selectedDocFormats = status.config.includeExts
        }
        if (status.lastResult?.summary) {
          this.docSummary = status.lastResult.summary
        }
        if (Array.isArray(status.lastResult?.topItems)) {
          this.applyScanResult({ items: status.lastResult.topItems })
        }
      } catch (error) {
        this.docError = error.message || '获取定时状态失败'
      }
    },
    async startSchedule() {
      const rootPaths = this.parseRootPathsInput()
      if (rootPaths.length === 0) {
        alert('请先输入至少一个文档目录绝对路径（每行一个）')
        return
      }
      if (this.selectedDocFormats.length === 0) {
        alert('请至少选择一种扫描格式')
        return
      }
      try {
        const status = await api.docScanner.startScheduler({
          rootPaths,
          recursive: this.docRecursive,
          maxFiles: 2000,
          intervalMinutes: this.scheduleIntervalMinutes,
          includeExts: this.selectedDocFormats
        })
        this.scheduleStatus = status
        if (status.lastResult?.summary) {
          this.docSummary = status.lastResult.summary
        }
        if (Array.isArray(status.lastResult?.topItems)) {
          this.applyScanResult({ items: status.lastResult.topItems })
        }
      } catch (error) {
        this.docError = error.message || '启动定时扫描失败'
      }
    },
    async stopSchedule() {
      try {
        this.scheduleStatus = await api.docScanner.stopScheduler()
      } catch (error) {
        this.docError = error.message || '停止定时扫描失败'
      }
    },
    async runScheduleNow() {
      try {
        const status = await api.docScanner.runScheduler()
        this.scheduleStatus = status
        if (status.lastResult?.summary) {
          this.docSummary = status.lastResult.summary
        }
        if (Array.isArray(status.lastResult?.topItems)) {
          this.applyScanResult({ items: status.lastResult.topItems })
        }
      } catch (error) {
        this.docError = error.message || '立即执行扫描失败'
      }
    }
  },
  mounted() {
    this.refreshSchedulerStatus()
  }
}
</script>

<style scoped>
.kb-section { animation: fadeIn 0.4s ease; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.section-header {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;
}
.section-header h2 { margin: 0; color: #333; font-size: 1.4em; }

.btn-create {
  padding: 10px 22px; background: #10b981; color: white;
  border: none; border-radius: 8px; font-weight: 700; cursor: pointer;
}
.btn-create:hover { background: #059669; }

.doc-panel {
  border: 1px solid #e5e7eb;
  background: #f8fafc;
  border-radius: 12px;
  padding: 14px;
  margin-bottom: 16px;
}
.doc-panel-head { display: flex; justify-content: space-between; gap: 10px; flex-wrap: wrap; align-items: center; margin-bottom: 10px; }
.doc-panel-head h3 { margin: 0; font-size: 1.05em; }
.doc-tip { color: #64748b; font-size: 0.85em; }

.doc-controls,
.schedule-controls {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}
.format-controls {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: 8px;
}
.result-controls {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: 8px;
}
.result-controls .doc-check { font-size: 0.88em; }
.format-label {
  font-size: 0.88em;
  color: #334155;
  font-weight: 700;
}

.schedule-controls { grid-template-columns: auto auto auto auto; justify-content: start; }
.schedule-item { display: flex; align-items: center; gap: 8px; font-size: 0.9em; color: #334155; }

.doc-input {
  border: 2px solid #dbe3ee;
  border-radius: 8px;
  padding: 8px 10px;
  font: inherit;
  background: white;
}
.doc-textarea {
  min-height: 74px;
  resize: vertical;
}
.doc-input.small { width: 100px; }
.doc-input:focus { outline: none; border-color: #3b82f6; }
.doc-check { color: #475569; font-size: 0.88em; }

.schedule-status,
.doc-summary {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  color: #64748b;
  font-size: 0.85em;
  margin: 8px 0;
}

.doc-error { color: #dc2626; font-size: 0.88em; margin-bottom: 8px; }
.doc-empty { color: #94a3b8; font-size: 0.9em; padding: 8px 0; }

.doc-list { display: grid; gap: 8px; max-height: 300px; overflow: auto; }
.doc-item {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: white;
  padding: 10px;
}
.doc-main { min-width: 0; }
.doc-name { font-weight: 700; color: #0f172a; }
.doc-path { color: #64748b; font-size: 0.8em; word-break: break-all; margin-top: 2px; }
.doc-meta { display: flex; gap: 8px; align-items: center; color: #475569; font-size: 0.82em; }

.articles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.empty-state { text-align: center; padding: 60px 20px; color: #999; }

.detail-header h3 { margin: 0 0 12px; color: #333; font-size: 1.3em; }

.detail-meta {
  display: flex; gap: 10px; flex-wrap: wrap; align-items: center;
  margin-bottom: 20px;
}

.category-tag {
  padding: 4px 12px; background: #eff6ff; color: #3b82f6;
  border-radius: 12px; font-size: 0.8em; font-weight: 600;
}

.tag {
  padding: 4px 12px; background: #f3f4f6; color: #666;
  border-radius: 12px; font-size: 0.8em; font-weight: 600;
}

.meta-text { font-size: 0.85em; color: #999; }

.article-content {
  background: #fafafa; border-radius: 8px; padding: 24px;
  min-height: 200px;
}

.doc-read-meta {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 10px;
  color: #64748b;
  font-size: 0.85em;
}
.doc-warn { color: #b45309; font-weight: 700; }
.doc-read-content {
  background: #fafafa;
  border-radius: 8px;
  padding: 16px;
  max-height: 60vh;
  overflow: auto;
}
.doc-read-content pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace;
}

.btn-primary { padding: 8px 20px; background: #3b82f6; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; }
.btn-secondary { padding: 8px 20px; background: #e5e7eb; color: #333; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; }
.btn-danger { padding: 8px 20px; background: #ef4444; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; }

@media (max-width: 1024px) {
  .articles-grid { grid-template-columns: 1fr; }
}

@media (max-width: 768px) {
  .kb-section { padding: 0; }

  .section-header {
    flex-direction: column;
    gap: 10px;
    align-items: stretch;
  }

  .section-header h2 { font-size: 1.1em; }

  .btn-create {
    width: 100%;
    padding: 10px 16px;
    font-size: 0.9em;
  }

  .doc-controls,
  .schedule-controls { grid-template-columns: 1fr; }
  .schedule-item { justify-content: space-between; }

  .articles-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .detail-header h3 { font-size: 1em; }

  .detail-meta {
    gap: 8px;
    flex-wrap: wrap;
    font-size: 0.8em;
  }

  .category-tag, .tag {
    padding: 3px 8px;
    font-size: 0.7em;
  }

  .meta-text { font-size: 0.75em; }

  .article-content { padding: 12px; }

  .btn-primary, .btn-secondary, .btn-danger {
    padding: 6px 14px;
    font-size: 0.85em;
  }

  .doc-item {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (max-width: 480px) {
  .section-header h2 { font-size: 1em; }

  .btn-create { font-size: 0.85em; }

  .detail-header h3 { font-size: 0.95em; }

  .detail-meta {
    font-size: 0.7em;
    gap: 4px;
  }

  .category-tag, .tag {
    padding: 2px 6px;
    font-size: 0.65em;
  }

  .btn-primary, .btn-secondary, .btn-danger {
    padding: 5px 12px;
    font-size: 0.75em;
  }
}
</style>
