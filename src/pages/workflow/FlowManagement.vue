<template>
  <section class="flow-management">
    <header class="flow-management__header">
      <div>
        <p class="eyebrow">工作流管理</p>
        <h2>统一管理流程模板、版本与发布策略。</h2>
        <p class="subcopy">展示所有流程模板、当前发布版本与可回滚状态，帮助团队追踪变更并快速发布。</p>
      </div>
      <div class="flow-management__header-actions">
        <input
          v-model="searchQuery"
          class="search-input"
          type="search"
          placeholder="搜索流程名称或描述"
          :disabled="loadingFlows"
        />
        <button class="btn" :disabled="loadingFlows" @click="loadFlows">
          {{ loadingFlows ? '刷新中...' : '刷新流程列表' }}
        </button>
        <span v-if="historyLoading" class="history-loading">发布历史同步中…</span>
      </div>
    </header>

    <div v-if="errorMessage" class="alert">{{ errorMessage }}</div>
    <div v-if="historyError" class="alert">{{ historyError }}</div>

    <div v-if="loadingFlows" class="flow-management__state">加载流程中…</div>
    <div v-else-if="filteredFlows.length === 0" class="flow-management__state">暂无符合条件的流程模板</div>

    <div v-else class="flow-grid">
      <article v-for="flow in filteredFlows" :key="flow.id" class="flow-card">
        <header class="flow-card__head">
          <div class="flow-card__badge">{{ flow.icon || '🌀' }}</div>
          <div>
            <h3>{{ flow.name }}</h3>
            <p class="desc">{{ flow.description || '暂无描述' }}</p>
          </div>
        </header>

        <ul class="flow-card__meta">
          <li><span>当前版本</span><strong>{{ currentVersion(flow.id) }}</strong></li>
          <li><span>步骤</span><strong>{{ (flow.steps || []).length }}</strong></li>
          <li><span>作者</span><strong>{{ getAuthor(flow.author_name ?? flow.authorId ?? flow.author_id) }}</strong></li>
          <li><span>最后更新</span><strong>{{ formatDate(flow.updatedAt ?? flow.updated_at) }}</strong></li>
        </ul>

        <div class="flow-card__actions">
          <button class="btn btn--primary" :disabled="actionBusy === flow.id" @click="releaseFlow(flow)">
            发布版本
          </button>
          <button
            v-if="canRollback(flow.id)"
            class="btn btn--ghost"
            :disabled="actionBusy === flow.id"
            @click="rollbackFlow(flow)"
          >
            回滚版本
          </button>
          <button class="btn btn--link" @click="viewDetails(flow)">查看步骤</button>
        </div>

        <section class="flow-card__history">
          <h4>版本历史</h4>
          <p v-if="releaseHistoryFor(flow.id).length === 0" class="hint">尚未发布任何版本</p>
          <ul v-else>
            <li v-for="record in releaseHistoryFor(flow.id).slice().reverse()" :key="record.version">
              <div class="history__row">
                <strong>{{ record.version }}</strong>
                <small>{{ formatDate(record.created_at ?? record.timestamp) }}</small>
              </div>
              <p v-if="record.note" class="note">{{ record.note }}</p>
            </li>
          </ul>
        </section>
      </article>
    </div>

    <aside v-if="selectedFlow" class="flow-detail">
      <div class="flow-detail__header">
        <div>
          <h3>{{ selectedFlow.name }} · 步骤详情</h3>
          <p>{{ selectedFlow.description || '暂无说明' }}</p>
        </div>
        <div class="flow-detail__header-actions">
          <button class="btn btn--primary" @click="editFlowInEditor(selectedFlow)">编辑流程</button>
          <button class="btn btn--ghost" @click="selectedFlow = null">关闭</button>
        </div>
      </div>
      <ol class="flow-detail__steps">
        <li v-for="(step, index) in selectedFlow.steps || []" :key="step.id || index">
          <div class="step__index">{{ index + 1 }}</div>
          <div class="step__content">
            <p class="step__title">{{ step.name || step.title || `步骤 ${index + 1}` }}</p>

            <div class="step__field">
              <label class="step__field-label">
                <span class="field-label-text">步骤描述</span>
                <span class="field-label-hint">说明这个步骤的内容和目的</span>
              </label>
              <p class="step__desc">{{ step.description || '暂无描述' }}</p>
            </div>

            <div class="step__meta">
              <span><strong>负责人：</strong>{{ step.assignee || '待分配' }}</span>
              <span><strong>预计耗时：</strong>{{ step.duration || '未设定' }}</span>
              <span v-if="step.conditional" class="conditional-badge">条件触发</span>
            </div>
          </div>

          <div class="step__actions">
            <button
              class="step-action-btn"
              :disabled="index === 0"
              @click="moveStepInPreview(index, -1)"
              title="上移步骤"
            >
              ⬆️
            </button>
            <button
              class="step-action-btn"
              :disabled="index === (selectedFlow.steps || []).length - 1"
              @click="moveStepInPreview(index, 1)"
              title="下移步骤"
            >
              ⬇️
            </button>
          </div>
        </li>
        <li v-if="(selectedFlow.steps || []).length === 0" class="empty-step">该流程尚未定义步骤。</li>
      </ol>
      <section v-if="selectedDiff.length" class="flow-detail__diff">
        <h4>与上一个版本的差异</h4>
        <ul>
          <li v-for="item in selectedDiff" :key="item.key" :class="['diff-item', `diff-item--${item.type}`]">
            <span class="diff-icon">{{ item.type === 'added' ? '+' : item.type === 'removed' ? '−' : '≈' }}</span>
            <div>
              <strong>{{ item.name }}</strong>
              <p>{{ item.detail }}</p>
            </div>
          </li>
        </ul>
      </section>
    </aside>
  </section>
