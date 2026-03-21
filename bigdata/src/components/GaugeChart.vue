<template>
  <div class="gauge-grid">
    <div v-for="g in gauges" :key="g.key" class="gauge-item">
      <svg width="110" height="70" viewBox="0 0 110 70">
        <defs>
          <linearGradient :id="'gg'+g.key" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   :stop-color="g.color[0]" />
            <stop offset="100%" :stop-color="g.color[1]" />
          </linearGradient>
        </defs>
        <!-- 背景弧 -->
        <path :d="arcPath(0, 180, 44)" fill="none" stroke="#1a2d4a" stroke-width="10" stroke-linecap="round" />
        <!-- 数据弧 -->
        <path :d="arcPath(0, g.val / 100 * 180, 44)"
          fill="none" :stroke="`url(#gg${g.key})`" stroke-width="10" stroke-linecap="round"
          :style="{ filter: `drop-shadow(0 0 6px ${g.color[1]})`, transition: 'all 0.6s ease' }" />
        <!-- 刻度点 -->
        <circle v-for="t in [0, 25, 50, 75, 100]" :key="t"
          :cx="55 + 44 * Math.cos((t/100 * 180 - 180) * Math.PI / 180)"
          :cy="62 + 44 * Math.sin((t/100 * 180 - 180) * Math.PI / 180)"
          r="2" :fill="t <= g.val ? g.color[1] : '#243d5c'" />
        <!-- 数值 -->
        <text x="55" y="54" fill="#d4e6ff" font-size="18" font-weight="700" text-anchor="middle">
          {{ g.val }}<tspan font-size="11" fill="#6b8aaa">%</tspan>
        </text>
      </svg>
      <div class="gauge-label" :style="{ color: g.color[1] }">{{ g.label }}</div>
      <div class="gauge-status" :class="statusClass(g.val)">{{ statusText(g.val) }}</div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'GaugeChart',
  props: {
    system: { type: Object, default: () => ({}) },
  },
  computed: {
    gauges() {
      return [
        { key: 'cpu',     label: 'CPU 使用率',  val: this.system.cpu     ?? 0, color: ['#00d4ff', '#00a0cc'] },
        { key: 'memory',  label: '内存使用率',  val: this.system.memory  ?? 0, color: ['#00e676', '#00a854'] },
        { key: 'disk',    label: '磁盘 I/O',    val: this.system.disk    ?? 0, color: ['#bd7dff', '#7b3fd0'] },
        { key: 'network', label: '网络带宽',    val: this.system.network ?? 0, color: ['#ff9800', '#c76a00'] },
      ]
    },
  },
  methods: {
    arcPath(startDeg, endDeg, r) {
      const cx = 55, cy = 62
      const toRad = d => (d - 180) * Math.PI / 180
      const x1 = cx + r * Math.cos(toRad(startDeg))
      const y1 = cy + r * Math.sin(toRad(startDeg))
      const x2 = cx + r * Math.cos(toRad(Math.max(startDeg, endDeg - 0.01)))
      const y2 = cy + r * Math.sin(toRad(Math.max(startDeg, endDeg - 0.01)))
      const large = endDeg - startDeg > 180 ? 1 : 0
      return `M${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2}`
    },
    statusClass(v) {
      if (v >= 90) return 'danger'
      if (v >= 70) return 'warning'
      return 'normal'
    },
    statusText(v) {
      if (v >= 90) return '告警'
      if (v >= 70) return '偏高'
      return '正常'
    },
  }
}
</script>

<style scoped>
.gauge-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  padding: 8px;
  height: 100%;
  box-sizing: border-box;
}
.gauge-item {
  background: var(--card2);
  border: 1px solid var(--border);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 4px 4px;
  transition: border-color 0.3s;
}
.gauge-item:hover { border-color: var(--border2); }
svg { display: block; }
.gauge-label {
  font-size: 11px;
  margin-top: 2px;
  font-weight: 600;
}
.gauge-status {
  font-size: 10px;
  padding: 1px 8px;
  border-radius: 8px;
  margin-top: 2px;
}
.gauge-status.normal  { background: #002a1a; color: #00e676; }
.gauge-status.warning { background: #2a1a00; color: #ff9800; }
.gauge-status.danger  { background: #2a0000; color: #ff4444; }
</style>
