<template>
  <div class="list-wrap">
    <!-- 工具栏 -->
    <div class="list-toolbar">
      <input
        v-model="search"
        class="search-input"
        placeholder="搜索进程 / IP / 端口..."
      />
      <select v-model="filterState" class="filter-select">
        <option value="">全部状态</option>
        <option v-for="s in availableStates" :key="s" :value="s">{{ s }}</option>
      </select>
      <select v-model="filterProto" class="filter-select">
        <option value="">全部协议</option>
        <option value="TCP">TCP</option>
        <option value="UDP">UDP</option>
      </select>
      <select v-model="filterProcess" class="filter-select">
        <option value="">全部进程</option>
        <option v-for="p in availableProcesses" :key="p" :value="p">{{ p }}</option>
      </select>
      <label class="toolbar-item">
        <input type="checkbox" v-model="showHistory" />
        显示历史
      </label>
      <span class="count-badge">{{ displayed.length }} / {{ showHistory ? history.length + connections.length : connections.length }}</span>
      <button class="export-btn" @click="$emit('exportCsv', displayed)" title="导出 CSV">⬇ CSV</button>
    </div>

    <!-- 表格 -->
    <div class="table-container" ref="tableContainer" @scroll.passive="onScroll">
      <table class="conn-table">
        <thead>
          <tr>
            <th @click="sortBy('process')" :class="sortClass('process')">进程</th>
            <th @click="sortBy('pid')" :class="sortClass('pid')">PID</th>
            <th @click="sortBy('proto')" :class="sortClass('proto')">协议</th>
            <th @click="sortBy('localAddr')" :class="sortClass('localAddr')">本地地址</th>
            <th @click="sortBy('remoteAddr')" :class="sortClass('remoteAddr')">远端地址</th>
            <th @click="sortBy('remotePort')" :class="sortClass('remotePort')">远端端口</th>
            <th @click="sortBy('state')" :class="sortClass('state')">状态</th>
            <th @click="sortBy('duration')" :class="sortClass('duration')">时长</th>
            <th>属地</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="topPad > 0" :style="{ height: topPad + 'px' }"><td colspan="9" /></tr>
          <tr
            v-for="c in visibleRows"
            :key="c.id"
            :class="['conn-row', rowClass(c), { 'new-row': newIds.has(c.id) }]"
          >
            <td class="td-process" @click.stop="$emit('procClick', c.process)" style="cursor:pointer" title="点击查看进程详情">
              <span class="proc-dot" :style="{ background: getProcessColor(c.process) }" />
              {{ c.process }}
            </td>
            <td class="td-dim">{{ c.pid }}</td>
            <td>
              <span :class="['proto-badge', c.proto.toLowerCase()]">{{ c.proto }}</span>
            </td>
            <td class="td-dim">{{ c.localAddr }}:{{ c.localPort }}</td>
            <td class="td-ip">{{ c.remoteAddr }}</td>
            <td>
              <span class="port-badge" :class="{ 'port-danger': isDangerPort(c.remotePort) }">{{ c.remotePort }}</span>
              <span v-if="c.remoteSvc" class="svc-label">{{ c.remoteSvc }}</span>
            </td>
            <td>
              <span :class="['state-badge', stateClass(c.state)]">{{ c.state }}</span>
            </td>
            <td class="td-dur" :class="{ 'closed-row': c._closed }">{{ fmtDuration(c.duration) }}</td>
            <td class="td-geo">
              <span v-if="c.geo?.flag" class="geo-flag">{{ c.geo.flag }}</span>
              <span v-if="c.geo?.countryZh" class="geo-country">{{ c.geo.countryZh }}</span>
              <span v-if="c.geo?.city" class="geo-city">{{ c.geo.city }}</span>
            </td>
          </tr>
          <tr v-if="botPad > 0" :style="{ height: botPad + 'px' }"><td colspan="9" /></tr>
          <tr v-if="displayed.length === 0">
            <td colspan="9" class="empty-row">暂无匹配的连接</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
import { defineComponent, ref, computed, onMounted } from 'vue'
import * as d3 from 'd3'

