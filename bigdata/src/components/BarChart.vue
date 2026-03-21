<template>
  <div class="chart-card">
    <div class="chart-header">
      <span class="chart-title">{{ title }}</span>
      <span class="chart-sub">共 {{ total.toLocaleString() }} 次访问</span>
    </div>
    <div class="chart-body" ref="wrap">
      <svg :width="W" :height="H" v-if="W > 0 && items.length">
        <!-- 网格竖线 -->
        <line v-for="t in xTicks" :key="t"
          :x1="scaleX(t)" :y1="PAD_T" :x2="scaleX(t)" :y2="H - PAD_B"
          stroke="#1a2d4a" stroke-width="1" />
        <text v-for="t in xTicks" :key="'tx'+t"
          :x="scaleX(t)" :y="H - 4"
          fill="#3d5a7a" font-size="10" text-anchor="middle">
          {{ formatAxis(t) }}
        </text>

        <!-- 柱子 -->
        <g v-for="(item, i) in items" :key="item.name">
          <!-- 背景轨道 -->
          <rect :x="PAD_L" :y="barY(i)" :width="W - PAD_L - PAD_R" :height="barH - 2"
            fill="#0a1120" rx="3" />
          <!-- 数据柱 -->
          <rect :x="PAD_L" :y="barY(i)" :width="Math.max(0, scaleX(item.value) - PAD_L)" :height="barH - 2"
            :fill="colors[i % colors.length]"
            :style="{ filter: `drop-shadow(0 0 6px ${colors[i % colors.length]}66)` }"
            rx="3" />
          <!-- 标签 -->
          <text :x="PAD_L - 8" :y="barY(i) + (barH - 2)/2 + 4"
            fill="#6b8aaa" font-size="11" text-anchor="end">
            {{ item.name }}
          </text>
          <!-- 数值 -->
          <text :x="Math.max(PAD_L + 4, scaleX(item.value) + 4)" :y="barY(i) + (barH - 2)/2 + 4"
            :fill="colors[i % colors.length]" font-size="11" text-anchor="start">
            {{ item.value.toLocaleString() }}
          </text>
          <!-- 百分比 -->
          <text :x="W - PAD_R" :y="barY(i) + (barH - 2)/2 + 4"
            fill="#3d5a7a" font-size="10" text-anchor="end">
            {{ pct(item.value) }}%
          </text>
        </g>
      </svg>
    </div>
  </div>
</template>

<script>
export default {
  name: 'BarChart',
  props: {
    title: { type: String, default: '渠道分布' },
    items: { type: Array,  default: () => [] },
    // items: [{ name, value }]
  },
  data() {
    return {
      W: 0, H: 0, ro: null,
      PAD_L: 70, PAD_R: 60, PAD_T: 10, PAD_B: 24,
      colors: ['#00d4ff','#00e676','#ff9800','#bd7dff','#ff6ec7','#ffe600'],
    }
  },
  mounted() {
    this.ro = new ResizeObserver(() => this.measure())
    this.ro.observe(this.$refs.wrap)
    this.measure()
  },
  beforeUnmount() { this.ro?.disconnect() },
  computed: {
    total() { return this.items.reduce((s, i) => s + i.value, 0) },
    maxVal() { return Math.max(...this.items.map(i => i.value), 1) },
    barH() {
      if (!this.items.length) return 20
      return Math.max(16, (this.H - this.PAD_T - this.PAD_B) / this.items.length)
    },
    xTicks() {
      const m = this.maxVal
      const step = Math.ceil(m / 3 / 500) * 500
      return [0, step, step*2, step*3].filter(v => v <= m * 1.05)
    },
  },
  methods: {
    measure() {
      const el = this.$refs.wrap
      if (!el) return
      this.W = el.clientWidth
      this.H = el.clientHeight
    },
    scaleX(v) {
      return this.PAD_L + (v / this.maxVal) * (this.W - this.PAD_L - this.PAD_R)
    },
    barY(i) {
      return this.PAD_T + i * this.barH
    },
    pct(v) { return ((v / this.total) * 100).toFixed(1) },
    formatAxis(v) {
      if (v >= 1000) return (v/1000).toFixed(0)+'k'
      return v
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
  gap: 10px;
  padding: 10px 14px 8px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.chart-title { font-size: 12px; font-weight: 600; color: var(--text); }
.chart-sub { font-size: 11px; color: var(--text2); }
.chart-body { flex: 1; overflow: hidden; }
svg { display: block; }
</style>
