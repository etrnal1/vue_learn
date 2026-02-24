<template>
  <div class="docs-center">
    <!-- 头部 -->
    <div class="docs-header">
      <div class="header-left">
        <h1>📚 文档中心</h1>
        <p class="subtitle">学习资源和快速参考</p>
      </div>
      <div class="header-right">
        <button
          class="btn btn-sync"
          @click="syncDocs"
          :disabled="syncing"
        >
          {{ syncing ? '同步中...' : '🔄 同步' }}
        </button>
        <button
          class="btn btn-print"
          @click="printDoc"
        >
          🖨️ 打印
        </button>
      </div>
    </div>

    <!-- 统计信息 -->
    <div v-if="docsList.length > 0" class="docs-stats">
      <span>📄 共 {{ docsList.length }} 个文档</span>
      <span>💾 总大小：{{ formatSize(totalSize) }}</span>
      <span>🕐 最后同步：{{ lastSync }}</span>
    </div>

    <!-- 主容器 -->
    <div class="docs-container">
      <!-- 侧边栏 -->
      <aside class="docs-sidebar">
        <div class="sidebar-search">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索文档..."
            class="input"
          />
        </div>

        <div class="docs-list">
          <div
            v-if="filteredDocsList.length === 0"
            class="empty-state"
          >
            无文档
          </div>

          <button
            v-for="doc in filteredDocsList"
            :key="doc.filename"
            class="doc-item"
            :class="{ active: selectedDocName === doc.filename }"
            @click="selectDoc(doc.filename)"
          >
            <span class="doc-name">{{ doc.displayName }}</span>
            <span class="doc-size">{{ formatSize(doc.size) }}</span>
          </button>
        </div>
      </aside>

      <!-- 主内容区 -->
      <main class="docs-content">
        <div v-if="!selectedDocName" class="empty-content">
          <p>👈 请从左侧选择一个文档</p>
        </div>

        <div v-else-if="loadingContent" class="loading-content">
          <p>⏳ 加载中...</p>
        </div>

        <div v-else-if="contentError" class="error-content">
          <p>❌ {{ contentError }}</p>
          <button class="btn" @click="loadContent">重试</button>
        </div>

        <div v-else class="markdown-body" v-html="renderedHtml"></div>
      </main>

      <!-- 右侧 TOC -->
      <aside v-if="tableOfContents.length > 0" class="docs-toc">
        <div class="toc-header">目录</div>
        <nav class="toc-list">
          <a
            v-for="heading in tableOfContents"
            :key="heading.id"
            :href="`#${heading.id}`"
            class="toc-item"
            :class="{ active: activeHeading === heading.id }"
            :style="{ paddingLeft: `${(heading.level - 2) * 16}px` }`}"
            @click.prevent="scrollToHeading(heading.id)"
          >
            {{ heading.text }}
          </a>
        </nav>
      </aside>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { api } from '../utils/api'

