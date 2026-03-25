<template>
  <div v-if="visible" class="convert-overlay" @click.self="$emit('close')">
    <div class="convert-modal">
      <div class="modal-header">
        <h3>转换为 MP4</h3>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>

      <div v-if="!taskId" class="modal-body">
        <p class="source-name">{{ recording?.name }}</p>
        <div class="option-row">
          <label>视频质量（CRF，越小越好）</label>
          <input type="range" min="15" max="35" v-model.number="crf" class="slider" />
          <span class="crf-val">{{ crf }}</span>
        </div>
        <div class="option-row">
          <label>编码速度预设</label>
          <select v-model="preset" class="select-input">
            <option v-for="p in presets" :key="p.value" :value="p.value">{{ p.label }}</option>
          </select>
        </div>
        <div class="modal-actions">
          <button class="btn-cancel" @click="$emit('close')">取消</button>
          <button class="btn-convert" @click="startConvert" :disabled="converting">
            {{ converting ? '启动中...' : '开始转换' }}
          </button>
        </div>
      </div>

      <div v-else class="modal-body task-status">
        <div class="task-progress-wrap">
          <div class="task-progress-bar" :style="{ width: progress + '%' }"></div>
        </div>
        <p class="task-msg">
          <span v-if="taskStatus === 'running'">转换中... {{ progress }}%</span>
          <span v-else-if="taskStatus === 'done'" class="done">✓ 转换完成！</span>
          <span v-else-if="taskStatus === 'error'" class="error">✗ 转换失败</span>
          <span v-else>等待中...</span>
        </p>
        <div v-if="taskStatus === 'done'" class="modal-actions">
          <button class="btn-cancel" @click="$emit('close')">关闭</button>
        </div>
        <div v-if="taskStatus === 'error'" class="modal-actions">
          <button class="btn-cancel" @click="reset">重试</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { createConvertTask, getTask } from '../api/screenRecorder.js'

export default {
  name: 'ConvertPanel',
  props: {
    visible: { type: Boolean, default: false },
    recording: { type: Object, default: null }
  },
  emits: ['close', 'converted'],
  data() {
    return {
      crf: 23,
      preset: 'medium',
      converting: false,
      taskId: null,
      taskStatus: 'pending',
      progress: 0,
      pollTimer: null,
      presets: [
        { value: 'ultrafast', label: '极快（文件较大）' },
        { value: 'fast', label: '快速' },
        { value: 'medium', label: '均衡（推荐）' },
        { value: 'slow', label: '慢速（文件较小）' }
      ]
    }
  },
  watch: {
    visible(v) { if (!v) this.reset() }
  },
  methods: {
    async startConvert() {
      if (!this.recording) return
      this.converting = true
      try {
        const task = await createConvertTask(this.recording.id, { crf: this.crf, preset: this.preset, format: 'mp4' })
        this.taskId = task.taskId
        this.taskStatus = 'pending'
        this.progress = 0
        this.pollTask()
      } catch (e) {
        console.error(e)
        this.converting = false
      }
    },
    pollTask() {
      this.pollTimer = setInterval(async () => {
        try {
          const task = await getTask(this.taskId)
          this.taskStatus = task.status
          this.progress = task.progress || 0
          if (task.status === 'done') {
            clearInterval(this.pollTimer)
            this.$emit('converted', task.outputRecordingId)
          } else if (task.status === 'error') {
            clearInterval(this.pollTimer)
          }
        } catch (e) {
          console.error(e)
          clearInterval(this.pollTimer)
          this.taskStatus = 'error'
        }
      }, 2000)
    },
    reset() {
      clearInterval(this.pollTimer)
      this.converting = false
      this.taskId = null
      this.taskStatus = 'pending'
      this.progress = 0
    }
  },
  beforeUnmount() { clearInterval(this.pollTimer) }
}
</script>

<style scoped>
.convert-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,.7); z-index: 100;
  display: flex; align-items: center; justify-content: center; backdrop-filter: blur(2px);
}
.convert-modal {
  background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius);
  width: 420px; max-width: 95vw; box-shadow: var(--shadow);
}
.modal-header { display: flex; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--border); }
.modal-header h3 { flex: 1; font-size: 16px; font-weight: 600; }
.close-btn { width: 28px; height: 28px; border: none; background: transparent; color: var(--text-muted); font-size: 16px; border-radius: 6px; }
.close-btn:hover { color: var(--text); background: var(--bg-card2); }
.modal-body { padding: 20px; display: flex; flex-direction: column; gap: 16px; }
.source-name { font-size: 13px; color: var(--text-muted); background: var(--bg-card2); padding: 8px 12px; border-radius: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.option-row { display: flex; flex-direction: column; gap: 6px; }
.option-row label { font-size: 12px; color: var(--text-muted); }
.slider { width: 100%; accent-color: var(--primary); }
.crf-val { font-size: 13px; font-weight: 600; color: var(--primary); align-self: flex-end; }
.select-input {
  background: var(--bg); border: 1px solid var(--border); color: var(--text);
  padding: 8px 10px; border-radius: 6px; font-size: 13px; width: 100%;
}
.modal-actions { display: flex; gap: 10px; justify-content: flex-end; }
.btn-cancel { padding: 8px 16px; background: var(--bg-card2); color: var(--text-muted); border: 1px solid var(--border); border-radius: 6px; font-size: 13px; }
.btn-convert { padding: 8px 20px; background: var(--primary); color: #fff; border: none; border-radius: 6px; font-size: 13px; font-weight: 600; }
.btn-convert:hover:not(:disabled) { background: var(--primary-dark); }
.btn-convert:disabled { opacity: .5; }

.task-status { align-items: center; text-align: center; padding: 30px; }
.task-progress-wrap { width: 100%; height: 6px; background: var(--border); border-radius: 3px; overflow: hidden; margin-bottom: 16px; }
.task-progress-bar { height: 100%; background: var(--primary); border-radius: 3px; transition: width .5s; }
.task-msg { font-size: 14px; color: var(--text-muted); }
.done { color: var(--success); }
.error { color: var(--danger); }
</style>
