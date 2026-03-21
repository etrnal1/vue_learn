<template>
  <div class="hm-wrap" ref="wrapRef">
    <div class="hm-header">
      <span class="hm-title">🔥 连接活跃度热力图</span>
      <div class="hm-controls">
        <div class="hm-info">{{ topProcs.length }} 个进程 · 最近 {{ windowLabel }}</div>
        <div class="top-sel">
          Top <select v-model.number="topN">
            <option :value="10">10</option>
            <option :value="20">20</option>
            <option :value="30">30</option>
          </select>
        </div>
      </div>
    </div>
    <div class="hm-body">
      <svg ref="svgRef" class="hm-svg"></svg>
    </div>
    <!-- Tooltip -->
    <div v-if="tip.visible" class="hm-tip" :style="{ left: tip.x + 'px', top: tip.y + 'px' }">
      <div class="tip-proc">{{ tip.proc }}</div>
      <div class="tip-time">{{ tip.time }}</div>
      <div class="tip-val">{{ tip.conns }} 个连接</div>
    </div>
  </div>
</template>

<script>
import { defineComponent, ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import * as d3 from 'd3'

export default defineComponent({
  name: 'HeatMap',
  props: {
    bwHistory: { type: Object, default: () => ({}) }
  },
  setup(props) {
    const svgRef  = ref(null)
    const wrapRef = ref(null)
    const topN    = ref(20)
    const tip     = ref({ visible: false, x: 0, y: 0, proc: '', time: '', conns: 0 })

    // 取所有时间点（对齐到统一时间轴）
    const allTimes = computed(() => {
      const set = new Set()
      for (const pts of Object.values(props.bwHistory))
        for (const p of pts) set.add(p.t)
      return [...set].sort((a, b) => a - b)
    })

    // 按最大连接数排序，取 topN
    const topProcs = computed(() =>
      Object.entries(props.bwHistory)
        .map(([proc, pts]) => ({ proc, max: Math.max(0, ...pts.map(p => p.conns)) }))
        .sort((a, b) => b.max - a.max)
        .slice(0, topN.value)
        .map(x => x.proc)
    )

    const windowLabel = computed(() => {
      const ts = allTimes.value
      if (ts.length < 2) return '–'
      const ms = ts[ts.length - 1] - ts[0]
      if (ms < 60_000) return `${Math.round(ms / 1000)}s`
      return `${(ms / 60_000).toFixed(1)} 分钟`
    })

    // 构建 matrix: proc × time → conns
    function buildMatrix() {
      const procs = topProcs.value
      const times = allTimes.value
      if (!procs.length || !times.length) return { procs, times, matrix: [] }

      const matrix = procs.map(proc => {
        const pts = props.bwHistory[proc] || []
        const map = new Map(pts.map(p => [p.t, p.conns]))
        return times.map(t => map.get(t) ?? 0)
      })
      return { procs, times, matrix }
    }

    const CELL_H   = 22
    const LABEL_W  = 130
    const TIME_H   = 28
    const PAD      = { top: 8, right: 12 }

    function draw() {
      if (!svgRef.value) return
      const { procs, times, matrix } = buildMatrix()
      if (!procs.length || !times.length) return

      const W     = svgRef.value.clientWidth
      const rows  = procs.length
      const cols  = times.length
      const cellW = Math.max(4, (W - LABEL_W - PAD.right) / cols)
      const H     = rows * CELL_H + TIME_H + PAD.top

      const maxVal = d3.max(matrix.flat()) || 1
      const color  = d3.scaleSequential()
        .domain([0, maxVal])
        .interpolator(t => {
          if (t === 0) return '#161b22'
          return d3.interpolateRgb('#1a3a6a', '#58a6ff')(Math.pow(t, 0.5))
        })

      const xScale = d3.scaleLinear().domain([0, cols]).range([LABEL_W, LABEL_W + cols * cellW])
      const yScale = d3.scaleLinear().domain([0, rows]).range([PAD.top, PAD.top + rows * CELL_H])

      const svg = d3.select(svgRef.value)
      svg.selectAll('*').remove()
      svg.attr('width', W).attr('height', H)

      const g = svg.append('g')

      // 绘制格子
      procs.forEach((proc, ri) => {
        times.forEach((t, ci) => {
          const val = matrix[ri][ci]
          g.append('rect')
            .attr('x', xScale(ci) + 1)
            .attr('y', yScale(ri) + 1)
            .attr('width', Math.max(1, cellW - 1))
            .attr('height', CELL_H - 2)
            .attr('fill', color(val))
            .attr('stroke', '#0d1117').attr('stroke-width', 0.5)
            .attr('rx', 2)
            .on('mousemove', (e) => {
              const rect = svgRef.value.getBoundingClientRect()
              tip.value = {
                visible: true,
                x: e.clientX - rect.left + 12,
                y: e.clientY - rect.top  + 12,
                proc,
                time: d3.timeFormat('%H:%M:%S')(new Date(t)),
                conns: val
              }
            })
            .on('mouseleave', () => { tip.value.visible = false })
        })
      })

      // 进程标签（左侧）
      procs.forEach((proc, ri) => {
        g.append('text')
          .attr('x', LABEL_W - 6)
          .attr('y', yScale(ri) + CELL_H / 2 + 1)
          .attr('text-anchor', 'end')
          .attr('dominant-baseline', 'middle')
          .attr('fill', '#c9d1d9')
          .attr('font-size', '11px')
          .attr('font-family', 'monospace')
          .text(proc.length > 14 ? proc.slice(0, 13) + '…' : proc)
      })

      // 时间轴（底部，每10个格子一个刻度）
      const step = Math.max(1, Math.floor(cols / 8))
      for (let ci = 0; ci < cols; ci += step) {
        g.append('text')
          .attr('x', xScale(ci) + cellW / 2)
          .attr('y', yScale(rows) + 14)
          .attr('text-anchor', 'middle')
          .attr('fill', '#8b949e')
          .attr('font-size', '9px')
          .text(d3.timeFormat('%H:%M:%S')(new Date(times[ci])))
      }

      // 颜色图例（右上）
      const lgW = 80, lgH = 10
      const lgX = W - lgW - PAD.right
      const lgY = PAD.top + 2
      const lgGrad = svg.append('defs').append('linearGradient').attr('id', 'hm-grad')
      lgGrad.append('stop').attr('offset', '0%').attr('stop-color', '#0d3a6a')
      lgGrad.append('stop').attr('offset', '100%').attr('stop-color', '#58a6ff')
      svg.append('rect')
        .attr('x', lgX).attr('y', lgY)
        .attr('width', lgW).attr('height', lgH)
        .attr('fill', 'url(#hm-grad)').attr('rx', 3)
      svg.append('text').attr('x', lgX).attr('y', lgY - 2)
        .attr('fill', '#8b949e').attr('font-size', '9px').text('0')
      svg.append('text').attr('x', lgX + lgW).attr('y', lgY - 2)
        .attr('fill', '#8b949e').attr('font-size', '9px').attr('text-anchor', 'end')
        .text(`${maxVal} 连接`)
    }

    let ro = null
    onMounted(() => {
      nextTick(() => { draw(); setTimeout(draw, 300) })
      ro = new ResizeObserver(() => nextTick(draw))
      if (wrapRef.value) ro.observe(wrapRef.value)
    })
    onUnmounted(() => ro?.disconnect())
    watch(() => [props.bwHistory, topN.value], () => nextTick(draw), { deep: true })

    return { svgRef, wrapRef, topN, tip, topProcs, windowLabel }
  }
})
</script>

<style scoped>
.hm-wrap {
  position: absolute; inset: 0;
  display: flex; flex-direction: column;
  background: var(--bg); overflow: hidden;
}
.hm-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 16px; border-bottom: 1px solid var(--border); flex-shrink: 0;
}
.hm-title   { font-size: 13px; font-weight: 600; color: var(--text); }
.hm-controls{ display: flex; align-items: center; gap: 14px; }
.hm-info    { font-size: 11px; color: var(--text2); }
.top-sel    { font-size: 11px; color: var(--text2); display: flex; align-items: center; gap: 4px; }
.top-sel select {
  background: var(--card); color: var(--text);
  border: 1px solid var(--border); border-radius: 4px;
  padding: 2px 6px; font-size: 11px; font-family: inherit;
}
.hm-body  { flex: 1; overflow: auto; }
.hm-svg   { display: block; width: 100%; }
.hm-tip {
  position: absolute; z-index: 200; pointer-events: none;
  background: #161b22ee; border: 1px solid var(--border);
  border-radius: 8px; padding: 8px 12px; font-size: 11px;
  box-shadow: 0 4px 16px #00000066; backdrop-filter: blur(6px);
}
.tip-proc { font-weight: 600; color: var(--text); margin-bottom: 2px; }
.tip-time { color: var(--text2); font-size: 10px; }
.tip-val  { color: var(--cyan); font-weight: 600; margin-top: 4px; }
</style>
