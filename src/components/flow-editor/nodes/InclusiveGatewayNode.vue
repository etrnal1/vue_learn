<template>
  <div class="inclusive-gateway-node">
    <div class="node-body">
      <span class="node-icon">◈</span>
      <span class="node-label">{{ data.label || '包容网关' }}</span>
    </div>
    <div class="node-meta" v-if="data.description">
      {{ data.description }}
    </div>
  </div>
</template>

<script>
import { Handle, Position } from '@vue-flow/core'

export default {
  name: 'InclusiveGatewayNode',
  components: {
    Handle,
    Position
  },
  props: {
    data: {
      type: Object,
      default: () => ({})
    }
  }
}
</script>

<style scoped>
.inclusive-gateway-node {
  background: #a78bfa;
  border: 2px solid #8b5cf6;
  border-radius: 0;
  padding: 12px;
  min-width: 120px;
  text-align: center;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.2s;
}

.inclusive-gateway-node:hover {
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.15);
  transform: scale(1.05);
}

.node-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.node-icon {
  font-size: 1.8rem;
  line-height: 1;
}

.node-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: #111;
  word-break: break-word;
}

.node-meta {
  font-size: 0.75rem;
  color: #333;
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}
</style>
