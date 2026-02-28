<template>
  <div class="parallel-gateway-node" :class="{ selected: selected }">
    <Handle type="target" position="left" :style="{ background: '#ef4444' }" />
    <Handle type="source" position="right" :style="{ background: '#22c55e' }" />
    <div class="node-body">
      <span class="node-icon">⬠</span>
      <span class="node-label">{{ data.label || '并行网关' }}</span>
    </div>
    <div class="node-meta" v-if="data.description">
      {{ data.description }}
    </div>
  </div>
</template>

<script>
import { Handle, Position } from '@vue-flow/core'

export default {
  name: 'ParallelGatewayNode',
  components: {
    Handle,
    Position
  },
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
.parallel-gateway-node {
  background: linear-gradient(145deg, #fef9c3, #fef3c7);
  border: 2px solid #f59e0b;
  border-radius: 14px;
  padding: 10px 12px;
  min-width: 128px;
  text-align: center;
  box-shadow: 0 10px 20px rgba(217, 119, 6, 0.24);
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.parallel-gateway-node:hover {
  box-shadow: 0 14px 24px rgba(217, 119, 6, 0.3);
  transform: translateY(-2px);
}

.parallel-gateway-node.selected {
  outline: 2px solid #0ea5e9;
  outline-offset: 2px;
}

.node-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.node-icon {
  font-size: 1.55rem;
  line-height: 1;
  color: #92400e;
}

.node-label {
  font-size: 0.86rem;
  font-weight: 700;
  color: #78350f;
  word-break: break-word;
}

.node-meta {
  font-size: 0.75rem;
  color: #7c5a21;
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid rgba(217, 119, 6, 0.24);
}

:deep(.vue-flow__handle) {
  width: 10px;
  height: 10px;
  border: 2px solid #fff;
}
</style>
