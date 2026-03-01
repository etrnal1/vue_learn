<template>
  <div class="flow-tracking">
    <header class="tracking-header">
      <div>
        <h2>流程追踪</h2>
        <p class="subtitle">汇总运行中的流程实例，跟踪当前节点与执行状态</p>
      </div>
      <div class="header-actions">
        <input v-model="searchQuery" class="search-input" placeholder="搜索流程或用户" />
        <button class="btn btn-primary" @click="loadInstances">刷新</button>
      </div>
    </header>

    <div v-if="loading" class="state-message">加载中...</div>
    <div v-else-if="instances.length === 0" class="state-message">暂无进行中的流程实例</div>

    <div v-else class="instances-grid">
      <div v-for="instance in filteredInstances" :key="instance.id" class="instance-card">
        <header class="card-header">
          <h3>{{ instance.flowName }}</h3>
          <span class="status-badge" :class="getStatusClass(instance.status)">
            {{ getStatusLabel(instance.status) }}
          </span>
        </header>

        <div class="card-body">
          <div class="meta-item">
            <span class="label">申请人</span>
            <span class="value">{{ instance.requester || '—' }}</span>
          </div>
          <div class="meta-item">
            <span class="label">当前步骤</span>
            <span class="value">{{ instance.currentStep || '—' }}</span>
          </div>
          <div class="meta-item">
            <span class="label">进度</span>
            <span class="value">{{ instance.progress || 0 }}%</span>
          </div>
          <div class="meta-item">
            <span class="label">开始时间</span>
            <span class="value">{{ formatDate(instance.startTime) }}</span>
          </div>
        </div>

        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: (instance.progress || 0) + '%' }"></div>
        </div>

        <div class="card-actions">
          <button class="btn btn-small" @click="viewDetails(instance)">查看详情</button>
          <button class="btn btn-small btn-secondary" @click="downloadLogs(instance)">下载日志</button>
        </div>
      </div>
    </div>

    <!-- 详情面板 -->
    <div v-if="selectedInstance" class="detail-panel">
      <header class="panel-header">
        <h3>{{ selectedInstance.flowName }} - 详情</h3>
        <button class="btn-close" @click="selectedInstance = null">✕</button>
      </header>

      <div class="panel-body">
        <section class="section">
          <h4>基本信息</h4>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">实例 ID</span>
              <span class="value">{{ selectedInstance.id }}</span>
            </div>
            <div class="info-item">
              <span class="label">状态</span>
              <span class="value" :class="getStatusClass(selectedInstance.status)">
                {{ getStatusLabel(selectedInstance.status) }}
              </span>
            </div>
            <div class="info-item">
              <span class="label">申请人</span>
              <span class="value">{{ selectedInstance.requester }}</span>
            </div>
            <div class="info-item">
              <span class="label">开始时间</span>
              <span class="value">{{ formatDate(selectedInstance.startTime) }}</span>
            </div>
          </div>
        </section>

        <section class="section">
          <h4>步骤执行情况</h4>
          <div class="steps-timeline">
            <div
              v-for="(step, index) in selectedInstance.steps || []"
              :key="index"
              class="timeline-item"
              :class="{ completed: step.completed, current: step.current }
            "
            >
              <div class="timeline-dot"></div>
              <div class="timeline-content">
                <p class="step-name">{{ step.name }}</p>
                <p class="step-time">{{ formatDate(step.completedAt) || '等待中...' }}</p>
                <p v-if="step.note" class="step-note">{{ step.note }}</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script>
import { api } from '../../utils/api.js'

