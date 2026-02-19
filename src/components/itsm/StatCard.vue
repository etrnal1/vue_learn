<template>
  <div class="stat-card" :style="{ borderLeftColor: color }">
    <div class="stat-icon">{{ icon }}</div>
    <div class="stat-info">
      <div class="stat-value">{{ value }}</div>
      <div class="stat-label">{{ label }}</div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'StatCard',
  props: {
    icon: { type: String, default: '📊' },
    value: { type: [Number, String], required: true },
    label: { type: String, required: true },
    color: { type: String, default: '#3b82f6' }
  }
}
</script>

<style scoped>
.stat-card {
  background: white;
  border-radius: 10px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border-left: 4px solid;
  transition: all 0.3s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.stat-icon {
  font-size: 2em;
}

.stat-value {
  font-size: 1.8em;
  font-weight: 800;
  color: #333;
  line-height: 1;
}

.stat-label {
  font-size: 0.85em;
  color: #888;
  margin-top: 4px;
  font-weight: 600;
}
</style>
