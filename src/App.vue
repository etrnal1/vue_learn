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
    <GitBranchManager v-if="activeTab === 'git'" />
    <VideoManager v-if="activeTab === 'video'" />
    <MusicManager v-if="activeTab === 'music'" />
    <LogCenter v-if="activeTab === 'logs'" />
    <WeiboCrawler v-if="activeTab === 'weibo'" />
    <ScheduledTaskManager v-if="activeTab === 'scheduler'" />
  </div>
</template>

<script>
import Header from './components/Header.vue'
import HomePage from './pages/HomePage.vue'
import SpringReference from './pages/SpringReference.vue'
import ExcelReference from './pages/ExcelReference.vue'
import ChatHistory from './pages/ChatHistory.vue'
import ItsmPage from './pages/itsm/ItsmPage.vue'
import GitBranchManager from './pages/GitBranchManager.vue'
import VideoManager from './pages/VideoManager.vue'
import MusicManager from './pages/MusicManager.vue'
import LogCenter from './pages/LogCenter.vue'
import WeiboCrawler from './pages/WeiboCrawler.vue'
import ScheduledTaskManager from './pages/ScheduledTaskManager.vue'

export default {
  components: {
    Header,
    HomePage,
    SpringReference,
    ExcelReference,
    ChatHistory,
    ItsmPage,
    GitBranchManager,
    VideoManager,
    MusicManager,
    LogCenter,
    WeiboCrawler,
    ScheduledTaskManager
  },
  data() {
    return {
      activeTab: 'home',
      currentTheme: 'blue',
      tabs: [
        { id: 'home', label: '首页' },
        { id: 'spring', label: 'Spring 参考' },
        { id: 'excel', label: 'Excel 参考' },
        { id: 'chat', label: '聊天记录' },
        { id: 'itsm', label: 'IT 服务管理' },
        { id: 'git', label: 'Git 管理' },
        { id: 'video', label: '视频管理' },
        { id: 'music', label: '音乐管理' },
        { id: 'logs', label: '日志中心' },
        { id: 'weibo', label: '微博抓取' },
        { id: 'scheduler', label: '定时任务' }
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
  max-width: 1320px;
  margin: 0 auto;
  transition: color 0.2s ease;
  color: var(--app-text);
}

.global-theme-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
  padding: 8px 12px;
  background: var(--app-group-bg);
  border-radius: 16px;
  border: 1px solid var(--app-border);
  box-shadow: var(--app-soft-shadow);
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.theme-label {
  font-weight: 600;
  font-size: 0.78em;
  letter-spacing: 0.02em;
  color: var(--app-text-muted);
  white-space: nowrap;
}

.theme-options {
  display: flex;
  gap: 8px;
}

.theme-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border: 1px solid var(--app-border);
  background: var(--app-card-elevated);
  border-radius: 999px;
  cursor: pointer;
  font-size: 0.75em;
  font-weight: 500;
  color: var(--app-text-secondary);
  transition: transform 0.16s ease, background 0.16s ease, color 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease;
  white-space: nowrap;
}

.theme-pill:hover {
  border-color: color-mix(in srgb, var(--app-primary) 35%, var(--app-border));
  color: var(--app-primary);
}

.theme-pill.active {
  border-color: transparent;
  background: var(--app-primary);
  color: var(--app-on-primary);
  box-shadow: 0 6px 16px var(--app-shadow);
}

.theme-pill.active .pill-name {
  color: var(--app-on-primary);
}

.pill-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.tabs-container {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  padding: 8px;
  background: var(--app-group-bg);
  border: 1px solid var(--app-border);
  border-radius: 18px;
  box-shadow: var(--app-soft-shadow);
  flex-wrap: wrap;
}

.tab-btn {
  padding: 9px 14px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 12px;
  font-size: 0.9em;
  font-weight: 600;
  cursor: pointer;
  color: var(--app-text-secondary);
  transition: transform 0.16s ease, background 0.16s ease, color 0.16s ease, box-shadow 0.16s ease;
}

.tab-btn:hover {
  background: var(--app-card-elevated);
  color: var(--app-primary);
}

.tab-btn.active {
  background: var(--app-primary);
  color: var(--app-on-primary);
  border-color: transparent;
  box-shadow: 0 8px 18px var(--app-shadow);
}

@media (max-width: 768px) {
  .global-theme-bar {
    padding: 8px 10px;
    gap: 8px;
    margin-bottom: 10px;
  }
  .theme-pill {
    padding: 5px 9px;
    font-size: 0.75em;
  }
  .pill-dot { width: 9px; height: 9px; }
  .pill-name { display: none; }
  .tabs-container { gap: 6px; margin-bottom: 14px; padding: 6px; }
  .tab-btn { padding: 8px 10px; font-size: 0.8em; }
}

@media (max-width: 480px) {
  .global-theme-bar { padding: 6px 8px; }
  .theme-pill { padding: 5px 8px; gap: 4px; }
  .theme-label { font-size: 0.75em; }
  .tabs-container { gap: 4px; margin-bottom: 10px; padding: 5px; }
  .tab-btn { padding: 7px 9px; font-size: 0.76em; }
}
</style>

<style>
.app[data-theme="blue"] {
  --app-primary: #007aff;
  --app-primary-dark: #005fcc;
  --app-shadow: rgba(0, 122, 255, 0.28);
  --app-shadow-light: rgba(0, 122, 255, 0.12);
  --app-gradient: linear-gradient(160deg, #2b95ff, #005fcc);
  --app-bg: #f2f2f7;
  --app-card: #ffffff;
  --app-card-elevated: #fbfbfd;
  --app-group-bg: rgba(244, 244, 248, 0.78);
  --app-text: #1c1c1e;
  --app-text-secondary: #3a3a3c;
  --app-text-muted: #8e8e93;
  --app-border: #d1d1d6;
  --app-on-primary: #ffffff;
  --app-soft-shadow: 0 10px 28px rgba(28, 28, 30, 0.06);
}

.app[data-theme="green"] {
  --app-primary: #34c759;
  --app-primary-dark: #28a746;
  --app-shadow: rgba(52, 199, 89, 0.28);
  --app-shadow-light: rgba(52, 199, 89, 0.12);
  --app-gradient: linear-gradient(160deg, #4dd96f, #28a746);
  --app-bg: #f1f8f1;
  --app-card: #ffffff;
  --app-card-elevated: #f8fdf8;
  --app-group-bg: rgba(242, 249, 243, 0.8);
  --app-text: #18211b;
  --app-text-secondary: #2e3d32;
  --app-text-muted: #7f8b83;
  --app-border: #d0ddd3;
  --app-on-primary: #ffffff;
  --app-soft-shadow: 0 10px 28px rgba(24, 33, 27, 0.06);
}

.app[data-theme="purple"] {
  --app-primary: #5856d6;
  --app-primary-dark: #4342ab;
  --app-shadow: rgba(88, 86, 214, 0.28);
  --app-shadow-light: rgba(88, 86, 214, 0.12);
  --app-gradient: linear-gradient(160deg, #7371e4, #4342ab);
  --app-bg: #f4f2fb;
  --app-card: #ffffff;
  --app-card-elevated: #fcfbff;
  --app-group-bg: rgba(244, 241, 252, 0.82);
  --app-text: #1f1d2b;
  --app-text-secondary: #38344f;
  --app-text-muted: #7d7894;
  --app-border: #d7d1e5;
  --app-on-primary: #ffffff;
  --app-soft-shadow: 0 10px 28px rgba(31, 29, 43, 0.06);
}

.app[data-theme="orange"] {
  --app-primary: #ff9500;
  --app-primary-dark: #cc7600;
  --app-shadow: rgba(255, 149, 0, 0.28);
  --app-shadow-light: rgba(255, 149, 0, 0.12);
  --app-gradient: linear-gradient(160deg, #ffac3d, #cc7600);
  --app-bg: #fdf8f0;
  --app-card: #ffffff;
  --app-card-elevated: #fffaf2;
  --app-group-bg: rgba(253, 247, 239, 0.82);
  --app-text: #2b2418;
  --app-text-secondary: #4c3e24;
  --app-text-muted: #8c7f68;
  --app-border: #e7d6bc;
  --app-on-primary: #1f1300;
  --app-soft-shadow: 0 10px 28px rgba(43, 36, 24, 0.06);
}

.app[data-theme="pink"] {
  --app-primary: #ff2d55;
  --app-primary-dark: #cf2142;
  --app-shadow: rgba(255, 45, 85, 0.28);
  --app-shadow-light: rgba(255, 45, 85, 0.12);
  --app-gradient: linear-gradient(160deg, #ff5979, #cf2142);
  --app-bg: #fef4f7;
  --app-card: #ffffff;
  --app-card-elevated: #fff8fa;
  --app-group-bg: rgba(254, 243, 247, 0.82);
  --app-text: #2a1c21;
  --app-text-secondary: #4a323a;
  --app-text-muted: #8d6f79;
  --app-border: #eacfd7;
  --app-on-primary: #ffffff;
  --app-soft-shadow: 0 10px 28px rgba(42, 28, 33, 0.06);
}

.app[data-theme="dark"] {
  --app-primary: #0a84ff;
  --app-primary-dark: #0066cc;
  --app-shadow: rgba(10, 132, 255, 0.32);
  --app-shadow-light: rgba(10, 132, 255, 0.16);
  --app-gradient: linear-gradient(160deg, #2b95ff, #0066cc);
  --app-bg: #121214;
  --app-card: #1c1c1e;
  --app-card-elevated: #2c2c2e;
  --app-group-bg: rgba(44, 44, 46, 0.82);
  --app-text: #f2f2f7;
  --app-text-secondary: #e5e5ea;
  --app-text-muted: #98989d;
  --app-border: #3a3a3c;
  --app-on-primary: #ffffff;
  --app-soft-shadow: 0 14px 30px rgba(0, 0, 0, 0.36);
}

.app[data-theme] .header {
  background: linear-gradient(160deg, color-mix(in srgb, var(--app-primary) 88%, white), var(--app-primary-dark));
  box-shadow: 0 18px 36px color-mix(in srgb, var(--app-shadow) 85%, transparent);
}

.app[data-theme],
.app[data-theme] h1,
.app[data-theme] h2,
.app[data-theme] h3,
.app[data-theme] h4,
.app[data-theme] p,
.app[data-theme] span,
.app[data-theme] label,
.app[data-theme] li,
.app[data-theme] td,
.app[data-theme] th {
  color: var(--app-text);
}

.app[data-theme] .itsm-page {
  --itsm-primary: var(--app-primary);
  --itsm-primary-dark: var(--app-primary-dark);
  --itsm-gradient: linear-gradient(160deg, color-mix(in srgb, var(--app-primary) 88%, white), var(--app-primary-dark));
  --itsm-shadow: var(--app-shadow);
  --itsm-bg: transparent;
  --itsm-card-bg: var(--app-card);
  --itsm-text: var(--app-text);
  --itsm-text-secondary: var(--app-text-secondary);
  --itsm-text-muted: var(--app-text-muted);
  --itsm-border: var(--app-border);
  --itsm-hover-bg: var(--app-card);
}

.app[data-theme="green"] .itsm-page {
  --itsm-primary-light: #ddf5e4;
  --itsm-primary-text: #26793a;
  --itsm-hover-bg: #f3fbf5;
}

.app[data-theme="purple"] .itsm-page {
  --itsm-primary-light: #ece9fb;
  --itsm-primary-text: #4f4cbf;
  --itsm-hover-bg: #f8f7fd;
}

.app[data-theme="orange"] .itsm-page {
  --itsm-primary-light: #f9ead2;
  --itsm-primary-text: #ba6200;
  --itsm-hover-bg: #fdf8f2;
}

.app[data-theme="pink"] .itsm-page {
  --itsm-primary-light: #f9e0e7;
  --itsm-primary-text: #cf2142;
  --itsm-hover-bg: #fdf5f8;
}

.app[data-theme="dark"] .itsm-page {
  --itsm-primary-light: #1f3a59;
  --itsm-primary-text: #7bc0ff;
  --itsm-hover-bg: #252528;
}

.app[data-theme] .card,
.app[data-theme] .reference-card,
.app[data-theme] .feature-card,
.app[data-theme] .example-card,
.app[data-theme] .chat-card,
.app[data-theme] .section-card,
.app[data-theme] .content-block,
.app[data-theme] .info-box,
.app[data-theme] .code-block,
.app[data-theme] .search-section,
.app[data-theme] .result-section,
.app[data-theme] .formula-card,
.app[data-theme] .panel,
.app[data-theme] .info-section,
.app[data-theme] .tech-stack,
.app[data-theme] .modal,
.app[data-theme] .modal-content {
  background: var(--app-card);
  border: 1px solid var(--app-border);
  border-radius: 18px;
  box-shadow: var(--app-soft-shadow);
}

.app[data-theme] .badge-active,
.app[data-theme] .tag-active {
  background: var(--app-primary);
  color: var(--app-on-primary);
}

.app[data-theme] button,
.app[data-theme] .btn,
.app[data-theme] .btn-secondary,
.app[data-theme] .secondary-btn {
  background: var(--app-card-elevated);
  color: var(--app-text-secondary);
  border: 1px solid var(--app-border);
  border-radius: 12px;
}

.app[data-theme] .btn-primary,
.app[data-theme] .primary-btn {
  background: var(--app-primary);
  border-color: transparent;
  color: var(--app-on-primary);
  box-shadow: 0 8px 18px var(--app-shadow);
}

.app[data-theme] .subtab.active,
.app[data-theme] .tab-btn.active,
.app[data-theme] .theme-pill.active {
  color: var(--app-on-primary);
}

.app[data-theme] .view-tab.active,
.app[data-theme] .filter-btn.active,
.app[data-theme] .flow-btn.active,
.app[data-theme] .chip.active {
  background: var(--app-primary);
  border-color: transparent;
  color: var(--app-on-primary);
  box-shadow: 0 8px 18px var(--app-shadow);
}

.app[data-theme] .btn-danger {
  background: #ff3b30;
  border-color: transparent;
  color: #fff;
  box-shadow: 0 8px 18px rgba(255, 59, 48, 0.24);
}

.app[data-theme] input,
.app[data-theme] textarea,
.app[data-theme] select {
  background: var(--app-card-elevated);
  color: var(--app-text);
  border: 1px solid var(--app-border);
  border-radius: 12px;
}

.app[data-theme] input:focus,
.app[data-theme] textarea:focus,
.app[data-theme] select:focus {
  outline: 2px solid color-mix(in srgb, var(--app-primary) 36%, transparent);
  outline-offset: 0;
  border-color: var(--app-primary);
}

.app[data-theme] table,
.app[data-theme] th,
.app[data-theme] td {
  border-color: var(--app-border);
}

.app[data-theme] th {
  background: var(--app-card-elevated);
}

.app[data-theme] pre,
.app[data-theme] code {
  background: color-mix(in srgb, var(--app-card) 70%, #dde3f2 30%);
  border: 1px solid var(--app-border);
  border-radius: 10px;
}

.app[data-theme] a {
  color: var(--app-primary);
}

.app[data-theme] a:hover {
  color: var(--app-primary-dark);
}
</style>
