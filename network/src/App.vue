<template>
  <div class="app">
    <!-- 告警浮动 -->
    <transition-group name="alert-slide" tag="div" class="alert-stack">
      <div v-for="a in alerts" :key="a.id" class="alert-item" @click="dismissAlert(a.id)">
        <span class="alert-icon">⚠</span>
        <span class="alert-msg">{{ a.msg }}</span>
        <span class="alert-close">×</span>
      </div>
    </transition-group>

    <!-- 顶部状态栏 -->
    <header class="header">
      <div class="header-left">
        <span class="logo">⬡ NetFlow</span>
        <div :class="['ws-dot', wsState]" :title="wsLabel" />
        <span class="ws-label">{{ replayMode ? '回放模式' : wsLabel }}</span>
      </div>
      <div class="stats-bar">
        <stat-chip label="总连接" :value="displayStats.total || 0" color="cyan" />
        <stat-chip label="已建立" :value="displayStats.established || 0" color="green" />
        <stat-chip label="TCP" :value="displayStats.byProto?.TCP || 0" color="purple" />
        <stat-chip label="UDP" :value="displayStats.byProto?.UDP || 0" color="orange" />
        <stat-chip label="进程" :value="Object.keys(displayStats.byProcess || {}).length" color="pink" />
      </div>
      <!-- 趋势迷你图 (多折线) -->
      <div class="trend-wrap" title="过去2分钟连接数趋势">
        <svg class="trend-svg" width="140" height="32">
          <polyline v-if="trendFill" :points="trendFill" fill="#58a6ff12" stroke="none" />
          <polyline v-if="trendPath" :points="trendPath" fill="none" stroke="#58a6ff" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" />
          <polyline v-if="trendEstPath" :points="trendEstPath" fill="none" stroke="#3fb950" stroke-width="1" stroke-linejoin="round" stroke-dasharray="3,2" />
        </svg>
        <div class="trend-legend">
          <span style="color:#58a6ff">— 总</span>
          <span style="color:#3fb950">- 建立</span>
        </div>
      </div>
      <div class="header-right">
        <span class="refresh-badge" v-if="lastUpdate && !replayMode">{{ timeAgo }}</span>
        <span class="replay-badge" v-if="replayMode">{{ replayTimeLabel }}</span>
      </div>
    </header>

    <!-- 标签页 -->
    <nav class="tabs">
      <button
        v-for="t in tabs" :key="t.id"
        :class="['tab', { active: activeTab === t.id }]"
        @click="activeTab = t.id"
      >
        <span>{{ t.icon }}</span> {{ t.label }}
        <span v-if="t.id === 'listeners' && listeners.length" class="tab-badge">{{ listeners.length }}</span>
      </button>
    </nav>

    <!-- 主内容区 -->
    <main class="content">
      <NodeGraph   v-show="activeTab === 'graph'"   :connections="displayConnections" />
      <SankeyChart v-show="activeTab === 'sankey'"  :connections="displayConnections" />
      <ConnectionList
        v-show="activeTab === 'list'"
        :connections="displayConnections"
        :history="history"
        :new-ids="newIds"
        @export-csv="exportCSV"
        @exportCsv="exportCSV"
        @proc-click="selectedProc = $event"
      />
      <ChainView v-show="activeTab === 'chain'" :chains="displayChains" />
      <MapView
        v-show="activeTab === 'map'"
        :connections="displayConnections"
        :history="history"
        :home-geo="homeGeo"
        :chains="displayChains"
      />
      <ListenersView  v-show="activeTab === 'listeners'" :listeners="listeners" />
      <BandwidthChart v-show="activeTab === 'bandwidth'" :bw-history="bwHistory" />
      <HeatMap        v-show="activeTab === 'heatmap'"   :bw-history="bwHistory" />
      <DataDashboard  v-show="activeTab === 'bigdata'"   :bigdata="bigdata" />
    </main>

    <!-- 进程详情侧栏 -->
    <ProcessDetail
      :proc="selectedProc"
      :connections="displayConnections"
      :history="history"
      @close="selectedProc = null"
    />

    <!-- 轨迹回放控制条 -->
    <ReplayPanel
      :replay-mode="replayMode"
      :playing="replayPlaying"
      :speed="replaySpeed"
      :current-idx="replayIdx"
      :snapshot-count="snapshotCount"
      :snapshot-meta="snapshotMeta"
      @enter-replay="enterReplay"
      @exit-replay="exitReplay"
      @toggle-play="toggleReplayPlay"
      @step="stepReplay"
      @seek="seekReplay"
      @set-speed="replaySpeed = $event"
    />
  </div>
