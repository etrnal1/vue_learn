<template>
  <div class="app">
    <!-- 顶栏 -->
    <header class="app-header">
      <div class="logo">
        <span class="logo-dot"></span>
        <span>录屏工具</span>
      </div>
      <div class="header-meta" v-if="state !== 'idle'">
        <span class="chunk-status">
          已上传 {{ uploadedChunks }} 块 · {{ formatBytes(uploadedBytes) }}
        </span>
      </div>
    </header>

    <main class="app-main">
      <!-- 左栏：控制 + 预览 + 设置 -->
      <div class="left-col">
        <div class="card">
          <RecorderControl
            :state="state"
            :elapsed-sec="elapsedSec"
            :uploaded-chunks="uploadedChunks"
            :total-chunks="totalChunks"
            :error="errorMsg"
            :supported="isSupported"
            @start="startRecording"
            @stop="stopRecording"
            @toggle-pause="togglePause"
          />
        </div>

        <div class="card">
          <RecorderPreview
            :stream="liveStream"
            :playback-url="playbackUrl"
            :download-name="lastRecordingName"
          />
        </div>

        <div v-if="state === 'idle'" class="card">
          <RecorderSettings v-model="settings" />
        </div>
      </div>

      <!-- 右栏：历史列表 -->
      <div class="right-col">
        <div class="card list-card">
          <RecordingList
            :recordings="recordings"
            :total="totalRecordings"
            :loading="listLoading"
            @refresh="loadRecordings"
            @play="playRecording"
            @convert="openConvert"
            @delete="deleteRec"
            @rename="renameRec"
            @load-more="loadMore"
          />
        </div>
      </div>
    </main>

    <!-- 播放器模态框 -->
    <div v-if="playingRec" class="player-overlay" @click.self="closePlayer">
      <div class="player-modal">
        <div class="player-header">
          <span class="player-title">{{ playingRec.name }}</span>
          <button class="close-btn" @click="closePlayer">✕</button>
        </div>
        <video
          class="player-video"
          controls
          autoplay
          :src="getStreamUrl(playingRec.id)"
        ></video>
      </div>
    </div>

    <!-- 转换面板 -->
    <ConvertPanel
      :visible="convertPanelVisible"
      :recording="convertTarget"
      @close="convertPanelVisible = false"
      @converted="onConverted"
    />
  </div>
</template>

<script>
import RecorderControl from './components/RecorderControl.vue'
import RecorderSettings from './components/RecorderSettings.vue'
import RecorderPreview from './components/RecorderPreview.vue'
import RecordingList from './components/RecordingList.vue'
import ConvertPanel from './components/ConvertPanel.vue'
import {
  createSession, completeSession, abortSession, uploadChunk,
  listRecordings, deleteRecording, renameRecording, extractThumbnail,
  getStreamUrl
} from './api/screenRecorder.js'

const QUALITY_BITRATE = { high: 2500000, medium: 1200000, low: 600000 }
const SUPPORTED_MIME_TYPES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm;codecs=h264,opus',
  'video/webm'
]

