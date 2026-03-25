<template>
  <div class="screen-recorder-page">
    <!-- 浏览器不支持提示 -->
    <div v-if="!isSupported" class="unsupported-banner">
      <div class="unsupported-icon">⚠️</div>
      <div class="unsupported-text">
        <h3>浏览器不支持录屏功能</h3>
        <p>请使用 Chrome 72+、Edge 79+ 或 Firefox 66+ 等支持 <code>getDisplayMedia</code> API 的浏览器。</p>
      </div>
    </div>

    <div class="recorder-layout" :class="{ 'is-disabled': !isSupported }">
      <!-- 左侧：控制 + 预览 -->
      <div class="left-panel">
        <!-- 录制控制卡片 -->
        <div class="card control-card">
          <div class="card-header">
            <h2 class="card-title">录屏控制</h2>
            <div class="status-indicator" :class="statusClass">
              <span class="status-dot" :class="{ pulse: recordingState === 'recording' }"></span>
              <span class="status-text">{{ statusText }}</span>
            </div>
          </div>

          <!-- 计时器 -->
          <div class="timer-display" :class="{ active: recordingState !== 'idle' }">
            {{ formattedDuration }}
          </div>

          <!-- 控制按钮 -->
          <div class="control-buttons">
            <button
              v-if="recordingState === 'idle'"
              class="btn btn-primary btn-large"
              @click="startRecording"
              :disabled="!isSupported"
            >
              <span class="btn-icon">⏺</span>
              选择录制源并开始
            </button>

            <template v-if="recordingState === 'recording' || recordingState === 'paused'">
              <button
                class="btn btn-warning"
                @click="togglePause"
              >
                <span class="btn-icon">{{ recordingState === 'recording' ? '⏸' : '▶' }}</span>
                {{ recordingState === 'recording' ? '暂停' : '继续' }}
              </button>
              <button
                class="btn btn-danger"
                @click="stopRecording"
              >
                <span class="btn-icon">⏹</span>
                停止录制
              </button>
            </template>
          </div>

          <!-- 错误提示 -->
          <div v-if="errorMsg" class="error-msg">
            {{ errorMsg }}
          </div>
        </div>

        <!-- 设置面板（录制前显示） -->
        <div class="card settings-card" v-show="recordingState === 'idle'">
          <div class="card-header">
            <h2 class="card-title">录制设置</h2>
          </div>
          <div class="settings-grid">
            <div class="setting-item">
              <label class="setting-label">系统音频</label>
              <div class="toggle-group">
                <button
                  class="toggle-btn"
                  :class="{ active: settings.captureAudio }"
                  @click="settings.captureAudio = true"
                >开启</button>
                <button
                  class="toggle-btn"
                  :class="{ active: !settings.captureAudio }"
                  @click="settings.captureAudio = false"
                >关闭</button>
              </div>
            </div>

            <div class="setting-item">
              <label class="setting-label">麦克风</label>
              <div class="toggle-group">
                <button
                  class="toggle-btn"
                  :class="{ active: settings.captureMic }"
                  @click="settings.captureMic = true"
                >开启</button>
                <button
                  class="toggle-btn"
                  :class="{ active: !settings.captureMic }"
                  @click="settings.captureMic = false"
                >关闭</button>
              </div>
            </div>

            <div class="setting-item">
              <label class="setting-label">视频质量</label>
              <div class="toggle-group">
                <button
                  class="toggle-btn"
                  :class="{ active: settings.quality === 'high' }"
                  @click="settings.quality = 'high'"
                >高 2.5M</button>
                <button
                  class="toggle-btn"
                  :class="{ active: settings.quality === 'medium' }"
                  @click="settings.quality = 'medium'"
                >中 1.2M</button>
                <button
                  class="toggle-btn"
                  :class="{ active: settings.quality === 'low' }"
                  @click="settings.quality = 'low'"
                >低 600K</button>
              </div>
            </div>

            <div class="setting-item">
              <label class="setting-label">帧率</label>
              <div class="toggle-group">
                <button
                  class="toggle-btn"
                  :class="{ active: settings.frameRate === 30 }"
                  @click="settings.frameRate = 30"
                >30 fps</button>
                <button
                  class="toggle-btn"
                  :class="{ active: settings.frameRate === 60 }"
                  @click="settings.frameRate = 60"
                >60 fps</button>
              </div>
            </div>
          </div>
        </div>

        <!-- 预览区 -->
        <div class="card preview-card">
          <div class="card-header">
            <h2 class="card-title">
              {{ previewMode === 'live' ? '实时预览' : '录制回放' }}
            </h2>
            <span v-if="previewMode === 'playback'" class="badge badge-success">录制完成</span>
          </div>
          <div class="video-wrapper">
            <video
              ref="liveVideo"
              class="preview-video"
              autoplay
              muted
              playsinline
              v-show="previewMode === 'live' && (recordingState === 'recording' || recordingState === 'paused')"
            ></video>
            <video
              ref="playbackVideo"
              class="preview-video"
              controls
              playsinline
              v-show="previewMode === 'playback'"
            ></video>
            <div
              class="video-placeholder"
              v-show="previewMode === 'none' || (previewMode === 'live' && recordingState === 'idle')"
            >
              <div class="placeholder-icon">🎬</div>
              <p>录制开始后显示预览</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：历史列表 -->
      <div class="right-panel">
        <div class="card history-card">
          <div class="card-header">
            <h2 class="card-title">录制历史</h2>
            <span class="badge">{{ recordings.length }} 条</span>
          </div>

          <div v-if="recordings.length === 0" class="empty-state">
            <div class="empty-icon">📂</div>
            <p>暂无录制记录</p>
            <p class="empty-hint">完成录制后记录将保存在此处</p>
          </div>

          <div v-else class="recordings-list">
            <div
              v-for="rec in recordings"
              :key="rec.id"
              class="recording-item"
              :class="{ playing: playingId === rec.id }"
            >
              <div class="rec-info">
                <div class="rec-name-row">
                  <span v-if="renamingId !== rec.id" class="rec-name" :title="rec.name">
                    {{ rec.name }}
                  </span>
                  <input
                    v-else
                    class="rename-input"
                    v-model="renameValue"
                    @keyup.enter="confirmRename(rec.id)"
                    @keyup.escape="cancelRename"
                    @blur="confirmRename(rec.id)"
                    ref="renameInput"
                  />
                </div>
                <div class="rec-meta">
                  <span class="meta-item">
                    <span class="meta-icon">🕐</span>{{ rec.duration }}
                  </span>
                  <span class="meta-item">
                    <span class="meta-icon">💾</span>{{ rec.size }}
                  </span>
                  <span class="meta-item">
                    <span class="meta-icon">📅</span>{{ rec.date }}
                  </span>
                </div>
              </div>
              <div class="rec-actions">
                <button class="action-btn btn-play" @click="playRecording(rec)" title="播放">
                  ▶
                </button>
                <button class="action-btn btn-download" @click="downloadRecording(rec)" title="下载">
                  ⬇
                </button>
                <button class="action-btn btn-rename" @click="startRename(rec)" title="重命名">
                  ✏
                </button>
                <button class="action-btn btn-delete" @click="deleteRecording(rec.id)" title="删除">
                  🗑
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 播放弹窗 -->
    <div class="modal-overlay" v-if="modalVisible" @click.self="closeModal">
      <div class="modal-box">
        <div class="modal-header">
          <h3 class="modal-title">{{ modalTitle }}</h3>
          <button class="modal-close" @click="closeModal">✕</button>
        </div>
        <div class="modal-body">
          <video
            ref="modalVideo"
            class="modal-video"
            controls
            autoplay
            playsinline
          ></video>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary" @click="downloadFromModal">下载</button>
          <button class="btn btn-secondary" @click="closeModal">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
