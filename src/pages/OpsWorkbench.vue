<template>
  <div class="ops-page">
    <section class="hero">
      <div>
        <p class="eyebrow">LaunchOps Workbench</p>
        <h2>macOS Launch 任务工作台</h2>
        <p>数据来源：后端 API（任务、thread、相关任务、监控均为服务端数据）。</p>
      </div>
      <div class="hero-metrics">
        <div class="metric">
          <span>任务总数</span>
          <strong>{{ launchTasks.length }}</strong>
        </div>
        <div class="metric">
          <span>成功率</span>
          <strong>{{ monitor.successRate }}%</strong>
        </div>
      </div>
    </section>

    <section class="panel rules-panel">
      <div class="section-head">
        <h3>Launch 任务规则说明</h3>
        <span class="chip">服务端校验</span>
      </div>
      <ul class="rule-list">
        <li>任务名称必填且唯一，长度 2-40 字符。</li>
        <li>命令前缀仅允许：`open` / `npm` / `pnpm` / `yarn` / `node` / `git` / `brew` / `osascript` / `launchctl`。</li>
        <li>命令不允许链式与多行执行（`&&` / `||` / `;` / 换行）。</li>
        <li>高风险任务执行需二次确认。</li>
        <li>冷却时间支持毫秒、秒、分钟、小时、天（内部按毫秒存储）。</li>
      </ul>
    </section>

    <section class="panel">
      <div class="section-head">
        <h3>launchctl 用法说明</h3>
        <span class="chip">可一键填充</span>
      </div>
      <div class="wizard-card">
        <h4>参数向导（自动拼命令）</h4>
        <div class="wizard-grid">
          <label>
            <span>动作</span>
            <select v-model="launchctlWizard.action">
              <option value="list">list</option>
              <option value="print">print</option>
              <option value="bootstrap">bootstrap</option>
              <option value="bootout">bootout</option>
              <option value="kickstart">kickstart</option>
            </select>
          </label>
          <label>
            <span>Domain</span>
            <input v-model.trim="launchctlWizard.domain" type="text" placeholder="gui/$(id -u) 或 system" />
          </label>
          <label>
            <span>Service Label</span>
            <input v-model.trim="launchctlWizard.label" type="text" placeholder="com.example.agent" />
          </label>
          <label>
            <span>Plist 路径</span>
            <input v-model.trim="launchctlWizard.plistPath" type="text" placeholder="~/Library/LaunchAgents/com.example.agent.plist" />
          </label>
        </div>
        <div class="wizard-output">
          <code>{{ launchctlWizardCommand }}</code>
          <button type="button" class="small" @click="applyLaunchctlWizard">用这个命令创建任务</button>
        </div>
      </div>
      <div class="help-grid">
        <div class="help-card" v-for="item in launchctlPresets" :key="item.id">
          <strong>{{ item.title }}</strong>
          <code>{{ item.command }}</code>
          <p>{{ item.desc }}</p>
          <button type="button" class="small" @click="applyLaunchctlPreset(item)">填充到表单</button>
        </div>
      </div>
      <p class="muted">
        说明：`gui/UID` 用于当前登录用户域，`system` 用于系统域。`bootstrap`/`bootout` 通常配合 plist 路径或 service label 使用。
      </p>
    </section>

    <section class="panel">
      <div class="section-head">
        <h3>{{ editingTaskId ? '编辑 Launch 任务' : '创建 Launch 任务' }}</h3>
        <button class="ghost-btn" type="button" @click="resetLaunchForm">重置</button>
      </div>
      <form class="launch-form" @submit.prevent="saveLaunchTask">
        <label>
          <span>任务名称</span>
          <input v-model.trim="launchForm.name" type="text" required />
        </label>
        <label>
          <span>分类</span>
          <select v-model="launchForm.category">
            <option value="Launch">Launch</option>
            <option value="Sync">Sync</option>
            <option value="Build">Build</option>
            <option value="Cleanup">Cleanup</option>
          </select>
        </label>
        <label class="full">
          <span>执行命令</span>
          <input v-model.trim="launchForm.command" type="text" required placeholder="例如：open -a iTerm" />
          <small>后端会做白名单和危险语法校验。</small>
        </label>
        <label>
          <span>风险等级</span>
          <select v-model="launchForm.riskLevel">
            <option value="low">低</option>
            <option value="medium">中</option>
            <option value="high">高（执行前确认）</option>
          </select>
        </label>
        <label>
          <span>冷却时间</span>
          <div class="cooldown-row">
            <input v-model.number="launchForm.cooldownValue" type="number" min="0" />
            <select v-model="launchForm.cooldownUnit">
              <option v-for="unit in cooldownUnits" :key="unit.value" :value="unit.value">{{ unit.label }}</option>
            </select>
          </div>
        </label>
        <label class="full">
          <span>执行影响说明</span>
          <input v-model.trim="launchForm.impact" type="text" />
        </label>
        <label class="full">
          <span>回滚说明</span>
          <input v-model.trim="launchForm.rollback" type="text" />
        </label>
        <div class="form-actions full">
          <button type="submit" :disabled="saving">{{ saving ? '保存中...' : (editingTaskId ? '保存修改' : '创建任务') }}</button>
          <button v-if="editingTaskId" class="ghost-btn" type="button" @click="cancelEdit">取消编辑</button>
        </div>
        <p v-if="formMessage" class="form-message">{{ formMessage }}</p>
      </form>
    </section>

    <section class="panel">
      <div class="section-head">
        <h3>Launch 任务列表</h3>
        <span class="chip">真实任务</span>
      </div>
      <div class="table-wrap">
        <table class="tasks-table">
          <thead>
            <tr>
              <th>任务</th>
              <th>命令</th>
              <th>分类</th>
              <th>风险</th>
              <th>冷却</th>
              <th>状态</th>
              <th>最近执行</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="task in launchTasks" :key="task.id">
              <td>{{ task.name }}</td>
              <td class="cmd">{{ task.command }}</td>
              <td>{{ task.category }}</td>
              <td><span class="risk-pill" :class="task.riskLevel">{{ riskLabelMap[task.riskLevel] }}</span></td>
              <td>{{ formatCooldown(task) }}</td>
              <td><span class="status" :class="task.status">{{ statusText[task.status] || task.status }}</span></td>
              <td>{{ task.lastRun || '-' }}</td>
              <td class="op-cell">
                <button class="small" type="button" :disabled="runningTaskId === task.id" @click="runLaunchTask(task)">
                  {{ runningTaskId === task.id ? '执行中' : '执行' }}
                </button>
                <button class="small ghost-btn" type="button" @click="editLaunchTask(task)">编辑</button>
                <button class="small danger-btn" type="button" @click="deleteLaunchTask(task)">删除</button>
              </td>
            </tr>
            <tr v-if="launchTasks.length === 0">
              <td colspan="8" class="empty">暂无 Launch 任务，请先创建。</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="dual-grid">
      <article class="panel">
        <div class="section-head">
          <h3>相关任务视图</h3>
          <div class="filters">
            <input v-model="taskSearch" type="text" placeholder="搜索任务 / owner / 标签" />
            <select v-model="statusFilter">
              <option value="all">全部状态</option>
              <option value="todo">待处理</option>
              <option value="doing">进行中</option>
              <option value="blocked">阻塞</option>
              <option value="done">已完成</option>
            </select>
          </div>
        </div>
        <div class="table-wrap">
          <table class="tasks-table">
            <thead>
              <tr>
                <th>任务</th>
                <th>Owner</th>
                <th>优先级</th>
                <th>截止</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="task in filteredTasks" :key="task.id">
                <td>{{ task.title }}</td>
                <td>{{ task.owner }}</td>
                <td>{{ task.priority }}</td>
                <td>{{ task.dueDate }}</td>
                <td><span class="status-pill" :class="task.status">{{ taskStatusText[task.status] || task.status }}</span></td>
              </tr>
              <tr v-if="filteredTasks.length === 0">
                <td colspan="5" class="empty">暂无任务数据</td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>

      <article class="panel">
        <div class="section-head">
          <h3>Linear Bot Thread</h3>
          <span class="chip">服务端日志</span>
        </div>
        <div class="thread-list">
          <div v-for="msg in linearThread" :key="msg.id" class="thread-item">
            <div class="thread-head">
              <strong>{{ msg.author }}</strong>
              <small>{{ msg.time }}</small>
            </div>
            <p>{{ msg.content }}</p>
          </div>
          <div v-if="linearThread.length === 0" class="empty">暂无 thread 消息</div>
        </div>
        <div class="thread-input-row">
          <input v-model="newMessage" type="text" placeholder="输入一条 thread 回复..." />
          <button type="button" :disabled="postingThread" @click="postThreadMessage">发送</button>
        </div>
      </article>
    </section>

    <section class="panel">
      <div class="section-head">
        <h3>监控可视化</h3>
        <span class="chip">{{ monitorSourceLabel }}</span>
      </div>
      <p v-if="monitorError" class="warning">{{ monitorError }}</p>
      <div class="mini-kpis">
        <div class="kpi"><span>CPU</span><strong>{{ monitor.cpu }}%</strong></div>
        <div class="kpi"><span>内存</span><strong>{{ monitor.memory }}%</strong></div>
        <div class="kpi"><span>运行中任务</span><strong>{{ monitor.queue }}</strong></div>
        <div class="kpi"><span>成功率</span><strong>{{ monitor.successRate }}%</strong></div>
      </div>
      <div class="line-chart">
        <svg viewBox="0 0 300 120" preserveAspectRatio="none">
          <polyline :points="linePoints" class="line" />
        </svg>
      </div>
      <div class="service-bars">
        <div v-for="svc in serviceHealth" :key="svc.name" class="service-row">
          <label>{{ svc.name }}</label>
          <div class="bar-track">
            <div class="bar-fill" :style="{ width: svc.value + '%' }"></div>
          </div>
          <span>{{ svc.value }}%</span>
        </div>
      </div>
      <small class="muted">最近更新时间：{{ lastMonitorAt || '未更新' }}</small>
    </section>
  </div>
