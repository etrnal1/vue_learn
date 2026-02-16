<template>
  <div class="app">
    <Header />
    <div class="tabs-container">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="tab-btn"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Tab 1: 首页 -->
    <HomePage v-if="activeTab === 'home'" />

    <!-- Tab 2: Spring 参考 -->
    <SpringReference v-if="activeTab === 'spring'" />

    <!-- Tab 3: Excel 参考 -->
    <ExcelReference v-if="activeTab === 'excel'" />

    <!-- Tab 4: 聊天记录 -->
    <ChatHistory v-if="activeTab === 'chat'" />
  </div>
</template>

<script>
import Header from './components/Header.vue'
import HomePage from './pages/HomePage.vue'
import SpringReference from './pages/SpringReference.vue'
import ExcelReference from './pages/ExcelReference.vue'
import ChatHistory from './pages/ChatHistory.vue'

export default {
  components: {
    Header,
    HomePage,
    SpringReference,
    ExcelReference,
    ChatHistory
  },
  data() {
    return {
      activeTab: 'home',
      tabs: [
        { id: 'home', label: '🏠 首页' },
        { id: 'spring', label: '🚀 Spring 参考' },
        { id: 'excel', label: '📊 Excel 参考' },
        { id: 'chat', label: '💬 聊天记录' }
      ]
    }
  }
}
</script>

<style scoped>
.app {
  max-width: 1400px;
  margin: 0 auto;
}

.tabs-container {
  display: flex;
  gap: 15px;
  margin-bottom: 40px;
  border-bottom: 2px solid #e5e7eb;
  flex-wrap: wrap;
}

.tab-btn {
  padding: 15px 30px;
  background: white;
  border: 2px solid #e5e7eb;
  border-bottom: none;
  border-radius: 12px 12px 0 0;
  font-size: 1.1em;
  font-weight: 700;
  cursor: pointer;
  color: #666;
  transition: all 0.3s;
}

.tab-btn:hover {
  color: #667eea;
  border-color: #667eea;
}

.tab-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-color: transparent;
  box-shadow: 0 5px 20px rgba(102, 126, 234, 0.3);
}
</style>
