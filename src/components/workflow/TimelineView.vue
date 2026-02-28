<template>
  <div class="timeline-view">
    <div class="timeline-header">
      <h4>时间线视图</h4>
      <div class="legend">
        <span class="legend-item"><i class="dot seq"></i>顺序集</span>
        <span class="legend-item"><i class="dot parallel"></i>平级集</span>
        <span class="legend-item"><i class="dot child"></i>子集</span>
      </div>
    </div>

    <div class="timeline">
      <div
        v-for="(step, index) in normalizedSteps"
        :key="step.id || index"
        class="timeline-item"
        :class="`is-${step.relationType}`"
      >
        <div class="timeline-marker">{{ index + 1 }}</div>
        <div class="timeline-content">
          <h5>{{ step.name || `步骤 ${index + 1}` }}</h5>
          <div class="relation-row">
            <span class="relation-badge" :class="`is-${step.relationType}`">
              {{ relationTypeLabel(step.relationType) }}
            </span>
            <span v-if="step.parentName" class="parent-ref">↳ 从属 {{ step.parentName }}</span>
          </div>
          <p v-if="step.description" class="description">{{ step.description }}</p>
          <div class="meta">
            <span v-if="step.assignee" class="meta-item">👤 {{ step.assignee }}</span>
            <span v-if="step.duration" class="meta-item">⏱ {{ step.duration }}</span>
            <span v-if="step.conditional" class="badge-conditional">条件</span>
          </div>
        </div>
        <div v-if="index < normalizedSteps.length - 1" class="timeline-connector" :class="`is-${step.relationType}`"></div>
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
  },
  computed: {
    normalizedSteps() {
      const stepMap = new Map((this.steps || []).map((s) => [String(s.id), s]))
      return (this.steps || []).map((step) => {
        const relationType = step.relationType || step.relation_type || 'sequential'
        const parentStepId = step.parentStepId || step.parent_step_id || null
        const parentName = parentStepId && stepMap.has(String(parentStepId))
          ? (stepMap.get(String(parentStepId))?.name || String(parentStepId))
          : null
        return {
          ...step,
          relationType,
          parentName
        }
      })
    }
  },
  methods: {
    relationTypeLabel(type) {
      if (type === 'parallel') return '平级集'
      if (type === 'child') return '子集'
      return '顺序集'
    }
  }
}
</script>

<style scoped>
.timeline-view {
  padding: 16px 0;
  border-top: 1px solid var(--app-border);
  border-bottom: 1px solid var(--app-border);
}

.timeline-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 12px;
}

.timeline-view h4 {
  margin: 0;
  font-size: 1.04rem;
  color: var(--app-text);
}

.legend {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.legend-item {
  font-size: 0.78rem;
  color: var(--app-text-muted);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.dot.seq { background: #22c55e; }
.dot.parallel { background: #0ea5e9; }
.dot.child { background: #6366f1; }

.timeline {
  display: flex;
  align-items: flex-start;
  padding: 12px 0;
  overflow-x: auto;
}

.timeline-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 188px;
  position: relative;
  flex-shrink: 0;
}

.timeline-marker {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #22c55e;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  z-index: 2;
}

.timeline-item.is-parallel .timeline-marker {
  background: #0ea5e9;
}

.timeline-item.is-child .timeline-marker {
  background: #6366f1;
}

.timeline-content {
  margin-top: 10px;
  text-align: left;
  padding: 10px;
  border: 1px solid #dce7f6;
  border-radius: 10px;
  background: #fff;
  min-height: 108px;
  width: 176px;
}

.timeline-content h5 {
  margin: 0 0 8px;
  font-size: 0.88rem;
  word-break: break-word;
}

.relation-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
}

.relation-badge {
  display: inline-flex;
  width: fit-content;
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 0.72rem;
  font-weight: 700;
}

.relation-badge.is-sequential {
  color: #166534;
  background: #dcfce7;
}

.relation-badge.is-parallel {
  color: #075985;
  background: #e0f2fe;
}

.relation-badge.is-child {
  color: #3730a3;
  background: #e0e7ff;
}

.parent-ref {
  font-size: 0.72rem;
  color: #4f46e5;
}

.description {
  font-size: 0.78rem;
  color: var(--app-text-muted);
  margin: 4px 0;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
  font-size: 0.76rem;
}

.meta-item {
  color: var(--app-text-muted);
}

.badge-conditional {
  background: #fef3c7;
  color: #92400e;
  padding: 2px 6px;
  border-radius: 6px;
  font-size: 0.72rem;
  font-weight: 600;
}

.timeline-connector {
  position: absolute;
  top: 17px;
  left: 50%;
  width: calc(100% - 18px);
  height: 2px;
  background: #22c55e;
  z-index: 1;
}

.timeline-connector.is-parallel {
  background: repeating-linear-gradient(
    90deg,
    #0ea5e9 0px,
    #0ea5e9 7px,
    transparent 7px,
    transparent 12px
  );
}

.timeline-connector.is-child {
  background: repeating-linear-gradient(
    90deg,
    #6366f1 0px,
    #6366f1 5px,
    transparent 5px,
    transparent 10px
  );
}

@media (max-width: 768px) {
  .timeline {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .timeline-item {
    min-width: 100%;
    align-items: flex-start;
    padding-left: 44px;
  }

  .timeline-marker {
    position: absolute;
    left: 0;
    top: 0;
  }

  .timeline-content {
    width: 100%;
    min-height: 0;
  }

  .timeline-connector {
    width: 2px;
    height: calc(100% + 12px);
    left: 18px;
    top: 36px;
    background: #22c55e;
  }

  .timeline-connector.is-parallel,
  .timeline-connector.is-child {
    background: #0ea5e9;
  }
}
</style>
