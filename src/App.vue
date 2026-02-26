<template>
  <div class="app" :data-theme="currentTheme" :style="appStyleVars">
    <Header />
    <div v-if="!authReady" class="auth-loading">登录状态检查中...</div>
    <div v-else-if="!isLoggedIn" class="auth-card">
      <h2 class="auth-title">{{ authMode === 'login' ? '账号登录' : '账号注册' }}</h2>
      <p class="auth-subtitle">登录后可访问业务模块和权限配置</p>
      <form class="auth-form" @submit.prevent="submitAuth">
        <label class="auth-label">
          <span>账号 ID</span>
          <input v-model.trim="authForm.id" class="auth-input" placeholder="例如: u1" required />
        </label>
        <label v-if="authMode === 'register'" class="auth-label">
          <span>昵称</span>
          <input v-model.trim="authForm.name" class="auth-input" placeholder="例如: 张三" required />
        </label>
        <label class="auth-label">
          <span>密码</span>
          <input v-model="authForm.password" type="password" class="auth-input" placeholder="至少 6 位" required />
        </label>
        <label v-if="authMode === 'register'" class="auth-label">
          <span>邮箱（可选）</span>
          <input v-model.trim="authForm.email" class="auth-input" placeholder="name@example.com" />
        </label>
        <button class="auth-submit" :disabled="authBusy">
          {{ authBusy ? '处理中...' : (authMode === 'login' ? '登录' : '注册并登录') }}
        </button>
      </form>
      <button class="auth-switch" @click="switchAuthMode(authMode === 'login' ? 'register' : 'login')" :disabled="authBusy">
        {{ authMode === 'login' ? '没有账号？去注册' : '已有账号？去登录' }}
      </button>
      <div v-if="authMessage" class="permission-message auth-message">{{ authMessage }}</div>

      <div v-if="isDebugMode" class="auth-debug">
        <div class="auth-debug-title">调试模块（免登录）</div>
        <div class="auth-debug-actions">
          <button
            class="auth-debug-btn"
            :class="{ active: unauthDebugTab === 'authLogs' }"
            @click="unauthDebugTab = 'authLogs'"
          >
            认证日志
          </button>
          <button
            class="auth-debug-btn"
            :class="{ active: unauthDebugTab === 'logs' }"
            @click="unauthDebugTab = 'logs'"
          >
            日志中心
          </button>
        </div>
        <div class="auth-debug-panel">
          <component :is="unauthDebugComponent" />
        </div>
      </div>
    </div>
    <template v-else>

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

    <div class="global-palette-bar">
      <span class="theme-label">色卡预设</span>
      <div class="palette-options">
        <button
          v-for="preset in colorPresets"
          :key="preset.id"
          class="palette-pill"
          :class="{ active: appearance.presetId === preset.id }"
          :title="preset.name"
          @click="applyColorPreset(preset.id)"
        >
          <span class="palette-swatch" :style="{ background: `linear-gradient(135deg, ${preset.primary}, ${mixHex(preset.primary, '#000000', 0.25)})` }"></span>
          <span class="pill-name">{{ preset.name }}</span>
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
          <span>最后微调（自定义颜色）</span>
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

    <div class="permission-bar">
      <span class="theme-label">当前角色</span>
      <div class="role-options">
        <button
          v-for="role in roles"
          :key="role.id"
          class="role-pill"
          :class="{ active: currentRole === role.id }"
          @click="switchRole(role.id)"
        >
          {{ role.label }}
        </button>
      </div>
      <div class="user-session">
        <span class="user-chip">{{ currentUser?.name || currentUser?.id }}（{{ currentUser?.role || 'member' }}）</span>
        <button class="logout-btn" :disabled="authBusy" @click="logout">退出登录</button>
      </div>
    </div>

    <div class="tabs-container">
      <button
        v-for="tab in visibleTabs"
        :key="tab.id"
        class="tab-btn"
        :class="{ active: activeTab === tab.id, locked: !canAccessTab(tab.id) }"
        @click="onTabClick(tab.id)"
        @mouseenter="preloadTab(tab.id)"
        @touchstart.passive="preloadTab(tab.id)"
        :title="getTabTitle(tab.id)"
      >
        {{ tab.label }}<span v-if="!canAccessTab(tab.id)" class="lock-mark">🔒</span>
      </button>
    </div>
    <div v-if="permissionMessage" class="permission-message">{{ permissionMessage }}</div>

    <HomePage v-if="activeTab === 'home'" />
    <KeepAlive :max="8" v-else>
      <component :is="currentAsyncComponent" :key="activeTab" />
    </KeepAlive>
    </template>
  </div>
