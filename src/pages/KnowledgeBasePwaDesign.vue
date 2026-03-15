<template>
  <div class="kb-page">
    <section class="kb-hero">
      <div class="hero-copy">
        <p class="hero-kicker">Standalone-ready module</p>
        <h1>本地知识库 PWA</h1>
        <p class="hero-text">
          现在这页已经接入真实导入、Word/Excel 解析、IndexedDB 持久化和本地搜索，后面可以整体迁到单独项目。
        </p>
        <div class="hero-actions">
          <button type="button" class="app-btn app-btn--primary" @click="openFilePicker">导入文档</button>
          <button type="button" class="app-btn" @click="workspaceView = 'settings'">检查存储状态</button>
        </div>
      </div>

      <div class="hero-stats app-card">
        <article>
          <span>文档数</span>
          <strong>{{ docs.length }}</strong>
        </article>
        <article>
          <span>持久化</span>
          <strong>{{ storageInfo.persisted ? '已申请' : '未申请' }}</strong>
        </article>
        <article>
          <span>容量估算</span>
          <strong>{{ storageInfo.usageText }}</strong>
        </article>
        <article>
          <span>网络</span>
          <strong>{{ isOnline ? '在线' : '离线' }}</strong>
        </article>
      </div>
    </section>

    <section class="kb-toolbar app-panel">
      <div class="toolbar-left">
        <button
          v-for="item in navItems"
          :key="item.id"
          type="button"
          class="nav-chip"
          :class="{ active: workspaceView === item.id }"
          @click="workspaceView = item.id"
        >
          {{ item.label }}
        </button>
      </div>
      <div class="toolbar-right">
        <input
          v-model.trim="listKeyword"
          class="app-input toolbar-search"
          placeholder="列表搜索：文件名 / 内容关键词"
        />
        <input
          v-model.trim="searchKeyword"
          class="app-input toolbar-search"
          placeholder="全文搜索：正文 / 单元格"
        />
        <button type="button" class="app-btn" @click="reloadDocs">刷新</button>
        <button type="button" class="app-btn" @click="openFilePicker">导入</button>
        <button type="button" class="app-btn app-btn--danger" :disabled="docs.length === 0" @click="clearAllDocs">
          清空全部
        </button>
      </div>
    </section>

    <section class="kb-layout">
      <aside class="kb-sidebar app-panel">
        <div class="sidebar-head">
          <div>
            <p class="section-kicker">Documents</p>
            <h2>文档列表</h2>
          </div>
          <span class="app-pill">{{ filteredDocs.length }} 项</span>
        </div>

        <div class="sidebar-controls">
          <label class="field">
            <span>筛选</span>
            <select v-model="typeFilter" class="app-select">
              <option value="all">全部</option>
              <option value="docx">Word</option>
              <option value="xlsx">Excel</option>
            </select>
          </label>
          <label class="field">
            <span>列表搜索</span>
            <input v-model.trim="listKeyword" class="app-input" placeholder="文件名 / 内容关键词" />
          </label>
        </div>

        <div v-if="filteredDocs.length === 0" class="empty-state">
          <strong>还没有文档</strong>
          <p>点击“导入文档”，从 iPhone Files 或本机文件系统选择 `.docx` / `.xlsx` 文件。</p>
        </div>

        <div v-else class="doc-list">
          <button
            v-for="doc in filteredDocs"
            :key="doc.id"
            type="button"
            class="doc-item"
            :class="{ active: activeDocId === doc.id }"
            @click="openDoc(doc)"
          >
            <div class="doc-item-icon" :class="doc.type">{{ doc.type === 'docx' ? 'W' : 'X' }}</div>
            <div class="doc-item-body">
              <strong>{{ doc.name }}</strong>
              <p>{{ getDocPreview(doc) }}</p>
              <span>{{ doc.type.toUpperCase() }} · {{ formatBytes(doc.size) }} · {{ formatDate(doc.createdAt) }}</span>
            </div>
          </button>
        </div>
      </aside>

      <main class="kb-main app-panel">
        <section v-if="workspaceView === 'home'" class="content-section">
          <div class="section-head">
            <div>
              <p class="section-kicker">Home</p>
              <h2>文档工作台</h2>
            </div>
            <div class="section-actions">
              <button type="button" class="app-btn" :disabled="!activeDoc" @click="workspaceView = 'reader'">打开阅读</button>
              <button type="button" class="app-btn" @click="workspaceView = 'search'">全文搜索</button>
            </div>
          </div>

          <div class="summary-grid">
            <article class="summary-card">
              <span>Word 文档</span>
              <strong>{{ docCounts.docx }}</strong>
              <p>使用 mammoth 转 HTML，保留基础结构。</p>
            </article>
            <article class="summary-card">
              <span>Excel 文档</span>
              <strong>{{ docCounts.xlsx }}</strong>
              <p>多 Sheet 解析并可横向滚动浏览。</p>
            </article>
            <article class="summary-card">
              <span>最近打开</span>
              <strong>{{ activeDoc ? activeDoc.name : '暂无' }}</strong>
              <p>自动保存到本地 meta，刷新后继续查看。</p>
            </article>
          </div>

          <article class="overview-card">
            <div class="section-head small">
              <div>
                <p class="section-kicker">Management</p>
                <h3>文档管理列表</h3>
              </div>
              <span class="app-pill">{{ filteredDocs.length }} 条</span>
            </div>
            <div v-if="filteredDocs.length === 0" class="empty-state compact">
              <strong>没有可管理的文档</strong>
              <p>导入后会在这里显示成完整列表，而不是只有阅读视图。</p>
            </div>
            <div v-else class="doc-table-wrap">
              <table class="doc-table">
                <thead>
                  <tr>
                    <th>文件名</th>
                    <th>类型</th>
                    <th>大小</th>
                    <th>导入时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="doc in filteredDocs" :key="`table-${doc.id}`">
                    <td>{{ doc.name }}</td>
                    <td>{{ doc.type.toUpperCase() }}</td>
                    <td>{{ formatBytes(doc.size) }}</td>
                    <td>{{ formatDate(doc.createdAt) }}</td>
                    <td class="actions-cell">
                      <button type="button" class="table-action" @click="openDoc(doc)">打开</button>
                      <button type="button" class="table-action danger" @click="deleteDoc(doc)">删除</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </article>

          <div class="doc-overview-grid">
            <article class="overview-card">
              <div class="section-head small">
                <div>
                  <p class="section-kicker">Selected</p>
                  <h3>当前文档</h3>
                </div>
              </div>
              <div v-if="activeDoc" class="current-doc-card">
                <div class="current-doc-top">
                  <div class="doc-item-icon large" :class="activeDoc.type">{{ activeDoc.type === 'docx' ? 'W' : 'X' }}</div>
                  <div>
                    <strong>{{ activeDoc.name }}</strong>
                    <p>{{ formatDate(activeDoc.createdAt) }}</p>
                  </div>
                </div>
                <p>{{ getDocPreview(activeDoc) }}</p>
                <div class="current-doc-actions">
                  <button type="button" class="app-btn" @click="workspaceView = 'reader'">阅读</button>
                  <button type="button" class="app-btn app-btn--danger" @click="deleteDoc(activeDoc)">删除</button>
                </div>
              </div>
              <div v-else class="empty-state compact">
                <strong>未选中文档</strong>
                <p>从左侧列表选择一个文档开始阅读。</p>
              </div>
            </article>

            <article class="overview-card">
              <div class="section-head small">
                <div>
                  <p class="section-kicker">Queue</p>
                  <h3>最近导入</h3>
                </div>
              </div>
              <div v-if="importQueue.length === 0" class="empty-state compact">
                <strong>还没有导入记录</strong>
                <p>导入后这里会显示解析成功、失败和警告。</p>
              </div>
              <div v-else class="queue-list">
                <div v-for="item in importQueue" :key="item.key" class="queue-item">
                  <div>
                    <strong>{{ item.name }}</strong>
                    <p>{{ item.detail }}</p>
                  </div>
                  <span class="queue-state" :class="item.state">{{ item.status }}</span>
                </div>
              </div>
            </article>
          </div>

          <article class="overview-card">
            <div class="section-head small">
              <div>
                <p class="section-kicker">Full Text</p>
                <h3>全文搜索预览</h3>
              </div>
              <button type="button" class="app-btn" @click="workspaceView = 'search'">进入搜索页</button>
            </div>
            <label class="field">
              <span>全文关键词</span>
              <input v-model.trim="searchKeyword" class="app-input" placeholder="例如：离线、存储、排班、联系人" />
            </label>
            <div v-if="homeSearchResults.length === 0" class="empty-state compact">
              <strong>{{ searchKeyword ? '当前没有命中结果' : '输入关键词后会在首页直接出现结果' }}</strong>
              <p>这里会先展示前 5 条命中，你也可以进“搜索”页看完整结果。</p>
            </div>
            <div v-else class="search-result-list">
              <button
                v-for="result in homeSearchResults"
                :key="`home-${result.doc.id}-${result.index}`"
                type="button"
                class="search-result"
                @click="openSearchResult(result)"
              >
                <div>
                  <strong>{{ result.doc.name }}</strong>
                  <p>{{ result.snippet }}</p>
                </div>
                <span>{{ result.doc.type.toUpperCase() }}</span>
              </button>
            </div>
          </article>
        </section>

        <section v-else-if="workspaceView === 'import'" class="content-section">
          <div class="section-head">
            <div>
              <p class="section-kicker">Import</p>
              <h2>导入文档</h2>
            </div>
            <button type="button" class="app-btn app-btn--primary" @click="openFilePicker">选择文件</button>
          </div>

          <button type="button" class="import-dropzone" @click="openFilePicker">
            <strong>点击选择 `.docx` / `.xlsx` 文件</strong>
            <p>单文件最大 50 MB，支持多选；iOS Safari 请从“文件”App 或 iCloud Drive 选择。</p>
          </button>

          <div class="queue-list import-list">
            <div v-if="importQueue.length === 0" class="empty-state compact">
              <strong>暂无导入任务</strong>
              <p>导入成功后会自动保存到 IndexedDB，本地离线可继续打开。</p>
            </div>
            <div v-for="item in importQueue" :key="item.key" class="queue-item">
              <div>
                <strong>{{ item.name }}</strong>
                <p>{{ item.detail }}</p>
              </div>
              <span class="queue-state" :class="item.state">{{ item.status }}</span>
            </div>
          </div>
        </section>

        <section v-else-if="workspaceView === 'search'" class="content-section">
          <div class="section-head">
            <div>
              <p class="section-kicker">Search</p>
              <h2>全文搜索</h2>
            </div>
            <span class="app-pill">{{ searchResults.length }} 结果</span>
          </div>

          <label class="field">
            <span>关键词</span>
            <input v-model.trim="searchKeyword" class="app-input" placeholder="例如：离线、持久化、排班、Sheet" />
          </label>

          <div v-if="searchResults.length === 0" class="empty-state compact">
            <strong>{{ searchKeyword ? '没有匹配结果' : '输入关键词开始搜索' }}</strong>
            <p>搜索范围覆盖 Word 纯文本内容、Excel 单元格文本和文件名。</p>
          </div>

          <div v-else class="search-result-list">
            <button
              v-for="result in searchResults"
              :key="`${result.doc.id}-${result.index}`"
              type="button"
              class="search-result"
              @click="openSearchResult(result)"
            >
              <div>
                <strong>{{ result.doc.name }}</strong>
                <p>{{ result.snippet }}</p>
              </div>
              <span>{{ result.doc.type.toUpperCase() }}</span>
            </button>
          </div>
        </section>

        <section v-else-if="workspaceView === 'settings'" class="content-section">
          <div class="section-head">
            <div>
              <p class="section-kicker">Settings</p>
              <h2>存储与 PWA 状态</h2>
            </div>
            <button type="button" class="app-btn" @click="requestPersistentStorage">申请持久化</button>
          </div>

          <div class="settings-grid">
            <article class="setting-card">
              <strong>持久化存储</strong>
              <p>当前状态：{{ storageInfo.persisted ? '已持久化' : '未持久化' }}</p>
              <small>{{ storageInfo.persistMessage }}</small>
            </article>
            <article class="setting-card">
              <strong>存储用量</strong>
              <p>{{ storageInfo.usageText }} / {{ storageInfo.quotaText }}</p>
              <small>数据保存在浏览器 IndexedDB，本页刷新不会丢失。</small>
            </article>
            <article class="setting-card">
              <strong>PWA 能力</strong>
              <p>{{ pwaSummary }}</p>
              <small>当前仓库已注册 `manifest` 和 `service worker`。</small>
            </article>
          </div>

          <div class="tips-card">
            <h3>当前实现范围</h3>
            <ul>
              <li>`.docx` 使用 `mammoth` 解析为 HTML 与纯文本。</li>
              <li>`.xlsx` 使用 `xlsx` 解析为多 Sheet 数据。</li>
              <li>导入结果写入 IndexedDB，可离线继续查看。</li>
              <li>搜索为本地 JS 遍历，文档量大时再换索引方案。</li>
            </ul>
          </div>
        </section>

        <section v-else class="content-section">
          <div class="section-head">
            <div>
              <p class="section-kicker">Reader</p>
              <h2>{{ activeDoc ? activeDoc.name : '文档阅读' }}</h2>
            </div>
            <div class="section-actions" v-if="activeDoc">
              <button type="button" class="app-btn" @click="workspaceView = 'home'">返回概览</button>
              <button type="button" class="app-btn app-btn--danger" @click="deleteDoc(activeDoc)">删除</button>
            </div>
          </div>

          <div v-if="!activeDoc" class="empty-state">
            <strong>没有可阅读的文档</strong>
            <p>先导入文档，或者从左侧列表选择已有内容。</p>
          </div>

          <div v-else-if="activeDoc.type === 'docx'" class="reader-body">
            <div v-if="activeDoc.parseWarnings?.length" class="reader-warning">
              <strong>解析提示</strong>
              <p>{{ activeDoc.parseWarnings.join('；') }}</p>
            </div>
            <article class="docx-content doc-read-content" v-html="activeDoc.contentHtml"></article>
          </div>

          <div v-else class="reader-body">
            <div class="sheet-tab-row">
              <button
                v-for="sheet in activeDoc.sheets || []"
                :key="sheet.name"
                type="button"
                class="sheet-tab"
                :class="{ active: activeSheetName === sheet.name }"
                @click="activeSheetName = sheet.name"
              >
                {{ sheet.name }}
              </button>
            </div>
            <div class="sheet-table-wrap">
              <table class="sheet-table">
                <thead>
                  <tr>
                    <th v-for="head in activeSheet.headers" :key="head">{{ head || ' ' }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, rowIndex) in activeSheet.rows" :key="`${rowIndex}-${row[0] || 'row'}`">
                    <td v-for="(cell, cellIndex) in row" :key="`${rowIndex}-${cellIndex}`" :title="formatCell(cell)">
                      {{ formatCell(cell) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </section>

    <input
      ref="fileInput"
      class="sr-only-input"
      type="file"
      accept=".docx,.xlsx"
      multiple
      @change="onFileChange"
    />
  </div>
</template>

<script>
import * as XLSX from 'xlsx'
import mammoth from 'mammoth/mammoth.browser'
import { detectPWA, getPWAStatusText } from '../utils/pwa.js'
import {
  clearKnowledgeDocs,
  getKnowledgeMeta,
  listKnowledgeDocs,
  removeKnowledgeDoc,
  saveKnowledgeDocs,
  setKnowledgeMeta
} from '../features/knowledge-base/knowledgeBaseDb.js'

const MAX_FILE_SIZE = 50 * 1024 * 1024

function stripHtml(html) {
  if (!html) return ''
  if (typeof window === 'undefined' || !window.document) {
    return String(html).replace(/<[^>]*>/g, ' ')
  }
  const div = window.document.createElement('div')
  div.innerHTML = String(html)
  return div.textContent || div.innerText || ''
}

function toSheetRows(rows) {
  return Array.isArray(rows)
    ? rows.map((row) => (Array.isArray(row) ? row.map((cell) => (cell == null ? '' : String(cell))) : []))
    : []
}

export default {
  name: 'KnowledgeBasePwaDesign',
  data() {
    return {
      docs: [],
      workspaceView: 'home',
      typeFilter: 'all',
      listKeyword: '',
      searchKeyword: '',
      activeDocId: null,
      activeSheetName: '',
      importQueue: [],
      storageInfo: {
        persisted: false,
        persistMessage: '尚未检测',
        usageText: '0 B',
        quotaText: '0 B'
      },
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine !== false : true,
      pwaInfo: {
        installed: false,
        hasServiceWorker: false,
        isPWACapable: false
      },
      navItems: [
        { id: 'home', label: '概览' },
        { id: 'import', label: '导入' },
        { id: 'reader', label: '阅读' },
        { id: 'search', label: '搜索' },
        { id: 'settings', label: '设置' }
      ]
    }
  },
  computed: {
    filteredDocs() {
      const keyword = String(this.listKeyword || '').trim().toLowerCase()
      return this.docs.filter((doc) => {
        const typeMatched = this.typeFilter === 'all' || doc.type === this.typeFilter
        if (!typeMatched) return false
        if (!keyword) return true
        const text = `${doc.name} ${doc.contentText || ''}`.toLowerCase()
        return text.includes(keyword)
      })
    },
    activeDoc() {
      return this.docs.find((doc) => doc.id === this.activeDocId) || null
    },
    activeSheet() {
      const fallback = { headers: [], rows: [] }
      if (!this.activeDoc || this.activeDoc.type !== 'xlsx') return fallback
      return this.activeDoc.sheets?.find((sheet) => sheet.name === this.activeSheetName) || this.activeDoc.sheets?.[0] || fallback
    },
    searchResults() {
      const keyword = String(this.searchKeyword || '').trim().toLowerCase()
      if (!keyword) return []
      return this.docs
        .map((doc) => {
          const haystack = `${doc.name}\n${doc.contentText || ''}`
          const lower = haystack.toLowerCase()
          const index = lower.indexOf(keyword)
          if (index === -1) return null
          const start = Math.max(0, index - 28)
          const end = Math.min(haystack.length, index + keyword.length + 52)
          return {
            doc,
            index,
            snippet: haystack.slice(start, end).replace(/\s+/g, ' ').trim()
          }
        })
        .filter(Boolean)
    },
    homeSearchResults() {
      return this.searchResults.slice(0, 5)
    },
    docCounts() {
      return this.docs.reduce((acc, doc) => {
        acc[doc.type] += 1
        return acc
      }, { docx: 0, xlsx: 0 })
    },
    pwaSummary() {
      return getPWAStatusText(this.pwaInfo)
    }
  },
  async mounted() {
    this.pwaInfo = detectPWA()
    this.handleOnlineStatus()
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnlineStatus)
      window.addEventListener('offline', this.handleOnlineStatus)
    }
    await this.reloadDocs()
    await this.refreshStorageInfo()
  },
  beforeUnmount() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnlineStatus)
      window.removeEventListener('offline', this.handleOnlineStatus)
    }
  },
  methods: {
    handleOnlineStatus() {
      this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine !== false : true
    },
    async reloadDocs() {
      this.docs = await listKnowledgeDocs()
      const lastOpenedId = await getKnowledgeMeta('lastOpenedDocId')
      if (this.docs.length === 0) {
        this.activeDocId = null
        this.activeSheetName = ''
        return
      }
      const preferredId = this.docs.some((doc) => doc.id === lastOpenedId) ? lastOpenedId : this.docs[0].id
      this.activeDocId = preferredId
      this.syncActiveSheet()
    },
    syncActiveSheet() {
      if (this.activeDoc?.type === 'xlsx') {
        this.activeSheetName = this.activeDoc.sheets?.[0]?.name || ''
      } else {
        this.activeSheetName = ''
      }
    },
    openFilePicker() {
      this.workspaceView = 'import'
      this.$refs.fileInput?.click()
    },
    async onFileChange(event) {
      const files = Array.from(event?.target?.files || [])
      event.target.value = ''
      if (!files.length) return
      await this.importFiles(files)
    },
    async importFiles(files) {
      this.workspaceView = 'import'
      const queuedItems = files.map((file, index) => ({
        key: `${file.name}-${file.lastModified}-${index}`,
        name: file.name,
        status: '等待中',
        state: 'idle',
        detail: `${this.formatBytes(file.size)}`
      }))
      this.importQueue = [...queuedItems, ...this.importQueue].slice(0, 20)

      const importedDocs = []
      for (const file of files) {
        const queueItem = this.importQueue.find((item) => item.key.startsWith(`${file.name}-${file.lastModified}`))
        if (queueItem) {
          queueItem.status = '解析中'
          queueItem.state = 'loading'
          queueItem.detail = `${this.formatBytes(file.size)} · 正在读取`
        }

        try {
          if (file.size > MAX_FILE_SIZE) {
            throw new Error('文件超过 50 MB 限制')
          }
          const doc = await this.parseFile(file)
          importedDocs.push(doc)
          if (queueItem) {
            queueItem.status = '成功'
            queueItem.state = 'done'
            queueItem.detail = `${doc.type.toUpperCase()} · 已写入本地数据库`
          }
        } catch (error) {
          if (queueItem) {
            queueItem.status = '失败'
            queueItem.state = 'error'
            queueItem.detail = error?.message || '解析失败'
          }
        }
      }

      if (importedDocs.length > 0) {
        await saveKnowledgeDocs(importedDocs)
        await this.reloadDocs()
        await this.refreshStorageInfo()
        if (this.docs[0]) {
          this.openDoc(this.docs[0])
          this.workspaceView = 'reader'
        }
      }
    },
    async parseFile(file) {
      const lowerName = String(file.name || '').toLowerCase()
      if (lowerName.endsWith('.docx')) {
        return this.parseDocx(file)
      }
      if (lowerName.endsWith('.xlsx')) {
        return this.parseXlsx(file)
      }
      throw new Error('仅支持 .docx 和 .xlsx')
    },
    async parseDocx(file) {
      const arrayBuffer = await file.arrayBuffer()
      const [{ value: htmlResult, messages }, { value: textResult }] = await Promise.all([
        mammoth.convertToHtml({ arrayBuffer }),
        mammoth.extractRawText({ arrayBuffer })
      ])
      return {
        name: file.name,
        type: 'docx',
        size: file.size,
        contentHtml: htmlResult || '<p>文档为空</p>',
        contentText: String(textResult || stripHtml(htmlResult || '')).trim(),
        sheets: [],
        parseWarnings: Array.isArray(messages) ? messages.map((item) => item.message).filter(Boolean) : []
      }
    },
    async parseXlsx(file) {
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      const sheets = workbook.SheetNames.map((name) => {
        const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[name], {
          header: 1,
          raw: false,
          defval: ''
        })
        const rows = toSheetRows(rawRows)
        const [headers = [], ...bodyRows] = rows
        return {
          name,
          headers,
          rows: bodyRows
        }
      })
      const contentText = sheets
        .map((sheet) => [sheet.name, ...sheet.headers, ...sheet.rows.flat()].join(' '))
        .join('\n')
      return {
        name: file.name,
        type: 'xlsx',
        size: file.size,
        contentHtml: '',
        contentText,
        sheets,
        parseWarnings: []
      }
    },
    async openDoc(doc) {
      this.activeDocId = doc.id
      this.syncActiveSheet()
      await setKnowledgeMeta('lastOpenedDocId', doc.id)
      if (this.workspaceView === 'search' || this.workspaceView === 'import') {
        this.workspaceView = 'reader'
      }
    },
    openSearchResult(result) {
      this.openDoc(result.doc)
      this.workspaceView = 'reader'
    },
    async deleteDoc(doc) {
      if (!doc) return
      const confirmed = typeof window === 'undefined'
        ? true
        : window.confirm(`确定删除文档“${doc.name}”吗？`)
      if (!confirmed) return
      await removeKnowledgeDoc(doc.id)
      await this.reloadDocs()
      await this.refreshStorageInfo()
      if (this.workspaceView === 'reader' && !this.activeDoc) {
        this.workspaceView = 'home'
      }
    },
    async clearAllDocs() {
      const confirmed = typeof window === 'undefined'
        ? true
        : window.confirm('确定清空全部知识库文档吗？该操作不可撤销。')
      if (!confirmed) return
      await clearKnowledgeDocs()
      await setKnowledgeMeta('lastOpenedDocId', null)
      this.importQueue = []
      await this.reloadDocs()
      await this.refreshStorageInfo()
      this.workspaceView = 'home'
    },
    async requestPersistentStorage() {
      if (!navigator?.storage?.persist) {
        this.storageInfo.persistMessage = '当前浏览器不支持 persist()'
        return
      }
      const granted = await navigator.storage.persist()
      this.storageInfo.persisted = granted
      this.storageInfo.persistMessage = granted ? '浏览器已授予持久化存储' : '浏览器未授予持久化存储'
      await this.refreshStorageInfo()
    },
    async refreshStorageInfo() {
      const next = {
        persisted: false,
        persistMessage: '当前浏览器不支持 storage API',
        usageText: '未知',
        quotaText: '未知'
      }

      if (navigator?.storage?.persisted) {
        try {
          next.persisted = await navigator.storage.persisted()
          next.persistMessage = next.persisted ? '浏览器已标记为持久化' : '尚未获得持久化存储'
        } catch (_error) {
          next.persistMessage = '无法读取持久化状态'
        }
      }

      if (navigator?.storage?.estimate) {
        try {
          const estimate = await navigator.storage.estimate()
          next.usageText = this.formatBytes(estimate?.usage || 0)
          next.quotaText = this.formatBytes(estimate?.quota || 0)
        } catch (_error) {
          next.usageText = '无法估算'
          next.quotaText = '无法估算'
        }
      }

      this.storageInfo = next
    },
    getDocPreview(doc) {
      const source = String(doc?.contentText || '').replace(/\s+/g, ' ').trim()
      return source ? `${source.slice(0, 88)}${source.length > 88 ? '...' : ''}` : '暂无预览'
    },
    formatBytes(value) {
      const size = Number(value || 0)
      if (!Number.isFinite(size) || size <= 0) return '0 B'
      const units = ['B', 'KB', 'MB', 'GB']
      const level = Math.min(units.length - 1, Math.floor(Math.log(size) / Math.log(1024)))
      const amount = size / (1024 ** level)
      return `${amount.toFixed(amount >= 10 || level === 0 ? 0 : 1)} ${units[level]}`
    },
    formatDate(value) {
      if (!value) return '未知时间'
      return new Date(value).toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    },
    formatCell(cell) {
      const text = cell == null ? '' : String(cell)
      return text.length > 60 ? `${text.slice(0, 60)}...` : text
    }
  }
}
</script>

