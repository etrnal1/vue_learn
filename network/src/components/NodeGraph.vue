<template>
  <div class="graph-wrap" ref="container">
    <div class="graph-toolbar">
      <label class="toolbar-item">
        <input type="checkbox" v-model="onlyEstablished" />
        仅 ESTABLISHED
      </label>
      <label class="toolbar-item">
        IP 上限:
        <select v-model.number="maxRemote">
          <option :value="20">前20</option>
          <option :value="40">前40</option>
          <option :value="100">全部</option>
        </select>
      </label>
      <button class="freeze-btn" @click="toggleFreeze" :class="{ frozen: isFrozen }">
        {{ isFrozen ? '▶ 解冻' : '❄ 冻结' }}
      </button>
      <button class="freeze-btn" @click="relayout" title="重新随机布局">↺ 重排</button>
      <span class="toolbar-info">{{ nodeCount }} 节点 / {{ linkCount }} 连接</span>
      <span v-if="isFrozen" class="frozen-badge">已冻结</span>
    </div>

    <div v-if="tooltip.visible" class="tooltip" :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }">
      <div class="tt-title">{{ tooltip.title }}</div>
      <div v-for="row in tooltip.rows" :key="row" class="tt-row">{{ row }}</div>
      <div class="tt-hint">拖动固定 · 双击解锁</div>
    </div>

    <svg ref="svg" class="graph-svg" />
  </div>
</template>

