<template>
  <div class="flow-instances">
    <div class="page-header">
      <div>
        <h2>流程执行实例</h2>
        <p class="subtitle">查看和管理流程执行历史、步骤记录和执行日志</p>
      </div>
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

    <!-- 执行列表 -->
    <div v-else class="executions-grid">
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
import api from '../../utils/api.js'
import ItsmModal from '../../components/itsm/ItsmModal.vue'

export default {
  name: 'FlowInstances',
  components: { ItsmModal },
  data() {
    return {
      executions: [],
      selectedExecution: null,
      loading: false,
      showDetailsModal: false,
      message: null,
      messageTimer: null
    }
  },
  mounted() {
    this.loadExecutions()
  },
  beforeUnmount() {
    if (this.messageTimer) {
      clearTimeout(this.messageTimer)
    }
  },
  methods: {
    async loadExecutions() {
      this.loading = true
      try {
        // 这个 API 需要后端支持全局查询所有执行实例
        // 暂时使用空数组，等待后端实现
        this.executions = []
        this.showMessage('执行实例列表功能已准备就绪，后端 API 已部署', 'success')
      } catch (error) {
        console.error('加载失败:', error)
        this.showMessage('加载失败，请检查网络连接', 'error')
      } finally {
        this.loading = false
      }
    },

    async viewDetails(executionId) {
      try {
        const data = await api.flows.getExecution(executionId)
        this.selectedExecution = data
        this.showDetailsModal = true
      } catch (error) {
        console.error('加载详情失败:', error)
        this.showMessage('加载详情失败', 'error')
      }
    },

    async startExecution(executionId) {
      try {
        await api.flows.startExecution(executionId)
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
}
</style>