export default {
  name: 'FlowTracking',
  data() {
    return {
      instances: [],
      selectedInstance: null,
      loading: false,
      searchQuery: ''
    }
  },
  computed: {
    filteredInstances() {
      if (!this.searchQuery.trim()) return this.instances
      const q = this.searchQuery.toLowerCase()
      return this.instances.filter((instance) => {
        const flowName = (instance.flowName || '').toLowerCase()
        const requester = (instance.requester || '').toLowerCase()
        return flowName.includes(q) || requester.includes(q)
      })
    }
  },
  methods: {
    async loadInstances() {
      this.loading = true
      try {
        const result = await api.flows.getAll()
        this.instances = Array.isArray(result) ? result : []
      } catch (error) {
        console.error('加载实例失败:', error)
      } finally {
        this.loading = false
      }
    },
    viewDetails(instance) {
      this.selectedInstance = { ...instance }
    },
    downloadLogs(instance) {
      const csv = `流程实例日志\n实例ID,${instance.id}\n状态,${this.getStatusLabel(instance.status)}\n`
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${instance.id}-logs.csv`
      a.click()
    },
    formatDate(value) {
      if (!value) return '—'
      const date = new Date(Number(value))
      if (Number.isNaN(date.getTime())) return '—'
      return date.toLocaleString('zh-CN', { hour12: false })
    },
    getStatusLabel(status) {
      const labels = {
        pending: '待处理',
        in_progress: '进行中',
        completed: '已完成',
        rejected: '已拒绝',
        cancelled: '已取消'
      }
      return labels[status] || status
    },
    getStatusClass(status) {
      return `status-${status}`
    }
  },
  mounted() {
    this.loadInstances()
  }
}
</script>

<style scoped>
.flow-tracking {
  padding: 16px;
  max-width: 1200px;
  margin: 0 auto;
}

.tracking-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.tracking-header h2 {
  margin: 0 0 4px;
  font-size: 1.8em;
}

.subtitle {
  margin: 0;
  color: var(--app-text-muted);
  font-size: 0.95em;
}

.header-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.search-input {
  padding: 8px 12px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-card-elevated);
  color: var(--app-text);
  min-width: 200px;
}

.state-message {
  text-align: center;
  padding: 60px 20px;
  color: var(--app-text-muted);
}

.instances-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.instance-card {
  padding: 16px;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  background: var(--app-card);
  box-shadow: var(--app-soft-shadow);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}

.card-header h3 {
  margin: 0;
  font-size: 1.1em;
}

.status-badge {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.8em;
  font-weight: 600;
  white-space: nowrap;
}

.status-pending {
  background: #fef3c7;
  color: #92400e;
}

.status-in_progress {
  background: #dbeafe;
  color: #1e40af;
}

.status-completed {
  background: #dcfce7;
  color: #166534;
}

.status-rejected {
  background: #fee2e2;
  color: #7f1d1d;
}

.status-cancelled {
  background: #f3e8ff;
  color: #581c87;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.meta-item {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 0.9em;
}

.meta-item .label {
  color: var(--app-text-muted);
  font-weight: 600;
}

.meta-item .value {
  color: var(--app-text);
}

.progress-bar {
  height: 6px;
  background: var(--app-card-elevated);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--app-primary);
  transition: width 0.3s ease;
}

.card-actions {
  display: flex;
  gap: 8px;
}

.btn {
  padding: 8px 12px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: var(--app-primary);
  color: var(--app-on-primary);
  font-weight: 600;
  cursor: pointer;
  font-size: 0.85em;
}

.btn-small {
  padding: 6px 10px;
  font-size: 0.8em;
  flex: 1;
}

.btn-secondary {
  background: var(--app-card-elevated);
  color: var(--app-text);
  border: 1px solid var(--app-border);
}

/* 详情面板 */
.detail-panel {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  z-index: 100;
}

.detail-panel::backdrop {
  background: rgba(0, 0, 0, 0.5);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.panel-header h3 {
  margin: 0;
  font-size: 1.3em;
}

.btn-close {
  border: none;
  background: transparent;
  color: var(--app-text-muted);
  font-size: 1.4em;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
}

.panel-body {
  background: var(--app-card);
  border-radius: 12px;
  padding: 16px;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
}

.section {
  margin-bottom: 24px;
}

.section h4 {
  margin: 0 0 12px;
  font-size: 1em;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.info-item {
  padding: 10px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-card-elevated);
}

.info-item .label {
  display: block;
  color: var(--app-text-muted);
  font-size: 0.85em;
  margin-bottom: 4px;
}

.info-item .value {
  font-weight: 600;
  word-break: break-all;
}

.steps-timeline {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.timeline-item {
  display: flex;
  gap: 12px;
  opacity: 0.6;
}

.timeline-item.current,
.timeline-item.completed {
  opacity: 1;
}

.timeline-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--app-border);
  margin-top: 4px;
  flex-shrink: 0;
}

.timeline-item.current .timeline-dot {
  background: var(--app-primary);
  width: 16px;
  height: 16px;
}

.timeline-item.completed .timeline-dot {
  background: #10b981;
}

.timeline-content {
  flex: 1;
}

.step-name {
  margin: 0;
  font-weight: 600;
}

.step-time {
  margin: 4px 0 0;
  font-size: 0.85em;
  color: var(--app-text-muted);
}

.step-note {
  margin: 4px 0 0;
  font-size: 0.85em;
  color: var(--app-text-muted);
  font-style: italic;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .flow-tracking {
    padding: 12px;
  }

  .tracking-header {
    flex-direction: column;
  }

  .tracking-header h2 {
    font-size: 1.4em;
  }

  .header-actions {
    width: 100%;
  }

  .search-input {
    flex: 1;
    min-width: unset;
  }

  .instances-grid {
    grid-template-columns: 1fr;
  }

  .panel-body {
    max-height: 90vh;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }
}
</style>

<style scoped>
.flow-tracking {
  padding: clamp(16px, 2vw, 24px);
  max-width: 1280px;
}
.flow-tracking .tracking-header,
.flow-tracking .instance-card,
.flow-tracking .panel-body {
  border: 1px solid var(--app-border);
  border-radius: 14px;
  background: linear-gradient(180deg, var(--app-card-elevated), var(--app-card));
  box-shadow: var(--app-soft-shadow);
}
.flow-tracking .tracking-header {
  padding: 14px 16px;
}
.flow-tracking .tracking-header h2 {
  font-size: clamp(1.35rem, 2.2vw, 1.7rem);
}
.flow-tracking .search-input {
  border-radius: 10px;
  background: var(--app-card);
}
.flow-tracking .search-input:focus {
  outline: none;
  border-color: var(--app-primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.14);
}
.flow-tracking .card-actions .btn {
  border-radius: 9px;
}
.flow-tracking .status-badge {
  border-radius: 999px;
}
@media (max-width: 768px) {
  .flow-tracking .tracking-header,
  .flow-tracking .panel-body {
    padding: 12px;
  }
}
</style>
