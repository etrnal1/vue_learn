<template>
  <div class="concept-card" @click="$emit('toggle-expand', concept.id)">
    <div class="concept-header">
      <div class="concept-name">{{ concept.name }}</div>
      <div class="concept-badges">
        <span v-if="concept.common" class="badge badge-common">常用</span>
        <span class="badge" :class="`badge-${concept.difficulty}`">
          {{ difficultyLabels[concept.difficulty] }}
        </span>
      </div>
    </div>
    <div class="concept-description">{{ concept.description }}</div>
    <div class="concept-detail" :class="{ show: expanded }">
      <div class="detail-label">📝 用法：</div>
      <div class="detail-code">{{ concept.usage }}</div>
      <div class="detail-label">✅ 何时使用：</div>
      <div class="usage-text">{{ concept.when }}</div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ConceptCard',
  props: {
    concept: Object,
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
.concept-card {
  background: var(--app-card);
  border-radius: 14px;
  padding: 14px;
  box-shadow: var(--app-soft-shadow);
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid var(--app-border);
  border-left: 3px solid var(--app-primary);
}

.concept-card:hover {
  transform: translateY(-1px);
}

.concept-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
}

.concept-name {
  font-size: 1.04em;
  font-weight: 700;
  color: var(--app-primary);
}

.concept-badges {
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

.concept-description {
  color: var(--app-text-secondary);
  font-size: 0.88em;
  margin-bottom: 10px;
  line-height: 1.5;
}

.concept-detail {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease;
}

.concept-detail.show {
  max-height: 500px;
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

.usage-text {
  color: var(--app-text-secondary);
  font-size: 0.8em;
  line-height: 1.4;
  padding: 9px;
  background: color-mix(in srgb, var(--app-primary) 10%, var(--app-card));
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--app-primary) 30%, var(--app-border));
}
</style>
