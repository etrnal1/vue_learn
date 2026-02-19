<template>
  <div class="catalog-card" @click="$emit('select', service)">
    <div class="catalog-icon">{{ service.icon }}</div>
    <h4>{{ service.name }}</h4>
    <p>{{ service.description }}</p>
  </div>
</template>

<script>
export default {
  name: 'ServiceCatalogCard',
  props: {
    service: { type: Object, required: true }
  },
  emits: ['select']
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
</style>