<style scoped>
.kb-page {
  display: grid;
  gap: 18px;
  color: var(--app-text);
}

.kb-hero,
.kb-toolbar,
.kb-sidebar,
.kb-main {
  border-radius: 22px;
}

.kb-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) 360px;
  gap: 18px;
  padding: 24px 26px;
  background:
    radial-gradient(circle at top left, rgba(14, 165, 233, 0.22), transparent 30%),
    radial-gradient(circle at 85% 15%, rgba(16, 185, 129, 0.16), transparent 26%),
    linear-gradient(135deg, #0f172a 0%, #082f49 56%, #0b3b36 100%);
  color: #f8fafc;
  box-shadow: 0 20px 54px rgba(8, 47, 73, 0.24);
}

.hero-kicker,
.section-kicker {
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 11px;
  font-weight: 800;
}

.hero-copy h1 {
  margin-top: 8px;
  font-size: 38px;
  line-height: 1.08;
}

.hero-text {
  margin-top: 14px;
  max-width: 760px;
  color: rgba(248, 250, 252, 0.78);
  line-height: 1.75;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 18px;
}

.hero-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(18px);
}

.hero-stats article {
  padding: 14px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.08);
}

.hero-stats span {
  font-size: 12px;
  color: rgba(248, 250, 252, 0.72);
}

