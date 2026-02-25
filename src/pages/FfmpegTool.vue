<template>
  <div class="ffmpeg-page">
    <section class="hero">
      <div>
        <h2>FFmpeg 工具箱</h2>
        <p>独立模块，覆盖常见视频处理功能，输出文件默认写入 Movies 目录。</p>
      </div>
      <div class="chips">
        <span class="chip">转码</span>
        <span class="chip">抽音频</span>
        <span class="chip">截图</span>
        <span class="chip">压缩</span>
        <span class="chip">裁剪</span>
        <span class="chip">合并</span>
        <span class="chip">倍速</span>
      </div>
    </section>

    <section class="panel">
      <div class="grid">
        <label>
          功能
          <select v-model="form.action">
            <option value="transcode">转码 (H.264/AAC)</option>
            <option value="extract_audio">提取音频</option>
            <option value="snapshot">截图封面</option>
            <option value="compress">压缩视频</option>
            <option value="trim">裁剪时长</option>
            <option value="merge_concat">合并视频</option>
            <option value="speed">倍速处理</option>
          </select>
        </label>

        <label v-if="form.action !== 'merge_concat'" class="col-2">
          输入文件绝对路径
          <input v-model.trim="form.inputPath" type="text" placeholder="/Users/mac/Movies/demo.mp4" />
        </label>

        <label v-if="form.action === 'merge_concat'" class="col-2">
          待合并文件路径（每行一个）
          <textarea v-model.trim="form.mergePathsText" rows="5" placeholder="/Users/mac/Movies/part1.mp4&#10;/Users/mac/Movies/part2.mp4"></textarea>
        </label>

        <label>
          输出文件名（可选）
          <input v-model.trim="form.outputName" type="text" placeholder="my_output" />
        </label>

        <label v-if="['transcode'].includes(form.action)">
          输出格式
          <select v-model="form.format">
            <option value="mp4">mp4</option>
            <option value="mkv">mkv</option>
            <option value="mov">mov</option>
          </select>
        </label>

        <label v-if="['transcode', 'compress'].includes(form.action)">
          CRF（越小越清晰）
          <input v-model.number="form.crf" type="number" min="16" max="38" />
        </label>

        <label v-if="['transcode', 'compress'].includes(form.action)">
          Preset
          <select v-model="form.preset">
            <option value="ultrafast">ultrafast</option>
            <option value="fast">fast</option>
            <option value="medium">medium</option>
            <option value="slow">slow</option>
          </select>
        </label>

        <label v-if="form.action === 'compress'">
          压缩宽度（可选）
          <input v-model.number="form.width" type="number" min="0" placeholder="1280" />
        </label>

        <label v-if="form.action === 'extract_audio'">
          音频格式
          <select v-model="form.audioFormat">
            <option value="mp3">mp3</option>
            <option value="m4a">m4a</option>
            <option value="aac">aac</option>
            <option value="wav">wav</option>
          </select>
        </label>

        <label v-if="form.action === 'extract_audio'">
          音频码率
          <select v-model="form.audioBitrate">
            <option value="128k">128k</option>
            <option value="192k">192k</option>
            <option value="256k">256k</option>
            <option value="320k">320k</option>
          </select>
        </label>

        <label v-if="form.action === 'snapshot'">
          截图时间（秒）
          <input v-model.number="form.timeSec" type="number" min="0" step="0.1" />
        </label>

        <label v-if="form.action === 'snapshot'">
          图片格式
          <select v-model="form.imageFormat">
            <option value="jpg">jpg</option>
            <option value="png">png</option>
            <option value="webp">webp</option>
          </select>
        </label>

        <label v-if="form.action === 'trim'">
          开始时间（秒）
          <input v-model.number="form.startSec" type="number" min="0" step="0.1" />
        </label>

        <label v-if="form.action === 'trim'">
          结束时间（秒，可选）
          <input v-model.number="form.endSec" type="number" min="0" step="0.1" />
        </label>

        <label v-if="form.action === 'trim'">
          时长（秒，可选）
          <input v-model.number="form.durationSec" type="number" min="0" step="0.1" />
        </label>

        <label v-if="form.action === 'merge_concat'">
          合并模式
          <select v-model="form.concatMode">
            <option value="copy">快速无损（copy）</option>
            <option value="reencode">兼容重编码（reencode）</option>
          </select>
        </label>

        <label v-if="form.action === 'speed'">
          倍速
          <input v-model.number="form.speed" type="number" min="0.25" max="4" step="0.05" />
        </label>
      </div>

      <div class="actions">
        <button class="btn primary" :disabled="running" @click="runTask">{{ running ? '处理中...' : '开始执行' }}</button>
        <button class="btn" @click="resetForm">重置参数</button>
      </div>
      <div v-if="feedback" class="feedback" :class="feedbackType">{{ feedback }}</div>
    </section>

    <section v-if="result" class="panel result">
      <h3>执行结果</h3>
      <div class="meta">
        <span>输出路径：{{ result.outputPath }}</span>
        <span>大小：{{ formatBytes(result.size) }}</span>
        <span v-if="result.duration">时长：{{ formatDuration(result.duration) }}</span>
        <span>耗时：{{ result.elapsedMs || 0 }}ms</span>
      </div>
      <div class="actions">
        <a class="btn" :href="result.streamUrl" target="_blank" rel="noreferrer">打开预览</a>
        <a class="btn" :href="result.downloadUrl" target="_blank" rel="noreferrer">下载文件</a>
      </div>

      <div v-if="previewType === 'video'" class="preview-wrap">
        <video :src="result.streamUrl" controls preload="metadata" class="preview"></video>
      </div>
      <div v-else-if="previewType === 'audio'" class="preview-wrap">
        <audio :src="result.streamUrl" controls preload="metadata" class="audio-preview"></audio>
      </div>
      <div v-else-if="previewType === 'image'" class="preview-wrap image-wrap">
        <img :src="result.streamUrl" class="image-preview" alt="ffmpeg result">
      </div>
    </section>
  </div>