<script>
import { defineComponent, ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import * as d3 from 'd3'

export default defineComponent({
  name: 'NodeGraph',
  props: {
    connections: { type: Array, default: () => [] }
  },

  setup(props) {
    const container = ref(null)
    const svg = ref(null)
    const onlyEstablished = ref(true)
    const maxRemote = ref(40)
    const tooltip = ref({ visible: false, x: 0, y: 0, title: '', rows: [] })
    const isFrozen = ref(false)
    const nodeCount = ref(0)
    const linkCount = ref(0)

    // 进程颜色（稳定映射，不随更新变化）
    const colorScale = d3.scaleOrdinal(d3.schemeTableau10)
    const processColors = new Map()
    function getProcessColor(name) {
      if (!processColors.has(name)) processColors.set(name, colorScale(processColors.size))
      return processColors.get(name)
    }

    // 节点位置缓存（跨数据更新保留坐标）
    const posCache = new Map() // id → { x, y, fx, fy }

    let simulation = null
    let svgEl = null
    let resizeObserver = null
    // 当前图的节点/边引用，用于增量更新
    let gLinks = null
    let gNodes = null
    let currentNodes = []
    let currentLinks = []

    const filtered = computed(() => {
      let conns = props.connections
      if (onlyEstablished.value) conns = conns.filter(c => c.state === 'ESTABLISHED')
      return conns
    })

    // ─── 构建图数据（不操作 DOM）───────────────────────────
    function buildData() {
      const conns = filtered.value
      const width = container.value?.clientWidth || 900
      const height = container.value?.clientHeight || 600

      const remoteCount = new Map()
      for (const c of conns) remoteCount.set(c.remoteAddr, (remoteCount.get(c.remoteAddr) || 0) + 1)

      const topRemotes = [...remoteCount.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, maxRemote.value)
        .map(e => e[0])
      const topRemoteSet = new Set(topRemotes)
      const visConns = conns.filter(c => topRemoteSet.has(c.remoteAddr))

      const processSet = new Set(visConns.map(c => c.process))
      const nodes = []
      const nodeIndex = new Map()

      for (const p of processSet) {
        const id = `proc:${p}`
        const count = visConns.filter(c => c.process === p).length
        const cached = posCache.get(id)
        nodes.push({
          id, label: p, type: 'process', count,
          // 有缓存用缓存，否则初始放左侧
          x: cached?.x ?? width * 0.25 + (Math.random() - 0.5) * 80,
          y: cached?.y ?? height / 2 + (Math.random() - 0.5) * 200,
          fx: cached?.fx ?? null,
          fy: cached?.fy ?? null
        })
        nodeIndex.set(id, nodes.length - 1)
      }

      for (const ip of topRemotes) {
        const id = `ip:${ip}`
        const count = remoteCount.get(ip) || 0
        const cached = posCache.get(id)
        nodes.push({
          id, label: ip, type: 'remote', count,
          x: cached?.x ?? width * 0.72 + (Math.random() - 0.5) * 80,
          y: cached?.y ?? height / 2 + (Math.random() - 0.5) * 300,
          fx: cached?.fx ?? null,
          fy: cached?.fy ?? null
        })
        nodeIndex.set(id, nodes.length - 1)
      }

      const linkMap = new Map()
      for (const c of visConns) {
        const key = `${c.process}→${c.remoteAddr}`
        if (!linkMap.has(key)) linkMap.set(key, {
          source: nodeIndex.get(`proc:${c.process}`),
          target: nodeIndex.get(`ip:${c.remoteAddr}`),
          count: 0, process: c.process, ports: new Set()
        })
        const lk = linkMap.get(key)
        lk.count++
        lk.ports.add(c.remotePort)
      }

      return { nodes, links: [...linkMap.values()], visConns, width, height }
    }

    // ─── 首次完整建图 ───────────────────────────────────────
    function initGraph() {
      if (!svgEl) return
      const { nodes, links, visConns, width, height } = buildData()
      currentNodes = nodes
      currentLinks = links
      nodeCount.value = nodes.length
      linkCount.value = links.length

      d3.select(svgEl).selectAll('*').remove()
      d3.select(svgEl).attr('width', width).attr('height', height)

      // 缩放
      const g = d3.select(svgEl).append('g')
      const zoom = d3.zoom().scaleExtent([0.15, 5]).on('zoom', e => g.attr('transform', e.transform))
      d3.select(svgEl).call(zoom)

      // 箭头
      d3.select(svgEl).append('defs').append('marker')
        .attr('id', 'arrow').attr('viewBox', '0 -4 8 8')
        .attr('refX', 16).attr('refY', 0)
        .attr('markerWidth', 5).attr('markerHeight', 5).attr('orient', 'auto')
        .append('path').attr('d', 'M0,-4L8,0L0,4').attr('fill', '#58a6ff44')

      gLinks = g.append('g').attr('class', 'links')
      gNodes = g.append('g').attr('class', 'nodes')

      renderLinks(links)
      renderNodes(nodes, links, visConns)

      startSimulation(nodes, links, width, height)
    }

    // ─── 增量更新（保留 DOM，只更新数据和属性）─────────────
    function updateGraph() {
      if (!gLinks || !gNodes) { initGraph(); return }

      const { nodes, links, visConns } = buildData()
      currentNodes = nodes
      currentLinks = links
      nodeCount.value = nodes.length
      linkCount.value = links.length

      renderLinks(links)
      renderNodes(nodes, links, visConns)

      // 只用很低的 alpha 微调新增节点，已稳定的节点几乎不动
      if (!isFrozen.value && simulation) {
        simulation.nodes(nodes)
        simulation.force('link').links(links)
        simulation.alpha(0.1).restart()
      }
    }

    // ─── 渲染连线 ───────────────────────────────────────────
    function renderLinks(links) {
      gLinks.selectAll('line')
        .data(links, d => `${d.source}-${d.target}`)
        .join(
          enter => enter.append('line')
            .attr('stroke-opacity', 0)
            .call(e => e.transition().duration(400).attr('stroke-opacity', 0.4)),
          update => update,
          exit => exit.transition().duration(300).attr('stroke-opacity', 0).remove()
        )
        .attr('stroke', d => getProcessColor(d.process))
        .attr('stroke-width', d => Math.min(1 + d.count * 0.5, 6))
        .attr('marker-end', 'url(#arrow)')
    }

    // ─── 渲染节点 ───────────────────────────────────────────
    function renderNodes(nodes, links, conns) {
      const sel = gNodes.selectAll('g.node')
        .data(nodes, d => d.id)
        .join(
          enter => {
            const g = enter.append('g').attr('class', 'node')
              .attr('transform', d => `translate(${d.x},${d.y})`)
              .attr('opacity', 0)
              .call(e => e.transition().duration(400).attr('opacity', 1))

            g.append('circle')
            g.append('text').attr('class', 'label')
            g.append('text').attr('class', 'badge')
            return g
          },
          update => update,
          exit => exit.transition().duration(300).attr('opacity', 0).remove()
        )

      // 更新属性
      sel.select('circle')
        .attr('r', d => nodeR(d))
        .attr('fill', d => d.type === 'process' ? getProcessColor(d.label) : '#1e3a5f')
        .attr('stroke', d => d.type === 'process' ? getProcessColor(d.label) : '#58a6ff')
        .attr('stroke-width', d => d.fx != null ? 2.5 : 1.5)
        .attr('stroke-dasharray', d => d.fx != null ? '4,2' : null)
        .attr('fill-opacity', d => d.type === 'process' ? 0.85 : 0.6)

      sel.select('text.label')
        .attr('dy', d => nodeR(d) + 12)
        .attr('text-anchor', 'middle')
        .attr('fill', d => d.type === 'process' ? getProcessColor(d.label) : '#58a6ff')
        .attr('font-size', d => d.type === 'process' ? 11 : 9)
        .attr('font-family', 'monospace')
        .text(d => d.label)

      sel.select('text.badge')
        .attr('dy', 4).attr('text-anchor', 'middle')
        .attr('fill', '#fff').attr('font-size', 9).attr('pointer-events', 'none')
        .text(d => d.count > 1 ? d.count : '')

      // 交互
      sel
        .call(d3.drag()
          .on('start', dragStart)
          .on('drag', dragged)
          .on('end', dragEnd))
        .on('dblclick', (e, d) => {
          // 双击解锁固定
          d.fx = null; d.fy = null
          posCache.set(d.id, { x: d.x, y: d.y, fx: null, fy: null })
          d3.select(e.currentTarget).select('circle')
            .attr('stroke-dasharray', null).attr('stroke-width', 1.5)
          if (!isFrozen.value) simulation?.alpha(0.05).restart()
        })
        .on('mousemove', (e, d) => showTooltip(e, d, links, conns))
        .on('mouseleave', () => { tooltip.value.visible = false })
    }

    // ─── 力模拟 ─────────────────────────────────────────────
    function startSimulation(nodes, links, width, height) {
      simulation?.stop()
      simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id((_, i) => i).distance(d => 80 + d.count * 8).strength(0.5))
        .force('charge', d3.forceManyBody().strength(-220))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(d => nodeR(d) + 10))
        .force('x', d3.forceX().x(d => d.type === 'process' ? width * 0.28 : width * 0.72).strength(0.12))
        .alphaDecay(0.04)   // 更快稳定（默认0.0228）
        .alphaMin(0.001)

      simulation.on('tick', ticked)
      simulation.on('end', () => {
        // 模拟自然停止后保存所有位置
        savePositions()
      })
    }

    function ticked() {
      if (!gLinks || !gNodes) return
      gLinks.selectAll('line')
        .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x).attr('y2', d => d.target.y)
      gNodes.selectAll('g.node')
        .attr('transform', d => `translate(${d.x},${d.y})`)
    }

    function savePositions() {
      for (const n of currentNodes) {
        posCache.set(n.id, { x: n.x, y: n.y, fx: n.fx, fy: n.fy })
      }
    }

    // ─── 拖拽（拖完固定，双击解锁）──────────────────────────
    function dragStart(e, d) {
      if (!e.active && !isFrozen.value) simulation?.alphaTarget(0.2).restart()
      d.fx = d.x; d.fy = d.y
    }
    function dragged(e, d) { d.fx = e.x; d.fy = e.y }
    function dragEnd(e, d) {
      if (!e.active && !isFrozen.value) simulation?.alphaTarget(0)
      // 拖完保持固定（fx/fy 不清除）
      posCache.set(d.id, { x: d.x, y: d.y, fx: d.fx, fy: d.fy })
      // 更新虚线描边
      d3.select(e.sourceEvent.target.closest('g.node'))
        ?.select('circle').attr('stroke-dasharray', '4,2').attr('stroke-width', 2.5)
    }

    // ─── 冻结 / 解冻 ────────────────────────────────────────
    function toggleFreeze() {
      isFrozen.value = !isFrozen.value
      if (isFrozen.value) {
        simulation?.stop()
        savePositions()
      } else {
        simulation?.alpha(0.05).restart()
      }
    }

    // ─── 完全重排（清除位置缓存）────────────────────────────
    function relayout() {
      posCache.clear()
      isFrozen.value = false
      initGraph()
    }

    // ─── Tooltip ────────────────────────────────────────────
    function showTooltip(e, d, links, conns) {
      const rect = svgEl.getBoundingClientRect()
      const x = e.clientX - rect.left + 14
      const y = e.clientY - rect.top + 14
      const rows = []

      if (d.type === 'process') {
        const myLinks = links.filter(l => l.process === d.label)
        rows.push(`连接数: ${d.count}`)
        rows.push(`远端 IP: ${myLinks.length} 个`)
        const ports = [...new Set(conns.filter(c => c.process === d.label).map(c => c.remotePort))]
        rows.push(`端口: ${ports.slice(0, 6).join(', ')}${ports.length > 6 ? ' …' : ''}`)
      } else {
        const ipConns = conns.filter(c => c.remoteAddr === d.label)
        rows.push(`IP: ${d.label}`)
        rows.push(`连接数: ${d.count}`)
        rows.push(`进程: ${[...new Set(ipConns.map(c => c.process))].join(', ')}`)
        rows.push(`端口: ${[...new Set(ipConns.map(c => c.remotePort))].join(', ')}`)
      }
      if (d.fx != null) rows.push('📌 已固定')
      tooltip.value = { visible: true, x, y, title: d.label, rows }
    }

    function nodeR(d) {
      return d.type === 'process'
        ? Math.min(6 + d.count * 1.5, 28)
        : Math.min(4 + d.count * 1, 18)
    }

    // ─── 侦听数据变化：用增量更新，不重建整个图 ─────────────
    let firstDraw = true
    watch(filtered, () => {
      if (firstDraw) return
      nextTick(updateGraph)
    }, { deep: false })

    watch([onlyEstablished, maxRemote], () => {
      posCache.clear()
      nextTick(initGraph)
    })

    onMounted(() => {
      svgEl = svg.value
      resizeObserver = new ResizeObserver(() => {
        posCache.clear()
        nextTick(initGraph)
      })
      resizeObserver.observe(container.value)
      nextTick(() => { initGraph(); firstDraw = false })
    })

    onUnmounted(() => {
      simulation?.stop()
      resizeObserver?.disconnect()
    })

    return {
      container, svg,
      onlyEstablished, maxRemote,
      tooltip, isFrozen,
      nodeCount, linkCount,
      toggleFreeze, relayout
    }
  }
})
</script>

