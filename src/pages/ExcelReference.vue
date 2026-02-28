<template>
  <div class="excel-reference">
    <div class="search-section">
      <input
        v-model="searchQuery"
        type="text"
        class="search-input"
        placeholder="🔍 搜索函数或描述..."
      >
      <div class="filter-group">
        <button
          v-for="filter in filters"
          :key="filter"
          class="filter-btn"
          :class="{ active: activeFilter === filter }"
          @click="activeFilter = filter"
        >
          {{ filterLabels[filter] }}
        </button>
      </div>
    </div>

    <div v-for="category in categories" :key="category.id" class="category-section">
      <h2 class="category-title">{{ category.label }}</h2>
      <div class="functions-grid">
        <FunctionCard
          v-for="func in getFilteredFunctions(category.id)"
          :key="func.id"
          :func="func"
          @toggle-expand="toggleExpandFunction"
          :expanded="expandedFunctions.includes(func.id)"
        />
      </div>
    </div>

    <div v-if="filteredFunctions.length === 0" class="no-results">
      😕 没有找到匹配的函数
    </div>
  </div>
</template>

<script>
import FunctionCard from '../components/FunctionCard.vue'

export default {
  name: 'ExcelReference',
  components: {
    FunctionCard
  },
  data() {
    return {
      activeFilter: 'all',
      searchQuery: '',
      expandedFunctions: [],
      filters: ['all', 'common', 'beginner', 'intermediate', 'advanced'],
      filterLabels: {
        'all': '全部',
        'common': '⭐ 常用',
        'beginner': '初级',
        'intermediate': '中级',
        'advanced': '高级'
      },
      categories: [
        { id: 'math', label: '📐 数学函数' },
        { id: 'logic', label: '🔀 逻辑函数' },
        { id: 'lookup', label: '🔍 查找函数' },
        { id: 'text', label: '✏️ 文本函数' },
        { id: 'date', label: '📅 日期函数' }
      ],
      functions: [
        // 数学函数
        { id: 1, category: 'math', name: 'SUM', description: '求和函数', common: true, difficulty: 'beginner', example: '=SUM(A1:A10)', result: '150' },
        { id: 2, category: 'math', name: 'AVERAGE', description: '平均值函数', common: true, difficulty: 'beginner', example: '=AVERAGE(B1:B5)', result: '60' },
        { id: 3, category: 'math', name: 'MAX', description: '最大值函数', common: true, difficulty: 'beginner', example: '=MAX(C1:C20)', result: '100' },
        { id: 4, category: 'math', name: 'MIN', description: '最小值函数', common: true, difficulty: 'beginner', example: '=MIN(D1:D15)', result: '5' },
        { id: 5, category: 'math', name: 'COUNT', description: '计数函数', common: true, difficulty: 'beginner', example: '=COUNT(E1:E100)', result: '45' },
        { id: 6, category: 'math', name: 'ROUND', description: '四舍五入函数', common: false, difficulty: 'intermediate', example: '=ROUND(3.14159, 2)', result: '3.14' },
        // 逻辑函数
        { id: 7, category: 'logic', name: 'IF', description: '条件函数', common: true, difficulty: 'beginner', example: '=IF(A1>100, "高", "低")', result: '"高"或"低"' },
        { id: 8, category: 'logic', name: 'AND', description: '与函数', common: false, difficulty: 'intermediate', example: '=AND(A1>10, B1<100)', result: 'TRUE/FALSE' },
        { id: 9, category: 'logic', name: 'OR', description: '或函数', common: false, difficulty: 'intermediate', example: '=OR(A1=1, B1=2)', result: 'TRUE/FALSE' },
        { id: 10, category: 'logic', name: 'NOT', description: '非函数', common: false, difficulty: 'intermediate', example: '=NOT(A1>50)', result: 'TRUE/FALSE' },
        // 查找函数
        { id: 11, category: 'lookup', name: 'VLOOKUP', description: '垂直查找函数', common: true, difficulty: 'intermediate', example: '=VLOOKUP("张三", A:D, 2)', result: '对应值' },
        { id: 12, category: 'lookup', name: 'HLOOKUP', description: '水平查找函数', common: false, difficulty: 'advanced', example: '=HLOOKUP("2024年", A1:Z3, 2)', result: '对应值' },
        { id: 13, category: 'lookup', name: 'INDEX', description: '索引函数', common: false, difficulty: 'advanced', example: '=INDEX(A1:C10, 3, 2)', result: 'B3' },
        { id: 14, category: 'lookup', name: 'MATCH', description: '匹配函数', common: false, difficulty: 'advanced', example: '=MATCH("B", A1:D1, 0)', result: '2' },
        // 文本函数
        { id: 15, category: 'text', name: 'CONCATENATE', description: '连接函数', common: false, difficulty: 'intermediate', example: '=CONCATENATE(A1, " ", B1)', result: '"张 三"' },
        { id: 16, category: 'text', name: 'LEFT', description: '左函数', common: false, difficulty: 'beginner', example: '=LEFT("Hello", 3)', result: '"Hel"' },
        { id: 17, category: 'text', name: 'RIGHT', description: '右函数', common: false, difficulty: 'beginner', example: '=RIGHT("Hello", 3)', result: '"llo"' },
        { id: 18, category: 'text', name: 'LEN', description: '长度函数', common: false, difficulty: 'beginner', example: '=LEN("Excel")', result: '5' },
        { id: 19, category: 'text', name: 'UPPER', description: '大写函数', common: false, difficulty: 'beginner', example: '=UPPER("hello")', result: '"HELLO"' },
        { id: 20, category: 'text', name: 'LOWER', description: '小写函数', common: false, difficulty: 'beginner', example: '=LOWER("HELLO")', result: '"hello"' },
        // 日期函数
        { id: 21, category: 'date', name: 'TODAY', description: '今天函数', common: true, difficulty: 'intermediate', example: '=TODAY()', result: '2024-02-14' },
        { id: 22, category: 'date', name: 'NOW', description: '现在函数', common: false, difficulty: 'intermediate', example: '=NOW()', result: '2024-02-14 12:00' },
        { id: 23, category: 'date', name: 'YEAR', description: '年份函数', common: false, difficulty: 'beginner', example: '=YEAR("2024-02-14")', result: '2024' },
        { id: 24, category: 'date', name: 'MONTH', description: '月份函数', common: false, difficulty: 'beginner', example: '=MONTH("2024-02-14")', result: '2' },
        { id: 25, category: 'date', name: 'DAY', description: '日期函数', common: false, difficulty: 'beginner', example: '=DAY("2024-02-14")', result: '14' }
      ]
    }
  },
  computed: {
    filteredFunctions() {
      return this.functions.filter(func => {
        const matchesSearch = !this.searchQuery ||
          func.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
          func.description.toLowerCase().includes(this.searchQuery.toLowerCase());

        const matchesFilter = this.activeFilter === 'all' ||
          (this.activeFilter === 'common' && func.common) ||
          (this.activeFilter !== 'common' && func.difficulty === this.activeFilter);

        return matchesSearch && matchesFilter;
      });
    }
  },
  methods: {
    getFilteredFunctions(categoryId) {
      return this.filteredFunctions.filter(func => func.category === categoryId);
    },
    toggleExpandFunction(id) {
      const index = this.expandedFunctions.indexOf(id);
      if (index > -1) {
        this.expandedFunctions.splice(index, 1);
      } else {
        this.expandedFunctions = [id];
      }
    }
  }
}
</script>

