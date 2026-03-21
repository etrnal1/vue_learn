<template>
  <div class="dd-wrap">

    <!-- ── KPI 行 ── -->
    <div class="dd-kpi">
      <div class="kpi-card" v-for="k in kpiCards" :key="k.label" :style="{'--kc': k.color}">
        <div class="kpi-icon">{{ k.icon }}</div>
        <div class="kpi-body">
          <div class="kpi-lbl">{{ k.label }}</div>
          <div class="kpi-val">{{ k.value }}</div>
          <div class="kpi-sub">{{ k.sub }}</div>
        </div>
      </div>
    </div>

    <!-- ── 主网格 ── -->
    <div class="dd-grid">

      <!-- 连接趋势折线图 -->
      <div class="dd-panel panel-trend">
        <div class="panel-hd">
          <span class="panel-title">连接数趋势（近2分钟）</span>
          <span class="legend-item" style="color:var(--cyan)">■ 总连接 {{ trend.length ? trend[trend.length-1].count : 0 }}</span>
        </div>
        <div class="panel-bd" ref="trendWrap">
          <svg :width="tW" :height="tH" v-if="tW && trend.length > 1">
            <defs>
              <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="var(--cyan)" stop-opacity="0.25"/>
                <stop offset="100%" stop-color="var(--cyan)" stop-opacity="0"/>
              </linearGradient>
            </defs>
            <!-- 网格 -->
            <line v-for="y in trendYTicks" :key="y"
              :x1="TL" :y1="tY(y)" :x2="tW-4" :y2="tY(y)"
              stroke="#21262d" stroke-width="1"/>
            <text v-for="y in trendYTicks" :key="'ty'+y"
              :x="TL-4" :y="tY(y)+4" fill="#484f58" font-size="10" text-anchor="end">{{ y }}</text>
            <!-- X 轴时间标签 -->
            <text v-for="(lb,i) in trendXLabels" :key="'tx'+i"
              :x="lb.x" :y="tH-3" fill="#484f58" font-size="10" text-anchor="middle">{{ lb.label }}</text>
            <!-- 填充 + 折线 -->
            <path :d="trendFill" fill="url(#trendGrad)"/>
            <polyline :points="trendLine"
              fill="none" stroke="var(--cyan)" stroke-width="2"
              stroke-linejoin="round" stroke-linecap="round"/>
            <!-- 当前值点 -->
            <circle v-if="trend.length" :cx="tX(trend.length-1)" :cy="tY(trend[trend.length-1].count)"
              r="3" fill="var(--cyan)" style="filter:drop-shadow(0 0 4px var(--cyan))"/>
            <!-- 平均线 -->
            <line :x1="TL" :y1="tY(trendAvg)" :x2="tW-4" :y2="tY(trendAvg)"
              stroke="var(--orange)" stroke-width="1" stroke-dasharray="4,3" opacity="0.6"/>
            <text :x="tW-6" :y="tY(trendAvg)-4" fill="var(--orange)" font-size="9" text-anchor="end">均值 {{ trendAvg }}</text>
          </svg>
          <div v-else-if="!trend.length" class="no-data">等待数据…</div>
        </div>
      </div>

      <!-- 连接状态饼图 -->
      <div class="dd-panel panel-state">
        <div class="panel-hd"><span class="panel-title">连接状态分布</span></div>
        <div class="panel-bd pie-bd">
          <svg width="130" height="130">
            <path v-for="(s,i) in stateSlices" :key="s.name"
              :d="s.d" :fill="stateColors[i % stateColors.length]"
              :opacity="stateHov===i ? 1 : 0.82"
              :style="{ filter: stateHov===i ? `drop-shadow(0 0 6px ${stateColors[i%stateColors.length]})` : 'none',
                        transform: stateHov===i ? `translate(${s.tx}px,${s.ty}px)` : '',
                        transition: 'all 0.2s' }"
              @mouseenter="stateHov=i" @mouseleave="stateHov=null"
              @touchstart.prevent="stateHov=i" @touchend="stateHov=null"/>
            <circle cx="65" cy="65" r="36" fill="var(--card)"/>
            <text x="65" y="61" fill="var(--text2)" font-size="10" text-anchor="middle">
              {{ stateHov !== null ? stateEntries[stateHov]?.[0] : '状态' }}
            </text>
            <text x="65" y="76"
              :fill="stateHov !== null ? stateColors[stateHov % stateColors.length] : 'var(--text)'"
              font-size="15" font-weight="700" text-anchor="middle">
              {{ stateHov !== null ? stateEntries[stateHov]?.[1] : stats.total || 0 }}
            </text>
          </svg>
          <div class="pie-legend">
            <div v-for="([name,cnt],i) in stateEntries" :key="name"
              class="pie-row" :class="{ active: stateHov===i }"
              @mouseenter="stateHov=i" @mouseleave="stateHov=null">
              <span class="pie-dot" :style="{ background: stateColors[i % stateColors.length] }"></span>
              <span class="pie-name">{{ name }}</span>
              <span class="pie-val" :style="{ color: stateColors[i % stateColors.length] }">{{ cnt }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Top 进程柱状图 -->
      <div class="dd-panel panel-proc">
        <div class="panel-hd">
          <span class="panel-title">Top 进程连接数</span>
          <span class="panel-sub">{{ Object.keys(stats.byProcess || {}).length }} 个进程</span>
        </div>
        <div class="panel-bd" ref="procWrap">
          <svg :width="pW" :height="pH" v-if="pW && topProcs.length">
            <g v-for="(p, i) in topProcs" :key="p.name">
              <!-- 背景 -->
              <rect :x="PL" :y="procBarY(i)" :width="pW-PL-PR" :height="procBarH-3"
                fill="#0d1117" rx="3"/>
              <!-- 数据 -->
              <rect :x="PL" :y="procBarY(i)"
                :width="Math.max(2, (p.count/topProcs[0].count)*(pW-PL-PR))" :height="procBarH-3"
                :fill="procColors[i % procColors.length]" rx="3"
                :style="{ transition: 'width 0.5s', filter: `drop-shadow(0 0 3px ${procColors[i%procColors.length]}66)` }"/>
              <!-- 进程名 -->
              <text :x="PL-6" :y="procBarY(i)+(procBarH-3)/2+4"
                fill="var(--text2)" font-size="11" text-anchor="end">
                {{ p.name.length > 12 ? p.name.slice(0,11)+'…' : p.name }}
              </text>
              <!-- 数值 -->
              <text :x="PL+6" :y="procBarY(i)+(procBarH-3)/2+4"
                :fill="procColors[i % procColors.length]" font-size="11">
                {{ p.count }}
              </text>
              <!-- 百分比 -->
              <text :x="pW-PR" :y="procBarY(i)+(procBarH-3)/2+4"
                fill="#484f58" font-size="10" text-anchor="end">
                {{ procPct(p.count) }}%
              </text>
            </g>
          </svg>
          <div v-else class="no-data">暂无进程数据</div>
        </div>
      </div>

      <!-- 目标国家排行 -->
      <div class="dd-panel panel-country">
        <div class="panel-hd">
          <span class="panel-title">境外连接国家</span>
          <span class="panel-sub">{{ foreignCount }} 条</span>
        </div>
        <div class="panel-bd country-bd">
          <div v-if="!topCountries.length" class="no-data">无境外连接</div>
          <div v-for="(c,i) in topCountries" :key="c.name" class="country-row">
            <span class="c-flag">{{ c.flag }}</span>
            <span class="c-name">{{ c.name }}</span>
            <div class="c-bar-wrap">
              <div class="c-bar" :style="{ width: (c.count/topCountries[0].count*100)+'%',
                background: procColors[i % procColors.length] }"></div>
            </div>
            <span class="c-val">{{ c.count }}</span>
          </div>
        </div>
      </div>

      <!-- 连接事件流 -->
      <div class="dd-panel panel-events">
        <div class="panel-hd">
          <span class="panel-title">连接事件流</span>
          <span class="pulse-dot"></span>
          <span style="color:var(--green);font-size:10px;font-weight:700;letter-spacing:1px">LIVE</span>
        </div>
        <div class="panel-bd event-bd">
          <transition-group name="ev" tag="div">
            <div v-for="e in eventFeed" :key="e.id" class="ev-row">
              <span class="ev-badge" :class="e.type">{{ e.type === 'new' ? '新增' : '关闭' }}</span>
              <span class="ev-proc">{{ e.process }}</span>
              <span class="ev-arrow">→</span>
              <span class="ev-dest">{{ e.dest }}</span>
              <span class="ev-dur" v-if="e.duration">{{ fmtDur(e.duration) }}</span>
              <span class="ev-time">{{ e.time }}</span>
            </div>
          </transition-group>
          <div v-if="!eventFeed.length" class="no-data">等待连接事件…</div>
        </div>
      </div>

    </div>
  </div>
