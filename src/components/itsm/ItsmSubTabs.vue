<template>
  <div class="itsm-sub-tabs">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      class="sub-tab"
      :class="{ active: activeTab === tab.id }"
      @click="$emit('update:activeTab', tab.id)"
    >
      {{ tab.label }}
    </button>
  </div>
</template>

<script>
export default {
  name: 'ItsmSubTabs',
  props: {
    activeTab: { type: String, required: true },
    tabs: { type: Array, required: true }
  },
  emits: ['update:activeTab']
}
</script>

<style scoped>
.itsm-sub-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 25px;
  border-bottom: 2px solid #e5e7eb;
  flex-wrap: wrap;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.sub-tab {
  padding: 12px 22px;
  background: white;
  border: 2px solid #e5e7eb;
  border-bottom: none;
  border-radius: 8px 8px 0 0;
  font-size: 0.95em;
  font-weight: 700;
  cursor: pointer;
  color: #666;
  transition: all 0.3s;
  white-space: nowrap;
}

.sub-tab:hover {
  color: #3b82f6;
  border-color: #3b82f6;
}

.sub-tab.active {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white;
  border-color: transparent;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

@media (max-width: 1024px) {
  .itsm-sub-tabs {
    gap: 8px;
    margin-bottom: 20px;
  }

  .sub-tab {
    padding: 10px 18px;
    font-size: 0.9em;
    border-radius: 6px 6px 0 0;
  }
}

@media (max-width: 768px) {
  .itsm-sub-tabs {
    gap: 6px;
    margin-bottom: 16px;
  }

  .sub-tab {
    padding: 8px 14px;
    font-size: 0.8em;
  }
}

@media (max-width: 480px) {
  .itsm-sub-tabs {
    gap: 4px;
    margin-bottom: 12px;
  }

  .sub-tab {
    padding: 6px 10px;
    font-size: 0.7em;
  }
}
</style>