export default {
  name: 'DocumentationCenter',
  setup() {
    const docsList = ref([])
    const selectedDocName = ref(null)
    const selectedDocContent = ref('')
    const searchQuery = ref('')
    const syncing = ref(false)
    const loadingContent = ref(false)
    const contentError = ref(null)
    const lastSync = ref('未同步')
    const tableOfContents = ref([])
    const activeHeading = ref(null)
    const scrollListener = ref(null)

    /**
     * 格式化文件大小
     */
    function formatSize(bytes) {
      if (!bytes) return '0 B'
      const k = 1024
      const sizes = ['B', 'KB', 'MB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
    }

    /**
     * 计算总大小
     */
    const totalSize = computed(() => {
      return docsList.value.reduce((sum, doc) => sum + (doc.size || 0), 0)
    })

    /**
     * 过滤文档列表
     */
    const filteredDocsList = computed(() => {
      if (!searchQuery.value) return docsList.value
      const query = searchQuery.value.toLowerCase()
      return docsList.value.filter(doc =>
        doc.displayName.toLowerCase().includes(query) ||
        doc.filename.toLowerCase().includes(query)
      )
    })

    /**
     * 渲染 HTML（简单的 markdown 转 HTML）
     */
    const renderedHtml = computed(() => {
      if (!selectedDocContent.value) return ''

      let html = selectedDocContent.value
        // 代码块
        .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
        // 标题
        .replace(/^### (.*?)$/gm, '<h3 id="h3-$1">$1</h3>')
        .replace(/^## (.*?)$/gm, '<h2 id="h2-$1">$2</h2>')
        .replace(/^# (.*?)$/gm, '<h1 id="h1-$1">$1</h1>')
        // 粗体
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // 斜体
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // 链接
        .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>')
        // 无序列表
        .replace(/^\- (.*?)$/gm, '<li>$1</li>')
        // 段落（双换行）
        .replace(/\n\n/g, '</p><p>')
        // 单换行
        .replace(/\n/g, '<br/>')

      // 包装段落
      if (!html.startsWith('<h') && !html.startsWith('<pre')) {
        html = '<p>' + html + '</p>'
      }

      // 转义 HTML 特殊字符以防止 XSS
      const div = document.createElement('div')
      div.textContent = html
      return div.innerHTML
    })

    /**
     * 获取文档列表
     */
    async function fetchDocsList() {
      try {
        const result = await api.docs.list()
        docsList.value = result.files || []
        lastSync.value = new Date(result.lastSync).toLocaleString('zh-CN')
      } catch (error) {
        console.error('获取文档列表失败:', error)
      }
    }

    /**
     * 选择文档
     */
    function selectDoc(filename) {
      selectedDocName.value = filename
      tableOfContents.value = []
      activeHeading.value = null
      loadContent()
    }

    /**
     * 加载文档内容
     */
    async function loadContent() {
      if (!selectedDocName.value) return

      loadingContent.value = true
      contentError.value = null

      try {
        const result = await api.docs.getContent(selectedDocName.value)
        selectedDocContent.value = result.content || ''
        parseTableOfContents()
      } catch (error) {
        contentError.value = '加载失败: ' + error.message
      } finally {
        loadingContent.value = false
      }
    }

    /**
     * 解析目录（从 markdown 中提取标题）
     */
    function parseTableOfContents() {
      const toc = []
      const headingRegex = /^(#{1,3}) (.*?)$/gm
      let match

      while ((match = headingRegex.exec(selectedDocContent.value)) !== null) {
        const level = match[1].length
        const text = match[2]
        const id = `h${level}-${text.replace(/\s+/g, '-')}`

        toc.push({ level, text, id })
      }

      tableOfContents.value = toc
    }

    /**
     * 同步文档
     */
    async function syncDocs() {
      syncing.value = true
      try {
        const result = await api.docs.sync()
        docsList.value = result.files || []
        lastSync.value = new Date(result.syncedAt).toLocaleString('zh-CN')
      } catch (error) {
        console.error('同步失败:', error)
      } finally {
        syncing.value = false
      }
    }

    /**
     * 滚动到标题
     */
    function scrollToHeading(id) {
      const element = document.getElementById(id)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
        activeHeading.value = id
      }
    }

    /**
     * 监听滚动，更新活跃标题
     */
    function handleScroll() {
      const headings = tableOfContents.value
      if (headings.length === 0) return

      const contentArea = document.querySelector('.docs-content')
      if (!contentArea) return

      let current = null
      for (const heading of headings) {
        const element = document.getElementById(heading.id)
        if (element && element.offsetTop < contentArea.scrollTop + 100) {
          current = heading.id
        }
      }

      if (current) {
        activeHeading.value = current
      }
    }

    /**
     * 打印文档
     */
    function printDoc() {
      const printWindow = window.open('', '_blank')
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${selectedDocName.value}</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
              h1, h2, h3 { margin-top: 20px; }
              pre { background: #f4f4f4; padding: 10px; overflow-x: auto; }
              code { background: #f4f4f4; padding: 2px 4px; }
              a { color: #0066cc; }
              @media print { body { margin: 0; } }
            </style>
          </head>
          <body>
            ${renderedHtml.value}
          </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.print()
    }

    // 生命周期
    onMounted(() => {
      fetchDocsList()

      // 添加滚动监听器
      const contentArea = document.querySelector('.docs-content')
      if (contentArea) {
        scrollListener.value = handleScroll
        contentArea.addEventListener('scroll', scrollListener.value)
      }
    })

    onUnmounted(() => {
      // 移除滚动监听器
      const contentArea = document.querySelector('.docs-content')
      if (contentArea && scrollListener.value) {
        contentArea.removeEventListener('scroll', scrollListener.value)
      }
    })

    // 监听选中文档变化
    watch(selectedDocName, () => {
      if (selectedDocName.value) {
        loadContent()
      }
    })

    return {
      docsList,
      selectedDocName,
      selectedDocContent,
      searchQuery,
      syncing,
      loadingContent,
      contentError,
      lastSync,
      tableOfContents,
      activeHeading,
      filteredDocsList,
      renderedHtml,
      totalSize,
      formatSize,
      selectDoc,
      loadContent,
      syncDocs,
      scrollToHeading,
      printDoc
    }
  }
}
</script>

<style scoped>
.docs-center {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--app-bg, #fff);
}

.docs-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--app-border, #eee);
}

.header-left h1 {
  margin: 0;
  font-size: 24px;
  color: var(--app-text, #333);
}

.subtitle {
  margin: 4px 0 0 0;
  font-size: 14px;
  color: var(--app-text-secondary, #666);
}

.header-right {
  display: flex;
  gap: 10px;
}

.btn {
  padding: 8px 16px;
  border: 1px solid var(--app-border, #ddd);
  background: var(--app-bg-secondary, #f5f5f5);
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn:hover:not(:disabled) {
  background: var(--app-bg-tertiary, #e0e0e0);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.docs-stats {
  display: flex;
  gap: 20px;
  padding: 12px 20px;
  background: var(--app-bg-secondary, #f9f9f9);
  font-size: 12px;
  color: var(--app-text-secondary, #666);
  border-bottom: 1px solid var(--app-border, #eee);
}

.docs-container {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* 侧边栏 */
.docs-sidebar {
  width: 280px;
  border-right: 1px solid var(--app-border, #eee);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-search {
  padding: 12px;
  border-bottom: 1px solid var(--app-border, #eee);
}

.sidebar-search .input {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--app-border, #ddd);
  border-radius: 4px;
  font-size: 14px;
}

.docs-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.empty-state {
  padding: 20px;
  text-align: center;
  color: var(--app-text-secondary, #999);
  font-size: 14px;
}

.doc-item {
  width: 100%;
  padding: 12px 16px;
  text-align: left;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.doc-item:hover {
  background: var(--app-bg-secondary, #f5f5f5);
}

.doc-item.active {
  background: var(--app-primary-light, #e3f2fd);
  color: var(--app-primary, #1976d2);
  font-weight: 600;
}

.doc-name {
  flex: 1;
  font-size: 14px;
}

.doc-size {
  font-size: 12px;
  color: var(--app-text-secondary, #999);
}

/* 主内容区 */
.docs-content {
  flex: 1;
  overflow-y: auto;
  padding: 30px;
  max-width: 900px;
}

.empty-content,
.loading-content,
.error-content {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--app-text-secondary, #999);
  font-size: 16px;
}

.error-content {
  flex-direction: column;
  gap: 16px;
}

/* Markdown 样式 */
.markdown-body {
  color: var(--app-text, #333);
  font-size: 15px;
  line-height: 1.7;
}

.markdown-body h1 {
  margin: 30px 0 20px 0;
  padding-bottom: 10px;
  border-bottom: 2px solid var(--app-border, #eee);
  font-size: 28px;
  font-weight: 600;
}

.markdown-body h2 {
  margin: 24px 0 16px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--app-border, #eee);
  font-size: 22px;
  font-weight: 600;
}

.markdown-body h3 {
  margin: 16px 0 12px 0;
  font-size: 18px;
  font-weight: 600;
}

.markdown-body p {
  margin: 12px 0;
}

.markdown-body pre {
  background: var(--app-bg-secondary, #f5f5f5);
  padding: 16px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 16px 0;
}

.markdown-body code {
  background: var(--app-bg-secondary, #f5f5f5);
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 14px;
}

.markdown-body pre code {
  background: none;
  padding: 0;
}

.markdown-body ul,
.markdown-body ol {
  margin: 12px 0 12px 24px;
}

.markdown-body li {
  margin: 6px 0;
}

.markdown-body a {
  color: var(--app-primary, #1976d2);
  text-decoration: none;
}

.markdown-body a:hover {
  text-decoration: underline;
}

.markdown-body blockquote {
  border-left: 4px solid var(--app-primary, #1976d2);
  padding-left: 16px;
  margin: 16px 0;
  color: var(--app-text-secondary, #666);
  font-style: italic;
}

/* 目录侧边栏 */
.docs-toc {
  width: 200px;
  padding: 20px;
  border-left: 1px solid var(--app-border, #eee);
  overflow-y: auto;
  background: var(--app-bg-secondary, #f9f9f9);
}

.toc-header {
  font-size: 12px;
  font-weight: 600;
  color: var(--app-text-secondary, #666);
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.toc-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.toc-item {
  font-size: 13px;
  color: var(--app-text-secondary, #666);
  text-decoration: none;
  padding: 6px 0 6px 12px;
  border-left: 2px solid transparent;
  transition: all 0.2s;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.toc-item:hover {
  color: var(--app-primary, #1976d2);
  border-left-color: var(--app-primary, #1976d2);
}

.toc-item.active {
  color: var(--app-primary, #1976d2);
  border-left-color: var(--app-primary, #1976d2);
  font-weight: 600;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .docs-toc {
    display: none;
  }

  .docs-content {
    max-width: 100%;
  }
}

@media (max-width: 768px) {
  .docs-container {
    flex-direction: column;
  }

  .docs-sidebar {
    width: 100%;
    height: 200px;
    border-right: none;
    border-bottom: 1px solid var(--app-border, #eee);
  }

  .docs-content {
    padding: 20px;
  }

  .docs-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .header-right {
    width: 100%;
  }

  .header-right button {
    flex: 1;
  }

  .docs-stats {
    flex-wrap: wrap;
  }
}

@media print {
  .docs-header,
  .docs-stats,
  .docs-sidebar,
  .docs-toc {
    display: none;
  }

  .docs-container {
    overflow: visible;
  }

  .docs-content {
    overflow: visible;
    padding: 0;
    max-width: 100%;
  }
}
</style>
