<template>
  <div class="monitor-page">
    <section class="hero">
      <div>
        <h1>设备状态大屏</h1>
        <p>实时监控 CPU、内存、硬盘与系统运行状态</p>
      </div>
      <div class="hero-meta">
        <span>刷新周期 {{ refreshSeconds }}s</span>
        <span>更新时间 {{ formatClock(lastUpdatedAt) }}</span>
      </div>
    </section>

    <section class="metrics-grid">
      <article class="metric-card cpu">
        <header>
          <h2>CPU</h2>
          <span class="value">{{ metricValue(metrics.cpuUsagePercent) }}%</span>
        </header>
        <div class="meter">
          <div class="meter-fill" :style="{ width: `${metricValue(metrics.cpuUsagePercent)}%` }"></div>
        </div>
        <p>{{ metrics.cpuCores }} 核 · 负载 {{ formatLoad(metrics.loadAverage) }}</p>
      </article>

      <article class="metric-card memory">
        <header>
          <h2>内存</h2>
          <span class="value">{{ metricValue(metrics.memoryUsagePercent) }}%</span>
        </header>
        <div class="meter">
          <div class="meter-fill" :style="{ width: `${metricValue(metrics.memoryUsagePercent)}%` }"></div>
        </div>
        <p>{{ formatBytes(metrics.memoryUsedBytes) }} / {{ formatBytes(metrics.memoryTotalBytes) }}</p>
      </article>

      <article class="metric-card disk">
        <header>
          <h2>硬盘</h2>
          <span class="value">{{ metricValue(metrics.diskUsagePercent) }}%</span>
        </header>
        <div class="meter">
          <div class="meter-fill" :style="{ width: `${metricValue(metrics.diskUsagePercent)}%` }"></div>
        </div>
        <p>{{ formatBytes(metrics.diskUsedBytes) }} / {{ formatBytes(metrics.diskTotalBytes) }}</p>
      </article>
    </section>

    <section class="panel-grid">
      <article class="panel">
        <h3>主机信息</h3>
        <div class="info-grid">
          <div class="info-item"><label>主机名</label><span>{{ host.hostname || '-' }}</span></div>
          <div class="info-item"><label>系统</label><span>{{ host.platform || '-' }} / {{ host.arch || '-' }}</span></div>
          <div class="info-item"><label>版本</label><span>{{ host.release || '-' }}</span></div>
          <div class="info-item"><label>开机时长</label><span>{{ formatDuration(host.uptimeSec) }}</span></div>
          <div class="info-item"><label>CPU 型号</label><span>{{ cpu.model || '-' }}</span></div>
          <div class="info-item"><label>CPU 频率</label><span>{{ cpu.speedMHz || 0 }} MHz</span></div>
        </div>
      </article>

      <article class="panel">
        <h3>最近采样（20条）</h3>
        <div class="spark-list">
          <div class="spark-row">
            <label>CPU</label>
            <div class="spark-bars">
              <span
                v-for="(item, idx) in history"
                :key="`cpu-${idx}`"
                class="spark-bar cpu"
                :style="{ height: `${Math.max(6, item.cpu)}%` }"
                :title="`CPU ${item.cpu.toFixed(1)}%`"
              ></span>
            </div>
          </div>
          <div class="spark-row">
            <label>内存</label>
            <div class="spark-bars">
              <span
                v-for="(item, idx) in history"
                :key="`mem-${idx}`"
                class="spark-bar memory"
                :style="{ height: `${Math.max(6, item.memory)}%` }"
                :title="`内存 ${item.memory.toFixed(1)}%`"
              ></span>
            </div>
          </div>
          <div class="spark-row">
            <label>硬盘</label>
            <div class="spark-bars">
              <span
                v-for="(item, idx) in history"
                :key="`disk-${idx}`"
                class="spark-bar disk"
                :style="{ height: `${Math.max(6, item.disk)}%` }"
                :title="`硬盘 ${item.disk.toFixed(1)}%`"
              ></span>
            </div>
          </div>
        </div>
      </article>
    </section>

    <p class="error" v-if="errorMessage">{{ errorMessage }}</p>
  </div>
</template>

<script>
import { api } from '../utils/api'

const HISTORY_LIMIT = 20

