<template>
  <div class="map-wrap" ref="container">
    <div class="map-toolbar">
      <span class="map-title">🗺 全球连接分布</span>
      <div class="map-legend">
        <span class="leg-item"><span class="leg-dot direct" />直连</span>
        <span class="leg-item"><span class="leg-dot proxy" />代理</span>
        <span class="leg-item"><span class="leg-dot transit" />转发</span>
        <span class="leg-item"><span class="leg-dot history" />历史</span>
      </div>
      <span class="map-stat">{{ activePoints.length }} 个目标 IP · {{ countryCount }} 个国家</span>
    </div>

    <!-- 悬停提示 -->
    <div v-if="tip.visible" class="map-tip" :style="{ left: tip.x + 'px', top: tip.y + 'px' }">
      <div class="tip-geo">{{ tip.flag }} {{ tip.country }}</div>
      <div class="tip-ip">{{ tip.ip }}</div>
      <div v-if="tip.domain" class="tip-domain">{{ tip.domain }}</div>
      <div v-if="tip.chains && tip.chains.length" class="tip-chains">
        <div v-for="c in tip.chains" :key="c.id" class="tip-chain-row">
          <span :class="['tip-chain-type', c.type]">{{ { proxy:'代理', transit:'转发', direct:'直连' }[c.type] || c.type }}</span>
          <span class="tip-chain-proc">{{ c.source?.label }}</span>
          <span v-if="c.via" class="tip-chain-via">→ {{ c.via.label }}</span>
        </div>
      </div>
      <div class="tip-conns">{{ tip.conns }} 条连接</div>
    </div>

    <svg ref="svg" class="map-svg" />
  </div>
</template>

