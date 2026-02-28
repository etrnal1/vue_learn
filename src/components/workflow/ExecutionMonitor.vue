<template>
  <div class="execution-monitor">
    <h4>执行监控</h4>

    <div class="progress-section">
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: progress + '%' }"></div>
      </div>
      <span class="progress-text">{{ progress }}%</span>
    </div>

    <div class="steps-list">
      <div v-for="step in steps" :key="step.id"
           class="step-item" :class="'step-' + step.status">
        <div class="step-indicator">
          <span v-if="step.status === 'completed'">✓</span>
          <span v-else-if="step.status === 'running'">⏳</span>
          <span v-else>○</span>
        </div>
        <div class="step-info">
          <h5>{{ step.stepName || step.step_name }}</h5>
          <p v-if="step.duration">耗时：{{ formatDuration(step.duration) }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ExecutionMonitor',
  props: {
    progress: {
      type: Number,
      default: 0
    },
    steps: {
      type: Array,
      default: () => []
    }
  },
  methods: {
    formatDuration(ms) {
      if (!ms) return '—'
      const seconds = Math.floor(ms / 1000)
      if (seconds < 60) return `${seconds}秒`
      const minutes = Math.floor(seconds / 60)
      return `${minutes}分${seconds % 60}秒`
    }
  }
}
</script>

<style scoped>
.execution-monitor {
  padding: 16px;
  background: var(--app-card);
  border: 1px solid var(--app-border);
  border-radius: 8px;
}

.execution-monitor h4 {
  margin: 0 0 16px 0;
  font-size: 1rem;
  font-weight: 600;
}

.progress-section {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.progress-bar {
  flex: 1;
  height: 24px;
  background: var(--app-bg);
  border-radius: 12px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #10b981, #059669);
  transition: width 0.5s ease;
}

.progress-text {
  font-weight: 600;
  color: var(--app-primary);
  min-width: 40px;
}

.steps-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.step-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  border-radius: 6px;
  transition: background 0.2s;
}

.step-item:hover {
  background: var(--app-bg);
}

.step-indicator {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #e5e7eb;
  font-size: 0.9rem;
  flex-shrink: 0;
}

.step-completed .step-indicator {
  background: #10b981;
  color: white;
}

.step-running .step-indicator {
  background: #3b82f6;
  color: white;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.step-info {
  min-width: 0;
}

.step-info h5 {
  margin: 0;
  font-size: 0.9rem;
}

.step-info p {
  margin: 2px 0 0 0;
  font-size: 0.8rem;
  color: var(--app-text-muted);
}
</style>