export default defineComponent({
  name: 'ConnectionList',
  emits: ['exportCsv', 'procClick'],
  props: {
    connections: { type: Array, default: () => [] },
    history: { type: Array, default: () => [] },
    newIds: { type: Set, default: () => new Set() }
  },

  setup(props) {
    const search = ref('')
    const filterState = ref('')
    const filterProto = ref('')
    const filterProcess = ref('')
    const sortKey = ref('process')
    const sortAsc = ref(true)
    const showHistory = ref(false)

    const colorScale = d3.scaleOrdinal(d3.schemeTableau10)
    const processColors = new Map()
    function getProcessColor(name) {
      if (!processColors.has(name)) processColors.set(name, colorScale(processColors.size))
      return processColors.get(name)
    }

    const availableStates = computed(() => {
      return [...new Set(props.connections.map(c => c.state))].sort()
    })

    const availableProcesses = computed(() => {
      return [...new Set(props.connections.map(c => c.process))].sort()
    })

    function fmtDuration(ms) {
      if (!ms || ms < 1000) return '<1s'
      const s = Math.floor(ms / 1000)
      if (s < 60) return `${s}s`
      if (s < 3600) return `${Math.floor(s/60)}m${s%60}s`
      return `${Math.floor(s/3600)}h${Math.floor((s%3600)/60)}m`
    }

    const displayed = computed(() => {
      const histItems = showHistory.value
        ? props.history.map(c => ({ ...c, _closed: true }))
        : []
      let list = [...props.connections, ...histItems]

      if (search.value) {
        const q = search.value.toLowerCase()
        list = list.filter(c =>
          c.process.toLowerCase().includes(q) ||
          c.remoteAddr.includes(q) ||
          String(c.remotePort).includes(q) ||
          String(c.localPort).includes(q)
        )
      }
      if (filterState.value) list = list.filter(c => c.state === filterState.value)
      if (filterProto.value) list = list.filter(c => c.proto === filterProto.value)
      if (filterProcess.value) list = list.filter(c => c.process === filterProcess.value)

      const k = sortKey.value
      list = [...list].sort((a, b) => {
        const av = a[k] ?? '', bv = b[k] ?? ''
        const cmp = typeof av === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv))
        return sortAsc.value ? cmp : -cmp
      })

      return list
    })

    // 虚拟滚动
    const ROW_H = 28
    const BUFFER = 8
    const tableContainer = ref(null)
    const scrollTop = ref(0)
    function onScroll(e) { scrollTop.value = e.target.scrollTop }

    const startIdx = computed(() => Math.max(0, Math.floor(scrollTop.value / ROW_H) - BUFFER))
    const endIdx = computed(() => {
      const h = tableContainer.value?.clientHeight || 600
      return Math.min(displayed.value.length, startIdx.value + Math.ceil(h / ROW_H) + BUFFER * 2)
    })
    const visibleRows = computed(() => displayed.value.slice(startIdx.value, endIdx.value))
    const topPad = computed(() => startIdx.value * ROW_H)
    const botPad = computed(() => (displayed.value.length - endIdx.value) * ROW_H)

    // 危险端口
    const DANGER_PORTS = new Set([21,22,23,25,135,139,445,1433,1521,3306,3389,4444,5900,6379,6667,27017])
    function isDangerPort(port) { return DANGER_PORTS.has(Number(port)) }

    function sortBy(key) {
      if (sortKey.value === key) sortAsc.value = !sortAsc.value
      else { sortKey.value = key; sortAsc.value = true }
    }

    function sortClass(key) {
      if (sortKey.value !== key) return 'sortable'
      return sortAsc.value ? 'sortable sort-asc' : 'sortable sort-desc'
    }

    function stateClass(state) {
      if (state === 'ESTABLISHED') return 'state-ok'
      if (state === 'LISTEN') return 'state-listen'
      if (['CLOSE_WAIT', 'FIN_WAIT1', 'FIN_WAIT2', 'TIME_WAIT'].includes(state)) return 'state-closing'
      if (state === 'UDP') return 'state-udp'
      return 'state-other'
    }

    function rowClass(c) {
      if (c.state === 'ESTABLISHED') return 'row-established'
      if (c.state === 'LISTEN') return 'row-listen'
      return ''
    }

    return {
      search, filterState, filterProto, filterProcess, showHistory,
      availableStates, availableProcesses,
      displayed, visibleRows, topPad, botPad, tableContainer, onScroll,
      sortBy, sortClass, stateClass, rowClass, getProcessColor, fmtDuration, isDangerPort
    }
  }
})
</script>

