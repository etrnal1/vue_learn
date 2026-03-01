<template>
  <div class="docs-center">
    <div class="docs-header">
      <div class="header-left">
        <h1>📚 文档中心</h1>
        <p v-if="summary" class="stats">
          {{ summary.totalGroups || 0 }} 个文档系列 · {{ summary.total || 0 }} 个版本 · {{ formatSize(summary.totalSize) }}
        </p>
      </div>
      <div class="header-right">
        <div class="toolbar-search">
          <div class="search-box">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索标题、正文、附件..."
              class="search-input"
            />
          </div>
        </div>
        <div class="toolbar-actions">
          <button class="btn btn-primary" @click="syncDocuments" :disabled="syncing">
            {{ syncing ? '同步中...' : '同步扫描文档' }}
          </button>
          <button class="btn" @click="createCustomArticle">新建文章</button>
          <button class="btn" @click="triggerWordUpload">导入 Word</button>
          <button class="btn" @click="triggerExcelUpload">导入 Excel</button>
        </div>
        <p v-if="queueStatus.count > 0" class="queue-tip">
          {{ queueStatus.offline ? '离线写入队列' : '待同步队列' }}：{{ queueStatus.count }} 项
        </p>
        <input ref="wordUploadRef" type="file" class="hidden-input" accept=".doc,.docx" @change="handleWordUpload" />
        <input ref="excelUploadRef" type="file" class="hidden-input" accept=".xls,.xlsx" @change="handleExcelUpload" />
      </div>
    </div>

    <div class="docs-container">
      <div class="docs-sidebar">
        <div class="sidebar-header">
          <h3>{{ isSearching ? '搜索结果' : '文档目录' }}</h3>
          <span class="sidebar-subtitle">
            {{ isSearching ? `${searchSidebarItems.length} 条结果` : `自建 ${customSidebarItems.length} 篇 · 扫描 ${systemSidebarItems.length} 组` }}
          </span>
        </div>

        <div v-if="loading" class="sidebar-loading">正在加载文档...</div>

        <div v-else-if="isSearching && searchSidebarItems.length === 0" class="sidebar-empty">没有找到文档</div>

        <div v-else class="docs-list">
          <template v-if="isSearching">
            <div
              v-for="item in searchSidebarItems"
              :key="item.key"
              class="doc-item"
              :class="{ active: isItemActive(item) }"
              @click="handleSelectItem(item)"
            >
              <div class="doc-icon">📄</div>
              <div class="doc-info">
                <div class="doc-name-row">
                  <span v-if="item.source === 'custom'" class="doc-custom-tag">自建</span>
                  <span v-else class="doc-scan-tag">扫描</span>
                  <div class="doc-name">{{ item.title }}</div>
                </div>
                <div class="doc-meta-row">
                  <span class="doc-meta">{{ item.metaText }}</span>
                </div>
                <div v-if="item.snippet" class="doc-snippet">{{ item.snippet }}</div>
              </div>
            </div>
          </template>
          <template v-else>
            <div class="doc-group">
              <div class="doc-group-title">自建文章</div>
              <div v-if="customSidebarItems.length === 0" class="group-empty">暂无自建文章</div>
              <div
                v-for="item in customSidebarItems"
                :key="item.key"
                class="doc-item"
                :class="{ active: isItemActive(item) }"
                @click="handleSelectItem(item)"
              >
                <div class="doc-icon">📝</div>
                <div class="doc-info">
                  <div class="doc-name-row">
                    <span class="doc-custom-tag">自建</span>
                    <div class="doc-name">{{ item.title }}</div>
                  </div>
                  <div class="doc-meta-row">
                    <span class="doc-meta">{{ item.metaText }}</span>
                    <span v-if="item.typeLabel" class="version-count">{{ item.typeLabel }}</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="doc-group">
              <div class="doc-group-title">扫描文档</div>
              <div v-if="systemSidebarItems.length === 0" class="group-empty">暂无扫描文档</div>
              <div
                v-for="item in systemSidebarItems"
                :key="item.key"
                class="doc-item"
                :class="{ active: isItemActive(item) }"
                @click="handleSelectItem(item)"
              >
                <div class="doc-icon">📄</div>
                <div class="doc-info">
                  <div class="doc-name-row">
                    <span v-if="item.step" class="doc-step">{{ item.step }}</span>
                    <div class="doc-name">{{ item.title }}</div>
                  </div>
                  <div class="doc-meta-row">
                    <span class="doc-meta">{{ item.metaText }}</span>
                    <span v-if="item.versionsCount > 1" class="version-count">{{ item.versionsCount }} 个版本</span>
                  </div>
                  <div v-if="item.snippet" class="doc-snippet">{{ item.snippet }}</div>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>

      <div class="docs-content">
        <div v-if="!selectedDocName && !isSelectedCustomDoc" class="content-empty">
          <p>👈 请从左侧选择一个文档开始阅读</p>
        </div>

        <div v-else-if="contentLoading" class="content-loading">正在加载文档内容...</div>

        <div v-else-if="contentError" class="content-error">
          <p>❌ {{ contentError }}</p>
          <button class="btn btn-sm" @click="loadDocContent">重试</button>
        </div>

        <div v-else class="markdown-content">
          <div class="content-main">
            <div class="content-headline">
              <h2>{{ selectedDocTitle || selectedDocName.replace('.md', '') }}</h2>
              <div class="headline-actions">
                <button v-if="isSelectedCustomDoc" class="btn btn-sm" @click="customEditMode = !customEditMode">
                  {{ customEditMode ? '完成编辑' : '编辑文章' }}
                </button>
                <button v-if="isSelectedCustomDoc" class="btn btn-sm" @click="removeCustomArticle">删除文章</button>
                <button v-if="isSelectedCustomDoc" class="btn btn-sm" @click="triggerAttachmentUpload">添加附件</button>
                <button v-if="isSelectedCustomDoc" class="btn btn-sm" @click="triggerImageUpload">上传图片</button>
                <span class="version-badge">{{ selectedDocVersionLabel || 'latest' }}</span>
                <select
                  v-if="availableVersions.length > 1 && !isSelectedCustomDoc"
                  v-model="selectedDocName"
                  class="version-select"
                  @change="loadDocContent"
                >
                  <option v-for="ver in availableVersions" :key="ver.filename" :value="ver.filename">
                    {{ ver.versionLabel }} · {{ ver.filename }}
                  </option>
                </select>
              </div>
            </div>

            <div v-if="isSelectedCustomDoc && customEditMode" class="custom-editor">
              <label class="editor-field">
                <span>文章标题</span>
                <input v-model.trim="selectedCustomDoc.title" class="search-input" placeholder="输入文章标题" />
              </label>
              <label v-if="selectedCustomDoc.type !== 'excel'" class="editor-field">
                <span>正文内容（Markdown/文本）</span>
                <textarea
                  v-model="selectedCustomDoc.content"
                  class="content-editor"
                  rows="10"
                  placeholder="输入正文内容，支持 Markdown"
                ></textarea>
              </label>
              <p v-else class="editor-tip">Excel 预览内容来自上传文件，当前仅支持重新上传覆盖。</p>
              <button class="btn btn-primary btn-sm" @click="saveCustomArticle">保存文章</button>
            </div>

            <div v-if="isSelectedCustomDoc && customMessage" class="custom-message">{{ customMessage }}</div>
            <div class="markdown-body" v-html="renderedHtml"></div>

            <div v-if="isSelectedCustomDoc" class="assets-panel">
              <div v-if="selectedCustomDoc.images?.length" class="asset-block">
                <h3>图片预览</h3>
                <div class="image-grid">
                  <button
                    v-for="img in selectedCustomDoc.images"
                    :key="img.id"
                    type="button"
                    class="image-thumb"
                    @click="previewImageUrl = img.dataUrl"
                  >
                    <img :src="img.dataUrl" :alt="img.name" />
                    <span>{{ img.name }}</span>
                  </button>
                </div>
              </div>
              <div v-if="selectedCustomDoc.attachments?.length" class="asset-block">
                <h3>附件</h3>
                <div class="attachment-list">
                  <a
                    v-for="att in selectedCustomDoc.attachments"
                    :key="att.id"
                    class="attachment-item"
                    :href="att.dataUrl"
                    :download="att.name"
                  >
                    {{ att.name }} · {{ att.sizeLabel }}
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div v-if="tableOfContents.length > 0" class="toc-panel">
            <div class="toc-title">目录</div>
            <div class="toc-list">
              <a
                v-for="(heading, index) in tableOfContents"
                :key="index"
                :href="`#${heading.id}`"
                class="toc-item"
                :class="`toc-level-${heading.level}`"
                @click.prevent="scrollToHeading(heading.id)"
              >
                {{ heading.text }}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
    <input ref="attachmentUploadRef" type="file" class="hidden-input" @change="handleAttachmentUpload" />
    <input ref="imageUploadRef" type="file" class="hidden-input" accept="image/*" multiple @change="handleImageUpload" />
    <div v-if="previewImageUrl" class="image-modal" @click="previewImageUrl = ''">
      <img :src="previewImageUrl" alt="预览图片" @click.stop />
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { marked } from 'marked'
import { api } from '../utils/api'
import * as XLSX from 'xlsx'

