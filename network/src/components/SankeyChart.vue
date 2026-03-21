<template>
  <div class="sankey-wrap" ref="container">
    <div class="sankey-toolbar">
      <label class="toolbar-item">
        <input type="checkbox" v-model="onlyEstablished" />
        仅 ESTABLISHED
      </label>
      <label class="toolbar-item">
        显示前
        <select v-model.number="topN">
          <option :value="10">10</option>
          <option :value="20">20</option>
          <option :value="30">30</option>
        </select>
        个进程/IP
      </label>
      <span class="toolbar-info">流向: 进程 → 远端 IP</span>
    </div>
    <svg ref="svg" class="sankey-svg" />
    <div v-if="empty" class="empty-tip">暂无连接数据</div>
  </div>
</template>

<script>
import { defineComponent, ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import * as d3 from 'd3'
import { sankey, sankeyLinkHorizontal } from 'd3-sankey'

export default defineComponent({
  name: 'SankeyChart',
  props: {
    connections: { type: Array, default: () => [] }
  },

  setup(props) {
    const container = ref(null)
    const svg = ref(null)
    const onlyEstablished = ref(true)
    const topN = ref(20)
    const empty = ref(false)

    const colorScale = d3.scaleOrdinal(d3.schemeTableau10)
    const processColors = new Map()
    function getColor(name) {
      if (!processColors.has(name)) processColors.set(name, colorScale(processColors.size))
      return processColors.get(name)
    }

    let resizeObserver = null

    const filtered = computed(() => {
      let conns = props.connections
      if (onlyEstablished.value) conns = conns.filter(c => c.state === 'ESTABLISHED')
      return conns
    })

    function draw() {
      if (!svg.value || !container.value) return

      const conns = filtered.value
      const W = container.value.clientWidth || 900
      const H = container.value.clientHeight || 600
      const margin = { top: 40, right: 160, bottom: 40, left: 160 }
      const iW = W - margin.left - margin.right
      const iH = H - margin.top - margin.bottom

      d3.select(svg.value).selectAll('*').remove()

      if (conns.length === 0) { empty.value = true; return }
      empty.value = false

      // 统计 process → remoteAddr 流量
      const flowMap = new Map()
      for (const c of conns) {
        const key = `${c.process}||${c.remoteAddr}`
        flowMap.set(key, (flowMap.get(key) || 0) + 1)
      }

      // 取前 N 个进程和远端 IP
      const procCount = new Map()
      const ipCount = new Map()
      for (const c of conns) {
        procCount.set(c.process, (procCount.get(c.process) || 0) + 1)
        ipCount.set(c.remoteAddr, (ipCount.get(c.remoteAddr) || 0) + 1)
      }
      const topProcs = new Set([...procCount.entries()].sort((a,b)=>b[1]-a[1]).slice(0,topN.value).map(e=>e[0]))
      const topIPs = new Set([...ipCount.entries()].sort((a,b)=>b[1]-a[1]).slice(0,topN.value).map(e=>e[0]))

      // 构建 Sankey 数据
      const nodeMap = new Map()
      const snNodes = []
      const snLinks = []

      const getNode = (id, label, type) => {
        if (!nodeMap.has(id)) {
          nodeMap.set(id, snNodes.length)
          snNodes.push({ id, label, type })
        }
        return nodeMap.get(id)
      }

      for (const [key, count] of flowMap) {
        const [proc, ip] = key.split('||')
        if (!topProcs.has(proc) || !topIPs.has(ip)) continue
        const src = getNode(`p:${proc}`, proc, 'process')
        const tgt = getNode(`i:${ip}`, ip, 'remote')
        snLinks.push({ source: src, target: tgt, value: count })
      }

      if (snLinks.length === 0) { empty.value = true; return }

      // 构建 Sankey 布局
      const sankeyGen = sankey()
        .nodeWidth(16)
        .nodePadding(12)
        .extent([[0, 0], [iW, iH]])

      let graph
      try {
        graph = sankeyGen({ nodes: snNodes.map(n => ({ ...n })), links: snLinks.map(l => ({ ...l })) })
      } catch {
        empty.value = true; return
      }

      const svgEl = d3.select(svg.value)
        .attr('width', W).attr('height', H)

      const g = svgEl.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

      // 渐变定义
      const defs = svgEl.append('defs')

      // 绘制连接（渐变色带）
      const linkG = g.append('g').attr('fill', 'none')

      linkG.selectAll('path')
        .data(graph.links)
        .join('path')
        .attr('d', sankeyLinkHorizontal())
        .attr('stroke', d => {
          const gradId = `grad-${d.index}`
          const grad = defs.append('linearGradient').attr('id', gradId)
            .attr('gradientUnits', 'userSpaceOnUse')
            .attr('x1', d.source.x1).attr('x2', d.target.x0)

          const srcColor = getColor(d.source.label)
          grad.append('stop').attr('offset', '0%').attr('stop-color', srcColor).attr('stop-opacity', 0.7)
          grad.append('stop').attr('offset', '100%').attr('stop-color', '#58a6ff').attr('stop-opacity', 0.3)

          return `url(#${gradId})`
        })
        .attr('stroke-width', d => Math.max(1, d.width))
        .attr('stroke-opacity', 0.5)
        .on('mouseover', function(e, d) {
          d3.select(this).attr('stroke-opacity', 0.9)
          showLinkTip(e, d)
        })
        .on('mouseout', function() {
          d3.select(this).attr('stroke-opacity', 0.5)
          hideTip()
        })

      // 绘制节点矩形
      g.append('g').selectAll('rect')
        .data(graph.nodes)
        .join('rect')
        .attr('x', d => d.x0)
        .attr('y', d => d.y0)
        .attr('width', d => d.x1 - d.x0)
        .attr('height', d => Math.max(4, d.y1 - d.y0))
        .attr('fill', d => d.type === 'process' ? getColor(d.label) : '#58a6ff')
        .attr('opacity', 0.9)
        .attr('rx', 3)

      // 节点标签
      g.append('g').selectAll('text')
        .data(graph.nodes)
        .join('text')
        .attr('x', d => d.type === 'process' ? d.x0 - 6 : d.x1 + 6)
        .attr('y', d => (d.y0 + d.y1) / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', d => d.type === 'process' ? 'end' : 'start')
        .attr('fill', d => d.type === 'process' ? getColor(d.label) : '#8bb8e8')
        .attr('font-size', d => {
          const h = d.y1 - d.y0
          return Math.min(12, Math.max(8, h * 0.7)) + 'px'
        })
        .attr('font-family', 'monospace')
        .text(d => {
          const maxLen = d.type === 'remote' ? 18 : 14
          return d.label.length > maxLen ? d.label.slice(0, maxLen - 1) + '…' : d.label
        })

      // 连接数标签
      g.append('g').selectAll('text.count')
        .data(graph.nodes)
        .join('text')
        .attr('class', 'count')
        .attr('x', d => d.type === 'process' ? d.x0 - 6 : d.x1 + 6)
        .attr('y', d => (d.y0 + d.y1) / 2 + 12)
        .attr('text-anchor', d => d.type === 'process' ? 'end' : 'start')
        .attr('fill', '#8b949e')
        .attr('font-size', '9px')
        .attr('font-family', 'monospace')
        .text(d => `${d.value} conn`)

      // 列标题
      const hasProc = graph.nodes.some(n => n.type === 'process')
      const hasRemote = graph.nodes.some(n => n.type === 'remote')
      if (hasProc) {
        g.append('text')
          .attr('x', 0).attr('y', -16)
          .attr('fill', '#8b949e').attr('font-size', 11)
          .text('进程')
      }
      if (hasRemote) {
        g.append('text')
          .attr('x', iW).attr('y', -16)
          .attr('text-anchor', 'end')
          .attr('fill', '#8b949e').attr('font-size', 11)
          .text('远端 IP')
      }

      // Tooltip
      const tip = svgEl.append('g').attr('class', 'tip').style('display', 'none')
      tip.append('rect').attr('rx', 6).attr('fill', '#1c2333').attr('stroke', '#30363d').attr('stroke-width', 1)
      tip.append('text').attr('font-size', 11).attr('font-family', 'monospace').attr('fill', '#e6edf3')

      function showLinkTip(e, d) {
        const [mx, my] = d3.pointer(e, g.node())
        const lines = [`${d.source.label} → ${d.target.label}`, `连接数: ${d.value}`]
        const t = tip.style('display', null)
        const texts = t.select('text')
        texts.selectAll('tspan').remove()
        lines.forEach((ln, i) => {
          texts.append('tspan').attr('x', 8).attr('dy', i === 0 ? 16 : 14).text(ln)
        })
        const bb = texts.node().getBBox()
        t.select('rect').attr('width', bb.width + 16).attr('height', bb.height + 12).attr('y', 0)
        t.attr('transform', `translate(${mx + 10},${my - 20})`)
      }

      function hideTip() { tip.style('display', 'none') }
    }

    watch([filtered, topN], () => nextTick(draw), { deep: false })
    watch(onlyEstablished, () => nextTick(draw))

    onMounted(() => {
      resizeObserver = new ResizeObserver(() => nextTick(draw))
      resizeObserver.observe(container.value)
      draw()
    })

    onUnmounted(() => resizeObserver?.disconnect())

    return { container, svg, onlyEstablished, topN, empty }
  }
})
</script>

<style scoped>
.sankey-wrap {
  position: absolute; inset: 0;
  background: var(--bg);
}
.sankey-svg { width: 100%; height: 100%; display: block; }

.sankey-toolbar {
  position: absolute;
  top: 10px; left: 10px;
  display: flex;
  align-items: center;
  gap: 12px;
  background: #161b22cc;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 6px 12px;
  z-index: 10;
  backdrop-filter: blur(4px);
}
.toolbar-item {
  display: flex; align-items: center; gap: 6px;
  color: var(--text2); font-size: 12px; cursor: pointer;
}
.toolbar-item input, .toolbar-item select {
  background: var(--bg); border: 1px solid var(--border);
  color: var(--text); border-radius: 4px; padding: 2px 4px;
  font-size: 12px; font-family: inherit;
}
.toolbar-info { color: var(--text2); font-size: 11px; }

.empty-tip {
  position: absolute; top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  color: var(--text2); font-size: 14px;
}
</style>