</template>

<script>
import { defineComponent, ref, computed, onMounted, onUnmounted, h, watch } from 'vue'
import NodeGraph from './components/NodeGraph.vue'
import SankeyChart from './components/SankeyChart.vue'
import ConnectionList from './components/ConnectionList.vue'
import ChainView from './components/ChainView.vue'
import MapView from './components/MapView.vue'
import ReplayPanel from './components/ReplayPanel.vue'
import BandwidthChart from './components/BandwidthChart.vue'
import HeatMap from './components/HeatMap.vue'
import ProcessDetail from './components/ProcessDetail.vue'
import DataDashboard from './components/DataDashboard.vue'

// 监听端口视图（内联简单组件）
const ListenersView = defineComponent({
  name: 'ListenersView',
  props: { listeners: { type: Array, default: () => [] } },
  render() {
    if (!this.listeners.length) {
      return h('div', { style: 'display:flex;align-items:center;justify-content:center;height:100%;color:#8b949e;font-size:14px' }, '暂无监听端口数据')
    }
    const rows = this.listeners.map(l =>
      h('tr', { class: 'conn-row' }, [
        h('td', { class: 'td-process', style: 'display:flex;align-items:center;gap:6px;padding:6px 12px' }, [
          h('span', { style: `width:8px;height:8px;border-radius:50%;background:#58a6ff;flex-shrink:0;display:inline-block` }),
          l.process
        ]),
        h('td', { style: 'padding:6px 12px;color:#8b949e' }, l.pid),
        h('td', { style: 'padding:6px 12px' }, h('span', { style: 'background:#1e3a5f;color:#58a6ff;padding:1px 6px;border-radius:4px;font-size:10px;font-weight:700' }, l.proto || 'TCP')),
        h('td', { style: 'padding:6px 12px;color:#8b949e' }, l.localAddr),
        h('td', { style: 'padding:6px 12px' }, h('span', { style: 'background:#1e3050;color:#8b949e;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700' }, l.localPort)),
      ])
    )
    return h('div', { style: 'position:absolute;inset:0;overflow:auto;background:var(--bg)' }, [
      h('table', { style: 'width:100%;border-collapse:collapse;font-size:12px' }, [
        h('thead', {}, h('tr', {}, [
          h('th', { style: 'position:sticky;top:0;background:#1c2333;color:#8b949e;padding:8px 12px;text-align:left;border-bottom:1px solid #30363d' }, '进程'),
          h('th', { style: 'position:sticky;top:0;background:#1c2333;color:#8b949e;padding:8px 12px;text-align:left;border-bottom:1px solid #30363d' }, 'PID'),
          h('th', { style: 'position:sticky;top:0;background:#1c2333;color:#8b949e;padding:8px 12px;text-align:left;border-bottom:1px solid #30363d' }, '协议'),
          h('th', { style: 'position:sticky;top:0;background:#1c2333;color:#8b949e;padding:8px 12px;text-align:left;border-bottom:1px solid #30363d' }, '监听地址'),
          h('th', { style: 'position:sticky;top:0;background:#1c2333;color:#8b949e;padding:8px 12px;text-align:left;border-bottom:1px solid #30363d' }, '端口'),
        ])),
        h('tbody', {}, rows)
      ])
    ])
  }
})

const StatChip = defineComponent({
  props: { label: String, value: Number, color: String },
  render() {
    return h('div', { class: 'stat-chip' }, [
      h('span', { class: 'stat-val', style: { color: `var(--${this.color})` } }, this.value),
      h('span', { class: 'stat-lbl' }, this.label)
    ])
  }
})

