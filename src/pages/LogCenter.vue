<template>
  <div class="log-page">
    <div class="page-head">
      <div>
        <h2>日志中心</h2>
        <p>手机可直接查看前端性能日志与服务端实时日志。</p>
      </div>
      <div class="actions">
        <button class="btn" @click="switchTab('perf')">性能日志</button>
        <button class="btn" @click="switchTab('server')">服务端日志</button>
      </div>
    </div>

    <section v-if="activeTab === 'perf'">
      <div class="actions actions-top">
        <button class="btn" @click="addDemoLog">写入测试日志</button>
        <button class="btn" @click="refreshLogs">刷新</button>
        <button class="btn btn-danger" @click="clearAll">清空日志</button>
      </div>

      <div class="stats">
        <span class="stat">总日志 {{ logs.length }}</span>
        <span class="stat">播放日志 {{ playLogs.length }}</span>
        <span class="stat">平均首播 {{ avgPlayLoadMs }} ms</span>
        <span class="stat warn">慢加载 {{ slowPlayLogs.length }} 条（>{{ slowThresholdMs }}ms）</span>
      </div>

      <section class="diagnose">
        <div class="diagnose-head">
          <h3>慢加载诊断</h3>
          <span v-if="slowPlayLogs.length === 0" class="ok">当前无明显慢加载</span>
          <span v-else class="err">检测到慢加载，请优先处理 Top10</span>
        </div>
        <div v-if="slowTop10.length === 0" class="empty-lite">暂无慢加载记录</div>
        <div v-else class="slow-list">
          <div v-for="item in slowTop10" :key="item.id" class="slow-item">
            <div class="slow-title">{{ item.name || '未命名视频' }}</div>
            <div class="slow-meta">
              <span>{{ item.durationMs }} ms</span>
              <span>{{ formatDate(item.timestamp) }}</span>
            </div>
            <div class="slow-tip">{{ suggestFor(item.durationMs) }}</div>
          </div>
        </div>
      </section>

      <div class="toolbar">
        <select v-model="moduleFilter" class="input">
          <option value="all">全部模块</option>
          <option value="video">视频</option>
          <option value="music">音乐</option>
        </select>
        <select v-model="statusFilter" class="input">
          <option value="all">全部状态</option>
          <option value="ok">成功</option>
          <option value="error">失败</option>
        </select>
        <input v-model.trim="query" class="input" placeholder="搜索名称/路径/细节...">
      </div>

      <div v-if="filteredLogs.length === 0" class="empty">暂无日志</div>
      <div v-else class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>时间</th>
              <th>模块</th>
              <th>动作</th>
              <th>状态</th>
              <th>耗时(ms)</th>
              <th>名称</th>
              <th>详情</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in filteredLogs" :key="item.id" :class="{ slow: isSlowPlay(item) }">
              <td>{{ formatDate(item.timestamp) }}</td>
              <td>{{ item.module }}</td>
              <td>{{ item.action }}</td>
              <td :class="{ err: item.status === 'error', ok: item.status === 'ok' }">{{ item.status }}</td>
              <td>{{ item.durationMs ?? '-' }}</td>
              <td class="name" :title="item.path || ''">{{ item.name || '-' }}</td>
              <td class="detail">{{ item.detail || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section v-else>
      <div class="actions actions-top">
        <button class="btn" @click="fetchServerLogs">刷新</button>
        <button class="btn" @click="togglePause">{{ serverPaused ? '继续滚动' : '暂停滚动' }}</button>
        <button class="btn" @click="toggleConnection">{{ serverConnected ? '断开流' : '连接流' }}</button>
        <button class="btn" @click="copyServerLogs">复制当前日志</button>
        <button class="btn btn-danger" @click="clearServerLogs">清空服务端日志</button>
      </div>

      <div class="stats">
        <span class="stat">连接: {{ serverConnected ? '已连接' : '未连接' }}</span>
        <span class="stat">日志条数: {{ serverLogs.length }}</span>
        <span class="stat" :class="{ warn: !!serverError }">{{ serverError || '状态正常' }}</span>
      </div>

      <div class="toolbar server-toolbar">
        <select v-model="serverLevelFilter" class="input">
          <option value="all">全部级别</option>
          <option value="http">http</option>
          <option value="log">log</option>
          <option value="info">info</option>
          <option value="warn">warn</option>
          <option value="error">error</option>
          <option value="debug">debug</option>
        </select>
        <input v-model.trim="serverQuery" class="input" placeholder="搜索日志内容...">
      </div>

      <div v-if="filteredServerLogs.length === 0" class="empty">暂无服务端日志</div>
      <div v-else class="server-log-panel" ref="serverPanelRef">
        <div
          v-for="item in filteredServerLogs"
          :key="item.id"
          class="server-log-line"
          :class="`lv-${item.level}`"
        >
          <span class="log-time">{{ formatDate(item.timestamp) }}</span>
          <span class="log-level">[{{ item.level }}]</span>
          <span class="log-msg">{{ item.message }}</span>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import { api, getApiUrl } from '../utils/api.js'
import { appendPerfLog, clearPerfLogs, getPerfLogs } from '../utils/perfLogs.js'

export default {
  name: 'LogCenter',
  data() {
    return {
      activeTab: 'perf',
      logs: [],
      slowThresholdMs: 10000,
      moduleFilter: 'all',
      statusFilter: 'all',
      query: '',
      serverLogs: [],
      serverQuery: '',
      serverLevelFilter: 'all',
      serverConnected: false,
      serverPaused: false,
      serverError: '',
      serverEventSource: null
    }
  },
  computed: {
    filteredLogs() {
      const q = this.query.toLowerCase()
      return this.logs.filter((item) => {
        const moduleMatch = this.moduleFilter === 'all' || item.module === this.moduleFilter
        const statusMatch = this.statusFilter === 'all' || item.status === this.statusFilter
        if (!moduleMatch || !statusMatch) return false
        if (!q) return true
        return [item.name, item.path, item.detail, item.action, item.module].join(' ').toLowerCase().includes(q)
      })
    },
    playLogs() {
      return this.logs.filter((item) => item.module === 'video' && item.action === 'play_start' && item.status === 'ok' && Number.isFinite(item.durationMs))
    },
    slowPlayLogs() {
      return this.playLogs.filter((item) => item.durationMs > this.slowThresholdMs)
    },
    slowTop10() {
      return [...this.slowPlayLogs].sort((a, b) => b.durationMs - a.durationMs).slice(0, 10)
    },
    avgPlayLoadMs() {
      if (!this.playLogs.length) return 0
      const sum = this.playLogs.reduce((acc, item) => acc + item.durationMs, 0)
      return Math.round(sum / this.playLogs.length)
    },
    filteredServerLogs() {
      const q = this.serverQuery.toLowerCase()
      return this.serverLogs.filter((item) => {
        const levelMatch = this.serverLevelFilter === 'all' || item.level === this.serverLevelFilter
        if (!levelMatch) return false
        if (!q) return true
        return String(item.message || '').toLowerCase().includes(q)
      })
    }
  },
  methods: {
    switchTab(tab) {
      this.activeTab = tab
    },
    refreshLogs() {
      this.logs = getPerfLogs()
    },
    addDemoLog() {
      appendPerfLog({
        module: 'video',
        action: 'manual_test',
        status: 'ok',
        durationMs: 0,
        name: '测试日志',
        detail: '点击了写入测试日志按钮'
      })
      this.refreshLogs()
    },
    clearAll() {
      if (!confirm('确定清空所有性能日志吗？')) return
      clearPerfLogs()
      this.refreshLogs()
    },
    async fetchServerLogs() {
      try {
        const res = await api.runtimeLogs.getAll(500)
        this.serverLogs = Array.isArray(res?.logs) ? res.logs : []
        this.serverError = ''
        this.scrollServerBottom()
      } catch (error) {
        this.serverError = error.message || '获取服务端日志失败'
      }
    },
    connectServerStream() {
      if (this.serverEventSource) return
      const es = new EventSource(getApiUrl('/runtime-logs/stream'))
      this.serverEventSource = es
      this.serverConnected = true
      this.serverError = ''

      es.addEventListener('snapshot', (event) => {
        try {
          const list = JSON.parse(event.data)
          if (Array.isArray(list)) {
            this.serverLogs = list
            this.scrollServerBottom()
          }
        } catch (error) {
          this.serverError = '解析快照失败'
        }
      })

      es.addEventListener('log', (event) => {
        if (this.serverPaused) return
        try {
          const item = JSON.parse(event.data)
          this.serverLogs.push(item)
          if (this.serverLogs.length > 1200) {
            this.serverLogs.splice(0, this.serverLogs.length - 1200)
          }
          this.scrollServerBottom()
        } catch (error) {
          this.serverError = '解析日志失败'
        }
      })

      es.onerror = () => {
        this.serverError = '日志流连接中断'
        this.disconnectServerStream()
      }
    },
    disconnectServerStream() {
      if (!this.serverEventSource) return
      this.serverEventSource.close()
      this.serverEventSource = null
      this.serverConnected = false
    },
    toggleConnection() {
      if (this.serverConnected) {
        this.disconnectServerStream()
      } else {
        this.connectServerStream()
      }
    },
    togglePause() {
      this.serverPaused = !this.serverPaused
      if (!this.serverPaused) this.scrollServerBottom()
    },
    async clearServerLogs() {
      if (!confirm('确定清空服务端运行日志吗？')) return
      try {
        await api.runtimeLogs.clear()
        this.serverLogs = []
        this.serverError = ''
      } catch (error) {
        this.serverError = error.message || '清空服务端日志失败'
      }
    },
    async copyServerLogs() {
      const lines = this.filteredServerLogs.map((item) => {
        return `${this.formatDate(item.timestamp)} [${item.level}] ${item.message || ''}`
      })
      if (lines.length === 0) {
        alert('没有可复制的日志')
        return
      }
      const text = lines.join('\n')
      try {
        await navigator.clipboard.writeText(text)
        alert(`已复制 ${lines.length} 条日志`)
      } catch (error) {
        // iOS Safari fallback
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.focus()
        textarea.select()
        const ok = document.execCommand('copy')
        document.body.removeChild(textarea)
        if (ok) {
          alert(`已复制 ${lines.length} 条日志`)
        } else {
          alert('复制失败，请手动长按日志文本复制')
        }
      }
    },
    scrollServerBottom() {
      this.$nextTick(() => {
        const el = this.$refs.serverPanelRef
        if (!el) return
        el.scrollTop = el.scrollHeight
      })
    },
    formatDate(ts) {
      if (!ts) return '-'
      return new Date(ts).toLocaleString('zh-CN', { hour12: false })
    },
    isSlowPlay(item) {
      return item.module === 'video' && item.action === 'play_start' && item.status === 'ok' && Number.isFinite(item.durationMs) && item.durationMs > this.slowThresholdMs
    },
    suggestFor(ms) {
      if (ms > 60000) return '建议先转码或切片，且检查磁盘读速与后台占用。'
      if (ms > 20000) return '建议用 faststart 重封装，并重测后端分片参数。'
      return '建议继续观察，优先看同目录其他文件对比。'
    }
  },
  mounted() {
    this.refreshLogs()
    this.fetchServerLogs()
    if (this.activeTab === 'server') {
      this.connectServerStream()
    }
  },
  activated() {
    if (this.activeTab === 'server') {
      this.connectServerStream()
    }
  },
  deactivated() {
    this.disconnectServerStream()
  },
  beforeUnmount() {
    this.disconnectServerStream()
  },
  watch: {
    activeTab(tab) {
      if (tab === 'server') {
        this.fetchServerLogs()
        this.connectServerStream()
      } else {
        this.disconnectServerStream()
      }
    }
  }
}
</script>

<style scoped>
.log-page { color: var(--app-text); }
.page-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 10px; flex-wrap: wrap; margin-bottom: 10px; }
.page-head h2 { margin: 0; font-size: 1.14em; }
.page-head p { margin: 4px 0 0; color: var(--app-text-muted); font-size: 0.84em; }

.actions { display: flex; gap: 8px; flex-wrap: wrap; }
.actions-top { margin-bottom: 8px; }
.btn { border: 1px solid var(--app-border); background: var(--app-card-elevated); color: var(--app-text-secondary); border-radius: 11px; padding: 8px 10px; cursor: pointer; font-size: 0.84em; font-weight: 600; }
.btn:hover { border-color: var(--app-primary); color: var(--app-primary); }
.btn-danger { background: #ff3b30; border-color: transparent; color: #fff; box-shadow: 0 8px 18px rgba(255, 59, 48, 0.24); }
.btn-danger:hover { color: #fff; }

.stats { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; }
.stat { background: var(--app-card-elevated); border: 1px solid var(--app-border); padding: 5px 9px; border-radius: 999px; font-size: 0.76em; color: var(--app-text-secondary); }
.warn { border-color: color-mix(in srgb, #ff9500 45%, var(--app-border)); color: #b45309; }

.diagnose { border: 1px solid var(--app-border); border-radius: 14px; padding: 10px; background: var(--app-card); margin-bottom: 10px; box-shadow: var(--app-soft-shadow); }
.diagnose-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 8px; flex-wrap: wrap; }
.diagnose-head h3 { margin: 0; font-size: 0.94em; }
.empty-lite { color: var(--app-text-muted); font-size: 0.84em; }
.slow-list { display: grid; gap: 8px; }
.slow-item { border: 1px solid var(--app-border); border-radius: 10px; padding: 8px; background: var(--app-card-elevated); }
.slow-title { font-weight: 700; }
.slow-meta { margin-top: 4px; display: flex; gap: 10px; color: var(--app-text-muted); font-size: 0.78em; flex-wrap: wrap; }
.slow-tip { margin-top: 4px; font-size: 0.8em; color: var(--app-text-secondary); }

.toolbar { display: grid; grid-template-columns: 180px 180px 1fr; gap: 10px; margin-bottom: 12px; }
.server-toolbar { grid-template-columns: 180px 1fr; }
.input { width: 100%; border: 1px solid var(--app-border); border-radius: 11px; padding: 9px 10px; font: inherit; background: var(--app-card-elevated); color: var(--app-text); font-size: 0.86em; }
.input:focus { outline: none; border-color: var(--app-primary); box-shadow: 0 0 0 3px var(--app-shadow-light); }

.table-wrap { overflow: auto; border: 1px solid var(--app-border); border-radius: 14px; background: var(--app-card); box-shadow: var(--app-soft-shadow); }
.table { width: 100%; border-collapse: collapse; min-width: 900px; }
.table th, .table td { border-bottom: 1px solid var(--app-border); padding: 8px 10px; text-align: left; font-size: 0.82em; }
.table thead th { background: var(--app-card-elevated); font-weight: 700; color: var(--app-text-secondary); }
.table tr:last-child td { border-bottom: none; }
.table tr.slow td { background: rgba(255, 59, 48, 0.08); }
.ok { color: #30d158; font-weight: 700; }
.err { color: #ff3b30; font-weight: 700; }
.name { max-width: 260px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.detail { color: var(--app-text-muted); }

.server-log-panel {
  border: 1px solid var(--app-border);
  border-radius: 12px;
  background: #f8fafc;
  color: #0f172a;
  padding: 10px;
  max-height: 62dvh;
  overflow: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  line-height: 1.45;
  user-select: text;
  -webkit-user-select: text;
}
.server-log-line { display: flex; gap: 8px; padding: 4px 0; border-bottom: 1px dashed #cbd5e1; }
.server-log-line:last-child { border-bottom: none; }
.log-time { color: #475569; flex-shrink: 0; }
.log-level {
  color: #334155;
  flex-shrink: 0;
  width: 54px;
  font-weight: 700;
}
.log-msg { white-space: pre-wrap; word-break: break-word; color: #0f172a; }
.lv-error .log-level { color: #dc2626; }
.lv-warn .log-level { color: #b45309; }
.lv-info .log-level { color: #2563eb; }
.lv-http .log-level { color: #0891b2; }
.lv-debug .log-level { color: #7c3aed; }

.empty { text-align: center; color: var(--app-text-muted); padding: 32px 12px; border: 1px dashed var(--app-border); border-radius: 12px; background: var(--app-card-elevated); font-size: 0.86em; }

@media (max-width: 860px) {
  .toolbar,
  .server-toolbar { grid-template-columns: 1fr; }
  .server-log-panel { max-height: 58dvh; }
}
</style>
