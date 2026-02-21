<template>
  <div class="weibo-page">
    <div class="head">
      <div>
        <h2>微博抓取（公开内容）</h2>
        <p>仅用于抓取公开可见微博；请遵守平台条款与法律法规。</p>
      </div>
    </div>

    <section class="panel">
      <div class="controls">
        <input v-model.trim="uid" class="input" placeholder="微博 uid（纯数字）">
        <input v-model.number="count" type="number" min="1" max="100" class="input small" placeholder="数量">
        <button class="btn btn-primary" :disabled="loading" @click="fetchNow">{{ loading ? '抓取中...' : '立即抓取' }}</button>
        <button class="btn" :disabled="saving" @click="saveCurrent">保存当前结果</button>
        <button class="btn" @click="loadSaved">读取已保存</button>
      </div>

      <div class="cookie-row">
        <input v-model.trim="cookie" class="input" placeholder="可选：微博 Cookie（遇到 432 时填写）">
      </div>

      <div class="scheduler">
        <label>定时(分钟)
          <input v-model.number="intervalMinutes" type="number" min="1" max="1440" class="input tiny">
        </label>
        <label><input type="checkbox" v-model="autoSave"> 自动保存</label>
        <button class="btn" @click="startScheduler">启动定时</button>
        <button class="btn" @click="runScheduler">立即执行</button>
        <button class="btn btn-danger" @click="stopScheduler">停止定时</button>
      </div>

      <div class="downloads">
        <button class="btn" @click="download('json')">下载 JSON</button>
        <button class="btn" @click="download('csv')">下载 CSV</button>
      </div>

      <div class="status">
        <span>定时状态：{{ scheduler.enabled ? '运行中' : '已停止' }}</span>
        <span v-if="scheduler.lastRunAt">最近执行：{{ fmt(scheduler.lastRunAt) }}</span>
        <span v-if="scheduler.lastCount">最近抓取：{{ scheduler.lastCount }} 条</span>
        <span v-if="scheduler.lastError" class="err">错误：{{ scheduler.lastError }}</span>
      </div>

      <div v-if="error" class="err">{{ error }}</div>

      <div class="list">
        <article v-for="item in items" :key="item.id" class="card">
          <div class="row">
            <strong>{{ item.userName || '-' }}</strong>
            <span>{{ item.createdAt || '-' }}</span>
            <a v-if="item.url" :href="item.url" target="_blank" rel="noreferrer">打开</a>
          </div>
          <p class="text">{{ item.text }}</p>
          <div class="meta">转发 {{ item.reposts }} · 评论 {{ item.comments }} · 点赞 {{ item.likes }}</div>
        </article>
      </div>
    </section>
  </div>
</template>

<script>
import { api, getApiUrl } from '../utils/api.js'

