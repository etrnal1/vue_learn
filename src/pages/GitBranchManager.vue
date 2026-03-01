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

    <div class="remote-ops-section card">
      <h2>☁️ 远程仓库操作</h2>
      <div class="remote-ops-row">
        <label class="remote-select-label">
          远程仓库
          <select v-model="selectedRemote" class="remote-select">
            <option v-for="remote in remotes" :key="remote" :value="remote">
              {{ remote }}
            </option>
          </select>
        </label>
        <button @click="fetchFromRemote(false)" class="btn btn-sm" :disabled="!selectedRemote">
          拉取最新
        </button>
        <button @click="fetchFromRemote(true)" class="btn btn-sm" :disabled="!selectedRemote">
          拉取并清理
        </button>
        <button @click="pushCurrentBranch" class="btn btn-sm btn-push" :disabled="!currentBranch || !selectedRemote">
          推送当前分支
        </button>
      </div>
    </div>

    <div class="commit-section card">
      <h2>✅ 本地提交</h2>
      <textarea
        v-model.trim="commitMessage"
        class="commit-message-input"
        rows="3"
        placeholder="输入提交说明（例如：feat: 增加分支管理提交能力）"
      />
      <div class="commit-tools">
        <label class="checkbox-label">
          <input type="checkbox" v-model="pushAfterCommit" :disabled="!selectedRemote || !currentBranch" />
          <span>提交后自动推送到 {{ selectedRemote || '远程仓库' }}</span>
        </label>
        <button
          @click="commitChanges"
          class="btn btn-primary"
          :disabled="!normalizedCommitMessage || selectedCommitCount === 0 || committing"
        >
          <span v-if="!committing">{{ pushAfterCommit ? '提交并推送' : '仅本地提交' }}</span>
          <span v-else>提交中...</span>
        </button>
      </div>
      <div v-if="gitStatus.files.length > 0" class="changed-files">
        <div class="changed-files-head">
          <span class="changed-files-label">选择提交文件 (已选 {{ selectedCommitCount }} / {{ gitStatus.files.length }})</span>
          <div class="changed-files-actions">
            <button class="btn btn-sm" @click="selectAllCommitFiles">全选</button>
            <button class="btn btn-sm" @click="clearSelectedCommitFiles">清空</button>
          </div>
        </div>
        <label
          v-for="file in gitStatus.files"
          :key="file.file"
          class="changed-file-item"
        >
          <input
            type="checkbox"
            :value="file.file"
            v-model="selectedCommitFiles"
          />
          <code>{{ file.status.trim() || 'M' }} {{ file.file }}</code>
        </label>
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
        <button @click="createBranch" class="btn btn-primary" :disabled="!normalizedNewBranchName">
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
      <div class="branch-filter-tools">
        <input
          v-model.trim="branchKeyword"
          type="text"
          class="branch-search-input"
          placeholder="搜索分支名（支持关键字）"
        />
        <span class="filter-summary">
          显示 {{ filteredBranches.length }} / {{ branches.length }} 个分支
        </span>
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
              @click="pushBranch(branch.name)"
              class="btn btn-sm btn-push"
              :disabled="!selectedRemote"
              title="推送到远程"
            >
              推送
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
          <div class="branch-actions" v-else>
            <button
              v-if="branch.name !== 'main' && branch.name !== 'master'"
              @click="deleteRemoteBranch(branch)"
              class="btn btn-sm btn-delete"
              title="删除远程分支"
            >
              删远程
            </button>
          </div>
        </div>

        <div v-if="filteredBranches.length === 0" class="empty-state">
          暂无{{ filterType === 'local' ? '本地' : filterType === 'remote' ? '远程' : '' }}分支
        </div>
      </div>
    </div>

    <div v-if="lastOperation" class="operation-result card" :class="lastOperation.type">
      <div class="operation-head">
        <strong>{{ lastOperation.title }}</strong>
        <span class="subtitle">{{ lastOperation.time }}</span>
      </div>
      <div class="operation-message">{{ lastOperation.message }}</div>
      <pre v-if="lastOperation.output" class="operation-output"><code>{{ lastOperation.output }}</code></pre>
      <div v-if="lastOperation.hint" class="operation-hint">提示：{{ lastOperation.hint }}</div>
    </div>

    <!-- 提交历史弹窗 -->
    <div v-if="showCommits" class="modal-overlay" @click="showCommits = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>📝 {{ selectedBranch }} 的提交历史</h3>
          <button @click="showCommits = false" class="btn-close">✕</button>
        </div>
        <div class="commits-list">
          <div v-if="commits.length === 0" class="empty-state">暂无提交记录</div>
          <div v-for="commit in commits" :key="commit.fullHash || commit.hash" class="commit-item pretty">
            <div class="commit-item-main">
              <span class="commit-hash-chip">{{ commit.hash || '-' }}</span>
              <span class="commit-subject-text">{{ commit.subject || commit.message || commit.raw }}</span>
            </div>
            <div class="commit-item-meta">
              <span>{{ commit.author || '未知作者' }}</span>
              <span>{{ formatDateTime(commit.date) }}</span>
              <span v-if="commit.stats">文件 {{ commit.stats.filesChanged || 0 }} / +{{ commit.stats.insertions || 0 }} -{{ commit.stats.deletions || 0 }}</span>
            </div>
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
          <div class="merge-preview-box">
            <div class="merge-preview-head">
              <strong>冲突预检</strong>
              <div class="merge-preview-actions">
                <button @click="loadMergePreview" class="btn btn-sm">快速预检</button>
                <button @click="loadPreciseMergePreview" class="btn btn-sm">精确预检</button>
              </div>
            </div>
            <div v-if="loadingMergePreview" class="loading-state">⏳ 正在检测...</div>
            <div v-else-if="mergePreviewError" class="warning-text">{{ mergePreviewError }}</div>
            <div v-else-if="mergePreview" class="merge-preview-content">
              <p>
                可能冲突文件 <strong>{{ mergePreview.potentialConflictCount }}</strong> 个
                （基于 merge-base 的重叠改动预估）
              </p>
              <div v-if="mergePreview.potentialConflictCount > 0" class="merge-conflict-list">
                <code v-for="file in mergePreview.potentialConflicts.slice(0, 12)" :key="file">{{ file }}</code>
              </div>
              <p v-if="mergePreview.potentialConflictCount > 12" class="subtitle">
                仅展示前 12 个文件
              </p>
            </div>
            <div class="precise-preview-box">
              <div v-if="loadingPrecisePreview" class="loading-state">⏳ 精确预检中...</div>
              <div v-else-if="precisePreviewError" class="warning-text">{{ precisePreviewError }}</div>
              <div v-else-if="precisePreview" class="merge-preview-content">
                <p>
                  精确结果：
                  <strong v-if="precisePreview.hasConflicts" class="warning-text">发现 {{ precisePreview.conflictCount }} 个冲突文件</strong>
                  <strong v-else>未发现冲突</strong>
                </p>
                <p class="subtitle">{{ precisePreview.message }}</p>
                <div v-if="precisePreview.hasConflicts" class="merge-conflict-list">
                  <button
                    v-for="file in precisePreview.conflictedFiles.slice(0, 12)"
                    :key="file"
                    class="conflict-file-btn"
                    @click="openConflictFileDiff(file)"
                  >
                    {{ file }}
                  </button>
                </div>
              </div>
            </div>
          </div>
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

    <!-- 冲突文件对比弹窗 -->
    <div v-if="showConflictDiffModal" class="modal-overlay" @click="closeConflictDiffModal">
      <div class="modal-content modal-file-detail" @click.stop>
        <div class="modal-header">
          <h3>🧩 冲突文件对比: {{ selectedConflictFile }}</h3>
          <button @click="closeConflictDiffModal" class="btn-close">✕</button>
        </div>
        <div class="modal-body file-content-body">
          <div v-if="loadingConflictDiff" class="loading-state">⏳ 加载中...</div>
          <div v-else>
            <div class="diff-stats" v-if="conflictDiffStats">
              <span class="stat-add">+{{ conflictDiffStats.insertions }} 行</span>
              <span class="stat-del">-{{ conflictDiffStats.deletions }} 行</span>
            </div>
            <pre class="code-block diff-block"><code>{{ conflictFileDiff }}</code></pre>
          </div>
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
            该分支没有修改任何文件
          </div>

          <!-- 文件列表 -->
          <div v-else class="file-list">
            <div class="file-list-header">
              该分支共 {{ totalCommitsInBranch }} 个提交，涉及 {{ branchFiles.length }} 个文件
            </div>
            <div
              v-for="file in branchFiles"
              :key="file.path"
              class="file-item file-history"
              @click="viewFileDetail(file)"
            >
              <div class="file-path">{{ file.path }}</div>
              <div class="file-stats">
                <span class="modify-count" :title="`在该分支上被修改 ${file.modifyCount} 次`">
                  🔄 {{ file.modifyCount }}次
                </span>
                <span class="last-modified" :title="`最后修改：${file.lastModifiedDate}`">
                  🕒 {{ formatDate(file.lastModifiedDate) }}
                </span>
                <span class="last-author" :title="`最后修改者：${file.lastModifiedBy}`">
                  👤 {{ file.lastModifiedBy }}
                </span>
              </div>
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
      remotes: [],
      selectedRemote: 'origin',
      currentBranch: '',
      gitStatus: {
        hasChanges: false,
        count: 0,
        files: []
      },
      newBranchName: '',
      branchKeyword: '',
      commitMessage: '',
      selectedCommitFiles: [],
      pushAfterCommit: false,
      committing: false,
      checkoutAfterCreate: true,
      filterType: 'all', // 'all', 'local', 'remote'
      loading: false,
      showCommits: false,
      selectedBranch: '',
      commits: [],
      showMergeDialog: false,
      mergeBranch: null,
      mergePreview: null,
      loadingMergePreview: false,
      mergePreviewError: '',
      precisePreview: null,
      loadingPrecisePreview: false,
      precisePreviewError: '',
      precisePreviewCache: {},
      showDeleteDialog: false,
      deleteBranch: null,
      forceDelete: false,
      lastOperation: null,
      message: null,

      // 文件浏览相关
      showFilesModal: false,
      selectedBranchForFiles: '',
      branchFiles: [],
      loadingFiles: false,
      totalCommitsInBranch: 0,

      // 文件详情相关
      showFileDetail: false,
      selectedFile: null,
      fileContent: '',
      fileDiff: '',
      fileDiffStats: null,
      loadingFileContent: false,
      fileViewMode: 'content', // 'content' 或 'diff'

      // 冲突文件对比
      showConflictDiffModal: false,
      selectedConflictFile: '',
      conflictFileDiff: '',
      conflictDiffStats: null,
      loadingConflictDiff: false
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
      let list = this.branches

      if (this.filterType === 'local') list = this.localBranches
      if (this.filterType === 'remote') list = this.remoteBranches

      if (!this.branchKeyword) return list
      const keyword = this.branchKeyword.toLowerCase()
      return list.filter(branch => branch.name.toLowerCase().includes(keyword))
    },
    normalizedNewBranchName() {
      return this.newBranchName.trim()
    },
    normalizedCommitMessage() {
      return this.commitMessage.trim()
    },
    selectedCommitCount() {
      return this.selectedCommitFiles.length
    }
  },
  methods: {
    isValidBranchName(branchName) {
      const pattern = /^[A-Za-z0-9._/-]+$/
      return pattern.test(branchName) &&
        !branchName.startsWith('-') &&
        !branchName.includes('..') &&
        !branchName.includes('//') &&
        !branchName.endsWith('/') &&
        !branchName.endsWith('.')
    },
    encodeRef(refName) {
      return encodeURIComponent(refName)
    },
    async refreshData() {
      this.loading = true
      try {
        await Promise.all([
          this.fetchBranches(),
          this.fetchRemotes(),
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
    async fetchRemotes() {
      try {
        const data = await api.get('/git/remotes')
        this.remotes = data.remotes || []
        if (!this.selectedRemote || !this.remotes.includes(this.selectedRemote)) {
          this.selectedRemote = data.defaultRemote || this.remotes[0] || ''
        }
      } catch (error) {
        this.showMessage('获取远程仓库失败: ' + error.message, 'error')
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
        const available = new Set((this.gitStatus.files || []).map((item) => item.file))
        const currentSelected = this.selectedCommitFiles.filter((item) => available.has(item))
        this.selectedCommitFiles = currentSelected.length > 0
          ? currentSelected
          : (this.gitStatus.files || []).map((item) => item.file)
      } catch (error) {
        console.error('获取 Git 状态失败:', error)
      }
    },
    selectAllCommitFiles() {
      this.selectedCommitFiles = (this.gitStatus.files || []).map((item) => item.file)
    },
    clearSelectedCommitFiles() {
      this.selectedCommitFiles = []
    },

    async createBranch() {
      const branchName = this.normalizedNewBranchName

      if (!branchName) {
        this.showMessage('请输入分支名', 'warning')
        return
      }

      if (!this.isValidBranchName(branchName)) {
        this.showMessage('分支名格式不正确，请使用字母/数字/._-/ 且避免连续斜杠', 'warning')
        return
      }

      if (this.branches.some(branch => branch.name === branchName)) {
        this.showMessage('分支已存在，请更换名称', 'warning')
        return
      }

      try {
        const data = await api.post('/git/create-branch', {
          branchName,
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
        const data = await api.get(`/git/history?ref=${this.encodeRef(branchName)}&limit=30`)
        this.commits = data.commits || []
      } catch (error) {
        this.showMessage('获取提交历史失败: ' + error.message, 'error')
        this.commits = []
      }
    },

    confirmMerge(branchName) {
      this.mergeBranch = branchName
      this.showMergeDialog = true
      this.mergePreview = null
      this.mergePreviewError = ''
      this.precisePreview = null
      this.precisePreviewError = ''
      this.loadMergePreview()
    },
    async loadMergePreview() {
      if (!this.mergeBranch || !this.currentBranch) return
      this.loadingMergePreview = true
      this.mergePreviewError = ''
      try {
        const sourceBranch = this.encodeRef(this.mergeBranch)
        const targetBranch = this.encodeRef(this.currentBranch)
        const data = await api.get(`/git/merge-preview?sourceBranch=${sourceBranch}&targetBranch=${targetBranch}`)
        this.mergePreview = data
      } catch (error) {
        this.mergePreview = null
        this.mergePreviewError = '预检失败: ' + error.message
      } finally {
        this.loadingMergePreview = false
      }
    },
    async loadPreciseMergePreview() {
      if (!this.mergeBranch || !this.currentBranch) return
      this.loadingPrecisePreview = true
      this.precisePreviewError = ''
      try {
        const cacheKey = `${this.mergeBranch}::${this.currentBranch}`
        const cached = this.precisePreviewCache[cacheKey]
        const now = Date.now()
        if (cached && now - cached.timestamp < 5 * 60 * 1000) {
          this.precisePreview = cached.data
          return
        }

        const sourceBranch = this.encodeRef(this.mergeBranch)
        const targetBranch = this.encodeRef(this.currentBranch)
        const data = await api.get(`/git/merge-preview-precise?sourceBranch=${sourceBranch}&targetBranch=${targetBranch}`)
        this.precisePreview = data
        this.precisePreviewCache[cacheKey] = {
          timestamp: now,
          data
        }
      } catch (error) {
        this.precisePreview = null
        this.precisePreviewError = '精确预检失败: ' + error.message
      } finally {
        this.loadingPrecisePreview = false
      }
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
        const data = await api.delete(`/git/branch/${this.encodeRef(branchName)}?force=${this.forceDelete}`)
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
    getRemoteFromBranch(branch) {
      const match = (branch.fullName || '').match(/^remotes\/([^/]+)\//)
      return match ? match[1] : this.selectedRemote
    },
    async fetchFromRemote(prune = false) {
      if (!this.selectedRemote) {
        this.showMessage('请先选择远程仓库', 'warning')
        return
      }
      try {
        const data = await api.post('/git/fetch', {
          remote: this.selectedRemote,
          prune
        })
        this.showMessage(data.message, 'success')
        this.setOperationResult({
          type: 'success',
          title: prune ? '拉取并清理成功' : '拉取成功',
          message: data.message,
          output: data.output
        })
        await this.refreshData()
      } catch (error) {
        this.showMessage('拉取失败: ' + error.message, 'error')
        this.setOperationResult({
          type: 'error',
          title: prune ? '拉取并清理失败' : '拉取失败',
          message: error.message,
          output: error.details?.output || '',
          hint: error.details?.hint || ''
        })
      }
    },
    async pushBranch(branchName) {
      if (!this.selectedRemote) {
        this.showMessage('请先选择远程仓库', 'warning')
        return
      }
      try {
        const data = await api.post('/git/push', {
          remote: this.selectedRemote,
          branchName
        })
        this.showMessage(data.message, 'success')
        this.setOperationResult({
          type: 'success',
          title: '推送成功',
          message: data.message,
          output: data.output
        })
        await this.refreshData()
      } catch (error) {
        this.showMessage('推送失败: ' + error.message, 'error')
        this.setOperationResult({
          type: 'error',
          title: '推送失败',
          message: error.message,
          output: error.details?.output || '',
          hint: error.details?.hint || ''
        })
      }
    },
    async pushCurrentBranch() {
      if (!this.currentBranch) {
        this.showMessage('当前分支为空，无法推送', 'warning')
        return
      }
      await this.pushBranch(this.currentBranch)
    },
    async commitChanges() {
      const message = this.normalizedCommitMessage

      if (!message) {
        this.showMessage('请输入提交说明', 'warning')
        return
      }
      if (!this.gitStatus.hasChanges) {
        this.showMessage('当前没有可提交的变更', 'warning')
        return
      }
      if (this.selectedCommitFiles.length === 0) {
        this.showMessage('请至少选择一个文件再提交', 'warning')
        return
      }

      this.committing = true
      try {
        const commitRes = await api.post('/git/commit', {
          message,
          files: this.selectedCommitFiles
        })
        this.showMessage(commitRes.message, 'success')
        this.setOperationResult({
          type: 'success',
          title: '本地提交成功',
          message: commitRes.message,
          output: commitRes.output
        })
        this.commitMessage = ''

        if (this.pushAfterCommit) {
          if (!this.selectedRemote || !this.currentBranch) {
            this.showMessage('已本地提交，但缺少远程仓库或分支信息，未执行推送', 'warning')
          } else {
            await this.pushBranch(this.currentBranch)
          }
        } else {
          await this.refreshData()
        }
      } catch (error) {
        this.showMessage('提交失败: ' + error.message, 'error')
        this.setOperationResult({
          type: 'error',
          title: '本地提交失败',
          message: error.message,
          output: error.details?.output || '',
          hint: error.details?.hint || ''
        })
      } finally {
        this.committing = false
      }
    },
    async deleteRemoteBranch(branch) {
      const remote = this.getRemoteFromBranch(branch)
      if (!remote) {
        this.showMessage('无法识别远程仓库名称', 'error')
        return
      }

      const confirmed = window.confirm(`确定删除远程分支 ${remote}/${branch.name}？`)
      if (!confirmed) return

      try {
        const branchName = this.encodeRef(branch.name)
        const remoteName = this.encodeRef(remote)
        const data = await api.delete(`/git/remote-branch/${branchName}?remote=${remoteName}`)
        this.showMessage(data.message, 'success')
        await this.refreshData()
      } catch (error) {
        this.showMessage('删除远程分支失败: ' + error.message, 'error')
      }
    },
    async openConflictFileDiff(filePath) {
      if (!this.mergeBranch || !this.currentBranch) {
        this.showMessage('分支信息不完整，无法加载文件对比', 'warning')
        return
      }
      this.showConflictDiffModal = true
      this.selectedConflictFile = filePath
      this.conflictFileDiff = ''
      this.conflictDiffStats = null
      this.loadingConflictDiff = true
      try {
        const path = encodeURIComponent(filePath)
        const sourceBranch = this.encodeRef(this.mergeBranch)
        const targetBranch = this.encodeRef(this.currentBranch)
        const data = await api.get(`/git/compare-file?path=${path}&sourceBranch=${sourceBranch}&targetBranch=${targetBranch}`)
        this.conflictFileDiff = data.diff
        this.conflictDiffStats = data.stats
      } catch (error) {
        this.conflictFileDiff = `错误: ${error.message}`
      } finally {
        this.loadingConflictDiff = false
      }
    },
    closeConflictDiffModal() {
      this.showConflictDiffModal = false
      this.selectedConflictFile = ''
      this.conflictFileDiff = ''
      this.conflictDiffStats = null
    },

    showMessage(text, type = 'info') {
      this.message = { text, type }
      setTimeout(() => {
        this.message = null
      }, 4000)
    },
    setOperationResult(payload) {
      this.lastOperation = {
        ...payload,
        hint: payload.hint || '',
        time: new Date().toLocaleString('zh-CN')
      }
    },

    async viewFiles(branchName) {
      this.selectedBranchForFiles = branchName
      this.showFilesModal = true
      this.branchFiles = []
      this.loadingFiles = true
      this.totalCommitsInBranch = 0

      try {
        const data = await api.get(`/git/branch-files/${this.encodeRef(branchName)}?mode=history`)
        this.branchFiles = data.files || []
        this.totalCommitsInBranch = data.totalCommits || 0
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
    },

    formatDate(dateStr) {
      if (!dateStr) return ''
      const date = new Date(dateStr)
      const month = date.getMonth() + 1
      const day = date.getDate()
      const hour = String(date.getHours()).padStart(2, '0')
      const minute = String(date.getMinutes()).padStart(2, '0')
      return `${month}月${day}日 ${hour}:${minute}`
    },
    formatDateTime(dateStr) {
      if (!dateStr) return '时间未知'
      const date = new Date(dateStr)
      if (Number.isNaN(date.getTime())) return '时间未知'
      return date.toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
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
  padding: 6px;
}

.page-header {
  text-align: left;
  margin-bottom: 12px;
}

.page-header h1 {
  font-size: 1.42em;
  margin-bottom: 4px;
  color: var(--app-text);
}

.subtitle {
  color: var(--app-text-muted);
  font-size: 0.9em;
}

/* 状态卡片 */
.status-card {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 10px;
  padding: 14px;
  background: var(--app-card);
  border-radius: 16px;
  border: 1px solid var(--app-border);
  margin-bottom: 12px;
  box-shadow: var(--app-soft-shadow);
}

.status-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.status-label {
  font-size: 0.78em;
  color: var(--app-text-muted);
  font-weight: 600;
}

.status-value {
  font-size: 1.05em;
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
  gap: 8px;
  align-items: center;
}

/* 卡片 */
.card {
  background: var(--app-card);
  border-radius: 16px;
  border: 1px solid var(--app-border);
  padding: 14px;
  margin-bottom: 12px;
  box-shadow: var(--app-soft-shadow);
}

.card h2 {
  margin-top: 0;
  margin-bottom: 10px;
  font-size: 1.05em;
  color: var(--app-text);
}

.operation-result {
  border-left: 4px solid var(--app-primary);
}

.operation-result.success {
  border-left-color: #10b981;
}

.operation-result.error {
  border-left-color: #ef4444;
}

.operation-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
  margin-bottom: 8px;
}

.operation-message {
  color: var(--app-text);
  font-size: 0.92em;
  margin-bottom: 8px;
}

.operation-output {
  margin: 0;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid var(--app-border);
  background: var(--app-card-elevated);
  color: var(--app-text-secondary);
  max-height: 180px;
  overflow: auto;
  font-size: 0.8em;
}

.operation-hint {
  margin-top: 8px;
  font-size: 0.85em;
  color: #f59e0b;
}

.remote-ops-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.commit-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.commit-message-input {
  width: 100%;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  padding: 10px 12px;
  resize: vertical;
  background: var(--app-card-elevated);
  color: var(--app-text);
  font-size: 0.9em;
}

.commit-message-input:focus {
  outline: none;
  border-color: var(--app-primary);
  box-shadow: 0 0 0 3px var(--app-shadow-light);
}

.commit-tools {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
}

.changed-files {
  display: grid;
  gap: 8px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: var(--app-card-elevated);
  padding: 10px;
}

.changed-files-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.changed-files-actions {
  display: inline-flex;
  gap: 6px;
}

.changed-file-item {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.changed-file-item input[type="checkbox"] {
  width: 14px;
  height: 14px;
}

.changed-files-label {
  font-size: 0.88em;
  color: var(--app-text-muted);
}

.changed-file-item code {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 3px 8px;
  border-radius: 8px;
  background: var(--app-card);
  border: 1px solid var(--app-border);
  color: var(--app-text-secondary);
}

.remote-select-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.95em;
  color: var(--app-text-secondary);
}

.remote-select {
  min-width: 180px;
  padding: 8px 10px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: var(--app-card-elevated);
  color: var(--app-text);
}

.remote-select:focus {
  outline: none;
  border-color: var(--app-primary);
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
  padding: 10px 12px;
  border: 1px solid var(--app-border);
  border-radius: 11px;
  font-size: 0.9em;
  transition: all 0.2s;
  background: var(--app-card-elevated);
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
  font-size: 0.82em;
  color: var(--app-text-muted);
}

.tip {
  padding: 3px 8px;
  background: var(--app-card-elevated);
  border-radius: 999px;
  border: 1px solid var(--app-border);
  font-family: monospace;
  font-size: 0.75em;
}

/* 分支过滤 */
.branch-filter {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.branch-filter-tools {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.branch-search-input {
  min-width: 260px;
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid var(--app-border);
  background: var(--app-card-elevated);
  color: var(--app-text);
}

.branch-search-input:focus {
  outline: none;
  border-color: var(--app-primary);
}

.filter-summary {
  font-size: 0.9em;
  color: var(--app-text-muted);
}

.filter-btn {
  padding: 7px 12px;
  border: 1px solid var(--app-border);
  background: var(--app-card-elevated);
  border-radius: 10px;
  cursor: pointer;
  font-weight: 600;
  color: var(--app-text-secondary);
  transition: all 0.2s;
  font-size: 0.82em;
}

.filter-btn:hover {
  border-color: var(--app-primary);
  color: var(--app-primary);
}

.filter-btn.active {
  background: var(--app-shadow-light);
  border-color: var(--app-primary);
  color: var(--app-text);
  box-shadow: none;
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
  padding: 12px;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  transition: all 0.2s;
  background: var(--app-card-elevated);
}

.branch-item:hover {
  border-color: var(--app-primary);
  box-shadow: 0 2px 8px var(--app-shadow-light);
}

.branch-item.current {
  background: var(--app-shadow-light);
  border-color: var(--app-primary);
  color: var(--app-text);
  box-shadow: none;
}

.branch-item.current .branch-name,
.branch-item.current .current-badge {
  color: var(--app-text);
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
  background: var(--app-card-elevated);
  border: 1px solid var(--app-border);
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
  padding: 8px 12px;
  border: 1px solid var(--app-border);
  background: var(--app-card-elevated);
  border-radius: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--app-text-secondary);
  white-space: nowrap;
  font-size: 0.84em;
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
  background: var(--app-shadow-light);
  border-color: var(--app-primary);
  color: var(--app-text);
  box-shadow: none;
}

.btn-primary:hover {
  color: var(--app-text);
}

.btn-sm {
  padding: 6px 12px;
  font-size: 0.85em;
}

.btn-refresh {
  background: var(--app-shadow-light);
  color: var(--app-text);
  border-color: var(--app-primary);
  box-shadow: none;
}

.btn-stash {
  background: #f59e0b;
  color: #2b1d00;
  border-color: transparent;
}

.btn-checkout {
  background: var(--app-shadow-light);
  color: var(--app-text);
  border-color: var(--app-primary);
  box-shadow: none;
}

.btn-view {
  background: #ede9fe;
  color: #5b21b6;
  border-color: #c4b5fd;
}

.btn-merge {
  background: #d1fae5;
  color: #065f46;
  border-color: #6ee7b7;
}

.btn-push {
  background: #dbeafe;
  color: #1e40af;
  border-color: #93c5fd;
}

.btn-delete,
.btn-danger {
  background: #fee2e2;
  color: #991b1b;
  border-color: #fca5a5;
  box-shadow: none;
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

.merge-preview-box {
  margin-top: 12px;
  padding: 12px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-card);
}

.merge-preview-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.merge-preview-actions {
  display: flex;
  gap: 8px;
}

.merge-preview-content p {
  margin: 4px 0;
  font-size: 0.95em;
}

.precise-preview-box {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed var(--app-border);
}

.merge-conflict-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.merge-conflict-list code {
  padding: 4px 8px;
  border-radius: 6px;
  background: var(--app-border);
  color: var(--app-text);
}

.conflict-file-btn {
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid var(--app-border);
  background: var(--app-border);
  color: var(--app-text);
  cursor: pointer;
  font-family: monospace;
}

.conflict-file-btn:hover {
  border-color: var(--app-primary);
  color: var(--app-primary);
}

/* 模态框 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(10px);
}

.modal-content {
  background: var(--app-card);
  border-radius: 18px;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow: auto;
  box-shadow: 0 24px 50px rgba(0, 0, 0, 0.3);
  border: 1px solid var(--app-border);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid var(--app-border);
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
  padding: 14px 16px;
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
  padding: 10px 16px 14px;
  border-top: 1px solid var(--app-border);
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

.commit-item.pretty {
  white-space: normal;
  background: var(--app-card-elevated);
  border: 1px solid var(--app-border);
}

.commit-item-main {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.commit-hash-chip {
  font-family: 'Courier New', monospace;
  font-size: 0.8em;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--app-shadow-light);
  color: var(--app-text);
  border: 1px solid var(--app-border);
}

.commit-subject-text {
  color: var(--app-text);
  font-size: 0.92em;
}

.commit-item-meta {
  margin-top: 6px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  font-size: 0.8em;
  color: var(--app-text-muted);
}

/* 提示消息 */
.toast {
  position: fixed;
  bottom: calc(30px + env(safe-area-inset-bottom, 0px));
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
  color: #fff;
}

.toast.error {
  background: #ff3b30;
  color: #fff;
}

.toast.warning {
  background: #f59e0b;
  color: #2b1d00;
}

.toast.info {
  background: var(--app-primary);
  color: var(--app-on-primary);
}

/* 文件列表按钮 */
.btn-files {
  background: #f59e0b;
  color: #2b1d00;
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
  color: #fff;
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

/* 文件历史列表 */
.file-item.file-history {
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  padding: 16px;
}

.file-item.file-history:hover {
  background-color: rgba(255, 255, 255, 0.05);
}

.file-item.file-history .file-path {
  flex: 1;
  font-weight: 500;
  color: var(--app-text-primary);
}

.file-stats {
  display: flex;
  gap: 16px;
  font-size: 0.85em;
  color: var(--app-text-muted);
  width: 100%;
}

.modify-count {
  font-weight: 600;
  color: var(--app-primary);
}

.last-modified,
.last-author {
  color: var(--app-text-secondary);
}

/* 响应式：移动端堆叠显示 */
@media (max-width: 768px) {
  .file-stats {
    flex-direction: column;
    gap: 4px;
  }
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
  background: var(--app-card-elevated);
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
  background: var(--app-shadow-light);
  color: var(--app-text);
  border: 1px solid var(--app-primary);
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
  background: var(--app-card-elevated);
  color: var(--app-text);
  border: 1px solid var(--app-border);
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

<style scoped>
.git-manager {
  padding: clamp(16px, 2vw, 24px);
  max-width: 1320px;
}
.git-manager .page-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-end;
  margin-bottom: 18px;
}
.git-manager .page-header h1 {
  margin: 0;
  font-size: clamp(1.35rem, 2.2vw, 1.8rem);
  letter-spacing: 0.01em;
}
.git-manager .subtitle {
  color: var(--app-text-muted);
}
.git-manager .card,
.git-manager .status-card {
  border: 1px solid var(--app-border);
  border-radius: 14px;
  background: linear-gradient(180deg, var(--app-card-elevated), var(--app-card));
  box-shadow: var(--app-soft-shadow);
}
.git-manager .btn {
  border-radius: 10px;
  transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease;
}
.git-manager .btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 10px 18px rgba(17, 24, 39, 0.1);
}
.git-manager .branch-item {
  border-radius: 12px;
  border: 1px solid var(--app-border);
  background: var(--app-card);
}
.git-manager .branch-item.current {
  border-color: rgba(37, 99, 235, 0.35);
  box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.18) inset;
}
.git-manager .branch-search-input,
.git-manager .branch-input,
.git-manager .commit-message-input,
.git-manager .remote-select {
  border-radius: 10px;
  border: 1px solid var(--app-border);
  background: var(--app-card-elevated);
}
.git-manager .branch-search-input:focus,
.git-manager .branch-input:focus,
.git-manager .commit-message-input:focus,
.git-manager .remote-select:focus {
  outline: none;
  border-color: var(--app-primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.14);
}
.git-manager .operation-result {
  border-radius: 12px;
}
@media (max-width: 900px) {
  .git-manager .page-header {
    align-items: flex-start;
    flex-direction: column;
  }
}
@media (max-width: 768px) {
  .git-manager {
    padding: 12px;
  }
  .git-manager .remote-ops-row,
  .git-manager .commit-tools,
  .git-manager .branch-filter-tools {
    display: grid;
    grid-template-columns: 1fr;
    gap: 8px;
  }
  .git-manager .btn,
  .git-manager .remote-select,
  .git-manager .branch-search-input,
  .git-manager .branch-input {
    width: 100%;
  }
}
</style>
