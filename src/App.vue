<template>
  <div class="app" :data-theme="currentTheme" :style="appStyleVars">
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

    <div class="global-adjust-bar">
      <div class="adjust-item">
        <label class="adjust-label" for="font-scale">字体</label>
        <input
          id="font-scale"
          type="range"
          min="85"
          max="125"
          step="1"
          v-model.number="appearance.fontScale"
          @input="onAppearanceChange"
          class="range-input"
        />
        <span class="adjust-value">{{ appearance.fontScale }}%</span>
      </div>

      <div class="adjust-item adjust-toggle">
        <label class="checkbox-inline">
          <input
            type="checkbox"
            v-model="appearance.useCustomColors"
            @change="onCustomColorsToggle"
          />
          <span>启用自定义颜色</span>
        </label>
      </div>

      <div class="adjust-item">
        <label class="adjust-label">主色</label>
        <input
          type="color"
          v-model="appearance.primaryColor"
          :disabled="!appearance.useCustomColors"
          @input="onAppearanceChange"
          class="color-input"
        />
      </div>

      <div class="adjust-item">
        <label class="adjust-label">文字</label>
        <input
          type="color"
          v-model="appearance.textColor"
          :disabled="!appearance.useCustomColors"
          @input="onAppearanceChange"
          class="color-input"
        />
      </div>

      <div class="adjust-item">
        <label class="adjust-label">背景</label>
        <input
          type="color"
          v-model="appearance.bgColor"
          :disabled="!appearance.useCustomColors"
          @input="onAppearanceChange"
          class="color-input"
        />
      </div>

      <button class="reset-adjust-btn" @click="resetAppearance">重置外观</button>
    </div>

    <div class="tabs-container">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="tab-btn"
        :class="{ active: activeTab === tab.id }"
        @click="onTabClick(tab.id)"
        @mouseenter="preloadTab(tab.id)"
        @touchstart.passive="preloadTab(tab.id)"
      >
        {{ tab.label }}
      </button>
    </div>

    <HomePage v-if="activeTab === 'home'" />
    <KeepAlive :max="8" v-else>
      <component :is="currentAsyncComponent" :key="activeTab" />
    </KeepAlive>
  </div>
</template>

<script>
import { KeepAlive, defineAsyncComponent } from 'vue'
import Header from './components/Header.vue'
import HomePage from './pages/HomePage.vue'

const AsyncLoadingView = {
  template: '<div class="tab-loading">页面加载中...</div>'
}

const AsyncErrorView = {
  props: ['error'],
  template: '<div class="tab-loading tab-loading-error">页面加载失败，请重试切换标签或刷新页面</div>'
}

const tabLoaders = {
  spring: () => import('./pages/SpringReference.vue'),
  excel: () => import('./pages/ExcelReference.vue'),
  chat: () => import('./pages/ChatHistory.vue'),
  itsm: () => import('./pages/itsm/ItsmPage.vue'),
  git: () => import('./pages/GitBranchManager.vue'),
  video: () => import('./pages/VideoManager.vue'),
  music: () => import('./pages/MusicManager.vue'),
  album: () => import('./pages/AlbumManager.vue'),
  wiki: () => import('./pages/WikiCenter.vue'),
  logs: () => import('./pages/LogCenter.vue'),
  weibo: () => import('./pages/WeiboCrawler.vue'),
  scheduler: () => import('./pages/ScheduledTaskManager.vue'),
  docs: () => import('./pages/DocumentationCenter.vue')
}

function createAsyncPage(loader) {
  return defineAsyncComponent({
    loader,
    loadingComponent: AsyncLoadingView,
    errorComponent: AsyncErrorView,
    delay: 120,
    timeout: 20000,
    suspensible: false,
    onError(error, retry, fail, attempts) {
      if (attempts <= 2) {
        retry()
        return
      }
      console.error('页面异步加载失败', error)
      fail()
    }
  })
}

