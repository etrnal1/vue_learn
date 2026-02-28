<template>
  <div class="agent-runner">
    <header class="agent-header">
      <div>
        <p class="eyebrow">工作流 › 代理执行</p>
        <h1>流程代理执行</h1>
        <p class="subtitle">用“计划 → 执行 → 记录”的方式串联常用操作：检查、导出、归档。</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-outline" :disabled="busy" @click="resetRun">重置</button>
        <button class="btn btn-primary" :disabled="busy || !selectedPlaybook" @click="runPlaybook">
          {{ busy ? '执行中…' : '执行' }}
        </button>
      </div>
    </header>

    <div class="agent-layout">
      <aside class="agent-left">
        <div class="panel-title">Playbooks</div>
        <div class="playbook-list">
          <button
            v-for="book in playbooks"
            :key="book.id"
            class="playbook-item"
            :class="{ active: selectedPlaybookId === book.id }"
            @click="selectPlaybook(book.id)"
          >
            <div class="playbook-item__title">{{ book.title }}</div>
            <div class="playbook-item__desc">{{ book.desc }}</div>
          </button>
        </div>
      </aside>

      <main class="agent-main">
        <div class="panel-title">执行计划</div>
        <div v-if="!selectedPlaybook" class="empty-state">从左侧选择一个 playbook 开始。</div>
        <div v-else class="plan">
          <div v-for="(step, idx) in steps" :key="step.id" class="plan-step" :class="step.status">
            <div class="plan-step__left">
              <div class="plan-step__index">{{ idx + 1 }}</div>
              <div class="plan-step__content">
                <div class="plan-step__title">{{ step.title }}</div>
                <div v-if="step.detail" class="plan-step__detail">{{ step.detail }}</div>
              </div>
            </div>
            <div class="plan-step__status">{{ statusLabel(step.status) }}</div>
          </div>
        </div>

        <div class="panel-title panel-title--spaced">运行日志</div>
        <div class="logs">
          <div v-if="logs.length === 0" class="logs-empty">暂无日志</div>
          <div v-for="(line, i) in logs" :key="i" class="log-line">
            <span class="log-ts">{{ line.ts }}</span>
            <span class="log-msg" :class="line.level">{{ line.msg }}</span>
          </div>
        </div>
      </main>

      <aside class="agent-right">
        <div class="panel-title">输入</div>
        <label class="field">
          <span class="field-label">选择流程</span>
          <select v-model="selectedFlowId" class="field-input" :disabled="busy || loadingFlows">
            <option value="">（未选择）</option>
            <option v-for="flow in flows" :key="flow.id" :value="flow.id">{{ flow.name || flow.id }}</option>
          </select>
        </label>

        <div class="divider"></div>

        <div class="panel-title">导出选项</div>
        <label class="check">
          <input type="checkbox" v-model="exportOptions.includeComments" :disabled="busy" />
          <span>包含注释内容</span>
        </label>
        <label class="check">
          <input type="checkbox" v-model="exportOptions.includeVersionInfo" :disabled="busy" />
          <span>附带版本信息</span>
        </label>
        <label class="check">
          <input type="checkbox" v-model="exportOptions.includeAudit" :disabled="busy" />
          <span>展示审计记录</span>
        </label>
        <label class="check">
          <input type="checkbox" v-model="exportOptions.watermark" :disabled="busy" />
          <span>添加水印/印章</span>
        </label>

        <div class="divider"></div>

        <div class="panel-title">结果</div>
        <div class="result">
          <div class="result-item">
            <div class="result-k">上次执行</div>
            <div class="result-v">{{ lastRunAt ? formatDate(lastRunAt) : '—' }}</div>
          </div>
          <div class="result-item">
            <div class="result-k">状态</div>
            <div class="result-v" :class="lastRunStatus">{{ lastRunStatusLabel }}</div>
          </div>
        </div>
      </aside>
    </div>

    <div v-if="message" class="toast" :class="message.type">{{ message.text }}</div>
  </div>
</template>

