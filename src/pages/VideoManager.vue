<template>
  <div class="video-page">
    <div class="page-head">
      <div>
        <h2>视频管理</h2>
        <p>已拆分为三个区域：视频库、播放器、本地扫描。</p>
      </div>
      <div class="stats">
        <span class="stat">总计 {{ videos.length }}</span>
        <span class="stat">待看 {{ statusCount('watchlist') }}</span>
        <span class="stat">在看 {{ statusCount('watching') }}</span>
        <span class="stat">已看 {{ statusCount('completed') }}</span>
      </div>
    </div>

    <div class="subtabs">
      <button class="subtab" :class="{ active: activeTab === 'library' }" @click="activeTab = 'library'">视频库</button>
      <button class="subtab" :class="{ active: activeTab === 'player' }" @click="activeTab = 'player'">播放器</button>
      <button class="subtab" :class="{ active: activeTab === 'scan' }" @click="activeTab = 'scan'">本地扫描</button>
    </div>
    <div class="play-opts">
      <label class="check">
        <input type="checkbox" v-model="autoOptimizeOnPlay">
        播放前自动优化本地视频（首次可能等待，后续更快）
      </label>
    </div>

    <section v-if="activeTab === 'library'" class="panel">
      <div class="layout">
        <div class="panel form-panel">
          <h3>{{ editingId ? '编辑视频' : '添加视频' }}</h3>
          <div class="form-group">
            <label>标题 *</label>
            <input v-model.trim="form.title" class="input" placeholder="例如：Vue 3 进阶教程">
          </div>
          <div class="form-group">
            <label>视频链接 *</label>
            <input v-model.trim="form.url" class="input" placeholder="https://.../demo.mp4">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>分类</label>
              <input v-model.trim="form.category" class="input" placeholder="例如：Vue、算法">
            </div>
            <div class="form-group">
              <label>状态</label>
              <select v-model="form.status" class="input">
                <option value="watchlist">待看</option>
                <option value="watching">在看</option>
                <option value="completed">已看</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label>标签（逗号分隔）</label>
            <input v-model.trim="form.tagsText" class="input" placeholder="vue3, composition-api">
          </div>
          <div class="form-group">
            <label>备注</label>
            <textarea v-model.trim="form.note" class="input" rows="3" placeholder="学习重点..."></textarea>
          </div>

          <div class="actions">
            <button class="btn btn-primary" @click="saveVideo">{{ editingId ? '保存修改' : '添加视频' }}</button>
            <button class="btn" @click="resetForm">重置</button>
          </div>
        </div>

        <div class="panel list-panel">
          <div class="toolbar">
            <input v-model.trim="searchQuery" class="input" placeholder="搜索标题 / 分类 / 标签...">
            <select v-model="statusFilter" class="input">
              <option value="all">全部状态</option>
              <option value="watchlist">待看</option>
              <option value="watching">在看</option>
              <option value="completed">已看</option>
            </select>
          </div>

          <div v-if="filteredVideos.length === 0" class="empty">暂无视频记录</div>
          <div v-else class="cards">
            <article v-for="item in filteredVideos" :key="item.id" class="card" :class="{ active: item.id === playingId }">
              <div class="card-head">
                <div>
                  <h4>{{ item.title }}</h4>
                  <div class="meta">
                    <span>{{ item.category || '未分类' }}</span>
                    <span>·</span>
                    <span>{{ statusLabel(item.status) }}</span>
                    <span>·</span>
                    <span>{{ formatDate(item.updatedAt) }}</span>
                    <span v-if="item.localPath">· 本地</span>
                  </div>
                </div>
                <a class="open-link" :href="item.url" target="_blank" rel="noreferrer">打开</a>
              </div>
              <p v-if="item.note" class="note">{{ item.note }}</p>
              <div v-if="item.tags && item.tags.length" class="tags">
                <span v-for="tag in item.tags" :key="tag" class="tag">#{{ tag }}</span>
              </div>
              <div class="card-actions">
                <button class="btn btn-sm btn-primary" @click="playVideo(item)">播放</button>
                <button class="btn btn-sm" @click="editVideo(item)">编辑</button>
                <button class="btn btn-sm" @click="cycleStatus(item)">切换状态</button>
                <button class="btn btn-sm btn-danger" @click="deleteVideo(item.id)">删除</button>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>

    <section v-if="activeTab === 'player'" class="panel">
      <div class="player-layout">
        <div v-if="currentVideo" class="player-wrap" ref="playerWrapRef">
          <div class="player-title-row">
            <h3>{{ currentVideo.title }}</h3>
            <span class="meta">{{ statusLabel(currentVideo.status) }}</span>
          </div>
          <video
            ref="videoRef"
            class="player"
            :src="currentVideo.url"
            controls
            preload="metadata"
            @loadedmetadata="onLoadedMetadata"
            @timeupdate="onTimeUpdate"
            @playing="onPlaying"
            @error="onVideoError"
            @pause="isPlaying = false"
          ></video>
          <div class="player-controls">
            <button class="btn btn-sm" @click="togglePlayPause">{{ isPlaying ? '暂停' : '播放' }}</button>
            <button class="btn btn-sm" @click="seekBy(-10)">后退 10s</button>
            <button class="btn btn-sm" @click="seekBy(10)">快进 10s</button>
            <button class="btn btn-sm" @click="enterFullscreen">全屏</button>
            <button class="btn btn-sm" @click="downloadCurrent">下载</button>
            <span class="time-indicator">{{ formatDuration(currentTime) }} / {{ formatDuration(duration) }}</span>
          </div>
          <div class="progress-line">
            <div class="bar" :style="{ width: progressPercent + '%' }"></div>
          </div>
        </div>

        <div v-else class="empty">请先在“视频库”里点一个视频进行播放</div>

        <aside class="live-log">
          <div class="live-log-head">
            <h4>实时日志</h4>
            <button class="btn btn-sm" @click="clearLiveLogs">清空</button>
          </div>
          <div v-if="liveLogs.length === 0" class="live-empty">暂无实时日志</div>
          <div v-else class="live-list">
            <div v-for="item in liveLogs" :key="item.id" class="live-item">
              <div class="live-row">
                <span class="live-time">{{ formatTime(item.timestamp) }}</span>
                <span class="live-action">{{ item.action }}</span>
                <span class="live-status" :class="{ err: item.status === 'error' }">{{ item.status }}</span>
              </div>
              <div class="live-detail">{{ item.detail || '-' }}</div>
              <div class="live-ms">{{ item.durationMs ?? '-' }} ms</div>
            </div>
          </div>
        </aside>
      </div>
    </section>

    <section v-if="activeTab === 'scan'" class="panel">
      <h3>本地视频扫描</h3>
      <p class="scan-tip">输入本地目录绝对路径（例如：<code>/Users/mac/Movies</code>）并扫描。</p>
      <div class="scan-toolbar">
        <input v-model.trim="scanRootPath" class="input" placeholder="输入本地目录绝对路径">
        <label class="check"><input type="checkbox" v-model="scanRecursive"> 递归子目录</label>
        <button class="btn btn-primary" :disabled="scanning" @click="scanLocalVideos">{{ scanning ? '扫描中...' : '开始扫描' }}</button>
      </div>
      <div v-if="scanError" class="scan-error">{{ scanError }}</div>
      <div v-if="scanResults.length > 0" class="scan-result-head">
        <span>扫描到 {{ scanResults.length }} 个视频</span>
        <button class="btn" @click="importAllScanned">一键导入视频库</button>
      </div>
      <div v-if="scanResults.length > 0" class="scan-results">
        <div v-for="item in scanResults" :key="item.path" class="scan-item">
          <div>
            <div class="scan-name">{{ item.name }}</div>
            <div class="scan-path">{{ item.path }}</div>
          </div>
          <div class="scan-actions">
            <button class="btn btn-sm" @click="importOneScanned(item)">导入</button>
            <button class="btn btn-sm btn-primary" @click="previewScanned(item)">播放</button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import { api } from '../utils/api.js'
