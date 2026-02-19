<template>
  <div class="app" :data-theme="currentTheme">
    <Header />

    <!-- Global Theme Switcher -->
    <div class="global-theme-bar">
      <span class="theme-label">主题</span>
      <div class="theme-options">
        <button
          v-for="t in themes"
          :key="t.id"
          @click="switchTheme(t.id)"
          class="theme-pill"
          :class="{ active: currentTheme === t.id }"
          :title="t.name"
        >
          <span class="pill-dot" :style="{ background: t.preview }"></span>
          <span class="pill-name">{{ t.name }}</span>
        </button>
      </div>
    </div>

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

    <HomePage v-if="activeTab === 'home'" />
    <SpringReference v-if="activeTab === 'spring'" />
    <ExcelReference v-if="activeTab === 'excel'" />
    <ChatHistory v-if="activeTab === 'chat'" />
    <ItsmPage v-if="activeTab === 'itsm'" />
  </div>
</template>

<script>
import Header from './components/Header.vue'
import HomePage from './pages/HomePage.vue'
import SpringReference from './pages/SpringReference.vue'
import ExcelReference from './pages/ExcelReference.vue'
import ChatHistory from './pages/ChatHistory.vue'
import ItsmPage from './pages/itsm/ItsmPage.vue'

export default {
  components: {
    Header,
    HomePage,
    SpringReference,
    ExcelReference,
    ChatHistory,
    ItsmPage
  },
  data() {
    return {
      activeTab: 'home',
      currentTheme: 'blue',
      tabs: [
        { id: 'home', label: '🏠 首页' },
        { id: 'spring', label: '🚀 Spring 参考' },
        { id: 'excel', label: '📊 Excel 参考' },
        { id: 'chat', label: '💬 聊天记录' },
        { id: 'itsm', label: '🔧 IT 服务管理' }
      ],
      themes: [
        { id: 'blue', name: '经典蓝', preview: 'linear-gradient(135deg, #667eea, #764ba2)' },
        { id: 'green', name: '森林绿', preview: 'linear-gradient(135deg, #10b981, #047857)' },
        { id: 'purple', name: '星空紫', preview: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' },
        { id: 'orange', name: '暖阳橙', preview: 'linear-gradient(135deg, #f59e0b, #d97706)' },
        { id: 'pink', name: '樱花粉', preview: 'linear-gradient(135deg, #ec4899, #be185d)' },
        { id: 'dark', name: '暗夜', preview: 'linear-gradient(135deg, #374151, #111827)' }
      ]
    }
  },
  methods: {
    switchTheme(id) {
      this.currentTheme = id
      localStorage.setItem('app_theme', id)
      // Sync body background
      document.body.style.background = getComputedStyle(this.$el).getPropertyValue('--app-bg').trim()
      document.body.style.transition = 'background 0.5s ease'
    }
  },
  mounted() {
    const saved = localStorage.getItem('app_theme')
    if (saved) this.currentTheme = saved
    this.$nextTick(() => {
      document.body.style.background = getComputedStyle(this.$el).getPropertyValue('--app-bg').trim()
    })
  },
  watch: {
    currentTheme() {
      this.$nextTick(() => {
        document.body.style.background = getComputedStyle(this.$el).getPropertyValue('--app-bg').trim()
      })
    }
  }
}
</script>

<style scoped>
.app {
  max-width: 1400px;
  margin: 0 auto;
  transition: color 0.5s ease;
  color: var(--app-text);
}

/* Global Theme Switcher Bar */
.global-theme-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding: 10px 16px;
  background: var(--app-card);
  border-radius: 12px;
  border: 1px solid var(--app-border);
  box-shadow: 0 2px 8px var(--app-shadow-light);
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.theme-label {
  font-weight: 700;
  font-size: 0.85em;
  color: var(--app-text-muted);
  white-space: nowrap;
}

.theme-options {
  display: flex;
  gap: 6px;
}

.theme-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: 2px solid var(--app-border);
  background: var(--app-card);
  border-radius: 20px;
  cursor: pointer;
  font-size: 0.8em;
  font-weight: 600;
  color: var(--app-text-secondary);
  transition: all 0.3s;
  white-space: nowrap;
}

.theme-pill:hover {
  border-color: var(--app-primary);
  color: var(--app-primary);
  transform: translateY(-1px);
}

.theme-pill.active {
  border-color: var(--app-primary);
  background: var(--app-primary);
  color: white;
  box-shadow: 0 3px 10px var(--app-shadow);
}

.theme-pill.active .pill-name {
  color: white;
}

.pill-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* Top Tabs */
.tabs-container {
  display: flex;
  gap: 15px;
  margin-bottom: 40px;
  border-bottom: 2px solid var(--app-border);
  flex-wrap: wrap;
}

.tab-btn {
  padding: 15px 30px;
  background: var(--app-card);
  border: 2px solid var(--app-border);
  border-bottom: none;
  border-radius: 12px 12px 0 0;
  font-size: 1.1em;
  font-weight: 700;
  cursor: pointer;
  color: var(--app-text-secondary);
  transition: all 0.3s;
}

