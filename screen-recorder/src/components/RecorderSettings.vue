<template>
  <div class="settings-panel">
    <h3 class="settings-title">录制设置</h3>
    <div class="settings-grid">
      <div class="setting-item">
        <label class="setting-label">视频质量</label>
        <div class="btn-group">
          <button
            v-for="q in qualities"
            :key="q.value"
            class="btn-opt"
            :class="{ active: modelValue.quality === q.value }"
            @click="update('quality', q.value)"
          >{{ q.label }}</button>
        </div>
      </div>
      <div class="setting-item">
        <label class="setting-label">帧率</label>
        <div class="btn-group">
          <button
            v-for="f in frameRates"
            :key="f"
            class="btn-opt"
            :class="{ active: modelValue.frameRate === f }"
            @click="update('frameRate', f)"
          >{{ f }} fps</button>
        </div>
      </div>
      <div class="setting-item">
        <label class="setting-label">分块间隔</label>
        <div class="btn-group">
          <button
            v-for="t in timeslices"
            :key="t.value"
            class="btn-opt"
            :class="{ active: modelValue.timeslice === t.value }"
            @click="update('timeslice', t.value)"
          >{{ t.label }}</button>
        </div>
      </div>
      <div class="setting-item toggles">
        <label class="toggle-row">
          <span>系统音频</span>
          <span class="toggle" :class="{ on: modelValue.captureAudio }" @click="update('captureAudio', !modelValue.captureAudio)">
            <span class="toggle-thumb"></span>
          </span>
        </label>
        <label class="toggle-row">
          <span>麦克风</span>
          <span class="toggle" :class="{ on: modelValue.captureMic }" @click="update('captureMic', !modelValue.captureMic)">
            <span class="toggle-thumb"></span>
          </span>
        </label>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'RecorderSettings',
  props: {
    modelValue: { type: Object, required: true }
  },
  emits: ['update:modelValue'],
  data() {
    return {
      qualities: [
        { value: 'high', label: '高质量' },
        { value: 'medium', label: '中等' },
        { value: 'low', label: '低质量' }
      ],
      frameRates: [24, 30, 60],
      timeslices: [
        { value: 3000, label: '3s' },
        { value: 5000, label: '5s' },
        { value: 10000, label: '10s' }
      ]
    }
  },
  methods: {
    update(key, val) {
      this.$emit('update:modelValue', { ...this.modelValue, [key]: val })
    }
  }
}
</script>

<style scoped>
.settings-panel { padding: 16px; }
.settings-title { font-size: 13px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: .05em; margin-bottom: 14px; }
.settings-grid { display: flex; flex-direction: column; gap: 14px; }
.setting-item { display: flex; flex-direction: column; gap: 6px; }
.setting-label { font-size: 12px; color: var(--text-muted); }
.btn-group { display: flex; gap: 6px; flex-wrap: wrap; }
.btn-opt {
  padding: 5px 12px; border-radius: 6px; border: 1px solid var(--border);
  background: var(--bg); color: var(--text-muted); font-size: 13px;
  transition: all .15s;
}
.btn-opt.active { background: var(--primary); color: #fff; border-color: var(--primary); }
.btn-opt:hover:not(.active) { border-color: var(--primary-light); color: var(--text); }
.toggles { flex-direction: row; flex-wrap: wrap; gap: 16px; }
.toggle-row { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text); cursor: pointer; }
.toggle {
  width: 40px; height: 22px; border-radius: 11px; background: var(--border);
  position: relative; transition: background .2s; flex-shrink: 0;
}
.toggle.on { background: var(--primary); }
.toggle-thumb {
  position: absolute; top: 3px; left: 3px; width: 16px; height: 16px;
  border-radius: 50%; background: #fff; transition: transform .2s;
}
.toggle.on .toggle-thumb { transform: translateX(18px); }
</style>