export default {
  name: 'WeiboCrawler',
  data() {
    return {
      uid: '',
      count: 20,
      cookie: localStorage.getItem('weibo_cookie') || '',
      intervalMinutes: 30,
      autoSave: true,
      items: [],
      loading: false,
      saving: false,
      error: '',
      scheduler: {
        enabled: false,
        config: null,
        lastRunAt: null,
        lastCount: 0,
        lastError: ''
      }
    }
  },
  methods: {
    fmt(ts) {
      return ts ? new Date(ts).toLocaleString('zh-CN', { hour12: false }) : '-'
    },
    checkUid() {
      if (!/^\d{4,20}$/.test(String(this.uid || ''))) {
        this.error = '请输入有效 uid（纯数字）'
        return false
      }
      this.error = ''
      return true
    },
    async fetchNow() {
      if (!this.checkUid()) return
      this.loading = true
      this.error = ''
      try {
        const result = await api.weibo.fetch({ uid: this.uid, count: this.count, cookie: this.cookie })
        this.items = result.items || []
      } catch (error) {
        this.error = error.message || '抓取失败'
      } finally {
        this.loading = false
      }
    },
    async saveCurrent() {
      if (!this.checkUid()) return
      this.saving = true
      this.error = ''
      try {
        await api.weibo.save({ uid: this.uid, items: this.items, cookie: this.cookie })
      } catch (error) {
        this.error = error.message || '保存失败'
      } finally {
        this.saving = false
      }
    },
    async loadSaved() {
      if (!this.checkUid()) return
      this.error = ''
      try {
        const result = await api.weibo.saved(this.uid)
        this.items = result.items || []
      } catch (error) {
        this.error = error.message || '读取失败'
      }
    },
    download(format) {
      if (!this.checkUid()) return
      const a = document.createElement('a')
      a.href = getApiUrl(`/weibo/download?uid=${encodeURIComponent(this.uid)}&format=${encodeURIComponent(format)}`)
      a.target = '_blank'
      a.rel = 'noreferrer'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    },
    async refreshScheduler() {
      try {
        this.scheduler = await api.weibo.scheduler()
        if (this.scheduler?.config?.uid && !this.uid) {
          this.uid = this.scheduler.config.uid
          this.count = this.scheduler.config.count || this.count
          this.intervalMinutes = this.scheduler.config.intervalMinutes || this.intervalMinutes
          this.autoSave = this.scheduler.config.autoSave !== false
        }
      } catch (error) {
        this.error = error.message || '获取定时状态失败'
      }
    },
    async startScheduler() {
      if (!this.checkUid()) return
      this.error = ''
      try {
        this.scheduler = await api.weibo.startScheduler({
          uid: this.uid,
          count: this.count,
          intervalMinutes: this.intervalMinutes,
          autoSave: this.autoSave,
          cookie: this.cookie
        })
      } catch (error) {
        this.error = error.message || '启动失败'
      }
    },
    async runScheduler() {
      this.error = ''
      try {
        this.scheduler = await api.weibo.runScheduler()
      } catch (error) {
        this.error = error.message || '执行失败'
      }
    },
    async stopScheduler() {
      this.error = ''
      try {
        this.scheduler = await api.weibo.stopScheduler()
      } catch (error) {
        this.error = error.message || '停止失败'
      }
    }
  },
  mounted() {
    this.refreshScheduler()
  },
  watch: {
    cookie(value) {
      localStorage.setItem('weibo_cookie', value || '')
    }
  }
}
</script>

<style scoped>
.weibo-page { color: var(--app-text); }
.head h2 { margin: 0; }
.head p { margin: 6px 0 12px; color: var(--app-text-muted); font-size: 0.9em; }
.panel { background: var(--app-card); border: 1px solid var(--app-border); border-radius: 12px; padding: 12px; }
.controls { display: grid; grid-template-columns: 1fr 120px auto auto auto; gap: 8px; margin-bottom: 10px; }
.cookie-row { margin-bottom: 8px; }
.input { border: 2px solid var(--app-border); border-radius: 8px; padding: 8px 10px; font: inherit; background: var(--app-card); color: var(--app-text); }
.input.small { width: 120px; }
.input.tiny { width: 96px; margin-left: 6px; }
.btn { border: 1px solid var(--app-border); border-radius: 8px; background: var(--app-card); color: var(--app-text-secondary); padding: 8px 10px; cursor: pointer; }
.btn-primary { background: var(--app-gradient); color: #fff; border-color: transparent; }
.btn-danger { background: #ef4444; color: #fff; border-color: #ef4444; }
.scheduler { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 8px; }
.downloads { display: flex; gap: 8px; margin-bottom: 8px; }
.status { display: flex; gap: 10px; flex-wrap: wrap; font-size: 0.85em; color: var(--app-text-muted); margin-bottom: 8px; }
.err { color: #ef4444; }
.list { display: grid; gap: 8px; }
.card { border: 1px solid var(--app-border); border-radius: 10px; padding: 10px; background: var(--app-card); }
.row { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; font-size: 0.86em; }
.text { margin: 8px 0; white-space: pre-wrap; }
.meta { font-size: 0.8em; color: var(--app-text-muted); }
@media (max-width: 960px) {
  .controls { grid-template-columns: 1fr; }
  .input.small { width: 100%; }
}
</style>
