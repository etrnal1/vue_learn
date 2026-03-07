<template>
  <div class="streaming-editor-page" :class="{ 'is-fullscreen': isFullscreen }">
    <header class="workbench-header">
      <div class="header-title">
        <p class="eyebrow">Streaming Engine</p>
        <h2>流水线编排工作台</h2>
        <p class="hero-summary">把资源导航、编排画布和运行面板拆开，按工作台方式操作。</p>
      </div>
      <div class="header-metrics">
        <div class="metric-chip">
          <span>当前流水线</span>
          <strong>{{ pipeline.name || '未命名流水线' }}</strong>
        </div>
        <div class="metric-chip">
          <span>步骤数</span>
          <strong>{{ pipeline.processors.length }}</strong>
        </div>
        <div class="metric-chip">
          <span>运行状态</span>
          <strong>{{ runState }}</strong>
        </div>
      </div>
      <div class="hero-actions">
        <button type="button" class="btn btn-secondary" @click="createBlankPipeline">新建空白流水线</button>
        <button type="button" class="btn btn-secondary" @click="restoreSamplePipeline">恢复样例</button>
        <button type="button" class="btn btn-secondary" @click="toggleFullscreen">
          {{ isFullscreen ? '退出全屏' : '全屏设计' }}
        </button>
        <button type="button" class="btn btn-primary" @click="onSave">保存</button>
        <button type="button" class="btn btn-success" :disabled="runState === 'running'" @click="onExecute">
          {{ runState === 'running' ? '执行中...' : '执行流水线' }}
        </button>
      </div>
    </header>

    <section class="workspace-shell">
      <aside class="left-sidebar panel">
        <div class="sidebar-head">
          <p>工作台菜单</p>
          <strong>编排资源区</strong>
        </div>
        <div class="rail-nav">
          <button
            v-for="item in railSections"
            :key="item.key"
            type="button"
            class="rail-btn"
            :class="{ active: activeRailSection === item.key }"
            @click="activeRailSection = item.key"
          >
            <span class="rail-icon">{{ item.icon }}</span>
            <span class="rail-copy">
              <strong>{{ item.label }}</strong>
              <small>{{ item.tip }}</small>
            </span>
          </button>
        </div>

        <div class="resource-panel">
        <template v-if="activeRailSection === 'pipelines'">
          <div class="panel-head">
            <h3>已保存流水线</h3>
            <button type="button" class="text-btn" @click="loadPipelines">刷新</button>
          </div>
          <div class="pipeline-list">
            <button
              v-for="item in pipelines"
              :key="item.id"
              type="button"
              class="pipeline-item"
              :class="{ active: pipeline.id === item.id }"
              @click="selectPipeline(item.id)"
            >
              <strong>{{ item.name }}</strong>
              <small>{{ item.id }}</small>
            </button>
            <p v-if="pipelines.length === 0" class="empty-tip">还没有已保存流水线。</p>
          </div>
        </template>

        <template v-else-if="activeRailSection === 'processors'">
          <div class="panel-head">
            <h3>处理器库</h3>
            <span class="panel-meta">{{ processors.length }} 个</span>
          </div>
          <div class="processor-list">
            <div v-for="processor in processors" :key="processor.type" class="processor-card">
              <strong>{{ processor.name }}</strong>
              <small>{{ processor.category }}</small>
              <p>{{ processor.description || '用于串联编排中的一个处理单元。' }}</p>
              <button type="button" class="btn btn-small" @click="appendProcessor(processor.type)">添加到末尾</button>
            </div>
          </div>
        </template>

        <template v-else-if="activeRailSection === 'config'">
          <div class="panel-head">
            <h3>步骤配置</h3>
            <span class="panel-meta">{{ activeStep ? activeStep.type : '未选中' }}</span>
          </div>

          <template v-if="activeStep">
            <label class="field">
              <span>步骤名称</span>
              <input v-model.trim="activeStep.name" class="field-input" />
            </label>

            <label class="field">
              <span>步骤 ID</span>
              <input :value="activeStep.id" class="field-input" readonly />
            </label>

            <label class="field">
              <span>处理器类型</span>
              <input :value="activeStep.type" class="field-input" readonly />
            </label>

            <label class="field">
              <span>配置 JSON</span>
              <textarea
                v-model="stepConfigDraft"
                class="field-textarea field-textarea--sidebar"
                rows="11"
                spellcheck="false"
                @blur="applyStepConfig"
              />
            </label>

            <p class="field-hint">失焦时自动应用 JSON。当前支持样例处理器：`Source`、`Validation`、`Transform`、`Filter`、`Summary`、`Sink`。</p>
            <div v-if="stepConfigError" class="error-box">{{ stepConfigError }}</div>
          </template>

          <div v-else class="empty-tip">
            选中一个步骤后，这里可以修改步骤名称和配置。
          </div>
        </template>

        <template v-else-if="activeRailSection === 'runtime'">
          <div class="monitor-head">
            <h3>运行面板</h3>
            <span class="status-chip">{{ runState }}</span>
          </div>

          <div class="history-block">
            <div class="panel-head">
              <h3>执行历史</h3>
              <button type="button" class="text-btn" @click="loadExecutionHistory">刷新</button>
            </div>
            <div class="history-list">
              <article v-for="item in executionHistory" :key="item.runId" class="history-item">
                <strong>{{ item.status }}</strong>
                <small>{{ formatDateTime(item.startedAt || item.finishedAt) }}</small>
              </article>
              <p v-if="executionHistory.length === 0" class="empty-tip">当前流水线还没有执行历史。</p>
            </div>
          </div>

          <div class="runtime-card" v-if="lastOutput">
            <strong>最终输出</strong>
            <pre>{{ prettyJson(lastOutput) }}</pre>
          </div>

          <div class="runtime-card">
            <strong>执行日志</strong>
            <ul class="log-list">
              <li v-for="(log, index) in logs" :key="index">{{ log }}</li>
            </ul>
          </div>
        </template>

        <template v-else-if="activeRailSection === 'runbook'">
          <div class="panel-head">
            <h3>编排说明</h3>
            <span class="panel-meta">新手入口</span>
          </div>
          <div class="guide-stack">
            <article class="guide-card guide-card--compact" v-for="item in guideSteps" :key="item.title">
              <span class="guide-index">{{ item.index }}</span>
              <strong>{{ item.title }}</strong>
              <p>{{ item.body }}</p>
            </article>
          </div>
          <div class="runbook-card">
            <strong>数据流动方式</strong>
            <p>当前版本按顺序执行。上一步输出，作为下一步输入，直到最后一步产出结果。</p>
          </div>
          <div class="runbook-card">
            <strong>样例建议</strong>
            <p>先恢复样例流水线，执行一次，再修改单个处理器配置理解输入输出关系。</p>
          </div>
        </template>

        <template v-else>
          <div class="panel-head">
            <h3>工作台概览</h3>
            <span class="panel-meta">布局说明</span>
          </div>
          <div class="overview-list">
            <article class="overview-card">
              <strong>左侧菜单</strong>
              <p>切换流水线列表、处理器库和使用说明，不再把所有资源同时挤在一个栏里。</p>
            </article>
            <article class="overview-card">
              <strong>中间画布</strong>
              <p>只保留编排本身，负责命名、执行模式和步骤顺序。</p>
            </article>
            <article class="overview-card">
              <strong>所有菜单在左侧</strong>
              <p>配置、运行、说明都并到左边，右边不再被多栏压缩。</p>
            </article>
          </div>
        </template>
        </div>
      </aside>

      <main class="stage-panel panel">
        <div class="stage-head">
          <div class="panel-head">
            <h3>编排画布</h3>
            <span class="panel-meta">{{ pipeline.processors.length }} 个步骤</span>
          </div>
          <div class="mode-strip">
            <span class="status-chip">{{ pipeline.execution.mode }}</span>
            <span class="status-chip">{{ pipeline.version || '0.1.0' }}</span>
          </div>
        </div>

        <div class="pipeline-meta-grid">
          <label class="field">
            <span>流水线名称</span>
            <input v-model.trim="pipeline.name" class="field-input" placeholder="例如：订单数据同步" />
          </label>
          <label class="field">
            <span>版本</span>
            <input v-model.trim="pipeline.version" class="field-input" placeholder="0.1.0" />
          </label>
          <label class="field">
            <span>执行模式</span>
            <select v-model="pipeline.execution.mode" class="field-input">
              <option value="sequential">sequential</option>
              <option value="parallel">parallel</option>
              <option value="mixed">mixed</option>
            </select>
          </label>
          <label class="field">
            <span>超时(ms)</span>
            <input v-model.number="pipeline.execution.timeout" type="number" min="1000" step="1000" class="field-input" />
          </label>
        </div>

        <div v-if="pipeline.processors.length === 0" class="empty-canvas">
          <strong>当前没有步骤</strong>
          <p>从左侧菜单进入“处理器”，把步骤加入当前流水线。</p>
        </div>

        <div v-else class="canvas-flow">
          <template v-for="(step, index) in pipeline.processors" :key="step.id">
            <article
              class="canvas-node"
              :class="{
                active: activeStepId === step.id,
                running: runningStepId === step.id,
                success: stepStatusMap[step.id] === 'success',
                failed: stepStatusMap[step.id] === 'failed'
              }"
              @click="selectStep(step.id)"
            >
              <div class="node-top">
                <span class="node-order">#{{ index + 1 }}</span>
                <span class="node-type">{{ step.type }}</span>
              </div>
              <strong class="node-title">{{ step.name }}</strong>
              <p class="node-config-preview">{{ summarizeStepConfig(step.config) }}</p>
              <div class="node-actions">
                <button type="button" class="icon-btn" :disabled="index === 0" @click.stop="moveStep(step.id, -1)">↑</button>
                <button type="button" class="icon-btn" :disabled="index === pipeline.processors.length - 1" @click.stop="moveStep(step.id, 1)">↓</button>
                <button type="button" class="icon-btn danger" @click.stop="removeStep(step.id)">删</button>
              </div>
            </article>
            <div v-if="index < pipeline.processors.length - 1" class="canvas-link">→</div>
          </template>
        </div>
        <section class="stage-monitor">
          <div class="monitor-strip">
            <div class="monitor-chip">
              <span>当前步骤</span>
              <strong>{{ activeStep ? activeStep.name : '未选中' }}</strong>
            </div>
            <div class="monitor-chip">
              <span>执行模式</span>
              <strong>{{ pipeline.execution.mode }}</strong>
            </div>
            <div class="monitor-chip">
              <span>超时</span>
              <strong>{{ pipeline.execution.timeout }} ms</strong>
            </div>
          </div>
        </section>
      </main>
    </section>
  </div>
