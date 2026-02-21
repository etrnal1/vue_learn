<template>
  <div class="catalog-card" @click="$emit('select', service)">
    <div class="catalog-icon">{{ service.icon }}</div>
    <h4>{{ service.name }}</h4>
    <p>{{ service.description }}</p>
    <div class="catalog-tags">
      <span class="tag priority">{{ priorityLabel }}</span>
      <span class="tag approval" :class="{ noApproval: service.requiresApproval === false }">
        {{ service.requiresApproval === false ? '免审批' : '需审批' }}
      </span>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ServiceCatalogCard',
  props: {
    service: { type: Object, required: true }
  },
  emits: ['select'],
  computed: {
    priorityLabel() {
      const map = { low: '低优先级', medium: '中优先级', high: '高优先级' }
      return map[this.service.defaultPriority] || '中优先级'
    }
  }
}
</script>

<style scoped>
.catalog-card {
  background: white;
  border-radius: 10px;
  padding: 24px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 2px solid #e5e7eb;
  cursor: pointer;
  transition: all 0.3s;
}

.catalog-card:hover {
  border-color: #3b82f6;
  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.12);
  transform: translateY(-3px);
}

.catalog-icon {
  font-size: 2.5em;
  margin-bottom: 12px;
}

h4 {
  margin: 0 0 8px;
  color: #333;
  font-size: 1em;
}

p {
  color: #888;
  font-size: 0.85em;
  margin: 0;
  line-height: 1.4;
}

.catalog-tags {
  margin-top: 12px;
  display: flex;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
}

.tag {
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 0.72em;
  font-weight: 700;
}

.priority {
  background: #eef2ff;
  color: #4f46e5;
}

.approval {
  background: #ecfeff;
  color: #0e7490;
}

.approval.noApproval {
  background: #ecfdf5;
  color: #047857;
}
</style>
