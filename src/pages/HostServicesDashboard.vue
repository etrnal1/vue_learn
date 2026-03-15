<template>
  <div class="host-services-page">
    <section class="hero">
      <div>
        <p class="eyebrow">Host Services</p>
        <h1>主机服务总览</h1>
        <p class="hero-text">把当前正在跑的服务、是否随重启恢复、以及推荐的拉起方式先集中展示出来。</p>
      </div>
      <div class="hero-actions">
        <div class="hero-meta">
          <span>主机：{{ summary.host || '-' }}</span>
          <span>平台：{{ summary.platform || '-' }}</span>
          <span>扫描时间：{{ formatDateTime(summary.scannedAt) }}</span>
        </div>
        <button class="refresh-btn" :disabled="loading" @click="loadData(true)">
          {{ loading ? '刷新中...' : '立即刷新' }}
        </button>
      </div>
    </section>

    <section class="summary-grid">
      <article v-for="item in summaryCards" :key="item.label" class="summary-card">
        <span class="summary-label">{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
        <small>{{ item.tip }}</small>
      </article>
    </section>

    <section class="panel">
      <div class="panel-header">
        <h2>重启可行性判断</h2>
        <span class="status-pill" :class="startupPlan.feasible ? 'good' : 'warn'">
          {{ startupPlan.feasible ? '可实现' : '待确认' }}
        </span>
      </div>
      <p class="plan-summary">{{ startupPlan.summary || '正在分析中...' }}</p>
      <div class="approach-grid">
        <article v-for="item in startupPlan.approaches || []" :key="item.id" class="approach-card">
          <h3>{{ item.title }}</h3>
          <p>{{ item.desc }}</p>
        </article>
      </div>
    </section>

    <section class="panel">
      <div class="panel-header">
        <h2>tmux 恢复设计</h2>
        <span class="status-pill" :class="tmux.detected ? 'good' : 'warn'">
          {{ tmux.detected ? `已检测到 ${tmux.sessionCount} 个 session` : '未检测到 session' }}
        </span>
      </div>
      <p class="plan-summary">{{ tmux.summary || 'tmux 检测结果加载中...' }}</p>
      <div class="two-column tmux-grid">
        <article class="service-card managed">
          <div class="service-top">
            <div>
              <h3>推荐落地方式</h3>
              <p>{{ tmux.note }}</p>
            </div>
            <span class="status-pill">开发工作台</span>
          </div>
          <code class="code-block">{{ tmux.restoreScriptExample || '#' }}</code>
        </article>
        <article class="service-card manual">
          <div class="service-top">
            <div>
              <h3>登录自动恢复</h3>
              <p>用 LaunchAgent 在登录后自动执行恢复脚本，而不是依赖 tmux 自己保活。</p>
            </div>
            <span class="status-pill warn">脚本重建</span>
          </div>
          <code class="code-block">{{ tmux.launchAgentHint || '-' }}</code>
          <div v-if="tmux.sessions?.length" class="tag-list tmux-tags">
            <span v-for="item in tmux.sessions" :key="item.id" class="tag good">
              {{ item.name }} · {{ item.windows || 0 }} 窗口
            </span>
          </div>
        </article>
      </div>
    </section>

    <section class="panel">
      <div class="panel-header">
        <h2>关键发现</h2>
        <span class="panel-subtitle">自动从 `brew services`、`launchctl`、监听端口和进程列表汇总</span>
      </div>
      <div class="findings-list">
        <article v-for="item in findings" :key="item.id" class="finding-card" :class="item.level || 'info'">
          <h3>{{ item.title }}</h3>
          <p>{{ item.detail }}</p>
        </article>
      </div>
    </section>

    <section class="two-column">
      <article class="panel">
        <div class="panel-header">
          <h2>已纳管服务</h2>
          <span class="panel-subtitle">重启后更容易恢复</span>
        </div>
        <div v-if="managedServices.length" class="service-list">
          <article v-for="service in managedServices" :key="service.id" class="service-card managed">
            <div class="service-top">
              <div>
                <h3>{{ service.name }}</h3>
                <p>{{ service.label || service.commandName }}</p>
              </div>
              <span class="status-pill good">{{ managerLabel(service.manager) }}</span>
            </div>
            <div class="service-meta">
              <span>启动方式：{{ startupModeLabel(service.startupMode) }}</span>
              <span>端口：{{ formatPorts(service.ports) }}</span>
              <span>用户：{{ service.user || '-' }}</span>
            </div>
            <code v-if="service.restartCommand" class="code-block">{{ service.restartCommand }}</code>
          </article>
        </div>
        <p v-else class="empty-state">暂未识别到已纳管服务。</p>
      </article>

      <article class="panel">
        <div class="panel-header">
          <h2>待纳入一键拉起</h2>
          <span class="panel-subtitle">这些服务更像手动会话进程</span>
        </div>
        <div v-if="recommendations.length" class="service-list">
          <article v-for="item in recommendations" :key="item.id" class="service-card manual">
            <div class="service-top">
              <div>
                <h3>{{ item.name }}</h3>
                <p>{{ item.reason }}</p>
              </div>
              <span class="status-pill warn">建议补托管</span>
            </div>
            <p class="recommend-action">{{ item.action }}</p>
            <code v-if="item.suggestedCommand" class="code-block">{{ item.suggestedCommand }}</code>
          </article>
        </div>
        <p v-else class="empty-state">目前没有明显需要补充托管的服务。</p>
      </article>
    </section>

    <section class="panel">
      <div class="panel-header">
        <h2>服务清单</h2>
        <span class="panel-subtitle">按“已可恢复 → 监听端口更多”排序</span>
      </div>
      <div class="table-wrap">
        <table class="service-table">
          <thead>
            <tr>
              <th>名称</th>
              <th>托管方式</th>
              <th>端口</th>
              <th>重启恢复</th>
              <th>启动模式</th>
              <th>命令 / 标签</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="service in services" :key="service.id">
              <td>
                <strong>{{ service.name }}</strong>
                <div class="cell-sub">PID {{ service.pid || '-' }} · {{ service.user || '-' }}</div>
              </td>
              <td>{{ managerLabel(service.manager) }}</td>
              <td>{{ formatPorts(service.ports) }}</td>
              <td>
                <span class="status-pill" :class="service.rebootReady ? 'good' : 'warn'">
                  {{ service.rebootReady ? '较容易' : '需要补方案' }}
                </span>
              </td>
              <td>{{ startupModeLabel(service.startupMode) }}</td>
              <td>
                <div class="cell-command">{{ service.command || service.label || '-' }}</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="two-column">
      <article class="panel compact">
        <div class="panel-header">
          <h2>brew services</h2>
          <span class="panel-subtitle">Homebrew 常驻服务</span>
        </div>
        <div class="tag-list">
          <span v-for="service in brewServices" :key="service.id" class="tag" :class="service.isStarted ? 'good' : 'muted'">
            {{ service.name }} · {{ service.status }}
          </span>
        </div>
      </article>

      <article class="panel compact">
        <div class="panel-header">
          <h2>第三方 launchctl 标签</h2>
          <span class="panel-subtitle">已过滤 `com.apple.*`</span>
        </div>
        <div class="tag-list">
          <span v-for="item in launchServices" :key="item.id" class="tag">
            {{ item.label }}
          </span>
        </div>
      </article>
    </section>

    <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
  </div>
</template>

<script>
import { api } from '../utils/api'

export default {
  name: 'HostServicesDashboard',
  data() {
    return {
      loading: false,
      errorMessage: '',
      payload: {
        summary: {},
        findings: [],
        recommendations: [],
        startupPlan: { feasible: true, summary: '', approaches: [] },
        tmux: {
          detected: false,
          sessionCount: 0,
          sessions: [],
          summary: '',
          restoreScriptExample: '',
          launchAgentHint: '',
          note: ''
        },
        services: [],
        brewServices: [],
        launchServices: []
      }
    }
  },
  computed: {
    summary() {
      return this.payload.summary || {}
    },
    findings() {
      return Array.isArray(this.payload.findings) ? this.payload.findings : []
    },
    recommendations() {
      return Array.isArray(this.payload.recommendations) ? this.payload.recommendations : []
    },
    startupPlan() {
      return this.payload.startupPlan || { feasible: true, summary: '', approaches: [] }
    },
    tmux() {
      return this.payload.tmux || {
        detected: false,
        sessionCount: 0,
        sessions: [],
        summary: '',
        restoreScriptExample: '',
        launchAgentHint: '',
        note: ''
      }
    },
    services() {
      return Array.isArray(this.payload.services) ? this.payload.services : []
    },
    managedServices() {
      return this.services.filter((item) => item.manager !== 'manual').slice(0, 8)
    },
    brewServices() {
      return Array.isArray(this.payload.brewServices) ? this.payload.brewServices : []
    },
    launchServices() {
      return Array.isArray(this.payload.launchServices) ? this.payload.launchServices.slice(0, 24) : []
    },
    summaryCards() {
      return [
        {
          label: '识别到的服务',
          value: this.summary.totalServices ?? 0,
          tip: '聚合监听端口与常驻项'
        },
        {
          label: '可随重启恢复',
          value: this.summary.rebootReadyServices ?? 0,
          tip: '已托管或可直接重启'
        },
        {
          label: '手动会话服务',
          value: this.summary.manualServices ?? 0,
          tip: '建议补 LaunchAgent'
        },
        {
          label: 'brew 已启动',
          value: this.summary.brewStartedServices ?? 0,
          tip: '适合长期驻留服务'
        },
        {
          label: 'tmux session',
          value: this.summary.tmuxSessions ?? 0,
          tip: '可脚本化恢复工作台'
        }
      ]
    }
  },
  mounted() {
    this.loadData()
  },
  methods: {
    async loadData(force = false) {
      this.loading = true
      try {
        this.payload = await api.launchOps.getHostServices(force)
        this.errorMessage = ''
      } catch (error) {
        this.errorMessage = `加载主机服务失败：${error?.message || '未知错误'}`
      } finally {
        this.loading = false
      }
    },
    formatDateTime(value) {
      if (!value) return '-'
      return new Date(value).toLocaleString('zh-CN')
    },
    formatPorts(ports) {
      return Array.isArray(ports) && ports.length ? ports.join(', ') : '-'
    },
    managerLabel(value) {
      if (value === 'brew') return 'brew services'
      if (value === 'launchctl') return 'launchctl'
      return 'manual'
    },
    startupModeLabel(value) {
      if (value === 'boot') return '开机启动'
      if (value === 'login') return '登录启动'
      return '手动'
    }
  }
}
</script>

<style scoped>
.host-services-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  color: var(--app-text);
}

