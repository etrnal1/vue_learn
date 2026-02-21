<template>
  <div class="git-log-page">
    <div class="log-header">
      <h2>📋 Git 提交历史</h2>
      <p class="log-subtitle" v-if="summary">
        共 <strong>{{ summary.totalCommits }}</strong> 次提交，
        涉及 <strong>{{ summary.totalFiles }}</strong> 个文件，
        <span class="stat-add">+{{ summary.totalInsertions.toLocaleString() }}</span>
        <span class="stat-del">-{{ summary.totalDeletions.toLocaleString() }}</span> 行
      </p>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-row" v-if="summary">
      <div class="stat-card">
        <div class="stat-number">{{ summary.totalCommits }}</div>
        <div class="stat-label">总提交</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">{{ summary.totalFiles }}</div>
        <div class="stat-label">文件数</div>
      </div>
      <div class="stat-card">
        <div class="stat-number add">+{{ formatNum(summary.totalInsertions) }}</div>
        <div class="stat-label">新增行</div>
      </div>
      <div class="stat-card">
        <div class="stat-number del">-{{ formatNum(summary.totalDeletions) }}</div>
        <div class="stat-label">删除行</div>
      </div>
    </div>

    <!-- 类型筛选 -->
    <div class="filter-row">
      <button
        v-for="t in typeFilters"
        :key="t.value"
        @click="activeFilter = t.value"
        class="filter-btn"
        :class="{ active: activeFilter === t.value }"
      >
        {{ t.icon }} {{ t.label }}
      </button>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="error" class="error-msg">{{ error }}</div>

    <!-- 时间线 -->
    <div v-else class="timeline">
      <div
        v-for="commit in filteredCommits"
        :key="commit.hash"
        class="timeline-item"
        :class="'type-' + commit.type"
      >
        <div class="timeline-dot">
          <span class="dot-icon">{{ typeIcon(commit.type) }}</span>
        </div>

        <div class="timeline-card" @click="toggleExpand(commit.hash)">
          <div class="card-header">
            <div class="card-main">
              <span class="commit-type-tag" :class="'tag-' + commit.type">{{ commit.type }}</span>
              <span class="commit-subject">{{ commit.subject }}</span>
            </div>
            <div class="card-meta">
              <span class="commit-hash">{{ commit.hash }}</span>
              <span class="commit-date">{{ formatDate(commit.date) }}</span>
            </div>
          </div>

          <!-- 变更统计条 -->
          <div class="stats-bar">
            <span class="stat-files">{{ commit.stats.filesChanged }} 个文件</span>
            <span class="stat-add" v-if="commit.stats.insertions">+{{ commit.stats.insertions }}</span>
            <span class="stat-del" v-if="commit.stats.deletions">-{{ commit.stats.deletions }}</span>
            <div class="change-bar">
              <div
                class="bar-add"
                :style="{ width: barWidth(commit.stats.insertions, commit.stats.deletions).add }"
              ></div>
              <div
                class="bar-del"
                :style="{ width: barWidth(commit.stats.insertions, commit.stats.deletions).del }"
              ></div>
            </div>
          </div>

          <!-- 展开详情 -->
          <div v-if="expandedHash === commit.hash" class="card-detail">
            <p v-if="commit.body" class="commit-body">{{ commit.body }}</p>

            <div class="file-list">
              <div class="file-list-header">变更文件：</div>
              <div
                v-for="file in commit.files"
                :key="file.path"
                class="file-item"
                :class="'file-' + file.status"
              >
                <span class="file-status-icon">{{ fileIcon(file.status) }}</span>
                <span class="file-path">{{ file.path }}</span>
                <button
                  class="file-diff-btn"
                  @click.stop="openCommitFileDiff(commit, file)"
                >
                  查看变更内容
                </button>
              </div>
            </div>

            <div class="commit-meta-detail">
              <span>作者：{{ commit.author }}</span>
              <span>完整 Hash：{{ commit.fullHash.substring(0, 12) }}...</span>
              <span>时间：{{ commit.date }}</span>
            </div>
          </div>

          <div class="expand-hint">
            {{ expandedHash === commit.hash ? '收起 ▲' : '展开详情 ▼' }}
          </div>
        </div>
      </div>
    </div>

    <!-- 生成时间 -->
    <div v-if="summary" class="generated-at">
      <div>数据生成时间：{{ new Date(summary.generatedAt).toLocaleString('zh-CN') }}</div>
      <div>数据来源：后端实时 Git 历史接口</div>
      <div class="auto-refresh-hint">🔄 自动检测更新中 (每 30 秒刷新一次)</div>
    </div>

    <div v-if="showFileDiffModal" class="diff-modal-overlay" @click="closeFileDiffModal">
      <div class="diff-modal" @click.stop>
        <div class="diff-modal-header">
          <h3>{{ selectedDiffTitle }}</h3>
          <button class="diff-close-btn" @click="closeFileDiffModal">✕</button>
        </div>
        <div class="diff-modal-body">
          <div class="diff-stats" v-if="selectedDiffStats">
            <span class="stat-add">+{{ selectedDiffStats.insertions }} 行</span>
            <span class="stat-del">-{{ selectedDiffStats.deletions }} 行</span>
          </div>
          <div v-if="diffLoading" class="loading">正在加载文件变更...</div>
          <div v-else-if="selectedDiffError" class="error-msg">{{ selectedDiffError }}</div>
          <pre v-else class="diff-code"><code>{{ selectedDiffContent }}</code></pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { api } from '../../utils/api'