export default {
  name: 'SystemMonitorDashboard',
  data() {
    return {
      refreshSeconds: 2,
      timerId: null,
      lastUpdatedAt: 0,
      errorMessage: '',
      host: {},
      cpu: {},
      history: [],
      metrics: {
        cpuUsagePercent: 0,
        cpuCores: 0,
        loadAverage: [],
        memoryUsagePercent: 0,
        memoryTotalBytes: 0,
        memoryUsedBytes: 0,
        diskUsagePercent: 0,
        diskTotalBytes: 0,
        diskUsedBytes: 0
      }
    }
  },
  mounted() {
    this.fetchStatus()
    this.timerId = window.setInterval(this.fetchStatus, this.refreshSeconds * 1000)
  },
  beforeUnmount() {
    if (this.timerId) {
      window.clearInterval(this.timerId)
      this.timerId = null
    }
  },
  methods: {
    metricValue(value) {
      const numeric = Number(value || 0)
      return Number.isFinite(numeric) ? numeric.toFixed(1) : '0.0'
    },
    formatBytes(bytes) {
      const value = Number(bytes || 0)
      if (!Number.isFinite(value) || value <= 0) return '0 B'
      const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
      let size = value
      let index = 0
      while (size >= 1024 && index < units.length - 1) {
        size /= 1024
        index += 1
      }
      return `${size.toFixed(size >= 10 ? 1 : 2)} ${units[index]}`
    },
    formatDuration(seconds) {
      const sec = Math.max(0, Math.floor(Number(seconds || 0)))
      const day = Math.floor(sec / 86400)
      const hour = Math.floor((sec % 86400) / 3600)
      const minute = Math.floor((sec % 3600) / 60)
      const second = sec % 60
      return `${day}天 ${hour}小时 ${minute}分 ${second}秒`
    },
    formatLoad(load) {
      if (!Array.isArray(load) || load.length === 0) return '-'
      return load.slice(0, 3).map((item) => Number(item || 0).toFixed(2)).join(' / ')
    },
    formatClock(ts) {
      if (!ts) return '--:--:--'
      return new Date(ts).toLocaleTimeString()
    },
    pushHistory(snapshot) {
      this.history.push(snapshot)
      if (this.history.length > HISTORY_LIMIT) {
        this.history.shift()
      }
    },
    async fetchStatus() {
      try {
        const payload = await api.systemMonitor.getStatus()
        const cpuUsage = Number(payload?.cpu?.usagePercent || 0)
        const memoryUsage = Number(payload?.memory?.usagePercent || 0)
        const diskUsage = Number(payload?.disk?.usagePercent || 0)

        this.host = payload?.host || {}
        this.cpu = payload?.cpu || {}
        this.lastUpdatedAt = Number(payload?.timestamp || Date.now())
        this.metrics = {
          cpuUsagePercent: cpuUsage,
          cpuCores: Number(payload?.cpu?.cores || 0),
          loadAverage: payload?.cpu?.loadAverage || [],
          memoryUsagePercent: memoryUsage,
          memoryTotalBytes: Number(payload?.memory?.totalBytes || 0),
          memoryUsedBytes: Number(payload?.memory?.usedBytes || 0),
          diskUsagePercent: diskUsage,
          diskTotalBytes: Number(payload?.disk?.totalBytes || 0),
          diskUsedBytes: Number(payload?.disk?.usedBytes || 0)
        }
        this.pushHistory({
          cpu: cpuUsage,
          memory: memoryUsage,
          disk: diskUsage
        })
        this.errorMessage = ''
      } catch (error) {
        this.errorMessage = `拉取监控数据失败：${error?.message || '未知错误'}`
      }
    }
  }
}
</script>

<style scoped>
.monitor-page {
  color: var(--app-text);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.hero {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 12px;
  border-radius: 18px;
  border: 1px solid var(--app-border);
  background:
    radial-gradient(circle at right top, color-mix(in srgb, var(--app-primary) 40%, transparent), transparent 45%),
    var(--app-card);
  padding: 18px 20px;
}

.hero h1 {
  margin: 0;
  font-size: 1.45rem;
}

.hero p {
  margin: 6px 0 0;
  color: var(--app-text-secondary);
}

.hero-meta {
  display: grid;
  gap: 6px;
  font-size: 0.9rem;
  color: var(--app-text-muted);
  text-align: right;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(180px, 1fr));
  gap: 12px;
}

.metric-card {
  background: var(--app-card);
  border: 1px solid var(--app-border);
  border-radius: 16px;
  padding: 14px;
}

.metric-card header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.metric-card h2 {
  margin: 0;
  font-size: 1.05rem;
}

.metric-card .value {
  font-size: 1.2rem;
  font-weight: 700;
}

.meter {
  height: 12px;
  border-radius: 999px;
  overflow: hidden;
  background: var(--app-card-elevated);
  border: 1px solid var(--app-border);
}

.meter-fill {
  height: 100%;
  border-radius: inherit;
  transition: width 0.45s ease;
}

.metric-card.cpu .meter-fill {
  background: linear-gradient(90deg, #3b82f6, #1d4ed8);
}

.metric-card.memory .meter-fill {
  background: linear-gradient(90deg, #10b981, #047857);
}

.metric-card.disk .meter-fill {
  background: linear-gradient(90deg, #f97316, #c2410c);
}

.metric-card p {
  margin: 10px 0 0;
  color: var(--app-text-secondary);
  font-size: 0.9rem;
}

.panel-grid {
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  gap: 12px;
}

.panel {
  background: var(--app-card);
  border: 1px solid var(--app-border);
  border-radius: 16px;
  padding: 14px;
}

.panel h3 {
  margin: 0 0 10px;
  font-size: 1rem;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.info-item {
  background: var(--app-card-elevated);
  border: 1px solid var(--app-border);
  border-radius: 12px;
  padding: 10px;
}

.info-item label {
  display: block;
  color: var(--app-text-muted);
  font-size: 0.82rem;
  margin-bottom: 5px;
}

.info-item span {
  font-size: 0.9rem;
  color: var(--app-text);
  word-break: break-word;
}

.spark-list {
  display: grid;
  gap: 10px;
}

.spark-row {
  display: grid;
  grid-template-columns: 44px 1fr;
  align-items: end;
  gap: 8px;
}

.spark-row label {
  color: var(--app-text-muted);
  font-size: 0.82rem;
}

.spark-bars {
  height: 82px;
  display: grid;
  grid-template-columns: repeat(20, minmax(6px, 1fr));
  align-items: end;
  gap: 4px;
  border-bottom: 1px dashed var(--app-border);
  padding-bottom: 4px;
}

.spark-bar {
  border-radius: 5px 5px 0 0;
}

.spark-bar.cpu {
  background: #2563eb;
}

.spark-bar.memory {
  background: #059669;
}

.spark-bar.disk {
  background: #ea580c;
}

.error {
  margin: 0;
  color: #b91c1c;
  font-size: 0.9rem;
}

@media (max-width: 980px) {
  .metrics-grid {
    grid-template-columns: 1fr;
  }

  .panel-grid {
    grid-template-columns: 1fr;
  }

  .hero {
    align-items: flex-start;
    flex-direction: column;
  }

  .hero-meta {
    text-align: left;
  }
}
</style>
