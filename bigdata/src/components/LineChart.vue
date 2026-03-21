<template>
  <div class="chart-card">
    <div class="chart-header">
      <span class="chart-title">{{ title }}</span>
      <div class="legend">
        <span v-for="s in series" :key="s.key" class="legend-item">
          <span class="legend-dot" :style="{ background: s.color }"></span>
          {{ s.label }}
        </span>
      </div>
      <div class="current-vals">
        <span v-for="s in series" :key="s.key" class="curr-val" :style="{ color: s.color }">
          {{ formatVal(last(s.key)) }}
        </span>
      </div>
    </div>
    <div class="chart-body" ref="wrap">
      <svg :width="W" :height="H" v-if="W > 0">
        <defs>
          <linearGradient v-for="s in series" :key="'g'+s.key" :id="'lg'+s.key+uid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   :stop-color="s.color" stop-opacity="0.25"/>
            <stop offset="100%" :stop-color="s.color" stop-opacity="0"/>
          </linearGradient>
        </defs>

        <!-- 网格 -->
        <g class="grid">
          <line v-for="y in yTicks" :key="y"
            :x1="PAD_L" :y1="scaleY(y)" :x2="W - PAD_R" :y2="scaleY(y)"
            stroke="#1a2d4a" stroke-width="1" />
          <text v-for="y in yTicks" :key="'t'+y"
            :x="PAD_L - 6" :y="scaleY(y) + 4"
            fill="#3d5a7a" font-size="10" text-anchor="end">
            {{ formatAxis(y) }}
          </text>
        </g>

        <!-- 时间轴标签 -->
        <g>
          <text v-for="(t, i) in xLabels" :key="i"
            :x="scaleX(t.idx)" :y="H - 4"
            fill="#3d5a7a" font-size="10" text-anchor="middle">
            {{ t.label }}
          </text>
        </g>

        <!-- 填充区域 -->
        <path v-for="s in series" :key="'fill'+s.key"
          :d="fillPath(s.key)" :fill="`url(#lg${s.key}${uid})`" />

        <!-- 折线 -->
        <polyline v-for="s in series" :key="'line'+s.key"
          :points="linePath(s.key)"
          fill="none" :stroke="s.color" stroke-width="2"
          stroke-linejoin="round" stroke-linecap="round" />

        <!-- 最新点标记 -->
        <circle v-for="s in series" :key="'dot'+s.key"
          :cx="scaleX(data[s.key].length - 1)"
          :cy="scaleY(data[s.key][data[s.key].length - 1] ?? 0)"
          r="3" :fill="s.color"
          :style="{ filter: `drop-shadow(0 0 4px ${s.color})` }" />
      </svg>
    </div>
  </div>
</template>

<script>
let uidSeq = 0
export default {
  name: 'LineChart',
  props: {
    title:  { type: String, default: '实时趋势' },
    data:   { type: Object, default: () => ({}) },
    series: { type: Array,  default: () => [] },
    // series: [{ key, label, color }]
  },
  data() {
    return { W: 0, H: 0, uid: ++uidSeq, ro: null,
      PAD_L: 44, PAD_R: 12, PAD_T: 16, PAD_B: 24 }
  },
  mounted() {
    this.ro = new ResizeObserver(() => this.measure())
    this.ro.observe(this.$refs.wrap)
    this.measure()
  },
  beforeUnmount() { this.ro?.disconnect() },
  methods: {
    measure() {
      const el = this.$refs.wrap
      if (!el) return
      this.W = el.clientWidth
      this.H = el.clientHeight
    },
    allVals() {
      return this.series.flatMap(s => this.data[s.key] || [])
    },
    minMax() {
      const vals = this.allVals()
      if (!vals.length) return { min: 0, max: 100 }
      const min = Math.min(...vals)
      const max = Math.max(...vals)
      return { min: Math.max(0, min * 0.9), max: max * 1.1 }
    },
    scaleX(i) {
      const len = (this.data[this.series[0]?.key] || []).length
      const range = len > 1 ? len - 1 : 1
      return this.PAD_L + (i / range) * (this.W - this.PAD_L - this.PAD_R)
    },
    scaleY(v) {
      const { min, max } = this.minMax()
      const frac = max === min ? 0.5 : (v - min) / (max - min)
      return this.PAD_T + (1 - frac) * (this.H - this.PAD_T - this.PAD_B)
    },
    linePath(key) {
      const pts = this.data[key] || []
      return pts.map((v, i) => `${this.scaleX(i)},${this.scaleY(v)}`).join(' ')
    },
    fillPath(key) {
      const pts = this.data[key] || []
      if (pts.length < 2) return ''
      const bottom = this.H - this.PAD_B
      const line = pts.map((v, i) => `L${this.scaleX(i)},${this.scaleY(v)}`).join(' ')
      return `M${this.scaleX(0)},${bottom} ${line} L${this.scaleX(pts.length-1)},${bottom} Z`
    },
    yTicks() {
      const { min, max } = this.minMax()
      const step = (max - min) / 4
      return [0,1,2,3,4].map(i => Math.round(min + i * step))
    },
    xLabels() {
      const len = (this.data[this.series[0]?.key] || []).length
      if (len < 2) return []
      const positions = [0, Math.floor(len/4), Math.floor(len/2), Math.floor(3*len/4), len-1]
      return positions.map(idx => ({
        idx,
        label: `-${(len - 1 - idx)}s`
      }))
    },
    last(key) {
      const arr = this.data[key] || []
      return arr[arr.length - 1] ?? 0
    },
    formatVal(v) {
      if (v >= 10000) return (v/1000).toFixed(1)+'k'
      return v.toLocaleString()
    },
    formatAxis(v) {
      if (v >= 10000) return (v/1000).toFixed(0)+'k'
      if (v >= 1000)  return (v/1000).toFixed(1)+'k'
      return v
    },
  },
  computed: {
    yTicks() {
      const { min, max } = this.minMax()
      const step = (max - min) / 4
      return [0,1,2,3,4].map(i => Math.round(min + i * step))
    },
    xLabels() {
      const len = (this.data[this.series[0]?.key] || []).length
      if (len < 2) return []
      const positions = [0, Math.floor(len/4), Math.floor(len/2), Math.floor(3*len/4), len-1]
      return positions.map(idx => ({ idx, label: `-${(len - 1 - idx)}s` }))
    },
  }
}
</script>

<style scoped>
.chart-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
}
.chart-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px 8px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.chart-title { font-size: 12px; font-weight: 600; color: var(--text); }
.legend { display: flex; gap: 12px; flex: 1; }
.legend-item { display: flex; align-items: center; gap: 5px; font-size: 11px; color: var(--text2); }
.legend-dot { width: 8px; height: 3px; border-radius: 2px; flex-shrink: 0; }
.current-vals { display: flex; gap: 10px; }
.curr-val { font-size: 13px; font-weight: 700; }
.chart-body { flex: 1; overflow: hidden; }
svg { display: block; }
</style>