</template>

<script>
import { KeepAlive, defineAsyncComponent } from 'vue'
import Header from './components/Header.vue'
import HomePage from './pages/HomePage.vue'
import { api } from './utils/api.js'
const IS_DEBUG_MODE = import.meta.env.MODE !== 'production' || import.meta.env.VITE_DEBUG_MODE === 'true'
const DEBUG_ONLY_TAB_IDS = new Set(['logs', 'authLogs'])

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
  docs: () => import('./pages/DocumentationCenter.vue'),
  ffmpeg: () => import('./pages/FfmpegTool.vue'),
  monitor: () => import('./pages/SystemMonitorDashboard.vue'),
  docker: () => import('./pages/DockerVisualizer.vue'),
  terminal: () => import('./pages/TerminalConsole.vue'),
  authLogs: () => import('./pages/AuthLogCenter.vue'),
  runtimeLogs: () => import('./pages/RuntimeLogsViewer.vue')
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
const FfmpegTool = createAsyncPage(tabLoaders.ffmpeg)
const SystemMonitorDashboard = createAsyncPage(tabLoaders.monitor)
const DockerVisualizer = createAsyncPage(tabLoaders.docker)
const TerminalConsole = createAsyncPage(tabLoaders.terminal)
const AuthLogCenter = createAsyncPage(tabLoaders.authLogs)
const RuntimeLogsViewer = createAsyncPage(tabLoaders.runtimeLogs)
const DEFAULT_PERMISSION_CONFIG = {
  roles: [
    { id: 'admin', label: '管理员' },
    { id: 'operator', label: '运维' },
    { id: 'viewer', label: '访客' }
  ],
  tabPermissions: {
    home: ['admin', 'operator', 'viewer'],
    spring: ['admin', 'operator', 'viewer'],
    excel: ['admin', 'operator', 'viewer'],
    chat: ['admin', 'operator'],
    itsm: ['admin', 'operator'],
    git: ['admin', 'operator'],
    video: ['admin', 'operator'],
    music: ['admin', 'operator'],
    album: ['admin', 'operator'],
    wiki: ['admin', 'operator', 'viewer'],
    logs: ['admin'],
    weibo: ['admin', 'operator'],
    scheduler: ['admin'],
    docs: ['admin', 'operator', 'viewer'],
    ffmpeg: ['admin', 'operator'],
    monitor: ['admin', 'operator'],
    docker: ['admin'],
    terminal: ['admin'],
    authLogs: ['admin', 'operator'],
    runtimeLogs: ['admin']
  }
}

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
    DocumentationCenter,
    FfmpegTool,
    SystemMonitorDashboard,
    DockerVisualizer,
    TerminalConsole,
    AuthLogCenter,
    RuntimeLogsViewer
  },
  data() {
    return {
      activeTab: 'home',
      isDebugMode: IS_DEBUG_MODE,
      authReady: false,
      authBusy: false,
      isLoggedIn: false,
      authMode: 'login',
      authMessage: '',
      unauthDebugTab: 'authLogs',
      currentUser: null,
      authForm: {
        id: '',
        name: '',
        password: '',
        email: ''
      },
      currentTheme: 'blue',
      tabs: [
        { id: 'home', label: '首页', roles: ['admin', 'operator', 'viewer'] },
        { id: 'spring', label: 'Spring 参考', roles: ['admin', 'operator', 'viewer'] },
        { id: 'excel', label: 'Excel 参考', roles: ['admin', 'operator', 'viewer'] },
        { id: 'chat', label: '聊天记录', roles: ['admin', 'operator'] },
        { id: 'itsm', label: 'IT 服务管理', roles: ['admin', 'operator'] },
        { id: 'git', label: 'Git 管理', roles: ['admin', 'operator'] },
        { id: 'video', label: '视频管理', roles: ['admin', 'operator'] },
        { id: 'music', label: '音乐管理', roles: ['admin', 'operator'] },
        { id: 'album', label: '相册管理', roles: ['admin', 'operator'] },
        { id: 'wiki', label: '维基百科', roles: ['admin', 'operator', 'viewer'] },
        { id: 'logs', label: '日志中心', roles: ['admin'] },
        { id: 'weibo', label: '微博抓取', roles: ['admin', 'operator'] },
        { id: 'scheduler', label: '定时任务', roles: ['admin'] },
        { id: 'docs', label: '📚 文档中心', roles: ['admin', 'operator', 'viewer'] },
        { id: 'ffmpeg', label: 'FFmpeg 工具', roles: ['admin', 'operator'] },
        { id: 'monitor', label: '设备状态大屏', roles: ['admin', 'operator'] },
        { id: 'docker', label: '🐳 Docker 管理', roles: ['admin'] },
        { id: 'terminal', label: '⌨️ 本机终端', roles: ['admin'] },
        { id: 'authLogs', label: '🔐 认证日志', roles: ['admin', 'operator'] },
        { id: 'runtimeLogs', label: '📊 实时日志', roles: ['admin'] }
      ],
      currentRole: 'operator',
      roles: [
        { id: 'admin', label: '管理员' },
        { id: 'operator', label: '运维' },
        { id: 'viewer', label: '访客' }
      ],
      permissionMessage: '',
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
        presetId: '',
        primaryColor: '#007aff',
        textColor: '#1c1c1e',
        bgColor: '#f2f2f7'
      },
      colorPresets: [
        { id: 'ocean', name: '海洋', primary: '#0EA5E9', text: '#0F172A', bg: '#E0F2FE' },
        { id: 'forest', name: '森林', primary: '#16A34A', text: '#102A17', bg: '#ECFDF3' },
        { id: 'sunset', name: '暖阳', primary: '#EA580C', text: '#1F2937', bg: '#FFF7ED' },
        { id: 'rose', name: '玫瑰', primary: '#DB2777', text: '#3A102C', bg: '#FDF2F8' },
        { id: 'slate', name: '石墨', primary: '#334155', text: '#0F172A', bg: '#F1F5F9' },
        { id: 'mint', name: '薄荷', primary: '#10B981', text: '#042F2E', bg: '#ECFDF5' },
        { id: 'teal', name: '青瓷', primary: '#0D9488', text: '#073B3A', bg: '#F0FDFA' },
        { id: 'cyan', name: '冰川', primary: '#06B6D4', text: '#083344', bg: '#ECFEFF' },
        { id: 'sky', name: '晴空', primary: '#0284C7', text: '#082F49', bg: '#E0F2FE' },
        { id: 'indigo', name: '靛蓝', primary: '#4F46E5', text: '#1E1B4B', bg: '#EEF2FF' },
        { id: 'violet', name: '紫藤', primary: '#7C3AED', text: '#2E1065', bg: '#F5F3FF' },
        { id: 'fuchsia', name: '洋红', primary: '#C026D3', text: '#4A044E', bg: '#FDF4FF' },
        { id: 'magenta', name: '莓果', primary: '#D946EF', text: '#4A044E', bg: '#FAE8FF' },
        { id: 'ruby', name: '赤霞', primary: '#E11D48', text: '#4C0519', bg: '#FFF1F2' },
        { id: 'crimson', name: '绯红', primary: '#DC2626', text: '#450A0A', bg: '#FEF2F2' },
        { id: 'amber', name: '琥珀', primary: '#D97706', text: '#451A03', bg: '#FFFBEB' },
        { id: 'gold', name: '鎏金', primary: '#CA8A04', text: '#422006', bg: '#FEFCE8' },
        { id: 'lime', name: '青柠', primary: '#65A30D', text: '#1A2E05', bg: '#F7FEE7' },
        { id: 'emerald', name: '祖母绿', primary: '#059669', text: '#022C22', bg: '#ECFDF5' },
        { id: 'olive', name: '橄榄', primary: '#4D7C0F', text: '#1A2E05', bg: '#F7FEE7' },
        { id: 'sand', name: '沙丘', primary: '#A16207', text: '#3F2A06', bg: '#FFFBEB' },
        { id: 'coffee', name: '咖啡', primary: '#92400E', text: '#3A1D07', bg: '#FFF7ED' },
        { id: 'brick', name: '赤陶', primary: '#B45309', text: '#431407', bg: '#FFF7ED' },
        { id: 'graphite', name: '深石墨', primary: '#1F2937', text: '#0B1220', bg: '#E5E7EB' },
        { id: 'midnight', name: '深夜蓝', primary: '#1D4ED8', text: '#E5EDFF', bg: '#0B1220' }
      ],
      prefetchedTabs: {}
    }
  },
  computed: {
    visibleTabs() {
      if (this.isDebugMode) return this.tabs
      return this.tabs.filter((tab) => !DEBUG_ONLY_TAB_IDS.has(tab.id))
    },
    unauthDebugComponent() {
      return this.unauthDebugTab === 'logs' ? LogCenter : AuthLogCenter
    },
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
        docs: DocumentationCenter,
        ffmpeg: FfmpegTool,
        monitor: SystemMonitorDashboard,
        docker: DockerVisualizer,
        terminal: TerminalConsole,
        authLogs: AuthLogCenter,
        runtimeLogs: RuntimeLogsViewer
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
      if (!this.appearance.useCustomColors) {
        this.appearance.presetId = ''
      }
      localStorage.setItem('app_theme', id)
      this.$nextTick(() => {
        if (!this.appearance.useCustomColors) {
          this.syncAppearanceWithThemeVars()
        }
        this.syncBodyBackground()
      })
    },
    switchAuthMode(mode) {
      this.authMode = mode === 'register' ? 'register' : 'login'
      this.authMessage = ''
    },
    async submitAuth() {
      if (this.authBusy) return
      this.authBusy = true
      this.authMessage = ''
      try {
        if (this.authMode === 'login') {
          const result = await api.auth.login(this.authForm.id, this.authForm.password)
          this.currentUser = result?.user || null
        } else {
          const result = await api.auth.register({
            id: this.authForm.id,
            name: this.authForm.name,
            password: this.authForm.password,
            email: this.authForm.email || null
          })
          this.currentUser = result?.user || null
        }
        this.isLoggedIn = true
        await this.loadPermissionConfig()
        await this.loadCurrentRole()
        if (!this.canAccessTab(this.activeTab)) {
          this.activeTab = this.findFirstAccessibleTab()
        }
      } catch (error) {
        this.authMessage = error?.message || '认证失败'
      } finally {
        this.authBusy = false
      }
    },
    async checkAuthSession() {
      try {
        const result = await api.auth.me()
        this.currentUser = result?.user || null
        this.isLoggedIn = Boolean(this.currentUser)
      } catch (error) {
        this.currentUser = null
        this.isLoggedIn = false
      } finally {
        this.authReady = true
      }
    },
    async logout() {
      if (this.authBusy) return
      this.authBusy = true
      try {
        await api.auth.logout()
      } finally {
        this.currentUser = null
        this.isLoggedIn = false
        this.authMode = 'login'
        this.authMessage = ''
        this.authBusy = false
      }
    },
    syncBodyBackground() {
      document.body.style.background = getComputedStyle(this.$el).getPropertyValue('--app-bg').trim()
      document.body.style.transition = 'background 0.5s ease'
    },
    onCustomColorsToggle() {
      if (this.appearance.useCustomColors) {
        if (!this.appearance.presetId) {
          this.syncAppearanceWithThemeVars()
        }
      }
      this.onAppearanceChange()
    },
    applyColorPreset(presetId) {
      const preset = this.colorPresets.find((item) => item.id === presetId)
      if (!preset) return
      this.appearance.presetId = preset.id
      this.appearance.useCustomColors = true
      this.appearance.primaryColor = this.ensureHex(preset.primary, '#007aff')
      this.appearance.textColor = this.ensureHex(preset.text, '#1c1c1e')
      this.appearance.bgColor = this.ensureHex(preset.bg, '#f2f2f7')
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
      this.appearance.presetId = ''
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
      if (!this.canAccessTab(tabId)) {
        this.permissionMessage = `当前角色无权限访问「${this.getTabLabel(tabId)}」`
        return
      }
      this.permissionMessage = ''
      this.activeTab = tabId
      this.preloadNextTabs(tabId)
    },
    getTabLabel(tabId) {
      return this.tabs.find((tab) => tab.id === tabId)?.label || tabId
    },
    getTabTitle(tabId) {
      if (this.canAccessTab(tabId)) return this.getTabLabel(tabId)
      return `无权限访问：${this.getTabLabel(tabId)}`
    },
    canAccessTab(tabId) {
      if (!this.isLoggedIn && this.isDebugMode && DEBUG_ONLY_TAB_IDS.has(tabId)) return true
      if (!this.isDebugMode && DEBUG_ONLY_TAB_IDS.has(tabId)) return false
      const tab = this.tabs.find((item) => item.id === tabId)
      if (!tab) return false
      const roles = Array.isArray(tab.roles) ? tab.roles : []
      return roles.includes(this.currentRole)
    },
    findFirstAccessibleTab() {
      return this.visibleTabs.find((tab) => this.canAccessTab(tab.id))?.id || 'home'
    },
    async switchRole(roleId) {
      try {
        const result = await api.users.setCurrentRole(roleId)
        this.currentRole = result?.role || roleId
        if (!this.canAccessTab(this.activeTab)) {
          this.activeTab = this.findFirstAccessibleTab()
        }
        this.permissionMessage = ''
      } catch (error) {
        this.permissionMessage = `切换角色失败：${error?.message || '未知错误'}`
      }
    },
    async loadCurrentRole() {
      try {
        const result = await api.users.getCurrentRole()
        const role = String(result?.role || '').trim()
        if (this.roles.some((item) => item.id === role)) {
          this.currentRole = role
        }
      } catch (error) {
        console.warn('加载当前角色失败，使用默认角色', error)
      }
    },
    applyPermissionConfig(config) {
      const source = config && typeof config === 'object' ? config : DEFAULT_PERMISSION_CONFIG
      const nextRoles = Array.isArray(source.roles) ? source.roles : []
      const normalizedRoles = nextRoles
        .map((role) => ({
          id: String(role?.id || '').trim().toLowerCase(),
          label: String(role?.label || role?.id || '').trim()
        }))
        .filter((role, index, arr) => role.id && role.label && arr.findIndex((item) => item.id === role.id) === index)

      if (normalizedRoles.length > 0) {
        this.roles = normalizedRoles
      }

      const validRoleIds = this.roles.map((role) => role.id)
      const tabPermissions = source.tabPermissions && typeof source.tabPermissions === 'object'
        ? source.tabPermissions
        : {}

      this.tabs = this.tabs.map((tab) => {
        const candidate = Array.isArray(tabPermissions[tab.id]) ? tabPermissions[tab.id] : tab.roles
        const nextTabRoles = Array.from(
          new Set((candidate || [])
            .map((id) => String(id || '').trim().toLowerCase())
            .filter((id) => validRoleIds.includes(id)))
        )
        return {
          ...tab,
          roles: nextTabRoles.length > 0 ? nextTabRoles : [validRoleIds[0] || 'operator']
        }
      })

      if (!validRoleIds.includes(this.currentRole)) {
        this.currentRole = validRoleIds[0] || 'operator'
      }
    },
    async loadPermissionConfig() {
      try {
        const config = await api.users.getPermissionConfig()
        this.applyPermissionConfig(config)
      } catch (error) {
        console.warn('加载权限配置失败，使用默认配置', error)
        this.applyPermissionConfig(DEFAULT_PERMISSION_CONFIG)
      }
    },
    preloadTab(tabId) {
      if (!tabId || tabId === 'home') return
      if (!this.canAccessTab(tabId)) return
      if (this.prefetchedTabs[tabId]) return
      const loader = tabLoaders[tabId]
      if (!loader) return
      this.prefetchedTabs[tabId] = true
      loader().catch(() => {
        this.prefetchedTabs[tabId] = false
      })
    },
    preloadNextTabs(tabId) {
      const index = this.visibleTabs.findIndex((item) => item.id === tabId)
      if (index < 0) return
      const next = this.visibleTabs[index + 1]?.id
      const next2 = this.visibleTabs[index + 2]?.id
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
  async mounted() {
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
    if (!this.canAccessTab(this.activeTab)) {
      this.activeTab = this.findFirstAccessibleTab()
    }
    this.$nextTick(() => {
      if (!this.appearance.useCustomColors) {
        this.syncAppearanceWithThemeVars()
      }
      this.syncBodyBackground()
    })
    await this.checkAuthSession()
    if (this.isLoggedIn) {
      await this.loadPermissionConfig()
      await this.loadCurrentRole()
      if (!this.canAccessTab(this.activeTab)) {
        this.activeTab = this.findFirstAccessibleTab()
      }
      this.warmupCommonTabs()
    }
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

.auth-loading {
  padding: 28px 14px;
  border: 1px dashed var(--app-border);
  border-radius: 14px;
  background: var(--app-card);
  color: var(--app-text-muted);
  text-align: center;
  margin-bottom: 16px;
}

.auth-card {
  max-width: 460px;
  margin: 12px auto 20px;
  padding: 20px;
  border: 1px solid var(--app-border);
  border-radius: 16px;
  background: var(--app-card);
  box-shadow: var(--app-soft-shadow);
}

.auth-title {
  margin: 0 0 6px;
  font-size: 1.2em;
}

.auth-subtitle {
  margin: 0 0 12px;
  color: var(--app-text-muted);
  font-size: 0.9em;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.auth-label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.85em;
  color: var(--app-text-secondary);
}

.auth-input {
  border: 1px solid var(--app-border);
  border-radius: 10px;
  padding: 8px 10px;
  background: var(--app-card-elevated);
  color: var(--app-text);
}

.auth-submit {
  border: 1px solid transparent;
  border-radius: 10px;
  background: var(--app-primary);
  color: var(--app-on-primary);
  font-weight: 700;
  padding: 9px 10px;
  cursor: pointer;
}

.auth-switch {
  margin-top: 10px;
  border: none;
  background: transparent;
  color: var(--app-primary);
  font-size: 0.86em;
  cursor: pointer;
}

.auth-message {
  margin-top: 10px;
}

.auth-debug {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px dashed var(--app-border);
}

.auth-debug-title {
  font-size: 0.84em;
  font-weight: 700;
  color: var(--app-text-secondary);
  margin-bottom: 8px;
}

.auth-debug-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

.auth-debug-btn {
  border: 1px solid var(--app-border);
  background: var(--app-card-elevated);
  color: var(--app-text-secondary);
  border-radius: 999px;
  padding: 5px 10px;
  font-size: 0.74em;
  font-weight: 700;
  cursor: pointer;
}

.auth-debug-btn.active {
  border-color: transparent;
  background: var(--app-primary);
  color: var(--app-on-primary);
}

.auth-debug-panel {
  border: 1px solid var(--app-border);
  border-radius: 10px;
  padding: 10px;
  max-height: 52vh;
  overflow: auto;
  background: var(--app-card-elevated);
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

.global-palette-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  padding: 8px 12px;
  background: var(--app-group-bg);
  border: 1px solid var(--app-border);
  border-radius: 14px;
  box-shadow: var(--app-soft-shadow);
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.permission-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  padding: 8px 12px;
  background: var(--app-group-bg);
  border: 1px solid var(--app-border);
  border-radius: 14px;
  box-shadow: var(--app-soft-shadow);
}

.user-session {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.user-chip {
  border: 1px solid var(--app-border);
  background: var(--app-card-elevated);
  color: var(--app-text-secondary);
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 0.75em;
  white-space: nowrap;
}

.logout-btn {
  border: 1px solid color-mix(in srgb, #ff3b30 42%, var(--app-border));
  background: color-mix(in srgb, #ff3b30 11%, var(--app-card-elevated));
  color: #b91c1c;
  border-radius: 999px;
  padding: 5px 10px;
  font-size: 0.74em;
  font-weight: 700;
  cursor: pointer;
}

.role-options {
  display: flex;
  gap: 8px;
}

.role-pill {
  border: 1px solid var(--app-border);
  background: var(--app-card-elevated);
  color: var(--app-text-secondary);
  border-radius: 999px;
  padding: 5px 10px;
  font-size: 0.76em;
  font-weight: 600;
  cursor: pointer;
}

.role-pill.active {
  border-color: transparent;
  background: var(--app-primary);
  color: var(--app-on-primary);
  box-shadow: 0 6px 16px var(--app-shadow);
}

.palette-options {
  display: flex;
  gap: 8px;
}

.palette-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border: 1px solid var(--app-border);
  border-radius: 999px;
  background: var(--app-card-elevated);
  color: var(--app-text-secondary);
  font-size: 0.75em;
  cursor: pointer;
  white-space: nowrap;
}

.palette-pill:hover {
  border-color: color-mix(in srgb, var(--app-primary) 36%, var(--app-border));
  color: var(--app-primary);
}

.palette-pill.active {
  border-color: transparent;
  background: var(--app-primary);
  color: var(--app-on-primary);
  box-shadow: 0 6px 16px var(--app-shadow);
}

.palette-swatch {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.6);
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

.tab-btn.locked {
  opacity: 0.55;
}

.tab-btn.locked:hover {
  background: transparent;
  color: var(--app-text-secondary);
}

.lock-mark {
  margin-left: 4px;
  font-size: 0.88em;
}

.permission-message {
  margin-top: -12px;
  margin-bottom: 14px;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, #ff3b30 36%, var(--app-border));
  background: color-mix(in srgb, #ff3b30 10%, var(--app-card));
  color: #b91c1c;
  font-size: 0.84em;
  font-weight: 600;
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
  .global-palette-bar {
    padding: 8px 10px;
    gap: 8px;
    margin-bottom: 8px;
  }
  .permission-bar {
    padding: 8px 10px;
    gap: 8px;
    margin-bottom: 8px;
  }
  .user-session {
    width: 100%;
    margin-left: 0;
    justify-content: flex-end;
  }
  .theme-pill {
    padding: 5px 9px;
    font-size: 0.75em;
  }
  .palette-pill {
    padding: 5px 9px;
    font-size: 0.75em;
  }
  .role-pill {
    padding: 5px 8px;
    font-size: 0.74em;
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
  .global-palette-bar { padding: 6px 8px; }
  .permission-bar { padding: 6px 8px; }
  .auth-card { padding: 14px; border-radius: 12px; }
  .theme-pill { padding: 5px 8px; gap: 4px; }
  .palette-pill { padding: 5px 8px; gap: 4px; }
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
