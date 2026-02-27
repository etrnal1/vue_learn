<template>
  <div class="flow-instances">
    <div class="page-header">
      <div>
        <h2>流程执行实例</h2>
        <p class="subtitle">查看和管理流程执行历史、步骤记录和执行日志（共 {{ totalCount }} 条记录）</p>
      </div>
    </div>

    <!-- 筛选面板 -->
    <div class="filter-panel">
      <select v-model="filters.status" @change="onFilterChange" class="filter-select">
        <option value="">所有状态</option>
        <option value="pending">待执行</option>
        <option value="running">执行中</option>
        <option value="completed">已完成</option>
        <option value="failed">失败</option>
        <option value="cancelled">已取消</option>
      </select>

      <select v-model="sortBy" @change="onFilterChange" class="filter-select">
        <option value="created_at">按创建时间</option>
        <option value="status">按状态</option>
        <option value="updated_at">按更新时间</option>
      </select>

      <button class="btn-toggle-sort" @click="onSortChange(sortBy)" :title="sortOrder">
        {{ sortOrder === 'DESC' ? '↓' : '↑' }}
      </button>
    </div>

    <!-- 加载/空状态 -->
    <div v-if="loading" class="state-message">
      <span>⏳</span>
      <p>加载执行实例中...</p>
    </div>
    <div v-else-if="executions.length === 0" class="state-message">
      <span>📭</span>
      <p>暂无执行记录</p>
    </div>

    <!-- 分页控件 -->
    <div v-if="!loading && executions.length > 0" class="pagination-header">
      <select v-model.number="pageSize" @change="onPageSizeChange" class="page-size-select">
        <option v-for="size in pageSizes" :key="size" :value="size">
          每页 {{ size }} 条
        </option>
      </select>
      <span class="page-info">
        第 {{ currentPage }} 页 / 共 {{ totalPages }} 页（共 {{ totalCount }} 条）
      </span>
    </div>

    <!-- 执行列表 -->
    <div v-else-if="!loading && executions.length > 0" class="executions-grid">
      <div v-for="exec in executions" :key="exec.id" class="exec-card">
        <div class="exec-card__header">
          <h3>{{ exec.executionNo }}</h3>
          <span class="badge" :class="'status-' + exec.status">
            {{ statusLabel(exec.status) }}
          </span>
        </div>
        <div class="exec-card__body">
          <p><strong>流程：</strong>{{ exec.flowName || '—' }}</p>
          <p><strong>发起人：</strong>{{ exec.initiatorName || '—' }}</p>
          <p><strong>创建时间：</strong>{{ formatDate(exec.createdAt || exec.created_at) }}</p>
          <p v-if="exec.completedAt || exec.completed_at">
            <strong>完成时间：</strong>{{ formatDate(exec.completedAt || exec.completed_at) }}
          </p>
        </div>
        <div class="exec-card__footer">
          <button class="btn btn-sm" @click="viewDetails(exec.id)">
            查看详情
          </button>
          <button v-if="exec.status === 'pending'"
                  class="btn btn-sm btn-primary"
                  @click="startExecution(exec.id)">
            启动执行
          </button>
        </div>
      </div>
    </div>

    <!-- 分页导航 -->
    <div v-if="!loading && executions.length > 0" class="pagination-nav">
      <button class="btn-nav" :disabled="currentPage === 1" @click="onPageChange(1)">
        ⏮ 首页
      </button>
      <button class="btn-nav" :disabled="currentPage === 1" @click="onPageChange(currentPage - 1)">
        ◀ 上一页
      </button>

      <div class="page-numbers">
        <button v-for="page in visiblePages" :key="page"
                class="page-number" :class="{ active: page === currentPage }"
                @click="onPageChange(page)">
          {{ page }}
        </button>
      </div>

      <button class="btn-nav" :disabled="!hasMore" @click="onPageChange(currentPage + 1)">
        下一页 ▶
      </button>
      <button class="btn-nav" :disabled="!hasMore" @click="onPageChange(totalPages)">
        末页 ⏭
      </button>
    </div>

    <!-- 参数数据模态框 -->
    <ItsmModal v-if="showDataModal"
               :title="`${selectedDataType === 'input' ? '输入参数' : '输出结果'} - ${selectedStepData?.stepName}`"
               size="medium"
               @close="showDataModal = false">
      <div v-if="selectedStepData" class="data-content">
        <pre class="data-json">{{ formatJsonData(selectedStepData[selectedDataType === 'input' ? 'input_data' : 'output_data']) }}</pre>
      </div>
    </ItsmModal>

    <!-- 详情模态框 -->
    <ItsmModal v-if="showDetailsModal"
               :title="`执行详情 - ${selectedExecution?.executionNo}`"
               size="large"
               @close="showDetailsModal = false">
      <div v-if="selectedExecution" class="execution-details">
        <div class="details-section">
          <h4>基本信息</h4>
          <dl>
            <div>
              <dt>状态</dt>
              <dd>{{ statusLabel(selectedExecution.status) }}</dd>
            </div>
            <div>
              <dt>流程</dt>
              <dd>{{ selectedExecution.flowName }}</dd>
            </div>
            <div>
              <dt>发起人</dt>
              <dd>{{ selectedExecution.initiatorName || '—' }}</dd>
            </div>
            <div>
              <dt>创建时间</dt>
              <dd>{{ formatDate(selectedExecution.createdAt || selectedExecution.created_at) }}</dd>
            </div>
          </dl>
        </div>

        <div class="details-section">
          <h4>步骤执行记录</h4>
          <div v-if="selectedExecution.steps && selectedExecution.steps.length > 0" class="steps-timeline">
            <div v-for="step in selectedExecution.steps"
                 :key="step.id"
                 class="timeline-step"
                 :class="'step-' + step.status">
              <div class="step-indicator"></div>
              <div class="step-content">
                <h5>{{ step.stepName }}</h5>
                <p>状态：{{ statusLabel(step.status) }}</p>
                <p v-if="step.startedAt || step.started_at">开始：{{ formatDate(step.startedAt || step.started_at) }}</p>
                <p v-if="step.completedAt || step.completed_at">完成：{{ formatDate(step.completedAt || step.completed_at) }}</p>
                <p v-if="step.duration">耗时：{{ formatDuration(step.duration) }}</p>
                <div v-if="step.input_data || step.output_data" class="step-data">
                  <button v-if="step.input_data" class="btn-data" @click="viewStepData(step, 'input')">
                    📥 输入参数
                  </button>
                  <button v-if="step.output_data" class="btn-data" @click="viewStepData(step, 'output')">
                    📤 输出结果
                  </button>
                </div>
              </div>
            </div>
          </div>
          <p v-else class="empty">暂无步骤记录</p>
        </div>
      </div>
    </ItsmModal>

    <!-- 消息提示 -->
    <div v-if="message" class="message" :class="message.type">
      {{ message.text }}
    </div>
  </div>