</template>

<script>
import { api } from '../../utils/api.js'

export default {
  name: 'FlowManagement',
  data() {
    return {
      flows: [],
      loadingFlows: false,
      historyLoading: false,
      errorMessage: '',
      historyError: '',
      searchQuery: '',
      selectedFlow: null,
      releaseHistory: {},
      actionBusy: null
    }
  },
  computed: {
    filteredFlows() {
      const normalizedQuery = (this.searchQuery || '').trim().toLowerCase()
      const flows = [...this.flows]
      flows.sort((a, b) => {
        const at = a.updatedAt ?? a.updated_at ?? 0
        const bt = b.updatedAt ?? b.updated_at ?? 0
        return bt - at
      })
      if (!normalizedQuery) {
        return flows
      }
      return flows.filter((flow) => {
        const name = (flow.name || '').toLowerCase()
        const description = (flow.description || '').toLowerCase()
        return name.includes(normalizedQuery) || description.includes(normalizedQuery)
      })
    },
    selectedDiff() {
      if (!this.selectedFlow) return []
      return this.diffSummary(this.selectedFlow.id)
    }
  },
  methods: {
    async loadFlows() {
      this.loadingFlows = true
      this.errorMessage = ''
      try {
        const payload = await api.flows.getAll()
        this.flows = Array.isArray(payload) ? payload : []
      } catch (error) {
        this.errorMessage = error?.message || '无法加载流程列表'
      } finally {
        this.loadingFlows = false
      }
    },
    async loadReleaseHistory() {
      this.historyLoading = true
      this.historyError = ''
      try {
        const records = await api.flows.getReleases()
        const map = {}
        for (const record of Array.isArray(records) ? records : []) {
          const flowId = record.flow_id ?? record.flowId
          if (!flowId) continue
          ;(map[flowId] ??= []).push(record)
        }
        this.releaseHistory = map
      } catch (error) {
        this.historyError = error?.message || '无法加载发布历史'
      } finally {
        this.historyLoading = false
      }
    },
    releaseHistoryFor(flowId) {
      const history = this.releaseHistory[flowId] || []
      return [...history].sort((a, b) => {
        const at = a.created_at ?? a.createdAt ?? 0
        const bt = b.created_at ?? b.createdAt ?? 0
        return at - bt
      })
    },
    currentVersion(flowId) {
      const history = this.releaseHistoryFor(flowId)
      if (history.length === 0) return '未发布'
      return history[history.length - 1].version
    },
    canRollback(flowId) {
      return this.releaseHistoryFor(flowId).length > 0
    },
    async releaseFlow(flow) {
      const history = this.releaseHistoryFor(flow.id)
      const defaultVersion = `v${history.length + 1}`
      const versionInput = window.prompt('请输入发布版本号', defaultVersion)
      if (versionInput === null) return
      const noteInput = window.prompt('可选：填入发布说明', '')
      const formattedVersion = (versionInput.trim() || defaultVersion)
      const note = noteInput === null ? '' : noteInput.trim()

      this.actionBusy = flow.id
      this.errorMessage = ''
      const validation = this.validateFlow(flow)
      if (!validation.valid) {
        this.errorMessage = validation.message
        this.actionBusy = null
        return
      }
      try {
        const payload = {
          id: flow.id,
          name: flow.name,
          description: flow.description,
          icon: flow.icon,
          steps: flow.steps || []
        }
        const record = await api.flows.createRelease(flow.id, { version: formattedVersion, note, payload })
        const updatedHistory = [...history, record]
        this.releaseHistory = { ...this.releaseHistory, [flow.id]: updatedHistory }
        this.errorMessage = ''
        await this.loadReleaseHistory()
      } catch (error) {
        this.errorMessage = error?.message || '发布失败'
      } finally {
        this.actionBusy = null
      }
    },
    async rollbackFlow(flow) {
      const history = this.releaseHistoryFor(flow.id)
      if (history.length === 0) return
      if (!window.confirm('确定要回滚到上一个发布版本？此操作不可撤消。')) {
        return
      }

      this.actionBusy = flow.id
      try {
        const result = await api.flows.rollbackRelease(flow.id)
        const updatedHistory = Array.isArray(result?.history) ? result.history : []
        this.releaseHistory = { ...this.releaseHistory, [flow.id]: updatedHistory }
        this.errorMessage = ''
        await this.loadReleaseHistory()
      } catch (error) {
        this.errorMessage = error?.message || '回滚失败'
      } finally {
        this.actionBusy = null
      }
    },
    viewDetails(flow) {
      this.selectedFlow = JSON.parse(JSON.stringify(flow))
    },
    formatDate(value) {
      if (!value) return '—'
      const date = new Date(Number(value))
      if (Number.isNaN(date.getTime())) return '—'
      return date.toLocaleString('zh-CN', { hour12: false })
    },
    getAuthor(authorId) {
      if (!authorId) return '系统'
      return authorId
    },
    validateFlow(flow) {
      const steps = flow.steps || []
      if (steps.length === 0) {
        return { valid: false, message: '请为流程添加至少一个步骤，再发布。' }
      }
      for (let idx = 0; idx < steps.length; idx++) {
        const step = steps[idx]
        if (!String((step.name || step.title || '').trim())) {
          return { valid: false, message: `第 ${idx + 1} 步缺少标题，无法发布。` }
        }
      }
      return { valid: true }
    },
    parsePayload(record) {
      if (!record || record.payload == null) return null
      if (typeof record.payload === 'object') return record.payload
      try {
        return JSON.parse(record.payload)
      } catch (error) {
        return null
      }
    },
    diffSummary(flowId) {
      const history = this.releaseHistoryFor(flowId)
      if (history.length < 2) return []
      const prev = history[history.length - 2]
      const curr = history[history.length - 1]
      const prevSteps = this.parsePayload(prev)?.steps || []
      const currSteps = this.parsePayload(curr)?.steps || []

      const normalize = (step, index) => {
        const key = step.id || `${step.name || step.title || ''}-${index}`
        return {
          key,
          name: step.name || step.title || `步骤 ${index + 1}`,
          description: step.description || '',
          assignee: step.assignee || '',
          duration: step.duration ?? null,
          conditional: Boolean(step.conditional)
        }
      }

      const prevMap = new Map(prevSteps.map((step, index) => {
        const normalized = normalize(step, index)
        return [normalized.key, normalized]
      }))
      const currMap = new Map(currSteps.map((step, index) => {
        const normalized = normalize(step, index)
        return [normalized.key, normalized]
      }))
      const diff = []

      for (const [key, currStep] of currMap.entries()) {
        const prevStep = prevMap.get(key)
        if (!prevStep) {
          diff.push({ type: 'added', key, name: currStep.name, detail: '新增步骤' })
          continue
        }
        const changes = []
        if (prevStep.description !== currStep.description) changes.push('描述更新')
        if (prevStep.assignee !== currStep.assignee) changes.push('负责人变更')
        if ((prevStep.duration || '') !== (currStep.duration || '')) changes.push('预计耗时变更')
        if (prevStep.conditional !== currStep.conditional) changes.push('条件触发状态变更')
        if (changes.length > 0) {
          diff.push({ type: 'updated', key, name: currStep.name, detail: changes.join(' · ') })
        }
      }

      for (const key of prevMap.keys()) {
        if (!currMap.has(key)) {
          const removed = prevMap.get(key)
          diff.push({ type: 'removed', key, name: removed.name, detail: '已移除步骤' })
        }
      }

      return diff
    },

    /**
     * 在预览界面中移动步骤
     * @param {number} index - 当前步骤索引
     * @param {number} direction - 移动方向 (-1: 上移, 1: 下移)
     */
    async moveStepInPreview(index, direction) {
      if (!this.selectedFlow || !this.selectedFlow.steps) return

      const steps = this.selectedFlow.steps
      if (steps.length < 2) return

      const newIndex = index + direction

      // 边界检查
      if (newIndex < 0 || newIndex >= steps.length) return

      // 交换步骤
      const temp = steps[index]
      this.$set(steps, index, steps[newIndex])
      this.$set(steps, newIndex, temp)

      // 保存到数据库
      try {
        await api.flows.update(this.selectedFlow.id, {
          name: this.selectedFlow.name,
          description: this.selectedFlow.description,
          icon: this.selectedFlow.icon,
          steps: steps
        })

        // 同步更新流程列表中的数据
        const flowIndex = this.flows.findIndex(f => f.id === this.selectedFlow.id)
        if (flowIndex !== -1) {
          this.$set(this.flows[flowIndex], 'steps', [...steps])
        }

        // 提示用户
        const directionText = direction === -1 ? '上移' : '下移'
        const message = `已将第 ${index + 1} 步${directionText}到第 ${newIndex + 1} 步`
        console.log(message)

      } catch (error) {
        this.errorMessage = error?.message || '步骤排序失败'
        console.error('步骤排序失败:', error)
      }
    },

    /**
     * 在编辑器中编辑流程
     * @param {Object} flow - 流程对象
     */
    editFlowInEditor(flow) {
      if (!flow) return

      // 跳转到编辑器页面
      // 假设编辑器的路由参数是流程 ID
      window.location.href = `/workflow/editor/${flow.id}`
    }
  },
  mounted() {
    this.loadFlows()
    this.loadReleaseHistory()
  }
}
</script>

