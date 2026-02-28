<template>
  <div class="terminal-page" :style="pageStyleVars">
    <section class="terminal-hero">
      <div>
        <h1>本机终端</h1>
        <p>通过浏览器直接与本机 Shell 交互（本地后端执行）</p>
      </div>
      <div class="session-status" :class="{ online: isConnected }">
        {{ isConnected ? '已连接' : '未连接' }}
      </div>
    </section>

    <section class="terminal-controls">
      <label>
        工作目录
        <input v-model.trim="cwdInput" type="text" placeholder="/Users/mac/vue-learning-app" :disabled="isConnected || loading" />
      </label>
      <button class="btn primary" @click="openSession" :disabled="isConnected || loading">
        {{ loading ? '连接中...' : '连接终端' }}
      </button>
      <button class="btn danger" @click="closeSession" :disabled="!isConnected">
        断开
      </button>
      <button class="btn" @click="sendCtrlC" :disabled="!isConnected">
        Ctrl + C
      </button>
      <button class="btn" @click="clearOutput">
        清屏
      </button>
    </section>

    <section class="terminal-screen-wrap">
      <div class="terminal-meta">
        <span>Shell: {{ shellName || '-' }}</span>
        <span>PID: {{ pid || '-' }}</span>
        <span>CWD: {{ sessionCwd || '-' }}</span>
      </div>
      <pre ref="screenRef" class="terminal-screen">{{ cleanOutput }}</pre>
    </section>

    <section class="terminal-input-row">
      <textarea
        v-model="commandInput"
        class="command-input"
        rows="3"
        placeholder="输入命令，按 Enter 发送（Shift+Enter 换行）"
        :disabled="!isConnected"
        @keydown="onInputKeydown"
      ></textarea>
      <button class="btn primary send-btn" @click="sendCommand" :disabled="!isConnected || !commandInput.trim()">
        发送
      </button>
    </section>

    <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
  </div>
</template>

<script>
import { api } from '../utils/api'

const POLL_INTERVAL_MS = 350
const MAX_OUTPUT_LENGTH = 180000

