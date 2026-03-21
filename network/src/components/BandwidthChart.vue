<template>
  <div class="bw-wrap" ref="wrapRef">
    <!-- 控制栏 -->
    <div class="bw-header">
      <span class="bw-title">📊 进程连接活跃度趋势</span>
      <div class="bw-controls">
        <div class="top-sel">
          Top
          <select v-model.number="topN">
            <option :value="5">5</option>
            <option :value="10">10</option>
            <option :value="20">20</option>
          </select>
          进程
        </div>
        <div class="peak-info" v-if="peakVal">
          峰值 <span class="peak-val">{{ peakVal }} 连接</span>
        </div>
        <div class="no-data" v-if="!hasData">等待数据…</div>
      </div>
    </div>

    <!-- 图表 SVG -->
    <svg ref="svgRef" class="bw-svg"></svg>

    <!-- 图例 -->
    <div class="bw-legend" v-if="legendItems.length">
      <div v-for="(item, i) in legendItems" :key="item.proc" class="leg-item">
        <span class="leg-line" :style="{ background: COLORS[i % COLORS.length] }"></span>
        <span class="leg-proc">{{ item.proc }}</span>
        <span class="leg-val">{{ item.current }} 连接</span>
      </div>
    </div>

    <!-- Tooltip -->
    <div v-if="tip.visible" class="bw-tip" :style="{ left: tip.x + 'px', top: tip.y + 'px' }">
      <div class="tip-time">{{ tip.time }}</div>
      <div v-for="row in tip.rows" :key="row.proc" class="tip-row">
        <span class="tip-dot" :style="{ background: row.color }"></span>
        <span class="tip-name">{{ row.proc }}</span>
        <span class="tip-val">{{ row.val }}</span>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent, ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import * as d3 from 'd3'

const COLORS = [
  '#58a6ff', '#3fb950', '#f78166', '#d2a8ff', '#ffa657',
  '#79c0ff', '#56d364', '#ff7b72', '#bc8cff', '#ffd049',
  '#1f6feb', '#238636', '#da3633', '#8957e5', '#d29922',
  '#0969da', '#1a7f37', '#cf222e', '#6639ba', '#b08800',
]

const M = { top: 24, right: 20, bottom: 28, left: 52 }

export default defineComponent({
  name: 'BandwidthChart',
  props: {
    bwHistory: { type: Object, default: () => ({}) }
  },
  setup(props) {
    const svgRef  = ref(null)
    const wrapRef = ref(null)
    const topN    = ref(10)
    const tip     = ref({ visible: false, x: 0, y: 0, time: '', rows: [] })

    const hasData = computed(() => Object.keys(props.bwHistory).length > 0)

    const topProcs = computed(() =>
      Object.entries(props.bwHistory)
        .map(([proc, pts]) => ({ proc, max: Math.max(0, ...pts.map(p => p.conns)) }))
        .sort((a, b) => b.max - a.max)
        .slice(0, topN.value)
        .map(x => x.proc)
    )

    const legendItems = computed(() =>
      topProcs.value.map((proc, i) => {
        const pts = props.bwHistory[proc] || []
        const last = pts[pts.length - 1]
        return { proc, current: last?.conns ?? 0, color: COLORS[i % COLORS.length] }
      })
    )

    const peakVal = computed(() => {
      let max = 0
      for (const proc of topProcs.value)
        for (const p of (props.bwHistory[proc] || []))
          if (p.conns > max) max = p.conns
      return max > 0 ? max : 0
    })

    function draw() {
      if (!svgRef.value) return
      const W = svgRef.value.clientWidth
      const H = svgRef.value.clientHeight
      if (W < 10 || H < 10) return

      const iW = W - M.left - M.right
      const iH = H - M.top  - M.bottom
      const now = Date.now()
      const xDomain = [now - 60_000 * 2, now]   // 2 分钟窗口

      let maxY = 0
      for (const proc of topProcs.value)
        for (const p of (props.bwHistory[proc] || []))
          if (p.conns > maxY) maxY = p.conns

      const xScale = d3.scaleTime().domain(xDomain).range([0, iW])
      const yScale = d3.scaleLinear().domain([0, Math.max(maxY * 1.15, 5)]).range([iH, 0]).nice()

      const svg = d3.select(svgRef.value)
      svg.selectAll('*').remove()
      svg.attr('width', W).attr('height', H)
      const g = svg.append('g').attr('transform', `translate(${M.left},${M.top})`)

      // 背景网格
      g.append('g')
        .call(d3.axisLeft(yScale).tickSize(-iW).tickFormat('').ticks(5))
        .call(ax => ax.select('.domain').remove())
        .call(ax => ax.selectAll('line').attr('stroke', '#ffffff08'))

      // X 轴
      g.append('g').attr('transform', `translate(0,${iH})`)
        .call(d3.axisBottom(xScale).ticks(6).tickFormat(d3.timeFormat('%H:%M:%S')))
        .call(ax => ax.select('.domain').attr('stroke', '#30363d'))
        .call(ax => ax.selectAll('text').attr('fill', '#8b949e').attr('font-size', '10px'))
        .call(ax => ax.selectAll('line').attr('stroke', '#30363d'))

      // Y 轴
      g.append('g')
        .call(d3.axisLeft(yScale).ticks(5).tickFormat(d => Math.round(d)))
        .call(ax => ax.select('.domain').attr('stroke', '#30363d'))
        .call(ax => ax.selectAll('text').attr('fill', '#8b949e').attr('font-size', '10px'))
        .call(ax => ax.selectAll('line').attr('stroke', '#30363d'))

      // Y 轴标签
      g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -iH / 2).attr('y', -44)
        .attr('text-anchor', 'middle')
        .attr('fill', '#8b949e').attr('font-size', '10px')
        .text('连接数')

      // 各进程折线 + 面积
      topProcs.value.forEach((proc, i) => {
        const color = COLORS[i % COLORS.length]
        const pts   = (props.bwHistory[proc] || []).filter(p => p.t >= xDomain[0])
        if (pts.length < 2) return

        const area = d3.area()
          .x(p => xScale(p.t))
          .y0(iH).y1(p => yScale(p.conns))
          .curve(d3.curveCatmullRom.alpha(0.5))

        const line = d3.line()
          .x(p => xScale(p.t))
          .y(p => yScale(p.conns))
          .curve(d3.curveCatmullRom.alpha(0.5))

        g.append('path').datum(pts)
          .attr('fill', color).attr('fill-opacity', 0.06).attr('d', area)

        g.append('path').datum(pts)
          .attr('fill', 'none')
          .attr('stroke', color).attr('stroke-width', 1.5).attr('stroke-opacity', 0.9)
          .attr('d', line)

        // 最新值标注
        const last = pts[pts.length - 1]
        if (last && last.conns > 0) {
          g.append('circle')
            .attr('cx', xScale(last.t)).attr('cy', yScale(last.conns))
            .attr('r', 3).attr('fill', color)
        }
      })

      // 十字准星 + tooltip
      const crossV = g.append('line')
        .attr('stroke', '#8b949e55').attr('stroke-width', 1)
        .attr('stroke-dasharray', '4,3')
        .attr('y1', 0).attr('y2', iH).attr('opacity', 0)

      g.append('rect')
        .attr('width', iW).attr('height', iH)
        .attr('fill', 'transparent').attr('cursor', 'crosshair')
        .on('mousemove', (e) => {
          const [mx] = d3.pointer(e)
          const t = xScale.invert(mx).getTime()
          crossV.attr('x1', mx).attr('x2', mx).attr('opacity', 1)

          const rows = topProcs.value.map((proc, i) => {
            const pts = props.bwHistory[proc] || []
            if (!pts.length) return null
            const closest = pts.reduce((b, p) => Math.abs(p.t - t) < Math.abs(b.t - t) ? p : b, pts[0])
            return { proc, val: `${closest.conns} 连接`, color: COLORS[i % COLORS.length] }
          }).filter(Boolean)

          const rect = svgRef.value.getBoundingClientRect()
          tip.value = {
            visible: true,
            x: e.clientX - rect.left + 14,
            y: e.clientY - rect.top  + 14,
            time: d3.timeFormat('%H:%M:%S')(new Date(t)),
            rows
          }
        })
        .on('mouseleave', () => { crossV.attr('opacity', 0); tip.value.visible = false })
    }

    let ro = null
    onMounted(() => { nextTick(draw); ro = new ResizeObserver(draw); if (wrapRef.value) ro.observe(wrapRef.value) })
    onUnmounted(() => ro?.disconnect())
    watch(() => [props.bwHistory, topN.value], () => nextTick(draw), { deep: true })

    return { svgRef, wrapRef, topN, tip, legendItems, peakVal, hasData, COLORS }
  }
})
</script>