.hero {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 22px;
  border-radius: 18px;
  color: #f8fdff;
  background: linear-gradient(135deg, #08253b 0%, #0e5676 58%, #1c7992 100%);
}

.eyebrow {
  margin: 0;
  font-size: 0.74rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #ffc97e;
}

.hero h1 {
  margin: 8px 0;
}

.hero-text {
  margin: 0;
  max-width: 680px;
  opacity: 0.92;
}

.hero-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12px;
}

.hero-meta {
  display: grid;
  gap: 6px;
  font-size: 0.92rem;
  color: rgba(248, 253, 255, 0.88);
  text-align: right;
}

.refresh-btn {
  border: 0;
  border-radius: 999px;
  padding: 10px 16px;
  font-weight: 700;
  color: #06344a;
  background: #d7f6ff;
  cursor: pointer;
}

.refresh-btn:disabled {
  opacity: 0.7;
  cursor: progress;
}

.summary-grid,
.approach-grid,
.two-column {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.summary-grid {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.summary-card,
.panel,
.approach-card,
.finding-card,
.service-card {
  border-radius: 16px;
  border: 1px solid var(--app-border);
  background: var(--app-card);
  box-shadow: 0 10px 24px color-mix(in srgb, var(--app-shadow-light) 40%, transparent);
}

.summary-card {
  padding: 16px;
  display: grid;
  gap: 6px;
}

.summary-label,
.panel-subtitle,
.cell-sub {
  color: var(--app-text-muted);
}

.summary-card strong {
  font-size: 1.7rem;
}

.panel {
  padding: 18px;
}

.compact {
  min-height: 180px;
}

.panel-header,
.service-top {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.panel-header h2,
.service-top h3,
.finding-card h3,
.approach-card h3 {
  margin: 0;
}

.plan-summary,
.finding-card p,
.approach-card p,
.recommend-action {
  margin: 10px 0 0;
  color: var(--app-text-secondary);
}

.findings-list,
.service-list,
.tag-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.service-card {
  padding: 14px;
}

.service-card.managed {
  border-color: color-mix(in srgb, #3cb371 40%, var(--app-border));
}

.service-card.manual {
  border-color: color-mix(in srgb, #f59e0b 38%, var(--app-border));
}

.service-top p,
.service-meta {
  margin: 4px 0 0;
  color: var(--app-text-muted);
}

.service-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  font-size: 0.92rem;
}

.status-pill,
.tag {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 0.82rem;
  font-weight: 700;
  background: color-mix(in srgb, var(--app-border) 60%, transparent);
}

.status-pill.good,
.tag.good,
.finding-card.good {
  background: color-mix(in srgb, #3cb371 18%, var(--app-card));
}

.status-pill.warn,
.finding-card.warn {
  background: color-mix(in srgb, #f59e0b 18%, var(--app-card));
}

.finding-card.info {
  background: color-mix(in srgb, var(--app-primary) 12%, var(--app-card));
}

.code-block {
  display: block;
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  overflow-x: auto;
  background: color-mix(in srgb, var(--app-bg) 72%, #000 3%);
  color: var(--app-text);
}

.table-wrap {
  overflow: auto;
}

.service-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.94rem;
}

.service-table th,
.service-table td {
  padding: 12px 10px;
  border-bottom: 1px solid var(--app-border);
  text-align: left;
  vertical-align: top;
}

.cell-command {
  max-width: 520px;
  color: var(--app-text-secondary);
  word-break: break-word;
}

.tag-list {
  flex-direction: row;
  flex-wrap: wrap;
}

.tmux-tags {
  margin-top: 12px;
}

.tag.muted {
  opacity: 0.68;
}

.empty-state,
.error-message {
  margin: 0;
  padding: 14px 16px;
  border-radius: 14px;
  color: var(--app-text-secondary);
  background: color-mix(in srgb, var(--app-card) 82%, var(--app-bg));
}

.error-message {
  color: #a11c1c;
  background: color-mix(in srgb, #ef4444 12%, var(--app-card));
}

@media (max-width: 1080px) {
  .summary-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .two-column,
  .approach-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .hero {
    flex-direction: column;
  }

  .hero-actions {
    align-items: flex-start;
  }

  .hero-meta {
    text-align: left;
  }

  .summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