export default {
  name: 'TerminalConsole',
  data() {
    return {
      loading: false,
      isConnected: false,
      sessionId: '',
      shellName: '',
      pid: 0,
      sessionCwd: '',
      cwdInput: '/Users/mac/vue-learning-app',
      cursor: 0,
      pollTimer: null,
      commandInput: '',
      output: '',
      errorMessage: '',
      pollFailures: 0,
      keyboardInsetBottom: 0,
      isIOS: false
    }
  },
  computed: {
    cleanOutput() {
      return this.output.replace(/\u001b\[[0-9;?]*[A-Za-z]/g, '')
    },
    pageStyleVars() {
      return {
        '--terminal-keyboard-inset': `${Math.max(0, this.keyboardInsetBottom)}px`
      }
    }
  },
  mounted() {
    this.isIOS = /iPad|iPhone|iPod/.test(window.navigator.userAgent) ||
      (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1)
    this.bindViewportListeners()
  },
  beforeUnmount() {
    this.stopPolling()
    this.unbindViewportListeners()
    if (this.isConnected && this.sessionId) {
      api.terminal.closeSession(this.sessionId).catch(() => {})
    }
  },
  methods: {
    bindViewportListeners() {
      if (!window.visualViewport) return
      window.visualViewport.addEventListener('resize', this.updateKeyboardInset)
      window.visualViewport.addEventListener('scroll', this.updateKeyboardInset)
      window.addEventListener('orientationchange', this.updateKeyboardInset)
      this.updateKeyboardInset()
    },
    unbindViewportListeners() {
      if (!window.visualViewport) return
      window.visualViewport.removeEventListener('resize', this.updateKeyboardInset)
      window.visualViewport.removeEventListener('scroll', this.updateKeyboardInset)
      window.removeEventListener('orientationchange', this.updateKeyboardInset)
    },
    updateKeyboardInset() {
      if (!this.isIOS || !window.visualViewport) {
        this.keyboardInsetBottom = 0
        return
      }
      const vv = window.visualViewport
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
      this.keyboardInsetBottom = inset
    },
    stopPolling() {
      if (this.pollTimer) {
        window.clearInterval(this.pollTimer)
        this.pollTimer = null
      }
    },
    startPolling() {
      this.stopPolling()
      this.pollTimer = window.setInterval(this.pollOutput, POLL_INTERVAL_MS)
    },
    appendOutput(text) {
      if (!text) return
      this.output += text
      if (this.output.length > MAX_OUTPUT_LENGTH) {
        this.output = this.output.slice(this.output.length - MAX_OUTPUT_LENGTH)
      }

      this.$nextTick(() => {
        const el = this.$refs.screenRef
        if (!el) return
        const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 48
        if (nearBottom || this.output.length < 1200) {
          el.scrollTop = el.scrollHeight
        }
      })
    },
    async openSession() {
      this.loading = true
      this.errorMessage = ''
      this.output = ''
      this.cursor = 0

      try {
        const payload = await api.terminal.createSession({ cwd: this.cwdInput || undefined })
        this.sessionId = payload.sessionId
        this.shellName = payload.shell || ''
        this.pid = Number(payload.pid || 0)
        this.sessionCwd = payload.cwd || ''
        this.cursor = Number(payload.cursor || 0)
        this.isConnected = true
        this.startPolling()
        this.appendOutput(`[system] 已连接，输入命令后发送（当前为无提示符 shell 模式）。\n`)
      } catch (error) {
        this.errorMessage = `连接失败：${error?.message || '未知错误'}`
      } finally {
        this.loading = false
      }
    },
    async closeSession() {
      if (!this.sessionId) return
      try {
        await api.terminal.closeSession(this.sessionId)
      } catch {
        // ignore close error
      } finally {
        this.isConnected = false
        this.sessionId = ''
        this.stopPolling()
        this.appendOutput(`\n[system] 会话已断开。\n`)
      }
    },
    async pollOutput() {
      if (!this.sessionId) return
      try {
        const payload = await api.terminal.getOutput(this.sessionId, this.cursor)
        const chunks = Array.isArray(payload?.chunks) ? payload.chunks : []
        if (chunks.length > 0) {
          this.cursor = Number(payload.cursor || this.cursor)
          chunks.forEach((chunk) => this.appendOutput(chunk?.text || ''))
        }
        if (payload?.running === false) {
          this.isConnected = false
          this.stopPolling()
        }
        this.pollFailures = 0
      } catch (error) {
        this.pollFailures += 1
        this.errorMessage = `终端读取异常（${this.pollFailures}）：${error?.message || '未知错误'}`

        // 网络/代理偶发抖动时不立刻断开，连续失败后再停止轮询。
        if (this.pollFailures >= 5) {
          this.stopPolling()
          this.isConnected = false
        }
      }
    },
    async sendInput(input) {
      if (!this.sessionId) return
      this.errorMessage = ''
      try {
        await api.terminal.sendInput(this.sessionId, input)
      } catch (error) {
        this.errorMessage = `发送失败：${error?.message || '未知错误'}`
      }
    },
    async sendCommand() {
      const text = this.commandInput.trim()
      if (!text) return
      this.commandInput = ''
      this.appendOutput(`\n$ ${text}\n`)
      await this.sendInput(`${text}\n`)
      await this.pollOutput()
      await this.pullOutputBurst()
    },
    async sendCtrlC() {
      await this.sendInput('\u0003')
      await this.pollOutput()
    },
    clearOutput() {
      this.output = ''
    },
    onInputKeydown(event) {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        this.sendCommand()
      }
    },
    async pullOutputBurst() {
      // 发送后短时间连续拉取，避免只看到输入回显却没及时看到输出。
      const delays = [80, 180, 320, 500]
      for (const delay of delays) {
        if (!this.sessionId || !this.isConnected) return
        await new Promise((resolve) => window.setTimeout(resolve, delay))
        await this.pollOutput()
      }
    }
  }
}
</script>

<style scoped>
.terminal-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
  color: var(--app-text);
  min-height: calc(100dvh - var(--safe-area-top, 0px) - var(--safe-area-bottom, 0px) - 6px);
  padding-bottom: calc(var(--safe-area-bottom, 0px) + var(--terminal-keyboard-inset, 0px));
}