export default {
  name: 'GitLogSection',
  data() {
    return {
      loading: true,
      error: '',
      summary: null,
      commits: [],
      expandedHash: null,
      activeFilter: 'all',
      lastGeneratedAt: null,
      autoRefreshInterval: null,
      showFileDiffModal: false,
      diffLoading: false,
      selectedDiffTitle: '',
      selectedDiffContent: '',
      selectedDiffError: '',
      selectedDiffStats: null,
      typeFilters: [
        { value: 'all', label: '全部', icon: '📋' },
        { value: '新功能', label: '新功能', icon: '✨' },
        { value: '更新', label: '更新', icon: '🔄' },
        { value: '修复', label: '修复', icon: '🐛' },
        { value: '文档', label: '文档', icon: '📝' },
        { value: '配置', label: '配置', icon: '⚙️' },
        { value: '样式', label: '样式', icon: '🎨' }
      ]
    }
  },
  computed: {
    filteredCommits() {
      if (this.activeFilter === 'all') return this.commits
      return this.commits.filter(c => c.type === this.activeFilter)
    }
  },
  methods: {
    async loadData(silent = false) {
      try {
        const data = await api.get(`/git/history?ref=HEAD&limit=500&_t=${Date.now()}`)

        // 检测是否有新的更新（通过 generatedAt 字段）
        const newGeneratedAt = data.summary.generatedAt
        if (this.lastGeneratedAt && newGeneratedAt !== this.lastGeneratedAt) {
          console.log('🔄 检测到新的提交，自动更新数据...')
          console.log('上次生成:', this.lastGeneratedAt)
          console.log('本次生成:', newGeneratedAt)
          if (!silent) {
            // 可以在这里添加一个提示
            console.log('✨ 提交历史已更新!')
          }
        }
        this.lastGeneratedAt = newGeneratedAt

        this.summary = data.summary
        this.commits = data.commits
        this.error = ''
      } catch (e) {
        this.error = e.message
        console.error('加载数据失败:', e)
      } finally {
        this.loading = false
      }
    },
    startAutoRefresh() {
      // 每 30 秒检查一次是否有新数据
      this.autoRefreshInterval = setInterval(() => {
        console.log('🔍 检查新的提交...')
        this.loadData(true) // silent mode
      }, 30000) // 30秒
    },
    stopAutoRefresh() {
      if (this.autoRefreshInterval) {
        clearInterval(this.autoRefreshInterval)
        this.autoRefreshInterval = null
      }
    },
    toggleExpand(hash) {
      this.expandedHash = this.expandedHash === hash ? null : hash
    },
    async openCommitFileDiff(commit, file) {
      this.showFileDiffModal = true
      this.diffLoading = true
      this.selectedDiffTitle = `${file.path} (${commit.hash})`
      this.selectedDiffContent = ''
      this.selectedDiffError = ''
      this.selectedDiffStats = null

      try {
        const path = encodeURIComponent(file.path)
        const commitHash = encodeURIComponent(commit.fullHash || commit.hash)
        const data = await api.get(`/git/commit-file-diff?path=${path}&commit=${commitHash}`)
        this.selectedDiffContent = data.diff || '该文件在此提交中没有可显示的文本差异'
        this.selectedDiffStats = data.stats || { insertions: 0, deletions: 0 }
      } catch (e) {
        this.selectedDiffError = e.message
      } finally {
        this.diffLoading = false
      }
    },
    closeFileDiffModal() {
      this.showFileDiffModal = false
      this.diffLoading = false
      this.selectedDiffTitle = ''
      this.selectedDiffContent = ''
      this.selectedDiffError = ''
      this.selectedDiffStats = null
    },
    formatDate(dateStr) {
      const d = new Date(dateStr)
      const now = new Date()
      const diff = now - d
      const mins = Math.floor(diff / 60000)
      const hours = Math.floor(diff / 3600000)
      const days = Math.floor(diff / 86400000)

      if (mins < 1) return '刚刚'
      if (mins < 60) return `${mins} 分钟前`
      if (hours < 24) return `${hours} 小时前`
      if (days < 7) return `${days} 天前`

      return d.toLocaleDateString('zh-CN', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
      })
    },
    formatNum(n) {
      if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
      return n.toString()
    },
    typeIcon(type) {
      const icons = {
        '新功能': '✨', '更新': '🔄', '修复': '🐛',
        '文档': '📝', '配置': '⚙️', '样式': '🎨',
        '重构': '♻️', '移除': '🗑️', '其他': '📦'
      }
      return icons[type] || '📦'
    },
    fileIcon(status) {
      const icons = { added: '🟢', modified: '🟡', deleted: '🔴', renamed: '🔵' }
      return icons[status] || '⚪'
    },
    barWidth(ins, del) {
      const total = ins + del
      if (total === 0) return { add: '0%', del: '0%' }
      return {
        add: Math.round((ins / total) * 100) + '%',
        del: Math.round((del / total) * 100) + '%'
      }
    }
  },
  mounted() {
    this.loadData()
    this.startAutoRefresh()
  },
  beforeUnmount() {
    this.stopAutoRefresh()
  }
}
</script>

