<template>
  <div class="chart-card">
    <div class="chart-header">
      <span class="chart-title">{{ title }}</span>
    </div>
    <div class="chart-body">
      <div class="pie-wrap">
        <svg :width="pieSize" :height="pieSize" class="pie-svg">
          <defs>
            <filter id="pie-glow">
              <feGaussianBlur stdDeviation="3" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          <!-- 扇区 -->
          <path v-for="(slice, i) in slices" :key="i"
            :d="slice.d"
            :fill="colors[i % colors.length]"
            :opacity="hovered === i ? 1 : 0.85"
            :style="{ filter: hovered === i ? `drop-shadow(0 0 8px ${colors[i % colors.length]})` : 'none',
                      transform: hovered === i ? `translate(${slice.tx}px, ${slice.ty}px)` : '',
                      transition: 'all 0.2s' }"
            @mouseenter="hovered = i"
            @mouseleave="hovered = null"
          />
          <!-- 中心镂空 -->
          <circle :cx="cx" :cy="cy" :r="innerR" fill="var(--card)" />
          <!-- 中心文字 -->
          <text :x="cx" :y="cy - 8" fill="#6b8aaa" font-size="11" text-anchor="middle">
            {{ hovered !== null ? items[hovered]?.name : '总计' }}
          </text>
          <text :x="cx" :y="cy + 10" :fill="hovered !== null ? colors[hovered % colors.length] : '#d4e6ff'"
            font-size="16" font-weight="700" text-anchor="middle">
            {{ hovered !== null ? pct(items[hovered]?.value) + '%' : total.toLocaleString() }}
          </text>
        </svg>

        <!-- 图例 -->
        <div class="legend">
          <div v-for="(item, i) in items" :key="item.name"
            class="legend-row"
            :class="{ active: hovered === i }"
            @mouseenter="hovered = i" @mouseleave="hovered = null">
            <span class="dot" :style="{ background: colors[i % colors.length] }"></span>
            <span class="name">{{ item.name }}</span>
            <span class="val" :style="{ color: colors[i % colors.length] }">{{ pct(item.value) }}%</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PieChart',
  props: {
    title: { type: String, default: '分布' },
    items: { type: Array,  default: () => [] },
    // items: [{ name, value }]
  },
  data() {
    return {
      hovered: null,
      pieSize: 160,
      colors: ['#00d4ff','#00e676','#ff9800','#bd7dff','#ff6ec7','#ffe600','#ff4444'],
    }
  },
  computed: {
    total()  { return this.items.reduce((s, i) => s + i.value, 0) || 1 },
    cx()     { return this.pieSize / 2 },
    cy()     { return this.pieSize / 2 },
    outerR() { return this.pieSize / 2 - 6 },
    innerR() { return this.outerR * 0.55 },
    slices() {
      let start = -Math.PI / 2
      return this.items.map((item, idx) => {
        const angle = (item.value / this.total) * Math.PI * 2
        const end   = start + angle
        const mid   = start + angle / 2
        const lx = Math.cos(mid)
        const ly = Math.sin(mid)
        const d = this.arc(this.cx, this.cy, this.outerR, this.innerR, start, end)
        start = end
        return { d, tx: lx * 5, ty: ly * 5 }
      })
    },
  },
  methods: {
    arc(cx, cy, R, r, startA, endA) {
      const x1 = cx + R * Math.cos(startA)
      const y1 = cy + R * Math.sin(startA)
      const x2 = cx + R * Math.cos(endA)
      const y2 = cy + R * Math.sin(endA)
      const x3 = cx + r * Math.cos(endA)
      const y3 = cy + r * Math.sin(endA)
      const x4 = cx + r * Math.cos(startA)
      const y4 = cy + r * Math.sin(startA)
      const large = endA - startA > Math.PI ? 1 : 0
      return `M${x1},${y1} A${R},${R} 0 ${large} 1 ${x2},${y2}
              L${x3},${y3} A${r},${r} 0 ${large} 0 ${x4},${y4} Z`
    },
    pct(v) { return ((v / this.total) * 100).toFixed(1) },
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
  padding: 10px 14px 8px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.chart-title { font-size: 12px; font-weight: 600; color: var(--text); }
.chart-body  { flex: 1; display: flex; align-items: center; justify-content: center; padding: 8px; }
.pie-wrap    { display: flex; align-items: center; gap: 16px; }
.pie-svg     { flex-shrink: 0; }

.legend      { display: flex; flex-direction: column; gap: 6px; }
.legend-row  { display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 3px 6px; border-radius: 4px; transition: background 0.15s; }
.legend-row.active { background: #1a2d4a; }
.dot         { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.name        { font-size: 12px; color: var(--text2); flex: 1; white-space: nowrap; }
.val         { font-size: 12px; font-weight: 700; }
</style>