.terminal-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-radius: 16px;
  border: 1px solid var(--app-border);
  background:
    radial-gradient(circle at 85% 20%, color-mix(in srgb, var(--app-primary) 28%, transparent), transparent 42%),
    var(--app-card);
  padding: 16px 18px;
}

.terminal-hero h1 {
  margin: 0;
  font-size: 1.3rem;
}

.terminal-hero p {
  margin-top: 6px;
  color: var(--app-text-secondary);
}

.session-status {
  padding: 7px 12px;
  border-radius: 999px;
  font-size: 0.85rem;
  border: 1px solid var(--app-border);
  background: color-mix(in srgb, var(--app-bg) 84%, #9ca3af 16%);
}

.session-status.online {
  color: #0f766e;
  border-color: rgba(13, 148, 136, 0.45);
  background: rgba(16, 185, 129, 0.16);
}

.terminal-controls {
  display: grid;
  grid-template-columns: minmax(280px, 1fr) auto auto auto auto;
  gap: 8px;
}

.terminal-controls label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.86rem;
  color: var(--app-text-secondary);
}

.terminal-controls input {
  height: 38px;
  border-radius: 10px;
  border: 1px solid var(--app-border);
  padding: 0 12px;
  background: var(--app-card);
  color: var(--app-text);
}

.btn {
  height: 38px;
  border-radius: 10px;
  border: 1px solid var(--app-border);
  padding: 0 14px;
  background: var(--app-card);
  color: var(--app-text);
  cursor: pointer;
}

.btn.primary {
  background: color-mix(in srgb, var(--app-primary) 85%, white 15%);
  color: #fff;
  border-color: color-mix(in srgb, var(--app-primary) 70%, black 30%);
}

.btn.danger {
  background: #ef4444;
  border-color: #dc2626;
  color: #fff;
}

.btn:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.terminal-screen-wrap {
  border: 1px solid #1f2937;
  border-radius: 14px;
  background: linear-gradient(180deg, #0b1220 0%, #020617 100%);
  overflow: hidden;
}

.terminal-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 10px 12px;
  font-size: 0.78rem;
  color: #94a3b8;
  border-bottom: 1px solid rgba(148, 163, 184, 0.2);
}

.terminal-page pre.terminal-screen {
  margin: 0;
  padding: 14px;
  min-height: 300px;
  max-height: min(62vh, 56dvh);
  overflow: auto;
  font-size: 0.86rem;
  line-height: 1.5;
  white-space: pre-wrap;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  background: #020617 !important;
  color: #e2e8f0 !important;
  border: none !important;
  border-radius: 0 !important;
}

.terminal-input-row {
  display: grid;
  grid-template-columns: 1fr 120px;
  gap: 10px;
  position: sticky;
  bottom: 0;
  z-index: 8;
  padding: 10px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--app-bg) 88%, #ffffff 12%);
  border: 1px solid var(--app-border);
  backdrop-filter: blur(6px);
}

.command-input {
  border-radius: 12px;
  border: 1px solid var(--app-border);
  background: var(--app-card);
  color: var(--app-text);
  padding: 10px 12px;
  resize: vertical;
  font-size: 16px;
  line-height: 1.45;
}

.send-btn {
  align-self: stretch;
  height: auto;
}

.error-message {
  color: #dc2626;
}

@media (max-width: 900px) {
  .terminal-controls {
    grid-template-columns: 1fr 1fr;
  }

  .terminal-input-row {
    grid-template-columns: 1fr;
  }

  .send-btn {
    height: 38px;
  }

  .terminal-page {
    gap: 10px;
  }

  .terminal-controls {
    grid-template-columns: 1fr;
  }

  .terminal-hero {
    align-items: flex-start;
    flex-direction: column;
  }

  .terminal-page pre.terminal-screen {
    min-height: 240px;
    max-height: 46dvh;
    font-size: 0.82rem;
  }

  .command-input {
    min-height: 92px;
  }
}
</style>
