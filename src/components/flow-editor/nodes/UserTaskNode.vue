<template>
  <div class="user-task-node" :class="{ selected: selected }">
    <Handle
      type="target"
      position="left"
      :style="{ background: '#ef4444' }"
    />
    <Handle
      type="source"
      position="right"
      :style="{ background: '#22c55e' }"
    />

    <div class="node-content">
      <div class="node-header">
        <div class="node-icon">◻</div>
        <div class="node-label">{{ data.label || '用户任务' }}</div>
      </div>

      <div v-if="data.description" class="node-description">
        {{ data.description }}
      </div>

      <div class="node-meta">
        <div v-if="data.assignee" class="node-assignee">
          👤 {{ data.assignee }}
        </div>
        <div v-if="data.duration" class="node-duration">
          ⏱ {{ data.duration }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { Handle } from '@vue-flow/core'

export default {
  name: 'UserTaskNode',
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
.user-task-node {
  min-width: 140px;
  min-height: 80px;
  background: white;
  border: 2px solid #3b82f6;
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
  cursor: pointer;
  position: relative;
}

.user-task-node:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-color: #2563eb;
}

.user-task-node.selected {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
  border-color: #1d4ed8;
}

.node-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.node-header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.node-icon {
  color: #3b82f6;
  font-size: 14px;
  font-weight: bold;
}

.node-label {
  font-weight: 600;
  font-size: 14px;
  color: #1f2937;
  flex: 1;
}

.node-description {
  font-size: 12px;
  color: #6b7280;
  line-height: 1.3;
  margin: 2px 0;
}

.node-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.node-assignee,
.node-duration {
  font-size: 11px;
  color: #9ca3af;
  display: flex;
  align-items: center;
  gap: 4px;
}

/* Handle样式覆盖 */
:deep(.vue-flow__handle) {
  width: 10px;
  height: 10px;
  border: 2px solid white;
}

:deep(.vue-flow__handle.target) {
  background: #ef4444;
}

:deep(.vue-flow__handle.source) {
  background: #22c55e;
}
</style>