const SpringReference = createAsyncPage(tabLoaders.spring)
const ExcelReference = createAsyncPage(tabLoaders.excel)
const ChatHistory = createAsyncPage(tabLoaders.chat)
const ItsmPage = createAsyncPage(tabLoaders.itsm)
const GitBranchManager = createAsyncPage(tabLoaders.git)
const VideoManager = createAsyncPage(tabLoaders.video)
const MusicManager = createAsyncPage(tabLoaders.music)
const AlbumManager = createAsyncPage(tabLoaders.album)
const WikiCenter = createAsyncPage(tabLoaders.wiki)
const LogCenter = createAsyncPage(tabLoaders.logs)
const WeiboCrawler = createAsyncPage(tabLoaders.weibo)
const ScheduledTaskManager = createAsyncPage(tabLoaders.scheduler)
const DocumentationCenter = createAsyncPage(tabLoaders.docs)

export default {
  components: {
    Header,
    KeepAlive,
    HomePage,
    SpringReference,
    ExcelReference,
    ChatHistory,
    ItsmPage,
    GitBranchManager,
    VideoManager,
    MusicManager,
    AlbumManager,
    WikiCenter,
    LogCenter,
    WeiboCrawler,
    ScheduledTaskManager,
    DocumentationCenter
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
        { id: 'album', label: '相册管理' },
        { id: 'wiki', label: '维基百科' },
        { id: 'logs', label: '日志中心' },
        { id: 'weibo', label: '微博抓取' },
        { id: 'scheduler', label: '定时任务' },
        { id: 'docs', label: '📚 文档中心' }
      ],
      themes: [
        { id: 'blue', name: '经典蓝', preview: 'linear-gradient(135deg, #667eea, #764ba2)' },
        { id: 'green', name: '森林绿', preview: 'linear-gradient(135deg, #10b981, #047857)' },
        { id: 'purple', name: '星空紫', preview: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' },
        { id: 'orange', name: '暖阳橙', preview: 'linear-gradient(135deg, #f59e0b, #d97706)' },
        { id: 'pink', name: '樱花粉', preview: 'linear-gradient(135deg, #ec4899, #be185d)' },
        { id: 'dark', name: '暗夜', preview: 'linear-gradient(135deg, #374151, #111827)' }
      ],
      appearance: {
        fontScale: 100,
        useCustomColors: false,
        primaryColor: '#007aff',
        textColor: '#1c1c1e',
        bgColor: '#f2f2f7'
      },
      prefetchedTabs: {}
    }
  },
  computed: {
    currentAsyncComponent() {
      const componentMap = {
        spring: SpringReference,
        excel: ExcelReference,
        chat: ChatHistory,
        itsm: ItsmPage,
        git: GitBranchManager,
        video: VideoManager,
        music: MusicManager,
        album: AlbumManager,
        wiki: WikiCenter,
        logs: LogCenter,
        weibo: WeiboCrawler,
        scheduler: ScheduledTaskManager,
        docs: DocumentationCenter
      }
      return componentMap[this.activeTab] || HomePage
    },
    appStyleVars() {
      const styleVars = {
        '--app-font-scale': String((this.appearance.fontScale || 100) / 100)
      }

      if (!this.appearance.useCustomColors) {
        return styleVars
      }

      const primary = this.ensureHex(this.appearance.primaryColor, '#007aff')
      const text = this.ensureHex(this.appearance.textColor, '#1c1c1e')
      const bg = this.ensureHex(this.appearance.bgColor, '#f2f2f7')
      const isBgDark = this.getLuminance(bg) < 0.5
      const card = isBgDark ? this.mixHex(bg, '#ffffff', 0.08) : this.mixHex(bg, '#ffffff', 0.76)
      const cardElevated = isBgDark ? this.mixHex(bg, '#ffffff', 0.14) : this.mixHex(bg, '#ffffff', 0.9)
      const border = isBgDark ? this.mixHex(bg, '#ffffff', 0.18) : this.mixHex(bg, '#000000', 0.14)

      styleVars['--app-primary'] = primary
      styleVars['--app-primary-dark'] = this.mixHex(primary, '#000000', 0.22)
      styleVars['--app-shadow'] = this.withAlpha(primary, 0.28)
      styleVars['--app-shadow-light'] = this.withAlpha(primary, 0.14)
      styleVars['--app-gradient'] = `linear-gradient(160deg, ${this.mixHex(primary, '#ffffff', 0.2)}, ${this.mixHex(primary, '#000000', 0.2)})`
      styleVars['--app-bg'] = bg
      styleVars['--app-card'] = card
      styleVars['--app-card-elevated'] = cardElevated
      styleVars['--app-group-bg'] = this.withAlpha(cardElevated, 0.82)
      styleVars['--app-text'] = text
      styleVars['--app-text-secondary'] = this.mixHex(text, bg, 0.28)
      styleVars['--app-text-muted'] = this.mixHex(text, bg, 0.5)
      styleVars['--app-border'] = border
      styleVars['--app-on-primary'] = this.getLuminance(primary) > 0.54 ? '#111827' : '#ffffff'
      styleVars['--app-soft-shadow'] = isBgDark
        ? `0 14px 30px ${this.withAlpha('#000000', 0.38)}`
        : `0 10px 28px ${this.withAlpha('#1c1c1e', 0.08)}`

      return styleVars
    }
  },
  methods: {
    switchTheme(id) {
      this.currentTheme = id
      localStorage.setItem('app_theme', id)
      this.$nextTick(() => {
        if (!this.appearance.useCustomColors) {
          this.syncAppearanceWithThemeVars()
        }
        this.syncBodyBackground()
      })
    },
    syncBodyBackground() {
      document.body.style.background = getComputedStyle(this.$el).getPropertyValue('--app-bg').trim()
      document.body.style.transition = 'background 0.5s ease'
    },
    onCustomColorsToggle() {
      if (this.appearance.useCustomColors) {
        this.syncAppearanceWithThemeVars()
      }
      this.onAppearanceChange()
    },
    onAppearanceChange() {
      this.saveAppearancePrefs()
      this.$nextTick(() => {
        this.syncBodyBackground()
      })
    },
    resetAppearance() {
      this.appearance.fontScale = 100
      this.appearance.useCustomColors = false
      this.syncAppearanceWithThemeVars()
      this.saveAppearancePrefs()
      this.$nextTick(() => {
        this.syncBodyBackground()
      })
    },
    saveAppearancePrefs() {
      localStorage.setItem('app_appearance', JSON.stringify(this.appearance))
    },
    syncAppearanceWithThemeVars() {
      if (!this.$el) return
      const css = getComputedStyle(this.$el)
      this.appearance.primaryColor = this.ensureHex(css.getPropertyValue('--app-primary').trim(), '#007aff')
      this.appearance.textColor = this.ensureHex(css.getPropertyValue('--app-text').trim(), '#1c1c1e')
      this.appearance.bgColor = this.ensureHex(css.getPropertyValue('--app-bg').trim(), '#f2f2f7')
    },
    ensureHex(color, fallback) {
      if (typeof color !== 'string' || !color.trim()) return fallback
      const value = color.trim().toLowerCase()
      if (/^#[0-9a-f]{6}$/.test(value)) return value
      if (/^#[0-9a-f]{3}$/.test(value)) {
        return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`
      }
      const rgbMatch = value.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/)
      if (rgbMatch) {
        return this.rgbToHex(
          Number.parseInt(rgbMatch[1], 10),
          Number.parseInt(rgbMatch[2], 10),
          Number.parseInt(rgbMatch[3], 10)
        )
      }
      return fallback
    },
    hexToRgb(hex) {
      const normalized = this.ensureHex(hex, '#000000')
      return {
        r: Number.parseInt(normalized.slice(1, 3), 16),
        g: Number.parseInt(normalized.slice(3, 5), 16),
        b: Number.parseInt(normalized.slice(5, 7), 16)
      }
    },
    rgbToHex(r, g, b) {
      const clamp = (n) => Math.max(0, Math.min(255, Math.round(n)))
      return `#${clamp(r).toString(16).padStart(2, '0')}${clamp(g).toString(16).padStart(2, '0')}${clamp(b).toString(16).padStart(2, '0')}`
    },
    mixHex(a, b, ratio = 0.5) {
      const p = Math.max(0, Math.min(1, ratio))
      const c1 = this.hexToRgb(a)
      const c2 = this.hexToRgb(b)
      return this.rgbToHex(
        c1.r + (c2.r - c1.r) * p,
        c1.g + (c2.g - c1.g) * p,
        c1.b + (c2.b - c1.b) * p
      )
    },
    withAlpha(hex, alpha) {
      const { r, g, b } = this.hexToRgb(hex)
      const a = Math.max(0, Math.min(1, alpha))
      return `rgba(${r}, ${g}, ${b}, ${a})`
    },
    getLuminance(hex) {
      const { r, g, b } = this.hexToRgb(hex)
      const toLinear = (c) => {
        const v = c / 255
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
      }
      return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
    },
    onTabClick(tabId) {
      this.activeTab = tabId
      this.preloadNextTabs(tabId)
    },
    preloadTab(tabId) {
      if (!tabId || tabId === 'home') return
      if (this.prefetchedTabs[tabId]) return
      const loader = tabLoaders[tabId]
      if (!loader) return
      this.prefetchedTabs[tabId] = true
      loader().catch(() => {
        this.prefetchedTabs[tabId] = false
      })
    },
    preloadNextTabs(tabId) {
      const index = this.tabs.findIndex((item) => item.id === tabId)
      if (index < 0) return
      const next = this.tabs[index + 1]?.id
      const next2 = this.tabs[index + 2]?.id
      this.preloadTab(next)
      this.preloadTab(next2)
    },
    warmupCommonTabs() {
      const connection = typeof navigator !== 'undefined' ? navigator.connection || navigator.mozConnection || navigator.webkitConnection : null
      const saveData = Boolean(connection?.saveData)
      const effectiveType = String(connection?.effectiveType || '')
      if (saveData || effectiveType.includes('2g')) {
        return
      }
      const warm = () => {
        this.preloadTab('wiki')
      }
      if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(warm, { timeout: 2500 })
      } else {
        setTimeout(warm, 1800)
      }
    }
  },
  mounted() {
    const saved = localStorage.getItem('app_theme')
    if (saved) this.currentTheme = saved
    const savedAppearance = localStorage.getItem('app_appearance')
    if (savedAppearance) {
      try {
        const parsed = JSON.parse(savedAppearance)
        this.appearance = {
          ...this.appearance,
          ...parsed
        }
      } catch (error) {
        console.warn('解析外观设置失败，已使用默认值', error)
      }
    }
    this.$nextTick(() => {
      if (!this.appearance.useCustomColors) {
        this.syncAppearanceWithThemeVars()
      }
      this.syncBodyBackground()
    })
    this.warmupCommonTabs()
  },
  watch: {
    currentTheme() {
      this.$nextTick(() => {
        this.syncBodyBackground()
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
  font-size: calc(16px * var(--app-font-scale, 1));
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

.global-adjust-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 14px;
  align-items: center;
  margin-bottom: 12px;
  padding: 10px 12px;
  background: var(--app-group-bg);
  border: 1px solid var(--app-border);
  border-radius: 14px;
  box-shadow: var(--app-soft-shadow);
}

.adjust-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.adjust-label {
  font-size: 0.8em;
  color: var(--app-text-muted);
  font-weight: 600;
}

.adjust-value {
  min-width: 40px;
  font-size: 0.82em;
  color: var(--app-text-secondary);
  font-weight: 600;
}

.range-input {
  width: 120px;
}

.color-input {
  width: 36px;
  height: 28px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-card-elevated);
  cursor: pointer;
}

.checkbox-inline {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.84em;
  color: var(--app-text-secondary);
  font-weight: 600;
}

.reset-adjust-btn {
  border: 1px solid var(--app-border);
  background: var(--app-card-elevated);
  color: var(--app-text-secondary);
  border-radius: 10px;
  padding: 6px 10px;
  font-size: 0.8em;
  font-weight: 600;
  cursor: pointer;
}

.reset-adjust-btn:hover {
  border-color: var(--app-primary);
  color: var(--app-primary);
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

.tab-loading {
  padding: 28px 12px;
  border: 1px dashed var(--app-border);
  border-radius: 12px;
  color: var(--app-text-muted);
  background: var(--app-card);
  text-align: center;
}

.tab-loading-error {
  border-color: color-mix(in srgb, #ff3b30 40%, var(--app-border));
  color: #b91c1c;
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
  .global-adjust-bar {
    gap: 8px;
    padding: 8px 10px;
  }
  .range-input {
    width: 90px;
  }
}

@media (max-width: 480px) {
  .global-theme-bar { padding: 6px 8px; }
  .theme-pill { padding: 5px 8px; gap: 4px; }
  .theme-label { font-size: 0.75em; }
  .tabs-container { gap: 4px; margin-bottom: 10px; padding: 5px; }
  .tab-btn { padding: 7px 9px; font-size: 0.76em; }
  .global-adjust-bar {
    align-items: flex-start;
    flex-direction: column;
    gap: 8px;
  }
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
