<template>
  <div class="replay-bar">
    <div class="rec-indicator" @click="$emit('enterReplay')" :title="replayMode ? '' : '进入回放模式'">
      <span class="rec-dot" :class="replayMode ? 'replay' : 'live'" />
      <span class="rec-label">{{ replayMode ? '回放中' : '录制中' }}</span>
      <span class="rec-count">{{ snapshotCount }} 帧</span>
    </div>

    <template v-if="replayMode">
      <button class="ctrl-btn" @click="$emit('step', -10)" title="后退10帧">⏮</button>
      <button class="ctrl-btn" @click="$emit('step', -1)">◀</button>
      <button class="ctrl-btn play-btn" @click="$emit('togglePlay')">{{ playing ? '⏸' : '▶' }}</button>
      <button class="ctrl-btn" @click="$emit('step', 1)">▶</button>
      <button class="ctrl-btn" @click="$emit('step', 10)" title="前进10帧">⏭</button>

      <select class="speed-select" :value="speed" @change="$emit('setSpeed', Number($event.target.value))">
        <option :value="0.5">0.5×</option>
        <option :value="1">1×</option>
        <option :value="2">2×</option>
        <option :value="4">4×</option>
        <option :value="8">8×</option>
      </select>

      <div class="timeline-wrap">
        <input type="range" class="timeline-slider"
          :min="0" :max="Math.max(0, snapshotCount - 1)" :value="currentIdx"
          @input="$emit('seek', Number($event.target.value))"
        />
        <div class="time-labels">
          <span>{{ fmtTime(startTime) }}</span>
          <span class="cur-time">{{ fmtTime(currentTime) }}</span>
          <span>{{ fmtTime(endTime) }}</span>
        </div>
      </div>

      <button class="btn-live" @click="$emit('exitReplay')">⚡ 实时</button>
    </template>

    <template v-else>
      <button class="btn-replay" @click="$emit('enterReplay')" :disabled="snapshotCount < 5">
        ⏪ 回放
      </button>
    </template>
  </div>
</template>

<script>
import { defineComponent, computed } from 'vue'

export default defineComponent({
  name: 'ReplayPanel',
  props: {
    replayMode: Boolean,
    playing: Boolean,
    speed: { type: Number, default: 1 },
    currentIdx: { type: Number, default: 0 },
    snapshotCount: { type: Number, default: 0 },
    snapshotMeta: { type: Array, default: () => [] }
  },
  emits: ['enterReplay', 'exitReplay', 'togglePlay', 'step', 'seek', 'setSpeed'],

  setup(props) {
    const startTime = computed(() => props.snapshotMeta[0]?.t || 0)
    const endTime = computed(() => props.snapshotMeta[props.snapshotMeta.length - 1]?.t || 0)
    const currentTime = computed(() => props.snapshotMeta[props.currentIdx]?.t || 0)

    function fmtTime(ts) {
      if (!ts) return '--:--:--'
      const d = new Date(ts)
      return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`
    }

    return { startTime, endTime, currentTime, fmtTime }
  }
})
</script>

<style scoped>
.replay-bar {
  display: flex; align-items: center; gap: 8px;
  padding: 5px 12px; background: #0a1020;
  border-top: 1px solid var(--border); flex-shrink: 0; font-size: 12px;
}
.rec-indicator {
  display: flex; align-items: center; gap: 5px; cursor: pointer;
  padding: 3px 8px; border-radius: 4px; border: 1px solid var(--border);
}
.rec-indicator:hover { border-color: var(--cyan); }
.rec-dot { width: 7px; height: 7px; border-radius: 50%; }
.rec-dot.live { background: #f85149; animation: blink 1.5s infinite; }
.rec-dot.replay { background: #d29922; }
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:.3} }
.rec-label { color: var(--text2); }
.rec-count { color: var(--cyan); font-weight: 600; }
.ctrl-btn {
  background: var(--card); border: 1px solid var(--border); color: var(--text);
  border-radius: 4px; padding: 3px 8px; cursor: pointer; font-size: 11px;
}
.ctrl-btn:hover { border-color: var(--cyan); color: var(--cyan); }
.play-btn { min-width: 32px; }
.speed-select {
  background: var(--bg); border: 1px solid var(--border); color: var(--text);
  border-radius: 4px; padding: 3px 6px; font-size: 11px;
}
.timeline-wrap { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 200px; }
.timeline-slider { width: 100%; accent-color: var(--cyan); cursor: pointer; }
.time-labels { display: flex; justify-content: space-between; color: var(--text2); font-size: 10px; }
.cur-time { color: var(--cyan); font-weight: 600; }
.btn-live {
  background: #1a3a1e; border: 1px solid var(--green); color: var(--green);
  border-radius: 4px; padding: 4px 10px; cursor: pointer; font-size: 11px; white-space: nowrap;
}
.btn-live:hover { background: #2a5a2e; }
.btn-replay {
  background: var(--card); border: 1px solid var(--border); color: var(--text2);
  border-radius: 4px; padding: 4px 10px; cursor: pointer; font-size: 11px;
}
.btn-replay:hover:not(:disabled) { border-color: var(--cyan); color: var(--cyan); }
.btn-replay:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
