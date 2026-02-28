<template>
  <div class="end-node" :class="{ selected: selected }">
    <Handle
      type="target"
      position="left"
      :style="{ background: '#ef4444' }"
    />

    <div class="node-content">
      <div class="node-icon">⏹</div>
      <div class="node-label">{{ data.label || '结束' }}</div>
    </div>

    <div v-if="data.description" class="node-description">
      {{ data.description }}
    </div>
  </div>
</template>

<script>
import { Handle } from '@vue-flow/core'

export default {
  name: 'EndNode',
  components: { Handle },
  props: {
    data: {
      type: Object,
      default: () => ({})
    },
    selected: Boolean
  }
}
</script>

<style scoped>
.end-node {
  min-width: 132px;
  min-height: 64px;
  background: linear-gradient(130deg, #ef4444, #dc2626 54%, #b91c1c);
  color: white;
  border-radius: 999px;
  padding: 12px 16px;
  box-shadow: 0 10px 18px rgba(185, 28, 28, 0.34);
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  cursor: pointer;
  position: relative;
}

.end-node:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 22px rgba(185, 28, 28, 0.42);
}

.end-node.selected {
  outline: 2px solid #0ea5e9;
  outline-offset: 2px;
}

.node-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.node-icon {
  font-size: 14px;
  font-weight: bold;
}

.node-label {
  font-weight: 700;
  font-size: 13px;
  letter-spacing: 0.2px;
}

.node-description {
  font-size: 11px;
  opacity: 0.9;
  margin-top: 4px;
  max-width: 100px;
  word-wrap: break-word;
}

/* Handle样式覆盖 */
:deep(.vue-flow__handle) {
  width: 10px;
  height: 10px;
  border: 2px solid white;
}
</style>