</template>

<script>
import { api } from '../utils/api.js'

export default {
  name: 'FfmpegTool',
  data() {
    return {
      running: false,
      feedback: '',
      feedbackType: 'info',
      result: null,
      form: {
        action: 'transcode',
        inputPath: '',
        mergePathsText: '',
        outputName: '',
        format: 'mp4',
        crf: 23,
        preset: 'medium',
        width: 0,
        audioFormat: 'mp3',
        audioBitrate: '192k',
        timeSec: 1,
        imageFormat: 'jpg',
        startSec: 0,
        endSec: null,
        durationSec: null,
        concatMode: 'copy',
        speed: 1.25
      }
    }
  },
  computed: {
    previewType() {
      const p = String(this.result?.outputPath || '').toLowerCase()
      if (!p) return ''
      if (/\.(mp4|mkv|mov|avi|webm|m4v|wmv|flv)$/.test(p)) return 'video'
      if (/\.(mp3|m4a|aac|wav|flac|ogg)$/.test(p)) return 'audio'
      if (/\.(jpg|jpeg|png|webp)$/.test(p)) return 'image'
      return ''
    }
  },
  methods: {
    setFeedback(message, type = 'info') {
      this.feedback = String(message || '')
      this.feedbackType = type
    },
    formatBytes(bytes) {
      const n = Number(bytes || 0)
      if (!n) return '0 B'
      const units = ['B', 'KB', 'MB', 'GB', 'TB']
      let val = n
      let idx = 0
      while (val >= 1024 && idx < units.length - 1) {
        val /= 1024
        idx += 1
      }
      return `${val.toFixed(val >= 100 ? 0 : (val >= 10 ? 1 : 2))} ${units[idx]}`
    },
    formatDuration(sec) {
      const s = Math.max(0, Math.floor(Number(sec || 0)))
      const h = Math.floor(s / 3600)
      const m = Math.floor((s % 3600) / 60)
      const ss = s % 60
      if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
      return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
    },
    buildPayload() {
      const payload = {
        action: this.form.action,
        inputPath: this.form.inputPath,
        outputName: this.form.outputName || undefined
      }

      if (this.form.action === 'merge_concat') {
        const paths = String(this.form.mergePathsText || '')
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean)
        payload.inputPaths = paths
        payload.concatMode = this.form.concatMode
        delete payload.inputPath
      }

      if (this.form.action === 'transcode') {
        payload.format = this.form.format
        payload.crf = this.form.crf
        payload.preset = this.form.preset
      }

      if (this.form.action === 'extract_audio') {
        payload.audioFormat = this.form.audioFormat
        payload.audioBitrate = this.form.audioBitrate
      }

      if (this.form.action === 'snapshot') {
        payload.timeSec = Number(this.form.timeSec || 0)
        payload.imageFormat = this.form.imageFormat
      }

      if (this.form.action === 'compress') {
        payload.crf = this.form.crf
        payload.preset = this.form.preset
        if (Number(this.form.width) > 0) payload.width = Number(this.form.width)
      }

      if (this.form.action === 'trim') {
        payload.startSec = Number(this.form.startSec || 0)
        if (Number(this.form.endSec) > 0) payload.endSec = Number(this.form.endSec)
        if (Number(this.form.durationSec) > 0) payload.durationSec = Number(this.form.durationSec)
      }

      if (this.form.action === 'speed') {
        payload.speed = Number(this.form.speed || 1.25)
      }

      return payload
    },
    async runTask() {
      this.running = true
      this.result = null
      this.setFeedback('正在执行 FFmpeg，请稍候...', 'info')
      try {
        const payload = this.buildPayload()
        const result = await api.ffmpeg.run(payload)
        this.result = result
        this.setFeedback('执行成功，结果已生成。', 'success')
      } catch (error) {
        this.setFeedback(error.message || '执行失败', 'error')
      } finally {
        this.running = false
      }
    },
    resetForm() {
      this.form = {
        action: 'transcode',
        inputPath: '',
        mergePathsText: '',
        outputName: '',
        format: 'mp4',
        crf: 23,
        preset: 'medium',
        width: 0,
        audioFormat: 'mp3',
        audioBitrate: '192k',
        timeSec: 1,
        imageFormat: 'jpg',
        startSec: 0,
        endSec: null,
        durationSec: null,
        concatMode: 'copy',
        speed: 1.25
      }
      this.result = null
      this.feedback = ''
    }
  }
}
</script>

