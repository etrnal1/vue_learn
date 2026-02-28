<template>
  <div class="auth-log-page">
    <div class="head">
      <div>
        <h2>认证日志中心</h2>
        <p>用于排查登录/注册 4xx、5xx 错误。</p>
      </div>
      <div class="actions">
        <button class="btn" @click="fetchLogs">刷新</button>
        <button class="btn" @click="toggleAuto">{{ autoRefresh ? '停止自动刷新' : '自动刷新' }}</button>
        <button class="btn btn-danger" @click="clearLogs">清空服务端日志</button>
      </div>
    </div>

    <div class="filters">
      <select v-model="levelFilter" class="input">
        <option value="all">全部级别</option>
        <option value="error">error</option>
        <option value="warn">warn</option>
        <option value="info">info</option>
        <option value="log">log</option>
      </select>
      <input v-model.trim="query" class="input" placeholder="搜索 id / register_failed / login_failed..." />
      <span class="summary">匹配 {{ filteredLogs.length }} / {{ authLogs.length }}</span>
    </div>

    <div v-if="errorText" class="error">{{ errorText }}</div>
    <div v-if="filteredLogs.length === 0" class="empty">暂无认证相关日志</div>
    <div v-else class="panel">
      <div v-for="item in filteredLogs" :key="item.id" class="line" :class="`lv-${item.level}`">
        <span class="time">{{ formatTime(item.timestamp) }}</span>
        <span class="level">[{{ item.level }}]</span>
        <pre class="msg">{{ item.message }}</pre>
      </div>
    </div>
  </div>
</template>

<script>
import { api } from '../utils/api.js'

const AUTH_KEYWORDS = ['[auth]', '/api/auth', '注册失败', '登录失败', '认证表结构校验失败']

export default {
  name: 'AuthLogCenter',
  data() {
    return {
      logs: [],
      levelFilter: 'all',
      query: '',
      errorText: '',
      autoRefresh: false,
      timer: null
    }
  },
  computed: {
    authLogs() {
      return this.logs.filter((item) => {
        const message = String(item?.message || '')
        return AUTH_KEYWORDS.some((keyword) => message.includes(keyword))
      })
    },
    filteredLogs() {
      const q = this.query.toLowerCase()
      return this.authLogs.filter((item) => {
        if (this.levelFilter !== 'all' && item.level !== this.levelFilter) return false
        if (!q) return true
        return String(item.message || '').toLowerCase().includes(q)
      })
    }
  },
  methods: {
    formatTime(ts) {
      return new Date(ts).toLocaleString('zh-CN', { hour12: false })
    },
    async fetchLogs() {
      try {
        const res = await api.runtimeLogs.getAll(1200)
        this.logs = Array.isArray(res?.logs) ? res.logs : []
        this.errorText = ''
      } catch (error) {
        this.errorText = error?.message || '获取日志失败'
      }
    },
    async clearLogs() {
      if (!confirm('确定清空服务端日志吗？')) return
      try {
        await api.runtimeLogs.clear()
        this.logs = []
      } catch (error) {
        this.errorText = error?.message || '清空失败'
      }
    },
    toggleAuto() {
      this.autoRefresh = !this.autoRefresh
      if (this.autoRefresh) {
        this.timer = setInterval(() => this.fetchLogs(), 3000)
      } else if (this.timer) {
        clearInterval(this.timer)
        this.timer = null
      }
    }
  },
  mounted() {
    this.fetchLogs()
  },
  beforeUnmount() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }
}
</script>

<style scoped>
.auth-log-page { display: flex; flex-direction: column; gap: 12px; }
.head { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
.head h2 { margin: 0; }
.head p { margin: 4px 0 0; color: #64748b; }
.actions { display: flex; gap: 8px; flex-wrap: wrap; }
.btn { border: 1px solid #cbd5e1; background: #fff; border-radius: 8px; padding: 6px 10px; cursor: pointer; }
.btn-danger { border-color: #fecaca; color: #b91c1c; background: #fff5f5; }
.filters { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.input { border: 1px solid #cbd5e1; border-radius: 8px; padding: 6px 10px; min-width: 180px; }
.summary { color: #64748b; font-size: 0.86em; }
.error { color: #b91c1c; background: #fff1f2; border: 1px solid #fecdd3; border-radius: 8px; padding: 8px 10px; }
.empty { color: #64748b; border: 1px dashed #cbd5e1; border-radius: 10px; padding: 16px; text-align: center; }
.panel { border: 1px solid #cbd5e1; border-radius: 12px; max-height: 62vh; overflow: auto; background: #0b1220; }
.line { display: grid; grid-template-columns: 170px 72px 1fr; gap: 8px; padding: 8px 10px; border-bottom: 1px solid rgba(255,255,255,0.08); color: #e2e8f0; font-size: 12px; }
.time { color: #94a3b8; }
.level { font-weight: 700; }
.msg { margin: 0; white-space: pre-wrap; word-break: break-word; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.lv-error { background: rgba(220, 38, 38, 0.14); }
.lv-warn { background: rgba(245, 158, 11, 0.12); }
@media (max-width: 768px) {
  .line { grid-template-columns: 1fr; }
  .panel { max-height: 56vh; }
}
</style>