<style scoped>
.flow-management {
  padding: 18px;
  border-radius: 18px;
  background: var(--app-card);
  box-shadow: var(--app-soft-shadow);
}

.flow-management__header {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: 22px;
}

.eyebrow {
  font-size: 0.85rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--app-text-muted);
  margin: 0 0 4px;
}

.flow-management__header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.search-input {
  border-radius: 10px;
  border: 1px solid var(--app-border);
  padding: 10px 14px;
  min-width: 220px;
  font-size: 0.95rem;
  background: var(--app-bg);
  color: var(--app-text);
}

.btn {
  border: none;
  background: var(--app-primary);
  color: white;
  padding: 10px 14px;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.flow-management__state {
  padding: 40px;
  text-align: center;
  color: var(--app-text-muted);
}

.alert {
  padding: 12px 14px;
  background: var(--app-border);
  color: var(--app-text);
  border-radius: 10px;
  margin-bottom: 12px;
}

.history-loading {
  font-size: 0.85rem;
  color: var(--app-text-muted);
}

.flow-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 18px;
}

.flow-card {
  padding: 18px;
  border-radius: 16px;
  border: 1px solid var(--app-border);
  background: var(--app-card);
  box-shadow: var(--app-soft-shadow);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.flow-card__head {
  display: flex;
  gap: 14px;
  align-items: center;
}

.flow-card__badge {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: var(--app-primary-light);
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 1.6rem;
}

.flow-card__head h3 {
  margin: 0;
}

.desc {
  margin: 4px 0 0;
  color: var(--app-text-muted);
  font-size: 0.9rem;
}

.flow-card__meta {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(120px, 1fr));
  gap: 8px 12px;
}