</template>

<script>
import { streamingEngineApi } from '../../utils/streamingEngineApi.js'

const PROCESSOR_PRESETS = {
  SourceProcessor: {
    category: '数据获取',
    description: '生成或读取初始输入数据。',
    defaultConfig: { source: 'inline-users' }
  },
  ValidationProcessor: {
    category: '数据处理',
    description: '校验字段和输入格式。',
    defaultConfig: { required: ['id', 'name', 'email'] }
  },
  TransformProcessor: {
    category: '数据处理',
    description: '把输入转换成目标结构。',
    defaultConfig: { mapTo: ['user_id', 'full_name', 'email_address', 'active'] }
  },
  FilterProcessor: {
    category: '数据处理',
    description: '根据字段条件过滤数据。',
    defaultConfig: { field: 'active', equals: true }
  },
  SummaryProcessor: {
    category: '分析计算',
    description: '产出数量和比率等汇总指标。',
    defaultConfig: { metrics: ['count', 'activeRate'] }
  },
  SinkProcessor: {
    category: '数据存储',
    description: '把结果写入目标介质。',
    defaultConfig: { sink: 'memory' }
  }
}

function createSamplePipeline() {
  return {
    id: 'sample_user_etl',
    name: '用户数据清洗流水线',
    version: '0.1.0',
    processors: [
      { id: 'source_users', type: 'SourceProcessor', name: '加载样例数据', config: { source: 'inline-users' } },
      { id: 'validate_users', type: 'ValidationProcessor', name: '校验字段', config: { required: ['id', 'name', 'email'] } },
      { id: 'transform_users', type: 'TransformProcessor', name: '转换字段', config: { mapTo: ['user_id', 'full_name', 'email_address', 'active'] } },
      { id: 'filter_active', type: 'FilterProcessor', name: '过滤启用用户', config: { field: 'active', equals: true } },
      { id: 'summary', type: 'SummaryProcessor', name: '统计汇总', config: { metrics: ['count', 'activeRate'] } },
      { id: 'sink_memory', type: 'SinkProcessor', name: '落库模拟', config: { sink: 'memory' } }
    ],
    execution: {
      mode: 'sequential',
      timeout: 60000,
      retryPolicy: {
        maxRetries: 1
      }
    }
  }
}