.hero-stats strong {
  display: block;
  margin-top: 6px;
  font-size: 18px;
}

.kb-toolbar,
.kb-sidebar,
.kb-main {
  padding: 18px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--app-card) 92%, #ffffff) 0%, var(--app-card-elevated) 100%);
  box-shadow: var(--app-soft-shadow);
}

.kb-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.toolbar-left,
.toolbar-right,
.section-actions,
.current-doc-actions,
.sheet-tab-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.toolbar-search {
  min-width: 220px;
}

.nav-chip {
  border: 1px solid var(--app-border);
  border-radius: 999px;
  background: transparent;
  color: var(--app-text-secondary);
  padding: 8px 14px;
  font-weight: 700;
  cursor: pointer;
}

.nav-chip.active {
  border-color: #0f766e;
  background: rgba(15, 118, 110, 0.1);
  color: #115e59;
}

.kb-layout {
  display: grid;
  grid-template-columns: 340px minmax(0, 1fr);
  gap: 18px;
}

.kb-sidebar,
.kb-main,
.content-section {
  min-height: 0;
}

.sidebar-head,
.section-head,
.current-doc-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.section-head.small {
  margin-bottom: 12px;
}

.sidebar-head h2,
.section-head h2,
.section-head h3 {
  margin-top: 4px;
}

