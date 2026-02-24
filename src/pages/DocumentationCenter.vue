<template>
  <div class="docs-center">
    <!-- Header -->
    <div class="docs-header">
      <div class="header-left">
        <h1>📚 文档中心</h1>
        <p v-if="summary" class="stats">
          {{ summary.total }} 个文档 · {{ formatSize(summary.totalSize) }}
        </p>
      </div>
      <div class="header-right">
        <div class="search-box">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索文档..."
            class="search-input"
            @input="filterDocuments"
          />
        </div>
        <button class="btn btn-primary" @click="syncDocuments" :disabled="syncing">
          {{ syncing ? '同步中...' : '🔄 同步' }}
        </button>
      </div>
    </div>

    <!-- Main Content -->
    <div class="docs-container">
      <!-- Sidebar -->
      <div class="docs-sidebar">
        <div class="sidebar-header">
          <h3>文档列表</h3>
        </div>

        <div v-if="loading" class="sidebar-loading">
          正在加载文档...
        </div>

        <div v-else-if="filteredDocsList.length === 0" class="sidebar-empty">
          没有找到文档
        </div>

        <div v-else class="docs-list">
          <div
            v-for="doc in filteredDocsList"
            :key="doc.filename"
            class="doc-item"
            :class="{ active: selectedDocName === doc.filename }"
            @click="selectDocument(doc.filename)"
          >
            <div class="doc-icon">📄</div>
            <div class="doc-info">
              <div class="doc-name">{{ doc.name.replace('.md', '') }}</div>
              <div class="doc-meta">{{ doc.sizeKB }} KB</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="docs-content">
        <div v-if="!selectedDocName" class="content-empty">
          <p>👈 请从左侧选择一个文档开始阅读</p>
        </div>

        <div v-else-if="contentLoading" class="content-loading">
          正在加载文档内容...
        </div>

        <div v-else-if="contentError" class="content-error">
          <p>❌ {{ contentError }}</p>
          <button class="btn btn-sm" @click="loadDocContent">重试</button>
        </div>

        <div v-else class="markdown-content">
          <!-- TOC Panel (on desktop) -->
          <div v-if="tableOfContents.length > 0" class="toc-panel">
            <div class="toc-title">目录</div>
            <div class="toc-list">
              <a
                v-for="(heading, index) in tableOfContents"
                :key="index"
                :href="`#heading-${index}`"
                class="toc-item"
                :class="`toc-level-${heading.level}`"
                @click.prevent="scrollToHeading(index)"
              >
                {{ heading.text }}
              </a>
            </div>
          </div>

          <!-- Markdown HTML -->
          <div class="markdown-body" v-html="renderedHtml"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { marked } from 'marked'
import { api } from '../utils/api'