function createBlankPipeline() {
  return {
    id: '',
    name: '新建流水线',
    version: '0.1.0',
    processors: [],
    execution: {
      mode: 'sequential',
      timeout: 60000,
      retryPolicy: {
        maxRetries: 1
      }
    }
  }
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value))
}

export default {
  name: 'StreamingPipelineEditor',
  data() {
    return {
      guideSteps: [
        { index: '01', title: '挑处理器', body: '从左侧处理器库选择模块，追加到流水线末尾。' },
        { index: '02', title: '排顺序', body: '在画布中调整步骤顺序，确定数据流向。' },
        { index: '03', title: '配参数', body: '选中步骤后，在左侧“配置”菜单中编辑 JSON 和步骤名称。' },
        { index: '04', title: '保存执行', body: '保存后执行，在左侧“运行”菜单中查看日志与最终输出。' }
      ],
      railSections: [
        { key: 'overview', label: '概览', tip: '布局说明', icon: '□' },
        { key: 'pipelines', label: '流水线', tip: '加载与切换', icon: '≡' },
        { key: 'processors', label: '处理器', tip: '加入步骤', icon: '+' },
        { key: 'config', label: '配置', tip: '步骤参数', icon: '*' },
        { key: 'runtime', label: '运行', tip: '日志历史', icon: '!' },
        { key: 'runbook', label: '说明', tip: '新手指引', icon: '?' }
      ],
      activeRailSection: 'pipelines',
      runState: 'idle',
      currentRunId: '',
      runningStepId: '',
      logs: ['正在准备编排工作台...'],
      lastOutput: null,
      stepStatusMap: {},
      isFullscreen: false,
      pipelines: [],
      executionHistory: [],
      processors: [],
      pipeline: createBlankPipeline(),
      activeStepId: '',
      stepConfigDraft: '{}',
      stepConfigError: '',
      pollTimer: null
    }
  },
  computed: {
    activeStep() {
      return this.pipeline.processors.find((step) => step.id === this.activeStepId) || null
    }
  },
  watch: {
    activeStep: {
      immediate: true,
      handler(step) {
        this.stepConfigDraft = step ? this.prettyJson(step.config || {}) : '{}'
        this.stepConfigError = ''
      }
    }
  },
  async mounted() {
    await this.bootstrapFromServer()
  },
  beforeUnmount() {
    this.clearPollTimer()
    this.applyFullscreenState(false)
  },
  methods: {
    prettyJson(value) {
      return JSON.stringify(value, null, 2)
    },
    formatDateTime(value) {
      if (!value) return '-'
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return String(value)
      return date.toLocaleString('zh-CN', { hour12: false })
    },
    applyFullscreenState(next) {
      this.isFullscreen = Boolean(next)
      if (typeof document !== 'undefined') {
        document.body.classList.toggle('streaming-engine-fullscreen', this.isFullscreen)
      }
    },
    toggleFullscreen() {
      this.applyFullscreenState(!this.isFullscreen)
    },
    clearPollTimer() {
      if (this.pollTimer) {
        clearTimeout(this.pollTimer)
        this.pollTimer = null
      }
    },
    buildProcessorCatalog(items) {
      const merged = (Array.isArray(items) ? items : []).map((item) => ({
        ...item,
        category: item.category || PROCESSOR_PRESETS[item.type]?.category || '通用处理',
        description: item.description || PROCESSOR_PRESETS[item.type]?.description || ''
      }))
      if (merged.length > 0) return merged
      return Object.entries(PROCESSOR_PRESETS).map(([type, preset]) => ({
        type,
        name: type,
        category: preset.category,
        description: preset.description
      }))
    },
    createProcessorStep(type) {
      const preset = PROCESSOR_PRESETS[type] || {}
      const suffix = Math.random().toString(36).slice(2, 6)
      return {
        id: `${String(type || 'step').replace(/Processor$/, '').toLowerCase()}_${Date.now()}_${suffix}`,
        type,
        name: preset.description ? preset.description.split('。')[0] : String(type || '新步骤'),
        config: deepClone(preset.defaultConfig || {})
      }
    },
    selectStep(stepId) {
      this.activeStepId = stepId
      this.activeRailSection = 'config'
    },
    summarizeStepConfig(config) {
      const entries = Object.entries(config || {})
      if (entries.length === 0) return '未配置参数'
      return entries
        .slice(0, 2)
        .map(([key, value]) => `${key}=${Array.isArray(value) ? `[${value.length}]` : String(value)}`)
        .join(' · ')
    },
    createBlankPipeline() {
      this.pipeline = createBlankPipeline()
      this.activeStepId = ''
      this.stepStatusMap = {}
      this.lastOutput = null
      this.logs.unshift(`[${new Date().toLocaleTimeString()}] 已切换为空白流水线草稿`)
    },
    restoreSamplePipeline() {
      this.pipeline = deepClone(createSamplePipeline())
      this.activeStepId = this.pipeline.processors[0]?.id || ''
      this.logs.unshift(`[${new Date().toLocaleTimeString()}] 已恢复样例流水线`)
    },
    appendProcessor(type) {
      const step = this.createProcessorStep(type)
      this.pipeline.processors.push(step)
      this.activeStepId = step.id
      this.logs.unshift(`[${new Date().toLocaleTimeString()}] 已添加步骤: ${step.type}`)
    },
    moveStep(stepId, direction) {
      const index = this.pipeline.processors.findIndex((item) => item.id === stepId)
      const targetIndex = index + direction
      if (index < 0 || targetIndex < 0 || targetIndex >= this.pipeline.processors.length) return
      const next = [...this.pipeline.processors]
      const [current] = next.splice(index, 1)
      next.splice(targetIndex, 0, current)
      this.pipeline.processors = next
      this.logs.unshift(`[${new Date().toLocaleTimeString()}] 已调整步骤顺序: ${current.name}`)
    },
    removeStep(stepId) {
      const index = this.pipeline.processors.findIndex((item) => item.id === stepId)
      if (index < 0) return
      const [removed] = this.pipeline.processors.splice(index, 1)
      if (this.activeStepId === stepId) {
        this.activeStepId = this.pipeline.processors[Math.max(0, index - 1)]?.id || this.pipeline.processors[0]?.id || ''
      }
      this.logs.unshift(`[${new Date().toLocaleTimeString()}] 已移除步骤: ${removed.name}`)
    },
    applyStepConfig() {
      if (!this.activeStep) return
      try {
        const parsed = JSON.parse(this.stepConfigDraft || '{}')
        this.activeStep.config = parsed
        this.stepConfigError = ''
      } catch (error) {
        this.stepConfigError = `配置 JSON 无效: ${error.message}`
      }
    },
    validatePipeline() {
      this.applyStepConfig()
      if (this.stepConfigError) {
        throw new Error(this.stepConfigError)
      }
      if (!String(this.pipeline.name || '').trim()) {
        throw new Error('流水线名称不能为空')
      }
      if (!Array.isArray(this.pipeline.processors) || this.pipeline.processors.length === 0) {
        throw new Error('至少需要一个步骤')
      }
    },
    normalizeLoadedPipeline(payload) {
      const next = deepClone(payload || createBlankPipeline())
      if (!next.execution) next.execution = { mode: 'sequential', timeout: 60000, retryPolicy: { maxRetries: 1 } }
      if (!next.execution.retryPolicy) next.execution.retryPolicy = { maxRetries: 1 }
      if (!Array.isArray(next.processors)) next.processors = []
      return next
    },
    async bootstrapFromServer() {
      try {
        const processors = await streamingEngineApi.listProcessors()
        this.processors = this.buildProcessorCatalog(processors)
        await this.loadPipelines()
        if (this.pipelines.length > 0) {
          await this.selectPipeline(this.pipelines[0].id)
        } else {
          this.restoreSamplePipeline()
        }
      } catch (error) {
        this.processors = this.buildProcessorCatalog([])
        this.restoreSamplePipeline()
        this.logs = [`[${new Date().toLocaleTimeString()}] 后端未连接，当前使用本地草稿: ${error.message}`]
      }
    },
    async loadPipelines() {
      const items = await streamingEngineApi.listPipelines()
      this.pipelines = items
    },
    async selectPipeline(pipelineId) {
      const payload = await streamingEngineApi.getPipeline(pipelineId)
      this.pipeline = this.normalizeLoadedPipeline(payload)
      this.activeStepId = this.pipeline.processors[0]?.id || ''
      this.lastOutput = null
      this.stepStatusMap = {}
      await this.loadExecutionHistory()
      this.logs.unshift(`[${new Date().toLocaleTimeString()}] 已加载流水线: ${this.pipeline.name}`)
    },
    async loadExecutionHistory() {
      if (!this.pipeline.id) {
        this.executionHistory = []
        return
      }
      this.executionHistory = await streamingEngineApi.getExecutionHistory(this.pipeline.id)
    },
    async onSave() {
      try {
        this.validatePipeline()
        const payload = deepClone(this.pipeline)
        const saved = await streamingEngineApi.savePipeline(payload)
        this.pipeline = this.normalizeLoadedPipeline(saved)
        this.activeStepId = this.activeStepId || this.pipeline.processors[0]?.id || ''
        await this.loadPipelines()
        await this.loadExecutionHistory()
        this.logs.unshift(`[${new Date().toLocaleTimeString()}] 已保存流水线: ${saved.id}`)
      } catch (error) {
        this.logs.unshift(`[${new Date().toLocaleTimeString()}] 保存失败: ${error.message}`)
      }
    },
    applyExecutionSnapshot(snapshot = {}) {
      this.runState = String(snapshot.status || 'running')
      this.runningStepId = String(snapshot.currentStepId || '')

      const stepMap = {}
      const stepResults = Array.isArray(snapshot.stepResults) ? snapshot.stepResults : []
      for (const item of stepResults) {
        if (!item?.stepId) continue
        stepMap[item.stepId] = item.status === 'failed' ? 'failed' : 'success'
      }
      this.stepStatusMap = stepMap

      if (Array.isArray(snapshot.logs) && snapshot.logs.length > 0) {
        this.logs = [...snapshot.logs].slice(-120).reverse()
      }
      if (snapshot.output) {
        this.lastOutput = snapshot.output
      }
    },
    async pollExecution(runId) {
      this.clearPollTimer()
      try {
        const snapshot = await streamingEngineApi.getExecution(runId)
        this.applyExecutionSnapshot(snapshot)
        if (snapshot.status === 'running' || snapshot.status === 'queued') {
          this.pollTimer = setTimeout(() => {
            void this.pollExecution(runId)
          }, 800)
          return
        }
        this.currentRunId = ''
        this.clearPollTimer()
        await this.loadExecutionHistory()
      } catch (error) {
        this.runState = 'failed'
        this.currentRunId = ''
        this.logs.unshift(`[${new Date().toLocaleTimeString()}] 轮询失败: ${error.message}`)
      }
    },
    async onExecute() {
      if (this.runState === 'running') return
      try {
        this.validatePipeline()
        if (!this.pipeline.id) {
          await this.onSave()
        }
        if (!this.pipeline.id) {
          throw new Error('流水线尚未保存成功')
        }

        this.runState = 'running'
        this.activeRailSection = 'runtime'
        this.lastOutput = null
        this.stepStatusMap = {}
        this.logs = [`[${new Date().toLocaleTimeString()}] 已提交执行请求: ${this.pipeline.name}`]

        const started = await streamingEngineApi.executePipeline(this.pipeline.id)
        this.currentRunId = started.runId
        this.logs.unshift(`[${new Date().toLocaleTimeString()}] runId: ${started.runId}`)
        await this.pollExecution(started.runId)
      } catch (error) {
        this.runState = 'failed'
        this.logs.unshift(`[${new Date().toLocaleTimeString()}] 执行失败: ${error.message}`)
      }
    }
  }
}
</script>

