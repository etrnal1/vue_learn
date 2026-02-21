<template>
  <div class="music-page">
    <div class="page-head">
      <div>
        <h2>音乐管理</h2>
        <p>支持音乐库管理、音频播放和本地目录扫描导入。</p>
      </div>
      <div class="stats">
        <span class="stat">总计 {{ tracks.length }}</span>
        <span class="stat">想听 {{ statusCount('wishlist') }}</span>
        <span class="stat">在听 {{ statusCount('listening') }}</span>
        <span class="stat">已听 {{ statusCount('completed') }}</span>
      </div>
    </div>

    <div class="subtabs">
      <button class="subtab" :class="{ active: activeTab === 'library' }" @click="activeTab = 'library'">音乐库</button>
      <button class="subtab" :class="{ active: activeTab === 'player' }" @click="activeTab = 'player'">播放器</button>
      <button class="subtab" :class="{ active: activeTab === 'scan' }" @click="activeTab = 'scan'">本地扫描</button>
    </div>

    <section v-if="activeTab === 'library'" class="panel">
      <div class="layout">
        <div class="panel form-panel">
          <h3>{{ editingId ? '编辑音乐' : '添加音乐' }}</h3>
          <div class="form-group">
            <label>标题 *</label>
            <input v-model.trim="form.title" class="input" placeholder="例如：夜曲">
          </div>
          <div class="form-group">
            <label>音频链接 *</label>
            <input v-model.trim="form.url" class="input" placeholder="https://.../demo.mp3">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>歌手 / 专辑</label>
              <input v-model.trim="form.artist" class="input" placeholder="例如：周杰伦">
            </div>
            <div class="form-group">
              <label>状态</label>
              <select v-model="form.status" class="input">
                <option value="wishlist">想听</option>
                <option value="listening">在听</option>
                <option value="completed">已听</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label>标签（逗号分隔）</label>
            <input v-model.trim="form.tagsText" class="input" placeholder="流行, 华语">
          </div>
          <div class="form-group">
            <label>备注</label>
            <textarea v-model.trim="form.note" class="input" rows="3" placeholder="收藏原因..."></textarea>
          </div>
          <div class="actions">
            <button class="btn btn-primary" @click="saveTrack">{{ editingId ? '保存修改' : '添加音乐' }}</button>
            <button class="btn" @click="resetForm">重置</button>
          </div>
        </div>

        <div class="panel list-panel">
          <div class="toolbar">
            <input v-model.trim="searchQuery" class="input" placeholder="搜索标题 / 歌手 / 标签...">
            <select v-model="statusFilter" class="input">
              <option value="all">全部状态</option>
              <option value="wishlist">想听</option>
              <option value="listening">在听</option>
              <option value="completed">已听</option>
            </select>
          </div>

          <div v-if="filteredTracks.length === 0" class="empty">暂无音乐记录</div>
          <div v-else class="cards">
            <article v-for="item in filteredTracks" :key="item.id" class="card" :class="{ active: item.id === playingId }">
              <div class="card-head">
                <div>
                  <h4>{{ item.title }}</h4>
                  <div class="meta">
                    <span>{{ item.artist || '未知歌手' }}</span>
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
                <button class="btn btn-sm btn-primary" @click="playTrack(item)">播放</button>
                <button class="btn btn-sm" @click="editTrack(item)">编辑</button>
                <button class="btn btn-sm" @click="cycleStatus(item)">切换状态</button>
                <button class="btn btn-sm btn-danger" @click="deleteTrack(item.id)">删除</button>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>

    <section v-if="activeTab === 'player'" class="panel">
      <div v-if="currentTrack" class="player-wrap">
        <div class="player-title-row">
          <h3>{{ currentTrack.title }}</h3>
          <span class="meta">{{ currentTrack.artist || '未知歌手' }}</span>
        </div>
        <audio
          ref="audioRef"
          class="player"
          :src="currentTrack.url"
          controls
          preload="metadata"
          @loadedmetadata="onLoadedMetadata"
          @timeupdate="onTimeUpdate"
          @play="isPlaying = true"
          @pause="isPlaying = false"
        ></audio>
        <div class="player-controls">
          <button class="btn btn-sm" @click="togglePlayPause">{{ isPlaying ? '暂停' : '播放' }}</button>
          <button class="btn btn-sm" @click="seekBy(-10)">后退 10s</button>
          <button class="btn btn-sm" @click="seekBy(10)">快进 10s</button>
          <button class="btn btn-sm" @click="downloadCurrent">下载</button>
          <span class="time-indicator">{{ formatDuration(currentTime) }} / {{ formatDuration(duration) }}</span>
        </div>
        <div class="progress-line">
          <div class="bar" :style="{ width: progressPercent + '%' }"></div>
        </div>
      </div>
      <div v-else class="empty">请先在“音乐库”里选择一个音频播放</div>
    </section>

    <section v-if="activeTab === 'scan'" class="panel">
      <h3>本地音乐扫描</h3>
      <p class="scan-tip">输入本地目录绝对路径（例如：<code>/Users/mac/Music</code>）并扫描。</p>
      <div class="scan-toolbar">
        <input v-model.trim="scanRootPath" class="input" placeholder="输入本地目录绝对路径">
        <label class="check"><input type="checkbox" v-model="scanRecursive"> 递归子目录</label>
        <button class="btn btn-primary" :disabled="scanning" @click="scanLocalMusic">{{ scanning ? '扫描中...' : '开始扫描' }}</button>
      </div>
      <div v-if="scanError" class="scan-error">{{ scanError }}</div>
      <div v-if="scanResults.length > 0" class="scan-result-head">
        <span>扫描到 {{ scanResults.length }} 个音频</span>
        <button class="btn" @click="importAllScanned">一键导入音乐库</button>
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

