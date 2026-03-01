<template>
  <div class="flow-automation">
    <div class="page-header">
      <div>
        <h2>流程自动化规则</h2>
        <p class="subtitle">创建和管理流程自动化规则，支持定时触发、事件触发和条件触发</p>
      </div>
      <button class="btn btn-primary" @click="showCreateModal = true">
        ➕ 新建规则
      </button>
    </div>
    <div v-if="noticeMessage" class="notice-banner">{{ noticeMessage }}</div>
    <div v-if="queueStatus.count > 0" class="queue-banner">
      {{ queueStatus.offline ? '离线模式' : '待同步' }}：{{ queueStatus.count }} 个写入操作在队列中
    </div>

    <!-- 流程选择 -->
    <div class="flow-selector">
      <label>选择流程：</label>
      <select v-model="selectedFlowId" @change="loadRules" class="app-select">
        <option value="">-- 选择流程 --</option>
        <option v-for="flow in flows" :key="flow.id" :value="flow.id">
          {{ flow.name }}
        </option>
      </select>
    </div>

    <!-- 加载/空状态 -->
    <div v-if="loading" class="state-message">
      <span>⏳</span>
      <p>加载规则中...</p>
    </div>
    <div v-else-if="!selectedFlowId" class="state-message">
      <span>📋</span>
      <p>请先选择一个流程</p>
    </div>
    <div v-else-if="rules.length === 0" class="state-message">
      <span>📭</span>
      <p>暂无自动化规则</p>
    </div>

    <!-- 规则列表 -->
    <div v-else class="rules-grid">
      <div v-for="rule in rules" :key="rule.id" class="rule-card">
        <div class="rule-card__header">
          <h3>{{ rule.rule_name }}</h3>
          <div class="rule-actions">
            <button class="btn-toggle" :class="{ enabled: rule.is_enabled }" @click="toggleRule(rule.id, !rule.is_enabled)" :title="rule.is_enabled ? '禁用' : '启用'">
              {{ rule.is_enabled ? '✓' : '✕' }}
            </button>
            <button class="btn-icon" @click="editRule(rule)" title="编辑">
              ✏️
            </button>
            <button class="btn-icon" @click="deleteRule(rule.id)" title="删除">
              🗑️
            </button>
          </div>
        </div>

        <div class="rule-card__body">
          <div class="rule-info">
            <span class="badge" :class="'type-' + rule.rule_type">{{ typeLabel(rule.rule_type) }}</span>
            <span v-if="rule.trigger_type" class="badge badge-trigger">{{ rule.trigger_type }}</span>
          </div>

          <div class="rule-details">
            <p><strong>触发方式：</strong>{{ getTriggerDescription(rule) }}</p>
            <p><strong>执行动作：</strong>{{ getActionDescription(rule) }}</p>
            <p><strong>创建人：</strong>{{ rule.created_by_name || '系统' }}</p>
            <p><strong>创建时间：</strong>{{ formatDate(rule.created_at) }}</p>
          </div>
        </div>

        <div class="rule-card__footer">
          <button class="btn btn-sm" @click="viewLogs(rule.id)">
            查看日志
          </button>
          <button v-if="selectedExecution" class="btn btn-sm btn-primary" @click="executeRule(rule.id, selectedExecution)">
            手动执行
          </button>
        </div>
      </div>
    </div>

    <!-- 创建/编辑规则模态框 -->
    <div v-if="showCreateModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ editingRule ? '编辑规则' : '新建规则' }}</h3>
          <button class="btn-close" @click="closeModal">✕</button>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label>规则名称：</label>
            <input v-model="formData.ruleName" type="text" class="app-input" placeholder="输入规则名称...">
          </div>

          <div class="form-group">
            <label>规则类型：</label>
            <select v-model="formData.ruleType" @change="resetTriggerConfig" class="app-select">
              <option value="">-- 选择类型 --</option>
              <option value="schedule">定时触发</option>
              <option value="event">事件触发</option>
              <option value="condition">条件触发</option>
            </select>
          </div>

          <!-- 触发配置 -->
          <div v-if="formData.ruleType === 'schedule'" class="form-group">
            <label>Cron 表达式：</label>
            <input v-model="formData.triggerType" type="text" class="app-input" placeholder="例如：0 0 * * * (每天午夜)">
            <small>格式：秒 分 时 日 月 周</small>
          </div>

          <div v-if="formData.ruleType === 'event'" class="form-group">
            <label>事件类型：</label>
            <select v-model="formData.triggerType" class="app-select">
              <option value="">-- 选择事件 --</option>
              <option value="step_completed">步骤完成</option>
              <option value="execution_completed">执行完成</option>
              <option value="execution_failed">执行失败</option>
            </select>
          </div>

          <div v-if="formData.ruleType === 'condition'" class="form-group">
            <label>条件类型：</label>
            <select v-model="formData.triggerType" class="app-select">
              <option value="">-- 选择条件 --</option>
              <option value="execution_time_exceed">执行超时</option>
              <option value="step_failed">步骤失败</option>
              <option value="custom">自定义条件</option>
            </select>
          </div>

          <!-- 执行动作 -->
          <div class="form-group">
            <label>执行动作：</label>
            <select v-model="formData.actionType" class="app-select">
              <option value="">-- 选择动作 --</option>
              <option value="execute_step">完成指定步骤</option>
              <option value="skip_step">跳过指定步骤</option>
              <option value="execute_flow">触发新流程</option>
              <option value="complete_step">标记步骤完成</option>
            </select>
          </div>

          <div v-if="formData.actionType === 'execute_step' || formData.actionType === 'skip_step' || formData.actionType === 'complete_step'" class="form-group">
            <label>选择步骤：</label>
            <select v-model="formData.actionConfig.stepId" class="app-select">
              <option value="">-- 选择步骤 --</option>
              <option v-for="step in selectedFlowSteps" :key="step.id" :value="step.id">
                {{ step.name }}
              </option>
            </select>
          </div>

          <div v-if="formData.actionType === 'execute_flow'" class="form-group">
            <label>选择要触发的流程：</label>
            <select v-model="formData.actionConfig.flowId" class="app-select">
              <option value="">-- 选择流程 --</option>
              <option v-for="flow in flows" :key="flow.id" :value="flow.id">
                {{ flow.name }}
              </option>
            </select>
          </div>

          <div v-if="formData.ruleType === 'condition' && formData.triggerType === 'execution_time_exceed'" class="form-group">
            <label>超时时间（分钟）：</label>
            <input v-model.number="formData.triggerConfig.timeoutMinutes" type="number" class="app-input" min="1">
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeModal">取消</button>
          <button class="btn btn-primary" @click="saveRule" :disabled="!isFormValid">
            {{ editingRule ? '更新' : '创建' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 日志模态框 -->
    <div v-if="showLogsModal" class="modal-overlay" @click.self="closeLogsModal">
      <div class="modal modal-large">
        <div class="modal-header">
          <h3>自动化执行日志</h3>
          <button class="btn-close" @click="closeLogsModal">✕</button>
        </div>

        <div class="modal-body">
          <div v-if="logsLoading" class="state-message">加载中...</div>
          <div v-else-if="logs.length === 0" class="state-message">暂无执行日志</div>
          <table v-else class="logs-table">
            <thead>
              <tr>
                <th>触发时间</th>
                <th>关联执行</th>
                <th>执行状态</th>
                <th>执行结果</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="log in logs" :key="log.id">
                <td>{{ formatDate(log.trigger_time) }}</td>
                <td>{{ log.execution_id ? log.execution_id.substring(0, 8) : '—' }}</td>
                <td>{{ log.action_executed ? '✓ 成功' : '✕ 失败' }}</td>
                <td class="result-cell">{{ log.action_result ? formatJson(log.action_result) : '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeLogsModal">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { api } from '../../utils/api.js'

export default {
  name: 'FlowAutomation',
  data() {
    return {
      flows: [],
      rules: [],
      selectedFlowId: '',
      selectedExecution: null,
      loading: false,
      logsLoading: false,
      showCreateModal: false,
      showLogsModal: false,
      editingRule: null,
      logs: [],
      noticeMessage: '',
      noticeTimer: null,
      queueStatus: {
        count: 0,
        offline: false,
        flushing: false
      },
      unwatchWriteQueue: null,
      formData: {
        ruleName: '',
        ruleType: '',
        triggerType: '',
        triggerConfig: {},
        actionType: '',
        actionConfig: {}
      }
    }
  },
  computed: {
    selectedFlowSteps() {
      const flow = this.flows.find(f => f.id === this.selectedFlowId)
      return flow?.steps || []
    },
    isFormValid() {
      return this.formData.ruleName && this.formData.ruleType && this.formData.actionType
    }
  },
  mounted() {
    this.unwatchWriteQueue = api.onWriteQueueChange((state) => {
      this.queueStatus = {
        count: Number(state?.count) || 0,
        offline: Boolean(state?.offline),
        flushing: Boolean(state?.flushing)
      }
    })
    this.loadFlows()
  },
  beforeUnmount() {
    if (typeof this.unwatchWriteQueue === 'function') {
      this.unwatchWriteQueue()
      this.unwatchWriteQueue = null
    }
    if (this.noticeTimer) {
      clearTimeout(this.noticeTimer)
      this.noticeTimer = null
    }
  },
  methods: {
    isQueuedPayload(payload) {
      return Boolean(payload?.offlineQueued || payload?.queued)
    },
    showNotice(message) {
      this.noticeMessage = String(message || '')
      if (this.noticeTimer) clearTimeout(this.noticeTimer)
      this.noticeTimer = setTimeout(() => {
        this.noticeMessage = ''
        this.noticeTimer = null
      }, 2600)
    },
    async loadFlows() {
      this.loading = true
      try {
        const data = await api.flows.getAll()
        this.flows = Array.isArray(data) ? data : []
      } catch (error) {
        console.error('加载流程失败:', error)
      } finally {
        this.loading = false
      }
    },

    async loadRules() {
      if (!this.selectedFlowId) {
        this.rules = []
        return
      }

      this.loading = true
      try {
        const data = await api.flows.getAutomationRules(this.selectedFlowId)
        this.rules = Array.isArray(data) ? data : []
      } catch (error) {
        console.error('加载规则失败:', error)
      } finally {
        this.loading = false
      }
    },

    async saveRule() {
      if (!this.isFormValid) return

      try {
        const payload = {
          ruleName: this.formData.ruleName,
          ruleType: this.formData.ruleType,
          triggerType: this.formData.triggerType,
          triggerConfig: this.formData.triggerConfig,
          actionType: this.formData.actionType,
          actionConfig: this.formData.actionConfig,
          createdBy: 'current_user'
        }

        if (this.editingRule) {
          const result = await api.flows.updateAutomationRule(this.editingRule.id, payload)
          if (this.isQueuedPayload(result)) {
            const target = this.rules.find((rule) => rule.id === this.editingRule.id)
            if (target) {
              target.rule_name = payload.ruleName
              target.rule_type = payload.ruleType
              target.trigger_type = payload.triggerType
              target.trigger_config = JSON.stringify(payload.triggerConfig || {})
              target.action_type = payload.actionType
              target.action_config = JSON.stringify(payload.actionConfig || {})
            }
            this.showNotice('规则更新已离线入队，联网后自动提交')
            this.closeModal()
            return
          }
        } else {
          const result = await api.flows.createAutomationRule(this.selectedFlowId, payload)
          if (this.isQueuedPayload(result)) {
            this.rules.unshift({
              id: `queued_${Date.now()}`,
              rule_name: payload.ruleName,
              rule_type: payload.ruleType,
              trigger_type: payload.triggerType,
              trigger_config: JSON.stringify(payload.triggerConfig || {}),
              action_type: payload.actionType,
              action_config: JSON.stringify(payload.actionConfig || {}),
              created_at: Date.now(),
              created_by_name: '当前用户',
              is_enabled: true
            })
            this.showNotice('规则创建已离线入队，联网后自动提交')
            this.closeModal()
            return
          }
        }

        await this.loadRules()
        this.showNotice(this.editingRule ? '规则更新成功' : '规则创建成功')
        this.closeModal()
      } catch (error) {
        console.error('保存规则失败:', error)
        this.showNotice(`保存失败：${error?.message || '未知错误'}`)
      }
    },

    async toggleRule(ruleId, isEnabled) {
      try {
        const target = this.rules.find((item) => item.id === ruleId)
        if (target) target.is_enabled = isEnabled
        const result = await api.flows.toggleAutomationRule(ruleId, isEnabled)
        if (this.isQueuedPayload(result)) {
          this.showNotice('规则状态切换已离线入队，联网后自动提交')
          return
        }
        await this.loadRules()
      } catch (error) {
        console.error('切换规则状态失败:', error)
        this.showNotice(`切换失败：${error?.message || '未知错误'}`)
      }
    },

    async deleteRule(ruleId) {
      if (!confirm('确定要删除此规则吗？')) return

      try {
        const result = await api.flows.deleteAutomationRule(ruleId)
        this.rules = this.rules.filter((item) => item.id !== ruleId)
        if (this.isQueuedPayload(result)) {
          this.showNotice('删除请求已离线入队，联网后自动执行')
          return
        }
        await this.loadRules()
      } catch (error) {
        console.error('删除规则失败:', error)
        this.showNotice(`删除失败：${error?.message || '未知错误'}`)
      }
    },

    editRule(rule) {
      this.editingRule = rule
      this.formData = {
        ruleName: rule.rule_name,
        ruleType: rule.rule_type,
        triggerType: rule.trigger_type,
        triggerConfig: rule.trigger_config ? JSON.parse(rule.trigger_config) : {},
        actionType: rule.action_type,
        actionConfig: rule.action_config ? JSON.parse(rule.action_config) : {}
      }
      this.showCreateModal = true
    },

    async executeRule(ruleId, executionId) {
      try {
        const result = await api.flows.executeAutomationRule(ruleId, executionId)
        if (this.isQueuedPayload(result)) {
          this.showNotice('手动执行请求已离线入队，联网后自动执行')
          return
        }
        alert(result.message || '规则执行成功')
        await this.loadRules()
      } catch (error) {
        console.error('执行规则失败:', error)
        alert('规则执行失败：' + error.message)
      }
    },

    async viewLogs(ruleId) {
      this.logsLoading = true
      try {
        const data = await api.flows.getAutomationLogs({ ruleId, limit: 50 })
        this.logs = Array.isArray(data) ? data : []
        this.showLogsModal = true
      } catch (error) {
        console.error('加载日志失败:', error)
      } finally {
        this.logsLoading = false
      }
    },

    closeModal() {
      this.showCreateModal = false
      this.editingRule = null
      this.resetForm()
    },

    closeLogsModal() {
      this.showLogsModal = false
      this.logs = []
    },

    resetForm() {
      this.formData = {
        ruleName: '',
        ruleType: '',
        triggerType: '',
        triggerConfig: {},
        actionType: '',
        actionConfig: {}
      }
    },

    resetTriggerConfig() {
      this.formData.triggerType = ''
      this.formData.triggerConfig = {}
    },

    typeLabel(type) {
      const map = {
        schedule: '定时触发',
        event: '事件触发',
        condition: '条件触发'
      }
      return map[type] || type
    },

    getTriggerDescription(rule) {
      const triggerConfig = rule.trigger_config ? JSON.parse(rule.trigger_config) : {}

      if (rule.rule_type === 'schedule') {
        return `每天 ${rule.trigger_type}`
      } else if (rule.rule_type === 'event') {
        const eventMap = {
          step_completed: '当步骤完成时',
          execution_completed: '当执行完成时',
          execution_failed: '当执行失败时'
        }
        return eventMap[rule.trigger_type] || rule.trigger_type
      } else if (rule.rule_type === 'condition') {
        if (rule.trigger_type === 'execution_time_exceed') {
          return `执行超过 ${triggerConfig.timeoutMinutes || '—'} 分钟时`
        }
        return rule.trigger_type
      }
      return '—'
    },

    getActionDescription(rule) {
      const actionConfig = rule.action_config ? JSON.parse(rule.action_config) : {}

      if (rule.action_type === 'execute_step' || rule.action_type === 'complete_step') {
        const step = this.selectedFlowSteps.find(s => s.id === actionConfig.stepId)
        return `完成步骤 "${step?.name || '—'}"`
      } else if (rule.action_type === 'skip_step') {
        const step = this.selectedFlowSteps.find(s => s.id === actionConfig.stepId)
        return `跳过步骤 "${step?.name || '—'}"`
      } else if (rule.action_type === 'execute_flow') {
        const flow = this.flows.find(f => f.id === actionConfig.flowId)
        return `触发流程 "${flow?.name || '—'}"`
      }
      return '—'
    },

    formatDate(timestamp) {
      if (!timestamp) return '—'
      return new Date(Number(timestamp)).toLocaleString('zh-CN')
    },

    formatJson(jsonStr) {
      try {
        const obj = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr
        return JSON.stringify(obj, null, 2).substring(0, 100)
      } catch {
        return jsonStr
      }
    }
  }
}
</script>

<style scoped>
.flow-automation {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
  font-size: 1.5rem;
}

.subtitle {
  margin: 8px 0 0 0;
  font-size: 0.9rem;
  color: var(--app-text-muted);
}

.flow-selector {
  background: var(--app-card);
  border: 1px solid var(--app-border);
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.flow-selector label {
  font-weight: 600;
  min-width: 80px;
}

.flow-selector .app-select {
  flex: 1;
  max-width: 300px;
}

.notice-banner,
.queue-banner {
  margin-bottom: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--app-border);
  font-size: 0.9rem;
}

.notice-banner {
  background: color-mix(in srgb, #22c55e 10%, var(--app-card));
  color: #166534;
}

.queue-banner {
  background: color-mix(in srgb, #2563eb 10%, var(--app-card));
  color: var(--app-text);
}

.state-message {
  text-align: center;
  padding: 60px 20px;
  color: var(--app-text-muted);
  font-size: 0.95rem;
}

.state-message span {
  display: block;
  font-size: 3rem;
  margin-bottom: 10px;
}

.rules-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 18px;
}

.rule-card {
  border: 1px solid var(--app-border);
  border-radius: 12px;
  padding: 16px;
  background: var(--app-card);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.rule-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--app-border);
  padding-bottom: 12px;
}

.rule-card__header h3 {
  margin: 0;
  font-size: 1rem;
  flex: 1;
}

.rule-actions {
  display: flex;
  gap: 8px;
}

.btn-toggle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid var(--app-border);
  background: var(--app-bg);
  color: var(--app-text-muted);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-toggle.enabled {
  background: #10b981;
  color: white;
  border-color: #10b981;
}

.btn-toggle:hover {
  border-color: var(--app-primary);
  color: var(--app-primary);
}

.btn-icon {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 1rem;
  border-radius: 4px;
  transition: background 0.2s;
}

.btn-icon:hover {
  background: var(--app-bg);
}

.rule-info {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.badge {
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
}

.type-schedule { background: #dbeafe; color: #1e40af; }
.type-event { background: #fce7f3; color: #831843; }
.type-condition { background: #fef3c7; color: #92400e; }

.badge-trigger {
  background: #f0fdf4;
  color: #15803d;
}

.rule-details {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.85rem;
}

.rule-details p {
  margin: 0;
}

.rule-details strong {
  color: var(--app-text);
}

.rule-card__footer {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--app-card);
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-large {
  max-width: 800px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--app-border);
}

.modal-header h3 {
  margin: 0;
  font-size: 1.2rem;
}

.btn-close {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 1.2rem;
  color: var(--app-text-muted);
  transition: color 0.2s;
}

.btn-close:hover {
  color: var(--app-text);
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 600;
  font-size: 0.9rem;
}

.form-group small {
  display: block;
  margin-top: 4px;
  color: var(--app-text-muted);
  font-size: 0.8rem;
}

.app-input,
.app-select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--app-border);
  border-radius: 6px;
  background: var(--app-bg);
  color: var(--app-text);
  font-family: inherit;
  font-size: 0.95rem;
}

.app-input:focus,
.app-select:focus {
  outline: none;
  border-color: var(--app-primary);
  box-shadow: 0 0 0 2px rgba(0, 122, 255, 0.1);
}

.modal-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 16px 20px;
  border-top: 1px solid var(--app-border);
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--app-primary);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-secondary {
  background: var(--app-bg);
  color: var(--app-text);
  border: 1px solid var(--app-border);
}

.btn-secondary:hover {
  background: var(--app-border);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 0.85rem;
}

.logs-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.logs-table thead {
  background: var(--app-bg);
  border-bottom: 2px solid var(--app-border);
}

.logs-table th {
  padding: 12px;
  text-align: left;
  font-weight: 600;
}

.logs-table td {
  padding: 12px;
  border-bottom: 1px solid var(--app-border);
}

.result-cell {
  font-family: monospace;
  font-size: 0.8rem;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 768px) {
  .rules-grid {
    grid-template-columns: 1fr;
  }

  .modal {
    max-width: 95%;
  }

  .flow-selector {
    flex-direction: column;
    align-items: flex-start;
  }

  .flow-selector .app-select {
    max-width: 100%;
  }
}
</style>

<style scoped>
.flow-automation {
  padding: clamp(16px, 2vw, 24px);
  max-width: 1280px;
  margin: 0 auto;
}
.flow-automation .page-header,
.flow-automation .flow-selector,
.flow-automation .rule-card,
.flow-automation .modal {
  border: 1px solid var(--app-border);
  border-radius: 14px;
  background: linear-gradient(180deg, var(--app-card-elevated), var(--app-card));
  box-shadow: var(--app-soft-shadow);
}
.flow-automation .page-header,
.flow-automation .flow-selector {
  padding: 14px 16px;
}
.flow-automation .badge,
.flow-automation .btn-toggle,
.flow-automation .btn-icon {
  border-radius: 999px;
}
.flow-automation .btn,
.flow-automation .app-input,
.flow-automation .app-select {
  border-radius: 10px;
}
.flow-automation .app-input:focus,
.flow-automation .app-select:focus {
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.14);
}
@media (max-width: 768px) {
  .flow-automation {
    padding: 12px;
  }
  .flow-automation .page-header,
  .flow-automation .flow-selector {
    padding: 12px;
  }
}
</style>
