<template>
  <div class="start-node" :class="{ selected: selected }">
    <Handle
      type="source"
      position="right"
      :style="{ background: '#22c55e' }"
    />

    <div class="node-content">
      <div class="node-icon">▶</div>
      <div class="node-label">{{ data.label || '开始' }}</div>
    </div>

    <div v-if="data.description" class="node-description">
      {{ data.description }}
    </div>
  </div>
</template>

<script>
import { Handle } from '@vue-flow/core'

export default {
  name: 'StartNode',
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
.start-node {
  min-width: 132px;
  min-height: 64px;
  background: linear-gradient(130deg, #22c55e, #16a34a 58%, #059669);
  color: white;
  border-radius: 999px;
  padding: 12px 16px;
  box-shadow: 0 10px 18px rgba(5, 150, 105, 0.32);
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  cursor: pointer;
  position: relative;
}

.start-node:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 22px rgba(5, 150, 105, 0.42);
}

.start-node.selected {
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
  opacity: 0.95;
  margin-top: 4px;
  max-width: 112px;
  word-wrap: break-word;
}

/* Handle样式覆盖 */
:deep(.vue-flow__handle) {
  width: 10px;
  height: 10px;
  border: 2px solid white;
}
</style>