</template>

<script>
import { api } from '../../utils/api.js'
import { getWebSocketClient } from '../../utils/websocket.js'
import ItsmModal from '../../components/itsm/ItsmModal.vue'

export default {
  name: 'FlowInstances',
  components: { ItsmModal },
  data() {
    return {
      // 分页数据
      executions: [],
      currentPage: 1,
      pageSize: 20,
      totalCount: 0,
      pageSizes: [10, 20, 50],

      // 排序
      sortBy: 'created_at',
      sortOrder: 'DESC',

      // 筛选
      filters: {
        status: '',
        flowId: ''
      },

      // WebSocket 相关（新增）
      wsClient: null,
      subscribedExecutions: new Set(),

      // UI状态
      selectedExecution: null,
      loading: false,
      showDetailsModal: false,
      showDataModal: false,
      selectedStepData: null,
      selectedDataType: 'input',
      message: null,
      messageTimer: null
    }
  },

  computed: {
    totalPages() {
      return Math.ceil(this.totalCount / this.pageSize)
    },
    hasMore() {
      return this.currentPage < this.totalPages
    },
    visiblePages() {
      const totalPages = this.totalPages
      const current = this.currentPage
      const delta = 2
      const left = current - delta
      const right = current + delta + 1

      const range = []
      const rangeWithDots = []
      let l

      for (let i = 1; i <= totalPages; i++) {
        if ((i >= left && i < right) || i === 1 || i === totalPages) {
          range.push(i)
        }
      }

      range.forEach((i) => {
        if (l) {
          if (i - l === 2) {
            rangeWithDots.push(l + 1)
          } else if (i - l !== 1) {
            rangeWithDots.push('...')
          }
        }
        rangeWithDots.push(i)
        l = i
      })

      return rangeWithDots.filter((x) => x !== '...' && typeof x === 'number')
    }
  },
  mounted() {
    this.loadExecutions()

    // 初始化 WebSocket（新增）
    this.initWebSocket()
  },
  beforeUnmount() {
    // 清理 WebSocket 监听器（新增）
    if (this.wsClient) {
      this.wsClient.off('execution:started', this.onExecutionStarted)
      this.wsClient.off('execution:step:completed', this.onStepCompleted)
      this.wsClient.off('execution:completed', this.onExecutionCompleted)
      this.wsClient.off('execution:progress', this.onProgressUpdated)

      // 取消所有订阅
      this.subscribedExecutions.forEach(execId => {
        this.wsClient.unsubscribe(execId)
      })
    }

    if (this.messageTimer) {
      clearTimeout(this.messageTimer)
    }
  },
  methods: {
    async loadExecutions() {
      this.loading = true
      try {
        const params = {
          page: this.currentPage,
          limit: this.pageSize,
          sortBy: this.sortBy,
          order: this.sortOrder
        }

        // 仅添加有值的筛选器
        if (this.filters.status) {
          params.status = this.filters.status
        }
        if (this.filters.flowId) {
          params.flowId = this.filters.flowId
        }

        const response = await api.flows.getAllExecutions(params)
        this.executions = response.data || []
        this.totalCount = response.total || 0
      } catch (error) {
        console.error('加载失败:', error)
        this.showMessage('加载失败，请检查网络连接', 'error')
        this.executions = []
        this.totalCount = 0
      } finally {
        this.loading = false
      }
    },

    async viewDetails(executionId) {
      try {
        const data = await api.flows.getExecution(executionId)
        this.selectedExecution = data
        this.showDetailsModal = true

        // 订阅此执行实例（新增）
        this.subscribeExecution(executionId)
      } catch (error) {
        console.error('加载详情失败:', error)
        this.showMessage('加载详情失败', 'error')
      }
    },

    async startExecution(executionId) {
      try {
        await api.flows.startExecution(executionId)

        // 订阅此执行实例的实时更新（新增）
        this.subscribeExecution(executionId)

        await this.loadExecutions()
        this.showMessage('执行已启动', 'success')
      } catch (error) {
        console.error('启动失败:', error)
        this.showMessage('启动失败，请重试', 'error')
      }
    },

    statusLabel(status) {
      const map = {
        pending: '待执行',
        running: '执行中',
        completed: '已完成',
        failed: '失败',
        cancelled: '已取消'
      }
      return map[status] || status
    },

    formatDate(timestamp) {
      if (!timestamp) return '—'
      return new Date(Number(timestamp)).toLocaleString('zh-CN', { hour12: false })
    },

    formatDuration(ms) {
      if (!ms) return '—'
      const seconds = Math.floor(ms / 1000)
      if (seconds < 60) return `${seconds}秒`
      const minutes = Math.floor(seconds / 60)
      return `${minutes}分${seconds % 60}秒`
    },

    showMessage(text, type = 'info') {
      this.message = { text, type }
      if (this.messageTimer) clearTimeout(this.messageTimer)
      this.messageTimer = setTimeout(() => {
        this.message = null
      }, 3000)
    },

    // 分页和排序
    onPageChange(newPage) {
      this.currentPage = Math.max(1, Math.min(newPage, this.totalPages))
      this.loadExecutions()
    },

    onPageSizeChange(newSize) {
      this.pageSize = newSize
      this.currentPage = 1
      this.loadExecutions()
    },

    onSortChange(newSortBy) {
      if (this.sortBy === newSortBy) {
        this.sortOrder = this.sortOrder === 'ASC' ? 'DESC' : 'ASC'
      } else {
        this.sortBy = newSortBy
        this.sortOrder = 'DESC'
      }
      this.currentPage = 1
      this.loadExecutions()
    },

    onFilterChange() {
      this.currentPage = 1
      this.loadExecutions()
    },

    viewStepData(step, dataType) {
      this.selectedStepData = step
      this.selectedDataType = dataType
      this.showDataModal = true
    },

    formatJsonData(data) {
      try {
        if (typeof data === 'string') {
          return JSON.stringify(JSON.parse(data), null, 2)
        }
        return JSON.stringify(data, null, 2)
      } catch (e) {
        return String(data)
      }
    },

    /**
     * 初始化 WebSocket（新增）
     */
    initWebSocket() {
      this.wsClient = getWebSocketClient()

      // 监听执行启动
      this.wsClient.on('execution:started', this.onExecutionStarted)

      // 监听步骤完成
      this.wsClient.on('execution:step:completed', this.onStepCompleted)

      // 监听执行完成
      this.wsClient.on('execution:completed', this.onExecutionCompleted)

      // 监听进度更新
      this.wsClient.on('execution:progress', this.onProgressUpdated)

      console.log('[FlowInstances] WebSocket 已初始化')
    },

    /**
     * 订阅执行实例（新增）
     */
    subscribeExecution(executionId) {
      if (!this.subscribedExecutions.has(executionId)) {
        this.wsClient.subscribe(executionId)
        this.subscribedExecutions.add(executionId)
        console.log('[FlowInstances] 订阅执行:', executionId)
      }
    },

    /**
     * WebSocket 事件处理器：执行启动（新增）
     */
    onExecutionStarted({ executionId, payload }) {
      console.log('[WebSocket] 执行启动:', executionId, payload)

      // 更新列表中的执行状态
      const exec = this.executions.find(e => e.id === executionId)
      if (exec) {
        exec.status = 'running'
        exec.startedAt = payload.startedAt
        exec.started_at = payload.startedAt
      }

      // 如果正在查看详情，刷新数据
      if (this.selectedExecution && this.selectedExecution.id === executionId) {
        this.viewDetails(executionId)
      }

      this.showMessage(`执行 ${executionId} 已启动`, 'info')
    },

    /**
     * WebSocket 事件处理器：步骤完成（新增）
     */
    onStepCompleted({ executionId, payload }) {
      console.log('[WebSocket] 步骤完成:', executionId, payload)

      // 如果正在查看详情，更新步骤状态
      if (this.selectedExecution && this.selectedExecution.id === executionId) {
        const step = this.selectedExecution.steps?.find(s => s.id === payload.stepId)
        if (step) {
          step.status = payload.status
          step.duration = payload.duration
          step.completedAt = payload.completedAt
          step.completed_at = payload.completedAt
        }
      }
    },

    /**
     * WebSocket 事件处理器：执行完成（新增）
     */
    onExecutionCompleted({ executionId, payload }) {
      console.log('[WebSocket] 执行完成:', executionId, payload)

      // 更新列表
      const exec = this.executions.find(e => e.id === executionId)
      if (exec) {
        exec.status = 'completed'
        exec.completedAt = payload.completedAt
        exec.completed_at = payload.completedAt
      }

      // 如果正在查看详情，刷新
      if (this.selectedExecution && this.selectedExecution.id === executionId) {
        this.selectedExecution.status = 'completed'
        this.selectedExecution.completedAt = payload.completedAt
        this.selectedExecution.completed_at = payload.completedAt
      }

      this.showMessage(`执行 ${executionId} 已完成`, 'success')
    },

    /**
     * WebSocket 事件处理器：进度更新（新增）
     */
    onProgressUpdated({ executionId, payload }) {
      console.log('[WebSocket] 进度更新:', executionId, payload)

      // 更新执行进度（如果有UI展示）
      const exec = this.executions.find(e => e.id === executionId)
      if (exec) {
        exec.progress = payload.progress
        exec.currentStep = payload.currentStep
        exec.totalSteps = payload.totalSteps
      }
    },

    /**
     * 显示消息提示（新增）
     */
    showMessage(text, type = 'info') {
      this.message = { text, type }

      if (this.messageTimer) {
        clearTimeout(this.messageTimer)
      }

      this.messageTimer = setTimeout(() => {
        this.message = null
      }, 3000)
    }
  }
}
</script>

