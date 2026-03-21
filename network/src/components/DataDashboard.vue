<template>
  <div class="dd-wrap">
    <!-- KPI 行 -->
    <div class="dd-kpi">
      <div class="kpi-card" v-for="k in kpiCards" :key="k.label" :style="{'--kc': k.color}">
        <div class="kpi-icon">{{ k.icon }}</div>
        <div class="kpi-body">
          <div class="kpi-lbl">{{ k.label }}</div>
          <div class="kpi-val">
            <span v-if="k.prefix" class="kpi-unit">{{ k.prefix }}</span>
            {{ k.formatted }}
          </div>
          <div class="kpi-trend" :class="k.trend >= 0 ? 'up' : 'dn'">
            {{ k.trend >= 0 ? '▲' : '▼' }} {{ Math.abs(k.trend).toFixed(1) }}%
          </div>
        </div>
        <svg width="72" height="26" class="kpi-spark">
          <defs>
            <linearGradient :id="'sg'+k.key" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" :stop-color="k.color" stop-opacity="0.3"/>
              <stop offset="100%" :stop-color="k.color" stop-opacity="0"/>
            </linearGradient>
          </defs>
          <path :d="sparkFill(k.spark, k.color, 72, 22, k.key)" :fill="`url(#sg${k.key})`"/>
          <polyline :points="sparkLine(k.spark, 72, 22)"
            fill="none" :stroke="k.color" stroke-width="1.5"
            stroke-linejoin="round" stroke-linecap="round"/>
        </svg>
      </div>
    </div>

    <!-- 主网格 -->
    <div class="dd-grid">
      <!-- 折线图 -->
      <div class="dd-panel panel-line">
        <div class="panel-hd">
          <span class="panel-title">实时流量趋势（60s）</span>
          <span class="legend-item" style="color:var(--cyan)">■ 请求/s {{ lastReq }}</span>
          <span class="legend-item" style="color:var(--red)">■ 错误/s {{ lastErr }}</span>
        </div>
        <div class="panel-bd" ref="lineWrap">
          <svg :width="lW" :height="lH" v-if="lW">
            <defs>
              <linearGradient id="lgReq" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="var(--cyan)" stop-opacity="0.2"/>
                <stop offset="100%" stop-color="var(--cyan)" stop-opacity="0"/>
              </linearGradient>
              <linearGradient id="lgErr" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="var(--red)" stop-opacity="0.2"/>
                <stop offset="100%" stop-color="var(--red)" stop-opacity="0"/>
              </linearGradient>
            </defs>
            <!-- 网格 -->
            <line v-for="y in lineYTicks" :key="y"
              :x1="LP" :y1="ly(y)" :x2="lW-8" :y2="ly(y)"
              stroke="#21262d" stroke-width="1"/>
            <text v-for="y in lineYTicks" :key="'t'+y"
              :x="LP-4" :y="ly(y)+4" fill="#484f58" font-size="10" text-anchor="end">
              {{ y >= 1000 ? (y/1000).toFixed(0)+'k' : y }}
            </text>
            <!-- 填充 -->
            <path :d="lineFillPath(bdData.requests, lW, lH, '#req')" fill="url(#lgReq)"/>
            <path :d="lineFillPath(bdData.errors,   lW, lH, '#err')" fill="url(#lgErr)"/>
            <!-- 线 -->
            <polyline :points="linePoints(bdData.requests, lW, lH)"
              fill="none" stroke="var(--cyan)" stroke-width="2"
              stroke-linejoin="round" stroke-linecap="round"/>
            <polyline :points="linePoints(bdData.errors, lW, lH)"
              fill="none" stroke="var(--red)" stroke-width="1.5"
              stroke-linejoin="round" stroke-linecap="round"/>
            <!-- 最新点 -->
            <circle :cx="lW-8" :cy="ly(lastReq)" r="3" fill="var(--cyan)"
              style="filter:drop-shadow(0 0 4px var(--cyan))"/>
            <circle :cx="lW-8" :cy="ly(lastErr)" r="3" fill="var(--red)"
              style="filter:drop-shadow(0 0 4px var(--red))"/>
          </svg>
        </div>
      </div>

      <!-- 设备饼图 -->
      <div class="dd-panel panel-pie">
        <div class="panel-hd"><span class="panel-title">设备类型</span></div>
        <div class="panel-bd pie-bd">
          <svg width="140" height="140">
            <defs>
              <linearGradient v-for="(s,i) in pieSlices" :key="'plg'+i" :id="'plg'+i" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" :stop-color="pieColors[i]"/>
                <stop offset="100%" :stop-color="pieColors[i]" stop-opacity="0.7"/>
              </linearGradient>
            </defs>
            <path v-for="(s,i) in pieSlices" :key="i"
              :d="s.d" :fill="`url(#plg${i})`"
              :opacity="pieHov===i ? 1 : 0.8"
              :style="{ filter: pieHov===i ? `drop-shadow(0 0 6px ${pieColors[i]})` : 'none',
                        transform: pieHov===i ? `translate(${s.tx}px,${s.ty}px)` : '',
                        transition: 'all 0.2s' }"
              @mouseenter="pieHov=i" @mouseleave="pieHov=null"
              @touchstart="pieHov=i" @touchend="pieHov=null"/>
            <circle cx="70" cy="70" r="38" fill="var(--card)"/>
            <text x="70" y="65" fill="var(--text2)" font-size="10" text-anchor="middle">
              {{ pieHov !== null ? bigdata.devices?.[pieHov]?.name : '设备' }}
            </text>
            <text x="70" y="80" :fill="pieHov !== null ? pieColors[pieHov] : 'var(--text)'"
              font-size="15" font-weight="700" text-anchor="middle">
              {{ pieHov !== null ? bigdata.devices?.[pieHov]?.value?.toFixed(1) + '%' : '分布' }}
            </text>
          </svg>
          <div class="pie-legend">
            <div v-for="(d,i) in bigdata.devices" :key="d.name"
              class="pie-leg-row" :class="{ active: pieHov===i }"
              @mouseenter="pieHov=i" @mouseleave="pieHov=null">
              <span class="leg-dot" :style="{ background: pieColors[i] }"></span>
              <span class="leg-name">{{ d.name }}</span>
              <span class="leg-val" :style="{ color: pieColors[i] }">{{ d.value?.toFixed(1) }}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 仪表盘 -->
      <div class="dd-panel panel-gauge">
        <div class="panel-hd"><span class="panel-title">系统资源</span></div>
        <div class="panel-bd gauge-bd">
          <div v-for="g in gauges" :key="g.key" class="gauge-item">
            <svg width="100" height="64" viewBox="0 0 100 64">
              <defs>
                <linearGradient :id="'gg'+g.key" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" :stop-color="g.c[0]"/>
                  <stop offset="100%" :stop-color="g.c[1]"/>
                </linearGradient>
              </defs>
              <path :d="gaugeArc(0, 180)" fill="none" stroke="#21262d" stroke-width="9" stroke-linecap="round"/>
              <path :d="gaugeArc(0, g.val/100*180)"
                fill="none" :stroke="`url(#gg${g.key})`" stroke-width="9" stroke-linecap="round"
                :style="{ filter: `drop-shadow(0 0 4px ${g.c[1]})`, transition: 'all 0.6s' }"/>
              <text x="50" y="52" fill="var(--text)" font-size="16" font-weight="700" text-anchor="middle">
                {{ g.val }}<tspan font-size="10" fill="var(--text2)">%</tspan>
              </text>
            </svg>
            <div class="gauge-lbl" :style="{ color: g.c[1] }">{{ g.label }}</div>
            <div class="gauge-st" :class="g.val>=90?'danger':g.val>=70?'warn':'ok'">
              {{ g.val>=90?'告警':g.val>=70?'偏高':'正常' }}
            </div>
          </div>
        </div>
      </div>

      <!-- 渠道柱状图 -->
      <div class="dd-panel panel-bar">
        <div class="panel-hd">
          <span class="panel-title">流量来源渠道</span>
          <span class="panel-sub">合计 {{ channelTotal.toLocaleString() }}</span>
        </div>
        <div class="panel-bd" ref="barWrap">
          <svg :width="bW" :height="bH" v-if="bW && bigdata.channels">
            <g v-for="(ch, i) in bigdata.channels" :key="ch.name">
              <rect :x="BL" :y="barY(i,bH)" :width="bW-BL-BR" :height="barRowH-3"
                fill="#0d1117" rx="3"/>
              <rect :x="BL" :y="barY(i,bH)"
                :width="Math.max(0,(ch.value/channelMax)*(bW-BL-BR))" :height="barRowH-3"
                :fill="barColors[i%barColors.length]" rx="3"
                :style="{ filter: `drop-shadow(0 0 4px ${barColors[i%barColors.length]}66)`, transition: 'width 0.5s' }"/>
              <text :x="BL-6" :y="barY(i,bH)+(barRowH-3)/2+4"
                fill="var(--text2)" font-size="11" text-anchor="end">{{ ch.name }}</text>
              <text :x="BL+6" :y="barY(i,bH)+(barRowH-3)/2+4"
                :fill="barColors[i%barColors.length]" font-size="11">{{ ch.value.toLocaleString() }}</text>
            </g>
          </svg>
        </div>
      </div>

      <!-- 地区排行 -->
      <div class="dd-panel panel-region">
        <div class="panel-hd"><span class="panel-title">地区流量排行</span></div>
        <div class="panel-bd region-bd">
          <div v-for="(r,i) in bigdata.regions" :key="r.name" class="region-row">
            <span class="rrank" :class="'rk'+(i+1)">{{ i+1 }}</span>
            <span class="rname">{{ r.name }}</span>
            <div class="rbar-wrap">
              <div class="rbar-fill" :style="{ width: (r.value/regionMax*100)+'%', background: barColors[i%barColors.length] }"></div>
            </div>
            <span class="rval">{{ r.value.toLocaleString() }}</span>
          </div>
        </div>
      </div>

      <!-- 事件流 -->
      <div class="dd-panel panel-events">
        <div class="panel-hd">
          <span class="panel-title">实时事件流</span>
          <span class="pulse-dot"></span>
          <span style="color:var(--green);font-size:10px;font-weight:700">LIVE</span>
        </div>
        <div class="panel-bd event-bd">
          <transition-group name="ev-slide" tag="div">
            <div v-for="e in bigdata.bdEvents" :key="e.id" class="ev-row">
              <span class="ev-icon">{{ e.icon }}</span>
              <span class="ev-time">{{ e.time }}</span>
              <span class="ev-badge" :style="{ background: e.color+'22', color: e.color }">
                {{ { order:'订单', user:'用户', alert:'告警', pay:'支付', system:'系统' }[e.type] || e.type }}
              </span>
              <span class="ev-msg">{{ e.msg }}</span>
            </div>
          </transition-group>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent, ref, computed, onMounted, onBeforeUnmount } from 'vue'

