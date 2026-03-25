<template>
  <div class="control-card">
    <!-- 状态行 -->
    <div class="status-row">
      <span class="status-dot" :class="dotClass"></span>
      <span class="status-label">{{ statusText }}</span>
      <span class="timer" :class="{ active: recording || paused }">{{ formattedTime }}</span>
    </div>

    <!-- 上传进度 -->
    <div v-if="recording || paused" class="upload-row">
      <div class="upload-bar-track">
        <div class="upload-bar-fill" :style="{ width: uploadPercent + '%' }"></div>
      </div>
      <span class="upload-label">已上传 {{ uploadedChunks }}/{{ totalChunks }} 块</span>
    </div>

    <!-- 按钮区 -->
    <div class="btn-row">
      <button v-if="state === 'idle'" class="btn btn-record" @click="$emit('start')" :disabled="!supported">
        <span class="rec-dot"></span> 开始录制
      </button>
      <template v-if="recording || paused">
        <button class="btn btn-pause" @click="$emit('toggle-pause')">
          {{ paused ? '▶ 继续' : '⏸ 暂停' }}
        </button>
        <button class="btn btn-stop" @click="$emit('stop')">
          ⏹ 停止
        </button>
      </template>
      <button v-if="state === 'stopping'" class="btn btn-stop" disabled>
        <span class="spinner"></span> 保存中...
      </button>
    </div>

    <!-- 错误提示 -->
    <div v-if="error" class="error-msg">{{ error }}</div>

    <!-- 不支持提示 -->
    <div v-if="!supported" class="unsupported-msg">
      当前浏览器不支持录屏 API，请使用 Chrome 72+ 或 Edge 79+
    </div>
  </div>
</template>

<script>
export default {
  name: 'RecorderControl',
  props: {
    state: { type: String, default: 'idle' },
    elapsedSec: { type: Number, default: 0 },
    uploadedChunks: { type: Number, default: 0 },
    totalChunks: { type: Number, default: 0 },
    error: { type: String, default: '' },
    supported: { type: Boolean, default: true }
  },
  emits: ['start', 'stop', 'toggle-pause'],
  computed: {
    recording() { return this.state === 'recording' },
    paused() { return this.state === 'paused' },
    dotClass() {
      if (this.recording) return 'pulse'
      if (this.paused) return 'yellow'
      if (this.state === 'stopping') return 'yellow'
      return ''
    },
    statusText() {
      const map = { idle: '待机', preparing: '准备中...', recording: '录制中', paused: '已暂停', stopping: '保存中...', error: '错误' }
      return map[this.state] || this.state
    },
    formattedTime() {
      const s = this.elapsedSec
      const h = Math.floor(s / 3600)
      const m = Math.floor((s % 3600) / 60)
      const sec = s % 60
      if (h > 0) return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
      return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
    },
    uploadPercent() {
      if (!this.totalChunks) return 0
      return Math.round((this.uploadedChunks / this.totalChunks) * 100)
    }
  }
}
</script>

<style scoped>
.control-card { padding: 20px; display: flex; flex-direction: column; gap: 16px; }
.status-row { display: flex; align-items: center; gap: 10px; }
.status-dot {
  width: 10px; height: 10px; border-radius: 50%; background: var(--text-dim); flex-shrink: 0;
}
.status-dot.pulse {
  background: var(--danger);
  animation: pulse 1.2s ease-in-out infinite;
}
.status-dot.yellow { background: var(--warning); }
@keyframes pulse {
  0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(229,62,62,.6); }
  50% { opacity: .8; box-shadow: 0 0 0 6px rgba(229,62,62,0); }
}
.status-label { font-size: 14px; color: var(--text-muted); flex: 1; }
.timer { font-size: 28px; font-weight: 700; font-variant-numeric: tabular-nums; color: var(--text-dim); font-family: 'SF Mono', 'Fira Code', monospace; }
.timer.active { color: var(--text); }

.upload-row { display: flex; align-items: center; gap: 10px; }
.upload-bar-track { flex: 1; height: 4px; background: var(--border); border-radius: 2px; overflow: hidden; }
.upload-bar-fill { height: 100%; background: var(--info); border-radius: 2px; transition: width .3s; }
.upload-label { font-size: 12px; color: var(--text-muted); white-space: nowrap; }

.btn-row { display: flex; gap: 10px; flex-wrap: wrap; }
.btn {
  padding: 10px 20px; border-radius: var(--radius-sm); border: none;
  font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 8px;
  transition: all .15s;
}
.btn:disabled { opacity: .5; cursor: not-allowed; }
.btn-record { background: var(--primary); color: #fff; }
.btn-record:hover:not(:disabled) { background: var(--primary-dark); }
.rec-dot { width: 10px; height: 10px; border-radius: 50%; background: #fff; animation: pulse 1.2s infinite; }
.btn-pause { background: var(--bg-card2); color: var(--text); border: 1px solid var(--border); }
.btn-pause:hover { border-color: var(--warning); color: var(--warning); }
.btn-stop { background: var(--bg-card2); color: var(--danger); border: 1px solid var(--border); }
.btn-stop:hover:not(:disabled) { border-color: var(--danger); background: rgba(229,62,62,.1); }

.spinner {
  width: 14px; height: 14px; border: 2px solid var(--text-dim); border-top-color: var(--text);
  border-radius: 50%; animation: spin .7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.error-msg { font-size: 13px; color: var(--danger); background: rgba(229,62,62,.1); padding: 8px 12px; border-radius: var(--radius-sm); border: 1px solid rgba(229,62,62,.3); }
.unsupported-msg { font-size: 13px; color: var(--warning); background: rgba(237,137,54,.1); padding: 8px 12px; border-radius: var(--radius-sm); border: 1px solid rgba(237,137,54,.3); }
</style>
