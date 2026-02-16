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
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.3s;
  border-left: 4px solid #10b981;
}

.concept-card:hover {
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
  transform: translateY(-5px);
}

.concept-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
}

.concept-name {
  font-size: 1.3em;
  font-weight: bold;
  color: #10b981;
}

.concept-badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.7em;
  font-weight: bold;
  text-transform: uppercase;
}

.badge-common {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
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
  color: #666;
  font-size: 0.95em;
  margin-bottom: 15px;
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
  font-weight: bold;
  color: #10b981;
  margin-bottom: 8px;
  font-size: 0.85em;
  text-transform: uppercase;
}

.detail-code {
  font-family: 'Courier New', monospace;
  background: #f5f5f5;
  color: #333;
  padding: 10px;
  border-radius: 6px;
  overflow-x: auto;
  font-size: 0.85em;
  margin-bottom: 12px;
  border-left: 3px solid #10b981;
}

.usage-text {
  color: #555;
  font-size: 0.85em;
  line-height: 1.4;
  padding: 10px;
  background: #f0fdf4;
  border-radius: 6px;
  border-left: 3px solid #10b981;
}
</style>