export default {
  name: 'DocumentationCenter',
  setup() {
    const docsList = ref([])
    const selectedDocName = ref(null)
    const selectedDocContent = ref('')
    const searchQuery = ref('')
    const loading = ref(false)
    const contentLoading = ref(false)
    const contentError = ref(null)
    const syncing = ref(false)
    const tableOfContents = ref([])
    const summary = ref(null)

    // 格式化文件大小
    function formatSize(bytes) {
      if (bytes === 0) return '0 B'
      const k = 1024
      const sizes = ['B', 'KB', 'MB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return Math.round(bytes / Math.pow(k, i)) + ' ' + sizes[i]
    }

    // 加载文档列表
    async function loadDocsList() {
      loading.value = true
      try {
        const response = await api.docs.list()
        docsList.value = response.files || []
        summary.value = response.summary
      } catch (error) {
        console.error('加载文档列表失败:', error)
      } finally {
        loading.value = false
      }
    }

    // 选择文档
    async function selectDocument(filename) {
      selectedDocName.value = filename
      selectedDocContent.value = ''
      tableOfContents.value = []
      contentError.value = null
      await loadDocContent()
    }

    // 加载文档内容
    async function loadDocContent() {
      if (!selectedDocName.value) return

      contentLoading.value = true
      contentError.value = null

      try {
        const response = await api.docs.getContent(selectedDocName.value)
        selectedDocContent.value = response.content
        parseTableOfContents(response.content)
      } catch (error) {
        console.error('加载文档内容失败:', error)
        contentError.value = error.message || '加载失败'
      } finally {
        contentLoading.value = false
      }
    }

    // 解析表格目录（从 markdown 提取标题）
    function parseTableOfContents(markdown) {
      const headings = []
      const lines = markdown.split('\n')

      lines.forEach((line, index) => {
        const match = line.match(/^(#{1,3})\s+(.+)$/)
        if (match) {
          const level = match[1].length
          const text = match[2].trim()
          headings.push({ level, text, id: `heading-${index}` })
        }
      })

      tableOfContents.value = headings
    }

    // 滚动到指定标题
    function scrollToHeading(index) {
      const element = document.querySelector(`#heading-${index}`)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }

    // 过滤文档列表
    function filterDocuments() {
      // 直接通过 computed 处理
    }

    // 同步文档
    async function syncDocuments() {
      syncing.value = true
      try {
        const response = await api.docs.sync()
        docsList.value = response.files || []
        summary.value = response.summary
        console.log(response.message)
      } catch (error) {
        console.error('同步失败:', error)
      } finally {
        syncing.value = false
      }
    }

    // 过滤后的文档列表
    const filteredDocsList = computed(() => {
      if (!searchQuery.value.trim()) {
        return docsList.value
      }

      const query = searchQuery.value.toLowerCase()
      return docsList.value.filter(doc =>
        doc.name.toLowerCase().includes(query)
      )
    })

    // 渲染的 HTML
    const renderedHtml = computed(() => {
      if (!selectedDocContent.value) return ''

      try {
        // 自定义 marked 选项
        marked.setOptions({
          breaks: true,
          gfm: true
        })

        // 自定义渲染器添加 ID 到标题
        const renderer = new marked.Renderer()
        const originalHeadingRenderer = renderer.heading.bind(renderer)

        renderer.heading = (args) => {
          const text = args.text
          const level = args.depth
          const id = `heading-${text.toLowerCase().replace(/\s+/g, '-')}`
          return `<h${level} id="${id}">${text}</h${level}>`
        }

        // 代码块样式
        renderer.codespan = (args) => {
          return `<code class="inline-code">${args.text}</code>`
        }

        const html = marked(selectedDocContent.value, { renderer })
        return html
      } catch (error) {
        console.error('渲染 markdown 失败:', error)
        return '<p>文档渲染失败</p>'
      }
    })

    onMounted(() => {
      loadDocsList()
    })

    return {
      docsList,
      filteredDocsList,
      selectedDocName,
      selectedDocContent,
      searchQuery,
      loading,
      contentLoading,
      contentError,
      syncing,
      tableOfContents,
      summary,
      renderedHtml,
      formatSize,
      loadDocsList,
      selectDocument,
      loadDocContent,
      parseTableOfContents,
      scrollToHeading,
      filterDocuments,
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
  display: flex;
  align-items: center;
  gap: 8px;
}

.stats {
  margin: 4px 0 0 0;
  font-size: 12px;
  color: var(--text-secondary, #666);
}

.header-right {
  display: flex;
  gap: 12px;
  align-items: center;
}

.search-box {
  flex: 1;
  max-width: 300px;
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
  width: 280px;
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

.docs-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.doc-item {
  display: flex;
  align-items: center;
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
}

.doc-info {
  flex: 1;
  min-width: 0;
}

.doc-name {
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.doc-meta {
  font-size: 11px;
  color: var(--text-secondary, #999);
  margin-top: 2px;
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

.content-error {
  gap: 12px;
}

.markdown-content {
  flex: 1;
  display: flex;
  overflow: hidden;
  width: 100%;
}

.toc-panel {
  width: 220px;
  border-right: 1px solid var(--border-color, #e5e7eb);
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
  border-left: 2px solid transparent;
  transition: all 0.2s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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

/* Markdown 样式 */
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

.markdown-body :deep(h4) {
  font-size: 16px;
}

.markdown-body :deep(p) {
  margin: 12px 0;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  margin: 12px 0;
  padding-left: 24px;
}

.markdown-body :deep(li) {
  margin: 4px 0;
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
  border-radius: 0;
}

.markdown-body :deep(blockquote) {
  border-left: 4px solid var(--primary-color, #3b82f6);
  padding-left: 12px;
  margin-left: 0;
  color: var(--text-secondary, #666);
  font-style: italic;
}

.markdown-body :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 12px 0;
}

.markdown-body :deep(th),
.markdown-body :deep(td) {
  border: 1px solid var(--border-color, #ddd);
  padding: 8px 12px;
  text-align: left;
}

.markdown-body :deep(th) {
  background: var(--table-header-bg, #f5f5f5);
  font-weight: 600;
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
  color: white;
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

/* 响应式 */
@media (max-width: 1024px) {
  .toc-panel {
    width: 160px;
  }

  .markdown-body {
    padding: 16px 20px;
  }
}

@media (max-width: 768px) {
  .docs-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }

  .header-right {
    width: 100%;
  }

  .search-box {
    max-width: 100%;
  }

  .docs-container {
    flex-direction: column;
  }

  .docs-sidebar {
    width: 100%;
    height: 200px;
    border-right: none;
    border-bottom: 1px solid var(--border-color, #e5e7eb);
  }

  .toc-panel {
    display: none;
  }

  .markdown-body {
    padding: 12px 16px;
  }
}
</style>
