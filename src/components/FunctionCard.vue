<template>
  <div class="function-card" @click="$emit('toggle-expand', func.id)">
    <div class="function-header">
      <div class="function-name">{{ func.name }}</div>
      <div class="function-badges">
        <span v-if="func.common" class="badge badge-common">常用</span>
        <span class="badge" :class="`badge-${func.difficulty}`">
          {{ difficultyLabels[func.difficulty] }}
        </span>
      </div>
    </div>
    <div class="function-description">{{ func.description }}</div>
    <div class="function-detail" :class="{ show: expanded }">
      <div class="detail-label">📝 公式：</div>
      <div class="detail-code">{{ func.example }}</div>
      <div class="detail-label">📊 返回结果：</div>
      <div class="result-code">{{ func.result }}</div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'FunctionCard',
  props: {
    func: Object,
    expanded: Boolean
  },
  emits: ['toggle-expand'],
  data() {
    return {
      difficultyLabels: {
        'beginner': '初级',
        'intermediate': '中级',
        'advanced': '高级'
      }
    }
  }
}
</script>

<style scoped>
.function-card {
  background: var(--app-card);
  border-radius: 14px;
  padding: 14px;
  box-shadow: var(--app-soft-shadow);
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid var(--app-border);
  border-left: 3px solid var(--app-primary);
}

.function-card:hover {
  transform: translateY(-1px);
}

.function-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
}

.function-name {
  font-size: 1.04em;
  font-weight: 700;
  color: var(--app-primary);
}

.function-badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.badge {
  display: inline-block;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 0.7em;
  font-weight: 700;
  text-transform: uppercase;
}

.badge-common {
  background: var(--app-primary);
  color: var(--app-on-primary);
}

.badge-beginner {
  background: #d1fae5;
  color: #059669;
}

.badge-intermediate {
  background: #fef3c7;
  color: #d97706;
}

.badge-advanced {
  background: #fee2e2;
  color: #dc2626;
}

.function-description {
  color: var(--app-text-secondary);
  font-size: 0.88em;
  margin-bottom: 10px;
  line-height: 1.5;
}

.function-detail {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease;
}

.function-detail.show {
  max-height: 400px;
}

.detail-label {
  font-weight: 700;
  color: var(--app-primary);
  margin-bottom: 6px;
  font-size: 0.8em;
}

.detail-code {
  font-family: 'Courier New', monospace;
  background: var(--app-card-elevated);
  color: var(--app-text);
  padding: 9px;
  border-radius: 10px;
  overflow-x: auto;
  font-size: 0.8em;
  margin-bottom: 10px;
  border: 1px solid var(--app-border);
}

.result-code {
  font-family: 'Courier New', monospace;
  background: color-mix(in srgb, #34c759 15%, var(--app-card));
  color: #059669;
  padding: 9px;
  border-radius: 10px;
  font-size: 0.8em;
  border: 1px solid color-mix(in srgb, #34c759 38%, var(--app-border));
}
</style>
