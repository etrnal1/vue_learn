<template>
  <div class="preview-wrap">
    <div v-if="!stream && !playbackUrl" class="preview-placeholder">
      <div class="placeholder-icon">🎬</div>
      <p>录制时在此处显示实时预览</p>
    </div>
    <video
      v-show="stream && !playbackUrl"
      ref="liveVideo"
      class="preview-video"
      muted
      autoplay
      playsinline
    ></video>
    <video
      v-show="playbackUrl"
      ref="playbackVideo"
      class="preview-video"
      controls
      :src="playbackUrl"
    ></video>
    <div v-if="playbackUrl" class="playback-actions">
      <a :href="playbackUrl" :download="downloadName" class="btn-dl">下载录制文件</a>
    </div>
  </div>
</template>

<script>
export default {
  name: 'RecorderPreview',
  props: {
    stream: { type: Object, default: null },
    playbackUrl: { type: String, default: '' },
    downloadName: { type: String, default: 'recording.webm' }
  },
  watch: {
    stream(newStream) {
      this.$nextTick(() => {
        if (this.$refs.liveVideo) {
          this.$refs.liveVideo.srcObject = newStream
        }
      })
    }
  }
}
</script>

<style scoped>
.preview-wrap {
  background: #000;
  border-radius: var(--radius);
  overflow: hidden;
  aspect-ratio: 16/9;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.preview-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: var(--text-dim);
}
.placeholder-icon { font-size: 48px; }
.preview-video {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}
.playback-actions {
  position: absolute;
  bottom: 12px;
  right: 12px;
}
.btn-dl {
  padding: 6px 14px;
  background: rgba(0,0,0,.7);
  color: #fff;
  border-radius: 6px;
  font-size: 13px;
  text-decoration: none;
  backdrop-filter: blur(4px);
}
.btn-dl:hover { background: var(--primary); }
</style>