<style scoped>
.streaming-editor-page {
  --bg-page: linear-gradient(180deg, #f2f7ff 0%, #eef6f2 100%);
  --bg-panel: rgba(255, 255, 255, 0.92);
  --line: #d7e5da;
  --text: #143126;
  --muted: #587063;
  --brand: #0f766e;
  --brand-dark: #115e59;
  --accent: #c084fc;
  --good: #166534;
  --warn: #b45309;
  --bad: #b91c1c;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 18px 20px 22px;
  min-height: calc(100vh - 180px);
  background: var(--bg-page);
  color: var(--text);
}

.streaming-editor-page.is-fullscreen {
  position: fixed;
  inset: 0;
  z-index: 4000;
  overflow: auto;
  padding: 18px 22px 24px;
  min-height: 100vh;
  background:
    radial-gradient(circle at top right, rgba(192, 132, 252, 0.15), transparent 28%),
    radial-gradient(circle at bottom left, rgba(15, 118, 110, 0.16), transparent 32%),
    var(--bg-page);
}

.workbench-header,
.panel,
.guide-card,
.runbook-card,
.overview-card,
.runtime-card {
  border: 1px solid var(--line);
  border-radius: 18px;
  background: var(--bg-panel);
  backdrop-filter: blur(10px);
  box-shadow: 0 18px 42px rgba(17, 24, 39, 0.08);
}

.workbench-header {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) auto auto;
  align-items: start;
  gap: 18px;
  padding: 18px 20px;
  background:
    radial-gradient(circle at top right, rgba(192, 132, 252, 0.16), transparent 32%),
    radial-gradient(circle at bottom left, rgba(15, 118, 110, 0.18), transparent 34%),
    rgba(255, 255, 255, 0.9);
}

