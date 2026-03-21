<template>
  <div class="kpi-card" :style="{ '--accent': color }">
    <div class="kpi-icon">{{ icon }}</div>
    <div class="kpi-body">
      <div class="kpi-label">{{ label }}</div>
      <div class="kpi-value">
        <span class="kpi-prefix" v-if="prefix">{{ prefix }}</span>
        <span class="kpi-num">{{ formatted }}</span>
        <span class="kpi-suffix" v-if="suffix">{{ suffix }}</span>
      </div>
      <div class="kpi-trend" :class="trendClass">
        <span class="trend-arrow">{{ trend >= 0 ? '▲' : '▼' }}</span>
        {{ Math.abs(trend).toFixed(1) }}%
        <span class="trend-label">较昨日</span>
      </div>
    </div>
    <div class="kpi-sparkline">
      <svg :width="80" :height="28" v-if="spark.length > 1">
        <defs>
          <linearGradient :id="'sg'+uid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" :stop-color="color" stop-opacity="0.4"/>
            <stop offset="100%" :stop-color="color" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <path :d="fillPath" :fill="`url(#sg${uid})`" />
        <polyline :points="linePath" fill="none" :stroke="color" stroke-width="1.5"
          stroke-linejoin="round" stroke-linecap="round" />
      </svg>
    </div>
  </div>
</template>

<script>
let uidSeq = 0
export default {
  name: 'KpiCard',
  props: {
    label:  { type: String, required: true },
    value:  { type: Number, default: 0 },
    trend:  { type: Number, default: 0 },
    color:  { type: String, default: '#00d4ff' },
    icon:   { type: String, default: '📊' },
    prefix: { type: String, default: '' },
    suffix: { type: String, default: '' },
    format: { type: String, default: 'number' }, // number | currency | time
    spark:  { type: Array,  default: () => [] },
  },
  data() { return { uid: ++uidSeq } },
  computed: {
    formatted() {
      const v = this.value
      if (this.format === 'currency') {
        if (v >= 1e8) return (v / 1e8).toFixed(2) + '亿'
        if (v >= 1e4) return (v / 1e4).toFixed(1) + '万'
        return v.toLocaleString()
      }
      if (this.format === 'time') return v + ' ms'
      if (v >= 1e8) return (v / 1e8).toFixed(2) + '亿'
      if (v >= 1e4) return (v / 1e4).toFixed(1) + '万'
      return v.toLocaleString()
    },
    trendClass() {
      return this.trend >= 0 ? 'up' : 'down'
    },
    linePath() {
      const pts = this.spark
      if (pts.length < 2) return ''
      const W = 80, H = 24
      const min = Math.min(...pts)
      const max = Math.max(...pts)
      const range = max - min || 1
      return pts.map((v, i) => {
        const x = (i / (pts.length - 1)) * W
        const y = H - ((v - min) / range) * H + 2
        return `${x},${y}`
      }).join(' ')
    },
    fillPath() {
      const pts = this.spark
      if (pts.length < 2) return ''
      const W = 80, H = 24
      const min = Math.min(...pts)
      const max = Math.max(...pts)
      const range = max - min || 1
      const line = pts.map((v, i) => {
        const x = (i / (pts.length - 1)) * W
        const y = H - ((v - min) / range) * H + 2
        return `${x},${y}`
      }).join(' ')
      return `M0,28 ${line.split(' ').map((p,i) => i===0?`L${p}`:`L${p}`).join(' ')} L80,28 Z`
    },
  }
}
</script>

<style scoped>
.kpi-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-top: 2px solid var(--accent, #00d4ff);
  border-radius: 8px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  position: relative;
  overflow: hidden;
  transition: border-color 0.3s;
}
.kpi-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at top left, color-mix(in srgb, var(--accent, #00d4ff) 8%, transparent), transparent 60%);
  pointer-events: none;
}
.kpi-icon {
  font-size: 28px;
  flex-shrink: 0;
  filter: drop-shadow(0 0 8px var(--accent, #00d4ff));
}
.kpi-body { flex: 1; min-width: 0; }
.kpi-label {
  font-size: 11px;
  color: var(--text2);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 2px;
}
.kpi-value {
  font-size: 22px;
  font-weight: 700;
  color: var(--text);
  line-height: 1.2;
  white-space: nowrap;
}
.kpi-prefix, .kpi-suffix {
  font-size: 13px;
  color: var(--text2);
  font-weight: 400;
}
.kpi-trend {
  font-size: 11px;
  margin-top: 3px;
  display: flex;
  align-items: center;
  gap: 3px;
}
.kpi-trend.up   { color: #00e676; }
.kpi-trend.down { color: #ff4444; }
.trend-arrow { font-size: 9px; }
.trend-label { color: var(--text3); }
.kpi-sparkline { flex-shrink: 0; }
</style>