.tab-btn:hover {
  color: var(--app-primary);
  border-color: var(--app-primary);
}

.tab-btn.active {
  background: var(--app-gradient);
  color: white;
  border-color: transparent;
  box-shadow: 0 5px 20px var(--app-shadow);
}

@media (max-width: 768px) {
  .global-theme-bar {
    padding: 8px 12px;
    gap: 8px;
    margin-bottom: 14px;
  }
  .theme-pill {
    padding: 5px 10px;
    font-size: 0.75em;
  }
  .pill-dot { width: 12px; height: 12px; }
  .pill-name { display: none; }
  .tabs-container { gap: 8px; margin-bottom: 20px; }
  .tab-btn { padding: 10px 18px; font-size: 0.9em; }
}

@media (max-width: 480px) {
  .global-theme-bar {
    padding: 6px 10px;
    margin-bottom: 10px;
  }
  .theme-pill { padding: 5px 8px; gap: 4px; }
  .theme-label { font-size: 0.75em; }
  .tabs-container { gap: 4px; margin-bottom: 14px; }
  .tab-btn { padding: 8px 12px; font-size: 0.8em; }
}
</style>

<!-- Unscoped: App-level Theme Variables -->
<style>
/* ================================
   App-Level Theme Definitions
   ================================ */

.app[data-theme="blue"] {
  --app-primary: #667eea;
  --app-primary-dark: #764ba2;
  --app-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --app-shadow: rgba(102, 126, 234, 0.3);
  --app-shadow-light: rgba(102, 126, 234, 0.08);
  --app-bg: #f5f7fa;
  --app-card: #ffffff;
  --app-text: #333333;
  --app-text-secondary: #666666;
  --app-text-muted: #999999;
  --app-border: #e5e7eb;
}