const CUSTOM_DOCS_KEY = 'documentation_center_custom_docs_v1'

function createId(prefix = 'doc') {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`
}

function humanBytes(bytes) {
  const size = Number(bytes || 0)
  if (size <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const idx = Math.min(units.length - 1, Math.floor(Math.log(size) / Math.log(1024)))
  const value = size / (1024 ** idx)
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[idx]}`
}

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error || new Error('读取文件失败'))
    reader.readAsDataURL(file)
  })
}

function readAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error || new Error('读取文件失败'))
    reader.readAsArrayBuffer(file)
  })
}

function bumpVersion(versionText) {
  const raw = String(versionText || 'v1.0').replace(/^v/i, '')
  const parts = raw.split('.').map((item) => Number.parseInt(item, 10))
  const major = Number.isFinite(parts[0]) ? parts[0] : 1
  const minor = Number.isFinite(parts[1]) ? parts[1] : 0
  return `v${major}.${minor + 1}`
}

function slugifyHeading(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^\w\u4e00-\u9fa5\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

function buildHeadingData(markdown) {
  const headings = []
  const used = new Map()
  const lines = String(markdown || '').split('\n')

  for (const line of lines) {
    const match = line.match(/^(#{1,3})\s+(.+)$/)
    if (!match) continue

    const level = match[1].length
    const text = match[2].trim()
    const base = slugifyHeading(text) || 'heading'
    const count = (used.get(base) || 0) + 1
    used.set(base, count)
    const id = count > 1 ? `${base}-${count}` : base

    headings.push({ level, text, id })
  }

  return headings
}

export default {
  name: 'DocumentationCenter',
  setup() {
    const docsList = ref([])
    const docGroups = ref([])
    const customDocs = ref([])
    const selectedDocName = ref(null)
    const selectedDocId = ref(null)
    const selectedCustomDocId = ref(null)
    const selectedDocTitle = ref('')
    const selectedDocVersionLabel = ref('')
    const selectedDocContent = ref('')
    const customEditMode = ref(false)
    const customMessage = ref('')
    const previewImageUrl = ref('')
    const searchQuery = ref('')
    const searchResults = ref([])
    const loading = ref(false)
    const contentLoading = ref(false)
    const contentError = ref(null)
    const syncing = ref(false)
    const searching = ref(false)
    const tableOfContents = ref([])
    const summary = ref(null)
    const queueStatus = ref({ count: 0, offline: false, flushing: false })
    const wordUploadRef = ref(null)
    const excelUploadRef = ref(null)
    const attachmentUploadRef = ref(null)
    const imageUploadRef = ref(null)

    let searchTimer = null
    let stopQueueWatch = null

    function formatSize(bytes) {
      if (!bytes) return '0 B'
      const k = 1024
      const sizes = ['B', 'KB', 'MB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return Math.round(bytes / Math.pow(k, i)) + ' ' + sizes[i]
    }
    function formatDateTime(ts) {
      if (!ts) return '-'
      const date = new Date(ts)
      if (Number.isNaN(date.getTime())) return '-'
      return date.toLocaleString('zh-CN', { hour12: false })
    }

    const orderedGroups = computed(() => docGroups.value || [])

    const isSearching = computed(() => searchQuery.value.trim().length > 0)
    const isSelectedCustomDoc = computed(() => Boolean(selectedCustomDocId.value))
    const selectedCustomDoc = computed(() => customDocs.value.find((item) => item.id === selectedCustomDocId.value) || null)

    const selectedGroup = computed(() => {
      if (!selectedDocId.value) return null
      return orderedGroups.value.find((g) => g.docId === selectedDocId.value) || null
    })

    const availableVersions = computed(() => selectedGroup.value?.versions || [])

    const searchSidebarItems = computed(() => {
      if (isSearching.value) {
        const remote = searchResults.value.map((item, idx) => ({
          key: `search-${idx}-${item.filename}`,
          source: 'system',
          selectKey: `system:${item.filename}`,
          filename: item.filename,
          title: item.title,
          docId: item.docId,
          versionLabel: item.versionLabel,
          sizeKB: item.sizeKB,
          metaText: `${item.versionLabel || 'latest'} · ${item.sizeKB || '-'} KB`,
          snippet: item.snippet,
          versionsCount: 1
        }))
        const keyword = searchQuery.value.trim().toLowerCase()
        const local = customDocs.value
          .filter((item) => {
            const corpus = `${item.title} ${item.content || ''}`.toLowerCase()
            return keyword && corpus.includes(keyword)
          })
          .map((item) => ({
            key: `custom-search-${item.id}`,
            source: 'custom',
            selectKey: `custom:${item.id}`,
            filename: `custom:${item.id}`,
            title: item.title,
            docId: item.id,
            versionLabel: item.versionLabel || 'v1.0',
            sizeKB: Math.max(1, Math.round((String(item.content || '').length || 1) / 1024)),
            metaText: `${item.versionLabel || 'v1.0'} · ${formatDateTime(item.updatedAt)}`,
            snippet: String(item.content || '').replace(/\s+/g, ' ').trim().slice(0, 90),
            versionsCount: 1
          }))
        return [...local, ...remote]
      }
      return []
    })

    const systemSidebarItems = computed(() => {
      return orderedGroups.value.map((group, index) => ({
        key: `group-${group.docId}`,
        source: 'system',
        selectKey: `system:${group.latestFilename}`,
        filename: group.latestFilename,
        title: group.title,
        docId: group.docId,
        versionLabel: group.latestVersion,
        sizeKB: group.versions?.[0]?.sizeKB,
        metaText: `${group.latestVersion || 'latest'} · ${group.versions?.[0]?.sizeKB || '-'} KB`,
        versionsCount: group.versions?.length || 1,
        step: index + 1
      }))
    })
    const customSidebarItems = computed(() => {
      return customDocs.value.map((item) => ({
        key: `custom-${item.id}`,
        source: 'custom',
        selectKey: `custom:${item.id}`,
        filename: `custom:${item.id}`,
        title: item.title,
        docId: item.id,
        versionLabel: item.versionLabel || 'v1.0',
        sizeKB: Math.max(1, Math.round((String(item.content || '').length || 1) / 1024)),
        metaText: `${item.versionLabel || 'v1.0'} · ${formatDateTime(item.updatedAt)}`,
        typeLabel: item.type === 'word' ? 'Word' : item.type === 'excel' ? 'Excel' : '文章',
        versionsCount: 1
      }))
    })

    const selectedSidebarKey = computed(() => {
      if (selectedCustomDocId.value) return `custom:${selectedCustomDocId.value}`
      if (selectedDocName.value) return `system:${selectedDocName.value}`
      return ''
    })
    function isItemActive(item) {
      return String(selectedSidebarKey.value) === String(item?.selectKey || '')
    }

    function isQueuedPayload(payload) {
      return Boolean(payload?.offlineQueued || payload?.queued)
    }

    function saveCustomDocs() {
      try {
        localStorage.setItem(CUSTOM_DOCS_KEY, JSON.stringify(customDocs.value))
      } catch (error) {
        console.error('保存自建文档失败:', error)
      }
    }

    function loadCustomDocs() {
      try {
        const raw = localStorage.getItem(CUSTOM_DOCS_KEY)
        if (!raw) return
        const parsed = JSON.parse(raw)
        customDocs.value = Array.isArray(parsed) ? parsed : []
      } catch (error) {
        console.error('加载自建文档失败:', error)
        customDocs.value = []
      }
    }

    function updateCustomDocView(doc) {
      selectedDocTitle.value = doc?.title || '自建文章'
      selectedDocVersionLabel.value = doc?.type === 'word' ? 'Word 预览' : doc?.type === 'excel' ? 'Excel 预览' : '自建文章'
      selectedDocContent.value = doc?.content || ''
      tableOfContents.value = doc?.type === 'excel' ? [] : buildHeadingData(doc?.content || '')
    }

    async function loadDocsList() {
      loading.value = true
      try {
        const response = await api.docs.list()
        docsList.value = response.files || []
        docGroups.value = response.groups || []
        summary.value = response.summary || null

        if (!selectedDocName.value && !selectedCustomDocId.value && (response.groups || []).length > 0) {
          const firstGroup = response.groups[0]
          if (firstGroup?.latestFilename) {
            selectedDocId.value = firstGroup.docId
            selectedDocName.value = firstGroup.latestFilename
            await loadDocContent()
          }
        }
      } catch (error) {
        console.error('加载文档列表失败:', error)
      } finally {
        loading.value = false
      }
    }

    async function handleSelectItem(item) {
      if (item.source === 'custom') {
        selectedCustomDocId.value = item.docId
        selectedDocId.value = null
        selectedDocName.value = null
        contentError.value = null
        contentLoading.value = false
        const doc = customDocs.value.find((entry) => entry.id === item.docId)
        updateCustomDocView(doc)
        return
      }
      selectedCustomDocId.value = null
      selectedDocId.value = item.docId || null
      selectedDocName.value = item.filename
      selectedDocContent.value = ''
      tableOfContents.value = []
      contentError.value = null
      await loadDocContent()
    }

    async function loadDocContent() {
      if (!selectedDocName.value) return

      contentLoading.value = true
      contentError.value = null

      try {
        const response = await api.docs.getContent(selectedDocName.value)
        selectedDocContent.value = response.content || ''
        selectedDocTitle.value = response.title || selectedDocName.value.replace('.md', '')
        selectedDocVersionLabel.value = response.versionLabel || 'latest'

        if (response.docId) {
          selectedDocId.value = response.docId
        }

        tableOfContents.value = buildHeadingData(response.content)
      } catch (error) {
        console.error('加载文档内容失败:', error)
        contentError.value = error.message || '加载失败'
      } finally {
        contentLoading.value = false
      }
    }

    function ensureCustomDocSelected() {
      if (selectedCustomDoc.value) return selectedCustomDoc.value
      const now = Date.now()
      const doc = {
        id: createId('custom'),
        title: `我的文章 ${new Date(now).toLocaleDateString('zh-CN')}`,
        type: 'markdown',
        versionLabel: 'v1.0',
        content: '',
        htmlContent: '',
        excelHeaders: [],
        excelRows: [],
        attachments: [],
        images: [],
        createdAt: now,
        updatedAt: now
      }
      customDocs.value.unshift(doc)
      saveCustomDocs()
      selectedCustomDocId.value = doc.id
      selectedDocId.value = null
      selectedDocName.value = null
      updateCustomDocView(doc)
      customEditMode.value = true
      return doc
    }

    function createCustomArticle() {
      ensureCustomDocSelected()
      customMessage.value = '已创建新文章，请输入标题和正文'
    }

    function saveCustomArticle() {
      const doc = selectedCustomDoc.value
      if (!doc) return
      doc.versionLabel = bumpVersion(doc.versionLabel)
      doc.updatedAt = Date.now()
      saveCustomDocs()
      updateCustomDocView(doc)
      customEditMode.value = false
      customMessage.value = '文章已保存'
    }

    function removeCustomArticle() {
      const doc = selectedCustomDoc.value
      if (!doc) return
      if (!window.confirm(`确认删除文章「${doc.title}」吗？`)) return
      customDocs.value = customDocs.value.filter((item) => item.id !== doc.id)
      saveCustomDocs()
      selectedCustomDocId.value = null
      selectedDocTitle.value = ''
      selectedDocVersionLabel.value = ''
      selectedDocContent.value = ''
      tableOfContents.value = []
      customMessage.value = '文章已删除'
    }

    function triggerWordUpload() {
      wordUploadRef.value?.click()
    }

    function triggerExcelUpload() {
      excelUploadRef.value?.click()
    }

    function triggerAttachmentUpload() {
      ensureCustomDocSelected()
      attachmentUploadRef.value?.click()
    }

    function triggerImageUpload() {
      ensureCustomDocSelected()
      imageUploadRef.value?.click()
    }

    async function handleWordUpload(event) {
      try {
        const file = event?.target?.files?.[0]
        event.target.value = ''
        if (!file) return
        const dataUrl = await readAsDataURL(file)
        const base64 = String(dataUrl).split(',')[1] || ''
        const result = await api.wiki.importDocument({
          fileName: file.name,
          contentBase64: base64
        })
        const now = Date.now()
        const doc = {
          id: createId('word'),
          title: String(result?.title || file.name.replace(/\.[^.]+$/, '')),
          type: 'word',
          versionLabel: 'v1.0',
          content: String(result?.content || ''),
          htmlContent: String(result?.content || '').trim().startsWith('<') ? String(result?.content || '') : '',
          excelHeaders: [],
          excelRows: [],
          attachments: [],
          images: [],
          createdAt: now,
          updatedAt: now
        }
        customDocs.value.unshift(doc)
        saveCustomDocs()
        selectedCustomDocId.value = doc.id
        selectedDocName.value = null
        selectedDocId.value = null
        customEditMode.value = false
        updateCustomDocView(doc)
        customMessage.value = 'Word 文档已导入并可预览'
      } catch (error) {
        customMessage.value = `Word 导入失败：${error?.message || '未知错误'}`
      }
    }

    async function handleExcelUpload(event) {
      try {
        const file = event?.target?.files?.[0]
        event.target.value = ''
        if (!file) return
        const buffer = await readAsArrayBuffer(file)
        const workbook = XLSX.read(buffer, { type: 'array' })
        const firstName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstName]
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
        const normalized = Array.isArray(rows) ? rows : []
        const headers = (normalized[0] || []).map((item) => String(item ?? ''))
        const body = normalized.slice(1).map((row) =>
          headers.map((_, index) => String((row || [])[index] ?? ''))
        )
        const now = Date.now()
        const doc = {
          id: createId('excel'),
          title: file.name.replace(/\.[^.]+$/, ''),
          type: 'excel',
          versionLabel: 'v1.0',
          content: '',
          htmlContent: '',
          excelHeaders: headers,
          excelRows: body,
          attachments: [],
          images: [],
          createdAt: now,
          updatedAt: now
        }
        customDocs.value.unshift(doc)
        saveCustomDocs()
        selectedCustomDocId.value = doc.id
        selectedDocName.value = null
        selectedDocId.value = null
        customEditMode.value = false
        updateCustomDocView(doc)
        customMessage.value = 'Excel 文件已导入并可预览'
      } catch (error) {
        customMessage.value = `Excel 导入失败：${error?.message || '未知错误'}`
      }
    }

    async function handleAttachmentUpload(event) {
      try {
        const files = Array.from(event?.target?.files || [])
        event.target.value = ''
        if (files.length === 0) return
        const doc = ensureCustomDocSelected()
        const loaded = await Promise.all(files.map(async (file) => ({
          id: createId('att'),
          name: file.name,
          size: file.size,
          sizeLabel: humanBytes(file.size),
          mimeType: file.type || 'application/octet-stream',
          dataUrl: await readAsDataURL(file)
        })))
        doc.attachments = [...(doc.attachments || []), ...loaded]
        doc.updatedAt = Date.now()
        saveCustomDocs()
        customMessage.value = `已添加 ${loaded.length} 个附件`
      } catch (error) {
        customMessage.value = `附件上传失败：${error?.message || '未知错误'}`
      }
    }

    async function handleImageUpload(event) {
      try {
        const files = Array.from(event?.target?.files || [])
        event.target.value = ''
        if (files.length === 0) return
        const imageFiles = files.filter((file) => String(file.type || '').startsWith('image/'))
        if (imageFiles.length === 0) return
        const doc = ensureCustomDocSelected()
        const loaded = await Promise.all(imageFiles.map(async (file) => ({
          id: createId('img'),
          name: file.name,
          size: file.size,
          dataUrl: await readAsDataURL(file)
        })))
        doc.images = [...(doc.images || []), ...loaded]
        doc.updatedAt = Date.now()
        saveCustomDocs()
        customMessage.value = `已上传 ${loaded.length} 张图片`
      } catch (error) {
        customMessage.value = `图片上传失败：${error?.message || '未知错误'}`
      }
    }

    function scrollToHeading(id) {
      const element = document.getElementById(id)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }

    async function searchDocuments(query) {
      const keyword = String(query || '').trim()
      if (!keyword) {
        searchResults.value = []
        return
      }

      searching.value = true
      try {
        const response = await api.docs.search(keyword, 60)
        searchResults.value = response.matches || []
      } catch (error) {
        console.error('搜索失败:', error)
      } finally {
        searching.value = false
      }
    }

    async function syncDocuments() {
      syncing.value = true
      try {
        const response = await api.docs.sync()
        if (isQueuedPayload(response)) {
          customMessage.value = '当前离线，已加入同步队列，恢复网络后自动执行'
          return
        }
        docsList.value = response.files || []
        docGroups.value = response.groups || []
        summary.value = response.summary || null

        if (searchQuery.value.trim()) {
          await searchDocuments(searchQuery.value)
        }
      } catch (error) {
        console.error('同步失败:', error)
      } finally {
        syncing.value = false
      }
    }

    const renderedHtml = computed(() => {
      if (isSelectedCustomDoc.value) {
        const doc = selectedCustomDoc.value
        if (!doc) return ''
        if (doc.type === 'excel') {
          const headers = Array.isArray(doc.excelHeaders) ? doc.excelHeaders : []
          const rows = Array.isArray(doc.excelRows) ? doc.excelRows : []
          const headHtml = headers.map((item) => `<th>${String(item || '')}</th>`).join('')
          const bodyHtml = rows
            .map((row) => `<tr>${row.map((cell) => `<td>${String(cell || '')}</td>`).join('')}</tr>`)
            .join('')
          return `<div class="excel-preview"><table><thead><tr>${headHtml}</tr></thead><tbody>${bodyHtml}</tbody></table></div>`
        }
        if (doc.htmlContent) {
          return doc.htmlContent
        }
        if (!doc.content) return ''
      } else if (!selectedDocContent.value) {
        return ''
      }

      try {
        marked.setOptions({ breaks: true, gfm: true })

        const markdownContent = isSelectedCustomDoc.value ? String(selectedCustomDoc.value?.content || '') : selectedDocContent.value
        const headings = buildHeadingData(markdownContent)
        let headingIndex = 0
        const renderer = new marked.Renderer()

        renderer.heading = (args) => {
          const level = args.depth
          const text = args.text
          const heading = headings[headingIndex]
          const id = heading?.id || `${slugifyHeading(text)}-${headingIndex + 1}`
          headingIndex += 1
          return `<h${level} id="${id}">${text}</h${level}>`
        }

        renderer.codespan = (args) => `<code class="inline-code">${args.text}</code>`
        return marked(markdownContent, { renderer })
      } catch (error) {
        console.error('渲染 markdown 失败:', error)
        return '<p>文档渲染失败</p>'
      }
    })

    watch(searchQuery, (value) => {
      if (searchTimer) clearTimeout(searchTimer)

      const keyword = String(value || '').trim()
      if (!keyword) {
        searchResults.value = []
        return
      }

      searchTimer = setTimeout(() => {
        searchDocuments(keyword)
      }, 260)
    })

    onMounted(() => {
      stopQueueWatch = api.onWriteQueueChange((state) => {
        queueStatus.value = {
          count: Number(state?.count) || 0,
          offline: Boolean(state?.offline),
          flushing: Boolean(state?.flushing)
        }
      })
      loadCustomDocs()
      loadDocsList()
    })

    onBeforeUnmount(() => {
      if (searchTimer) {
        clearTimeout(searchTimer)
        searchTimer = null
      }
      if (typeof stopQueueWatch === 'function') {
        stopQueueWatch()
        stopQueueWatch = null
      }
    })

    return {
      docsList,
      customDocs,
      docGroups,
      orderedGroups,
      selectedDocName,
      selectedDocTitle,
      selectedDocVersionLabel,
      selectedDocContent,
      selectedDocId,
      selectedCustomDocId,
      selectedCustomDoc,
      isSelectedCustomDoc,
      customEditMode,
      customMessage,
      previewImageUrl,
      searchQuery,
      searchResults,
      loading,
      contentLoading,
      contentError,
      syncing,
      searching,
      tableOfContents,
      summary,
      queueStatus,
      wordUploadRef,
      excelUploadRef,
      attachmentUploadRef,
      imageUploadRef,
      renderedHtml,
      isSearching,
      searchSidebarItems,
      customSidebarItems,
      systemSidebarItems,
      selectedSidebarKey,
      isItemActive,
      availableVersions,
      formatSize,
      formatDateTime,
      handleSelectItem,
      loadDocContent,
      scrollToHeading,
      syncDocuments,
      createCustomArticle,
      saveCustomArticle,
      removeCustomArticle,
      triggerWordUpload,
      triggerExcelUpload,
      triggerAttachmentUpload,
      triggerImageUpload,
      handleWordUpload,
      handleExcelUpload,
      handleAttachmentUpload,
      handleImageUpload
    }
  }
}
</script>

<style scoped>
.docs-center {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 12px;
  color: var(--app-text);
  background:
    radial-gradient(circle at 92% -12%, color-mix(in srgb, var(--app-primary) 11%, transparent), transparent 46%),
    linear-gradient(180deg, color-mix(in srgb, var(--app-bg, #f8fafc) 92%, #ffffff), var(--app-bg, #f8fafc));
  padding: 6px;
  border-radius: 14px;
}

.docs-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid var(--app-border);
  border-radius: 14px;
  background: color-mix(in srgb, var(--app-card) 92%, #ffffff);
  box-shadow: var(--app-soft-shadow);
}

.header-left h1 {
  margin: 0;
  font-size: 1.15em;
  letter-spacing: 0.02em;
}

.stats {
  margin: 6px 0 0;
  font-size: 0.78em;
  color: var(--app-text-muted);
}

.header-right {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: flex-end;
  flex: 1;
  min-width: 0;
}

.toolbar-search {
  flex: 1;
  min-width: 240px;
}

.toolbar-actions {
  display: inline-flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.queue-tip {
  margin: 0;
  font-size: 0.78em;
  color: var(--app-text-muted);
  padding: 4px 8px;
  border: 1px dashed var(--app-border);
  border-radius: 999px;
  background: var(--app-card-elevated);
}

.search-box {
  min-width: 0;
}

.search-input {
  width: 100%;
  padding: 9px 12px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  font-size: 0.82em;
  background: var(--app-card-elevated);
  color: var(--app-text);
}

.search-input:focus {
  outline: none;
  border-color: color-mix(in srgb, var(--app-primary) 58%, var(--app-border));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--app-primary) 16%, transparent);
}

.docs-container {
  display: flex;
  flex: 1;
  overflow: hidden;
  gap: 12px;
  min-height: 0;
}

.docs-sidebar {
  width: 336px;
  border: 1px solid var(--app-border);
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  background: color-mix(in srgb, var(--app-card) 95%, #ffffff);
  box-shadow: var(--app-soft-shadow);
  overflow: hidden;
}

.sidebar-header {
  padding: 12px 14px;
  border-bottom: 1px solid var(--app-border);
  background: color-mix(in srgb, var(--app-primary) 8%, var(--app-card));
}

.sidebar-header h3 {
  margin: 0;
  font-size: 0.86em;
  font-weight: 700;
  color: var(--app-text-secondary);
}

.sidebar-subtitle {
  margin-top: 4px;
  display: inline-block;
  font-size: 0.74em;
  color: var(--app-text-muted);
}

.docs-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0 14px;
}

.doc-group {
  border-top: 1px dashed color-mix(in srgb, var(--app-border) 88%, transparent);
}

.doc-group:first-child {
  border-top: none;
}

.doc-group-title {
  padding: 9px 14px 6px;
  font-size: 11px;
  font-weight: 700;
  color: var(--app-text-muted);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.group-empty {
  padding: 8px 14px 12px;
  font-size: 12px;
  color: var(--app-text-muted);
}

.doc-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: 3px 8px;
  padding: 10px 10px;
  cursor: pointer;
  border: 1px solid transparent;
  border-radius: 10px;
  transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
}

.doc-item:hover {
  background: color-mix(in srgb, var(--app-primary) 8%, transparent);
  border-color: color-mix(in srgb, var(--app-primary) 28%, transparent);
  transform: translateY(-1px);
}

.doc-item.active {
  background: color-mix(in srgb, var(--app-primary) 14%, transparent);
  border-color: color-mix(in srgb, var(--app-primary) 40%, transparent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--app-primary) 25%, transparent);
}

.doc-icon {
  font-size: 16px;
  line-height: 1;
  margin-top: 3px;
}

.doc-info {
  flex: 1;
  min-width: 0;
}

.doc-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.doc-step {
  min-width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #2563eb;
  color: #fff;
  font-size: 11px;
  line-height: 20px;
  text-align: center;
}

.doc-name {
  font-size: 12px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.doc-meta-row {
  margin-top: 5px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.doc-meta {
  font-size: 11px;
  color: var(--app-text-muted);
}

.version-count {
  font-size: 11px;
  color: color-mix(in srgb, var(--app-primary) 88%, #1d4ed8);
  background: color-mix(in srgb, var(--app-primary) 14%, #dbeafe);
  border-radius: 999px;
  padding: 2px 8px;
}

.doc-snippet {
  margin-top: 6px;
  font-size: 11px;
  color: var(--app-text-secondary);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.sidebar-loading,
.sidebar-empty {
  padding: 20px 16px;
  text-align: center;
  color: var(--app-text-muted);
  font-size: 13px;
}

.docs-content {
  flex: 1;
  display: flex;
  overflow: hidden;
  border: 1px solid var(--app-border);
  border-radius: 14px;
  background: color-mix(in srgb, var(--app-card) 98%, #ffffff);
  box-shadow: var(--app-soft-shadow);
  min-width: 0;
}

.content-empty,
.content-loading,
.content-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  color: var(--text-secondary, #999);
}

.markdown-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.content-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.content-headline {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--app-border);
  background: color-mix(in srgb, var(--app-primary) 7%, var(--app-card));
}

.content-headline h2 {
  margin: 0;
  font-size: 1em;
  letter-spacing: 0.01em;
}

.headline-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.version-badge {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  background: color-mix(in srgb, var(--app-primary) 16%, #e0e7ff);
  color: color-mix(in srgb, var(--app-primary) 78%, #3730a3);
  border: 1px solid color-mix(in srgb, var(--app-primary) 28%, transparent);
}

.version-select {
  min-width: 180px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  padding: 6px 8px;
  font-size: 12px;
  background: var(--app-card-elevated);
  color: var(--app-text);
}

.hidden-input {
  display: none;
}

.doc-custom-tag {
  font-size: 11px;
  line-height: 1;
  padding: 2px 6px;
  border-radius: 999px;
  background: color-mix(in srgb, #22c55e 18%, #dcfce7);
  color: #166534;
  border: 1px solid rgba(22, 101, 52, 0.2);
}

.doc-scan-tag {
  font-size: 11px;
  line-height: 1;
  padding: 2px 6px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--app-primary) 12%, #dbeafe);
  color: #1d4ed8;
  border: 1px solid color-mix(in srgb, var(--app-primary) 30%, transparent);
}

.toc-panel {
  width: 232px;
  border-left: 1px solid var(--app-border);
  padding: 14px 12px;
  overflow-y: auto;
  background: color-mix(in srgb, var(--app-card) 92%, #f8fafc);
}

.toc-title {
  font-size: 11px;
  font-weight: 700;
  margin-bottom: 10px;
  color: var(--app-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.toc-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.toc-item {
  display: block;
  padding: 6px 8px;
  font-size: 11px;
  color: color-mix(in srgb, var(--app-primary) 78%, #3b82f6);
  text-decoration: none;
  border-radius: 8px;
}

.toc-item:hover {
  background: color-mix(in srgb, var(--app-primary) 11%, transparent);
}

.toc-level-2 {
  padding-left: 16px;
}

.toc-level-3 {
  padding-left: 24px;
}

.markdown-body {
  flex: 1;
  padding: 18px 22px;
  overflow-y: auto;
  font-size: 13px;
  line-height: 1.75;
  background: color-mix(in srgb, #ffffff 96%, var(--app-bg));
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4),
.markdown-body :deep(h5),
.markdown-body :deep(h6) {
  margin-top: 24px;
  margin-bottom: 12px;
  font-weight: 600;
}

.markdown-body :deep(h1) {
  font-size: 28px;
  border-bottom: 2px solid var(--border-color, #e5e7eb);
  padding-bottom: 8px;
}

.markdown-body :deep(h2) {
  font-size: 24px;
}

.markdown-body :deep(h3) {
  font-size: 20px;
}

.markdown-body :deep(p) {
  margin: 12px 0;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  margin: 12px 0;
  padding-left: 24px;
}

.markdown-body :deep(code) {
  background: var(--code-bg, #f5f5f5);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 12px;
}

.markdown-body :deep(pre) {
  background: var(--code-bg, #f5f5f5);
  padding: 12px 16px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 12px 0;
}

.markdown-body :deep(pre code) {
  background: transparent;
  padding: 0;
}

.markdown-body :deep(a) {
  color: var(--primary-color, #3b82f6);
  text-decoration: none;
}

.markdown-body :deep(a:hover) {
  text-decoration: underline;
}

.btn {
  padding: 8px 12px;
  border: 1px solid var(--app-border);
  border-radius: 9px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
  background: var(--app-card-elevated);
  color: var(--app-text-secondary);
}

.btn:hover {
  border-color: color-mix(in srgb, var(--app-primary) 42%, var(--app-border));
}

.btn-primary {
  background: var(--app-primary);
  color: var(--app-on-primary);
  border-color: transparent;
  box-shadow: 0 8px 20px color-mix(in srgb, var(--app-primary) 20%, transparent);
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.95;
  transform: translateY(-1px);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 12px;
}

.custom-editor {
  border-bottom: 1px solid var(--app-border);
  padding: 12px 16px;
  display: grid;
  gap: 10px;
  background: color-mix(in srgb, var(--app-primary) 5%, transparent);
}

.editor-field {
  display: grid;
  gap: 6px;
  font-size: 13px;
}

.content-editor {
  width: 100%;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  font-size: 13px;
  padding: 10px 12px;
  resize: vertical;
  background: var(--app-card-elevated);
  color: var(--app-text);
}

.editor-tip {
  margin: 0;
  color: var(--text-secondary, #666);
  font-size: 12px;
}

.custom-message {
  padding: 8px 16px 0;
  color: color-mix(in srgb, var(--app-primary) 78%, #1d4ed8);
  font-size: 12px;
}

.assets-panel {
  border-top: 1px solid var(--app-border);
  padding: 12px 16px 16px;
  display: grid;
  gap: 12px;
  background: color-mix(in srgb, var(--app-card) 96%, #ffffff);
}

.asset-block h3 {
  margin: 0 0 8px;
  font-size: 14px;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 8px;
}

.image-thumb {
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 8px;
  padding: 6px;
  background: #fff;
  text-align: left;
  cursor: pointer;
  display: grid;
  gap: 6px;
}

.image-thumb img {
  width: 100%;
  height: 92px;
  object-fit: cover;
  border-radius: 6px;
}

.image-thumb span {
  font-size: 11px;
  color: var(--text-secondary, #666);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.attachment-list {
  display: grid;
  gap: 6px;
}

.attachment-item {
  font-size: 12px;
  color: var(--primary-color, #3b82f6);
  text-decoration: none;
}

.attachment-item:hover {
  text-decoration: underline;
}

.markdown-body :deep(.excel-preview) {
  overflow: auto;
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 8px;
}

.markdown-body :deep(.excel-preview table) {
  width: 100%;
  border-collapse: collapse;
  min-width: 520px;
}

.markdown-body :deep(.excel-preview th),
.markdown-body :deep(.excel-preview td) {
  border: 1px solid var(--border-color, #e5e7eb);
  padding: 8px 10px;
  font-size: 12px;
  text-align: left;
}

.markdown-body :deep(.excel-preview th) {
  background: #f8fafc;
  font-weight: 600;
}

.image-modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.image-modal img {
  max-width: min(92vw, 1200px);
  max-height: 90vh;
  border-radius: 10px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.35);
}

@media (max-width: 1024px) {
  .toc-panel {
    display: none;
  }

  .markdown-body {
    padding: 14px 16px;
  }

  .docs-sidebar {
    width: 300px;
  }
}

@media (max-width: 768px) {
  .docs-header {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .header-right {
    width: 100%;
    justify-content: stretch;
  }

  .toolbar-search {
    width: 100%;
    min-width: 0;
  }

  .toolbar-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .search-box {
    min-width: 0;
  }

  .docs-container {
    flex-direction: column;
  }

  .docs-sidebar {
    width: 100%;
    height: 250px;
  }

  .content-headline {
    padding: 10px 12px;
    gap: 8px;
    flex-direction: column;
    align-items: flex-start;
  }

  .version-select {
    width: 100%;
    min-width: 0;
  }

  .markdown-body {
    padding: 12px 16px;
  }

  .doc-item {
    margin: 2px 6px;
  }

  .docs-center {
    padding: 0;
    gap: 10px;
  }
}
</style>