export default defineComponent({
  name: 'DataDashboard',
  props: {
    bigdata: { type: Object, default: () => ({}) },
  },
  setup(props) {
    // ── 尺寸响应 ──
    const lineWrap = ref(null), barWrap = ref(null)
    const lW = ref(0), lH = ref(0), bW = ref(0), bH = ref(0)
    let ro = null
    onMounted(() => {
      ro = new ResizeObserver(() => {
        if (lineWrap.value) { lW.value = lineWrap.value.clientWidth; lH.value = lineWrap.value.clientHeight }
        if (barWrap.value)  { bW.value = barWrap.value.clientWidth;  bH.value = barWrap.value.clientHeight }
      })
      if (lineWrap.value) ro.observe(lineWrap.value)
      if (barWrap.value)  ro.observe(barWrap.value)
    })
    onBeforeUnmount(() => ro?.disconnect())

    // ── 常量 ──
    const LP = 38, BL = 60, BR = 8
    const pieColors  = ['var(--cyan)','var(--green)','var(--orange)','var(--purple)','var(--pink)']
    const barColors  = ['#58a6ff','#3fb950','#d29922','#bc8cff','#f778ba','#e6edf3']
    const pieHov = ref(null)

    // ── KPI ──
    const kpiCards = computed(() => {
      const k = props.bigdata.kpi || {}
      const s = props.bigdata.bdSeries || {}
      return [
        { key:'total',    label:'注册用户',   icon:'👥', color:'var(--cyan)',   prefix:'',  formatted: fmt(k.totalUsers),   trend:  2.3, spark: s.users    || [] },
        { key:'online',   label:'在线用户',   icon:'🟢', color:'var(--green)',  prefix:'',  formatted: fmt(k.onlineUsers),  trend:  5.1, spark: s.users    || [] },
        { key:'dau',      label:'日活用户',   icon:'📈', color:'var(--purple)', prefix:'',  formatted: fmt(k.dau),          trend: -1.2, spark: s.requests || [] },
        { key:'revenue',  label:'今日收入',   icon:'💰', color:'var(--orange)', prefix:'¥', formatted: fmt(k.revenue),      trend:  8.7, spark: s.requests || [] },
        { key:'orders',   label:'今日订单',   icon:'🛒', color:'var(--pink)',   prefix:'',  formatted: fmt(k.orders),       trend:  3.4, spark: s.requests || [] },
        { key:'resp',     label:'响应时间',   icon:'⚡', color:'#e6edf3',       prefix:'',  formatted: (k.avgResponse||0)+' ms', trend:-4.2, spark: s.errors || [] },
      ]
    })

    function fmt(v) {
      if (!v) return '0'
      if (v >= 1e8) return (v/1e8).toFixed(2)+'亿'
      if (v >= 1e4) return (v/1e4).toFixed(1)+'万'
      return v.toLocaleString()
    }

    // ── 折线图 ──
    const bdData = computed(() => props.bigdata.bdSeries || { requests:[], errors:[] })
    const lastReq = computed(() => { const a = bdData.value.requests; return a[a.length-1] ?? 0 })
    const lastErr = computed(() => { const a = bdData.value.errors;   return a[a.length-1] ?? 0 })

    function lineMinMax() {
      const all = [...(bdData.value.requests||[]), ...(bdData.value.errors||[])]
      return { min: 0, max: Math.max(...all, 1) * 1.1 }
    }
    function lx(i, len, W) { return LP + (i/(len-1||1))*(W-LP-8) }
    function ly(v) {
      const { min, max } = lineMinMax()
      const PT = 12, PB = 8
      return PT + (1-(v-min)/(max-min||1))*(lH.value-PT-PB)
    }
    const lineYTicks = computed(() => {
      const { min, max } = lineMinMax()
      const step = (max-min)/4
      return [0,1,2,3,4].map(i => Math.round(min+i*step))
    })
    function linePoints(arr, W, H) {
      if (!arr?.length) return ''
      const { min, max } = lineMinMax()
      const PT=12, PB=8
      return arr.map((v,i) => `${lx(i,arr.length,W)},${PT+(1-(v-min)/(max-min||1))*(H-PT-PB)}`).join(' ')
    }
    function lineFillPath(arr, W, H) {
      if (!arr?.length || arr.length < 2) return ''
      const { min, max } = lineMinMax()
      const PT=12, PB=8, bot=H-PB
      const pts = arr.map((v,i) => `L${lx(i,arr.length,W)},${PT+(1-(v-min)/(max-min||1))*(H-PT-PB)}`)
      return `M${lx(0,arr.length,W)},${bot} ${pts.join(' ')} L${lx(arr.length-1,arr.length,W)},${bot} Z`
    }

    // ── 迷你火花图 ──
    function sparkLine(arr, W, H) {
      if (!arr?.length) return ''
      const min = Math.min(...arr), max = Math.max(...arr)
      const range = max-min || 1
      return arr.map((v,i) => `${(i/(arr.length-1||1))*W},${H-((v-min)/range)*H+2}`).join(' ')
    }
    function sparkFill(arr, color, W, H, key) {
      if (!arr?.length || arr.length < 2) return ''
      const min = Math.min(...arr), max = Math.max(...arr)
      const range = max-min || 1
      const pts = arr.map((v,i) => `L${(i/(arr.length-1||1))*W},${H-((v-min)/range)*H+2}`)
      return `M0,${H+4} ${pts.join(' ')} L${W},${H+4} Z`
    }

    // ── 饼图 ──
    const pieTotal = computed(() => (props.bigdata.devices||[]).reduce((s,d)=>s+d.value,0)||1)
    const pieSlices = computed(() => {
      let start = -Math.PI/2
      return (props.bigdata.devices||[]).map(d => {
        const angle = (d.value/pieTotal.value)*Math.PI*2
        const end = start+angle
        const mid = start+angle/2
        const slice = { d: pieArc(70,70,52,28,start,end), tx: Math.cos(mid)*5, ty: Math.sin(mid)*5 }
        start = end
        return slice
      })
    })
    function pieArc(cx,cy,R,r,s,e) {
      const x1=cx+R*Math.cos(s),y1=cy+R*Math.sin(s)
      const x2=cx+R*Math.cos(e),y2=cy+R*Math.sin(e)
      const x3=cx+r*Math.cos(e),y3=cy+r*Math.sin(e)
      const x4=cx+r*Math.cos(s),y4=cy+r*Math.sin(s)
      const lg = e-s>Math.PI?1:0
      return `M${x1},${y1} A${R},${R} 0 ${lg} 1 ${x2},${y2} L${x3},${y3} A${r},${r} 0 ${lg} 0 ${x4},${y4} Z`
    }

    // ── 柱状图 ──
    const channelMax   = computed(() => Math.max(...(props.bigdata.channels||[]).map(c=>c.value),1))
    const channelTotal = computed(() => (props.bigdata.channels||[]).reduce((s,c)=>s+c.value,0))
    const barRowH = computed(() => {
      if (!props.bigdata.channels?.length) return 24
      return Math.max(18, (bH.value-16) / props.bigdata.channels.length)
    })
    function barY(i, H) { return 8 + i * barRowH.value }

    // ── 仪表盘 ──
    const gauges = computed(() => {
      const s = props.bigdata.system || {}
      return [
        { key:'cpu',  label:'CPU',    val: s.cpu     ?? 0, c:['var(--cyan)',  '#58a6ff'] },
        { key:'mem',  label:'内存',   val: s.memory  ?? 0, c:['var(--green)', '#3fb950'] },
        { key:'disk', label:'磁盘',   val: s.disk    ?? 0, c:['var(--purple)','#bc8cff'] },
        { key:'net',  label:'网络',   val: s.network ?? 0, c:['var(--orange)','#d29922'] },
      ]
    })
    function gaugeArc(startDeg, endDeg) {
      const cx=50, cy=58, r=42
      const toRad = d => (d-180)*Math.PI/180
      const x1=cx+r*Math.cos(toRad(startDeg)), y1=cy+r*Math.sin(toRad(startDeg))
      const x2=cx+r*Math.cos(toRad(Math.max(startDeg,endDeg-.01))), y2=cy+r*Math.sin(toRad(Math.max(startDeg,endDeg-.01)))
      const lg = endDeg-startDeg>180?1:0
      return `M${x1},${y1} A${r},${r} 0 ${lg} 1 ${x2},${y2}`
    }

    // ── 地区 ──
    const regionMax = computed(() => Math.max(...(props.bigdata.regions||[]).map(r=>r.value),1))

    return {
      lineWrap, barWrap, lW, lH, bW, bH, LP, BL, BR,
      pieColors, barColors, pieHov, pieSlices, pieTotal,
      kpiCards, bdData, lastReq, lastErr, lineYTicks,
      linePoints, lineFillPath, sparkLine, sparkFill, ly,
      channelMax, channelTotal, barRowH, barY,
      gauges, gaugeArc,
      regionMax,
    }
  }
})
</script>