<style scoped>
.excel-reference {
  color: var(--app-text);
}

.search-section {
  background: var(--app-card);
  border-radius: 16px;
  border: 1px solid var(--app-border);
  padding: 14px;
  margin-bottom: 12px;
  box-shadow: var(--app-soft-shadow);
}

.search-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  font-size: 0.92em;
  margin-bottom: 10px;
  transition: all 0.2s;
  background: var(--app-card-elevated);
  color: var(--app-text);
}

.search-input:focus {
  outline: none;
  border-color: var(--app-primary);
  box-shadow: 0 0 0 3px var(--app-shadow-light);
}

.filter-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.filter-btn {
  padding: 7px 12px;
  border: 1px solid var(--app-border);
  background: var(--app-card-elevated);
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 600;
  color: var(--app-text-secondary);
  font-size: 0.82em;
}

.filter-btn:hover {
  border-color: var(--app-primary);
  color: var(--app-primary);
}

.filter-btn.active {
  background: var(--app-primary);
  color: var(--app-on-primary);
  border-color: transparent;
  box-shadow: 0 8px 18px var(--app-shadow);
}

.category-section {
  margin-bottom: 18px;
}

.category-title {
  font-size: 1.1em;
  color: var(--app-text);
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--app-border);
}

.functions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 12px;
}

.no-results {
  text-align: center;
  padding: 36px 20px;
  color: var(--app-text-muted);
  font-size: 0.96em;
}

@media (max-width: 768px) {
  .functions-grid {
    grid-template-columns: 1fr;
  }

  .search-section {
    padding: 10px;
  }
}
</style>
