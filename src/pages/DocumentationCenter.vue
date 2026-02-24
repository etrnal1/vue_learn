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
        <div class="search-box">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索标题或内容..."
            class="search-input"
          />
        </div>
        <button class="btn btn-primary" @click="syncDocuments" :disabled="syncing">
          {{ syncing ? '同步中...' : '🔄 同步' }}
        </button>
      </div>
    </div>

    <div class="docs-container">
      <div class="docs-sidebar">
        <div class="sidebar-header">
          <h3>{{ isSearching ? '搜索结果' : '新手学习路径' }}</h3>
          <span class="sidebar-subtitle">
            {{ isSearching ? `${searchResults.length} 条结果` : `${orderedGroups.length} 个步骤` }}
          </span>
        </div>

        <div v-if="loading" class="sidebar-loading">正在加载文档...</div>

        <div v-else-if="sidebarItems.length === 0" class="sidebar-empty">没有找到文档</div>

        <div v-else class="docs-list">
          <div
            v-for="item in sidebarItems"
            :key="item.key"
            class="doc-item"
            :class="{ active: selectedDocName === item.filename }"
            @click="handleSelectItem(item)"
          >
            <div class="doc-icon">📄</div>
            <div class="doc-info">
              <div class="doc-name-row">
                <span v-if="item.step" class="doc-step">{{ item.step }}</span>
                <div class="doc-name">{{ item.title }}</div>
              </div>
              <div class="doc-meta-row">
                <span class="doc-meta">{{ item.versionLabel || 'latest' }} · {{ item.sizeKB || '-' }} KB</span>
                <span v-if="item.versionsCount > 1" class="version-count">{{ item.versionsCount }} 个版本</span>
              </div>
              <div v-if="item.snippet" class="doc-snippet">{{ item.snippet }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="docs-content">
        <div v-if="!selectedDocName" class="content-empty">
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
                <span class="version-badge">{{ selectedDocVersionLabel || 'latest' }}</span>
                <select
                  v-if="availableVersions.length > 1"
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

            <div class="markdown-body" v-html="renderedHtml"></div>
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
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { marked } from 'marked'
import { api } from '../utils/api'

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
    const selectedDocName = ref(null)
    const selectedDocId = ref(null)
    const selectedDocTitle = ref('')
    const selectedDocVersionLabel = ref('')
    const selectedDocContent = ref('')
    const searchQuery = ref('')
    const searchResults = ref([])
    const loading = ref(false)
    const contentLoading = ref(false)
    const contentError = ref(null)
    const syncing = ref(false)
    const searching = ref(false)
    const tableOfContents = ref([])
    const summary = ref(null)

    let searchTimer = null

    function formatSize(bytes) {
      if (!bytes) return '0 B'
      const k = 1024
      const sizes = ['B', 'KB', 'MB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return Math.round(bytes / Math.pow(k, i)) + ' ' + sizes[i]
    }

    const orderedGroups = computed(() => docGroups.value || [])

    const isSearching = computed(() => searchQuery.value.trim().length > 0)

    const selectedGroup = computed(() => {
      if (!selectedDocId.value) return null
      return orderedGroups.value.find((g) => g.docId === selectedDocId.value) || null
    })

    const availableVersions = computed(() => selectedGroup.value?.versions || [])

    const sidebarItems = computed(() => {
      if (isSearching.value) {
        return searchResults.value.map((item, idx) => ({
          key: `search-${idx}-${item.filename}`,
          filename: item.filename,
          title: item.title,
          docId: item.docId,
          versionLabel: item.versionLabel,
          sizeKB: item.sizeKB,
          snippet: item.snippet,
          versionsCount: 1
        }))
      }

      return orderedGroups.value.map((group, index) => ({
        key: `group-${group.docId}`,
        filename: group.latestFilename,
        title: group.title,
        docId: group.docId,
        versionLabel: group.latestVersion,
        sizeKB: group.versions?.[0]?.sizeKB,
        versionsCount: group.versions?.length || 1,
        step: index + 1
      }))
    })

    async function loadDocsList() {
      loading.value = true
      try {
        const response = await api.docs.list()
        docsList.value = response.files || []
        docGroups.value = response.groups || []
        summary.value = response.summary || null

        if (!selectedDocName.value && (response.groups || []).length > 0) {
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
      if (!selectedDocContent.value) return ''

      try {
        marked.setOptions({ breaks: true, gfm: true })

        const headings = buildHeadingData(selectedDocContent.value)
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
        return marked(selectedDocContent.value, { renderer })
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
      loadDocsList()
    })

    return {
      docsList,
      docGroups,
      orderedGroups,
      selectedDocName,
      selectedDocTitle,
      selectedDocVersionLabel,
      selectedDocContent,
      selectedDocId,
      searchQuery,
      searchResults,
      loading,
      contentLoading,
      contentError,
      syncing,
      searching,
      tableOfContents,
      summary,
      renderedHtml,
      isSearching,
      sidebarItems,
      availableVersions,
      formatSize,
      handleSelectItem,
      loadDocContent,
      scrollToHeading,
      syncDocuments
    }
  }
}
</script>

<style scoped>
.docs-center {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-color, #fff);
  color: var(--text-color, #333);
}

.docs-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--border-color, #e5e7eb);
  background: var(--panel-bg, #f9fafb);
}

.header-left h1 {
  margin: 0;
  font-size: 24px;
}

.stats {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--text-secondary, #666);
}

.header-right {
  display: flex;
  gap: 12px;
  align-items: center;
}

.search-box {
  min-width: 280px;
}

.search-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-color, #ddd);
  border-radius: 6px;
  font-size: 14px;
  background: var(--input-bg, #fff);
  color: var(--text-color, #333);
}

.docs-container {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.docs-sidebar {
  width: 320px;
  border-right: 1px solid var(--border-color, #e5e7eb);
  display: flex;
  flex-direction: column;
  background: var(--sidebar-bg, #f5f7fa);
}

.sidebar-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color, #e5e7eb);
}

.sidebar-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.sidebar-subtitle {
  margin-top: 4px;
  display: inline-block;
  font-size: 12px;
  color: var(--text-secondary, #666);
}

.docs-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.doc-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  border-left: 3px solid transparent;
  transition: all 0.2s;
}

.doc-item:hover {
  background: rgba(0, 0, 0, 0.05);
}

.doc-item.active {
  background: var(--primary-light, #e3f2fd);
  border-left-color: var(--primary-color, #3b82f6);
}

.doc-icon {
  font-size: 18px;
  line-height: 1;
  margin-top: 2px;
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
  font-size: 13px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.doc-meta-row {
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.doc-meta {
  font-size: 11px;
  color: var(--text-secondary, #999);
}

.version-count {
  font-size: 11px;
  color: #1d4ed8;
  background: #dbeafe;
  border-radius: 999px;
  padding: 2px 8px;
}

.doc-snippet {
  margin-top: 6px;
  font-size: 12px;
  color: #4b5563;
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
  color: var(--text-secondary, #999);
  font-size: 13px;
}

.docs-content {
  flex: 1;
  display: flex;
  overflow: hidden;
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
  padding: 16px 24px;
  border-bottom: 1px solid var(--border-color, #e5e7eb);
  background: #fff;
}

.content-headline h2 {
  margin: 0;
  font-size: 20px;
}

.headline-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.version-badge {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  background: #e0e7ff;
  color: #3730a3;
}

.version-select {
  min-width: 180px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 6px 8px;
  font-size: 12px;
  background: #fff;
}

.toc-panel {
  width: 220px;
  border-left: 1px solid var(--border-color, #e5e7eb);
  padding: 16px;
  overflow-y: auto;
  background: var(--sidebar-bg, #f5f7fa);
}

.toc-title {
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--text-secondary, #666);
}

.toc-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.toc-item {
  display: block;
  padding: 6px 8px;
  font-size: 12px;
  color: var(--primary-color, #3b82f6);
  text-decoration: none;
  border-radius: 4px;
}

.toc-item:hover {
  background: rgba(59, 130, 246, 0.1);
}

.toc-level-2 {
  padding-left: 16px;
}

.toc-level-3 {
  padding-left: 24px;
}

.markdown-body {
  flex: 1;
  padding: 24px 32px;
  overflow-y: auto;
  font-size: 14px;
  line-height: 1.6;
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
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--primary-color, #3b82f6);
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 12px;
}

@media (max-width: 1024px) {
  .toc-panel {
    display: none;
  }

  .markdown-body {
    padding: 16px 20px;
  }
}

@media (max-width: 768px) {
  .docs-header {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .header-right {
    width: 100%;
  }

  .search-box {
    min-width: 0;
    flex: 1;
  }

  .docs-container {
    flex-direction: column;
  }

  .docs-sidebar {
    width: 100%;
    height: 220px;
    border-right: none;
    border-bottom: 1px solid var(--border-color, #e5e7eb);
  }

  .content-headline {
    padding: 12px 14px;
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
}
</style>