</template>

<script>
import { api } from '../utils/api.js'

const COOLDOWN_UNITS = [
  { value: 'ms', label: '毫秒', factor: 1 },
  { value: 's', label: '秒', factor: 1000 },
  { value: 'm', label: '分钟', factor: 60 * 1000 },
  { value: 'h', label: '小时', factor: 60 * 60 * 1000 },
  { value: 'd', label: '天', factor: 24 * 60 * 60 * 1000 }
]
const LEGACY_TASKS_KEY = 'ops_launch_tasks_v1'
const LEGACY_MIGRATED_KEY = 'ops_launch_tasks_migrated_v1'

function nowTime() {
  return new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default {
  name: 'OpsWorkbench',
  data() {
    return {
      monitorTimer: null,
      saving: false,
      postingThread: false,
      runningTaskId: '',
      newMessage: '',
      taskSearch: '',
      statusFilter: 'all',
      editingTaskId: '',
      formMessage: '',
      monitorError: '',
      monitorSourceLabel: '服务端 API',
      lastMonitorAt: '',
      launchForm: {
        name: '',
        category: 'Launch',
        command: '',
        impact: '',
        rollback: '',
        riskLevel: 'low',
        cooldownValue: 60,
        cooldownUnit: 's'
      },
      cooldownUnits: COOLDOWN_UNITS,
      launchTasks: [],
      linearThread: [],
      tasks: [],
      monitor: {
        cpu: 0,
        memory: 0,
        queue: 0,
        successRate: 100
      },
      trend: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      serviceHealth: [],
      statusText: {
        ready: '可执行',
        running: '执行中',
        warning: '需处理'
      },
      launchctlPresets: [
        {
          id: 'list',
          title: '列出全部服务',
          command: 'launchctl list',
          desc: '查看当前域的 launchd 服务列表。'
        },
        {
          id: 'print',
          title: '查看单个服务状态',
          command: 'launchctl print gui/$(id -u)/com.example.agent',
          desc: '查看某个 agent 的详细状态。'
        },
        {
          id: 'bootstrap',
          title: '加载用户 Agent',
          command: 'launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.example.agent.plist',
          desc: '将 plist 加载到当前用户域。'
        },
        {
          id: 'bootout',
          title: '卸载用户 Agent',
          command: 'launchctl bootout gui/$(id -u)/com.example.agent',
          desc: '从当前用户域卸载指定 service label。'
        },
        {
          id: 'kickstart',
          title: '重启服务',
          command: 'launchctl kickstart -k gui/$(id -u)/com.example.agent',
          desc: '强制重启已加载服务，常用于热更新。'
        }
      ],
      launchctlWizard: {
        action: 'bootstrap',
        domain: 'gui/$(id -u)',
        label: 'com.example.agent',
        plistPath: '~/Library/LaunchAgents/com.example.agent.plist'
      },
      riskLabelMap: {
        low: '低',
        medium: '中',
        high: '高'
      },
      taskStatusText: {
        todo: '待处理',
        doing: '进行中',
        blocked: '阻塞',
        done: '已完成'
      }
    }
  },
  computed: {
    launchctlWizardCommand() {
      const action = String(this.launchctlWizard.action || 'list').trim()
      const domain = String(this.launchctlWizard.domain || '').trim() || 'gui/$(id -u)'
      const label = String(this.launchctlWizard.label || '').trim() || 'com.example.agent'
      const plist = String(this.launchctlWizard.plistPath || '').trim() || '~/Library/LaunchAgents/com.example.agent.plist'
      if (action === 'list') return 'launchctl list'
      if (action === 'print') return `launchctl print ${domain}/${label}`
      if (action === 'bootstrap') return `launchctl bootstrap ${domain} ${plist}`
      if (action === 'bootout') return `launchctl bootout ${domain}/${label}`
      if (action === 'kickstart') return `launchctl kickstart -k ${domain}/${label}`
      return 'launchctl list'
    },
    filteredTasks() {
      const q = this.taskSearch.trim().toLowerCase()
      return this.tasks.filter((task) => {
        const hitStatus = this.statusFilter === 'all' || task.status === this.statusFilter
        const hitText = !q || [task.id, task.title, task.owner, task.priority].join(' ').toLowerCase().includes(q)
        return hitStatus && hitText
      })
    },
    linePoints() {
      const width = 300
      const height = 120
      const max = 100
      const step = width / (this.trend.length - 1)
      return this.trend
        .map((value, idx) => {
          const x = Math.round(idx * step)
          const y = Math.round(height - (Number(value) / max) * height)
          return `${x},${y}`
        })
        .join(' ')
    }
  },
  methods: {
    normalizeLegacyTask(task) {
      const name = String(task?.name || '').trim()
      const command = String(task?.command || '').trim()
      if (!name || !command) return null
      const cooldownMsRaw = Number(task?.cooldownMs ?? (Number(task?.cooldownSec || 0) * 1000))
      const cooldownMs = Number.isFinite(cooldownMsRaw) ? Math.max(0, Math.round(cooldownMsRaw)) : 0
      return {
        name,
        category: String(task?.category || 'Launch').trim() || 'Launch',
        command,
        impact: String(task?.impact || '').trim(),
        rollback: String(task?.rollback || '').trim(),
        riskLevel: ['low', 'medium', 'high'].includes(String(task?.riskLevel || '')) ? String(task.riskLevel) : 'low',
        cooldownMs
      }
    },
    async migrateLegacyTasksIfNeeded() {
      try {
        const migrated = localStorage.getItem(LEGACY_MIGRATED_KEY)
        if (migrated === '1') return
        const raw = localStorage.getItem(LEGACY_TASKS_KEY)
        if (!raw) {
          localStorage.setItem(LEGACY_MIGRATED_KEY, '1')
          return
        }
        const parsed = JSON.parse(raw)
        if (!Array.isArray(parsed) || parsed.length === 0) {
          localStorage.setItem(LEGACY_MIGRATED_KEY, '1')
          return
        }
        const legacyTasks = parsed
          .map((item) => this.normalizeLegacyTask(item))
          .filter(Boolean)
        if (legacyTasks.length === 0) {
          localStorage.setItem(LEGACY_MIGRATED_KEY, '1')
          return
        }
        for (const item of legacyTasks) {
          // 忽略单条失败，继续导入剩余任务
          try {
            await api.launchOps.createTask(item)
          } catch (_error) {}
        }
        localStorage.setItem(LEGACY_MIGRATED_KEY, '1')
      } catch (_error) {
        // 迁移失败不阻断页面
      }
    },
    toCooldownMs(value, unit) {
      const n = Number(value)
      const factor = this.cooldownUnits.find((item) => item.value === unit)?.factor || 1000
      if (!Number.isFinite(n) || n < 0) return NaN
      return Math.round(n * factor)
    },
    fromCooldownMs(ms) {
      const safe = Math.max(0, Number(ms) || 0)
      for (let i = this.cooldownUnits.length - 1; i >= 0; i -= 1) {
        const unit = this.cooldownUnits[i]
        if (safe >= unit.factor && safe % unit.factor === 0) {
          return { cooldownValue: safe / unit.factor, cooldownUnit: unit.value }
        }
      }
      if (safe >= 1000) return { cooldownValue: Number((safe / 1000).toFixed(3)), cooldownUnit: 's' }
      return { cooldownValue: safe, cooldownUnit: 'ms' }
    },
    formatCooldown(task) {
      const ms = Number(task?.cooldownMs)
      if (!Number.isFinite(ms) || ms <= 0) return '0 秒'
      const day = 24 * 60 * 60 * 1000
      const hour = 60 * 60 * 1000
      const minute = 60 * 1000
      const second = 1000
      if (ms % day === 0) return `${ms / day} 天`
      if (ms % hour === 0) return `${ms / hour} 小时`
      if (ms % minute === 0) return `${ms / minute} 分钟`
      if (ms % second === 0) return `${ms / second} 秒`
      return `${ms} 毫秒`
    },
    normalizeTask(task) {
      const cooldownMs = Number(task?.cooldownMs ?? (Number(task?.cooldownSec || 0) * 1000)) || 0
      return {
        ...task,
        cooldownMs,
        cooldownSec: Math.floor(cooldownMs / 1000)
      }
    },
    async loadOverview() {
      try {
        const result = await api.launchOps.getOverview()
        const tasks = Array.isArray(result?.tasks) ? result.tasks.map((item) => this.normalizeTask(item)) : []
        this.launchTasks = tasks
        this.linearThread = Array.isArray(result?.thread) ? result.thread : []
        this.tasks = Array.isArray(result?.relatedTasks) ? result.relatedTasks : []

        const monitor = result?.monitor || {}
        this.monitor = {
          cpu: Number(monitor?.cpu || 0),
          memory: Number(monitor?.memory || 0),
          queue: Number(monitor?.queue || 0),
          successRate: Number(monitor?.successRate || 100)
        }
        this.serviceHealth = Array.isArray(result?.serviceHealth) ? result.serviceHealth : []
        this.trend.push(this.monitor.cpu)
        this.trend.shift()
        this.lastMonitorAt = nowTime()
        this.monitorSourceLabel = String(result?.source || 'server')
        this.monitorError = ''
      } catch (error) {
        this.monitorError = `加载数据失败：${error?.message || '未知错误'}`
      }
    },
    async refreshMonitor() {
      try {
        const result = await api.launchOps.getMonitor()
        const monitor = result?.monitor || {}
        this.monitor = {
          cpu: Number(monitor?.cpu || 0),
          memory: Number(monitor?.memory || 0),
          queue: Number(monitor?.queue || 0),
          successRate: Number(monitor?.successRate || 100)
        }
        this.serviceHealth = Array.isArray(result?.serviceHealth) ? result.serviceHealth : this.serviceHealth
        this.trend.push(this.monitor.cpu)
        this.trend.shift()
        this.lastMonitorAt = nowTime()
        this.monitorSourceLabel = String(result?.source || 'server')
        this.monitorError = ''
      } catch (error) {
        this.monitorError = `监控刷新失败：${error?.message || '未知错误'}`
      }
    },
    validateLaunchForm() {
      const name = String(this.launchForm.name || '').trim()
      if (name.length < 2 || name.length > 40) return '任务名称长度需在 2-40 个字符之间。'

      const cooldownMs = this.toCooldownMs(this.launchForm.cooldownValue, this.launchForm.cooldownUnit)
      const maxCooldownMs = 365 * 24 * 60 * 60 * 1000
      if (!Number.isFinite(cooldownMs) || cooldownMs < 0 || cooldownMs > maxCooldownMs) {
        return '冷却时间需在 0 到 365 天之间。'
      }
      return ''
    },
    async saveLaunchTask() {
      const err = this.validateLaunchForm()
      if (err) {
        this.formMessage = err
        return
      }

      this.saving = true
      this.formMessage = ''
      const payload = {
        name: this.launchForm.name.trim(),
        category: this.launchForm.category,
        command: this.launchForm.command.trim(),
        impact: this.launchForm.impact.trim(),
        rollback: this.launchForm.rollback.trim(),
        riskLevel: this.launchForm.riskLevel,
        cooldownMs: this.toCooldownMs(this.launchForm.cooldownValue, this.launchForm.cooldownUnit)
      }

      try {
        if (this.editingTaskId) {
          await api.launchOps.updateTask(this.editingTaskId, payload)
          this.formMessage = '任务更新成功。'
        } else {
          await api.launchOps.createTask(payload)
          this.formMessage = '任务创建成功。'
        }
        this.resetLaunchForm()
        await this.loadOverview()
      } catch (error) {
        this.formMessage = `保存失败：${error?.message || '未知错误'}`
      } finally {
        this.saving = false
      }
    },
    editLaunchTask(task) {
      this.editingTaskId = task.id
      const { cooldownValue, cooldownUnit } = this.fromCooldownMs(task.cooldownMs)
      this.launchForm = {
        name: task.name,
        category: task.category,
        command: task.command,
        impact: task.impact || '',
        rollback: task.rollback || '',
        riskLevel: task.riskLevel || 'low',
        cooldownValue,
        cooldownUnit
      }
      this.formMessage = '已载入任务，可直接修改后保存。'
    },
    cancelEdit() {
      this.resetLaunchForm()
      this.formMessage = '已取消编辑。'
    },
    resetLaunchForm() {
      this.editingTaskId = ''
      this.launchForm = {
        name: '',
        category: 'Launch',
        command: '',
        impact: '',
        rollback: '',
        riskLevel: 'low',
        cooldownValue: 60,
        cooldownUnit: 's'
      }
    },
    async deleteLaunchTask(task) {
      const ok = window.confirm(`确认删除任务「${task.name}」吗？`)
      if (!ok) return
      try {
        await api.launchOps.removeTask(task.id)
        if (this.editingTaskId === task.id) this.resetLaunchForm()
        await this.loadOverview()
      } catch (error) {
        this.formMessage = `删除失败：${error?.message || '未知错误'}`
      }
    },
    async runLaunchTask(task) {
      const isHighRisk = task.riskLevel === 'high'
      if (isHighRisk) {
        const ok = window.confirm(`高风险任务「${task.name}」将执行命令：\n${task.command}\n\n请确认继续。`)
        if (!ok) return
      }

      this.runningTaskId = task.id
      try {
        await api.launchOps.runTask(task.id, { confirm: isHighRisk })
        await this.loadOverview()
      } catch (error) {
        this.formMessage = `执行失败：${error?.message || '未知错误'}`
      } finally {
        this.runningTaskId = ''
      }
    },
    async postThreadMessage() {
      const content = this.newMessage.trim()
      if (!content) return
      this.postingThread = true
      try {
        await api.launchOps.postThread(content)
        this.newMessage = ''
        await this.loadOverview()
      } catch (error) {
        this.formMessage = `消息发送失败：${error?.message || '未知错误'}`
      } finally {
        this.postingThread = false
      }
    },
    applyLaunchctlPreset(item) {
      this.launchForm.category = 'Launch'
      this.launchForm.riskLevel = 'medium'
      this.launchForm.name = item.title
      this.launchForm.command = item.command
      this.launchForm.impact = item.desc
      this.launchForm.rollback = '可使用 launchctl bootout 或 bootstrap 回滚到目标状态'
      this.formMessage = '已填充 launchctl 模板，可直接保存。'
    },
    applyLaunchctlWizard() {
      this.launchForm.category = 'Launch'
      this.launchForm.riskLevel = 'medium'
      this.launchForm.name = `launchctl ${this.launchctlWizard.action}`
      this.launchForm.command = this.launchctlWizardCommand
      this.launchForm.impact = `通过向导生成：${this.launchctlWizard.action}`
      this.launchForm.rollback = '按需使用 bootout/bootstrap/kickstart 恢复目标状态'
      this.formMessage = '已将向导命令填充到创建表单。'
    }
  },
  async mounted() {
    await this.migrateLegacyTasksIfNeeded()
    await this.loadOverview()
    this.monitorTimer = setInterval(this.refreshMonitor, 5000)
  },
  beforeUnmount() {
    if (this.monitorTimer) clearInterval(this.monitorTimer)
  }
}
</script>

<style scoped>
.ops-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  color: var(--app-text);
}

