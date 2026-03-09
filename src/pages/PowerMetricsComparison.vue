<template>
  <div class="pm-page">
    <section class="pm-hero">
      <div>
        <h1>powermetrics 对比页</h1>
        <p>当前估算模型与 macOS `powermetrics` 采样做并排比较。现有功耗统计页保持不变。</p>
      </div>
      <div class="pm-actions">
        <span>刷新周期 {{ refreshSeconds }}s</span>
        <button class="pm-btn" type="button" @click="fetchData">立即刷新</button>
      </div>
    </section>

    <section class="pm-grid">
      <article class="pm-card estimate">
        <span class="pm-label">估算功率</span>
        <strong>{{ Number(payload?.estimate?.estimatedWatts || 0).toFixed(2) }} W</strong>
        <small>{{ payload?.estimate?.profileLabel || '-' }}</small>
      </article>
      <article class="pm-card actual">
        <span class="pm-label">powermetrics</span>
        <strong>{{ payload?.powermetrics ? `${Number(payload.powermetrics.totalWatts || 0).toFixed(3)} W` : '不可用' }}</strong>
        <small>{{ payload?.available ? '真实采样' : '需要 sudo/root' }}</small>
      </article>
      <article class="pm-card delta">
        <span class="pm-label">差值</span>
        <strong>{{ payload?.deltaWatts == null ? '--' : `${Number(payload.deltaWatts).toFixed(3)} W` }}</strong>
        <small>powermetrics - 估算值</small>
      </article>
    </section>

    <section class="pm-panels">
      <article class="pm-panel">
        <h2>采样状态</h2>
        <div class="pm-kv">
          <div><span>最近刷新</span><strong>{{ formatDateTime(payload?.timestamp) }}</strong></div>
          <div><span>可用性</span><strong>{{ payload?.available ? '可用' : '不可用' }}</strong></div>
          <div><span>权限要求</span><strong>{{ payload?.permissionRequired ? '需要 sudo/root' : '无' }}</strong></div>
        </div>
        <p v-if="payload?.note" class="pm-note">{{ payload.note }}</p>
        <p v-if="payload?.error?.message" class="pm-error">{{ payload.error.message }}</p>
      </article>

      <article class="pm-panel">
        <h2>powermetrics 指标</h2>
        <div v-if="powermetricsEntries.length === 0" class="pm-empty">当前没有可解析的 powermetrics 指标。</div>
        <div v-else class="pm-list">
          <div v-for="[key, item] in powermetricsEntries" :key="key" class="pm-row">
            <span>{{ getMetricLabel(key) }}</span>
            <strong>{{ Number(item.watts || 0).toFixed(3) }} W</strong>
          </div>
        </div>
      </article>
    </section>

    <section class="pm-panel">
      <div class="pm-raw-head">
        <h2>原始输出</h2>
        <button class="pm-btn ghost" type="button" @click="copyRawOutput">复制输出</button>
      </div>
      <div v-if="rawOutputLines.length === 0" class="pm-empty">暂无输出。若提示需要 sudo，请先为后端配置可执行 powermetrics 的权限。</div>
      <div v-else class="pm-raw-viewer">
        <div v-for="(line, index) in rawOutputLines" :key="`${index}-${line}`" class="pm-raw-line">
          <span class="pm-raw-no">{{ index + 1 }}</span>
          <code
            class="pm-raw-text"
            :class="{
              'is-section': isSectionLine(line),
              'is-power': isPowerLine(line),
              'is-meta': isMetaLine(line)
            }"
          >{{ line || ' ' }}</code>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import { api } from '../utils/api'