<style scoped>
.ffmpeg-page { display: grid; gap: 12px; margin-bottom: 18px; }
.hero { border: 1px solid var(--app-border); border-radius: 14px; padding: 14px; background: linear-gradient(130deg, color-mix(in srgb, var(--app-primary) 88%, #fff), color-mix(in srgb, var(--app-primary-dark) 90%, #fff)); color: var(--app-on-primary); display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.hero h2 { margin: 0; font-size: 1.15em; }
.hero p { margin: 6px 0 0; opacity: 0.95; font-size: 0.9em; }
.chips { display: flex; gap: 7px; align-items: center; flex-wrap: wrap; }
.chip { font-size: 12px; border: 1px solid rgba(255,255,255,0.5); padding: 4px 8px; border-radius: 999px; background: rgba(255,255,255,0.12); }

.panel { background: var(--app-card); border: 1px solid var(--app-border); border-radius: 14px; padding: 14px; box-shadow: var(--app-soft-shadow); }
.grid { display: grid; gap: 10px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.col-2 { grid-column: span 2; }
label { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: var(--app-text-secondary); font-weight: 700; }
input, select, textarea { border: 1px solid var(--app-border); border-radius: 10px; background: var(--app-card-elevated); color: var(--app-text); padding: 9px 10px; font-size: 14px; }
input:focus, select:focus, textarea:focus { outline: none; border-color: var(--app-primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--app-primary) 20%, transparent); }

.actions { margin-top: 12px; display: flex; gap: 8px; flex-wrap: wrap; }
.btn { display: inline-flex; align-items: center; justify-content: center; border: 1px solid var(--app-border); border-radius: 10px; background: var(--app-card-elevated); color: var(--app-text-secondary); padding: 8px 12px; font-weight: 700; cursor: pointer; text-decoration: none; }
.btn:hover { border-color: var(--app-primary); color: var(--app-primary); }
.btn.primary { border: none; background: var(--app-primary); color: var(--app-on-primary); box-shadow: 0 8px 20px var(--app-shadow); }

.feedback { margin-top: 10px; border-radius: 10px; padding: 9px 10px; font-size: 13px; border: 1px solid transparent; }
.feedback.info { background: #eff6ff; border-color: #bfdbfe; color: #1d4ed8; }
.feedback.success { background: #ecfdf5; border-color: #bbf7d0; color: #166534; }
.feedback.error { background: #fef2f2; border-color: #fecaca; color: #991b1b; }

.result h3 { margin: 0 0 8px; }
.meta { display: grid; gap: 6px; margin-bottom: 10px; font-size: 13px; color: var(--app-text-secondary); }
.preview-wrap { margin-top: 10px; border: 1px solid var(--app-border); border-radius: 10px; padding: 8px; background: var(--app-card-elevated); }
.preview { width: 100%; border-radius: 8px; background: #000; }
.audio-preview { width: 100%; }
.image-wrap { text-align: center; }
.image-preview { max-width: 100%; border-radius: 8px; display: inline-block; }

@media (max-width: 900px) {
  .grid { grid-template-columns: 1fr; }
  .col-2 { grid-column: auto; }
}
</style>