.hero {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  padding: 20px;
  border-radius: 14px;
  background: linear-gradient(135deg, #062a3a 0%, #0f4e66 55%, #1f6f86 100%);
  color: #ecfbff;
}

.eyebrow {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: 0.74rem;
  color: #ffcf86;
}

.hero h2 {
  margin: 8px 0;
}

.hero p {
  margin: 0;
  opacity: 0.92;
}

.hero-metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(96px, 1fr));
  gap: 8px;
}

.metric {
  background: rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  padding: 10px;
}

.metric span {
  display: block;
  font-size: 0.75rem;
}

.metric strong {
  font-size: 1.2rem;
}

.panel {
  background: var(--app-card);
  border: 1px solid var(--app-border);
  border-radius: 14px;
  padding: 16px;
  box-shadow: var(--app-soft-shadow);
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.section-head h3 {
  margin: 0;
}

.chip {
  background: #e0f4ff;
  color: #0f5d76;
  border-radius: 999px;
  padding: 3px 10px;
  font-size: 0.75rem;
  font-weight: 700;
}

.rule-list {
  margin: 0;
  padding-left: 18px;
  line-height: 1.8;
  color: var(--app-text-secondary);
}

.help-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.wizard-card {
  border: 1px solid var(--app-border);
  border-radius: 10px;
  padding: 10px;
  margin-bottom: 10px;
  background: var(--app-card);
}

.wizard-card h4 {
  margin: 0 0 8px;
  font-size: 0.95rem;
}

.wizard-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 8px;
}