export default {
  name: 'PowerMetricsComparison',
  data() {
    return {
      refreshSeconds: 20,
      timerId: null,
      payload: null
    }
  },
  computed: {
    powermetricsEntries() {
      const metrics = this.payload?.powermetrics?.metrics
      return metrics && typeof metrics === 'object'
        ? Object.entries(metrics).sort((a, b) => Number(b[1]?.milliWatts || 0) - Number(a[1]?.milliWatts || 0))
        : []
    },
    rawOutputText() {
      return String(this.payload?.powermetrics?.raw || '')
    },
    rawOutputLines() {
      return this.rawOutputText ? this.rawOutputText.split('\n') : []
    }
  },
  mounted() {
    this.fetchData()
    this.timerId = window.setInterval(this.fetchData, this.refreshSeconds * 1000)
  },
  beforeUnmount() {
    if (this.timerId) {
      window.clearInterval(this.timerId)
      this.timerId = null
    }
  },
  methods: {
    getMetricLabel(key) {
      const map = {
        'Combined Power (CPU + GPU + ANE)': '总功耗',
        'CPU Power': 'CPU 功耗',
        'GPU Power': 'GPU 功耗',
        'ANE Power': 'ANE 功耗'
      }
      return map[String(key || '')] || String(key || '-')
    },
    isSectionLine(line) {
      const text = String(line || '').trim()
      return text.startsWith('***') || text.startsWith('****')
    },
    isPowerLine(line) {
      return /power/i.test(String(line || ''))
    },
    isMetaLine(line) {
      const text = String(line || '')
      return /Machine model|OS version|Boot time|Sampled system activity/i.test(text)
    },
    formatDateTime(ts) {
      if (!ts) return '-'
      return new Date(ts).toLocaleString('zh-CN', { hour12: false })
    },
    async copyRawOutput() {
      if (!this.rawOutputText) return
      try {
        await navigator.clipboard.writeText(this.rawOutputText)
      } catch (_error) {
        // ignore clipboard errors
      }
    },
    async fetchData() {
      try {
        this.payload = await api.systemMonitor.getPowermetrics()
      } catch (error) {
        this.payload = {
          timestamp: Date.now(),
          available: false,
          permissionRequired: false,
          error: { message: error?.message || '加载失败' }
        }
      }
    }
  }
}
</script>

<style scoped>
.pm-page { color: var(--app-text); display: flex; flex-direction: column; gap: 16px; }
.pm-hero, .pm-card, .pm-panel { border: 1px solid var(--app-border); background: var(--app-card); box-shadow: var(--app-soft-shadow); border-radius: 18px; }
.pm-hero { padding: 20px; display: flex; justify-content: space-between; gap: 16px; }
.pm-hero h1, .pm-panel h2 { margin: 0; }
.pm-hero p { margin: 8px 0 0; color: var(--app-text-secondary); }
.pm-actions, .pm-grid, .pm-panels { display: flex; gap: 12px; }
.pm-actions { align-items: center; }
.pm-raw-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.pm-grid, .pm-panels { display: grid; }
.pm-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.pm-panels { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.pm-card, .pm-panel { padding: 18px; }
.pm-card strong { font-size: 1.8rem; }
.pm-label, .pm-note { color: var(--app-text-muted); }
.pm-btn { border: none; border-radius: 999px; background: #2563eb; color: #fff; padding: 10px 16px; cursor: pointer; }
.pm-btn.ghost { background: rgba(37, 99, 235, 0.12); color: #1d4ed8; }
.pm-kv, .pm-list { display: flex; flex-direction: column; gap: 10px; }
.pm-kv div, .pm-row { display: flex; justify-content: space-between; gap: 12px; }
.pm-error { color: #dc2626; }
.pm-empty { color: var(--app-text-muted); }
.pm-raw-viewer { background: #f8fafc; color: #0f172a; border-radius: 14px; max-height: 560px; overflow: auto; border: 1px solid #dbe4f0; }
.pm-raw-line { display: grid; grid-template-columns: 64px 1fr; gap: 12px; padding: 7px 12px; border-bottom: 1px solid #e2e8f0; align-items: start; }
.pm-raw-line:nth-child(odd) { background: #ffffff; }
.pm-raw-line:nth-child(even) { background: #f8fafc; }
.pm-raw-no { color: #94a3b8; text-align: right; user-select: none; font: 12px/1.8 ui-monospace, SFMono-Regular, Menlo, monospace; }
.pm-raw-text { white-space: pre; overflow-x: auto; color: #0f172a; font: 14px/1.9 ui-monospace, SFMono-Regular, Menlo, monospace; display: block; }
.pm-raw-text.is-section { color: #1d4ed8; font-weight: 700; background: #dbeafe; padding: 2px 8px; border-radius: 8px; }
.pm-raw-text.is-power { color: #b45309; font-weight: 700; background: #fef3c7; padding: 1px 6px; border-radius: 6px; }
.pm-raw-text.is-meta { color: #0f766e; font-weight: 600; }
@media (max-width: 960px) {
  .pm-grid, .pm-panels { grid-template-columns: 1fr; }
  .pm-hero { flex-direction: column; }
  .pm-raw-line { grid-template-columns: 48px 1fr; padding: 6px 10px; }
}
</style>