.sidebar-controls,
.doc-list,
.content-section,
.queue-list,
.search-result-list {
  display: grid;
  gap: 12px;
}

.field {
  display: grid;
  gap: 6px;
}

.field span {
  font-size: 13px;
  color: var(--app-text-secondary);
}

.empty-state {
  display: grid;
  gap: 8px;
  place-items: center;
  min-height: 220px;
  border: 1px dashed var(--app-border);
  border-radius: 18px;
  color: var(--app-text-secondary);
  text-align: center;
  padding: 24px;
}

.empty-state.compact {
  min-height: 140px;
}

.doc-item,
.search-result {
  width: 100%;
  border: 1px solid var(--app-border);
  border-radius: 18px;
  padding: 14px;
  background: color-mix(in srgb, var(--app-card) 94%, #ffffff);
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  gap: 12px;
  text-align: left;
  cursor: pointer;
  transition: transform 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease;
}

.doc-item:hover,
.doc-item.active,
.search-result:hover {
  border-color: color-mix(in srgb, #0f766e 40%, var(--app-border));
  transform: translateY(-1px);
  box-shadow: 0 12px 24px rgba(15, 118, 110, 0.1);
}

.doc-item-icon {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 800;
  background: #334155;
}

.doc-item-icon.large {
  width: 54px;
  height: 54px;
  border-radius: 16px;
  font-size: 20px;
}

.doc-item-icon.docx {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
}

.doc-item-icon.xlsx {
  background: linear-gradient(135deg, #16a34a, #15803d);
}

.doc-item-body p,
.doc-item-body span,
.summary-card p,
.queue-item p,
.setting-card p,
.setting-card small,
.tips-card li,
.search-result p {
  color: var(--app-text-secondary);
  line-height: 1.65;
}

.summary-grid,
.doc-overview-grid,
.settings-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.doc-overview-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.summary-card,
.overview-card,
.setting-card,
.tips-card,
.queue-item,
.reader-warning {
  border: 1px solid var(--app-border);
  border-radius: 18px;
  background: color-mix(in srgb, var(--app-card) 94%, #ffffff);
  padding: 16px;
}

.summary-card strong {
  display: block;
  margin-top: 8px;
  margin-bottom: 8px;
  font-size: 22px;
}

.queue-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.queue-state {
  border-radius: 999px;
  padding: 5px 10px;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.queue-state.idle {
  background: rgba(148, 163, 184, 0.12);
  color: #475569;
}

.queue-state.loading {
  background: rgba(14, 165, 233, 0.12);
  color: #075985;
}

.queue-state.done {
  background: rgba(22, 163, 74, 0.12);
  color: #166534;
}

.queue-state.error {
  background: rgba(220, 38, 38, 0.12);
  color: #991b1b;
}

.import-dropzone {
  width: 100%;
  border: 1px dashed color-mix(in srgb, #0f766e 36%, var(--app-border));
  border-radius: 22px;
  background: linear-gradient(180deg, rgba(240, 253, 250, 0.7), rgba(255, 255, 255, 0.96));
  padding: 28px;
  text-align: center;
  cursor: pointer;
}

.import-dropzone p {
  margin-top: 8px;
  color: var(--app-text-secondary);
}

.reader-body {
  display: grid;
  gap: 14px;
}

.reader-warning {
  background: rgba(245, 158, 11, 0.08);
  border-color: rgba(245, 158, 11, 0.28);
}

.docx-content {
  border: 1px solid var(--app-border);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.88);
  padding: 18px 20px;
  overflow: auto;
}

.sheet-tab {
  border: 1px solid var(--app-border);
  border-radius: 999px;
  background: transparent;
  padding: 8px 12px;
  cursor: pointer;
}

.sheet-tab.active {
  border-color: #0f766e;
  background: rgba(15, 118, 110, 0.1);
  color: #115e59;
}

.sheet-table-wrap {
  overflow: auto;
  border: 1px solid var(--app-border);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.9);
}

.sheet-table {
  width: 100%;
  min-width: 480px;
  border-collapse: collapse;
}

.sheet-table th,
.sheet-table td {
  padding: 12px 14px;
  text-align: left;
  border-bottom: 1px solid rgba(148, 163, 184, 0.18);
  white-space: nowrap;
}

.sheet-table th {
  background: rgba(15, 118, 110, 0.08);
  font-weight: 800;
}

.search-result {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
}

.doc-table-wrap {
  overflow: auto;
  border: 1px solid var(--app-border);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.9);
}

.doc-table {
  width: 100%;
  min-width: 760px;
  border-collapse: collapse;
}

.doc-table th,
.doc-table td {
  padding: 12px 14px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.18);
  text-align: left;
  white-space: nowrap;
}

.doc-table th {
  background: rgba(15, 118, 110, 0.08);
  font-weight: 800;
}

.actions-cell {
  display: flex;
  gap: 8px;
}

.table-action {
  border: 1px solid var(--app-border);
  border-radius: 999px;
  background: transparent;
  padding: 6px 10px;
  cursor: pointer;
}

.table-action.danger {
  color: #991b1b;
  border-color: rgba(220, 38, 38, 0.24);
  background: rgba(220, 38, 38, 0.06);
}

.search-result span {
  font-size: 12px;
  font-weight: 800;
  color: #0f766e;
}

.tips-card ul {
  margin-top: 10px;
  padding-left: 18px;
}

.sr-only-input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

@media (max-width: 1180px) {
  .kb-hero,
  .kb-layout {
    grid-template-columns: 1fr;
  }

  .summary-grid,
  .doc-overview-grid,
  .settings-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .kb-hero,
  .kb-toolbar,
  .kb-sidebar,
  .kb-main {
    padding: 16px;
  }

  .hero-copy h1 {
    font-size: 30px;
  }

  .kb-toolbar,
  .queue-item,
  .section-head,
  .sidebar-head,
  .current-doc-top {
    flex-direction: column;
    align-items: flex-start;
  }

  .hero-stats {
    grid-template-columns: 1fr 1fr;
  }

  .doc-item,
  .search-result {
    grid-template-columns: 1fr;
  }
}
</style>
