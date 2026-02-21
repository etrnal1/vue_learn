<template>
  <div class="log-page">
    <div class="page-head">
      <div>
        <h2>日志中心</h2>
        <p>查看视频加载耗时与扫描耗时，定位慢加载问题。</p>
      </div>
      <div class="actions">
        <button class="btn" @click="addDemoLog">写入测试日志</button>
        <button class="btn" @click="refreshLogs">刷新</button>
        <button class="btn btn-danger" @click="clearAll">清空日志</button>
      </div>
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
  </div>
</template>

<script>
import { appendPerfLog, clearPerfLogs, getPerfLogs } from '../utils/perfLogs.js'

export default {
  name: 'LogCenter',
  data() {
    return {
      logs: [],
      slowThresholdMs: 10000,
      moduleFilter: 'all',
      statusFilter: 'all',
      query: ''
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
    }
  },
  methods: {
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
  }
}
</script>

<style scoped>
.log-page { color: var(--app-text); }
.page-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
.page-head h2 { margin: 0; }
.page-head p { margin: 6px 0 0; color: var(--app-text-muted); font-size: 0.9em; }

.actions { display: flex; gap: 8px; }
.btn { border: 1px solid var(--app-border); background: var(--app-card); color: var(--app-text-secondary); border-radius: 8px; padding: 8px 10px; cursor: pointer; }
.btn-danger { background: #ef4444; border-color: #ef4444; color: #fff; }

.stats { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
.stat { background: var(--app-card); border: 1px solid var(--app-border); padding: 6px 10px; border-radius: 999px; font-size: 0.82em; }
.warn { border-color: #f59e0b; color: #b45309; }

.diagnose { border: 1px solid var(--app-border); border-radius: 10px; padding: 10px; background: var(--app-card); margin-bottom: 12px; }
.diagnose-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 8px; flex-wrap: wrap; }
.diagnose-head h3 { margin: 0; font-size: 1em; }
.empty-lite { color: var(--app-text-muted); font-size: 0.9em; }
.slow-list { display: grid; gap: 8px; }
.slow-item { border: 1px solid var(--app-border); border-radius: 8px; padding: 8px; }
.slow-title { font-weight: 700; }
.slow-meta { margin-top: 4px; display: flex; gap: 10px; color: var(--app-text-muted); font-size: 0.85em; flex-wrap: wrap; }
.slow-tip { margin-top: 4px; font-size: 0.85em; color: var(--app-text-secondary); }

.toolbar { display: grid; grid-template-columns: 180px 180px 1fr; gap: 10px; margin-bottom: 12px; }
.input { width: 100%; border: 2px solid var(--app-border); border-radius: 8px; padding: 8px 10px; font: inherit; background: var(--app-card); color: var(--app-text); }
.input:focus { outline: none; border-color: var(--app-primary); }

.table-wrap { overflow: auto; border: 1px solid var(--app-border); border-radius: 10px; background: var(--app-card); }
.table { width: 100%; border-collapse: collapse; min-width: 900px; }
.table th, .table td { border-bottom: 1px solid var(--app-border); padding: 8px 10px; text-align: left; font-size: 0.88em; }
.table thead th { background: rgba(148, 163, 184, 0.12); font-weight: 700; }
.table tr:last-child td { border-bottom: none; }
.table tr.slow td { background: rgba(239, 68, 68, 0.08); }
.ok { color: #16a34a; font-weight: 700; }
.err { color: #ef4444; font-weight: 700; }
.name { max-width: 260px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.detail { color: var(--app-text-muted); }
.empty { text-align: center; color: var(--app-text-muted); padding: 32px 12px; border: 1px dashed var(--app-border); border-radius: 10px; }

@media (max-width: 860px) {
  .toolbar { grid-template-columns: 1fr; }
}
</style>