const DB_NAME = 'screen-recorder-db'
const DB_VERSION = 1
const STORE_NAME = 'recordings'

const BITRATE_MAP = {
  high: 2500000,
  medium: 1200000,
  low: 600000,
}

export default {
  name: 'ScreenRecorder',

  data() {
    return {
      isSupported: false,
      recordingState: 'idle', // idle | recording | paused | stopped
      settings: {
        captureAudio: true,
        captureMic: false,
        quality: 'high',
        frameRate: 30,
      },
      // 计时
      elapsedSeconds: 0,
      timerInterval: null,
      // MediaRecorder
      mediaRecorder: null,
      recordedChunks: [],
      displayStream: null,
      micStream: null,
      audioContext: null,
      // 预览
      previewMode: 'none', // none | live | playback
      currentBlob: null,
      currentPlaybackUrl: null,
      // 历史
      recordings: [],
      db: null,
      // 重命名
      renamingId: null,
      renameValue: '',
      // 播放弹窗
      modalVisible: false,
      modalTitle: '',
      modalBlobUrl: null,
      playingId: null,
      // 错误
      errorMsg: '',
    }
  },

  computed: {
    formattedDuration() {
      const s = this.elapsedSeconds
      const h = Math.floor(s / 3600)
      const m = Math.floor((s % 3600) / 60)
      const sec = s % 60
      return [h, m, sec].map((v) => String(v).padStart(2, '0')).join(':')
    },

    statusClass() {
      return {
        'status-idle': this.recordingState === 'idle',
        'status-recording': this.recordingState === 'recording',
        'status-paused': this.recordingState === 'paused',
        'status-stopped': this.recordingState === 'stopped',
      }
    },

    statusText() {
      const map = {
        idle: '待机',
        recording: '录制中',
        paused: '已暂停',
        stopped: '已停止',
      }
      return map[this.recordingState] || '待机'
    },
  },

  async mounted() {
    this.isSupported =
      !!navigator.mediaDevices &&
      typeof navigator.mediaDevices.getDisplayMedia === 'function' &&
      typeof MediaRecorder !== 'undefined'

    await this.initDB()
    await this.loadRecordings()
  },

  beforeUnmount() {
    this.cleanupStreams()
    this.stopTimer()
    if (this.currentPlaybackUrl) URL.revokeObjectURL(this.currentPlaybackUrl)
    if (this.modalBlobUrl) URL.revokeObjectURL(this.modalBlobUrl)
  },

  methods: {
    // ─── IndexedDB ───────────────────────────────────────────────────
    initDB() {
      return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION)
        req.onupgradeneeded = (e) => {
          const db = e.target.result
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            const store = db.createObjectStore(STORE_NAME, {
              keyPath: 'id',
              autoIncrement: true,
            })
            store.createIndex('date', 'date', { unique: false })
          }
        }
        req.onsuccess = (e) => {
          this.db = e.target.result
          resolve()
        }
        req.onerror = (e) => {
          console.error('[ScreenRecorder] IndexedDB open error', e)
          reject(e)
        }
      })
    },

    saveRecording(blob, name, durationSec) {
      return new Promise((resolve, reject) => {
        const now = new Date()
        const record = {
          name,
          date: now.toLocaleString('zh-CN'),
          duration: this.formatSeconds(durationSec),
          size: this.formatSize(blob.size),
          blob,
          timestamp: now.getTime(),
        }
        const tx = this.db.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)
        const req = store.add(record)
        req.onsuccess = (e) => {
          resolve(e.target.result)
        }
        req.onerror = reject
      })
    },

    loadRecordings() {
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction(STORE_NAME, 'readonly')
        const store = tx.objectStore(STORE_NAME)
        const req = store.getAll()
        req.onsuccess = (e) => {
          // 按 id 降序排列，不返回 blob 以节省内存
          const all = e.target.result.map((r) => ({
            id: r.id,
            name: r.name,
            date: r.date,
            duration: r.duration,
            size: r.size,
            timestamp: r.timestamp,
          }))
          all.sort((a, b) => b.id - a.id)
          this.recordings = all
          resolve()
        }
        req.onerror = reject
      })
    },

    getRecordingBlob(id) {
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction(STORE_NAME, 'readonly')
        const store = tx.objectStore(STORE_NAME)
        const req = store.get(id)
        req.onsuccess = (e) => resolve(e.target.result)
        req.onerror = reject
      })
    },

    deleteRecording(id) {
      if (!confirm('确定要删除这条录制记录吗？')) return
      const tx = this.db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      store.delete(id)
      tx.oncomplete = () => {
        this.recordings = this.recordings.filter((r) => r.id !== id)
      }
    },

    updateRecordingName(id, name) {
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)
        const getReq = store.get(id)
        getReq.onsuccess = (e) => {
          const record = e.target.result
          record.name = name
          const putReq = store.put(record)
          putReq.onsuccess = resolve
          putReq.onerror = reject
        }
        getReq.onerror = reject
      })
    },

    // ─── 录制控制 ────────────────────────────────────────────────────
    async startRecording() {
      this.errorMsg = ''
      try {
        // 获取屏幕流
        const displayConstraints = {
          video: {
            frameRate: { ideal: this.settings.frameRate },
          },
          audio: this.settings.captureAudio,
        }
        this.displayStream = await navigator.mediaDevices.getDisplayMedia(displayConstraints)

        // 实时预览
        this.$refs.liveVideo.srcObject = this.displayStream
        this.previewMode = 'live'

        // 合并音频
        let finalStream = this.displayStream
        if (this.settings.captureMic) {
          try {
            this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
            finalStream = this.mergeAudioStreams(this.displayStream, this.micStream)
          } catch (e) {
            console.warn('[ScreenRecorder] 无法获取麦克风:', e)
          }
        }

        // 创建 MediaRecorder
        const mimeType = this.getSupportedMimeType()
        const options = {
          mimeType,
          videoBitsPerSecond: BITRATE_MAP[this.settings.quality],
        }
        this.recordedChunks = []
        this.mediaRecorder = new MediaRecorder(finalStream, options)

        this.mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            this.recordedChunks.push(e.data)
          }
        }

        this.mediaRecorder.onstop = () => {
          this.onRecordingStop()
        }

        // 监听用户通过浏览器UI停止共享
        this.displayStream.getVideoTracks()[0].onended = () => {
          if (this.recordingState === 'recording' || this.recordingState === 'paused') {
            this.stopRecording()
          }
        }

        this.mediaRecorder.start(1000) // 每秒收集一次 chunk
        this.recordingState = 'recording'
        this.startTimer()
      } catch (e) {
        if (e.name === 'NotAllowedError') {
          this.errorMsg = '用户取消了录制或拒绝了权限请求。'
        } else {
          this.errorMsg = `录制启动失败：${e.message}`
        }
        this.cleanupStreams()
      }
    },

    togglePause() {
      if (!this.mediaRecorder) return
      if (this.recordingState === 'recording') {
        this.mediaRecorder.pause()
        this.recordingState = 'paused'
        this.stopTimer()
      } else if (this.recordingState === 'paused') {
        this.mediaRecorder.resume()
        this.recordingState = 'recording'
        this.startTimer()
      }
    },

    stopRecording() {
      if (this.mediaRecorder && this.recordingState !== 'idle') {
        this.stopTimer()
        this.mediaRecorder.stop()
        this.recordingState = 'stopped'
      }
    },

    async onRecordingStop() {
      const blob = new Blob(this.recordedChunks, { type: 'video/webm' })
      this.currentBlob = blob

      // 显示回放
      if (this.currentPlaybackUrl) URL.revokeObjectURL(this.currentPlaybackUrl)
      this.currentPlaybackUrl = URL.createObjectURL(blob)
      this.$refs.playbackVideo.src = this.currentPlaybackUrl
      this.previewMode = 'playback'

      // 生成文件名
      const now = new Date()
      const name = `录屏_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}.webm`

      // 保存到 IndexedDB
      try {
        await this.saveRecording(blob, name, this.elapsedSeconds)
        await this.loadRecordings()
      } catch (e) {
        console.error('[ScreenRecorder] 保存失败:', e)
        this.errorMsg = `保存到 IndexedDB 失败：${e.message}`
      }

      this.cleanupStreams()
      this.recordingState = 'idle'
      this.elapsedSeconds = 0
    },

    cleanupStreams() {
      if (this.displayStream) {
        this.displayStream.getTracks().forEach((t) => t.stop())
        this.displayStream = null
      }
      if (this.micStream) {
        this.micStream.getTracks().forEach((t) => t.stop())
        this.micStream = null
      }
      if (this.audioContext) {
        this.audioContext.close()
        this.audioContext = null
      }
      if (this.$refs.liveVideo) {
        this.$refs.liveVideo.srcObject = null
      }
    },

    // ─── 音频混合 ────────────────────────────────────────────────────
    mergeAudioStreams(displayStream, micStream) {
      this.audioContext = new AudioContext()
      const destination = this.audioContext.createMediaStreamDestination()

      // 系统音频
      const displayAudioTracks = displayStream.getAudioTracks()
      if (displayAudioTracks.length > 0) {
        const displaySource = this.audioContext.createMediaStreamSource(
          new MediaStream(displayAudioTracks)
        )
        displaySource.connect(destination)
      }

      // 麦克风
      const micAudioTracks = micStream.getAudioTracks()
      if (micAudioTracks.length > 0) {
        const micSource = this.audioContext.createMediaStreamSource(
          new MediaStream(micAudioTracks)
        )
        micSource.connect(destination)
      }

      // 合并：视频轨道 + 混合音频轨道
      const videoTracks = displayStream.getVideoTracks()
      const mergedStream = new MediaStream([
        ...videoTracks,
        ...destination.stream.getAudioTracks(),
      ])
      return mergedStream
    },

    // ─── 历史操作 ────────────────────────────────────────────────────
    async playRecording(rec) {
      try {
        const full = await this.getRecordingBlob(rec.id)
        if (!full || !full.blob) return
        if (this.modalBlobUrl) URL.revokeObjectURL(this.modalBlobUrl)
        this.modalBlobUrl = URL.createObjectURL(full.blob)
        this.modalTitle = rec.name
        this.playingId = rec.id
        this.modalVisible = true
        this.$nextTick(() => {
          if (this.$refs.modalVideo) {
            this.$refs.modalVideo.src = this.modalBlobUrl
          }
        })
      } catch (e) {
        this.errorMsg = `播放失败：${e.message}`
      }
    },

    async downloadRecording(rec) {
      try {
        const full = await this.getRecordingBlob(rec.id)
        if (!full || !full.blob) return
        const url = URL.createObjectURL(full.blob)
        const a = document.createElement('a')
        a.href = url
        a.download = rec.name.endsWith('.webm') ? rec.name : rec.name + '.webm'
        a.click()
        setTimeout(() => URL.revokeObjectURL(url), 5000)
      } catch (e) {
        this.errorMsg = `下载失败：${e.message}`
      }
    },

    downloadFromModal() {
      if (!this.modalBlobUrl || !this.modalTitle) return
      const a = document.createElement('a')
      a.href = this.modalBlobUrl
      a.download = this.modalTitle.endsWith('.webm') ? this.modalTitle : this.modalTitle + '.webm'
      a.click()
    },

    closeModal() {
      this.modalVisible = false
      this.playingId = null
      if (this.$refs.modalVideo) {
        this.$refs.modalVideo.pause()
        this.$refs.modalVideo.src = ''
      }
      if (this.modalBlobUrl) {
        URL.revokeObjectURL(this.modalBlobUrl)
        this.modalBlobUrl = null
      }
    },

    startRename(rec) {
      this.renamingId = rec.id
      this.renameValue = rec.name.replace(/\.webm$/, '')
      this.$nextTick(() => {
        const inputs = this.$refs.renameInput
        if (inputs) {
          const input = Array.isArray(inputs) ? inputs[0] : inputs
          if (input) input.focus()
        }
      })
    },

    async confirmRename(id) {
      if (this.renamingId !== id) return
      const newName = (this.renameValue || '').trim()
      if (newName) {
        const finalName = newName.endsWith('.webm') ? newName : newName + '.webm'
        await this.updateRecordingName(id, finalName)
        const rec = this.recordings.find((r) => r.id === id)
        if (rec) rec.name = finalName
      }
      this.renamingId = null
      this.renameValue = ''
    },

    cancelRename() {
      this.renamingId = null
      this.renameValue = ''
    },

    // ─── 工具方法 ────────────────────────────────────────────────────
    startTimer() {
      this.timerInterval = setInterval(() => {
        this.elapsedSeconds++
      }, 1000)
    },

    stopTimer() {
      if (this.timerInterval) {
        clearInterval(this.timerInterval)
        this.timerInterval = null
      }
    },

    formatSeconds(s) {
      const h = Math.floor(s / 3600)
      const m = Math.floor((s % 3600) / 60)
      const sec = s % 60
      return [h, m, sec].map((v) => String(v).padStart(2, '0')).join(':')
    },

    formatSize(bytes) {
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
      return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
    },

    getSupportedMimeType() {
      const types = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=h264,opus',
        'video/webm',
      ]
      for (const type of types) {
        if (MediaRecorder.isTypeSupported(type)) return type
      }
      return ''
    },
  },
}
</script>

