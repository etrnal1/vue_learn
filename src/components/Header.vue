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
  background: linear-gradient(165deg, #0a84ff 0%, #0066cc 100%);
  color: white;
  padding: 42px 32px;
  border-radius: 24px;
  margin-bottom: 20px;
  box-shadow: 0 18px 38px rgba(0, 102, 204, 0.28);
  text-align: left;
}

.header h1 {
  font-size: 2.35em;
  line-height: 1.15;
  margin-bottom: 8px;
  letter-spacing: -0.02em;
}

.header p {
  font-size: 1.06em;
  opacity: 0.9;
}

.build-info {
  margin-top: 14px;
  display: flex;
  justify-content: flex-start;
  gap: 8px;
  flex-wrap: wrap;
}

.chip {
  display: inline-flex;
  align-items: center;
  padding: 6px 11px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.32);
  font-size: 0.8em;
  font-weight: 600;
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
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.28);
  font-size: 0.78em;
  text-align: left;
}

@media (max-width: 768px) {
  .header h1 {
    font-size: 1.7em;
  }

  .header p {
    font-size: 0.93em;
  }

  .header {
    padding: 30px 20px;
    border-radius: 18px;
    margin-bottom: 12px;
  }

  .chip {
    font-size: 0.72em;
  }
}
</style>