.wizard-grid label {
  display: grid;
  gap: 6px;
}

.wizard-output {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  align-items: center;
}

.wizard-output code {
  font-family: 'SF Mono', Menlo, monospace;
  font-size: 0.78rem;
  color: var(--app-text-secondary);
  background: rgba(2, 132, 168, 0.06);
  border-radius: 6px;
  padding: 6px;
  word-break: break-all;
}

.help-card {
  border: 1px solid var(--app-border);
  border-radius: 10px;
  padding: 10px;
  background: var(--app-card);
  display: grid;
  gap: 6px;
}

.help-card code {
  font-family: 'SF Mono', Menlo, monospace;
  font-size: 0.78rem;
  color: var(--app-text-secondary);
  background: rgba(2, 132, 168, 0.06);
  border-radius: 6px;
  padding: 6px;
}

.help-card p {
  margin: 0;
  color: var(--app-text-secondary);
  font-size: 0.84rem;
}

.launch-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.launch-form label {
  display: grid;
  gap: 6px;
}

.launch-form .full {
  grid-column: 1 / -1;
}

.cooldown-row {
  display: grid;
  grid-template-columns: 1fr 110px;
  gap: 8px;
}

input,
select {
  border: 1px solid var(--app-border);
  border-radius: 8px;
  padding: 8px 10px;
  background: var(--app-card);
  color: var(--app-text);
}