const DANGER_PORTS = new Set([21,22,23,25,135,139,445,1433,3306,3389,4444,5900,6379,6667,27017])
const HIGH_RISK_COUNTRIES = new Set(['KP','IR','RU']) // 仅示例

export default {
  name: 'App',
  components: { NodeGraph, SankeyChart, ConnectionList, ChainView, MapView, ReplayPanel, BandwidthChart, HeatMap, ProcessDetail, ListenersView, StatChip, DataDashboard },

  setup() {
    // 实时数据
    const connections = ref([])
    const chains = ref([])
    const history = ref([])
    const trend = ref([])
    const stats = ref({})
    const listeners = ref([])
    const homeGeo = ref(null)
    const bwHistory = ref({})
    const selectedProc = ref(null)
    const newIds = ref(new Set())
    const bigdata = ref({})
    const lastUpdate = ref(null)
    const snapshotCount = ref(0)
    const wsState = ref('disconnected')
    const wsLabel = computed(() => ({
      connecting: '连接中...', connected: '实时监控中', disconnected: '已断开'
    }[wsState.value]))

    // 告警
    const alerts = ref([])
    let alertId = 0
    function addAlert(msg) {
      const id = ++alertId
      alerts.value.unshift({ id, msg })
      if (alerts.value.length > 5) alerts.value.pop()
      setTimeout(() => dismissAlert(id), 6000)
    }
    function dismissAlert(id) { alerts.value = alerts.value.filter(a => a.id !== id) }

    // 回放状态
    const replayMode = ref(false)
    const replayPlaying = ref(false)
    const replaySpeed = ref(1)
    const replayIdx = ref(0)
    const snapshotMeta = ref([])
    const replayData = ref(null)
    let replayTimer = null

    const replayTimeLabel = computed(() => {
      const m = snapshotMeta.value[replayIdx.value]
      if (!m) return ''
      const d = new Date(m.t)
      return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`
    })

    async function fetchSnapshot(idx) {
      try {
        const res = await fetch(`/api/replay/${idx}`)
        if (!res.ok) return null
        return await res.json()
      } catch { return null }
    }

    async function enterReplay() {
      try {
        const res = await fetch('/api/replay/meta')
        snapshotMeta.value = await res.json()
        if (!snapshotMeta.value.length) return
        replayIdx.value = snapshotMeta.value.length - 1
        replayMode.value = true
        replayData.value = await fetchSnapshot(replayIdx.value)
      } catch (e) { console.error('replay error', e) }
    }

    function exitReplay() {
      replayMode.value = false
      replayPlaying.value = false
      replayData.value = null
      clearTimeout(replayTimer)
    }

    async function seekReplay(idx) {
      replayIdx.value = Math.max(0, Math.min(idx, snapshotMeta.value.length - 1))
      replayData.value = await fetchSnapshot(replayIdx.value)
    }

    async function stepReplay(delta) {
      await seekReplay(replayIdx.value + delta)
    }

    function toggleReplayPlay() {
      replayPlaying.value = !replayPlaying.value
      if (replayPlaying.value) scheduleNext()
      else clearTimeout(replayTimer)
    }

    function scheduleNext() {
      const ms = 2000 / replaySpeed.value
      replayTimer = setTimeout(async () => {
        if (!replayPlaying.value) return
        if (replayIdx.value >= snapshotMeta.value.length - 1) {
          replayPlaying.value = false
          return
        }
        await stepReplay(1)
        scheduleNext()
      }, ms)
    }

    watch(replayPlaying, (v) => { if (!v) clearTimeout(replayTimer) })

    // 显示数据：回放模式下用快照数据，否则用实时数据
    const displayConnections = computed(() => replayMode.value ? (replayData.value?.connections || []) : connections.value)
    const displayChains = computed(() => replayMode.value ? (replayData.value?.chains || []) : chains.value)
    const displayStats = computed(() => replayMode.value ? (replayData.value?.stats || {}) : stats.value)

    const activeTab = ref('graph')
    const tabs = [
      { id: 'graph',     icon: '◉', label: '节点流向图' },
      { id: 'sankey',    icon: '≋', label: '桑基流量图' },
      { id: 'list',      icon: '≡', label: '连接列表'   },
      { id: 'chain',     icon: '⛓', label: '链路追踪'   },
      { id: 'map',       icon: '🗺', label: '世界地图'   },
      { id: 'listeners', icon: '👂', label: '监听端口'   },
      { id: 'bandwidth', icon: '📊', label: '带宽趋势'   },
      { id: 'heatmap',   icon: '🔥', label: '热力图'     },
      { id: 'bigdata',   icon: '📡', label: '大数据看板' },
    ]

    const timeAgo = computed(() => {
      if (!lastUpdate.value) return ''
      const s = Math.round((Date.now() - lastUpdate.value) / 1000)
      return s < 5 ? '刚刚更新' : `${s}s 前`
    })

    // 趋势图（总连接 + 已建立）
    function makePath(pts, key, W, H) {
      if (pts.length < 2) return ''
      const max = Math.max(...pts.map(p => p[key] ?? p.count ?? 0), 1)
      return pts.map((p, i) => {
        const x = (i / (pts.length - 1)) * W
        const y = H - ((p[key] ?? p.count ?? 0) / max) * H + 2
        return `${x},${y}`
      }).join(' ')
    }
    const trendPath = computed(() => makePath(trend.value, 'count', 140, 28))
    const trendEstPath = computed(() => makePath(trend.value, 'established', 140, 28))
    const trendFill = computed(() => trendPath.value ? `0,30 ${trendPath.value} 140,30` : '')

    // CSV 导出
    function exportCSV(rows) {
      const headers = ['进程','PID','协议','本地地址','本地端口','远端地址','远端端口','状态','时长(ms)','域名','国家','城市']
      const lines = [headers.join(','), ...rows.map(c => [
        c.process, c.pid, c.proto, c.localAddr, c.localPort,
        c.remoteAddr, c.remotePort, c.state, c.duration || 0,
        c.domain || '', c.geo?.countryZh || '', c.geo?.city || ''
      ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(','))]
      const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `netflow-${new Date().toISOString().slice(0,19).replace(/[T:]/g,'-')}.csv`
      a.click()
    }

    let ws = null
    let reconnectTimer = null

    function connect() {
      wsState.value = 'connecting'
      ws = new WebSocket(`ws://${location.hostname}:3100`)
      ws.onopen = () => { wsState.value = 'connected' }
      ws.onmessage = (e) => {
        const data = JSON.parse(e.data)

        // 告警检测（仅实时模式）
        if (!replayMode.value) {
          for (const c of data.newConns || []) {
            if (DANGER_PORTS.has(Number(c.remotePort))) {
              addAlert(`${c.process} 连接到高危端口 :${c.remotePort} (${c.remoteAddr})`)
            } else if (HIGH_RISK_COUNTRIES.has(c.geo?.country)) {
              addAlert(`${c.process} 连接到 ${c.geo.flag} ${c.geo.countryZh} (${c.remoteAddr})`)
            }
          }
        }

        connections.value = data.connections || []
        chains.value = data.chains || []
        history.value = data.history || []
        trend.value = data.trend || []
        stats.value = data.stats || {}
        listeners.value = data.listeners || []
        if (data.homeGeo) homeGeo.value = data.homeGeo
        if (data.snapshotCount) snapshotCount.value = data.snapshotCount
        if (data.bwHistory) bwHistory.value = data.bwHistory
        if (data.bigdata) bigdata.value = data.bigdata
        lastUpdate.value = data.timestamp

        const ids = new Set((data.newConns || []).map(c => c.id))
        newIds.value = ids
        if (ids.size > 0) setTimeout(() => { newIds.value = new Set() }, 2500)
      }
      ws.onclose = () => { wsState.value = 'disconnected'; reconnectTimer = setTimeout(connect, 3000) }
      ws.onerror = () => { ws.close() }
    }

    onMounted(connect)
    onUnmounted(() => { clearTimeout(reconnectTimer); clearTimeout(replayTimer); ws?.close() })

    return {
      connections, chains, history, trend, stats, listeners, homeGeo, bwHistory,
      bigdata, selectedProc,
      displayConnections, displayChains, displayStats,
      newIds, lastUpdate, wsState, wsLabel, timeAgo,
      activeTab, tabs, trendPath, trendEstPath, trendFill,
      // 回放
      replayMode, replayPlaying, replaySpeed, replayIdx,
      snapshotCount, snapshotMeta, replayTimeLabel,
      enterReplay, exitReplay, seekReplay, stepReplay, toggleReplayPlay,
      // 告警
      alerts, dismissAlert,
      // 导出
      exportCSV,
    }
  }
}
</script>

<style scoped>
.app { display: flex; flex-direction: column; height: 100vh; }

.header {
  display: flex; align-items: center; gap: 16px;
  padding: 8px 16px;
  background: var(--card); border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.header-left { display: flex; align-items: center; gap: 8px; min-width: 160px; }
.logo { font-size: 15px; font-weight: 700; color: var(--cyan); letter-spacing: 1px; }

.ws-dot { width: 8px; height: 8px; border-radius: 50%; transition: background 0.3s; }
.ws-dot.connected    { background: var(--green); box-shadow: 0 0 6px var(--green); }
.ws-dot.connecting   { background: var(--orange); animation: pulse 1s infinite; }
.ws-dot.disconnected { background: var(--red); }
@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.3; } }