export default {
  name: 'App',
  components: { RecorderControl, RecorderSettings, RecorderPreview, RecordingList, ConvertPanel },
  data() {
    return {
      // 录制状态机
      state: 'idle', // idle | preparing | recording | paused | stopping | error
      settings: {
        quality: 'high',
        frameRate: 30,
        timeslice: 5000,
        captureAudio: true,
        captureMic: false
      },
      // 媒体
      mediaRecorder: null,
      liveStream: null,
      micStream: null,
      audioCtx: null,
      // 计时
      elapsedSec: 0,
      timerInterval: null,
      startTime: 0,
      pausedTime: 0,
      // Chunk 队列
      chunkSeq: 0,
      uploadedChunks: 0,
      totalChunks: 0,
      uploadedBytes: 0,
      uploadQueue: [],
      uploading: false,
      uploadAbort: null,
      // 会话
      sessionId: null,
      errorMsg: '',
      // 预览
      playbackUrl: '',
      lastRecordingName: '',
      // 列表
      recordings: [],
      totalRecordings: 0,
      listLoading: false,
      listPage: 1,
      // 播放
      playingRec: null,
      // 转换
      convertPanelVisible: false,
      convertTarget: null
    }
  },
  computed: {
    isSupported() {
      return !!(navigator.mediaDevices?.getDisplayMedia && window.MediaRecorder)
    }
  },
  mounted() {
    this.loadRecordings()
    window.addEventListener('pagehide', this.onPageHide)
  },
  beforeUnmount() {
    window.removeEventListener('pagehide', this.onPageHide)
    this.cleanup()
  },
  methods: {
    getStreamUrl,
    formatBytes(bytes) {
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
      return (bytes / 1024 / 1024).toFixed(1) + ' MB'
    },

    // ─── 录制核心 ────────────────────────────────────
    async startRecording() {
      this.state = 'preparing'
      this.errorMsg = ''
      this.chunkSeq = 0
      this.uploadedChunks = 0
      this.totalChunks = 0
      this.uploadedBytes = 0
      this.uploadQueue = []
      this.playbackUrl = ''

      try {
        // 1. 创建服务端会话
        const session = await createSession(this.settings)
        this.sessionId = session.sessionId

        // 2. 获取屏幕流
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: { ideal: this.settings.frameRate }, cursor: 'always' },
          audio: this.settings.captureAudio
        })

        // 3. 可选：混合麦克风
        let finalStream = displayStream
        if (this.settings.captureMic) {
          try {
            this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
            const ctx = new AudioContext()
            this.audioCtx = ctx
            const dest = ctx.createMediaStreamDestination()
            if (displayStream.getAudioTracks().length > 0) {
              ctx.createMediaStreamSource(displayStream).connect(dest)
            }
            ctx.createMediaStreamSource(this.micStream).connect(dest)
            finalStream = new MediaStream([
              ...displayStream.getVideoTracks(),
              ...dest.stream.getAudioTracks()
            ])
          } catch (e) {
            console.warn('麦克风获取失败，仅使用系统音频', e)
          }
        }

        this.liveStream = finalStream

        // 4. 监听屏幕共享结束（用户点浏览器"停止共享"按钮）
        displayStream.getVideoTracks()[0].addEventListener('ended', () => {
          if (this.state === 'recording' || this.state === 'paused') this.stopRecording()
        })

        // 5. 初始化 MediaRecorder
        const mimeType = SUPPORTED_MIME_TYPES.find(t => MediaRecorder.isTypeSupported(t)) || 'video/webm'
        this.mediaRecorder = new MediaRecorder(finalStream, {
          mimeType,
          videoBitsPerSecond: QUALITY_BITRATE[this.settings.quality] || 1200000
        })

        this.mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            const seq = this.chunkSeq++
            this.totalChunks = seq + 1
            this.uploadQueue.push({ seq, blob: e.data })
            this.drainQueue()
          }
        }

        this.mediaRecorder.onstop = async () => {
          // 等待队列清空后再 complete
          await this.waitQueueDrain()
          await this.finishSession()
        }

        // 6. 开始！
        this.mediaRecorder.start(this.settings.timeslice)
        this.state = 'recording'
        this.startTimer()

      } catch (e) {
        this.state = 'error'
        this.errorMsg = e.name === 'NotAllowedError' ? '用户拒绝了屏幕共享权限' : `录制失败：${e.message}`
        if (this.sessionId) abortSession(this.sessionId).catch(() => {})
        this.sessionId = null
      }
    },

    togglePause() {
      if (!this.mediaRecorder) return
      if (this.state === 'recording') {
        this.mediaRecorder.pause()
        this.state = 'paused'
        clearInterval(this.timerInterval)
        this.pausedTime += Date.now() - this.startTime - this.elapsedSec * 1000
      } else if (this.state === 'paused') {
        this.mediaRecorder.resume()
        this.state = 'recording'
        this.startTimer()
      }
    },

    stopRecording() {
      if (!this.mediaRecorder) return
      this.state = 'stopping'
      clearInterval(this.timerInterval)
      this.mediaRecorder.stop()
      // 停止所有媒体流轨道
      this.liveStream?.getTracks().forEach(t => t.stop())
      this.micStream?.getTracks().forEach(t => t.stop())
    },

    async finishSession() {
      if (!this.sessionId) return
      const durationSec = this.elapsedSec
      const now = new Date()
      const name = `录屏_${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}${String(now.getSeconds()).padStart(2,'0')}`
      this.lastRecordingName = `${name}.webm`

      try {
        await completeSession(this.sessionId, {
          name,
          durationSec,
          totalChunks: this.chunkSeq
        })
        // 触发缩略图提取（异步，不等待）
        // extractThumbnail(rec.id, 3).catch(() => {})
      } catch (e) {
        this.errorMsg = `保存录制失败：${e.message}`
      } finally {
        this.state = 'idle'
        this.sessionId = null
        this.liveStream = null
        this.audioCtx?.close()
        this.audioCtx = null
        await this.loadRecordings()
      }
    },

    // ─── Chunk 上传队列 ───────────────────────────────
    async drainQueue() {
      if (this.uploading) return
      this.uploading = true
      while (this.uploadQueue.length > 0) {
        const { seq, blob } = this.uploadQueue.shift()
        let attempts = 0
        while (attempts < 3) {
          try {
            this.uploadAbort = new AbortController()
            await uploadChunk(this.sessionId, seq, blob, this.uploadAbort.signal)
            this.uploadedChunks++
            this.uploadedBytes += blob.size
            break
          } catch (e) {
            if (e.name === 'AbortError') break
            attempts++
            if (attempts >= 3) console.error(`Chunk ${seq} 上传失败，已重试3次`, e)
            else await new Promise(r => setTimeout(r, 1000 * attempts))
          }
        }
      }
      this.uploading = false
    },

    waitQueueDrain() {
      return new Promise(resolve => {
        const check = () => {
          if (!this.uploading && this.uploadQueue.length === 0) resolve()
          else setTimeout(check, 200)
        }
        check()
      })
    },

    // ─── 计时器 ────────────────────────────────────
    startTimer() {
      this.startTime = Date.now()
      this.timerInterval = setInterval(() => {
        this.elapsedSec = Math.floor((Date.now() - this.startTime) / 1000)
      }, 500)
    },

    // ─── 列表管理 ──────────────────────────────────
    async loadRecordings() {
      this.listLoading = true
      this.listPage = 1
      try {
        const data = await listRecordings(1, 20)
        this.recordings = data.items
        this.totalRecordings = data.total
      } catch (e) {
        console.error('加载录制列表失败', e)
      } finally {
        this.listLoading = false
      }
    },

    async loadMore() {
      this.listLoading = true
      this.listPage++
      try {
        const data = await listRecordings(this.listPage, 20)
        this.recordings.push(...data.items)
      } finally {
        this.listLoading = false
      }
    },

    async deleteRec(item) {
      if (!confirm(`确定删除「${item.name}」？`)) return
      await deleteRecording(item.id).catch(console.error)
      this.recordings = this.recordings.filter(r => r.id !== item.id)
      this.totalRecordings--
    },

    async renameRec(item, newName) {
      await renameRecording(item.id, newName).catch(console.error)
      const rec = this.recordings.find(r => r.id === item.id)
      if (rec) rec.name = newName
    },

    playRecording(item) { this.playingRec = item },
    closePlayer() { this.playingRec = null },

    openConvert(item) {
      this.convertTarget = item
      this.convertPanelVisible = true
    },
    async onConverted(newId) {
      this.convertPanelVisible = false
      await this.loadRecordings()
    },

    // ─── 清理 ──────────────────────────────────────
    cleanup() {
      clearInterval(this.timerInterval)
      this.liveStream?.getTracks().forEach(t => t.stop())
      this.micStream?.getTracks().forEach(t => t.stop())
      this.audioCtx?.close()
      if (this.sessionId) abortSession(this.sessionId).catch(() => {})
    },

    onPageHide() {
      if (this.sessionId) abortSession(this.sessionId).catch(() => {})
    }
  }
}
</script>