small {
  color: var(--app-text-muted);
}

.form-actions {
  display: flex;
  gap: 8px;
}

.form-message {
  margin: 0;
  color: #0f766e;
  font-weight: 600;
}

button {
  border: none;
  border-radius: 8px;
  padding: 8px 12px;
  cursor: pointer;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #007f98, #005f85);
}

.small {
  padding: 5px 8px;
  font-size: 0.78rem;
}

.ghost-btn {
  background: transparent;
  color: var(--app-text-secondary);
  border: 1px solid var(--app-border);
}

.danger-btn {
  background: #b91c1c;
}

.table-wrap {
  overflow-x: auto;
}

.tasks-table {
  width: 100%;
  border-collapse: collapse;
}

.tasks-table th,
.tasks-table td {
  border-bottom: 1px solid var(--app-border);
  padding: 8px;
  text-align: left;
  vertical-align: top;
}

.tasks-table th {
  font-size: 0.82rem;
  color: var(--app-text-secondary);
}

.cmd {
  font-family: 'SF Mono', Menlo, monospace;
  font-size: 0.78rem;
  color: var(--app-text-secondary);
}

.op-cell {
  white-space: nowrap;
}

.empty {
  text-align: center;
  color: var(--app-text-muted);
}

.status {
  display: inline-block;
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 0.72rem;
  font-weight: 700;
}

