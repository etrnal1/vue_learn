<template>
  <div class="dashboard">
    <!-- ── 顶部 Header ── -->
    <header class="header">
      <div class="header-left">
        <div class="logo">
          <span class="logo-icon">◈</span>
          <span class="logo-text">DataVision</span>
          <span class="logo-sub">大数据实时看板</span>
        </div>
        <div :class="['ws-status', wsState]">
          <span class="ws-dot"></span>
          {{ wsLabel }}
        </div>
      </div>

      <div class="header-center">
        <div class="header-stat" v-for="h in headerStats" :key="h.label">
          <span class="hs-val" :style="{ color: h.color }">{{ h.val }}</span>
          <span class="hs-lbl">{{ h.label }}</span>
        </div>
      </div>

      <div class="header-right">
        <div class="clock">{{ clock }}</div>
        <div class="date-str">{{ dateStr }}</div>
      </div>
    </header>

    <!-- ── KPI 行 ── -->
    <section class="kpi-row">
      <KpiCard
        label="注册用户总量" :value="kpi.totalUsers" :trend="2.3"
        color="#00d4ff" icon="👥" format="number" :spark="series.users.slice(-20)" />
      <KpiCard
        label="实时在线用户" :value="kpi.onlineUsers" :trend="5.1"
        color="#00e676" icon="🟢" format="number" :spark="series.users.slice(-20)" />
      <KpiCard
        label="今日活跃用户" :value="kpi.dau" :trend="-1.2"
        color="#bd7dff" icon="📈" format="number" :spark="series.requests.slice(-20)" />
      <KpiCard
        label="今日累计收入" :value="kpi.revenue" :trend="8.7"
        color="#ff9800" icon="💰" prefix="¥" format="currency" :spark="series.requests.slice(-20)" />
      <KpiCard
        label="今日订单数" :value="kpi.orders" :trend="3.4"
        color="#ff6ec7" icon="🛒" format="number" :spark="series.requests.slice(-20)" />
      <KpiCard
        label="平均响应时间" :value="kpi.avgResponse" :trend="-4.2"
        color="#ffe600" icon="⚡" format="time" :spark="series.requests.slice(-20)" />
    </section>

    <!-- ── 主内容区 ── -->
    <div class="main-grid">
      <!-- 折线图（大） -->
      <div class="panel panel-line">
        <LineChart
          title="实时请求 / 错误 / 在线用户趋势（60s）"
          :data="{ requests: series.requests, errors: series.errors }"
          :series="[
            { key: 'requests', label: '请求量/s', color: '#00d4ff' },
            { key: 'errors',   label: '错误数/s', color: '#ff4444' },
          ]"
        />
      </div>

      <!-- 右侧：饼图 + 仪表盘 -->
      <div class="panel panel-pie">
        <PieChart title="设备类型分布" :items="devices" />
      </div>

      <div class="panel panel-gauge">
        <div class="panel-title">系统资源监控</div>
        <GaugeChart :system="system" />
      </div>

      <!-- 柱状图 -->
      <div class="panel panel-bar">
        <BarChart title="流量来源渠道" :items="channels" />
      </div>

      <!-- 地区分布 -->
      <div class="panel panel-region">
        <div class="panel-inner">
          <div class="panel-title">地区流量分布</div>
          <div class="region-list">
            <div v-for="(r, i) in regions" :key="r.name" class="region-row">
              <span class="region-rank" :class="'rank-'+Math.min(i+1,4)">{{ i+1 }}</span>
              <span class="region-name">{{ r.name }}</span>
              <div class="region-bar-wrap">
                <div class="region-bar-fill"
                  :style="{ width: (r.value / maxRegion * 100) + '%', background: regionColors[i % regionColors.length] }">
                </div>
              </div>
              <span class="region-val">{{ r.value.toLocaleString() }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 事件流 -->
      <div class="panel panel-events">
        <EventStream :events="events" />
      </div>
    </div>

    <!-- ── 底部状态栏 ── -->
    <footer class="footer">
      <span>WebSocket 推送频率: 1次/秒</span>
      <span>数据点: {{ series.requests.length }}/60</span>
      <span>最后更新: {{ lastUpdateStr }}</span>
      <span>延迟: {{ latency }}ms</span>
      <span class="footer-tag">DataVision v1.0 · Powered by Vue 3 + WebSocket</span>
    </footer>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import KpiCard     from './components/KpiCard.vue'
import LineChart   from './components/LineChart.vue'
import BarChart    from './components/BarChart.vue'
import PieChart    from './components/PieChart.vue'
import GaugeChart  from './components/GaugeChart.vue'
import EventStream from './components/EventStream.vue'

export default {
  name: 'App',
  components: { KpiCard, LineChart, BarChart, PieChart, GaugeChart, EventStream },

  setup() {
    // ── 状态 ──
    const wsState  = ref('connecting')
    const wsLabel  = computed(() => ({
      connecting: '连接中...', connected: '实时连接', disconnected: '已断开'
    }[wsState.value]))

    const kpi      = ref({ totalUsers:0, onlineUsers:0, dau:0, revenue:0, orders:0, avgResponse:0 })
    const series   = ref({ requests:[], errors:[], users:[] })
    const channels = ref([])
    const devices  = ref([])
    const regions  = ref([])
    const system   = ref({})
    const events   = ref([])
    const lastUpdate = ref(null)
    const latency    = ref(0)

    // ── 时钟 ──
    const clock   = ref('')
    const dateStr = ref('')
    function updateClock() {
      const d = new Date()
      clock.value = d.toLocaleTimeString('zh-CN', { hour12: false })
      dateStr.value = d.toLocaleDateString('zh-CN', { year:'numeric', month:'long', day:'numeric', weekday:'short' })
    }
    updateClock()
    const clockTimer = setInterval(updateClock, 1000)

    // ── 派生数据 ──
    const maxRegion = computed(() => Math.max(...(regions.value.map(r => r.value)), 1))
    const lastUpdateStr = computed(() => {
      if (!lastUpdate.value) return '--'
      const d = new Date(lastUpdate.value)
      return d.toLocaleTimeString('zh-CN', { hour12: false })
    })

    const headerStats = computed(() => {
      const reqs = series.value.requests
      const errs = series.value.errors
      const last  = n => n[n.length - 1] ?? 0
      const errRate = reqs.length ? ((last(errs) / Math.max(last(reqs), 1)) * 100).toFixed(2) : '0.00'
      return [
        { label: '当前QPS',  val: (last(reqs)).toLocaleString(), color: '#00d4ff' },
        { label: '错误率',   val: errRate + '%',                  color: errRate > 2 ? '#ff4444' : '#00e676' },
        { label: '在线节点', val: '8/8',                          color: '#00e676' },
        { label: '告警数',   val: events.value.filter(e => e.type === 'alert').length, color: '#ff9800' },
      ]
    })

    // ── WebSocket ──
    let ws = null, reconnectTimer = null, sentAt = 0

    function connect() {
      wsState.value = 'connecting'
      ws = new WebSocket(`ws://${location.hostname}:3200`)
      ws.onopen = () => { wsState.value = 'connected'; sentAt = Date.now() }
      ws.onmessage = (e) => {
        latency.value = Date.now() - sentAt
        sentAt = Date.now()
        const d = JSON.parse(e.data)
        kpi.value      = d.kpi      || kpi.value
        series.value   = d.series   || series.value
        channels.value = d.channels || []
        devices.value  = d.devices  || []
        regions.value  = d.regions  || []
        system.value   = d.system   || {}
        events.value   = d.events   || []
        lastUpdate.value = d.timestamp
      }
      ws.onclose = () => { wsState.value = 'disconnected'; reconnectTimer = setTimeout(connect, 3000) }
      ws.onerror = () => ws.close()
    }

    onMounted(connect)
    onUnmounted(() => {
      clearTimeout(reconnectTimer)
      clearInterval(clockTimer)
      ws?.close()
    })

    return {
      wsState, wsLabel,
      kpi, series, channels, devices, regions, system, events,
      lastUpdate, lastUpdateStr, latency,
      maxRegion, headerStats, clock, dateStr,
      regionColors: ['#00d4ff','#00e676','#ff9800','#bd7dff','#ff6ec7','#ffe600'],
    }
  }
}
</script>

<style scoped>
.dashboard {
  display: grid;
  grid-template-rows: 52px 96px 1fr 28px;
  height: 100vh;
  gap: 0;
  background: var(--bg);
  overflow: hidden;
}

/* ── Header ── */
.header {
  display: flex;
  align-items: center;
  padding: 0 20px;
  background: var(--card);
  border-bottom: 1px solid var(--border);
  gap: 20px;
}
.header-left  { display: flex; align-items: center; gap: 16px; }
.logo         { display: flex; align-items: center; gap: 8px; }
.logo-icon    { font-size: 20px; color: #00d4ff; filter: drop-shadow(0 0 6px #00d4ff); }
.logo-text    { font-size: 16px; font-weight: 800; color: #d4e6ff; letter-spacing: 1px; }
.logo-sub     { font-size: 11px; color: var(--text2); border-left: 1px solid var(--border); padding-left: 10px; margin-left: 2px; }

.ws-status    { display: flex; align-items: center; gap: 6px; font-size: 11px; }
.ws-dot       { width: 7px; height: 7px; border-radius: 50%; }
.ws-status.connected    .ws-dot { background: #00e676; box-shadow: 0 0 6px #00e676; }
.ws-status.connecting   .ws-dot { background: #ff9800; animation: pulse 1s infinite; }
.ws-status.disconnected .ws-dot { background: #ff4444; }
.ws-status.connected    { color: #00e676; }
.ws-status.connecting   { color: #ff9800; }
.ws-status.disconnected { color: #ff4444; }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }

.header-center { flex: 1; display: flex; justify-content: center; gap: 32px; }
.header-stat   { display: flex; flex-direction: column; align-items: center; }
.hs-val        { font-size: 18px; font-weight: 700; line-height: 1.2; }
.hs-lbl        { font-size: 10px; color: var(--text2); }

.header-right  { text-align: right; }
.clock         { font-size: 22px; font-weight: 700; color: #d4e6ff; line-height: 1.1; }
.date-str      { font-size: 10px; color: var(--text2); }

/* ── KPI ── */
.kpi-row {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
  padding: 8px 12px 4px;
  background: var(--bg);
}

/* ── 主网格 ── */
.main-grid {
  display: grid;
  grid-template-columns: 1fr 220px 220px;
  grid-template-rows: 1fr 1fr;
  gap: 8px;
  padding: 4px 12px 4px;
  overflow: hidden;
}

.panel { overflow: hidden; display: flex; flex-direction: column; }

.panel-line   { grid-column: 1; grid-row: 1; }
.panel-pie    { grid-column: 2; grid-row: 1; }
.panel-gauge  {
  grid-column: 3; grid-row: 1;
  background: var(--card); border: 1px solid var(--border); border-radius: 8px;
  display: flex; flex-direction: column; overflow: hidden;
}
.panel-bar    { grid-column: 1; grid-row: 2; }
.panel-region {
  grid-column: 2; grid-row: 2;
  background: var(--card); border: 1px solid var(--border); border-radius: 8px; overflow: hidden;
}
.panel-events { grid-column: 3; grid-row: 2; }

.panel-title {
  font-size: 12px; font-weight: 600; color: var(--text);
  padding: 10px 14px 8px; border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.panel-inner { display: flex; flex-direction: column; height: 100%; }

/* 地区列表 */
.region-list { flex: 1; overflow-y: auto; padding: 8px 12px; display: flex; flex-direction: column; gap: 6px; }
.region-row  { display: flex; align-items: center; gap: 8px; }
.region-rank {
  width: 18px; height: 18px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 700; flex-shrink: 0;
  background: var(--card2); color: var(--text2);
}
.region-rank.rank-1 { background: #ffe600; color: #000; }
.region-rank.rank-2 { background: #aab8c2; color: #000; }
.region-rank.rank-3 { background: #cd7f32; color: #fff; }
.region-name { font-size: 12px; color: var(--text2); width: 28px; flex-shrink: 0; }
.region-bar-wrap {
  flex: 1; height: 8px; background: #0a1120; border-radius: 4px; overflow: hidden;
}
.region-bar-fill {
  height: 100%; border-radius: 4px;
  transition: width 0.6s ease;
}
.region-val { font-size: 11px; color: var(--text2); width: 44px; text-align: right; flex-shrink: 0; }

/* ── Footer ── */
.footer {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 0 16px;
  background: var(--card);
  border-top: 1px solid var(--border);
  font-size: 11px;
  color: var(--text3);
}
.footer-tag { margin-left: auto; color: var(--text2); }
</style>
