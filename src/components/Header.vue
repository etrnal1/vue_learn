<template>
  <div>
    <!-- 顶栏 Header -->
    <div class="header">
      <!-- 左侧：Hamburger + Logo + 标题 -->
      <div class="header-left">
        <button class="hamburger-btn" @click="$emit('toggle-menu')" aria-label="打开菜单">☰</button>
        <span class="header-logo">✨ Vue 3 中心</span>
      </div>

      <!-- 右侧：信息 chips + 设置按钮 -->
      <div class="header-right">
        <span class="chip status-chip" :class="statusClass" @click="toggleStatusDetail" :title="statusText">{{ statusText }}</span>
        <span v-if="pwaInfo.installed" class="chip pwa-chip" @click="togglePWADetail" :title="pwaStatusDetail">📱 PWA</span>
        <span v-else-if="pwaInfo.isPWACapable" class="chip pwa-chip-capable" @click="togglePWADetail" :title="pwaStatusDetail">📱 可装</span>
        <button class="header-btn" :title="showStatusDetail || showPWADetail ? '关闭' : '设置'" @click="toggleSettings">⚙️</button>
      </div>
    </div>

    <!-- 展开式设置面板 -->
    <div v-if="showStatusDetail || showPWADetail" class="header-panel">
      <div v-if="showStatusDetail" class="status-detail">
        <div><strong>后端检查</strong></div>
        <div>最近：{{ lastCheckedText }}</div>
        <div v-if="lastError">错误：{{ lastError }}</div>
      </div>
      <div v-if="showPWADetail && (pwaInfo.installed || pwaInfo.isPWACapable)" class="pwa-detail">
        <div><strong>PWA 信息</strong></div>
        <div style="white-space: pre-wrap; font-size: 0.85em">{{ pwaDetailLines }}</div>
      </div>
    </div>
  </div>
</template>

<script>
import { getApiUrl } from '../utils/api.js'
import { detectPWA, getPWAStatusDetail } from '../utils/pwa.js'

export default {
  name: 'Header',
  emits: ['toggle-menu'],
  data() {
    return {
      backendStatus: 'checking',
      healthTimer: null,
      showStatusDetail: false,
      showPWADetail: false,
      lastCheckedAt: null,
      lastError: '',
      pwaInfo: {
        installed: false,
        mode: null,
        displayMode: null,
        standalone: false,
        hasServiceWorker: false,
        isPWACapable: false
      }
    }
  },
  computed: {
    statusText() {
      if (this.backendStatus === 'ok') return '✓ 连接'
      if (this.backendStatus === 'error') return '✗ 离线'
      return '⋯ 检测中'
    },
    statusClass() {
      return `status-${this.backendStatus}`
    },
    lastCheckedText() {
      if (!this.lastCheckedAt) return '未检查'
      const date = new Date(this.lastCheckedAt)
      const now = Date.now()
      const diff = now - this.lastCheckedAt
      if (diff < 60000) return '刚刚'
      if (diff < 3600000) return Math.floor(diff / 60000) + ' 分钟前'
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    },
    pwaStatusDetail() {
      return getPWAStatusDetail(this.pwaInfo).replace(/\n/g, ' • ')
    },
    pwaDetailLines() {
      return getPWAStatusDetail(this.pwaInfo)
    }
  },
  mounted() {
    this.checkBackendHealth()
    this.healthTimer = setInterval(this.checkBackendHealth, 30000)
    this.pwaInfo = detectPWA()

    if (typeof window !== 'undefined') {
      window.addEventListener('appinstalled', () => {
        this.pwaInfo.installed = true
      })
    }
  },
  beforeUnmount() {
    if (this.healthTimer) {
      clearInterval(this.healthTimer)
      this.healthTimer = null
    }
  },
  methods: {
    toggleStatusDetail() {
      this.showStatusDetail = !this.showStatusDetail
      this.showPWADetail = false
    },
    togglePWADetail() {
      this.showPWADetail = !this.showPWADetail
      this.showStatusDetail = false
    },
    toggleSettings() {
      this.showStatusDetail = !this.showStatusDetail
    },
    async checkBackendHealth() {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 3500)

      try {
        const response = await fetch(getApiUrl('/health'), {
          method: 'GET',
          cache: 'no-store',
          signal: controller.signal
        })
        this.backendStatus = response.ok ? 'ok' : 'error'
        this.lastError = response.ok ? '' : `HTTP ${response.status}`
      } catch (error) {
        this.backendStatus = 'error'
        this.lastError = error?.name === 'AbortError' ? '超时' : (error?.message || '网络异常')
      } finally {
        this.lastCheckedAt = Date.now()
        clearTimeout(timeout)
      }
    }
  }
}
</script>