import { appendPerfLog } from '../utils/perfLogs.js'

const STORAGE_KEY = 'video_manager_items_v1'

export default {
  name: 'VideoManager',
  data() {
    return {
      activeTab: 'library',
      videos: [],
      editingId: null,
      playingId: null,
      searchQuery: '',
      statusFilter: 'all',
      duration: 0,
      currentTime: 0,
      isPlaying: false,
      scanRootPath: '',
      scanRecursive: true,
      scanning: false,
      scanError: '',
      scanResults: [],
      playMeasure: null,
      liveLogs: [],
      autoOptimizeOnPlay: true,
      optimizing: false,
      storageMode: 'unknown',
      form: this.emptyForm()
    }
  },
  computed: {
    filteredVideos() {
      const q = this.searchQuery.toLowerCase()
      return this.videos
        .filter((v) => {
          const matchStatus = this.statusFilter === 'all' || v.status === this.statusFilter
          if (!q) return matchStatus
          const hay = [v.title, v.category, ...(v.tags || [])].join(' ').toLowerCase()
          return matchStatus && hay.includes(q)
        })
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    },
    currentVideo() {
      return this.videos.find((v) => v.id === this.playingId) || null
    },
    progressPercent() {
      if (!this.duration) return 0
      return Math.min(100, (this.currentTime / this.duration) * 100)
    }
  },
  methods: {
    emptyForm() {
      return {
        title: '',
        url: '',
        category: '',
        status: 'watchlist',
        tagsText: '',
        note: ''
      }
    },
    statusLabel(status) {
      return { watchlist: '待看', watching: '在看', completed: '已看' }[status] || status
    },
    statusCount(status) {
      return this.videos.filter((v) => v.status === status).length
    },
    formatDate(ts) {
      if (!ts) return '-'
      return new Date(ts).toLocaleString('zh-CN', { hour12: false })
    },
    formatTime(ts) {
      if (!ts) return '-'
      return new Date(ts).toLocaleTimeString('zh-CN', { hour12: false })
    },
    formatDuration(seconds) {
      const sec = Number.isFinite(seconds) ? Math.floor(seconds) : 0
      const m = String(Math.floor(sec / 60)).padStart(2, '0')
      const s = String(sec % 60).padStart(2, '0')
      return `${m}:${s}`
    },
    parseTags(text) {
      return text
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    },
    normalizeVideos(list) {
      if (!Array.isArray(list)) return []
      const seen = new Set()
      const now = Date.now()
      return list
        .map((item) => {
          if (!item || typeof item !== 'object') return null
          const title = String(item.title || '').trim()
          const url = String(item.url || '').trim()
          if (!title || !url) return null
          const createdAt = Number(item.createdAt) || now
          const updatedAt = Number(item.updatedAt) || createdAt
          const id = String(item.id || `video_${updatedAt}`)
          if (seen.has(id)) return null
          seen.add(id)
          return {
            id,
            title,
            url,
            category: String(item.category || '').trim(),
            status: ['watchlist', 'watching', 'completed'].includes(String(item.status))
              ? String(item.status)
              : 'watchlist',
            tags: Array.isArray(item.tags)
              ? item.tags.map((tag) => String(tag || '').trim()).filter(Boolean).slice(0, 20)
              : [],
            note: String(item.note || ''),
            localPath: item.localPath ? String(item.localPath) : null,
            optimizedPath: item.optimizedPath ? String(item.optimizedPath) : '',
            createdAt,
            updatedAt
          }
        })
        .filter(Boolean)
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    },
    looksLikeLocalPath(input) {
      if (!input) return false
      return /^\/(Users|Volumes|private)\//.test(input) || /^[a-zA-Z]:\\/.test(input)
    },
    async persist() {
      const normalized = this.normalizeVideos(this.videos)
      this.videos = normalized
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
      if (this.storageMode !== 'server') return
      try {
        await api.videos.saveLibrary(normalized)
      } catch (error) {
        this.storageMode = 'local'
        this.recordLog({
          module: 'video',
          action: 'library_save_fallback_local',
          status: 'error',
          durationMs: 0,
          detail: error?.message || 'save library failed'
        })
      }
    },
    async load() {
      let localItems = []
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) {
          localItems = this.normalizeVideos(JSON.parse(raw))
          this.videos = localItems
        }
      } catch (error) {
        console.warn('加载视频数据失败', error)
      }

      try {
        const remote = await api.videos.getLibrary()
        const remoteItems = this.normalizeVideos(remote?.items || [])
        this.storageMode = 'server'

        if (remoteItems.length > 0) {
          this.videos = remoteItems
          localStorage.setItem(STORAGE_KEY, JSON.stringify(remoteItems))
          return
        }

        if (localItems.length > 0) {
          const saved = await api.videos.saveLibrary(localItems)
          const merged = this.normalizeVideos(saved?.items || localItems)
          this.videos = merged
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
          this.recordLog({
            module: 'video',
            action: 'library_migrated_to_server',
            status: 'ok',
            durationMs: 0,
            detail: `count=${merged.length}`
          })
        }
      } catch (error) {
        this.storageMode = 'local'
        this.recordLog({
          module: 'video',
          action: 'library_load_fallback_local',
          status: 'error',
          durationMs: 0,
          detail: error?.message || 'load library failed'
        })
      }
    },
    recordLog(payload) {
      appendPerfLog(payload)
      this.liveLogs.unshift({
        id: `live_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
        timestamp: Date.now(),
        action: payload.action || 'unknown',
        status: payload.status || 'ok',
        durationMs: Number.isFinite(payload.durationMs) ? Math.round(payload.durationMs) : null,
        detail: payload.detail || ''
      })
      if (this.liveLogs.length > 80) {
        this.liveLogs.length = 80
      }
    },
    clearLiveLogs() {
      this.liveLogs = []
    },
    async playVideo(item) {
      if (item.localPath) {
        try {
          await api.get('/health')
        } catch (error) {
          this.recordLog({
            module: 'video',
            action: 'backend_unreachable',
            status: 'error',
            durationMs: 0,
            name: item.title,
            path: item.localPath,
            detail: 'backend not reachable'
          })
          alert('后端服务未启动，无法播放本地视频。请先运行：npm run dev（或至少 npm run server:test）')
          return
        }
      }

      if (item.localPath && this.autoOptimizeOnPlay && !this.optimizing) {
        this.optimizing = true
        const optimizeStart = performance.now()
        this.recordLog({
          module: 'video',
          action: 'optimize_start',
          status: 'ok',
          durationMs: 0,
          name: item.title,
          path: item.localPath,
          detail: 'auto optimize before play'
        })
        try {
          const optimized = await api.videos.optimize({
            path: item.localPath,
            mode: 'faststart'
          })
          if (optimized?.streamUrl) {
            item.url = optimized.streamUrl
            item.optimizedPath = optimized.optimizedPath || ''
            item.updatedAt = Date.now()
            this.persist()
          }
          this.recordLog({
            module: 'video',
            action: 'optimize_done',
            status: 'ok',
            durationMs: performance.now() - optimizeStart,
            name: item.title,
            path: item.localPath,
            detail: optimized?.cached ? 'used cached optimized file' : 'generated optimized file'
          })
        } catch (error) {
          this.recordLog({
            module: 'video',
            action: 'optimize_error',
            status: 'error',
            durationMs: performance.now() - optimizeStart,
            name: item.title,
            path: item.localPath,
            detail: error?.message || 'optimize failed'
          })
        } finally {
          this.optimizing = false
        }
      }

      this.playingId = item.id
      this.activeTab = 'player'
      this.duration = 0
      this.currentTime = 0
      this.isPlaying = false
      this.recordLog({
        module: 'video',
        action: 'play_click',
        status: 'ok',
        durationMs: 0,
        name: item.title,
        path: item.localPath || item.url || '',
        detail: '点击播放按钮'
      })
      this.playMeasure = {
        startPerf: performance.now(),
        startAt: Date.now(),
        name: item.title,
        path: item.localPath || item.url || ''
      }
      await this.$nextTick()
      const video = this.$refs.videoRef
      if (!video) return
      try {
        await video.play()
      } catch (error) {
        this.recordLog({
          module: 'video',
          action: 'play_start',
          status: 'error',
          durationMs: performance.now() - this.playMeasure.startPerf,
          name: item.title,
          path: item.localPath || item.url || '',
          detail: error?.message || 'video.play() failed'
        })
        this.playMeasure = null
        alert('播放失败：请确认链接是可直接播放的视频地址（如 mp4）')
      }
    },
    togglePlayPause() {
      const video = this.$refs.videoRef
      if (!video) return
      if (video.paused) {
        video.play().catch(() => {})
      } else {
        video.pause()
      }
    },
    seekBy(seconds) {
      const video = this.$refs.videoRef
      if (!video) return
      const next = Math.max(0, Math.min(video.currentTime + seconds, video.duration || Infinity))
      video.currentTime = next
    },
    enterFullscreen() {
      const el = this.$refs.playerWrapRef
      if (!el) return
      if (el.requestFullscreen) {
        el.requestFullscreen().catch(() => {})
      }
    },
    downloadCurrent() {
      if (!this.currentVideo) return
      const href = this.currentVideo.localPath ? api.videos.downloadUrl(this.currentVideo.localPath) : this.currentVideo.url
      const a = document.createElement('a')
      a.href = href
      a.download = `${this.currentVideo.title || 'video'}.mp4`
      a.target = '_blank'
      a.rel = 'noreferrer'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    },
    onLoadedMetadata(event) {
      const video = event.target
      this.duration = video.duration || 0
      this.currentTime = video.currentTime || 0
      if (this.playMeasure) {
        this.recordLog({
          module: 'video',
          action: 'metadata_loaded',
          status: 'ok',
          durationMs: performance.now() - this.playMeasure.startPerf,
          name: this.playMeasure.name,
          path: this.playMeasure.path,
          detail: 'loadedmetadata'
        })
      }
    },
    onVideoError(event) {
      const mediaError = event?.target?.error
      this.recordLog({
        module: 'video',
        action: 'play_error',
        status: 'error',
        durationMs: this.playMeasure ? performance.now() - this.playMeasure.startPerf : null,
        name: this.playMeasure?.name || this.currentVideo?.title || '',
        path: this.playMeasure?.path || this.currentVideo?.localPath || this.currentVideo?.url || '',
        detail: mediaError ? `code=${mediaError.code}` : 'video element error'
      })
      this.playMeasure = null
    },
    onPlaying() {
      this.isPlaying = true
      if (!this.playMeasure) return
      this.recordLog({
        module: 'video',
        action: 'play_start',
        status: 'ok',
        durationMs: performance.now() - this.playMeasure.startPerf,
        name: this.playMeasure.name,
        path: this.playMeasure.path,
        detail: `startedAt=${this.playMeasure.startAt}`
      })
      this.playMeasure = null
    },
    onTimeUpdate(event) {
      const video = event.target
      this.currentTime = video.currentTime || 0
    },
    saveVideo() {
      if (!this.form.title || !this.form.url) {
        alert('请填写标题和视频链接')
        return
      }
      if (this.looksLikeLocalPath(this.form.url)) {
        alert('检测到你填的是本地路径。请使用“本地扫描”页签导入目录里的视频，再播放。')
        return
      }

      const now = Date.now()
      const payload = {
        title: this.form.title,
        url: this.form.url,
        category: this.form.category,
        status: this.form.status,
        tags: this.parseTags(this.form.tagsText),
        note: this.form.note,
        updatedAt: now,
        localPath: null
      }

      if (this.editingId) {
        const idx = this.videos.findIndex((v) => v.id === this.editingId)
        if (idx !== -1) {
          this.videos[idx] = { ...this.videos[idx], ...payload }
        }
      } else {
        this.videos.unshift({
          id: `video_${now}`,
          createdAt: now,
          ...payload
        })
      }

      this.persist()
      this.resetForm()
    },
    editVideo(item) {
      this.editingId = item.id
      this.form = {
        title: item.title,
        url: item.url,
        category: item.category || '',
        status: item.status || 'watchlist',
        tagsText: (item.tags || []).join(', '),
        note: item.note || ''
      }
      this.activeTab = 'library'
    },
    cycleStatus(item) {
      const seq = ['watchlist', 'watching', 'completed']
      const i = seq.indexOf(item.status)
      const next = seq[(i + 1) % seq.length]
      item.status = next
      item.updatedAt = Date.now()
      this.persist()
    },
    deleteVideo(id) {
      if (!confirm('确定删除这个视频记录吗？')) return
      this.videos = this.videos.filter((v) => v.id !== id)
      this.persist()
      if (this.editingId === id) {
        this.resetForm()
      }
      if (this.playingId === id) {
        this.playingId = null
      }
    },
    resetForm() {
      this.editingId = null
      this.form = this.emptyForm()
    },
    hasVideoByLocalPath(localPath) {
      return this.videos.some((v) => v.localPath && v.localPath === localPath)
    },
    importOneScanned(item) {
      if (this.hasVideoByLocalPath(item.path)) {
        return
      }
      const now = Date.now()
      this.videos.unshift({
        id: `video_${now}_${Math.random().toString(16).slice(2, 6)}`,
        title: item.name,
        url: item.streamUrl,
        category: '本地视频',
        status: 'watchlist',
        tags: ['local'],
        note: '',
        localPath: item.path,
        createdAt: now,
        updatedAt: now
      })
      this.persist()
    },
    importAllScanned() {
      for (const item of this.scanResults) {
        this.importOneScanned(item)
      }
    },
    async previewScanned(item) {
      if (!this.hasVideoByLocalPath(item.path)) {
        this.importOneScanned(item)
      }
      const match = this.videos.find((v) => v.localPath === item.path)
      if (match) {
        await this.playVideo(match)
      }
    },
    async scanLocalVideos() {
      if (!this.scanRootPath) {
        alert('请先输入目录绝对路径')
        return
      }
      this.scanError = ''
      this.scanning = true
      this.scanResults = []
      const scanStart = performance.now()

      try {
        const result = await api.videos.scan({
          rootPath: this.scanRootPath,
          recursive: this.scanRecursive,
          maxFiles: 3000
        })
        this.scanResults = (result.items || []).map((item) => ({
          ...item,
          streamUrl: item.streamUrl,
          downloadUrl: item.downloadUrl
        }))
        this.recordLog({
          module: 'video',
          action: 'scan',
          status: 'ok',
          durationMs: performance.now() - scanStart,
          name: this.scanRootPath,
          detail: `count=${this.scanResults.length}`
        })
      } catch (error) {
        this.scanError = error.message || '扫描失败'
        if (String(error.message || '').includes('Failed to fetch')) {
          this.scanError = '后端服务不可用，请先启动：npm run dev（或 npm run server:test）'
        }
        this.recordLog({
          module: 'video',
          action: 'scan',
          status: 'error',
          durationMs: performance.now() - scanStart,
          name: this.scanRootPath,
          detail: this.scanError
        })
      } finally {
        this.scanning = false
      }
    }
  },
  mounted() {
    this.load()
  }
}
</script>

<style scoped>
.video-page { color: var(--app-text); }
.page-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
.page-head h2 { margin: 0; }
.page-head p { margin: 6px 0 0; color: var(--app-text-muted); font-size: 0.9em; }
.stats { display: flex; gap: 8px; flex-wrap: wrap; }
.stat { background: var(--app-card); border: 1px solid var(--app-border); padding: 6px 10px; border-radius: 999px; font-size: 0.82em; }

.subtabs { display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
.subtab { border: 1px solid var(--app-border); background: var(--app-card); color: var(--app-text-secondary); border-radius: 8px; padding: 8px 12px; cursor: pointer; font-weight: 700; }
.subtab.active { background: var(--app-gradient); color: #fff; border-color: transparent; }
.play-opts { margin-bottom: 10px; }

.layout { display: grid; grid-template-columns: 360px 1fr; gap: 14px; }
.panel { background: var(--app-card); border: 1px solid var(--app-border); border-radius: 12px; padding: 14px; box-shadow: 0 2px 8px var(--app-shadow-light); }
.panel h3 { margin: 0 0 12px; }

.form-group { margin-bottom: 10px; }
.form-group label { display: block; margin-bottom: 5px; font-size: 0.86em; font-weight: 700; color: var(--app-text-secondary); }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.input { width: 100%; border: 2px solid var(--app-border); border-radius: 8px; padding: 8px 10px; font: inherit; background: var(--app-card); color: var(--app-text); }
.input:focus { outline: none; border-color: var(--app-primary); }

.actions { display: flex; gap: 8px; margin-top: 6px; }
.btn { border: 1px solid var(--app-border); background: var(--app-card); color: var(--app-text-secondary); border-radius: 8px; padding: 8px 10px; cursor: pointer; }
.btn-primary { background: var(--app-gradient); border-color: transparent; color: #fff; }
.btn-danger { background: #ef4444; border-color: #ef4444; color: #fff; }
.btn-sm { padding: 6px 8px; font-size: 0.8em; }

.player-wrap { border: 1px solid var(--app-border); border-radius: 10px; padding: 10px; background: #0f172a; color: #f8fafc; }
.player-layout { display: grid; grid-template-columns: 1fr 320px; gap: 10px; align-items: start; }
.player-title-row { display: flex; justify-content: space-between; gap: 10px; align-items: center; margin-bottom: 8px; }
.player-title-row h3 { margin: 0; font-size: 0.95em; color: #f8fafc; }
.player { width: 100%; border-radius: 8px; background: #000; }
.player-controls { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; margin-top: 8px; }
.player-controls .btn { background: #1e293b; color: #e2e8f0; border-color: #334155; }
.time-indicator { font-size: 0.8em; color: #cbd5e1; margin-left: auto; }
.progress-line { height: 4px; background: #1e293b; border-radius: 999px; margin-top: 8px; overflow: hidden; }
.bar { height: 100%; background: linear-gradient(90deg, #22d3ee, #3b82f6); }
.live-log { border: 1px solid var(--app-border); border-radius: 10px; padding: 10px; background: var(--app-card); min-height: 180px; }
.live-log-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.live-log-head h4 { margin: 0; font-size: 0.92em; }
.live-empty { color: var(--app-text-muted); font-size: 0.85em; padding: 10px 0; }
.live-list { display: grid; gap: 8px; max-height: 360px; overflow: auto; }
.live-item { border: 1px solid var(--app-border); border-radius: 8px; padding: 8px; background: var(--app-card); }
.live-row { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; font-size: 0.8em; }
.live-time { color: var(--app-text-muted); }
.live-action { font-weight: 700; }
.live-status { color: #16a34a; font-weight: 700; }
.live-status.err { color: #ef4444; }
.live-detail { margin-top: 4px; color: var(--app-text-secondary); font-size: 0.8em; word-break: break-all; }
.live-ms { margin-top: 2px; color: var(--app-text-muted); font-size: 0.78em; }

.toolbar { display: grid; grid-template-columns: 1fr 170px; gap: 10px; margin-bottom: 10px; }
.cards { display: grid; gap: 10px; }
.card { border: 1px solid var(--app-border); background: var(--app-card); border-radius: 10px; padding: 12px; }
.card.active { border-color: var(--app-primary); box-shadow: 0 0 0 2px var(--app-shadow-light); }
.card-head { display: flex; justify-content: space-between; gap: 10px; }
.card h4 { margin: 0; font-size: 1.02em; }
.meta { color: var(--app-text-muted); font-size: 0.8em; margin-top: 4px; display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.open-link { color: var(--app-primary); font-size: 0.82em; font-weight: 700; text-decoration: none; }
.note { margin: 8px 0; font-size: 0.9em; color: var(--app-text-secondary); white-space: pre-wrap; }
.tags { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }
.tag { font-size: 0.78em; padding: 3px 8px; border-radius: 999px; background: rgba(59, 130, 246, 0.12); color: var(--app-primary); }
.card-actions { display: flex; gap: 6px; flex-wrap: wrap; }
.empty { text-align: center; color: var(--app-text-muted); padding: 40px 12px; border: 1px dashed var(--app-border); border-radius: 10px; }

.scan-tip { margin: 0 0 10px; font-size: 0.86em; color: var(--app-text-muted); }
.scan-toolbar { display: grid; grid-template-columns: 1fr auto auto; gap: 8px; align-items: center; margin-bottom: 10px; }
.check { font-size: 0.85em; color: var(--app-text-secondary); }
.scan-error { color: #ef4444; font-size: 0.85em; margin-bottom: 8px; }
.scan-result-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 0.9em; }
.scan-results { display: grid; gap: 8px; max-height: 420px; overflow: auto; }
.scan-item { display: flex; justify-content: space-between; align-items: center; gap: 10px; border: 1px solid var(--app-border); border-radius: 8px; padding: 10px; background: var(--app-card); }
.scan-name { font-weight: 700; }
.scan-path { font-size: 0.8em; color: var(--app-text-muted); word-break: break-all; margin-top: 2px; }
.scan-actions { display: flex; gap: 6px; }

@media (max-width: 980px) {
  .layout { grid-template-columns: 1fr; }
  .player-layout { grid-template-columns: 1fr; }
}

@media (max-width: 640px) {
  .form-row { grid-template-columns: 1fr; }
  .toolbar { grid-template-columns: 1fr; }
  .scan-toolbar { grid-template-columns: 1fr; }
  .time-indicator { margin-left: 0; width: 100%; }
  .scan-result-head,
  .scan-item { flex-direction: column; align-items: flex-start; }
}
</style>