.eyebrow {
  margin: 0 0 6px;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 11px;
  color: var(--brand);
}

.header-title h2 {
  margin: 0;
  font-size: 30px;
  line-height: 1.1;
}

.hero-summary {
  margin: 8px 0 0;
  max-width: 620px;
  color: var(--muted);
  font-size: 14px;
  line-height: 1.6;
}

.header-metrics {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  min-width: 0;
}

.metric-chip {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 120px;
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(215, 229, 218, 0.95);
}

.metric-chip span {
  font-size: 11px;
  color: var(--muted);
}

.metric-chip strong {
  font-size: 14px;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: flex-end;
  gap: 8px;
  min-width: 0;
}

.guide-card {
  padding: 18px;
}

.guide-card--compact {
  padding: 14px;
}

.guide-index {
  display: inline-flex;
  width: 34px;
  height: 34px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(15, 118, 110, 0.1);
  color: var(--brand);
  font-size: 12px;
  font-weight: 700;
}

.guide-card strong {
  display: block;
  margin-top: 10px;
}

.guide-card p {
  margin: 8px 0 0;
  color: var(--muted);
  font-size: 14px;
  line-height: 1.5;
}

.workspace-shell {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.streaming-editor-page.is-fullscreen .workspace-shell {
  grid-template-columns: 336px minmax(0, 1fr);
}

.panel {
  padding: 16px;
}

.left-sidebar,
.resource-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.left-sidebar {
  padding: 12px;
}

.sidebar-head {
  padding: 6px 4px 10px;
  border-bottom: 1px solid #dce7e0;
}

.sidebar-head p {
  margin: 0;
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
}

.sidebar-head strong {
  display: block;
  margin-top: 6px;
  font-size: 18px;
}

.streaming-editor-page.is-fullscreen .panel,
.streaming-editor-page.is-fullscreen .guide-card,
.streaming-editor-page.is-fullscreen .workbench-header {
  border-radius: 20px;
}

.rail-nav {
  display: grid;
  gap: 8px;
}

.resource-panel {
  min-height: 0;
  padding-top: 2px;
}

.rail-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 12px;
  border: 1px solid #d9e7dd;
  border-radius: 14px;
  background: #fcfefd;
  color: var(--text);
  text-align: left;
  cursor: pointer;
}