<style scoped>
.flow-instances {
  padding: 20px;
}

.page-header {
  margin-bottom: 30px;
}

.page-header h2 {
  margin: 0 0 8px 0;
  font-size: 1.8rem;
}

.subtitle {
  color: var(--app-text-muted);
  margin: 0;
}

.state-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: var(--app-text-muted);
}

.state-message span {
  font-size: 3rem;
  margin-bottom: 12px;
}

.executions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 18px;
}

.exec-card {
  border: 1px solid var(--app-border);
  border-radius: 12px;
  padding: 16px;
  background: var(--app-card);
  transition: box-shadow 0.2s ease;
}

.exec-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.exec-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  gap: 8px;
}

.exec-card__header h3 {
  margin: 0;
  font-size: 1.1rem;
}

.badge {
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  white-space: nowrap;
}

.status-pending { background: #fef3c7; color: #92400e; }
.status-running { background: #dbeafe; color: #1e40af; }
.status-completed { background: #d1fae5; color: #065f46; }
.status-failed { background: #fee2e2; color: #991b1b; }
.status-cancelled { background: #f3e8ff; color: #6b21a8; }

.exec-card__body {
  font-size: 0.95rem;
  margin-bottom: 12px;
}

.exec-card__body p {
  margin: 6px 0;
}

.exec-card__body strong {
  color: var(--app-text);
}

.exec-card__footer {
  display: flex;
  gap: 8px;
}

.btn {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-card-elevated);
  color: var(--app-text);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
}

.btn:hover {
  border-color: var(--app-primary);
  color: var(--app-primary);
}

.btn-sm {
  padding: 6px 10px;
  font-size: 0.85rem;
}

.btn-primary {
  background: var(--app-primary);
  color: white;
  border: none;
}

.btn-primary:hover {
  opacity: 0.9;
  color: white;
}

.execution-details {
  padding: 12px 0;
}

.details-section {
  margin-bottom: 24px;
}

.details-section h4 {
  margin: 0 0 12px 0;
  font-size: 1.1rem;
}

dl {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 12px 16px;
}

dl div {
  display: contents;
}

dt {
  font-weight: 600;
  color: var(--app-text);
}

dd {
  margin: 0;
  color: var(--app-text);
}

.steps-timeline {
  position: relative;
  padding-left: 30px;
}

.timeline-step {
  position: relative;
  padding: 12px 0;
  padding-left: 20px;
}

.step-indicator {
  position: absolute;
  left: -30px;
  top: 18px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #94a3b8;
}

.step-completed .step-indicator {
  background: #10b981;
}

.step-running .step-indicator {
  background: #3b82f6;
  animation: pulse 2s infinite;
}

.step-failed .step-indicator {
  background: #ef4444;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.step-content h5 {
  margin: 0 0 6px 0;
  font-size: 0.95rem;
}

.step-content p {
  margin: 4px 0;
  font-size: 0.9rem;
  color: var(--app-text-muted);
}

.step-data {
  margin-top: 8px;
  display: flex;
  gap: 6px;
}

.btn-data {
  padding: 4px 8px;
  font-size: 0.8rem;
  border: 1px solid var(--app-primary);
  border-radius: 4px;
  background: transparent;
  color: var(--app-primary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-data:hover {
  background: var(--app-primary);
  color: white;
}

.data-content {
  padding: 12px 0;
}

.data-json {
  background: var(--app-card-elevated);
  border: 1px solid var(--app-border);
  border-radius: 6px;
  padding: 12px;
  overflow-x: auto;
  font-size: 0.85rem;
  line-height: 1.4;
  color: var(--app-text-muted);
  white-space: pre-wrap;
  word-break: break-word;
}

.empty {
  text-align: center;
  color: var(--app-text-muted);
  padding: 20px;
}

.message {
  position: fixed;
  bottom: 20px;
  right: 20px;
  padding: 12px 16px;
  border-radius: 8px;
  background: #10b981;
  color: white;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  animation: slideUp 0.3s ease;
}

.message.error {
  background: #ef4444;
}

.message.info {
  background: #3b82f6;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* 筛选面板 */
.filter-panel {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  padding: 12px;
  background: var(--app-card-elevated);
  border-radius: 8px;
  align-items: center;
}

.filter-select {
  padding: 8px 12px;
  border: 1px solid var(--app-border);
  border-radius: 6px;
  background: var(--app-card);
  color: var(--app-text);
  font-size: 0.9rem;
  cursor: pointer;
}

.btn-toggle-sort {
  padding: 8px 12px;
  border: 1px solid var(--app-border);
  border-radius: 6px;
  background: var(--app-card);
  color: var(--app-text);
  font-weight: bold;
  cursor: pointer;
  min-width: 40px;
}

/* 分页头部 */
.pagination-header {
  display: flex;
  gap: 16px;
  align-items: center;
  margin-bottom: 16px;
  padding: 12px;
  background: var(--app-card-elevated);
  border-radius: 8px;
}

.page-size-select {
  padding: 8px 12px;
  border: 1px solid var(--app-border);
  border-radius: 6px;
  background: var(--app-card);
  color: var(--app-text);
  cursor: pointer;
}

.page-info {
  font-size: 0.9rem;
  color: var(--app-text-muted);
  white-space: nowrap;
}

/* 分页导航 */
.pagination-nav {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
  margin-top: 24px;
  padding: 16px;
  background: var(--app-card-elevated);
  border-radius: 8px;
  flex-wrap: wrap;
}

.btn-nav {
  padding: 8px 12px;
  border: 1px solid var(--app-border);
  border-radius: 6px;
  background: var(--app-card);
  color: var(--app-text);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
  white-space: nowrap;
}

.btn-nav:hover:not(:disabled) {
  border-color: var(--app-primary);
  color: var(--app-primary);
  background: var(--app-card-elevated);
}

.btn-nav:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-numbers {
  display: flex;
  gap: 4px;
}

.page-number {
  width: 36px;
  height: 36px;
  border: 1px solid var(--app-border);
  border-radius: 4px;
  background: var(--app-card);
  color: var(--app-text);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.page-number:hover {
  border-color: var(--app-primary);
  color: var(--app-primary);
}

.page-number.active {
  background: var(--app-primary);
  color: white;
  border-color: var(--app-primary);
}

@media (max-width: 768px) {
  .executions-grid {
    grid-template-columns: 1fr;
  }

  dl {
    grid-template-columns: 1fr;
  }

  dt {
    margin-bottom: 4px;
  }

  .filter-panel {
    flex-direction: column;
    gap: 8px;
  }

  .pagination-nav {
    flex-direction: column;
    gap: 12px;
  }

  .btn-nav {
    width: 100%;
  }
}
</style>