<style scoped>
.git-log-page {
  animation: fadeIn 0.4s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.log-header {
  margin-bottom: 20px;
}

.log-header h2 {
  margin: 0 0 8px;
  color: #333;
  font-size: 1.4em;
}

.log-subtitle {
  color: #666;
  font-size: 0.9em;
  margin: 0;
}

/* === 统计卡片 === */
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 20px;
}

.stat-card {
  background: white;
  border-radius: 10px;
  padding: 18px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid #e5e7eb;
}

.stat-number {
  font-size: 1.8em;
  font-weight: 800;
  color: #333;
  line-height: 1;
  margin-bottom: 6px;
}

.stat-number.add { color: #10b981; }
.stat-number.del { color: #ef4444; }

.stat-label {
  font-size: 0.8em;
  color: #999;
  font-weight: 600;
}

/* === 筛选按钮 === */
.filter-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.filter-btn {
  padding: 8px 16px;
  border: 2px solid #e5e7eb;
  background: white;
  border-radius: 20px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.85em;
  color: #666;
  transition: all 0.3s;
}

.filter-btn:hover {
  border-color: #3b82f6;
  color: #3b82f6;
}

.filter-btn.active {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

/* === 时间线 === */
.timeline {
  position: relative;
  padding-left: 40px;
}

.timeline::before {
  content: '';
  position: absolute;
  left: 15px;
  top: 0;
  bottom: 0;
  width: 3px;
  background: linear-gradient(to bottom, #3b82f6, #8b5cf6, #e5e7eb);
  border-radius: 2px;
}

.timeline-item {
  position: relative;
  margin-bottom: 20px;
}

.timeline-dot {
  position: absolute;
  left: -33px;
  top: 16px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: white;
  border: 3px solid #3b82f6;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
}

.type-新功能 .timeline-dot { border-color: #10b981; }
.type-更新 .timeline-dot { border-color: #3b82f6; }
.type-修复 .timeline-dot { border-color: #f59e0b; }
.type-文档 .timeline-dot { border-color: #8b5cf6; }
.type-配置 .timeline-dot { border-color: #6b7280; }
.type-样式 .timeline-dot { border-color: #ec4899; }

.dot-icon {
  font-size: 0.75em;
}

.timeline-card {
  background: white;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  padding: 16px 20px;
  cursor: pointer;
  transition: all 0.2s;
}

.timeline-card:hover {
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.1);
  border-color: #d1d5db;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 10px;
}

.card-main {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.commit-type-tag {
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 0.75em;
  font-weight: 700;
  white-space: nowrap;
  flex-shrink: 0;
}

.tag-新功能 { background: #d1fae5; color: #065f46; }
.tag-更新 { background: #dbeafe; color: #1e40af; }
.tag-修复 { background: #fef3c7; color: #92400e; }
.tag-文档 { background: #ede9fe; color: #5b21b6; }
.tag-配置 { background: #f3f4f6; color: #374151; }
.tag-样式 { background: #fce7f3; color: #9d174d; }
.tag-其他 { background: #f3f4f6; color: #6b7280; }

.commit-subject {
  font-weight: 600;
  color: #333;
  font-size: 0.95em;
  line-height: 1.4;
}

.card-meta {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-shrink: 0;
}

.commit-hash {
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 0.8em;
  color: #3b82f6;
  background: #eff6ff;
  padding: 2px 8px;
  border-radius: 4px;
}

.commit-date {
  font-size: 0.8em;
  color: #999;
  white-space: nowrap;
}

/* === 变更统计条 === */
.stats-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.8em;
  color: #666;
}

.stat-files { color: #666; }
.stat-add { color: #10b981; font-weight: 700; }
.stat-del { color: #ef4444; font-weight: 700; }

.change-bar {
  flex: 1;
  height: 6px;
  background: #f3f4f6;
  border-radius: 3px;
  display: flex;
  overflow: hidden;
  max-width: 200px;
}

.bar-add {
  background: #10b981;
  height: 100%;
  transition: width 0.3s;
}

.bar-del {
  background: #ef4444;
  height: 100%;
  transition: width 0.3s;
}

/* === 展开详情 === */
.card-detail {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid #f0f0f0;
  animation: slideDown 0.2s ease;
}

@keyframes slideDown {
  from { opacity: 0; max-height: 0; }
  to { opacity: 1; max-height: 1000px; }
}

.commit-body {
  color: #555;
  font-size: 0.9em;
  line-height: 1.6;
  margin: 0 0 14px;
  white-space: pre-wrap;
  background: #f9fafb;
  padding: 12px;
  border-radius: 6px;
}

.file-list {
  margin-bottom: 12px;
}

.file-list-header {
  font-weight: 700;
  font-size: 0.85em;
  color: #333;
  margin-bottom: 8px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 10px;
  font-size: 0.85em;
  border-radius: 4px;
  margin-bottom: 2px;
}

.file-item.file-added { background: #f0fdf4; }
.file-item.file-modified { background: #fffbeb; }
.file-item.file-deleted { background: #fef2f2; }

.file-status-icon { font-size: 0.7em; }

.file-path {
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 0.9em;
  color: #555;
  word-break: break-all;
  flex: 1;
}

.file-diff-btn {
  border: 1px solid #dbeafe;
  background: #eff6ff;
  color: #1d4ed8;
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 0.75em;
  cursor: pointer;
}

.file-diff-btn:hover {
  background: #dbeafe;
}

.commit-meta-detail {
  display: flex;
  gap: 16px;
  font-size: 0.8em;
  color: #999;
  flex-wrap: wrap;
}

.expand-hint {
  text-align: center;
  font-size: 0.75em;
  color: #bbb;
  margin-top: 8px;
}

/* === 底部 === */
.loading, .error-msg {
  text-align: center;
  padding: 40px;
  color: #999;
  font-size: 0.95em;
}

.error-msg { color: #ef4444; }

.generated-at {
  text-align: center;
  font-size: 0.8em;
  color: #ccc;
  margin-top: 30px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.auto-refresh-hint {
  color: #667eea;
  font-size: 0.75em;
  margin-top: 6px;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

.diff-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
  padding: 12px;
}

.diff-modal {
  background: #fff;
  border-radius: 10px;
  width: min(1200px, 96vw);
  max-height: 88vh;
  border: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
}

.diff-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid #e5e7eb;
  gap: 8px;
}

.diff-modal-header h3 {
  margin: 0;
  font-size: 0.9em;
  color: #111827;
  word-break: break-all;
}

.diff-close-btn {
  border: none;
  background: transparent;
  font-size: 1.1em;
  color: #6b7280;
  cursor: pointer;
}

.diff-modal-body {
  padding: 10px 14px 14px;
  overflow: auto;
}

.diff-stats {
  margin-bottom: 8px;
  display: flex;
  gap: 12px;
  font-size: 0.82em;
}

.diff-code {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 0.78em;
  line-height: 1.45;
  color: #1f2937;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 10px;
}

/* === 响应式 === */
@media (max-width: 768px) {
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .stat-card {
    padding: 14px;
  }

  .stat-number {
    font-size: 1.4em;
  }

  .timeline {
    padding-left: 30px;
  }

  .timeline::before {
    left: 10px;
  }

  .timeline-dot {
    left: -27px;
    width: 22px;
    height: 22px;
  }

  .dot-icon {
    font-size: 0.6em;
  }

  .timeline-card {
    padding: 12px 14px;
  }

  .card-header {
    flex-direction: column;
    gap: 6px;
  }

  .card-meta {
    gap: 8px;
  }

  .filter-row {
    overflow-x: auto;
    flex-wrap: nowrap;
    -webkit-overflow-scrolling: touch;
    padding-bottom: 4px;
  }

  .filter-btn {
    white-space: nowrap;
    flex-shrink: 0;
  }

  .commit-meta-detail {
    flex-direction: column;
    gap: 4px;
  }

  .change-bar {
    max-width: 120px;
  }

  .file-item {
    flex-wrap: wrap;
  }

  .file-diff-btn {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .log-header h2 {
    font-size: 1.1em;
  }

  .stats-row {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .stat-card {
    padding: 10px;
  }

  .stat-number {
    font-size: 1.2em;
  }

  .stat-label {
    font-size: 0.7em;
  }

  .timeline {
    padding-left: 24px;
  }

  .timeline::before {
    left: 6px;
    width: 2px;
  }

  .timeline-dot {
    left: -23px;
    width: 18px;
    height: 18px;
    border-width: 2px;
  }

  .dot-icon {
    font-size: 0.5em;
  }

  .timeline-card {
    padding: 10px 12px;
  }

  .commit-subject {
    font-size: 0.88em;
  }

  .commit-hash {
    font-size: 0.7em;
  }

  .stats-bar {
    font-size: 0.75em;
    flex-wrap: wrap;
  }

  .file-item {
    font-size: 0.8em;
  }
}
</style>