<style scoped>
.list-wrap { display: flex; flex-direction: column; position: absolute; inset: 0; overflow: hidden; }

.list-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--card);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.search-input {
  background: var(--bg);
  border: 1px solid var(--border);
  color: var(--text);
  border-radius: 6px;
  padding: 5px 10px;
  font-size: 12px;
  font-family: inherit;
  width: 220px;
}
.search-input:focus { outline: none; border-color: var(--cyan); }

.filter-select {
  background: var(--bg);
  border: 1px solid var(--border);
  color: var(--text);
  border-radius: 6px;
  padding: 5px 8px;
  font-size: 12px;
  font-family: inherit;
}

.count-badge {
  color: var(--text2);
  font-size: 11px;
  margin-left: auto;
}

.table-container { flex: 1; overflow: auto; }

.conn-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.conn-table thead th {
  position: sticky;
  top: 0;
  background: #1c2333;
  color: var(--text2);
  padding: 8px 10px;
  text-align: left;
  font-weight: 600;
  border-bottom: 1px solid var(--border);
  white-space: nowrap;
  user-select: none;
}

.sortable { cursor: pointer; }
.sortable:hover { color: var(--text); }
.sort-asc::after { content: ' ↑'; color: var(--cyan); }
.sort-desc::after { content: ' ↓'; color: var(--cyan); }

.conn-row td {
  padding: 5px 10px;
  border-bottom: 1px solid #1e2530;
  white-space: nowrap;
  vertical-align: middle;
}

.conn-row:hover td { background: #1e2530; }

.new-row td { animation: fadeIn 0.6s ease; background: #1a2e1a; }
@keyframes fadeIn { from { background: #2a4a2a; } to { background: #1a2e1a; } }

.td-process { display: flex; align-items: center; gap: 6px; }
.proc-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.td-dim { color: var(--text2); }
.td-ip { font-family: monospace; color: #8bb8e8; }

.proto-badge {
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
}
.proto-badge.tcp { background: #1e3a5f; color: #58a6ff; }
.proto-badge.udp { background: #2d2a1e; color: #d29922; }

.port-badge {
  background: #1e2530;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 11px;
  color: var(--text2);
}
.port-danger { background: #3a1e1e !important; color: #f85149 !important; border: 1px solid #f8514944; }
.svc-label {
  margin-left: 4px;
  color: var(--cyan);
  font-size: 10px;
}

.state-badge {
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 600;
}
.state-ok { background: #1a3a1e; color: #3fb950; }
.state-listen { background: #1e2a3a; color: #58a6ff; }
.state-closing { background: #3a2a1a; color: #d29922; }
.state-udp { background: #2d2a1e; color: #d29922; }
.state-other { background: #2a1e2a; color: #bc8cff; }

.empty-row { text-align: center; color: var(--text2); padding: 40px !important; }
.td-dur { color: var(--text2); font-size: 11px; white-space: nowrap; }
.closed-row { opacity: 0.5; font-style: italic; }
.toolbar-item { display: flex; align-items: center; gap: 5px; color: var(--text2); font-size: 12px; cursor: pointer; }
.toolbar-item input { accent-color: var(--cyan); }
.export-btn {
  background: var(--bg); border: 1px solid var(--border); color: var(--text2);
  border-radius: 5px; padding: 4px 10px; cursor: pointer; font-size: 11px; white-space: nowrap;
}
.export-btn:hover { border-color: var(--cyan); color: var(--cyan); }
.td-geo { white-space: nowrap; }
.geo-flag { font-size: 13px; margin-right: 4px; }
.geo-country { color: var(--text); font-size: 11px; }
.geo-city { color: var(--text2); font-size: 10px; margin-left: 4px; }
</style>