.rail-btn.active {
  border-color: var(--brand);
  background: rgba(15, 118, 110, 0.08);
  box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.08);
}

.rail-icon {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: rgba(15, 118, 110, 0.1);
  color: var(--brand);
  font-size: 14px;
  font-weight: 700;
}

.rail-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rail-copy strong {
  font-size: 14px;
}

.rail-copy small {
  color: var(--muted);
  font-size: 12px;
}

.panel-block,
.history-block,
.guide-stack,
.overview-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.panel-head,
.monitor-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.panel-head h3,
.monitor-head h3 {
  margin: 0;
  font-size: 18px;
}

.panel-meta {
  color: var(--muted);
  font-size: 12px;
}

.btn,
.text-btn,
.icon-btn,
.pipeline-item,
.rail-btn {
  transition: transform 0.18s ease, background-color 0.18s ease, border-color 0.18s ease;
}

.btn {
  border: 1px solid #c8dad1;
  background: #ffffff;
  color: var(--text);
  padding: 11px 16px;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
}

.btn:hover,
.text-btn:hover,
.icon-btn:hover,
.pipeline-item:hover {
  transform: translateY(-1px);
}

.btn-primary {
  background: var(--brand);
  border-color: var(--brand);
  color: #ffffff;
}

.btn-success {
  background: #1d8348;
  border-color: #1d8348;
  color: #ffffff;
}