.app[data-theme="green"] {
  --app-primary: #10b981;
  --app-primary-dark: #047857;
  --app-gradient: linear-gradient(135deg, #10b981, #047857);
  --app-shadow: rgba(16, 185, 129, 0.3);
  --app-shadow-light: rgba(16, 185, 129, 0.08);
  --app-bg: #f0fdf4;
  --app-card: #ffffff;
  --app-text: #1a3a2a;
  --app-text-secondary: #4b6b5a;
  --app-text-muted: #8aab9a;
  --app-border: #d1fae5;
}

.app[data-theme="purple"] {
  --app-primary: #8b5cf6;
  --app-primary-dark: #6d28d9;
  --app-gradient: linear-gradient(135deg, #8b5cf6, #6d28d9);
  --app-shadow: rgba(139, 92, 246, 0.3);
  --app-shadow-light: rgba(139, 92, 246, 0.08);
  --app-bg: #f5f3ff;
  --app-card: #ffffff;
  --app-text: #2e1a47;
  --app-text-secondary: #6b5b8a;
  --app-text-muted: #a89cc4;
  --app-border: #e9e5f5;
}

.app[data-theme="orange"] {
  --app-primary: #f59e0b;
  --app-primary-dark: #d97706;
  --app-gradient: linear-gradient(135deg, #f59e0b, #d97706);
  --app-shadow: rgba(245, 158, 11, 0.3);
  --app-shadow-light: rgba(245, 158, 11, 0.08);
  --app-bg: #fffbeb;
  --app-card: #ffffff;
  --app-text: #3d2e0a;
  --app-text-secondary: #7a6530;
  --app-text-muted: #b8a570;
  --app-border: #fde68a;
}

.app[data-theme="pink"] {
  --app-primary: #ec4899;
  --app-primary-dark: #be185d;
  --app-gradient: linear-gradient(135deg, #ec4899, #be185d);
  --app-shadow: rgba(236, 72, 153, 0.3);
  --app-shadow-light: rgba(236, 72, 153, 0.08);
  --app-bg: #fdf2f8;
  --app-card: #ffffff;
  --app-text: #3d1028;
  --app-text-secondary: #8a4568;
  --app-text-muted: #c48aa8;
  --app-border: #fce7f3;
}

.app[data-theme="dark"] {
  --app-primary: #60a5fa;
  --app-primary-dark: #818cf8;
  --app-gradient: linear-gradient(135deg, #60a5fa, #818cf8);
  --app-shadow: rgba(96, 165, 250, 0.25);
  --app-shadow-light: rgba(96, 165, 250, 0.06);
  --app-bg: #0f172a;
  --app-card: #1e293b;
  --app-text: #e2e8f0;
  --app-text-secondary: #94a3b8;
  --app-text-muted: #64748b;
  --app-border: #334155;
}

/* ================================
   Global Overrides for ALL pages
   ================================ */

/* Header Banner */
.app[data-theme] .header {
  background: var(--app-gradient);
  box-shadow: 0 10px 40px var(--app-shadow);
}

/* Dark mode: body text in all child pages */
.app[data-theme="dark"],
.app[data-theme="dark"] h1,
.app[data-theme="dark"] h2,
.app[data-theme="dark"] h3,
.app[data-theme="dark"] h4,
.app[data-theme="dark"] p,
.app[data-theme="dark"] span,
.app[data-theme="dark"] label,
.app[data-theme="dark"] li,
.app[data-theme="dark"] td,
.app[data-theme="dark"] th {
  color: var(--app-text);
}

/* Dark: all card-like containers across ALL pages */
.app[data-theme="dark"] .card,
.app[data-theme="dark"] .reference-card,
.app[data-theme="dark"] .feature-card,
.app[data-theme="dark"] .example-card,
.app[data-theme="dark"] .chat-card,
.app[data-theme="dark"] .section-card,
.app[data-theme="dark"] .content-block,
.app[data-theme="dark"] .info-box,
.app[data-theme="dark"] .code-block,
.app[data-theme="dark"] .search-section,
.app[data-theme="dark"] .result-section,
.app[data-theme="dark"] .formula-card {
  background: var(--app-card);
  border-color: var(--app-border);
  color: var(--app-text);
}

/* Dark: tables */
.app[data-theme="dark"] table {
  border-color: var(--app-border);
}

.app[data-theme="dark"] th {
  background: #1a2332;
  border-color: var(--app-border);
}

.app[data-theme="dark"] td {
  border-color: var(--app-border);
  background: var(--app-card);
}

/* Dark: code blocks */
.app[data-theme="dark"] pre,
.app[data-theme="dark"] code {
  background: #0f172a;
  color: #93c5fd;
  border-color: var(--app-border);
}

/* Dark: inputs across all pages */
.app[data-theme="dark"] input,
.app[data-theme="dark"] textarea,
.app[data-theme="dark"] select {
  background: var(--app-card);
  border-color: var(--app-border);
  color: var(--app-text);
}

.app[data-theme="dark"] input:focus,
.app[data-theme="dark"] textarea:focus,
.app[data-theme="dark"] select:focus {
  border-color: var(--app-primary);
}

/* Dark: buttons */
.app[data-theme="dark"] button {
  color: var(--app-text-secondary);
}

/* Dark: links */
.app[data-theme="dark"] a {
  color: var(--app-primary);
}

/* Dark: borders & dividers */
.app[data-theme="dark"] hr {
  border-color: var(--app-border);
}

/* ================================
   ITSM Page: Inherit app theme
   ================================ */
.app[data-theme] .itsm-page {
  --itsm-primary: var(--app-primary);
  --itsm-primary-dark: var(--app-primary-dark);
  --itsm-gradient: var(--app-gradient);
  --itsm-shadow: var(--app-shadow);
  --itsm-bg: transparent;
  --itsm-card-bg: var(--app-card);
  --itsm-text: var(--app-text);
  --itsm-text-secondary: var(--app-text-secondary);
  --itsm-text-muted: var(--app-text-muted);
  --itsm-border: var(--app-border);
  --itsm-hover-bg: var(--app-card);
}

/* Blue special: ITSM uses its own blue, different from app's purple-blue */
.app[data-theme="blue"] .itsm-page {
  --itsm-primary: #3b82f6;
  --itsm-primary-dark: #1d4ed8;
  --itsm-primary-light: #dbeafe;
  --itsm-primary-text: #1e40af;
  --itsm-gradient: linear-gradient(135deg, #3b82f6, #1d4ed8);
  --itsm-shadow: rgba(59, 130, 246, 0.3);
}

.app[data-theme="green"] .itsm-page {
  --itsm-primary-light: #d1fae5;
  --itsm-primary-text: #065f46;
  --itsm-hover-bg: #ecfdf5;
}

.app[data-theme="purple"] .itsm-page {
  --itsm-primary-light: #ede9fe;
  --itsm-primary-text: #5b21b6;
  --itsm-hover-bg: #f5f3ff;
}

.app[data-theme="orange"] .itsm-page {
  --itsm-primary-light: #fef3c7;
  --itsm-primary-text: #92400e;
  --itsm-hover-bg: #fef9ee;
}

.app[data-theme="pink"] .itsm-page {
  --itsm-primary-light: #fce7f3;
  --itsm-primary-text: #9d174d;
  --itsm-hover-bg: #fdf2f8;
}

.app[data-theme="dark"] .itsm-page {
  --itsm-primary: #60a5fa;
  --itsm-primary-dark: #3b82f6;
  --itsm-primary-light: #1e3a5f;
  --itsm-primary-text: #93c5fd;
  --itsm-gradient: linear-gradient(135deg, #60a5fa, #818cf8);
  --itsm-hover-bg: #273548;
}

/* ================================
   Non-dark theme color overrides
   for general pages
   ================================ */

/* Colored theme: header in sub-pages */
.app[data-theme] .section-title,
.app[data-theme] .page-title {
  color: var(--app-text);
}

/* Colored theme: active badges */
.app[data-theme] .badge-active,
.app[data-theme] .tag-active {
  background: var(--app-primary);
  color: white;
}

/* Colored theme: primary buttons */
.app[data-theme] .btn-primary,
.app[data-theme] .primary-btn {
  background: var(--app-gradient);
  border: none;
  color: white;
}

/* Colored theme: hover accents */
.app[data-theme] a:hover {
  color: var(--app-primary-dark);
}
</style>