<script>
import { api } from '../../utils/api.js'
import { recordAudit } from '../../utils/auditLog.js'

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function safeName(name) {
  return String(name || '').replace(/[\\/:*?"<>|]/g, '').trim()
}

function downloadText(content, fileName, mime = 'text/plain') {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export default {
  name: 'FlowAgentRunner',
  data() {
    return {
      flows: [],
      loadingFlows: false,
      selectedFlowId: '',
      selectedPlaybookId: 'lint-and-summary',
      steps: [],
      logs: [],
      busy: false,
      message: null,
      messageTimer: null,
      lastRunAt: null,
      lastRunStatus: 'idle',
      exportOptions: {
        includeComments: true,
        includeVersionInfo: true,
        includeAudit: true,
        watermark: false
      }
    }
  },
  computed: {
    playbooks() {
      return [
        {
          id: 'lint-and-summary',
          title: '检查 + 生成概要（本地）',
          desc: '对流程步骤做质量检查（空字段/条件步骤），并生成 Markdown 概要下载。'
        },
        {
          id: 'server-export',
          title: '服务端导出（PDF/Word）',
          desc: '调用 /flows/:id/export 申请导出，并记录审计日志。'
        }
      ]
    },
    selectedPlaybook() {
      return this.playbooks.find((b) => b.id === this.selectedPlaybookId) || null
    },
    selectedFlow() {
      return this.flows.find((f) => f.id === this.selectedFlowId) || null
    },
    lastRunStatusLabel() {
      if (this.lastRunStatus === 'success') return '成功'
      if (this.lastRunStatus === 'error') return '失败'
      if (this.lastRunStatus === 'running') return '执行中'
      return '—'
    }
  },
  methods: {
    statusLabel(status) {
      if (status === 'done') return '完成'
      if (status === 'running') return '执行中'
      if (status === 'error') return '失败'
      return '待执行'
    },
    formatDate(value) {
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return String(value || '')
      return date.toLocaleString()
    },
    log(msg, level = 'info') {
      const ts = new Date().toLocaleTimeString()
      this.logs.push({ ts, msg: String(msg), level })
      this.logs = this.logs.slice(-200)
    },
    showMessage(text, type = 'info') {
      this.message = { text, type }
      if (this.messageTimer) clearTimeout(this.messageTimer)
      this.messageTimer = setTimeout(() => {
        this.message = null
      }, 3200)
    },
    async loadFlows() {
      this.loadingFlows = true
      try {
        const result = await api.flows.getAll()
        this.flows = Array.isArray(result) ? result : []
        if (!this.selectedFlowId && this.flows.length) {
          this.selectedFlowId = this.flows[0].id
        }
      } catch (error) {
        this.showMessage(`加载流程失败: ${error?.message}`, 'error')
      } finally {
        this.loadingFlows = false
      }
    },
    selectPlaybook(id) {
      if (this.busy) return
      this.selectedPlaybookId = id
      this.resetRun(false)
      this.bootstrapPlan()
    },
    resetRun(clearSelection = true) {
      this.steps = []
      this.logs = []
      this.lastRunStatus = 'idle'
      if (clearSelection) {
        this.selectedPlaybookId = 'lint-and-summary'
      }
      this.bootstrapPlan()
    },
    bootstrapPlan() {
      const book = this.selectedPlaybook
      if (!book) return
      if (book.id === 'lint-and-summary') {
        this.steps = [
          { id: 'load', title: '获取流程数据', detail: '从 /flows 获取并定位当前选择流程', status: 'pending' },
          { id: 'lint', title: '质量检查（lint）', detail: '检查空字段、条件步骤、描述完整性', status: 'pending' },
          { id: 'summary', title: '生成概要（Markdown）', detail: '生成可归档的概要并触发下载', status: 'pending' },
          { id: 'audit', title: '写入审计日志', detail: '记录本次执行的关键信息', status: 'pending' }
        ]
        return
      }
      if (book.id === 'server-export') {
        this.steps = [
          { id: 'validate', title: '参数校验', detail: '确认已选择流程与导出选项', status: 'pending' },
          { id: 'export-pdf', title: '申请导出 PDF', detail: 'POST /flows/:id/export', status: 'pending' },
          { id: 'export-word', title: '申请导出 Word', detail: 'POST /flows/:id/export', status: 'pending' },
          { id: 'audit', title: '写入审计日志', detail: '记录导出申请', status: 'pending' }
        ]
      }
    },
    setStepStatus(id, status, detail) {
      const idx = this.steps.findIndex((s) => s.id === id)
      if (idx < 0) return
      const next = { ...this.steps[idx], status }
      if (detail !== undefined) next.detail = detail
      this.steps.splice(idx, 1, next)
    },
    async runPlaybook() {
      if (this.busy) return
      if (!this.selectedPlaybook) return

      this.busy = true
      this.lastRunAt = Date.now()
      this.lastRunStatus = 'running'
      this.log(`开始执行：${this.selectedPlaybook.title}`)

      try {
        if (this.selectedPlaybook.id === 'lint-and-summary') {
          await this.runLintAndSummary()
        } else if (this.selectedPlaybook.id === 'server-export') {
          await this.runServerExport()
        } else {
          throw new Error('未知 playbook')
        }

        this.lastRunStatus = 'success'
        this.showMessage('执行完成', 'success')
      } catch (error) {
        this.lastRunStatus = 'error'
        this.log(`执行失败：${error?.message || error}`, 'error')
        this.showMessage(`执行失败：${error?.message || '未知错误'}`, 'error')
      } finally {
        this.busy = false
      }
    },
    async runLintAndSummary() {
      this.setStepStatus('load', 'running')
      if (!this.flows.length) await this.loadFlows()
      if (!this.selectedFlow) throw new Error('未选择流程')
      this.log(`已选择流程：${this.selectedFlow.name || this.selectedFlow.id}`)
      this.setStepStatus('load', 'done')

      this.setStepStatus('lint', 'running')
      await sleep(120)
      const lint = this.lintFlow(this.selectedFlow)
      lint.lines.forEach((line) => this.log(line, lint.ok ? 'info' : 'warn'))
      this.setStepStatus('lint', lint.ok ? 'done' : 'done', lint.ok ? '未发现明显问题' : `发现 ${lint.issues} 个问题`)

      this.setStepStatus('summary', 'running')
      await sleep(120)
      const md = this.buildSummaryMarkdown(this.selectedFlow, lint)
      const now = new Date()
      const base = safeName(this.selectedFlow.name) || `flow_${this.selectedFlow.id}`
      downloadText(md, `${base}_概要_${now.toISOString().slice(0, 10)}.md`, 'text/markdown')
      this.log('已生成概要并触发下载', 'info')
      this.setStepStatus('summary', 'done')

      this.setStepStatus('audit', 'running')
      recordAudit({
        action: 'agent_run',
        detail: `lint-and-summary · flow=${this.selectedFlow.name || this.selectedFlow.id} · issues=${lint.issues}`,
        flowId: this.selectedFlow.id,
        status: lint.ok ? 'success' : 'warning'
      })
      this.setStepStatus('audit', 'done')
    },
    lintFlow(flow) {
      const steps = Array.isArray(flow.steps) ? flow.steps : []
      const lines = []
      let issues = 0
      const pushIssue = (msg) => {
        issues += 1
        lines.push(`• ${msg}`)
      }

      if (!String(flow.name || '').trim()) pushIssue('流程名称为空')
      if (steps.length === 0) pushIssue('流程没有任何步骤')

      const conditionalCount = steps.filter((s) => !!s.conditional).length
      if (conditionalCount > 0) {
        lines.push(`• 条件步骤：${conditionalCount} 个`)
      }

      steps.forEach((step, index) => {
        const title = step.name || `步骤 ${index + 1}`
        if (!String(step.name || '').trim()) pushIssue(`${title}：名称为空`)
        if (!String(step.description || '').trim()) pushIssue(`${title}：描述为空`)
        if (!String(step.assignee || '').trim()) lines.push(`• ${title}：未设置负责人`)
      })

      if (issues === 0) lines.unshift('• 通过：未发现明显质量问题')
      return { ok: issues === 0, issues, lines }
    },
    buildSummaryMarkdown(flow, lint) {
      const steps = Array.isArray(flow.steps) ? flow.steps : []
      const lines = []
      lines.push(`# ${flow.name || '未命名流程'}`)
      if (flow.description) {
        lines.push(flow.description)
      }
      lines.push('')
      lines.push('## 元信息')
      lines.push(`- 流程 ID：${flow.id}`)
      lines.push(`- 步骤数：${steps.length}`)
      lines.push(`- 状态：${this.getFlowStatus(flow) === 'published' ? '启用' : '草稿'}`)
      lines.push('')
      lines.push('## 质量检查')
      lint.lines.forEach((l) => lines.push(l))
      lines.push('')
      lines.push('## 步骤')
      steps.forEach((step, idx) => {
        lines.push(`### ${idx + 1}. ${step.name || `步骤 ${idx + 1}`}`)
        if (step.conditional) lines.push('- 类型：条件步骤')
        if (step.assignee) lines.push(`- 负责人：${step.assignee}`)
        if (step.duration) lines.push(`- 耗时：${step.duration}`)
        if (step.description) lines.push(step.description)
        if (step.tip) lines.push(`提示：${step.tip}`)
        if (step.note) lines.push(`备注：${step.note}`)
        lines.push('')
      })
      return lines.join('\n')
    },
    getFlowStatus(flow) {
      if (!flow) return 'draft'
      const raw = String(flow.status || '').toLowerCase()
      if (raw) return raw
      return flow.steps && flow.steps.length ? 'published' : 'draft'
    },
    async runServerExport() {
      this.setStepStatus('validate', 'running')
      if (!this.selectedFlow) throw new Error('未选择流程')
      this.setStepStatus('validate', 'done')

      const flowId = this.selectedFlow.id

      this.setStepStatus('export-pdf', 'running')
      const pdfResult = await api.flows.exportFlow(flowId, {
        format: 'pdf',
        options: { ...this.exportOptions },
        versionId: this.selectedFlow.versionId || this.selectedFlow.latestVersionId || ''
      })
      this.log(`已申请 PDF 导出：${typeof pdfResult === 'string' ? pdfResult : '已提交'}`, 'info')
      this.setStepStatus('export-pdf', 'done')

      this.setStepStatus('export-word', 'running')
      const wordResult = await api.flows.exportFlow(flowId, {
        format: 'word',
        options: { ...this.exportOptions },
        versionId: this.selectedFlow.versionId || this.selectedFlow.latestVersionId || ''
      })
      this.log(`已申请 Word 导出：${typeof wordResult === 'string' ? wordResult : '已提交'}`, 'info')
      this.setStepStatus('export-word', 'done')

      this.setStepStatus('audit', 'running')
      recordAudit({
        action: 'agent_run',
        detail: `server-export · flow=${this.selectedFlow.name || flowId} · options=${JSON.stringify(this.exportOptions)}`,
        flowId
      })
      this.setStepStatus('audit', 'done')
    }
  },
  mounted() {
    this.bootstrapPlan()
    this.loadFlows()
  },
  beforeUnmount() {
    if (this.messageTimer) clearTimeout(this.messageTimer)
  }
}
</script>

<style scoped>
.agent-runner {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.agent-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  flex-wrap: wrap;
}

.eyebrow {
  margin: 0;
  text-transform: uppercase;
  font-size: 0.8em;
  letter-spacing: 0.08em;
  color: var(--app-text-muted);
}

.subtitle {
  margin: 6px 0 0;
  color: var(--app-text-muted);
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.btn-outline {
  border: 1px solid var(--app-border);
  background: transparent;
  color: var(--app-text);
  padding: 8px 14px;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
}

.btn-outline:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.agent-layout {
  display: grid;
  grid-template-columns: 260px 1fr 320px;
  gap: 16px;
  align-items: start;
}

.agent-left,
.agent-main,
.agent-right {
  border: 1px solid var(--app-border);
  background: var(--app-card);
  border-radius: 16px;
  box-shadow: var(--app-soft-shadow);
  padding: 14px;
}

.panel-title {
  font-weight: 800;
  color: var(--app-text);
  margin-bottom: 10px;
}

.panel-title--spaced {
  margin-top: 16px;
}

.playbook-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.playbook-item {
  text-align: left;
  border: 1px solid transparent;
  background: var(--app-card-elevated);
  border-radius: 12px;
  padding: 10px 10px;
  cursor: pointer;
  transition: border-color 0.15s, transform 0.15s;
}

.playbook-item:hover {
  transform: translateY(-1px);
}

.playbook-item.active {
  border-color: var(--app-primary);
}

.playbook-item__title {
  font-weight: 800;
  margin-bottom: 4px;
}

.playbook-item__desc {
  font-size: 0.86em;
  color: var(--app-text-muted);
}

.empty-state {
  padding: 18px;
  text-align: center;
  color: var(--app-text-muted);
}

.plan {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.plan-step {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
  padding: 10px;
  border-radius: 12px;
  border: 1px solid var(--app-border);
  background: var(--app-card-elevated);
}

.plan-step.running {
  border-color: var(--app-primary);
  box-shadow: 0 10px 24px rgba(2, 132, 199, 0.12);
}

.plan-step.error {
  border-color: rgba(239, 68, 68, 0.55);
}

.plan-step__left {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.plan-step__index {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--app-primary);
  color: var(--app-on-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  flex: 0 0 auto;
}

.plan-step__title {
  font-weight: 800;
}

.plan-step__detail {
  font-size: 0.85em;
  color: var(--app-text-muted);
  margin-top: 2px;
}

.plan-step__status {
  font-size: 0.85em;
  color: var(--app-text-muted);
  font-weight: 800;
  white-space: nowrap;
}

.logs {
  border: 1px solid var(--app-border);
  border-radius: 12px;
  background: var(--app-card-elevated);
  padding: 10px;
  max-height: 340px;
  overflow: auto;
}

.logs-empty {
  padding: 10px;
  color: var(--app-text-muted);
}

.log-line {
  display: grid;
  grid-template-columns: 90px 1fr;
  gap: 10px;
  padding: 6px 0;
  border-bottom: 1px dashed rgba(15, 23, 42, 0.12);
}

.log-line:last-child {
  border-bottom: none;
}

.log-ts {
  color: var(--app-text-muted);
  font-size: 0.82em;
  font-variant-numeric: tabular-nums;
}

.log-msg {
  font-size: 0.9em;
}

.log-msg.warn {
  color: #b45309;
  font-weight: 700;
}

.log-msg.error {
  color: #b91c1c;
  font-weight: 800;
}

.divider {
  height: 1px;
  background: rgba(15, 23, 42, 0.12);
  margin: 12px 0;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 8px;
}

.field-label {
  color: var(--app-text-muted);
  font-size: 0.85em;
  font-weight: 700;
}

.field-input {
  padding: 8px 10px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: var(--app-card-elevated);
  color: var(--app-text);
}

.check {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 6px 0;
  font-size: 0.9em;
}

.result {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.result-item {
  border: 1px solid var(--app-border);
  background: var(--app-card-elevated);
  border-radius: 12px;
  padding: 10px;
}

.result-k {
  color: var(--app-text-muted);
  font-size: 0.85em;
  font-weight: 800;
}

.result-v {
  margin-top: 4px;
  font-weight: 900;
}

.result-v.success {
  color: #047857;
}

.result-v.error {
  color: #b91c1c;
}

.toast {
  position: fixed;
  bottom: 22px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 14px;
  border-radius: 999px;
  border: 1px solid transparent;
  background: var(--app-card-elevated);
  box-shadow: var(--app-soft-shadow);
  font-weight: 800;
}

.toast.success {
  border-color: rgba(16, 185, 129, 0.35);
  color: #047857;
}

.toast.error {
  border-color: rgba(239, 68, 68, 0.35);
  color: #b91c1c;
}

@media (max-width: 1100px) {
  .agent-layout {
    grid-template-columns: 1fr;
  }
}
</style>