.btn-secondary {
  background: #f8faf9;
}

.btn-small {
  padding: 8px 12px;
  border-radius: 10px;
  font-size: 13px;
}

.btn:disabled,
.icon-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  transform: none;
}

.text-btn {
  border: none;
  background: transparent;
  color: var(--brand-dark);
  cursor: pointer;
  padding: 0;
  font-size: 12px;
}

.pipeline-list,
.processor-list,
.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
}

.pipeline-item,
.processor-card,
.history-item,
.canvas-node {
  border: 1px solid #d9e7dd;
  border-radius: 14px;
  background: #fcfefd;
}

.pipeline-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  padding: 12px 14px;
  cursor: pointer;
  text-align: left;
}

.pipeline-item.active {
  border-color: var(--brand);
  background: rgba(15, 118, 110, 0.08);
}

.pipeline-item small,
.history-item small,
.processor-card small {
  color: var(--muted);
}

.processor-card {
  padding: 14px;
}

.processor-card p {
  margin: 8px 0 10px;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.5;
}

.stage-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}

.stage-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.mode-strip {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.pipeline-meta-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 7px;
  font-size: 14px;
}

.field span {
  color: var(--muted);
}

.field-input,
.field-textarea {
  border: 1px solid #d6e0db;
  border-radius: 12px;
  background: #ffffff;
  color: var(--text);
  padding: 12px 14px;
  font: inherit;
}