.ws-label { color: var(--text2); font-size: 11px; }
.stats-bar { display: flex; gap: 12px; flex: 1; justify-content: center; }
.header-right { min-width: 90px; text-align: right; }
.refresh-badge { color: var(--text2); font-size: 11px; }
.replay-badge { color: var(--orange); font-size: 11px; font-weight: 600; }

.trend-wrap {
  display: flex; align-items: center; gap: 6px;
  background: #0d1520; border: 1px solid var(--border);
  border-radius: 6px; padding: 2px 8px;
}
.trend-svg { display: block; }
.trend-legend { display: flex; flex-direction: column; gap: 1px; font-size: 9px; white-space: nowrap; }

.tabs {
  display: flex; background: var(--card);
  border-bottom: 1px solid var(--border);
  padding: 0 16px; flex-shrink: 0;
}
.tab {
  background: none; border: none; color: var(--text2);
  padding: 8px 14px; cursor: pointer;
  border-bottom: 2px solid transparent;
  font-size: 13px; font-family: inherit;
  transition: all 0.15s;
  display: flex; align-items: center; gap: 6px;
}
.tab:hover { color: var(--text); }
.tab.active { color: var(--cyan); border-bottom-color: var(--cyan); }
.tab-badge {
  background: var(--cyan); color: #000;
  font-size: 9px; font-weight: 700;
  padding: 1px 5px; border-radius: 8px; min-width: 16px; text-align: center;
}