</template>

<script>
import { defineComponent, ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'

const DANGER_PORTS = new Set([21,22,23,25,53,135,139,445,1433,3306,3389,4444,5900,6379,6667,27017])

export default defineComponent({
  name: 'DataDashboard',
  props: {
    connections: { type: Array,  default: () => [] },
    stats:       { type: Object, default: () => ({}) },
    trend:       { type: Array,  default: () => [] },
    history:     { type: Array,  default: () => [] },
    newConns:    { type: Array,  default: () => [] },
  },

  setup(props) {
    // ── 尺寸响应 ──
    const trendWrap = ref(null), procWrap = ref(null)
    const tW = ref(0), tH = ref(0), pW = ref(0), pH = ref(0)
    let ro = null
    onMounted(() => {
      ro = new ResizeObserver(() => {
        if (trendWrap.value) { tW.value = trendWrap.value.clientWidth; tH.value = trendWrap.value.clientHeight }
        if (procWrap.value)  { pW.value = procWrap.value.clientWidth;  pH.value = procWrap.value.clientHeight }
      })
      if (trendWrap.value) ro.observe(trendWrap.value)
      if (procWrap.value)  ro.observe(procWrap.value)
    })
    onBeforeUnmount(() => ro?.disconnect())

    // ── 常量 ──
    const TL = 32, TT = 10, TB = 18   // trend margin left/top/bottom
    const PL = 80, PR = 40             // proc margin left/right
    const stateColors  = ['var(--green)','var(--cyan)','var(--orange)','var(--red)','var(--purple)','var(--text2)']
    const procColors   = ['#58a6ff','#3fb950','#d29922','#bc8cff','#f778ba','#ff7b72','#79c0ff','#56d364']
    const stateHov = ref(null)

    // ── KPI ──
    const kpiCards = computed(() => {
      const s = props.stats
      const riskCount = props.connections.filter(c => DANGER_PORTS.has(Number(c.remotePort))).length
      const foreignCount = props.connections.filter(c => c.geo?.country && c.geo.country !== 'CN').length
      return [
        { label: '总连接数',   icon: '🔗', value: s.total      ?? 0, sub: `TCP ${s.byProto?.TCP||0} · UDP ${s.byProto?.UDP||0}`, color: 'var(--cyan)'   },
        { label: '已建立连接', icon: '✅', value: s.established ?? 0, sub: `占比 ${s.total ? ((s.established/s.total)*100).toFixed(0) : 0}%`, color: 'var(--green)'  },
        { label: '活跃进程数', icon: '⚙️', value: Object.keys(s.byProcess || {}).length, sub: '正在使用网络', color: 'var(--purple)' },
        { label: '高风险端口', icon: '⚠️', value: riskCount, sub: `境外 ${foreignCount} 条`, color: riskCount > 0 ? 'var(--red)' : 'var(--text2)' },
      ]
    })

    // ── 趋势折线 ──
    const trendMax = computed(() => Math.max(...props.trend.map(p => p.count), 5))
    const trendAvg = computed(() => {
      if (!props.trend.length) return 0
      return Math.round(props.trend.reduce((s, p) => s + p.count, 0) / props.trend.length)
    })
    const trendYTicks = computed(() => {
      const m = trendMax.value
      const step = Math.max(1, Math.ceil(m / 4))
      return [0, step, step*2, step*3, step*4].filter(v => v <= m * 1.1)
    })
    function tX(i) {
      const len = props.trend.length
      return TL + (i / (len - 1 || 1)) * (tW.value - TL - 4)
    }
    function tY(v) {
      const m = trendMax.value
      return TT + (1 - v / m) * (tH.value - TT - TB)
    }
    const trendLine = computed(() =>
      props.trend.map((p, i) => `${tX(i)},${tY(p.count)}`).join(' ')
    )
    const trendFill = computed(() => {
      if (props.trend.length < 2) return ''
      const last = props.trend.length - 1
      const bot  = tH.value - TB
      return `M${tX(0)},${bot} ` +
        props.trend.map((p, i) => `L${tX(i)},${tY(p.count)}`).join(' ') +
        ` L${tX(last)},${bot} Z`
    })
    const trendXLabels = computed(() => {
      const pts = props.trend
      if (pts.length < 2) return []
      const idxs = [0, Math.floor(pts.length/4), Math.floor(pts.length/2), Math.floor(3*pts.length/4), pts.length-1]
      return idxs.map(i => {
        const d = new Date(pts[i].t)
        return { x: tX(i), label: `${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}` }
      })
    })

    // ── 状态饼图 ──
    const stateEntries = computed(() => {
      const bs = props.stats.byState || {}
      return Object.entries(bs).sort((a, b) => b[1] - a[1])
    })
    const stateTotal = computed(() => stateEntries.value.reduce((s, [, v]) => s + v, 0) || 1)
    const stateSlices = computed(() => {
      let start = -Math.PI / 2
      return stateEntries.value.map(([, cnt]) => {
        const angle = (cnt / stateTotal.value) * Math.PI * 2
        const end = start + angle
        const mid = start + angle / 2
        const d = pieArc(65, 65, 50, 28, start, end)
        start = end
        return { d, tx: Math.cos(mid) * 5, ty: Math.sin(mid) * 5 }
      })
    })
    function pieArc(cx, cy, R, r, s, e) {
      const x1=cx+R*Math.cos(s), y1=cy+R*Math.sin(s)
      const x2=cx+R*Math.cos(e), y2=cy+R*Math.sin(e)
      const x3=cx+r*Math.cos(e), y3=cy+r*Math.sin(e)
      const x4=cx+r*Math.cos(s), y4=cy+r*Math.sin(s)
      const lg = e - s > Math.PI ? 1 : 0
      return `M${x1},${y1} A${R},${R} 0 ${lg} 1 ${x2},${y2} L${x3},${y3} A${r},${r} 0 ${lg} 0 ${x4},${y4} Z`
    }

    // ── Top 进程 ──
    const topProcs = computed(() => {
      const bp = props.stats.byProcess || {}
      return Object.entries(bp)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8)
    })
    const totalConns = computed(() => topProcs.value.reduce((s, p) => s + p.count, 0) || 1)
    const procBarH = computed(() => {
      if (!topProcs.value.length) return 24
      return Math.max(18, (pH.value - 12) / topProcs.value.length)
    })
    function procBarY(i) { return 6 + i * procBarH.value }
    function procPct(v) { return ((v / totalConns.value) * 100).toFixed(0) }

    // ── 目标国家 ──
    const foreignCount = computed(() =>
      props.connections.filter(c => c.geo?.country && c.geo.country !== 'CN').length
    )
    const topCountries = computed(() => {
      const map = {}
      for (const c of props.connections) {
        if (!c.geo?.country || c.geo.country === 'CN') continue
        const key = c.geo.countryZh || c.geo.country
        if (!map[key]) map[key] = { name: key, flag: c.geo.flag || '🌐', count: 0 }
        map[key].count++
      }
      return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 6)
    })

    // ── 连接事件流 ──
    const eventFeed = ref([])
    let evId = 0

    function ts() {
      const d = new Date()
      return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`
    }
    function destLabel(c) {
      const host = c.domain || c.remoteAddr || ''
      return `${host}:${c.remotePort}`
    }

    // 监听 newConns 追加新增事件
    watch(() => props.newConns, (ncs) => {
      if (!ncs?.length) return
      for (const c of ncs.slice(0, 3)) {
        eventFeed.value.unshift({
          id: ++evId, type: 'new',
          process: c.process || '?', dest: destLabel(c),
          duration: null, time: ts(),
        })
      }
      if (eventFeed.value.length > 40) eventFeed.value.length = 40
    })

    // 监听 history 追加关闭事件（只看最新的）
    let lastHistoryLen = 0
    watch(() => props.history, (h) => {
      if (!h?.length) return
      const added = h.length - lastHistoryLen
      lastHistoryLen = h.length
      if (added <= 0 || added > 10) { lastHistoryLen = h.length; return }
      for (let i = 0; i < Math.min(added, 3); i++) {
        const c = h[i]
        eventFeed.value.unshift({
          id: ++evId, type: 'closed',
          process: c.process || '?', dest: destLabel(c),
          duration: c.duration || 0, time: ts(),
        })
      }
      if (eventFeed.value.length > 40) eventFeed.value.length = 40
    }, { deep: false })

    function fmtDur(ms) {
      if (ms < 1000) return `${ms}ms`
      if (ms < 60000) return `${(ms/1000).toFixed(1)}s`
      return `${(ms/60000).toFixed(1)}min`
    }

    return {
      trendWrap, procWrap, tW, tH, pW, pH,
      TL, PL, PR, stateColors, procColors, stateHov,
      kpiCards, trendMax, trendAvg, trendYTicks, trendLine, trendFill, trendXLabels, tX, tY,
      stateEntries, stateSlices, stateTotal,
      topProcs, procBarH, procBarY, procPct, totalConns,
      foreignCount, topCountries,
      eventFeed, fmtDur,
    }
  }
})
</script>

<style scoped>
.dd-wrap {
  position: absolute; inset: 0;
  overflow-y: auto;
  background: var(--bg);
  padding: 10px 12px 12px;
  display: flex; flex-direction: column; gap: 8px;
}

/* ── KPI ── */
.dd-kpi {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px; flex-shrink: 0;
}
.kpi-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-top: 2px solid var(--kc, var(--cyan));
  border-radius: 6px; padding: 10px 14px;
  display: flex; align-items: center; gap: 10px;
  position: relative; overflow: hidden;
}
.kpi-card::before {
  content: ''; position: absolute; inset: 0;
  background: radial-gradient(ellipse at top left, color-mix(in srgb, var(--kc, var(--cyan)) 7%, transparent), transparent 60%);
  pointer-events: none;
}
.kpi-icon { font-size: 26px; flex-shrink: 0; }
.kpi-lbl  { font-size: 10px; color: var(--text2); letter-spacing: .5px; }
.kpi-val  { font-size: 22px; font-weight: 700; color: var(--text); line-height: 1.2; }
.kpi-sub  { font-size: 10px; color: var(--text2); margin-top: 1px; }

/* ── 主网格（桌面 3列×2行） ── */
.dd-grid {
  display: grid;
  grid-template-columns: 1fr 200px;
  grid-template-rows: 200px 210px 200px;
  gap: 8px; flex: 1; min-height: 620px;
}
.dd-panel {
  background: var(--card); border: 1px solid var(--border);
  border-radius: 6px; display: flex; flex-direction: column; overflow: hidden;
}
.panel-trend   { grid-column: 1; grid-row: 1; }
.panel-state   { grid-column: 2; grid-row: 1; }
.panel-proc    { grid-column: 1; grid-row: 2; }
.panel-country { grid-column: 2; grid-row: 2; }
.panel-events  { grid-column: 1 / -1; grid-row: 3; }

.panel-hd {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px 6px; border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.panel-title { font-size: 12px; font-weight: 600; color: var(--text); flex: 1; }
.panel-sub   { font-size: 11px; color: var(--text2); }
.legend-item { font-size: 11px; }
.panel-bd    { flex: 1; overflow: hidden; position: relative; }
svg          { display: block; }
.no-data     { display: flex; align-items: center; justify-content: center; height: 100%; color: var(--text2); font-size: 12px; font-style: italic; }

/* 饼图 */
.pie-bd  { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 6px; }
.pie-legend { display: flex; flex-direction: column; gap: 4px; }
.pie-row { display: flex; align-items: center; gap: 6px; cursor: pointer; padding: 2px 4px; border-radius: 3px; transition: background .15s; }
.pie-row.active { background: var(--border); }
.pie-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.pie-name { font-size: 10px; color: var(--text2); flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 80px; }
.pie-val  { font-size: 11px; font-weight: 700; min-width: 24px; text-align: right; }

/* 国家排行 */
.country-bd { overflow-y: auto; padding: 8px 12px; display: flex; flex-direction: column; gap: 6px; }
.country-row { display: flex; align-items: center; gap: 6px; }
.c-flag { font-size: 14px; flex-shrink: 0; width: 18px; text-align: center; }
.c-name { font-size: 11px; color: var(--text2); width: 52px; flex-shrink: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.c-bar-wrap { flex: 1; height: 7px; background: #0d1117; border-radius: 3px; overflow: hidden; }
.c-bar  { height: 100%; border-radius: 3px; transition: width .5s; }
.c-val  { font-size: 10px; color: var(--text2); width: 28px; text-align: right; flex-shrink: 0; }

/* 事件流 */
.pulse-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--green); box-shadow: 0 0 5px var(--green);
  animation: blink 1.2s ease-in-out infinite;
}
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:.3} }
.event-bd { overflow-y: auto; }
.ev-row {
  display: flex; align-items: center; gap: 7px;
  padding: 5px 12px; border-bottom: 1px solid #0d1117;
  font-size: 11px; transition: background .15s;
}
.ev-row:hover { background: #161b22; }
.ev-badge { flex-shrink: 0; font-size: 9px; font-weight: 700; padding: 1px 5px; border-radius: 3px; width: 30px; text-align: center; }
.ev-badge.new    { background: #12261a; color: var(--green); }
.ev-badge.closed { background: #1c1c1c; color: var(--text2); }
.ev-proc  { color: var(--text); font-weight: 600; flex-shrink: 0; max-width: 90px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ev-arrow { color: var(--text2); flex-shrink: 0; }
.ev-dest  { color: var(--cyan); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ev-dur   { color: var(--text2); flex-shrink: 0; font-size: 10px; }
.ev-time  { color: var(--text2); flex-shrink: 0; font-size: 10px; width: 56px; text-align: right; }
.ev-enter-active { transition: all .25s ease; }
.ev-enter-from   { opacity: 0; transform: translateX(-8px); }

/* ── 响应式 ── */
@media (max-width: 900px) {
  .dd-kpi { grid-template-columns: repeat(2, 1fr); }
  .dd-grid {
    grid-template-columns: 1fr;
    grid-template-rows: repeat(5, auto);
    min-height: unset;
  }
  .panel-trend, .panel-state, .panel-proc,
  .panel-country, .panel-events { grid-column: 1; grid-row: unset; height: 200px; }
  .panel-events { height: 220px; }
}

@media (max-width: 480px) {
  .dd-wrap  { padding: 6px 8px 8px; }
  .dd-kpi   { gap: 5px; }
  .kpi-card { padding: 8px 10px; gap: 8px; }
  .kpi-icon { font-size: 20px; }
  .kpi-val  { font-size: 18px; }
  .kpi-sub  { display: none; }
}
</style>
