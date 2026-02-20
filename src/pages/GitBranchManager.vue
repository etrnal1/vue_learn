<template>
  <div class="git-manager">
    <div class="page-header">
      <h1>🌿 Git 分支管理</h1>
      <p class="subtitle">通过可视化界面轻松管理 Git 分支</p>
    </div>

    <!-- 当前状态卡片 -->
    <div class="status-card">
      <div class="status-item">
        <div class="status-label">当前分支</div>
        <div class="status-value current-branch">
          <span class="branch-icon">🔵</span>
          {{ currentBranch || '加载中...' }}
        </div>
      </div>
      <div class="status-item">
        <div class="status-label">未提交修改</div>
        <div class="status-value" :class="{ 'has-changes': gitStatus.hasChanges }">
          {{ gitStatus.count }} 个文件
        </div>
      </div>
      <div class="status-actions">
        <button @click="refreshData" class="btn btn-refresh">
          <span v-if="!loading">🔄 刷新</span>
          <span v-else>⏳ 刷新中...</span>
        </button>
        <button
          v-if="gitStatus.hasChanges"
          @click="stashChanges"
          class="btn btn-stash"
          title="暂存当前修改"
        >
          📦 暂存修改
        </button>
      </div>
    </div>

    <!-- 创建新分支 -->
    <div class="create-branch-section card">
      <h2>➕ 创建新分支</h2>
      <div class="create-form">
        <input
          v-model="newBranchName"
          type="text"
          placeholder="输入分支名（如: feature/new-feature）"
          class="branch-input"
          @keyup.enter="createBranch"
        />
        <label class="checkbox-label">
          <input type="checkbox" v-model="checkoutAfterCreate" />
          <span>创建后立即切换</span>
        </label>
        <button @click="createBranch" class="btn btn-primary" :disabled="!newBranchName">
          创建分支
        </button>
      </div>
      <div class="naming-tips">
        <strong>建议命名规范：</strong>
        <span class="tip">feature/功能名</span>
        <span class="tip">fix/bug名</span>
        <span class="tip">dev/开发名</span>
      </div>
    </div>

    <!-- 分支列表 -->
    <div class="branches-section card">
      <h2>📋 分支列表</h2>

      <div class="branch-filter">
        <button
          @click="filterType = 'all'"
          class="filter-btn"
          :class="{ active: filterType === 'all' }"
        >
          全部 ({{ branches.length }})
        </button>
        <button
          @click="filterType = 'local'"
          class="filter-btn"
          :class="{ active: filterType === 'local' }"
        >
          本地 ({{ localBranches.length }})
        </button>
        <button
          @click="filterType = 'remote'"
          class="filter-btn"
          :class="{ active: filterType === 'remote' }"
        >
          远程 ({{ remoteBranches.length }})
        </button>
      </div>

      <div class="branches-list">
        <div
          v-for="branch in filteredBranches"
          :key="branch.fullName"
          class="branch-item"
          :class="{ current: branch.isCurrent, remote: branch.isRemote }"
        >
          <div class="branch-info">
            <span class="branch-icon" v-if="branch.isCurrent">⭐</span>
            <span class="branch-icon" v-else-if="branch.isRemote">🌐</span>
            <span class="branch-icon" v-else>🔹</span>
            <span class="branch-name">{{ branch.name }}</span>
            <span v-if="branch.isCurrent" class="current-badge">当前</span>
          </div>

          <div class="branch-actions" v-if="!branch.isRemote">
            <button
              v-if="!branch.isCurrent"
              @click="checkoutBranch(branch.name)"
              class="btn btn-sm btn-checkout"
              title="切换到此分支"
            >
              切换
            </button>
            <button
              @click="viewCommits(branch.name)"
              class="btn btn-sm btn-view"
              title="查看提交历史"
            >
              历史
            </button>
            <button
              @click="viewFiles(branch.name)"
              class="btn btn-sm btn-files"
              title="查看文件变更"
            >
              文件
            </button>
            <button
              v-if="!branch.isCurrent && branch.name !== 'main' && branch.name !== 'master'"
              @click="confirmMerge(branch.name)"
              class="btn btn-sm btn-merge"
              title="合并到当前分支"
            >
              合并
            </button>
            <button
              v-if="!branch.isCurrent && branch.name !== 'main' && branch.name !== 'master'"
              @click="confirmDelete(branch.name)"
              class="btn btn-sm btn-delete"
              title="删除分支"
            >
              删除
            </button>
          </div>
        </div>

        <div v-if="filteredBranches.length === 0" class="empty-state">
          暂无{{ filterType === 'local' ? '本地' : filterType === 'remote' ? '远程' : '' }}分支
        </div>
      </div>
    </div>

    <!-- 提交历史弹窗 -->
    <div v-if="showCommits" class="modal-overlay" @click="showCommits = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>📝 {{ selectedBranch }} 的提交历史</h3>
          <button @click="showCommits = false" class="btn-close">✕</button>
        </div>
        <div class="commits-list">
          <div v-for="(commit, idx) in commits" :key="idx" class="commit-item">
            <code>{{ commit.raw }}</code>
          </div>
        </div>
      </div>
    </div>

    <!-- 合并确认弹窗 -->
    <div v-if="showMergeDialog" class="modal-overlay" @click="showMergeDialog = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>⚠️ 确认合并</h3>
          <button @click="showMergeDialog = false" class="btn-close">✕</button>
        </div>
        <div class="modal-body">
          <p>
            将 <strong class="branch-highlight">{{ mergeBranch }}</strong> 合并到
            <strong class="branch-highlight">{{ currentBranch }}</strong>？
          </p>
          <p class="warning-text">合并后无法自动撤销，请确保已备份重要内容。</p>
        </div>
        <div class="modal-actions">
          <button @click="showMergeDialog = false" class="btn btn-cancel">取消</button>
          <button @click="mergeBranch && mergeBranchConfirmed(mergeBranch)" class="btn btn-primary">
            确认合并
          </button>
        </div>
      </div>
    </div>

    <!-- 删除确认弹窗 -->
    <div v-if="showDeleteDialog" class="modal-overlay" @click="showDeleteDialog = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>⚠️ 确认删除</h3>
          <button @click="showDeleteDialog = false" class="btn-close">✕</button>
        </div>
        <div class="modal-body">
          <p>
            确定要删除分支 <strong class="branch-highlight">{{ deleteBranch }}</strong>？
          </p>
          <p class="warning-text">删除后无法恢复，请谨慎操作。</p>
          <label class="checkbox-label">
            <input type="checkbox" v-model="forceDelete" />
            <span>强制删除（即使未合并）</span>
          </label>
        </div>
        <div class="modal-actions">
          <button @click="showDeleteDialog = false" class="btn btn-cancel">取消</button>
          <button @click="deleteBranch && deleteBranchConfirmed(deleteBranch)" class="btn btn-danger">
            确认删除
          </button>
        </div>
      </div>
    </div>

    <!-- 文件列表弹窗 -->
    <div v-if="showFilesModal" class="modal-overlay" @click="closeFilesModal">
      <div class="modal-content modal-files" @click.stop>
        <div class="modal-header">
          <h3>📁 {{ selectedBranchForFiles }} 的文件变更</h3>
          <button @click="closeFilesModal" class="btn-close">✕</button>
        </div>
        <div class="modal-body">
          <!-- 加载状态 -->
          <div v-if="loadingFiles" class="loading-state">⏳ 加载中...</div>

          <!-- 空状态 -->
          <div v-else-if="branchFiles.length === 0" class="empty-state">
            该分支相对于 main 没有文件变更
          </div>

          <!-- 文件列表 -->
          <div v-else class="file-list">
            <div class="file-list-header">
              共 {{ branchFiles.length }} 个文件变更：
            </div>
            <div
              v-for="file in branchFiles"
              :key="file.path"
              class="file-item"
              :class="'file-' + file.status"
              @click="viewFileDetail(file)"
            >
              <span class="file-status-icon">{{ getFileStatusIcon(file.status) }}</span>
              <span class="file-path">{{ file.path }}</span>
              <span class="file-status-badge">{{ getFileStatusText(file.status) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 文件详情弹窗 -->
    <div v-if="showFileDetail" class="modal-overlay" @click="closeFileDetail">
      <div class="modal-content modal-file-detail" @click.stop>
        <div class="modal-header">
          <div class="file-detail-title">
            <span class="file-status-icon">{{ getFileStatusIcon(selectedFile?.status) }}</span>
            <h3>{{ selectedFile?.path }}</h3>
          </div>
          <button @click="closeFileDetail" class="btn-close">✕</button>
        </div>

        <!-- Tab 切换 -->
        <div class="view-mode-tabs">
          <button @click="fileViewMode = 'content'" class="tab-btn" :class="{ active: fileViewMode === 'content' }">
            📄 文件内容
          </button>
          <button @click="fileViewMode = 'diff'" class="tab-btn" :class="{ active: fileViewMode === 'diff' }">
            🔄 变更对比
          </button>
        </div>

        <div class="modal-body file-content-body">
          <div v-if="loadingFileContent" class="loading-state">⏳ 加载中...</div>

          <!-- 内容视图 -->
          <div v-else-if="fileViewMode === 'content'" class="content-view">
            <pre class="code-block"><code>{{ fileContent }}</code></pre>
          </div>

          <!-- Diff 视图 -->
          <div v-else class="diff-view">
            <div v-if="fileDiffStats" class="diff-stats">
              <span class="stat-add">+{{ fileDiffStats.insertions }} 行</span>
              <span class="stat-del">-{{ fileDiffStats.deletions }} 行</span>
            </div>
            <pre class="code-block diff-block"><code>{{ fileDiff }}</code></pre>
          </div>
        </div>
      </div>
    </div>

    <!-- 提示消息 -->
    <div v-if="message" class="toast" :class="message.type">
      {{ message.text }}
    </div>
  </div>
</template>

<script>
import { api } from '../utils/api.js'

export default {
  name: 'GitBranchManager',
  data() {
    return {
      branches: [],
      currentBranch: '',
      gitStatus: {
        hasChanges: false,
        count: 0,
        files: []
      },
      newBranchName: '',
      checkoutAfterCreate: true,
      filterType: 'all', // 'all', 'local', 'remote'
      loading: false,
      showCommits: false,
      selectedBranch: '',
      commits: [],
      showMergeDialog: false,
      mergeBranch: null,
      showDeleteDialog: false,
      deleteBranch: null,
      forceDelete: false,
      message: null,

      // 文件浏览相关
      showFilesModal: false,
      selectedBranchForFiles: '',
      branchFiles: [],
      loadingFiles: false,

      // 文件详情相关
      showFileDetail: false,
      selectedFile: null,
      fileContent: '',
      fileDiff: '',
      fileDiffStats: null,
      loadingFileContent: false,
      fileViewMode: 'content' // 'content' 或 'diff'
    }
  },
  computed: {
    localBranches() {
      return this.branches.filter(b => !b.isRemote)
    },
    remoteBranches() {
      return this.branches.filter(b => b.isRemote)
    },
    filteredBranches() {
      if (this.filterType === 'local') return this.localBranches
      if (this.filterType === 'remote') return this.remoteBranches
      return this.branches
    }
  },
  methods: {
    async refreshData() {
      this.loading = true
      try {
        await Promise.all([
          this.fetchBranches(),
          this.fetchCurrentBranch(),
          this.fetchGitStatus()
        ])
      } finally {
        this.loading = false
      }
    },

    async fetchBranches() {
      try {
        const data = await api.get('/git/branches')
        this.branches = data.branches || []
      } catch (error) {
        this.showMessage('获取分支列表失败: ' + error.message, 'error')
      }
    },

    async fetchCurrentBranch() {
      try {
        const data = await api.get('/git/current-branch')
        this.currentBranch = data.currentBranch
      } catch (error) {
        this.showMessage('获取当前分支失败: ' + error.message, 'error')
      }
    },

    async fetchGitStatus() {
      try {
        const data = await api.get('/git/status')
        this.gitStatus = data
      } catch (error) {
        console.error('获取 Git 状态失败:', error)
      }
    },

    async createBranch() {
      if (!this.newBranchName.trim()) {
        this.showMessage('请输入分支名', 'warning')
        return
      }

      try {
        const data = await api.post('/git/create-branch', {
          branchName: this.newBranchName.trim(),
          checkout: this.checkoutAfterCreate
        })

        this.showMessage(data.message, 'success')
        this.newBranchName = ''
        await this.refreshData()
      } catch (error) {
        this.showMessage('创建分支失败: ' + error.message, 'error')
      }
    },

    async checkoutBranch(branchName) {
      if (this.gitStatus.hasChanges) {
        const confirm = window.confirm(
          `当前有 ${this.gitStatus.count} 个未提交的修改。\n\n切换分支前需要先提交或暂存这些修改。\n\n点击"确定"暂存修改，点击"取消"返回。`
        )
        if (!confirm) {
          return
        }
        try {
          await this.stashChanges()
        } catch (error) {
          this.showMessage('暂存失败，无法切换分支', 'error')
          return
        }
      }

      try {
        const data = await api.post('/git/checkout', { branchName })
        this.showMessage(data.message, 'success')
        await this.refreshData()
      } catch (error) {
        this.showMessage('切换分支失败: ' + error.message, 'error')
      }
    },

    async viewCommits(branchName) {
      this.selectedBranch = branchName
      this.showCommits = true

      try {
        const data = await api.get(`/git/branch-commits/${branchName}?limit=20`)
        this.commits = data.commits || []
      } catch (error) {
        this.showMessage('获取提交历史失败: ' + error.message, 'error')
      }
    },

    confirmMerge(branchName) {
      this.mergeBranch = branchName
      this.showMergeDialog = true
    },

    async mergeBranchConfirmed(branchName) {
      this.showMergeDialog = false

      try {
        const data = await api.post('/git/merge', {
          sourceBranch: branchName,
          targetBranch: this.currentBranch
        })

        this.showMessage(data.message, 'success')
        await this.refreshData()
      } catch (error) {
        this.showMessage('合并失败: ' + error.message, 'error')
      }
    },

    confirmDelete(branchName) {
      this.deleteBranch = branchName
      this.forceDelete = false
      this.showDeleteDialog = true
    },

    async deleteBranchConfirmed(branchName) {
      this.showDeleteDialog = false

      try {
        const data = await api.delete(`/git/branch/${branchName}?force=${this.forceDelete}`)
        this.showMessage(data.message, 'success')
        await this.refreshData()
      } catch (error) {
        this.showMessage(error.message, 'error')
      }
    },

    async stashChanges() {
      try {
        const data = await api.post('/git/stash', {
          message: `自动暂存 - ${new Date().toLocaleString()}`
        })
        this.showMessage(data.message, 'success')
        await this.refreshData()
      } catch (error) {
        this.showMessage('暂存失败: ' + error.message, 'error')
      }
    },

    showMessage(text, type = 'info') {
      this.message = { text, type }
      setTimeout(() => {
        this.message = null
      }, 4000)
    },

    async viewFiles(branchName) {
      this.selectedBranchForFiles = branchName
      this.showFilesModal = true
      this.branchFiles = []
      this.loadingFiles = true

      try {
        const data = await api.get(`/git/branch-files/${branchName}`)
        this.branchFiles = data.files || []
      } catch (error) {
        this.showMessage('获取文件列表失败: ' + error.message, 'error')
      } finally {
        this.loadingFiles = false
      }
    },

    closeFilesModal() {
      this.showFilesModal = false
      this.branchFiles = []
      this.selectedBranchForFiles = ''
    },

    async viewFileDetail(file) {
      this.selectedFile = file
      this.showFileDetail = true
      this.fileContent = ''
      this.fileDiff = ''
      this.fileDiffStats = null
      this.fileViewMode = 'content'
      this.loadingFileContent = true

      try {
        await Promise.all([
          this.loadFileContent(),
          this.loadFileDiff()
        ])
      } catch (error) {
        this.showMessage('加载文件详情失败: ' + error.message, 'error')
      } finally {
        this.loadingFileContent = false
      }
    },

    async loadFileContent() {
      try {
        const path = encodeURIComponent(this.selectedFile.path)
        const branch = encodeURIComponent(this.selectedBranchForFiles)
        const data = await api.get(`/git/file-content?path=${path}&branch=${branch}`)
        this.fileContent = data.content
      } catch (error) {
        this.fileContent = `错误: ${error.message}`
      }
    },

    async loadFileDiff() {
      try {
        const path = encodeURIComponent(this.selectedFile.path)
        const branch = encodeURIComponent(this.selectedBranchForFiles)
        const data = await api.get(`/git/file-diff?path=${path}&branch=${branch}`)
        this.fileDiff = data.diff
        this.fileDiffStats = data.stats
      } catch (error) {
        this.fileDiff = `错误: ${error.message}`
      }
    },

    closeFileDetail() {
      this.showFileDetail = false
      this.selectedFile = null
      this.fileContent = ''
      this.fileDiff = ''
      this.fileDiffStats = null
    },

    getFileStatusIcon(status) {
      const icons = {
        'added': '🟢',
        'modified': '🟡',
        'deleted': '🔴',
        'renamed': '🔵'
      }
      return icons[status] || '📄'
    },

    getFileStatusText(status) {
      const texts = {
        'added': '新增',
        'modified': '修改',
        'deleted': '删除',
        'renamed': '重命名'
      }
      return texts[status] || status
    }
  },

  mounted() {
    this.refreshData()
  }
}
</script>

<style scoped>
.git-manager {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  text-align: center;
  margin-bottom: 30px;
}

.page-header h1 {
  font-size: 2.5em;
  margin-bottom: 10px;
  background: var(--app-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.subtitle {
  color: var(--app-text-muted);
  font-size: 1.1em;
}

/* 状态卡片 */
.status-card {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 20px;
  padding: 20px;
  background: var(--app-card);
  border-radius: 12px;
  border: 2px solid var(--app-border);
  margin-bottom: 30px;
  box-shadow: 0 4px 12px var(--app-shadow-light);
}

.status-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.status-label {
  font-size: 0.85em;
  color: var(--app-text-muted);
  font-weight: 600;
}

.status-value {
  font-size: 1.3em;
  font-weight: 700;
  color: var(--app-text);
}

.current-branch {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--app-primary);
}

.has-changes {
  color: #f59e0b;
}

.status-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

/* 卡片 */
.card {
  background: var(--app-card);
  border-radius: 12px;
  border: 2px solid var(--app-border);
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 4px 12px var(--app-shadow-light);
}

.card h2 {
  margin-top: 0;
  margin-bottom: 20px;
  font-size: 1.5em;
  color: var(--app-text);
}

/* 创建分支表单 */
.create-form {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
  align-items: center;
}

.branch-input {
  flex: 1;
  min-width: 300px;
  padding: 12px 16px;
  border: 2px solid var(--app-border);
  border-radius: 8px;
  font-size: 1em;
  transition: all 0.3s;
  background: var(--app-card);
  color: var(--app-text);
}

.branch-input:focus {
  outline: none;
  border-color: var(--app-primary);
  box-shadow: 0 0 0 3px var(--app-shadow-light);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.95em;
  color: var(--app-text-secondary);
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  cursor: pointer;
}

.naming-tips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
  font-size: 0.9em;
  color: var(--app-text-muted);
}

.tip {
  padding: 4px 10px;
  background: var(--app-border);
  border-radius: 6px;
  font-family: monospace;
  font-size: 0.85em;
}

/* 分支过滤 */
.branch-filter {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.filter-btn {
  padding: 8px 16px;
  border: 2px solid var(--app-border);
  background: var(--app-card);
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  color: var(--app-text-secondary);
  transition: all 0.3s;
}

.filter-btn:hover {
  border-color: var(--app-primary);
  color: var(--app-primary);
}

.filter-btn.active {
  background: var(--app-gradient);
  border-color: transparent;
  color: white;
}

/* 分支列表 */
.branches-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.branch-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 18px;
  border: 2px solid var(--app-border);
  border-radius: 10px;
  transition: all 0.3s;
  background: var(--app-card);
}

.branch-item:hover {
  border-color: var(--app-primary);
  box-shadow: 0 2px 8px var(--app-shadow-light);
}

.branch-item.current {
  background: linear-gradient(to right, var(--app-primary), var(--app-primary-dark));
  border-color: transparent;
  color: white;
}

.branch-item.current .branch-name,
.branch-item.current .current-badge {
  color: white;
}

.branch-info {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.05em;
}

.branch-icon {
  font-size: 1.2em;
}

.branch-name {
  font-weight: 600;
  font-family: 'Courier New', monospace;
}

.current-badge {
  padding: 4px 10px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  font-size: 0.75em;
  font-weight: 700;
}

.branch-actions {
  display: flex;
  gap: 8px;
}

/* 按钮 */
.btn {
  padding: 10px 20px;
  border: 2px solid var(--app-border);
  background: var(--app-card);
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  color: var(--app-text-secondary);
  white-space: nowrap;
}

.btn:hover {
  border-color: var(--app-primary);
  color: var(--app-primary);
  transform: translateY(-1px);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--app-gradient);
  border-color: transparent;
  color: white;
}

.btn-primary:hover {
  box-shadow: 0 4px 12px var(--app-shadow);
  color: white;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 0.85em;
}

.btn-refresh {
  background: var(--app-primary);
  color: white;
  border-color: transparent;
}

.btn-stash {
  background: #f59e0b;
  color: white;
  border-color: transparent;
}

.btn-checkout {
  background: var(--app-primary);
  color: white;
  border-color: transparent;
}

.btn-view {
  background: #8b5cf6;
  color: white;
  border-color: transparent;
}

.btn-merge {
  background: #10b981;
  color: white;
  border-color: transparent;
}

.btn-delete,
.btn-danger {
  background: #ef4444;
  color: white;
  border-color: transparent;
}

.btn-cancel {
  background: var(--app-border);
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: var(--app-text-muted);
  font-style: italic;
}

/* 模态框 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: var(--app-card);
  border-radius: 16px;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 2px solid var(--app-border);
}

.modal-header h3 {
  margin: 0;
  color: var(--app-text);
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.5em;
  cursor: pointer;
  color: var(--app-text-muted);
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.3s;
}

.btn-close:hover {
  background: var(--app-border);
  color: var(--app-text);
}

.modal-body {
  padding: 24px;
}

.modal-body p {
  margin: 0 0 16px;
  color: var(--app-text);
}

.branch-highlight {
  color: var(--app-primary);
  font-family: monospace;
  font-size: 1.1em;
}

.warning-text {
  color: #f59e0b;
  font-size: 0.9em;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 16px 24px;
  border-top: 2px solid var(--app-border);
}

/* 提交历史 */
.commits-list {
  padding: 20px 24px;
  max-height: 500px;
  overflow-y: auto;
}

.commit-item {
  padding: 10px;
  margin-bottom: 8px;
  background: var(--app-border);
  border-radius: 6px;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
  color: var(--app-text);
  white-space: pre;
  overflow-x: auto;
}

/* 提示消息 */
.toast {
  position: fixed;
  bottom: 30px;
  right: 30px;
  padding: 16px 24px;
  border-radius: 10px;
  font-weight: 600;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  z-index: 2000;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    transform: translateX(400px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.toast.success {
  background: #10b981;
  color: white;
}

.toast.error {
  background: #ef4444;
  color: white;
}

.toast.warning {
  background: #f59e0b;
  color: white;
}

.toast.info {
  background: var(--app-primary);
  color: white;
}

/* 文件列表按钮 */
.btn-files {
  background: #f59e0b;
  color: white;
  border-color: transparent;
}

/* 文件列表弹窗 */
.modal-files {
  max-width: 600px;
}

.file-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.file-list-header {
  font-size: 0.95em;
  font-weight: 600;
  color: var(--app-text-secondary);
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 2px solid var(--app-border);
}

.file-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 2px solid var(--app-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  background: var(--app-card);
}

.file-item:hover {
  border-color: var(--app-primary);
  box-shadow: 0 2px 8px var(--app-shadow-light);
  transform: translateX(4px);
}

.file-status-icon {
  font-size: 1.2em;
  flex-shrink: 0;
}

.file-path {
  flex: 1;
  font-family: 'Courier New', monospace;
  font-size: 0.95em;
  color: var(--app-text);
  word-break: break-all;
}

.file-status-badge {
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.8em;
  font-weight: 600;
  color: white;
  white-space: nowrap;
}

.file-added .file-status-badge {
  background: #10b981;
}

.file-modified .file-status-badge {
  background: #f59e0b;
}

.file-deleted .file-status-badge {
  background: #ef4444;
}

.file-renamed .file-status-badge {
  background: #8b5cf6;
}

/* 文件详情弹窗 */
.modal-file-detail {
  max-width: 900px;
}

.file-detail-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.file-detail-title h3 {
  margin: 0;
  color: var(--app-text);
  word-break: break-all;
}

.view-mode-tabs {
  display: flex;
  gap: 8px;
  padding: 12px 24px;
  border-bottom: 2px solid var(--app-border);
  background: var(--app-border);
}

.tab-btn {
  padding: 8px 16px;
  border: none;
  background: transparent;
  color: var(--app-text-secondary);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  border-radius: 6px;
}

.tab-btn:hover {
  background: var(--app-card);
  color: var(--app-primary);
}

.tab-btn.active {
  background: var(--app-primary);
  color: white;
}

.file-content-body {
  padding: 0;
  max-height: 600px;
  overflow-y: auto;
}

.content-view,
.diff-view {
  padding: 20px 24px;
}

.code-block {
  margin: 0;
  padding: 16px;
  background: #1e293b;
  color: #e2e8f0;
  border-radius: 8px;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
  line-height: 1.5;
  overflow-x: auto;
  white-space: pre;
}

.code-block code {
  color: inherit;
  font-family: inherit;
}

.diff-stats {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--app-border);
}

.stat-add {
  color: #10b981;
  font-weight: 600;
}

.stat-del {
  color: #ef4444;
  font-weight: 600;
}

.loading-state {
  text-align: center;
  padding: 40px;
  color: var(--app-text-muted);
  font-style: italic;
}

/* 响应式 */
@media (max-width: 1024px) {
  .modal-file-detail {
    max-width: 95vw;
  }
}

@media (max-width: 768px) {
  .status-card {
    grid-template-columns: 1fr;
  }

  .create-form {
    flex-direction: column;
    align-items: stretch;
  }

  .branch-input {
    min-width: auto;
  }

  .branch-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .branch-actions {
    width: 100%;
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .modal-content {
    width: 95%;
  }

  .file-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .file-status-badge {
    margin-left: auto;
  }

  .file-content-body {
    max-height: 70vh;
  }

  .code-block {
    font-size: 0.8em;
  }

  .view-mode-tabs {
    padding: 8px 12px;
    gap: 4px;
  }

  .tab-btn {
    padding: 6px 12px;
    font-size: 0.9em;
  }
}
</style>