<style scoped>
.bw-wrap {
  position: absolute; inset: 0;
  display: flex; flex-direction: column;
  background: var(--bg); overflow: hidden;
}
.bw-header {
  display: flex; align-items: center; gap: 14px;
  padding: 8px 16px; border-bottom: 1px solid var(--border);
  flex-shrink: 0; flex-wrap: wrap;
}
.bw-title { font-size: 13px; font-weight: 600; color: var(--text); white-space: nowrap; }
.bw-controls { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.top-sel { font-size: 11px; color: var(--text2); display: flex; align-items: center; gap: 4px; }
.top-sel select {
  background: var(--card); color: var(--text);
  border: 1px solid var(--border); border-radius: 4px;
  padding: 2px 6px; font-size: 11px; font-family: inherit;
}
.peak-info { font-size: 11px; color: var(--text2); }
.peak-val  { color: var(--cyan); font-weight: 600; }
.no-data   { font-size: 11px; color: var(--text2); font-style: italic; }
.bw-svg    { flex: 1; display: block; min-height: 0; width: 100%; }
.bw-legend {
  display: flex; flex-wrap: wrap; gap: 6px 16px;
  padding: 6px 16px; border-top: 1px solid var(--border);
  flex-shrink: 0; max-height: 72px; overflow: auto;
}
.leg-item { display: flex; align-items: center; gap: 5px; }
.leg-line  { width: 16px; height: 3px; border-radius: 2px; flex-shrink: 0; }
.leg-proc  { font-size: 11px; color: var(--text); max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.leg-val   { font-size: 11px; color: var(--cyan); min-width: 48px; text-align: right; }
.bw-tip {
  position: absolute; z-index: 200; pointer-events: none;
  background: #161b22ee; border: 1px solid var(--border);
  border-radius: 8px; padding: 8px 12px; font-size: 11px; min-width: 160px;
  box-shadow: 0 4px 16px #00000066; backdrop-filter: blur(6px);
}
.tip-time { color: var(--text2); margin-bottom: 4px; font-size: 10px; }
.tip-row  { display: flex; align-items: center; gap: 6px; padding: 2px 0; }
.tip-dot  { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.tip-name { flex: 1; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100px; }
.tip-val  { color: var(--cyan); font-weight: 600; white-space: nowrap; }
</style>