.content { flex: 1; overflow: hidden; position: relative; }
.content > * { position: absolute; inset: 0; }

/* 告警 */
.alert-stack {
  position: fixed; top: 12px; right: 12px;
  z-index: 9999; display: flex; flex-direction: column; gap: 6px;
  pointer-events: none;
}
.alert-item {
  display: flex; align-items: center; gap: 8px;
  background: #2d1e1e; border: 1px solid #f8514966;
  border-radius: 8px; padding: 8px 12px;
  color: #f85149; font-size: 12px;
  pointer-events: all; cursor: pointer;
  backdrop-filter: blur(8px);
  box-shadow: 0 4px 16px #00000066;
}
.alert-icon { font-size: 14px; flex-shrink: 0; }
.alert-msg { flex: 1; }
.alert-close { color: #f8514988; flex-shrink: 0; }
.alert-slide-enter-active, .alert-slide-leave-active { transition: all 0.3s ease; }
.alert-slide-enter-from { opacity: 0; transform: translateX(40px); }
.alert-slide-leave-to { opacity: 0; transform: translateX(40px); }
</style>

<style>
.stat-chip { display: flex; flex-direction: column; align-items: center; gap: 1px; }
.stat-val  { font-size: 16px; font-weight: 700; line-height: 1; }
.stat-lbl  { font-size: 10px; color: var(--text2); }
.conn-row td { padding: 5px 10px; border-bottom: 1px solid #1e2530; white-space: nowrap; vertical-align: middle; }
.conn-row:hover td { background: #1e2530; }
</style>
