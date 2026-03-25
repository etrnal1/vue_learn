<template>
  <div class="list-panel">
    <div class="list-header">
      <h2 class="list-title">录制历史</h2>
      <button class="refresh-btn" @click="$emit('refresh')" :disabled="loading">
        <span :class="{ spin: loading }">↻</span>
      </button>
    </div>

    <div v-if="loading && !recordings.length" class="list-loading">
      <span class="spinner-lg"></span>
    </div>

    <div v-else-if="!recordings.length" class="list-empty">
      <div class="empty-icon">🎞</div>
      <p>暂无录制记录</p>
      <p class="empty-sub">完成第一次录制后会在这里显示</p>
    </div>

    <div v-else class="recordings">
      <RecordingItem
        v-for="item in recordings"
        :key="item.id"
        :item="item"
        @play="$emit('play', $event)"
        @convert="$emit('convert', $event)"
        @delete="$emit('delete', $event)"
        @rename="$emit('rename', $event[0], $event[1])"
      />
    </div>

    <div v-if="total > recordings.length" class="load-more">
      <button class="btn-more" @click="$emit('load-more')" :disabled="loading">加载更多</button>
    </div>
  </div>
</template>

<script>
import RecordingItem from './RecordingItem.vue'

export default {
  name: 'RecordingList',
  components: { RecordingItem },
  props: {
    recordings: { type: Array, default: () => [] },
    total: { type: Number, default: 0 },
    loading: { type: Boolean, default: false }
  },
  emits: ['refresh', 'play', 'convert', 'delete', 'rename', 'load-more']
}
</script>

<style scoped>
.list-panel { display: flex; flex-direction: column; height: 100%; }
.list-header { display: flex; align-items: center; padding: 16px 16px 12px; gap: 8px; }
.list-title { font-size: 16px; font-weight: 600; flex: 1; }
.refresh-btn {
  width: 30px; height: 30px; border-radius: 6px; border: 1px solid var(--border);
  background: transparent; color: var(--text-muted); font-size: 16px;
}
.refresh-btn:hover { color: var(--text); border-color: var(--text-dim); }
.spin { display: inline-block; animation: spin .7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.list-loading, .list-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1; gap: 8px; padding: 40px; color: var(--text-muted); }
.empty-icon { font-size: 40px; }
.empty-sub { font-size: 12px; color: var(--text-dim); }
.spinner-lg { width: 32px; height: 32px; border: 3px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin .7s linear infinite; }

.recordings { display: flex; flex-direction: column; gap: 8px; padding: 0 12px; overflow-y: auto; flex: 1; }
.load-more { padding: 12px; text-align: center; }
.btn-more {
  padding: 8px 24px; border-radius: 8px; border: 1px solid var(--border);
  background: transparent; color: var(--text-muted); font-size: 13px;
}
.btn-more:hover:not(:disabled) { border-color: var(--primary-light); color: var(--text); }
</style>
