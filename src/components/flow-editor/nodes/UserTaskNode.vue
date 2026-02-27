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
  min-width: 170px;
  min-height: 96px;
  background: linear-gradient(160deg, #ffffff 0%, #f4f8ff 64%, #ecf3ff 100%);
  border: 1px solid #8ec5ff;
  border-radius: 14px;
  padding: 12px 14px;
  box-shadow: 0 10px 22px rgba(30, 64, 175, 0.18);
  transition: all 0.2s ease;
  cursor: pointer;
  position: relative;
  backdrop-filter: blur(4px);
}

.user-task-node:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 26px rgba(30, 64, 175, 0.24);
  border-color: #60a5fa;
}

.user-task-node.selected {
  outline: 2px solid #0ea5e9;
  outline-offset: 2px;
  border-color: #0284c7;
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
  color: #2563eb;
  font-size: 14px;
  font-weight: bold;
}

.node-label {
  font-weight: 700;
  font-size: 13px;
  color: #12345b;
  flex: 1;
  letter-spacing: 0.2px;
}

.node-description {
  font-size: 11px;
  color: #4f647f;
  line-height: 1.3;
  margin: 2px 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.node-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.node-assignee,
.node-duration {
  font-size: 11px;
  color: #58708d;
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
