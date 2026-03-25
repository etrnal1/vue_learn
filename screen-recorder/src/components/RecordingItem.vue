<template>
  <div class="recording-item">
    <div class="rec-thumb">
      <img v-if="item.hasThumbnail" :src="thumbnailUrl" alt="" @error="onThumbError" />
      <div v-else class="thumb-placeholder">🎥</div>
    </div>
    <div class="rec-info">
      <div class="rec-name-row">
        <input
          v-if="editing"
          ref="nameInput"
          class="rec-name-input"
          v-model="editName"
          @keydown.enter="saveName"
          @keydown.escape="cancelEdit"
          @blur="saveName"
        />
        <span v-else class="rec-name" @dblclick="startEdit">{{ item.name }}</span>
        <span class="rec-format" :class="item.format">{{ item.format.toUpperCase() }}</span>
      </div>
      <div class="rec-meta">
        <span>{{ item.durationHuman }}</span>
        <span class="dot">·</span>
        <span>{{ item.sizeHuman }}</span>
        <span class="dot">·</span>
        <span>{{ item.createdAtHuman }}</span>
      </div>
    </div>
    <div class="rec-actions">
      <button class="act-btn" title="播放" @click="$emit('play', item)">▶</button>
      <a :href="downloadUrl" :download="item.filename" class="act-btn" title="下载">⬇</a>
      <button
        v-if="item.format === 'webm' && !item.convertedMp4Id"
        class="act-btn"
        title="转为 MP4"
        @click="$emit('convert', item)"
      >🔄</button>
      <button class="act-btn danger" title="删除" @click="$emit('delete', item)">🗑</button>
    </div>
  </div>
</template>

<script>
import { getThumbnailUrl, getDownloadUrl } from '../api/screenRecorder.js'

export default {
  name: 'RecordingItem',
  props: {
    item: { type: Object, required: true }
  },
  emits: ['play', 'convert', 'delete', 'rename'],
  data() {
    return {
      editing: false,
      editName: ''
    }
  },
  computed: {
    thumbnailUrl() { return getThumbnailUrl(this.item.id) },
    downloadUrl() { return getDownloadUrl(this.item.id) }
  },
  methods: {
    startEdit() {
      this.editName = this.item.name
      this.editing = true
      this.$nextTick(() => this.$refs.nameInput?.focus())
    },
    saveName() {
      if (this.editName.trim() && this.editName.trim() !== this.item.name) {
        this.$emit('rename', this.item, this.editName.trim())
      }
      this.editing = false
    },
    cancelEdit() {
      this.editing = false
    },
    onThumbError(e) {
      e.target.style.display = 'none'
    }
  }
}
</script>

<style scoped>
.recording-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: var(--radius-sm);
  background: var(--bg-card2);
  transition: background .15s;
}
.recording-item:hover { background: #2a2d45; }
.rec-thumb {
  width: 80px;
  height: 45px;
  border-radius: 6px;
  overflow: hidden;
  background: #000;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.rec-thumb img { width: 100%; height: 100%; object-fit: cover; }
.thumb-placeholder { font-size: 20px; }
.rec-info { flex: 1; min-width: 0; }
.rec-name-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.rec-name { font-size: 14px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer; }
.rec-name-input {
  flex: 1; font-size: 14px; background: var(--bg); border: 1px solid var(--primary);
  color: var(--text); border-radius: 4px; padding: 2px 6px; outline: none;
}
.rec-format {
  font-size: 11px; font-weight: 700; padding: 2px 6px; border-radius: 4px;
  text-transform: uppercase; flex-shrink: 0;
}
.rec-format.webm { background: rgba(66,153,225,.2); color: var(--info); }
.rec-format.mp4 { background: rgba(72,187,120,.2); color: var(--success); }
.rec-meta { font-size: 12px; color: var(--text-muted); display: flex; align-items: center; gap: 6px; }
.dot { opacity: .4; }
.rec-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.act-btn {
  width: 30px; height: 30px; border-radius: 6px; border: 1px solid var(--border);
  background: var(--bg); color: var(--text-muted); font-size: 14px;
  display: flex; align-items: center; justify-content: center; text-decoration: none;
  transition: all .15s;
}
.act-btn:hover { border-color: var(--primary-light); color: var(--text); }
.act-btn.danger:hover { border-color: var(--danger); color: var(--danger); background: rgba(229,62,62,.1); }
</style>