const STORAGE_KEY = 'music_manager_items_v1'

export default {
  name: 'MusicManager',
  data() {
    return {
      activeTab: 'library',
      tracks: [],
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
      form: this.emptyForm()
    }
  },
  computed: {
    filteredTracks() {
      const q = this.searchQuery.toLowerCase()
      return this.tracks
        .filter((v) => {
          const matchStatus = this.statusFilter === 'all' || v.status === this.statusFilter
          if (!q) return matchStatus
          const hay = [v.title, v.artist, ...(v.tags || [])].join(' ').toLowerCase()
          return matchStatus && hay.includes(q)
        })
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    },
    currentTrack() {
      return this.tracks.find((v) => v.id === this.playingId) || null
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
        artist: '',
        status: 'wishlist',
        tagsText: '',
        note: ''
      }
    },
    statusLabel(status) {
      return { wishlist: '想听', listening: '在听', completed: '已听' }[status] || status
    },
    statusCount(status) {
      return this.tracks.filter((v) => v.status === status).length
    },
    formatDate(ts) {
      if (!ts) return '-'
      return new Date(ts).toLocaleString('zh-CN', { hour12: false })
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
    persist() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.tracks))
    },
    load() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return
        const list = JSON.parse(raw)
        if (Array.isArray(list)) {
          this.tracks = list
        }
      } catch (error) {
        console.warn('加载音乐数据失败', error)
      }
    },
    async playTrack(item) {
      this.playingId = item.id
      this.activeTab = 'player'
      this.duration = 0
      this.currentTime = 0
      this.isPlaying = false
      await this.$nextTick()
      const audio = this.$refs.audioRef
      if (!audio) return
      try {
        await audio.play()
      } catch (error) {
        alert('播放失败：请确认链接是可直接播放的音频地址（如 mp3）')
      }
    },
    togglePlayPause() {
      const audio = this.$refs.audioRef
      if (!audio) return
      if (audio.paused) {
        audio.play().catch(() => {})
      } else {
        audio.pause()
      }
    },
    seekBy(seconds) {
      const audio = this.$refs.audioRef
      if (!audio) return
      const next = Math.max(0, Math.min(audio.currentTime + seconds, audio.duration || Infinity))
      audio.currentTime = next
    },
    downloadCurrent() {
      if (!this.currentTrack) return
      const href = this.currentTrack.localPath ? api.music.downloadUrl(this.currentTrack.localPath) : this.currentTrack.url
      const a = document.createElement('a')
      a.href = href
      a.download = `${this.currentTrack.title || 'audio'}.mp3`
      a.target = '_blank'
      a.rel = 'noreferrer'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    },
    onLoadedMetadata(event) {
      const audio = event.target
      this.duration = audio.duration || 0
      this.currentTime = audio.currentTime || 0
    },
    onTimeUpdate(event) {
      const audio = event.target
      this.currentTime = audio.currentTime || 0
    },
    saveTrack() {
      if (!this.form.title || !this.form.url) {
        alert('请填写标题和音频链接')
        return
      }

      const now = Date.now()
      const payload = {
        title: this.form.title,
        url: this.form.url,
        artist: this.form.artist,
        status: this.form.status,
        tags: this.parseTags(this.form.tagsText),
        note: this.form.note,
        updatedAt: now,
        localPath: null
      }

      if (this.editingId) {
        const idx = this.tracks.findIndex((v) => v.id === this.editingId)
        if (idx !== -1) {
          this.tracks[idx] = { ...this.tracks[idx], ...payload }
        }
      } else {
        this.tracks.unshift({
          id: `music_${now}`,
          createdAt: now,
          ...payload
        })
      }

      this.persist()
      this.resetForm()
    },
    editTrack(item) {
      this.editingId = item.id
      this.form = {
        title: item.title,
        url: item.url,
        artist: item.artist || '',
        status: item.status || 'wishlist',
        tagsText: (item.tags || []).join(', '),
        note: item.note || ''
      }
      this.activeTab = 'library'
    },
    cycleStatus(item) {
      const seq = ['wishlist', 'listening', 'completed']
      const i = seq.indexOf(item.status)
      const next = seq[(i + 1) % seq.length]
      item.status = next
      item.updatedAt = Date.now()
      this.persist()
    },
    deleteTrack(id) {
      if (!confirm('确定删除这个音乐记录吗？')) return
      this.tracks = this.tracks.filter((v) => v.id !== id)
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
    hasTrackByLocalPath(localPath) {
      return this.tracks.some((v) => v.localPath && v.localPath === localPath)
    },
    importOneScanned(item) {
      if (this.hasTrackByLocalPath(item.path)) {
        return
      }
      const now = Date.now()
      this.tracks.unshift({
        id: `music_${now}_${Math.random().toString(16).slice(2, 6)}`,
        title: item.name,
        url: item.streamUrl,
        artist: '本地音乐',
        status: 'wishlist',
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
      if (!this.hasTrackByLocalPath(item.path)) {
        this.importOneScanned(item)
      }
      const match = this.tracks.find((v) => v.localPath === item.path)
      if (match) {
        await this.playTrack(match)
      }
    },
    async scanLocalMusic() {
      if (!this.scanRootPath) {
        alert('请先输入目录绝对路径')
        return
      }
      this.scanError = ''
      this.scanning = true
      this.scanResults = []

      try {
        const result = await api.music.scan({
          rootPath: this.scanRootPath,
          recursive: this.scanRecursive,
          maxFiles: 3000
        })
        this.scanResults = result.items || []
      } catch (error) {
        this.scanError = error.message || '扫描失败'
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
.music-page { color: var(--app-text); }
.page-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
.page-head h2 { margin: 0; }
.page-head p { margin: 6px 0 0; color: var(--app-text-muted); font-size: 0.9em; }
.stats { display: flex; gap: 8px; flex-wrap: wrap; }
.stat { background: var(--app-card); border: 1px solid var(--app-border); padding: 6px 10px; border-radius: 999px; font-size: 0.82em; }

.subtabs { display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
.subtab { border: 1px solid var(--app-border); background: var(--app-card); color: var(--app-text-secondary); border-radius: 8px; padding: 8px 12px; cursor: pointer; font-weight: 700; }
.subtab.active { background: var(--app-gradient); color: #fff; border-color: transparent; }

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

.player-wrap { border: 1px solid var(--app-border); border-radius: 10px; padding: 12px; background: #0f172a; color: #f8fafc; }
.player-title-row { display: flex; justify-content: space-between; gap: 10px; align-items: center; margin-bottom: 8px; }
.player-title-row h3 { margin: 0; font-size: 0.95em; color: #f8fafc; }
.player { width: 100%; }
.player-controls { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; margin-top: 10px; }
.player-controls .btn { background: #1e293b; color: #e2e8f0; border-color: #334155; }
.time-indicator { font-size: 0.8em; color: #cbd5e1; margin-left: auto; }
.progress-line { height: 4px; background: #1e293b; border-radius: 999px; margin-top: 8px; overflow: hidden; }
.bar { height: 100%; background: linear-gradient(90deg, #34d399, #10b981); }

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
.tag { font-size: 0.78em; padding: 3px 8px; border-radius: 999px; background: rgba(16, 185, 129, 0.12); color: #10b981; }
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