<style scoped>
/* ── 页面容器 ── */
.screen-recorder-page {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
  box-sizing: border-box;
}

/* ── 不支持提示 ── */
.unsupported-banner {
  display: flex;
  align-items: center;
  gap: 16px;
  background: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 12px;
  padding: 20px 24px;
  margin-bottom: 20px;
}
.unsupported-icon {
  font-size: 32px;
  flex-shrink: 0;
}
.unsupported-text h3 {
  margin: 0 0 6px;
  color: #856404;
}
.unsupported-text p {
  margin: 0;
  color: #6c5c00;
  font-size: 14px;
}
.unsupported-text code {
  background: rgba(0,0,0,0.08);
  padding: 2px 6px;
  border-radius: 4px;
}
.is-disabled {
  opacity: 0.6;
  pointer-events: none;
}

/* ── 两栏布局 ── */
.recorder-layout {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 20px;
  align-items: start;
}

/* ── 卡片基础 ── */
.card {
  background: var(--card-bg, #fff);
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  padding: 20px;
  margin-bottom: 20px;
  border: 1px solid var(--border-color, rgba(0,0,0,0.06));
}
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.card-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-color, #1a1a2e);
}

/* ── 状态指示 ── */
.status-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
}
.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #aaa;
  flex-shrink: 0;
}
.status-recording .status-dot {
  background: #e53e3e;
}
.status-paused .status-dot {
  background: #ed8936;
}
.status-idle .status-dot {
  background: #68d391;
}
.status-recording .status-text {
  color: #e53e3e;
}
.status-paused .status-text {
  color: #ed8936;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.4); opacity: 0.7; }
}
.status-dot.pulse {
  animation: pulse 1.2s ease-in-out infinite;
}