<style scoped>
.graph-wrap {
  position: absolute; inset: 0;
  background: radial-gradient(ellipse at 50% 50%, #0d1e3a 0%, #0d1117 70%);
}
.graph-svg { width: 100%; height: 100%; display: block; }

.graph-toolbar {
  position: absolute; top: 10px; left: 10px;
  display: flex; align-items: center; gap: 10px;
  background: #161b22cc;
  border: 1px solid var(--border);
  border-radius: 8px; padding: 6px 12px; z-index: 10;
  backdrop-filter: blur(4px);
}
.toolbar-item {
  display: flex; align-items: center; gap: 6px;
  color: var(--text2); cursor: pointer; font-size: 12px;
}
.toolbar-item input, .toolbar-item select {
  background: var(--bg); border: 1px solid var(--border);
  color: var(--text); border-radius: 4px; padding: 2px 4px;
  font-size: 12px; font-family: inherit;
}
.freeze-btn {
  background: #1e2530; border: 1px solid var(--border);
  color: var(--text2); border-radius: 6px; padding: 3px 10px;
  font-size: 11px; font-family: inherit; cursor: pointer;
  transition: all 0.15s;
}
.freeze-btn:hover { color: var(--text); border-color: #484f58; }
.freeze-btn.frozen { color: var(--cyan); border-color: var(--cyan); background: #0d2a3a; }

.frozen-badge {
  background: #0d2a3a; color: var(--cyan);
  border: 1px solid var(--cyan); border-radius: 10px;
  font-size: 10px; padding: 1px 8px;
}
.toolbar-info { color: var(--text2); font-size: 11px; }

.tooltip {
  position: absolute;
  background: #1c2333ee; border: 1px solid #30363d;
  border-radius: 8px; padding: 8px 12px;
  pointer-events: none; z-index: 100; min-width: 170px;
  backdrop-filter: blur(8px);
}
.tt-title { color: var(--cyan); font-weight: 700; margin-bottom: 4px; font-size: 12px; }
.tt-row { color: var(--text2); font-size: 11px; line-height: 1.6; }
.tt-hint { color: #484f58; font-size: 10px; margin-top: 4px; border-top: 1px solid #30363d; padding-top: 4px; }
</style>
