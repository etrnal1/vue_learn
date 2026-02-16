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
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.3s;
  border-left: 4px solid #667eea;
}

.function-card:hover {
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
  transform: translateY(-5px);
}

.function-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
}

.function-name {
  font-size: 1.3em;
  font-weight: bold;
  color: #667eea;
}

.function-badges {
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
  background: linear-gradient(135deg, #667eea, #764ba2);
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

.function-description {
  color: #666;
  font-size: 0.95em;
  margin-bottom: 15px;
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
  font-weight: bold;
  color: #667eea;
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
  border-left: 3px solid #667eea;
}

.result-code {
  font-family: 'Courier New', monospace;
  background: #e6f7ed;
  color: #059669;
  padding: 10px;
  border-radius: 6px;
  font-size: 0.85em;
  border-left: 3px solid #10b981;
}
</style>