.status.ready { color: #0f766e; background: #d1fae5; }
.status.running { color: #075985; background: #dbeafe; }
.status.warning { color: #9a3412; background: #ffedd5; }

.risk-pill {
  display: inline-block;
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 0.72rem;
  font-weight: 700;
}

.risk-pill.low { color: #166534; background: #dcfce7; }
.risk-pill.medium { color: #92400e; background: #fef3c7; }
.risk-pill.high { color: #991b1b; background: #fee2e2; }

.dual-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.filters {
  display: flex;
  gap: 8px;
}

.status-pill {
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 3px 8px;
}

.status-pill.todo { color: #785200; background: #fff2cf; }
.status-pill.doing { color: #005b78; background: #d8f4ff; }
.status-pill.blocked { color: #7f1838; background: #ffe3ee; }
.status-pill.done { color: #0a8e68; background: #dcfff3; }

.thread-list {
  display: grid;
  gap: 8px;
  max-height: 240px;
  overflow: auto;
  margin-bottom: 10px;
}

.thread-item {
  border: 1px solid var(--app-border);
  border-radius: 8px;
  padding: 8px;
  background: rgba(0, 127, 152, 0.03);
}

.thread-head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.thread-item p {
  margin: 0;
}

.thread-input-row {
  display: flex;
  gap: 8px;
}

.thread-input-row input {
  flex: 1;
}

.warning {
  margin: 0 0 10px;
  color: #9a3412;
  background: #ffedd5;
  border: 1px solid #fdba74;
  border-radius: 8px;
  padding: 8px 10px;
}

.mini-kpis {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 10px;
}

.kpi {
  border-radius: 10px;
  padding: 10px;
  background: linear-gradient(145deg, rgba(0, 127, 152, 0.08), rgba(255, 129, 61, 0.12));
}

.kpi span {
  display: block;
  font-size: 0.75rem;
  color: var(--app-text-secondary);
}

.kpi strong {
  font-size: 1.1rem;
}

.line-chart {
  border-radius: 10px;
  border: 1px solid var(--app-border);
  height: 130px;
  padding: 8px;
  margin-bottom: 12px;
}

.line-chart svg {
  width: 100%;
  height: 100%;
}

.line {
  fill: none;
  stroke: #0284a8;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.service-bars {
  display: grid;
  gap: 8px;
}

.service-row {
  display: grid;
  grid-template-columns: 130px 1fr 42px;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
}

.bar-track {
  border-radius: 999px;
  overflow: hidden;
  height: 9px;
  background: rgba(0, 0, 0, 0.08);
}

.bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #0ea5b7, #f97316);
  transition: width 0.5s ease;
}

.muted {
  color: var(--app-text-muted);
}

@media (max-width: 980px) {
  .dual-grid,
  .mini-kpis,
  .launch-form,
  .wizard-grid,
  .help-grid {
    grid-template-columns: 1fr;
  }

  .hero {
    flex-direction: column;
  }
}

@media (max-width: 640px) {
  .section-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .filters,
  .thread-input-row {
    width: 100%;
    flex-direction: column;
  }

  .cooldown-row {
    grid-template-columns: 1fr;
  }

  .wizard-output {
    grid-template-columns: 1fr;
  }

  .service-row {
    grid-template-columns: 1fr;
  }
}
</style>
