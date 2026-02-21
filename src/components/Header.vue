<template>
  <div class="header">
    <h1>✨ Vue 3 学习参考中心</h1>
    <p>全功能学习平台 - Spring、Excel、最佳实践</p>
    <div class="build-info">
      <span class="chip">v{{ appVersion }}</span>
      <span class="chip">构建时间 {{ buildTimeText }}</span>
      <button class="chip status-chip" :class="statusClass" @click="toggleStatusDetail">{{ statusText }}</button>
    </div>
    <div v-if="showStatusDetail" class="status-detail">
      <div>最近检查：{{ lastCheckedText }}</div>
      <div>接口：`/api/health`</div>
      <div v-if="lastError">错误：{{ lastError }}</div>
    </div>
  </div>
</template>

<script>
import { getApiUrl } from '../utils/api.js'

export default {
  name: 'Header',
  data() {
    return {
      backendStatus: 'checking',
      healthTimer: null,
      showStatusDetail: false,
      lastCheckedAt: null,
      lastError: ''
    }
  },
  computed: {
    appVersion() {
      return typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev'
    },
    buildTimeText() {
      if (typeof __BUILD_TIME__ !== 'string') return '未知'
      const date = new Date(__BUILD_TIME__)
      if (Number.isNaN(date.getTime())) return __BUILD_TIME__
      return date.toLocaleString('zh-CN', { hour12: false })
    },
    statusText() {
      if (this.backendStatus === 'ok') return '后端正常'
      if (this.backendStatus === 'error') return '后端异常'
      return '后端检测中'
    },
    statusClass() {
      return `status-${this.backendStatus}`
    },
    lastCheckedText() {
      if (!this.lastCheckedAt) return '尚未完成'
      return new Date(this.lastCheckedAt).toLocaleString('zh-CN', { hour12: false })
    }
  },
  mounted() {
    this.checkBackendHealth()
    this.healthTimer = setInterval(this.checkBackendHealth, 30000)
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
        this.lastError = error?.name === 'AbortError' ? '请求超时' : (error?.message || '网络异常')
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
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 60px 40px;
  border-radius: 15px;
  margin-bottom: 40px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  text-align: center;
}

.header h1 {
  font-size: 3em;
  margin-bottom: 15px;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
}

.header p {
  font-size: 1.3em;
  opacity: 0.95;
}

.build-info {
  margin-top: 16px;
  display: flex;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
}

.chip {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.35);
  font-size: 0.8em;
  font-weight: 700;
}

.status-chip.status-ok {
  background: rgba(16, 185, 129, 0.25);
  border-color: rgba(16, 185, 129, 0.45);
}

.status-chip.status-error {
  background: rgba(239, 68, 68, 0.25);
  border-color: rgba(239, 68, 68, 0.45);
}

.status-chip.status-checking {
  background: rgba(245, 158, 11, 0.25);
  border-color: rgba(245, 158, 11, 0.45);
}

.status-chip {
  cursor: pointer;
}

.status-detail {
  margin-top: 10px;
  display: inline-flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.28);
  font-size: 0.78em;
  text-align: left;
}

@media (max-width: 768px) {
  .header h1 {
    font-size: 2em;
  }

  .header p {
    font-size: 1em;
  }

  .header {
    padding: 40px 20px;
  }

  .chip {
    font-size: 0.72em;
  }
}
</style>