<style scoped>
.app { display: flex; flex-direction: column; min-height: 100vh; }

.app-header {
  height: 56px;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  padding: 0 24px;
  gap: 16px;
  position: sticky;
  top: 0;
  z-index: 10;
}
.logo { display: flex; align-items: center; gap: 10px; font-size: 16px; font-weight: 700; }
.logo-dot {
  width: 12px; height: 12px; border-radius: 50%;
  background: var(--primary);
  box-shadow: 0 0 8px var(--primary);
}
.header-meta { margin-left: auto; }
.chunk-status { font-size: 12px; color: var(--text-muted); font-variant-numeric: tabular-nums; }

.app-main {
  flex: 1;
  display: grid;
  grid-template-columns: 480px 1fr;
  gap: 20px;
  padding: 20px 24px;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}

.left-col, .right-col { display: flex; flex-direction: column; gap: 16px; }
.right-col { min-height: 0; }

.card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}
.list-card { flex: 1; display: flex; flex-direction: column; max-height: calc(100vh - 116px); }

/* 播放器 */
.player-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,.85); z-index: 200;
  display: flex; align-items: center; justify-content: center;
}
.player-modal {
  background: #000; border-radius: var(--radius); overflow: hidden;
  width: 90vw; max-width: 1100px; box-shadow: var(--shadow);
  display: flex; flex-direction: column;
}
.player-header {
  display: flex; align-items: center; padding: 12px 16px;
  background: var(--bg-card); border-bottom: 1px solid var(--border);
}
.player-title { flex: 1; font-size: 14px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.close-btn {
  width: 28px; height: 28px; border: none; background: transparent;
  color: var(--text-muted); font-size: 16px; border-radius: 6px;
}
.close-btn:hover { color: var(--text); background: var(--bg-card2); }
.player-video { width: 100%; max-height: 80vh; object-fit: contain; display: block; }

/* 响应式 */
@media (max-width: 900px) {
  .app-main { grid-template-columns: 1fr; padding: 12px 16px; }
  .list-card { max-height: 600px; }
}
</style>