.field-input:focus,
.field-textarea:focus {
  outline: none;
  border-color: var(--brand);
  box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.12);
}

.field-textarea {
  resize: vertical;
  min-height: 320px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace;
  line-height: 1.55;
}

.field-textarea--sidebar {
  min-height: 260px;
}

.field-hint {
  margin: 0;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.5;
}

.error-box {
  border: 1px solid #fecaca;
  border-radius: 12px;
  background: #fef2f2;
  color: var(--bad);
  padding: 10px 12px;
  font-size: 12px;
}

.empty-canvas,
.empty-tip {
  color: var(--muted);
  font-size: 13px;
}

.empty-canvas {
  border: 1px dashed #c4d6cb;
  border-radius: 16px;
  padding: 36px;
  text-align: center;
  background: rgba(255, 255, 255, 0.55);
}

.empty-canvas p,
.empty-tip {
  margin: 8px 0 0;
}

.canvas-flow {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
  align-items: stretch;
}

.canvas-node {
  padding: 16px;
  cursor: pointer;
}

.streaming-editor-page.is-fullscreen .canvas-node {
  padding: 18px;
}

.canvas-node.active {
  border-color: var(--brand);
  box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.12);
}

.canvas-node.running {
  border-color: #f59e0b;
  background: #fffbeb;
}

.canvas-node.success {
  border-color: #16a34a;
  background: #f0fdf4;
}

.canvas-node.failed {
  border-color: #ef4444;
  background: #fef2f2;
}

.node-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}

.node-order,
.node-type,
.status-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 4px 8px;
  font-size: 11px;
}

.node-order {
  background: rgba(192, 132, 252, 0.12);
  color: #7c3aed;
}

.node-type {
  background: rgba(15, 118, 110, 0.08);
  color: var(--brand);
}

.node-title {
  display: block;
  font-size: 17px;
}

.node-config-preview {
  margin: 10px 0 14px;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.5;
  min-height: 44px;
}

.node-actions {
  display: flex;
  gap: 6px;
}

.icon-btn {
  border: 1px solid #d7e4de;
  background: #ffffff;
  border-radius: 10px;
  min-width: 38px;
  height: 38px;
  cursor: pointer;
  font-size: 14px;
}

.icon-btn.danger {
  color: var(--bad);
}

.canvas-link {
  display: none;
}

.runtime-card,
.runbook-card,
.overview-card {
  padding: 14px;
  background: #fbfefc;
}

.runtime-card strong,
.runbook-card strong,
.overview-card strong {
  display: block;
  margin-bottom: 8px;
}

.runtime-card p,
.runbook-card p,
.overview-card p {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.6;
}

.runtime-card pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 13px;
  max-height: 220px;
  overflow: auto;
}

.status-chip {
  background: rgba(15, 118, 110, 0.08);
  color: var(--brand);
}

.log-list {
  margin: 0;
  padding-left: 18px;
  font-size: 13px;
  max-height: 280px;
  overflow: auto;
  line-height: 1.7;
}

.stage-monitor {
  border-top: 1px solid #dce7e0;
  padding-top: 12px;
}

.monitor-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.monitor-chip {
  padding: 12px 14px;
  border: 1px solid #dbe7df;
  border-radius: 14px;
  background: #fbfefc;
}

.monitor-chip span {
  display: block;
  margin-bottom: 6px;
  color: var(--muted);
  font-size: 12px;
}

.monitor-chip strong {
  display: block;
  font-size: 14px;
}

@media (min-width: 1440px) {
  .streaming-editor-page {
    padding-left: 28px;
    padding-right: 28px;
  }

  .workspace-shell {
    grid-template-columns: 340px minmax(0, 1fr);
  }

  .field-textarea {
    min-height: 420px;
  }
}

@media (min-width: 1201px) {
  .left-sidebar {
    position: sticky;
    top: 12px;
    max-height: calc(100vh - 110px);
    overflow: auto;
  }

  .streaming-editor-page.is-fullscreen .left-sidebar {
    top: 18px;
    max-height: calc(100vh - 44px);
  }
}

@media (max-width: 1200px) {
  .workspace-shell,
  .workbench-header {
    grid-template-columns: 1fr;
  }

  .hero-actions {
    justify-content: flex-start;
    min-width: 0;
  }

  .field-textarea {
    min-height: 260px;
  }
}

@media (max-width: 768px) {
  .rail-nav {
    grid-template-columns: 1fr 1fr;
  }

  .pipeline-meta-grid {
    grid-template-columns: 1fr;
  }

  .monitor-strip {
    grid-template-columns: 1fr;
  }
}
</style>
