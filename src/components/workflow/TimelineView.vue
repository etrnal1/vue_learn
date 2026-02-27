<template>
  <div class="timeline-view">
    <h4>时间线视图</h4>
    <div class="timeline">
      <div v-for="(step, index) in steps" :key="step.id || index" class="timeline-item">
        <div class="timeline-marker" :class="{ conditional: step.conditional }">
          {{ index + 1 }}
        </div>
        <div class="timeline-content">
          <h5>{{ step.name || `步骤 ${index + 1}` }}</h5>
          <p v-if="step.description" class="description">{{ step.description }}</p>
          <div class="meta">
            <span v-if="step.assignee" class="meta-item">👤 {{ step.assignee }}</span>
            <span v-if="step.duration" class="meta-item">⏱ {{ step.duration }}</span>
            <span v-if="step.conditional" class="badge-conditional">条件</span>
          </div>
        </div>
        <div v-if="index < steps.length - 1" class="timeline-connector"></div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'TimelineView',
  props: {
    steps: {
      type: Array,
      default: () => []
    }
  }
}
</script>

<style scoped>
.timeline-view {
  padding: 20px 0;
  border-top: 1px solid var(--app-border);
  border-bottom: 1px solid var(--app-border);
  margin: 20px 0;
}

.timeline-view h4 {
  margin: 0 0 20px 0;
  font-size: 1.1rem;
  color: var(--app-text);
}

.timeline {
  display: flex;
  align-items: flex-start;
  padding: 20px 0;
  overflow-x: auto;
  gap: 0;
}

.timeline-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 160px;
  position: relative;
  flex-shrink: 0;
}

.timeline-marker {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--app-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  z-index: 2;
  font-size: 0.9rem;
  flex-shrink: 0;
}

.timeline-marker.conditional {
  background: #f59e0b;
  border-radius: 0;
  transform: rotate(45deg);
  display: flex;
  align-items: center;
  justify-content: center;
}

.timeline-marker.conditional::before {
  content: attr(data-index);
  transform: rotate(-45deg);
}

.timeline-content {
  margin-top: 12px;
  text-align: center;
  padding: 8px 10px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-card);
  min-height: 100px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 100%;
}

.timeline-content h5 {
  margin: 0 0 6px 0;
  font-size: 0.9rem;
  word-break: break-word;
}

.description {
  font-size: 0.8rem;
  color: var(--app-text-muted);
  margin: 4px 0;
  line-height: 1.3;
}

.meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  font-size: 0.8rem;
}

.meta-item {
  color: var(--app-text-muted);
  white-space: nowrap;
}

.badge-conditional {
  background: #fef3c7;
  color: #92400e;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
}

.timeline-connector {
  position: absolute;
  top: 20px;
  left: 50%;
  width: calc(100% - 20px);
  height: 2px;
  background: var(--app-border);
  z-index: 1;
}

.timeline-item:last-child .timeline-connector {
  display: none;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .timeline {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .timeline-item {
    width: 100%;
    min-width: auto;
    padding-left: 40px;
  }

  .timeline-marker {
    position: absolute;
    left: 0;
    top: 0;
  }

  .timeline-content {
    margin-top: 0;
    text-align: left;
    min-height: auto;
  }

  .meta {
    flex-direction: row;
    justify-content: flex-start;
    flex-wrap: wrap;
    gap: 8px;
  }

  .timeline-connector {
    position: absolute;
    top: 40px;
    left: 20px;
    width: 2px;
    height: 100%;
  }
}
</style>