.flow-card__meta li {
  font-size: 0.85rem;
  color: var(--app-text-muted);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.flow-card__meta strong {
  color: var(--app-text);
  font-size: 0.95rem;
}

.flow-card__actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.btn--primary {
  background: var(--app-primary);
}

.btn--ghost {
  background: transparent;
  border: 1px solid var(--app-border);
  color: var(--app-text);
}

.btn--link {
  background: transparent;
  color: var(--app-primary);
  padding: 0;
  min-width: auto;
}

.flow-card__history {
  border-top: 1px solid var(--app-border);
  padding-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.flow-card__history .hint {
  color: var(--app-text-muted);
  font-size: 0.85rem;
  margin: 4px 0 0;
}

.flow-card__history ul {
  padding: 0;
  margin: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.flow-card__history li {
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.history__row {
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
}

.note {
  margin: 4px 0 0;
  font-size: 0.82rem;
  color: var(--app-text-muted);
}

.flow-detail {
  margin-top: 24px;
  padding: 18px;
  border-radius: 16px;
  border: 1px solid var(--app-border);
  background: var(--app-card);
}

.flow-detail__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.flow-detail__steps {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: calc(100vh - 200px);
  overflow-y: auto;
  padding-right: 8px;
}

.flow-detail__steps::-webkit-scrollbar {
  width: 6px;
}

.flow-detail__steps::-webkit-scrollbar-track {
  background: var(--app-card);
  border-radius: 3px;
}

.flow-detail__steps::-webkit-scrollbar-thumb {
  background: var(--app-border);
  border-radius: 3px;
}

.flow-detail__steps::-webkit-scrollbar-thumb:hover {
  background: var(--app-text-muted);
}

.flow-detail__steps li {
  display: flex;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px dashed rgba(0, 0, 0, 0.05);
}

.step__index {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--app-border);
  display: flex;
  justify-content: center;
  align-items: center;
  font-weight: 700;
}

.step__title {
  margin: 0;
  font-weight: 600;
}

.step__desc {
  margin: 4px 0;
  color: var(--app-text-muted);
  font-size: 0.9rem;
}

.step__meta {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 0.82rem;
  color: var(--app-text-muted);
}

.empty-step {
  text-align: center;
  color: var(--app-text-muted);
}

.flow-detail__diff {
  margin-top: 18px;
  padding-top: 12px;
  border-top: 1px solid var(--app-border);
}

.flow-detail__diff h4 {
  margin: 0 0 8px;
  font-size: 1rem;
}

.flow-detail__diff ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.diff-item {
  display: flex;
  gap: 10px;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid var(--app-border);
  background: var(--app-card);
}

.diff-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--app-border);
}

.diff-item--added {
  border-color: #16a34a;
}

.diff-item--removed {
  border-color: #dc2626;
}

.diff-item--updated {
  border-color: #f59e0b;
}

.diff-item p {
  margin: 4px 0 0;
  font-size: 0.85rem;
  color: var(--app-text-muted);
}

.flow-detail__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.flow-detail__header-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.step__content {
  flex: 1;
}

.step__field {
  margin: 8px 0;
}

.step__field-label {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 4px;
}

.field-label-text {
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--app-text);
}

.field-label-hint {
  font-size: 0.75rem;
  color: var(--app-text-muted);
  font-weight: normal;
}

.step__meta {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 0.82rem;
  color: var(--app-text-muted);
  margin-top: 8px;
}

.step__meta strong {
  color: var(--app-text);
  font-weight: 600;
}

.conditional-badge {
  background: var(--app-primary-light);
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--app-primary);
}

.step__actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-left: auto;
}

.step-action-btn {
  width: 32px;
  height: 32px;
  border: 1px solid var(--app-border);
  background: var(--app-card);
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  transition: all 0.2s ease;
}

.step-action-btn:hover:not(:disabled) {
  background: var(--app-primary-light);
  border-color: var(--app-primary);
  transform: translateY(-2px);
}

.step-action-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.flow-detail__steps li {
  display: flex;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px dashed rgba(0, 0, 0, 0.05);
  align-items: flex-start;
}

@media (max-width: 900px) {
  .flow-card__meta {
    grid-template-columns: repeat(1, minmax(120px, 1fr));
  }

  .flow-management__header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
