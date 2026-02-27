<template>
  <div class="flow-preview-export">
    <header class="flow-preview-header">
      <div>
        <p class="eyebrow">工作流 · 预览与导出</p>
        <h1>企业级流程预览与下载</h1>
        <p class="subtitle">
          将流程图、步骤描述、提示和备注放在同一屏，快速对线上/待发布流程进行走查，并在需要时立即生成 JSON 或概要文档给审批/归档使用。
        </p>
      </div>
      <div class="header-actions">
        <button class="btn btn-primary" :disabled="!selectedFlow" @click="openPreviewWindow">
          在新窗口预览
        </button>
        <button class="btn btn-outline" :disabled="!selectedFlow || exporting" @click="downloadFlow('json')">
          下载 JSON
        </button>
        <button class="btn btn-outline" :disabled="!selectedFlow || exporting" @click="downloadFlow('markdown')">
          下载概要
        </button>
        <button class="btn btn-outline" :disabled="!selectedFlow || exporting" @click="downloadFlow('bpmn')">
          📄 下载 BPMN
        </button>
      </div>
    </header>

    <div class="preview-layout">
      <aside class="preview-list-column">
        <div class="list-heading">
          <p class="eyebrow">流程目录</p>
          <div class="list-controls">
            <input
              v-model="searchQuery"
              type="search"
              class="preview-search"
              placeholder="搜索流程名称或描述"
            />
            <div class="status-filters">
              <button
                v-for="status in statusChoices"
                :key="status.id"
                class="status-chip"
                :class="{ active: filterStatus === status.id }"
                @click="filterStatus = status.id"
              >
                {{ status.label }}
              </button>
            </div>
          </div>
        </div>

        <div v-if="loading" class="list-loading">
          <span class="list-loading__icon">⏳</span>
          <p>正在同步流程数据...</p>
        </div>

        <div v-else-if="filteredFlows.length === 0" class="list-empty">
          <p>没有符合条件的流程</p>
        </div>

        <div class="flow-card" v-for="flow in filteredFlows" :key="flow.id" :class="{ active: selectedFlow?.id === flow.id }">
          <div class="flow-card__header">
            <h3>{{ flow.name }}</h3>
            <span class="flow-card__badge">{{ (flow.steps || []).length }} 步</span>
          </div>
          <p class="flow-card__desc">{{ flow.description || '暂无描述' }}</p>
          <div class="flow-card__meta">
            <span>{{ formatDate(flow.updated_at || flow.updatedAt) }}</span>
            <span class="flow-status">{{ statusLabel(flow) }}</span>
          </div>
          <button class="btn btn-small" @click="selectFlow(flow)">
            {{ selectedFlow?.id === flow.id ? '当前选中' : '打开预览' }}
          </button>
        </div>
      </aside>

      <main class="preview-main">
        <div v-if="selectedFlow" class="preview-card">
          <div class="preview-card__header">
            <div>
              <p class="eyebrow">流程预览</p>
              <h2>{{ selectedFlow.name }}</h2>
              <p class="preview-card__desc">{{ selectedFlow.description || '暂无流程描述' }}</p>
            </div>
            <div class="preview-card__actions">
              <button class="btn btn-ghost" @click="openPreviewWindow">新窗口预览</button>
              <button class="btn btn-ghost" @click="downloadFlow('json')" :disabled="exporting">JSON</button>
              <button class="btn btn-ghost" @click="downloadFlow('markdown')" :disabled="exporting">概要</button>
              <button class="btn btn-ghost" @click="downloadFlow('bpmn')" :disabled="exporting">BPMN</button>
            </div>
          </div>
          <div class="preview-steps">
            <div
              v-for="(step, index) in previewSteps"
              :key="step.id || index"
              class="preview-step-row"
            >
              <div class="preview-step-row__index">{{ index + 1 }}</div>
              <div class="preview-step-row__content">
                <div class="preview-step-row__title">
                  {{ step.name || `步骤 ${index + 1}` }}
                  <span v-if="step.conditional" class="step-badge">⚡ 条件</span>
                </div>
                <p v-if="step.description" class="preview-step-row__description">{{ step.description }}</p>
                <div v-if="step.tip || step.note" class="preview-step-row__extra">
                  <p v-if="step.tip">提示：{{ step.tip }}</p>
                  <p v-if="step.note">备注：{{ step.note }}</p>
                </div>
                <div class="preview-step-row__meta">
                  <span v-if="step.assignee">👤 {{ step.assignee }}</span>
                  <span v-if="step.duration">⏱ {{ step.duration }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="preview-empty">
          <p>请从左侧列表中选择流程查看</p>
        </div>
      </main>

      <aside class="preview-side">
        <div class="meta-panel">
          <h3>流程信息</h3>
          <dl>
            <div>
              <dt>状态</dt>
              <dd>{{ selectedFlow ? statusLabel(selectedFlow) : '未选择' }}</dd>
            </div>
            <div>
              <dt>步骤数</dt>
              <dd>{{ selectedFlow?.steps?.length || 0 }}</dd>
            </div>
            <div>
              <dt>最近更新</dt>
              <dd>{{ selectedFlow ? formatDate(selectedFlow.updated_at || selectedFlow.updatedAt) : '—' }}</dd>
            </div>
            <div>
              <dt>负责人</dt>
              <dd>{{ selectedFlow?.owner || selectedFlow?.updated_by || '未映射' }}</dd>
            </div>
          </dl>
          <div class="meta-panel__downloads">
            <p class="meta-panel__title">导出选项</p>
            <div class="download-options">
              <span class="download-chip" v-for="format in downloadFormats" :key="format">
                {{ formatLabel(format) }}
              </span>
            </div>
            <button class="btn btn-primary" :disabled="!selectedFlow || exporting" @click="downloadFlow('markdown')">
              一键导出概要
            </button>
          </div>
          <div class="export-config">
            <p class="meta-panel__title">导出配置</p>
            <label class="export-option">
              <input type="checkbox" v-model="exportOptions.includeComments" />
              包含注释内容
            </label>
            <label class="export-option">
              <input type="checkbox" v-model="exportOptions.includeVersionInfo" />
              附带版本信息
            </label>
            <label class="export-option">
              <input type="checkbox" v-model="exportOptions.includeAudit" />
              展示审计记录
            </label>
            <label class="export-option">
              <input type="checkbox" v-model="exportOptions.watermark" />
              添加水印/印章
            </label>
            <div class="export-buttons">
              <button class="btn btn-primary" :disabled="!selectedFlow || exporting" @click="requestExport('pdf')">
                导出 PDF
              </button>
              <button class="btn btn-secondary" :disabled="!selectedFlow || exporting" @click="requestExport('word')">
                导出 Word
              </button>
            </div>
          </div>
        <div class="meta-panel__log">
          <h4>操作记录</h4>
          <ul>
            <li
              v-for="entry in auditEntries"
              :key="`${entry.timestamp}-${entry.action}`"
              class="audit-entry"
            >
              <span class="log-action">{{ entry.action }}</span>
              <span class="log-detail">{{ entry.detail || '无附加信息' }}</span>
              <span class="log-ts">{{ formatDate(entry.timestamp) }}</span>
            </li>
            <li v-if="!auditEntries.length" v-for="entry in activityLog" :key="entry">{{ entry }}</li>
          </ul>
        </div>
        </div>
      </aside>
    </div>

    <div v-if="message" class="preview-message" :class="message.type">
      {{ message.text }}
    </div>
  </div>
</template>

<script>
import { api } from '../../utils/api.js'
import { readAuditLog, recordAudit } from '../../utils/auditLog.js'

export default {
  name: 'FlowPreviewExport',
  data() {
    return {
      flows: [],
      selectedFlow: null,
      loading: false,
      searchQuery: '',
      filterStatus: 'all',
      exporting: false,
      message: null,
      messageTimer: null,
      downloadFormats: ['json', 'markdown'],
      auditEntries: [],
      exportOptions: {
        includeComments: true,
        includeVersionInfo: true,
        includeAudit: true,
        watermark: false
      },
      statusChoices: [
        { id: 'all', label: '全部' },
        { id: 'published', label: '已发布' },
        { id: 'draft', label: '草稿' }
      ]
    }
  },
  computed: {
    filteredFlows() {
      const query = this.searchQuery.trim().toLowerCase()
      return this.flows.filter((flow) => {
        const matchesQuery =
          !query ||
          (flow.name && flow.name.toLowerCase().includes(query)) ||
          (flow.description && flow.description.toLowerCase().includes(query))
        const status = this.getFlowStatus(flow)
        const matchesStatus = this.filterStatus === 'all' || status === this.filterStatus
        return matchesQuery && matchesStatus
      })
    },
    previewSteps() {
      return this.selectedFlow?.steps || []
    },
    activityLog() {
      if (!this.selectedFlow) return []
      const flow = this.selectedFlow
      return [
        `最近更新：${this.formatDate(flow.updated_at || flow.updatedAt)}`,
        `步骤总数：${flow.steps?.length || 0}`,
        `当前状态：${this.statusLabel(flow)}`
      ]
    }
  },
  methods: {
    async loadFlows() {
      this.loading = true
      try {
        const result = await api.flows.getAll()
        this.flows = Array.isArray(result) ? result : []
        if (!this.selectedFlow && this.flows.length) {
          this.selectFlow(this.flows[0])
        }
      } catch (error) {
        this.showMessage(`加载流程失败: ${error?.message}`, 'error')
      } finally {
        this.loading = false
      }
      this.refreshAuditLog()
    },
    selectFlow(flow) {
      this.selectedFlow = flow || null
    },
    refreshAuditLog() {
      this.auditEntries = readAuditLog().slice(-8).reverse()
    },
    getFlowStatus(flow) {
      if (!flow) return 'draft'
      const raw = (flow.status || '').toLowerCase()
      if (raw) return raw
      return flow.steps && flow.steps.length ? 'published' : 'draft'
    },
    statusLabel(flow) {
      const status = this.getFlowStatus(flow)
      if (status === 'published' || status === 'active') return '已发布'
      if (status === 'draft') return '草稿'
      return status
    },
    formatLabel(format) {
      return format === 'json' ? 'JSON 数据' : '概要 Markdown'
    },
    formatDate(value) {
      if (!value) return '未知'
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return '未知'
      return date.toLocaleString()
    },
    openPreviewWindow() {
      if (!this.selectedFlow) return
      const previewContent = this.buildPreviewHtml(this.selectedFlow)
      const previewWindow = window.open('', `_flow_preview_${this.selectedFlow.id}`, 'width=960,height=640')
      if (!previewWindow) {
        this.showMessage('浏览器阻止了弹窗，请允许后重试', 'error')
        return
      }
      previewWindow.document.write(previewContent)
      previewWindow.document.close()
      this.showMessage('已在新窗口打开流程预览', 'success')
      recordAudit({
        action: 'preview_in_window',
        detail: this.selectedFlow.name,
        flowId: this.selectedFlow.id
      })
      this.refreshAuditLog()
    },
    buildPreviewHtml(flow) {
      const rows = (flow.steps || []).map((step, index) => {
        const description = step.description ? `<p class="preview-pop-${index}-desc">${step.description}</p>` : ''
        const tip = step.tip ? `<p class="preview-pop-${index}-tip">提示：${step.tip}</p>` : ''
        const note = step.note ? `<p class="preview-pop-${index}-note">备注：${step.note}</p>` : ''
        const assignee = step.assignee ? `<span>👤 ${step.assignee}</span>` : ''
        const duration = step.duration ? `<span>⏱ ${step.duration}</span>` : ''
        const conditional = step.conditional ? `<span>⚡ 条件</span>` : ''
        return `
          <div class="modal-step">
            <div class="modal-step__index">${index + 1}</div>
            <div>
              <div class="modal-step__title">${step.name || `步骤 ${index + 1}`}</div>
              ${description}
              <div class="modal-step__extras">
                ${tip}
                ${note}
              </div>
              <div class="modal-step__meta">
                ${assignee}
                ${duration}
                ${conditional}
              </div>
            </div>
          </div>
        `
      })

      return `
        <html>
          <head>
            <title>${flow.name} · 预览</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue', sans-serif;
                margin: 0;
                padding: 24px;
                background: #f6f7fb;
                color: #0f172a;
              }
              h1 {
                margin-bottom: 12px;
              }
              .modal-divider {
                height: 1px;
                background: rgba(15, 23, 42, 0.1);
                margin: 16px 0;
              }
              .modal-step {
                display: flex;
                gap: 12px;
                padding: 12px;
                margin-bottom: 12px;
                border-radius: 12px;
                background: white;
                box-shadow: 0 4px 14px rgba(15, 23, 42, 0.05);
              }
              .modal-step__index {
                width: 32px;
                height: 32px;
                border-radius: 50%;
                background: #10b981;
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
              }
              .modal-step__title {
                font-weight: 600;
                margin-bottom: 4px;
              }
              .modal-step__extras p {
                margin: 2px 0;
                color: #475467;
                font-size: 0.9em;
              }
              .modal-step__meta {
                margin-top: 6px;
                display: flex;
                gap: 10px;
                font-size: 0.85em;
                color: #475467;
              }
            </style>
          </head>
          <body>
            <h1>${flow.name}</h1>
            <p>${flow.description || '无描述'}</p>
            <div class="modal-divider"></div>
            ${rows.join('')}
          </body>
        </html>
      `
    },
    generateBpmnXml(flow) {
      const processId = `Process_${flow.id}`
      const processes = this.buildBpmnProcess(flow, processId)
      const diagram = this.buildBpmnDiagram(flow, processId)

      return `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
             xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
             xmlns:omgdc="http://www.omg.org/spec/DD/20100524/DC"
             xmlns:omgdi="http://www.omg.org/spec/DD/20100524/DI"
             targetNamespace="http://vue-learning-app/bpmn"
             id="Definitions_${flow.id}">
  <process id="${processId}" name="${this.escapeXml(flow.name)}" isExecutable="true">
    ${processes}
  </process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_${flow.id}">
    <bpmndi:BPMNPlane id="BPMNPlane_${flow.id}" bpmnElement="${processId}">
      ${diagram}
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</definitions>`
    },

    buildBpmnProcess(flow, processId) {
      const steps = flow.steps || []
      const elements = []

      // 开始事件
      elements.push(`<startEvent id="StartEvent_${flow.id}" name="开始">
    <outgoing>Flow_start_to_${steps[0]?.id || 'end'}</outgoing>
  </startEvent>`)

      // 任务节点
      steps.forEach((step, index) => {
        const nodeType = step.conditional ? 'exclusiveGateway' : 'userTask'
        const nextStep = steps[index + 1]
        const prevFlow = index === 0
          ? `Flow_start_to_${step.id}`
          : `Flow_${steps[index - 1].id}_to_${step.id}`
        const nextFlow = nextStep
          ? `Flow_${step.id}_to_${nextStep.id}`
          : `Flow_${step.id}_to_end`

        elements.push(`<${nodeType} id="${step.id}" name="${this.escapeXml(step.name)}">
      ${step.description ? `<documentation>${this.escapeXml(step.description)}</documentation>` : ''}
      <incoming>${prevFlow}</incoming>
      <outgoing>${nextFlow}</outgoing>
      ${step.assignee ? `<performer>${this.escapeXml(step.assignee)}</performer>` : ''}
    </${nodeType}>`)
      })

      // 结束事件
      const lastStep = steps[steps.length - 1]
      elements.push(`<endEvent id="EndEvent_${flow.id}" name="结束">
    <incoming>Flow_${lastStep?.id || 'start'}_to_end</incoming>
  </endEvent>`)

      // 序列流
      if (steps.length > 0) {
        elements.push(`<sequenceFlow id="Flow_start_to_${steps[0].id}" sourceRef="StartEvent_${flow.id}" targetRef="${steps[0].id}" />`)

        steps.forEach((step, index) => {
          const nextStep = steps[index + 1]
          const targetRef = nextStep ? nextStep.id : `EndEvent_${flow.id}`
          const flowId = nextStep ? `Flow_${step.id}_to_${nextStep.id}` : `Flow_${step.id}_to_end`
          elements.push(`<sequenceFlow id="${flowId}" sourceRef="${step.id}" targetRef="${targetRef}" />`)
        })
      }

      return elements.join('\n    ')
    },

    buildBpmnDiagram(flow, processId) {
      const steps = flow.steps || []
      const shapes = []
      let x = 100, y = 100
      const stepWidth = 100, stepHeight = 80, spacing = 80

      // 开始事件
      shapes.push(`<bpmndi:BPMNShape id="Shape_StartEvent_${flow.id}" bpmnElement="StartEvent_${flow.id}">
    <omgdc:Bounds x="${x}" y="${y}" width="36" height="36" />
  </bpmndi:BPMNShape>`)

      x += spacing

      // 任务图形
      steps.forEach((step) => {
        shapes.push(`<bpmndi:BPMNShape id="Shape_${step.id}" bpmnElement="${step.id}">
    <omgdc:Bounds x="${x}" y="${y}" width="${stepWidth}" height="${stepHeight}" />
  </bpmndi:BPMNShape>`)
        x += stepWidth + spacing
      })

      // 结束事件
      shapes.push(`<bpmndi:BPMNShape id="Shape_EndEvent_${flow.id}" bpmnElement="EndEvent_${flow.id}">
    <omgdc:Bounds x="${x}" y="${y}" width="36" height="36" />
  </bpmndi:BPMNShape>`)

      return shapes.join('\n      ')
    },

    escapeXml(str) {
      if (!str) return ''
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
    },

    downloadFlow(format) {
      if (!this.selectedFlow) return
      this.exporting = true
      try {
        const payload = { ...this.selectedFlow }
        const now = Date.now()
        const name = payload.name?.replace(/[\\/:*?"<>|]/g, '') || `流程-${now}`
        let content = ''
        let mime = 'text/plain'
        let extension = 'txt'

        if (format === 'json') {
          content = JSON.stringify(payload, null, 2)
          mime = 'application/json'
          extension = 'json'
        } else if (format === 'bpmn') {
          content = this.generateBpmnXml(payload)
          mime = 'application/xml'
          extension = 'bpmn'
        } else {
          const lines = [
            `# ${payload.name || '未命名流程'}`,
            payload.description || '',
            '',
            '## 步骤'
          ]
          ;(payload.steps || []).forEach((step, index) => {
            lines.push(`### ${index + 1}. ${step.name || `步骤 ${index + 1}`}`)
            if (step.description) lines.push(step.description)
            if (step.tip) lines.push(`提示：${step.tip}`)
            if (step.note) lines.push(`备注：${step.note}`)
            if (step.assignee || step.duration || step.conditional) {
              const meta = [
                step.assignee ? `👤 ${step.assignee}` : null,
                step.duration ? `⏱ ${step.duration}` : null,
                step.conditional ? '⚡ 条件触发' : null
              ]
                .filter(Boolean)
                .join(' • ')
              if (meta) lines.push(meta)
            }
            lines.push('')
          })
          content = lines.join('\n')
          mime = 'text/markdown'
          extension = 'md'
        }

        const blob = new Blob([content], { type: mime })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${name}.${extension}`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        const msg = format === 'json' ? 'JSON 已准备好下载' : format === 'bpmn' ? 'BPMN 文件已准备好下载' : '概要文档已准备好下载'
        this.showMessage(msg, 'success')
        recordAudit({
          action: 'download_flow',
          detail: `${format} · ${this.selectedFlow.name || ''}`,
          flowId: this.selectedFlow.id
        })
        this.refreshAuditLog()
      } catch (error) {
        console.error('导出失败:', error)
        this.showMessage('导出失败，请稍后再试', 'error')
      } finally {
        this.exporting = false
      }
    },
    async requestExport(format) {
      if (!this.selectedFlow) return
      this.exporting = true
      try {
        const payload = {
          format,
          options: { ...this.exportOptions },
          versionId: this.selectedFlow.versionId || this.selectedFlow.latestVersionId || ''
        }
        const result = await api.flows.exportFlow(this.selectedFlow.id, payload)
        const downloadUrl =
          typeof result === 'string'
            ? result
            : result?.url || result?.downloadUrl || result?.link
        if (downloadUrl) {
          this.openDownloadLink(downloadUrl, `${this.selectedFlow.name || '流程'}.${format}`)
        } else {
          this.showMessage('导出任务已提交，请稍后查看', 'success')
        }
        recordAudit({
          action: `export_${format}`,
          detail: `${format} · includeComments=${payload.options.includeComments}`,
          flowId: this.selectedFlow.id
        })
        this.refreshAuditLog()
      } catch (error) {
        console.error('导出失败:', error)
        this.showMessage(`导出失败: ${error?.message}`, 'error')
      } finally {
        this.exporting = false
      }
    },
    openDownloadLink(url, fileName) {
      const link = document.createElement('a')
      link.href = url
      link.target = '_blank'
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    },
    showMessage(text, type = 'info') {
      this.message = { text, type }
      if (this.messageTimer) clearTimeout(this.messageTimer)
      this.messageTimer = setTimeout(() => {
        this.message = null
      }, 3200)
    }
  },
  watch: {
    filteredFlows(newList) {
      if (!newList.some((flow) => this.selectedFlow && flow.id === this.selectedFlow.id)) {
        this.selectFlow(newList[0] || null)
      }
    }
  },
  mounted() {
    this.loadFlows()
  },
  beforeUnmount() {
    if (this.messageTimer) {
      clearTimeout(this.messageTimer)
    }
  }
}
</script>

<style scoped>
.flow-preview-export {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.flow-preview-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  flex-wrap: wrap;
}

.flow-preview-header h1 {
  margin: 4px 0 6px;
  font-size: 1.9em;
}

.subtitle {
  margin: 0;
  color: var(--app-text-muted);
}

.eyebrow {
  margin: 0;
  text-transform: uppercase;
  font-size: 0.8em;
  letter-spacing: 0.08em;
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
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-outline:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.preview-layout {
  display: grid;
  grid-template-columns: 280px 1fr 280px;
  gap: 20px;
}

.preview-list-column,
.preview-side {
  border: 1px solid var(--app-border);
  border-radius: 16px;
  padding: 16px;
  background: var(--app-card);
  box-shadow: var(--app-soft-shadow);
}

.list-heading {
  margin-bottom: 12px;
}

.preview-search {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  margin-bottom: 12px;
  background: var(--app-card-elevated);
}

.status-filters {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.status-chip {
  border-radius: 999px;
  border: 1px solid var(--app-border);
  background: var(--app-card-elevated);
  padding: 4px 10px;
  font-size: 0.8em;
  cursor: pointer;
}

.status-chip.active {
  background: var(--app-primary);
  color: var(--app-on-primary);
  border-color: transparent;
}

.flow-card {
  padding: 12px;
  border-radius: 12px;
  border: 1px solid transparent;
  margin-bottom: 12px;
  background: var(--app-card-elevated);
  transition: border-color 0.2s, box-shadow 0.2s;
}

.list-empty {
  padding: 24px 0;
  text-align: center;
  color: var(--app-text-muted);
}

.flow-card.active {
  border-color: var(--app-primary);
  box-shadow: 0 6px 18px rgba(16, 185, 129, 0.2);
}

.flow-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.flow-card__badge {
  font-size: 0.85em;
  background: #f1f5f9;
  padding: 4px 8px;
  border-radius: 999px;
}

.flow-card__desc {
  margin: 0 0 8px;
  color: var(--app-text-muted);
  font-size: 0.9em;
}

.flow-card__meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85em;
  color: var(--app-text-muted);
  margin-bottom: 8px;
}

.flow-status {
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid transparent;
  background: rgba(16, 185, 129, 0.1);
  color: #047857;
}

.btn-small {
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.85em;
}

.preview-main {
  border: 1px solid var(--app-border);
  border-radius: 16px;
  padding: 16px;
  background: var(--app-card);
  box-shadow: var(--app-soft-shadow);
}

.preview-card__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  margin-bottom: 16px;
}

.preview-card__title {
  margin: 0;
}

.preview-card__desc {
  margin: 6px 0 0;
  color: var(--app-text-muted);
}

.preview-card__actions .btn {
  margin-left: 8px;
}

.btn-ghost {
  border: 1px solid var(--app-border);
  background: transparent;
  padding: 6px 10px;
  border-radius: 8px;
  cursor: pointer;
}

.steps-preview .preview-step {
  display: flex;
}

.preview-steps {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 480px;
  overflow-y: auto;
  padding-right: 4px;
}

.preview-step-row {
  display: flex;
  gap: 14px;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--app-border);
  background: var(--app-card-elevated);
}

.preview-step-row__index {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--app-primary);
  color: var(--app-on-primary);
  display: flex;
  justify-content: center;
  align-items: center;
  font-weight: 700;
}

.preview-step-row__content {
  flex: 1;
}

.preview-step-row__title {
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
}

.step-badge {
  font-size: 0.75em;
  background: rgba(248, 113, 113, 0.2);
  color: #b91c1c;
  padding: 2px 6px;
  border-radius: 999px;
}

.preview-step-row__description {
  margin: 6px 0 0;
  color: var(--app-text-muted);
}

.preview-step-row__extra {
  margin: 6px 0 0;
  color: var(--app-text-muted);
  font-size: 0.85em;
}

.preview-step-row__meta {
  display: flex;
  gap: 10px;
  margin-top: 8px;
  font-size: 0.85em;
  color: var(--app-text-muted);
}

.preview-empty {
  padding: 60px;
  text-align: center;
  color: var(--app-text-muted);
}

.meta-panel h3 {
  margin-top: 0;
}

.meta-panel dl {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  margin: 12px 0 16px;
}

.meta-panel dt {
  font-size: 0.85em;
  color: var(--app-text-muted);
  margin: 0;
}

.meta-panel dd {
  margin: 0;
  font-weight: 600;
}

.meta-panel__downloads {
  border-top: 1px solid var(--app-border);
  padding-top: 12px;
  margin-top: 12px;
}

.download-options {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.download-chip {
  border-radius: 999px;
  border: 1px solid var(--app-border);
  padding: 4px 10px;
  font-size: 0.8em;
}

.export-config {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed var(--app-border);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.export-option {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85em;
  color: var(--app-text);
}

.export-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 6px;
}

.btn-secondary {
  border: 1px solid var(--app-border);
  background: var(--app-card-elevated);
  color: var(--app-text);
  padding: 6px 12px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.meta-panel__log {
  margin-top: 16px;
}

.meta-panel__log ul {
  margin: 6px 0 0;
  padding-left: 0;
  list-style: none;
}

.audit-entry {
  padding: 8px 0;
  border-bottom: 1px dashed var(--app-border);
}

.audit-entry:last-child {
  border-bottom: none;
}

.log-action {
  font-weight: 600;
  color: var(--app-text);
}

.log-detail {
  display: block;
  color: var(--app-text-muted);
  font-size: 0.85em;
}

.log-ts {
  font-size: 0.75em;
  color: var(--app-text-muted);
}

.preview-message {
  padding: 12px 16px;
  border-radius: 10px;
  border: 1px solid transparent;
  max-width: 360px;
}

.preview-message.success {
  background: rgba(16, 185, 129, 0.1);
  border-color: rgba(16, 185, 129, 0.3);
  color: #047857;
}

.preview-message.error {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.3);
  color: #b91c1c;
}

@media (max-width: 1100px) {
  .preview-layout {
    grid-template-columns: 1fr;
  }

  .preview-side,
  .preview-list-column {
    width: 100%;
  }
}
</style>