<style scoped>
/* 整体容器 — 填满标签页内容区，可滚动 */
.dd-wrap {
  position: absolute;
  inset: 0;
  overflow-y: auto;
  background: var(--bg);
  padding: 10px 12px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* ── KPI ── */
.dd-kpi {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
  flex-shrink: 0;
}
.kpi-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-top: 2px solid var(--kc, var(--cyan));
  border-radius: 6px;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  position: relative;
  overflow: hidden;
}
.kpi-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at top left, color-mix(in srgb, var(--kc, var(--cyan)) 6%, transparent), transparent 60%);
  pointer-events: none;
}
.kpi-icon { font-size: 24px; flex-shrink: 0; }
.kpi-body { flex: 1; min-width: 0; }
.kpi-lbl  { font-size: 10px; color: var(--text2); text-transform: uppercase; letter-spacing: .5px; }
.kpi-val  { font-size: 18px; font-weight: 700; color: var(--text); line-height: 1.2; white-space: nowrap; }
.kpi-unit { font-size: 11px; color: var(--text2); font-weight: 400; }
.kpi-trend { font-size: 10px; margin-top: 1px; }
.kpi-trend.up { color: var(--green); }
.kpi-trend.dn { color: var(--red);   }
.kpi-spark { flex-shrink: 0; }

