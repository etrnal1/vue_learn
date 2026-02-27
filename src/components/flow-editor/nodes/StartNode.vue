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
  min-width: 120px;
  min-height: 60px;
  background: linear-gradient(135deg, #22c55e, #16a34a);
  color: white;
  border-radius: 50px;
  padding: 12px 16px;
  box-shadow: 0 2px 8px rgba(34, 197, 94, 0.3);
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
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.4);
}

.start-node.selected {
  outline: 2px solid #3b82f6;
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
  font-weight: 600;
  font-size: 14px;
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