<style scoped>
.header {
  background: var(--app-card, #ffffff);
  border-bottom: 1px solid var(--app-border, #d1d1d6);
  padding: 0 20px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  z-index: 1500;
  gap: 16px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.hamburger-btn {
  display: none;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  background: var(--app-bg, #f2f2f7);
  border: 1px solid var(--app-border, #d1d1d6);
  border-radius: 8px;
  font-size: 1.1em;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--app-text, #1c1c1e);
  flex-shrink: 0;
}

.hamburger-btn:hover {
  background: var(--app-primary, #007aff);
  border-color: var(--app-primary, #007aff);
  color: white;
  transform: translateY(-1px);
}

.hamburger-btn:active {
  transform: translateY(0);
}

.header-logo {
  font-size: 0.95em;
  font-weight: 700;
  color: var(--app-text, #1c1c1e);
  white-space: nowrap;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.chip {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 16px;
  background: var(--app-bg, #f2f2f7);
  border: 1px solid var(--app-border, #d1d1d6);
  font-size: 0.75em;
  font-weight: 600;
  color: var(--app-text-muted, #8e8e93);
  cursor: pointer;
  transition: all 0.2s ease;
}

.chip:hover {
  background: var(--app-card-elevated, #fbfbfd);
  border-color: var(--app-primary, #007aff);
  color: var(--app-primary, #007aff);
}

.status-chip {
  cursor: pointer;
}

.status-chip.status-ok {
  background: rgba(16, 185, 129, 0.12);
  border-color: rgba(16, 185, 129, 0.3);
  color: #10b981;
}

.status-chip.status-ok:hover {
  background: rgba(16, 185, 129, 0.2);
  border-color: rgba(16, 185, 129, 0.5);
}

.status-chip.status-error {
  background: rgba(239, 68, 68, 0.12);
  border-color: rgba(239, 68, 68, 0.3);
  color: #ef4444;
}

.status-chip.status-error:hover {
  background: rgba(239, 68, 68, 0.2);
  border-color: rgba(239, 68, 68, 0.5);
}

.status-chip.status-checking {
  background: rgba(245, 158, 11, 0.12);
  border-color: rgba(245, 158, 11, 0.3);
  color: #f59e0b;
}

.status-chip.status-checking:hover {
  background: rgba(245, 158, 11, 0.2);
  border-color: rgba(245, 158, 11, 0.5);
}

.pwa-chip {
  background: rgba(34, 197, 94, 0.12);
  border-color: rgba(34, 197, 94, 0.3);
  color: #22c55e;
}

.pwa-chip:hover {
  background: rgba(34, 197, 94, 0.2);
  border-color: rgba(34, 197, 94, 0.5);
}

.pwa-chip-capable {
  background: rgba(59, 130, 246, 0.12);
  border-color: rgba(59, 130, 246, 0.3);
  color: #3b82f6;
}

.pwa-chip-capable:hover {
  background: rgba(59, 130, 246, 0.2);
  border-color: rgba(59, 130, 246, 0.5);
}

.header-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  background: var(--app-bg, #f2f2f7);
  border: 1px solid var(--app-border, #d1d1d6);
  border-radius: 8px;
  font-size: 1em;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--app-text-muted, #8e8e93);
}

.header-btn:hover {
  background: var(--app-primary, #007aff);
  border-color: var(--app-primary, #007aff);
  color: white;
  transform: translateY(-1px);
}

.header-btn:active {
  transform: translateY(0);
}

/* 展开式面板 */
.header-panel {
  background: var(--app-card, #ffffff);
  border-bottom: 1px solid var(--app-border, #d1d1d6);
  padding: 12px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  animation: slideDown 0.2s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.status-detail,
.pwa-detail {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--app-bg, #f2f2f7);
  border: 1px solid var(--app-border, #d1d1d6);
  font-size: 0.8em;
  color: var(--app-text-secondary, #3a3a3c);
}

.status-detail strong,
.pwa-detail strong {
  color: var(--app-text, #1c1c1e);
  margin-bottom: 2px;
}

/* 响应式 */
@media (max-width: 900px) {
  .hamburger-btn {
    display: flex;
  }
}

@media (max-width: 768px) {
  .header {
    padding: 0 12px;
    height: 52px;
  }

  .hamburger-btn {
    width: 32px;
    height: 32px;
    font-size: 1em;
  }

  .header-logo {
    font-size: 0.9em;
  }

  .chip {
    font-size: 0.7em;
    padding: 3px 8px;
  }

  .header-btn {
    width: 28px;
    height: 28px;
    font-size: 0.9em;
  }
}
</style>
