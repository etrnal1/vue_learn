<template>
  <div class="search-filter">
    <input
      :value="searchQuery"
      @input="$emit('update:searchQuery', $event.target.value)"
      type="text"
      class="search-input"
      :placeholder="placeholder"
    >
    <div v-if="filters.length" class="filter-group">
      <button
        v-for="f in filters"
        :key="f.value"
        class="filter-btn"
        :class="{ active: activeFilter === f.value }"
        @click="$emit('update:activeFilter', f.value)"
      >
        {{ f.label }}
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SearchFilter',
  props: {
    searchQuery: { type: String, default: '' },
    activeFilter: { type: String, default: 'all' },
    filters: { type: Array, default: () => [] },
    placeholder: { type: String, default: '搜索...' }
  },
  emits: ['update:searchQuery', 'update:activeFilter']
}
</script>

<style scoped>
.search-filter {
  background: white;
  border-radius: 10px;
  padding: 18px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.search-input {
  width: 100%;
  padding: 10px 14px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.95em;
  transition: all 0.3s;
}

.search-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 8px rgba(59, 130, 246, 0.2);
}

.filter-group {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.filter-btn {
  padding: 6px 14px;
  border: 2px solid #e5e7eb;
  background: white;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s;
  font-weight: 600;
  font-size: 0.85em;
  color: #666;
}

.filter-btn:hover {
  border-color: #3b82f6;
  color: #3b82f6;
}

.filter-btn.active {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

@media (max-width: 1024px) {
  .search-filter {
    padding: 14px;
    margin-bottom: 16px;
  }

  .search-input {
    padding: 8px 12px;
    font-size: 0.9em;
  }

  .filter-group {
    gap: 6px;
    margin-top: 10px;
  }
}

@media (max-width: 768px) {
  .search-filter {
    padding: 12px;
    margin-bottom: 12px;
    border-radius: 8px;
  }

  .search-input {
    padding: 8px 10px;
    font-size: 0.85em;
  }

  .filter-btn {
    padding: 5px 12px;
    font-size: 0.8em;
  }
}

@media (max-width: 480px) {
  .search-filter {
    padding: 10px;
    margin-bottom: 10px;
  }

  .search-input {
    padding: 6px 8px;
    font-size: 0.8em;
  }

  .filter-group {
    gap: 4px;
    margin-top: 8px;
  }

  .filter-btn {
    padding: 4px 8px;
    font-size: 0.7em;
  }
}
</style>