/* ── 主网格 ── */
.dd-grid {
  display: grid;
  grid-template-columns: 1fr 190px 190px;
  grid-template-rows: 210px 200px;
  gap: 8px;
  flex: 1;
  min-height: 420px;
}

.dd-panel {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-line   { grid-column: 1; grid-row: 1; }
.panel-pie    { grid-column: 2; grid-row: 1; }
.panel-gauge  { grid-column: 3; grid-row: 1; }
.panel-bar    { grid-column: 1; grid-row: 2; }
.panel-region { grid-column: 2; grid-row: 2; }
.panel-events { grid-column: 3; grid-row: 2; }

.panel-hd {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px 6px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.panel-title { font-size: 12px; font-weight: 600; color: var(--text); flex: 1; }
.panel-sub   { font-size: 11px; color: var(--text2); }
.legend-item { font-size: 11px; }

.panel-bd { flex: 1; overflow: hidden; }
svg { display: block; }

/* 饼图 */
.pie-bd { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 4px; }
.pie-legend { display: flex; flex-direction: column; gap: 5px; }
.pie-leg-row { display: flex; align-items: center; gap: 6px; cursor: pointer; padding: 2px 4px; border-radius: 4px; transition: background .15s; }
.pie-leg-row.active { background: var(--border); }
.leg-dot  { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.leg-name { font-size: 11px; color: var(--text2); flex: 1; }
.leg-val  { font-size: 11px; font-weight: 700; }

/* 仪表盘 */
.gauge-bd {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  padding: 6px;
}
.gauge-item { display: flex; flex-direction: column; align-items: center; background: #0d1117; border: 1px solid var(--border); border-radius: 6px; padding: 4px 2px 3px; }
.gauge-lbl  { font-size: 10px; font-weight: 600; margin-top: 1px; }
.gauge-st   { font-size: 9px; padding: 1px 6px; border-radius: 8px; margin-top: 1px; }
.gauge-st.ok     { background: #122819; color: var(--green); }
.gauge-st.warn   { background: #1f1a0a; color: var(--orange); }
.gauge-st.danger { background: #1e0a0a; color: var(--red); }

/* 地区 */
.region-bd { padding: 8px 12px; display: flex; flex-direction: column; gap: 5px; overflow-y: auto; }
.region-row { display: flex; align-items: center; gap: 8px; }
.rrank { width: 17px; height: 17px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; flex-shrink: 0; background: var(--border); color: var(--text2); }
.rrank.rk1 { background: #d29922; color: #000; }
.rrank.rk2 { background: #8b949e; color: #000; }
.rrank.rk3 { background: #8b6914; color: #fff; }
.rname { font-size: 11px; color: var(--text2); width: 26px; flex-shrink: 0; }
.rbar-wrap { flex: 1; height: 7px; background: #0d1117; border-radius: 3px; overflow: hidden; }
.rbar-fill { height: 100%; border-radius: 3px; transition: width .6s; }
.rval { font-size: 10px; color: var(--text2); width: 40px; text-align: right; flex-shrink: 0; }

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
  padding: 5px 12px; border-bottom: 1px solid #0d1117; font-size: 11px;
  transition: background .15s;
}
.ev-row:hover { background: #161b22; }
.ev-icon  { font-size: 13px; flex-shrink: 0; width: 18px; text-align: center; }
.ev-time  { color: var(--text2); flex-shrink: 0; font-size: 10px; width: 54px; }
.ev-badge { flex-shrink: 0; font-size: 9px; font-weight: 700; padding: 1px 5px; border-radius: 3px; width: 32px; text-align: center; }
.ev-msg   { color: var(--text2); flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ev-slide-enter-active { transition: all .25s ease; }
.ev-slide-enter-from   { opacity: 0; transform: translateX(-8px); }

/* ══ 响应式 ══ */
@media (max-width: 1100px) {
  .dd-kpi { grid-template-columns: repeat(3, 1fr); }
  .dd-grid {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 210px 200px 200px;
  }
  .panel-line   { grid-column: 1 / -1; grid-row: 1; }
  .panel-pie    { grid-column: 1; grid-row: 2; }
  .panel-gauge  { grid-column: 2; grid-row: 2; }
  .panel-bar    { grid-column: 1 / -1; grid-row: 3; }
  .panel-region { display: none; }
  .panel-events { grid-column: 1 / -1; grid-row: 4; height: 180px; }
}

@media (max-width: 640px) {
  .dd-wrap { padding: 6px 8px 8px; gap: 6px; }
  .dd-kpi { grid-template-columns: repeat(2, 1fr); gap: 6px; }
  .kpi-card { padding: 8px 10px; }
  .kpi-icon { font-size: 20px; }
  .kpi-val  { font-size: 15px; }
  .kpi-spark { display: none; }
  .dd-grid {
    display: flex;
    flex-direction: column;
    min-height: unset;
  }
  .panel-line   { height: 200px; }
  .panel-bar    { height: 190px; }
  .panel-pie    { height: 200px; }
  .panel-gauge  { height: 220px; }
  .panel-region { height: 190px; display: flex; }
  .panel-events { height: 220px; }
}
</style>
