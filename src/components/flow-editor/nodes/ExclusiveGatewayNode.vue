<template>
  <div class="exclusive-gateway-node" :class="{ selected: selected }">
    <Handle
      type="target"
      position="top"
      :style="{ background: '#ef4444' }"
    />
    <Handle
      type="source"
      position="right"
      :style="{ background: '#22c55e' }"
    />
    <Handle
      type="source"
      position="bottom"
      :style="{ background: '#22c55e' }"
    />

    <div class="node-content">
      <div class="node-icon">◊</div>
      <div class="node-label">{{ data.label || '条件分支' }}</div>
    </div>

    <div v-if="data.description" class="node-description">
      {{ data.description }}
    </div>
  </div>
</template>

<script>
import { Handle } from '@vue-flow/core'

export default {
  name: 'ExclusiveGatewayNode',
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
.exclusive-gateway-node {
  width: 80px;
  height: 80px;
  background: white;
  border: 3px solid #f59e0b;
  transform: rotate(45deg);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
}

.exclusive-gateway-node:hover {
  border-color: #d97706;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
}

.exclusive-gateway-node.selected {
  outline: 2px solid #3b82f6;
  outline-offset: 4px;
}

.node-content {
  transform: rotate(-45deg);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  text-align: center;
}

.node-icon {
  color: #f59e0b;
  font-size: 16px;
  font-weight: bold;
}

.node-label {
  font-weight: 600;
  font-size: 10px;
  color: #1f2937;
  white-space: nowrap;
}

.node-description {
  position: absolute;
  top: 100px;
  left: 50%;
  transform: translateX(-50%) rotate(-45deg);
  font-size: 11px;
  color: #6b7280;
  background: white;
  padding: 4px 8px;
  border-radius: 4px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  white-space: nowrap;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Handle 样式覆盖 - 网关节点需要特殊定位 */
:deep(.vue-flow__handle) {
  width: 10px;
  height: 10px;
  border: 2px solid white;
  transform: rotate(-45deg);
}

:deep(.vue-flow__handle.source) {
  background: #22c55e;
}

:deep(.vue-flow__handle.target) {
  background: #ef4444;
}
</style>