/* ── 计时器 ── */
.timer-display {
  text-align: center;
  font-size: 48px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: 4px;
  color: var(--text-color, #1a1a2e);
  opacity: 0.3;
  margin: 12px 0 20px;
  transition: opacity 0.3s;
  font-family: 'Courier New', monospace;
}
.timer-display.active {
  opacity: 1;
  color: var(--primary-color, #667eea);
}

/* ── 按钮 ── */
.control-buttons {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
}
.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-large {
  padding: 14px 28px;
  font-size: 15px;
}
.btn-primary {
  background: var(--primary-color, #667eea);
  color: #fff;
}
.btn-primary:hover:not(:disabled) {
  background: var(--primary-dark, #5a67d8);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}
.btn-warning {
  background: #ed8936;
  color: #fff;
}
.btn-warning:hover {
  background: #dd6b20;
  transform: translateY(-1px);
}
.btn-danger {
  background: #e53e3e;
  color: #fff;
}
.btn-danger:hover {
  background: #c53030;
  transform: translateY(-1px);
}
.btn-secondary {
  background: var(--bg-secondary, #f0f0f0);
  color: var(--text-color, #333);
}
.btn-secondary:hover {
  background: var(--bg-tertiary, #e0e0e0);
}
.btn-icon {
  font-size: 16px;
}

/* ── 错误提示 ── */
.error-msg {
  margin-top: 12px;
  padding: 10px 14px;
  background: #fff5f5;
  border: 1px solid #fed7d7;
  border-radius: 8px;
  color: #c53030;
  font-size: 13px;
  text-align: center;
}

/* ── 设置面板 ── */
.settings-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.setting-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.setting-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary, #666);
}
.toggle-group {
  display: flex;
  gap: 0;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--border-color, rgba(0,0,0,0.12));
}
.toggle-btn {
  flex: 1;
  padding: 7px 10px;
  border: none;
  background: var(--bg-secondary, #f5f5f5);
  color: var(--text-secondary, #666);
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.15s;
  border-right: 1px solid var(--border-color, rgba(0,0,0,0.1));
}
.toggle-btn:last-child {
  border-right: none;
}
.toggle-btn.active {
  background: var(--primary-color, #667eea);
  color: #fff;
}
.toggle-btn:hover:not(.active) {
  background: var(--bg-tertiary, #e8e8e8);
}

/* ── 预览区 ── */
.video-wrapper {
  background: #000;
  border-radius: 10px;
  overflow: hidden;
  aspect-ratio: 16/9;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.preview-video {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}
.video-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #aaa;
}
.placeholder-icon {
  font-size: 48px;
  opacity: 0.5;
}
.video-placeholder p {
  margin: 0;
  font-size: 14px;
}

/* ── badge ── */
.badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  background: var(--bg-secondary, #f0f0f0);
  color: var(--text-secondary, #666);
}
.badge-success {
  background: #c6f6d5;
  color: #276749;
}

/* ── 历史列表 ── */
.history-card {
  position: sticky;
  top: 20px;
  max-height: calc(100vh - 40px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.recordings-list {
  overflow-y: auto;
  flex: 1;
  max-height: calc(100vh - 160px);
}
.recordings-list::-webkit-scrollbar {
  width: 4px;
}
.recordings-list::-webkit-scrollbar-thumb {
  background: var(--border-color, rgba(0,0,0,0.15));
  border-radius: 2px;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-secondary, #999);
}
.empty-icon {
  font-size: 40px;
  margin-bottom: 12px;
  opacity: 0.6;
}
.empty-state p {
  margin: 4px 0;
  font-size: 14px;
}
.empty-hint {
  font-size: 12px;
  opacity: 0.7;
}

.recording-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border-radius: 10px;
  margin-bottom: 8px;
  background: var(--bg-secondary, #f8f8f8);
  border: 1px solid var(--border-color, rgba(0,0,0,0.06));
  transition: all 0.15s;
}
.recording-item:hover {
  border-color: var(--primary-color, #667eea);
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.12);
}
.recording-item.playing {
  border-color: var(--primary-color, #667eea);
  background: var(--primary-light, rgba(102, 126, 234, 0.08));
}

.rec-info {
  flex: 1;
  min-width: 0;
}
.rec-name-row {
  margin-bottom: 4px;
}
.rec-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-color, #1a1a2e);
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.rename-input {
  width: 100%;
  font-size: 13px;
  padding: 3px 6px;
  border: 1px solid var(--primary-color, #667eea);
  border-radius: 4px;
  background: var(--card-bg, #fff);
  color: var(--text-color, #333);
  outline: none;
  box-sizing: border-box;
}
.rec-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.meta-item {
  font-size: 11px;
  color: var(--text-secondary, #888);
  display: flex;
  align-items: center;
  gap: 2px;
}
.meta-icon {
  font-size: 10px;
}

.rec-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}
.action-btn {
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  background: transparent;
}
.btn-play {
  color: var(--primary-color, #667eea);
}
.btn-play:hover {
  background: var(--primary-color, #667eea);
  color: #fff;
}
.btn-download {
  color: #38a169;
}
.btn-download:hover {
  background: #38a169;
  color: #fff;
}
.btn-rename {
  color: #dd6b20;
}
.btn-rename:hover {
  background: #dd6b20;
  color: #fff;
}
.btn-delete {
  color: #e53e3e;
}
.btn-delete:hover {
  background: #e53e3e;
  color: #fff;
}

/* ── 弹窗 ── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  box-sizing: border-box;
}
.modal-box {
  background: var(--card-bg, #fff);
  border-radius: 16px;
  width: 100%;
  max-width: 860px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  max-height: 90vh;
}
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color, rgba(0,0,0,0.08));
}
.modal-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-color, #1a1a2e);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  margin-right: 12px;
}
.modal-close {
  border: none;
  background: var(--bg-secondary, #f0f0f0);
  border-radius: 8px;
  width: 32px;
  height: 32px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--text-color, #333);
}
.modal-close:hover {
  background: #e53e3e;
  color: #fff;
}
.modal-body {
  padding: 16px 20px;
  background: #000;
  flex: 1;
  overflow: hidden;
}
.modal-video {
  width: 100%;
  max-height: 60vh;
  display: block;
  object-fit: contain;
}
.modal-footer {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding: 14px 20px;
  border-top: 1px solid var(--border-color, rgba(0,0,0,0.08));
}

/* ── 响应式 ── */
@media (max-width: 900px) {
  .recorder-layout {
    grid-template-columns: 1fr;
  }
  .history-card {
    position: static;
    max-height: none;
  }
  .recordings-list {
    max-height: 400px;
  }
}

@media (max-width: 600px) {
  .screen-recorder-page {
    padding: 12px;
  }
  .timer-display {
    font-size: 36px;
  }
  .settings-grid {
    grid-template-columns: 1fr;
  }
  .control-buttons {
    flex-direction: column;
  }
  .btn-large {
    width: 100%;
    justify-content: center;
  }
}
</style>