<script>
import { defineComponent, ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import * as d3 from 'd3'
import { feature } from 'topojson-client'

export default defineComponent({
  name: 'MapView',
  props: {
    connections: { type: Array, default: () => [] },
    history: { type: Array, default: () => [] },
    homeGeo: { type: Object, default: null },
    chains: { type: Array, default: () => [] }
  },

  setup(props) {
    const container = ref(null)
    const svg = ref(null)
    const tip = ref({ visible: false, x: 0, y: 0 })

    let worldData = null
    let resizeObserver = null
    let projection = null

    // 按 IP 聚合活跃连接
    const activePoints = computed(() => {
      const map = new Map()
      for (const c of props.connections) {
        if (!c.geo?.ll) continue
        const key = c.remoteAddr
        if (!map.has(key)) map.set(key, { ip: key, ll: c.geo.ll, domain: c.domain, geo: c.geo, conns: 0, active: true })
        map.get(key).conns++
      }
      return [...map.values()]
    })

    // 历史点（已关闭）
    const historyPoints = computed(() => {
      const map = new Map()
      for (const c of props.history) {
        if (!c.geo?.ll) continue
        const key = c.remoteAddr
        if (!map.has(key)) map.set(key, { ip: key, ll: c.geo.ll, domain: c.domain, geo: c.geo, conns: 0, active: false })
        map.get(key).conns++
      }
      // 过滤掉已在活跃列表中的
      const activeIPs = new Set(activePoints.value.map(p => p.ip))
      return [...map.values()].filter(p => !activeIPs.has(p.ip))
    })

    const countryCount = computed(() => {
      const s = new Set()
      for (const p of activePoints.value) if (p.geo?.country) s.add(p.geo.country)
      return s.size
    })

    async function loadWorld() {
      if (worldData) return worldData
      try {
        const res = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
        worldData = await res.json()
      } catch {
        worldData = null
      }
      return worldData
    }

    async function draw() {
      if (!svg.value || !container.value) return
      const W = container.value.clientWidth || 900
      const H = container.value.clientHeight || 500

      const world = await loadWorld()

      d3.select(svg.value).selectAll('*').remove()
      d3.select(svg.value).attr('width', W).attr('height', H)

      const svgEl = d3.select(svg.value)

      // 投影：自然地球
      projection = d3.geoNaturalEarth1()
        .scale(W / 6.5)
        .translate([W / 2, H / 2])

      const path = d3.geoPath().projection(projection)

      // 缩放
      const g = svgEl.append('g')
      const zoom = d3.zoom().scaleExtent([0.8, 8]).on('zoom', e => g.attr('transform', e.transform))
      svgEl.call(zoom)

      // 背景（海洋）
      g.append('rect').attr('width', W).attr('height', H).attr('fill', '#0a1628')

      // 国家轮廓
      if (world) {
        const countries = feature(world, world.objects.countries)
        g.append('g').selectAll('path')
          .data(countries.features)
          .join('path')
          .attr('d', path)
          .attr('fill', '#1a2535')
          .attr('stroke', '#2a3a50')
          .attr('stroke-width', 0.4)
      }

      // 经纬度网格线
      g.append('path')
        .datum(d3.geoGraticule()())
        .attr('d', path)
        .attr('fill', 'none')
        .attr('stroke', '#1e3050')
        .attr('stroke-width', 0.3)

      // 连线（最底层）
      renderLines(g, activePoints.value)
      // 历史点（暗色）
      renderPoints(g, historyPoints.value, false)
      // 活跃点（亮色，后渲染在上层）
      renderPoints(g, activePoints.value, true)
      // 本机标记
      renderHome(g)
    }

    function renderPoints(g, points, active) {
      const cls = active ? 'active-pts' : 'hist-pts'
      let group = g.select(`.${cls}`)
      if (group.empty()) group = g.append('g').attr('class', cls)

      const ll = d => projection([d.ll[1], d.ll[0]])
      const r = d => Math.min(3 + d.conns * 0.8, 14)

      // 外圆：enter/update/exit 增量更新
      group.selectAll('circle.outer')
        .data(points, d => d.ip)
        .join(
          enter => enter.append('circle').attr('class', 'outer')
            .attr('cx', d => ll(d)?.[0]).attr('cy', d => ll(d)?.[1])
            .attr('r', 0).call(e => e.transition().duration(400).attr('r', r)),
          update => update.transition().duration(800)
            .attr('cx', d => ll(d)?.[0]).attr('cy', d => ll(d)?.[1]).attr('r', r),
          exit => exit.transition().duration(300).attr('r', 0).remove()
        )
        .attr('fill', active ? '#58a6ff22' : '#48484820')
        .attr('stroke', active ? '#58a6ff' : '#484848')
        .attr('stroke-width', active ? 1 : 0.5)

      // 脉冲圆：仅活跃点，新进入时启动动画，退出时移除
      if (active) {
        group.selectAll('circle.pulse')
          .data(points.filter(p => p.conns > 0), d => d.ip)
          .join(
            enter => {
              const c = enter.append('circle').attr('class', 'pulse')
                .attr('cx', d => ll(d)?.[0]).attr('cy', d => ll(d)?.[1])
                .attr('r', r).attr('fill', 'none')
                .attr('stroke', '#58a6ff').attr('stroke-width', 1)
                .attr('opacity', 0.6).attr('pointer-events', 'none')
              c.each(function() { animatePulse(this) })
              return c
            },
            update => update.attr('cx', d => ll(d)?.[0]).attr('cy', d => ll(d)?.[1]),
            exit => exit.remove()
          )
      }

      // 事件绑定在 outer 上
      group.selectAll('circle.outer')
        .on('mousemove', (e, d) => {
          const rect = svg.value.getBoundingClientRect()
          tip.value = {
            visible: true,
            x: e.clientX - rect.left + 12,
            y: e.clientY - rect.top + 12,
            flag: d.geo?.flag || '🌐',
            country: d.geo?.countryZh || d.geo?.country || '未知',
            ip: d.ip,
            domain: d.domain,
            chains: buildChainMap().get(d.ip) || [],
            conns: d.conns
          }
        })
        .on('mouseleave', () => { tip.value.visible = false })
    }

    function animatePulse(el) {
      d3.select(el)
        .transition().duration(1500).ease(d3.easeCubicOut)
        .attr('r', function() { return parseFloat(d3.select(this).attr('r')) * 2.5 })
        .attr('opacity', 0)
        .on('end', function() {
          d3.select(this).attr('opacity', 0.6)
          const base = parseFloat(d3.select(this).attr('r')) / 2.5
          d3.select(this).attr('r', base)
          animatePulse(this)
        })
    }

    const TYPE_COLOR = { proxy: '#bc8cff', transit: '#3fb950', direct: '#58a6ff' }

    function buildChainMap() {
      const map = new Map()
      for (const c of props.chains) {
        const ip = c.dest?.ip
        if (!ip) continue
        if (!map.has(ip)) map.set(ip, [])
        map.get(ip).push(c)
      }
      return map
    }

    function renderLines(g, points) {
      g.select('.conn-lines').remove()
      if (!props.homeGeo?.ll) return
      const homeLngLat = [props.homeGeo.ll[1], props.homeGeo.ll[0]]
      const [hx, hy] = projection(homeLngLat) || []
      const lineGen = d3.geoPath().projection(projection)
      const chainMap = buildChainMap()
      const group = g.append('g').attr('class', 'conn-lines')

      const data = points.filter(p => p.ll).map(p => {
        const ipChains = chainMap.get(p.ip) || []
        const type = ipChains[0]?.type || 'direct'
        return { ...p, ipChains, type }
      })

      // 连线
      group.selectAll('path.cline')
        .data(data)
        .join('path')
        .attr('class', 'cline')
        .attr('d', d => lineGen({
          type: 'LineString',
          coordinates: [homeLngLat, [d.ll[1], d.ll[0]]]
        }))
        .attr('fill', 'none')
        .attr('stroke', d => TYPE_COLOR[d.type] || '#58a6ff')
        .attr('stroke-width', d => Math.min(0.6 + d.conns * 0.2, 2.5))
        .attr('stroke-opacity', 0.45)
        .attr('stroke-dasharray', d => d.type === 'proxy' ? '6,3' : d.type === 'transit' ? '2,2' : '4,3')
        .attr('pointer-events', 'stroke')
        .on('mousemove', (e, d) => {
          const rect = svg.value.getBoundingClientRect()
          tip.value = {
            visible: true,
            x: e.clientX - rect.left + 14,
            y: e.clientY - rect.top + 14,
            flag: d.geo?.flag || '🌐',
            country: d.geo?.countryZh || d.geo?.country || '未知',
            ip: d.ip,
            domain: d.domain,
            chains: d.ipChains,
            conns: d.conns
          }
        })
        .on('mouseleave', () => { tip.value.visible = false })

      // 中间进程标签（仅连线较长时显示）
      group.selectAll('text.cline-label')
        .data(data.filter(d => {
          const [dx, dy] = projection([d.ll[1], d.ll[0]]) || []
          if (dx == null || hx == null) return false
          return Math.hypot(dx - hx, dy - hy) > 80
        }))
        .join('text')
        .attr('class', 'cline-label')
        .attr('x', d => {
          const [dx] = projection([d.ll[1], d.ll[0]]) || []
          return dx != null ? (hx + dx) / 2 : 0
        })
        .attr('y', d => {
          const [, dy] = projection([d.ll[1], d.ll[0]]) || []
          return dy != null ? (hy + dy) / 2 - 4 : 0
        })
        .attr('fill', d => TYPE_COLOR[d.type] || '#58a6ff')
        .attr('font-size', 9)
        .attr('text-anchor', 'middle')
        .attr('pointer-events', 'none')
        .text(d => d.ipChains[0]?.source?.label || '')
    }

    function renderHome(g) {
      g.select('.home-marker').remove()
      if (!props.homeGeo?.ll) return
      const [x, y] = projection([props.homeGeo.ll[1], props.homeGeo.ll[0]]) || []
      if (x == null) return
      const hg = g.append('g').attr('class', 'home-marker')
      hg.append('circle').attr('cx', x).attr('cy', y).attr('r', 6)
        .attr('fill', '#ff6b6b22').attr('stroke', '#ff6b6b').attr('stroke-width', 1.5)
      hg.append('circle').attr('cx', x).attr('cy', y).attr('r', 3)
        .attr('fill', '#ff6b6b')
      hg.append('text').attr('x', x + 10).attr('y', y + 4)
        .attr('fill', '#ff6b6b').attr('font-size', 10).text('本机')
    }

    // 数据变化时只更新点，不重绘地图
    function updatePoints() {
      if (!svg.value) return
      const g = d3.select(svg.value).select('g')
      if (g.empty() || !projection) return
      // 连线和本机标记仍全量刷新（轻量），点用增量 join
      renderLines(g, activePoints.value)
      renderPoints(g, historyPoints.value, false)
      renderPoints(g, activePoints.value, true)
      renderHome(g)
    }

    watch([activePoints, historyPoints, () => props.homeGeo, () => props.chains], updatePoints, { deep: false })

    onMounted(async () => {
      await nextTick()
      await draw()
      resizeObserver = new ResizeObserver(() => nextTick(draw))
      resizeObserver.observe(container.value)
    })

    onUnmounted(() => resizeObserver?.disconnect())

    return { container, svg, tip, activePoints, historyPoints, countryCount }
  }
})
</script>

<style scoped>
.map-wrap { position: absolute; inset: 0; background: #0a1628; display: flex; flex-direction: column; }

.map-toolbar {
  display: flex; align-items: center; gap: 16px;
  padding: 8px 14px;
  background: #0d1a2acc; border-bottom: 1px solid #1e3050;
  flex-shrink: 0; backdrop-filter: blur(4px);
}
.map-title { color: var(--text); font-weight: 600; font-size: 13px; }
.map-legend { display: flex; gap: 12px; }
.leg-item { display: flex; align-items: center; gap: 5px; color: var(--text2); font-size: 11px; }
.leg-dot { width: 8px; height: 8px; border-radius: 50%; }
.leg-dot.direct  { background: #58a6ff; box-shadow: 0 0 4px #58a6ff; }
.leg-dot.proxy   { background: #bc8cff; box-shadow: 0 0 4px #bc8cff; }
.leg-dot.transit { background: #3fb950; box-shadow: 0 0 4px #3fb950; }
.leg-dot.history { background: #484848; }
.map-stat { color: var(--text2); font-size: 11px; margin-left: auto; }

.map-svg { flex: 1; display: block; cursor: grab; }
.map-svg:active { cursor: grabbing; }

.map-tip {
  position: absolute; pointer-events: none; z-index: 100;
  background: #1c2333ee; border: 1px solid #30363d;
  border-radius: 8px; padding: 8px 12px;
  backdrop-filter: blur(8px); min-width: 140px;
}
.tip-geo { color: var(--text); font-weight: 600; font-size: 13px; }
.tip-ip { color: var(--text2); font-size: 11px; font-family: monospace; }
.tip-domain { color: var(--cyan); font-size: 11px; margin-top: 2px; }
.tip-conns { color: var(--green); font-size: 11px; margin-top: 4px; }
.tip-chains { margin-top: 6px; border-top: 1px solid #30363d; padding-top: 5px; display: flex; flex-direction: column; gap: 3px; }
.tip-chain-row { display: flex; align-items: center; gap: 5px; font-size: 10px; }
.tip-chain-type { padding: 0 5px; border-radius: 3px; font-weight: 600; }
.tip-chain-type.proxy   { background: #2d1f4a; color: #bc8cff; }
.tip-chain-type.transit { background: #1a3a1e; color: #3fb950; }
.tip-chain-type.direct  { background: #1e3a5f; color: #58a6ff; }
.tip-chain-proc { color: var(--text); }
.tip-chain-via  { color: var(--text2); }
</style>
