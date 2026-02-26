<template>
  <div class="logs-viewer">
    <!-- Header -->
    <section class="logs-header">
      <div>
        <h1>🔍 实时日志查看器</h1>
        <p>实时监控后端运行日志和错误信息</p>
      </div>
      <div class="header-actions">
        <button @click="toggleAutoScroll" class="action-btn" :class="{ active: autoScroll }">
          {{ autoScroll ? '⏸ 停止自动滚动' : '▶ 自动滚动' }}
        </button>
        <button @click="toggleLiveMode" class="action-btn" :class="{ active: liveMode }">
          {{ liveMode ? '📡 实时模式 ON' : '📡 实时模式 OFF' }}
        </button>
        <button @click="clearLogs" class="action-btn danger">🗑 清空日志</button>
      </div>
    </section>

    <!-- Filter Bar -->
    <section class="filter-bar">
      <input
        v-model="filterText"
        type="text"
        placeholder="搜索日志内容..."
        class="filter-input"
      />
      <div class="filter-chips">
        <button
          v-for="level in logLevels"
          :key="level"
          @click="toggleFilter(level)"
          class="filter-chip"
          :class="{ active: activeFilters.has(level) }"
        >
          {{ getLogIcon(level) }} {{ level }}
        </button>
      </div>
    </section>

    <!-- Stats -->
    <section class="stats-bar">
      <span class="stat">📊 总日志: {{ totalLogs }}</span>
      <span class="stat">📈 显示: {{ filteredLogs.length }}</span>
      <span class="stat">🔴 错误: {{ errorCount }}</span>
      <span class="stat">⚠️ 警告: {{ warningCount }}</span>
      <span class="stat">ℹ️ 信息: {{ infoCount }}</span>
    </section>

    <!-- Logs Container -->
    <section class="logs-container">
      <div v-if="filteredLogs.length === 0" class="empty-state">
        <p>暂无日志</p>
        <p v-if="filterText" class="hint">尝试修改搜索条件</p>
      </div>

      <div v-else class="logs-list">
        <div
          v-for="(log, idx) in filteredLogs"
          :key="`${log.timestamp}-${idx}`"
          class="log-entry"
          :class="[log.level, { highlight: isHighlighted(log) }]"
        >
          <div class="log-header">
            <span class="log-timestamp">{{ formatTime(log.timestamp) }}</span>
            <span class="log-level" :class="log.level">{{ log.level.toUpperCase() }}</span>
            <span class="log-category" v-if="log.category">{{ log.category }}</span>
          </div>
          <div class="log-message">
            {{ log.message }}
          </div>
          <div v-if="log.error" class="log-error">
            <details>
              <summary>📋 错误详情</summary>
              <pre>{{ log.error }}</pre>
            </details>
          </div>
        </div>
      </div>

      <div v-if="autoScroll && filteredLogs.length > 0" ref="scrollTarget" class="scroll-target" />
    </section>

    <!-- Status Bar -->
    <section class="status-bar">
      <span v-if="liveMode" class="status-indicator">
        🟢 实时连接中
      </span>
      <span v-else class="status-indicator">
        ⚪ 实时模式已关闭
      </span>
      <span class="status-text">最后更新: {{ lastUpdateTime }}</span>
    </section>
  </div>
</template>

<script>
export default {
  name: 'RuntimeLogsViewer',
  data() {
    return {
      logs: [],
      filteredLogs: [],
      filterText: '',
      liveMode: true,
      autoScroll: true,
      logLevels: ['error', 'warn', 'info', 'debug'],
      activeFilters: new Set(['error', 'warn', 'info']),
      eventSource: null,
      lastUpdateTime: '未更新',
      pollTimer: null,
      totalLogs: 0,
      errorCount: 0,
      warningCount: 0,
      infoCount: 0
    };
  },

  computed: {
    highlightTerms() {
      return this.filterText.toLowerCase().split(/\s+/).filter(Boolean);
    }
  },

  methods: {
    async fetchLogs() {
      try {
        const response = await fetch('/api/runtime-logs?limit=500');
        const result = await response.json();

        if (response.ok) {
          // 反向排序，最新的在上面
          this.logs = (result.logs || []).reverse().map((log, idx) => {
            // 解析日志格式: "[category] message" 或 "message"
            const match = String(log.message || '').match(/^\[([^\]]+)\]\s+(.*)$/);
            return {
              ...log,
              category: match ? match[1] : '',
              message: match ? match[2] : log.message,
              level: log.level || 'info',
              timestamp: log.timestamp || Date.now(),
              error: log.error ? JSON.stringify(log.error, null, 2) : ''
            };
          });

          this.updateStats();
          this.applyFilters();
          this.lastUpdateTime = new Date().toLocaleTimeString('zh-CN');

          // 自动滚动
          if (this.autoScroll) {
            this.$nextTick(() => {
              this.scrollToBottom();
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch logs:', error);
      }
    },

    updateStats() {
      this.totalLogs = this.logs.length;
      this.errorCount = this.logs.filter(l => l.level === 'error').length;
      this.warningCount = this.logs.filter(l => l.level === 'warn').length;
      this.infoCount = this.logs.filter(l => l.level === 'info').length;
    },

    applyFilters() {
      this.filteredLogs = this.logs.filter(log => {
        // 按级别过滤
        if (!this.activeFilters.has(log.level)) {
          return false;
        }

        // 按文本过滤
        if (this.filterText) {
          const text = `${log.category} ${log.message}`.toLowerCase();
          return this.highlightTerms.every(term => text.includes(term));
        }

        return true;
      });
    },

    toggleFilter(level) {
      if (this.activeFilters.has(level)) {
        this.activeFilters.delete(level);
      } else {
        this.activeFilters.add(level);
      }
      this.applyFilters();
    },

    toggleAutoScroll() {
      this.autoScroll = !this.autoScroll;
    },

    toggleLiveMode() {
      this.liveMode = !this.liveMode;
      if (this.liveMode) {
        this.connectLiveStream();
      } else {
        this.disconnectLiveStream();
      }
    },

    async clearLogs() {
      if (!confirm('确定要清空所有日志吗？')) {
        return;
      }

      try {
        const response = await fetch('/api/runtime-logs', {
          method: 'DELETE'
        });

        if (response.ok) {
          this.logs = [];
          this.filteredLogs = [];
          this.updateStats();
        }
      } catch (error) {
        console.error('Failed to clear logs:', error);
      }
    },

    connectLiveStream() {
      // 关闭旧的连接
      if (this.eventSource) {
        this.eventSource.close();
      }

      try {
        this.eventSource = new EventSource('/api/runtime-logs/stream');

        // 接收初始快照
        this.eventSource.addEventListener('snapshot', (event) => {
          try {
            const snapshot = JSON.parse(event.data);
            this.logs = (snapshot || []).reverse();
            this.updateStats();
            this.applyFilters();
          } catch (error) {
            console.error('Failed to parse snapshot:', error);
          }
        });

        // 接收新日志
        this.eventSource.addEventListener('log', (event) => {
          try {
            const log = JSON.parse(event.data);
            const match = String(log.message || '').match(/^\[([^\]]+)\]\s+(.*)$/);
            const processedLog = {
              ...log,
              category: match ? match[1] : '',
              message: match ? match[2] : log.message,
              level: log.level || 'info',
              timestamp: log.timestamp || Date.now(),
              error: log.error ? JSON.stringify(log.error, null, 2) : ''
            };

            // 在最前面插入新日志
            this.logs.unshift(processedLog);

            // 保持最多 1000 条日志
            if (this.logs.length > 1000) {
              this.logs.pop();
            }

            this.updateStats();
            this.applyFilters();
            this.lastUpdateTime = new Date().toLocaleTimeString('zh-CN');

            if (this.autoScroll) {
              this.$nextTick(() => {
                this.scrollToBottom();
              });
            }
          } catch (error) {
            console.error('Failed to parse log:', error);
          }
        });

        this.eventSource.onerror = (error) => {
          console.error('EventSource error:', error);
          this.eventSource.close();
          this.liveMode = false;
        };
      } catch (error) {
        console.error('Failed to connect live stream:', error);
        this.liveMode = false;
      }
    },

    disconnectLiveStream() {
      if (this.eventSource) {
        this.eventSource.close();
        this.eventSource = null;
      }
    },

    scrollToBottom() {
      if (this.$refs.scrollTarget) {
        this.$refs.scrollTarget.scrollIntoView({ behavior: 'smooth' });
      }
    },

    formatTime(timestamp) {
      return new Date(timestamp).toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        fractionalSecondDigits: 3
      });
    },

    getLogIcon(level) {
      const icons = {
        error: '❌',
        warn: '⚠️',
        info: 'ℹ️',
        debug: '🐛'
      };
      return icons[level] || '•';
    },

    isHighlighted(log) {
      if (!this.filterText) return false;
      const text = `${log.category} ${log.message}`.toLowerCase();
      return this.highlightTerms.some(term => text.includes(term));
    }
  },

  mounted() {
    // 初始加载日志
    this.fetchLogs();

    // 如果启用实时模式，连接流
    if (this.liveMode) {
      this.connectLiveStream();
    } else {
      // 否则定期轮询
      this.pollTimer = setInterval(() => {
        this.fetchLogs();
      }, 2000);
    }
  },

  beforeUnmount() {
    if (this.eventSource) {
      this.eventSource.close();
    }
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
    }
  }
};
</script>

<style scoped>
.logs-viewer {
  display: grid;
  grid-template-rows: auto auto auto 1fr auto;
  gap: 16px;
  padding: 20px;
  max-width: 1600px;
  margin: 0 auto;
  height: 100vh;
  overflow: hidden;
  background: var(--app-bg);
}

/* Header */
.logs-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  background: var(--app-card);
  border: 1px solid var(--app-border);
  border-radius: 14px;
  box-shadow: var(--app-soft-shadow);
}

.logs-header h1 {
  margin: 0 0 8px;
  font-size: 1.8em;
  color: var(--app-text);
}

.logs-header p {
  margin: 0;
  font-size: 0.9em;
  color: var(--app-text-muted);
}

.header-actions {
  display: flex;
  gap: 12px;
}

/* Filter Bar */
.filter-bar {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: var(--app-card);
  border: 1px solid var(--app-border);
  border-radius: 12px;
}

.filter-input {
  width: 100%;
  padding: 10px 14px;
  background: var(--app-group-bg);
  color: var(--app-text);
  border: 1px solid var(--app-border);
  border-radius: 8px;
  font-size: 0.95em;
}

.filter-input::placeholder {
  color: var(--app-text-muted);
}

.filter-chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.filter-chip {
  padding: 6px 12px;
  background: var(--app-card-elevated);
  color: var(--app-text-secondary);
  border: 1px solid var(--app-border);
  border-radius: 20px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.85em;
  transition: all 0.2s ease;
}

.filter-chip:hover {
  border-color: var(--app-primary);
  color: var(--app-primary);
}

.filter-chip.active {
  background: var(--app-primary);
  color: var(--app-on-primary);
  border-color: var(--app-primary);
}

/* Stats Bar */
.stats-bar {
  display: flex;
  gap: 24px;
  padding: 12px 20px;
  background: var(--app-group-bg);
  border: 1px solid var(--app-border);
  border-radius: 10px;
  font-size: 0.9em;
  color: var(--app-text-secondary);
  flex-wrap: wrap;
}

.stat {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* Logs Container */
.logs-container {
  display: flex;
  flex-direction: column;
  gap: 0;
  background: var(--app-card);
  border: 1px solid var(--app-border);
  border-radius: 12px;
  overflow: hidden;
  flex: 1;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
  color: var(--app-text-muted);
}

.empty-state p {
  margin: 0;
  font-size: 1em;
}

.empty-state .hint {
  font-size: 0.85em;
  margin-top: 8px;
}

.logs-list {
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

/* Log Entry */
.log-entry {
  padding: 12px;
  background: var(--app-card-elevated);
  border: 1px solid var(--app-border);
  border-left: 4px solid var(--app-border);
  border-radius: 8px;
  font-family: 'Courier New', monospace;
  font-size: 0.85em;
  line-height: 1.4;
  transition: all 0.2s ease;
}

.log-entry:hover {
  box-shadow: 0 2px 8px var(--app-shadow-light);
}

.log-entry.error {
  border-left-color: #ef4444;
  background: rgba(239, 68, 68, 0.05);
}

.log-entry.warn {
  border-left-color: #f59e0b;
  background: rgba(245, 158, 11, 0.05);
}

.log-entry.info {
  border-left-color: #3b82f6;
  background: rgba(59, 130, 246, 0.03);
}

.log-entry.debug {
  border-left-color: #8b5cf6;
  background: rgba(139, 92, 246, 0.03);
}

.log-entry.highlight {
  background: var(--app-group-bg);
  border-color: var(--app-primary);
  box-shadow: 0 0 0 2px rgba(var(--app-primary-rgb), 0.1);
}

.log-header {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.log-timestamp {
  color: var(--app-text-muted);
  font-weight: 600;
  min-width: 120px;
}

.log-level {
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 700;
  font-size: 0.75em;
  text-transform: uppercase;
}

.log-level.error {
  background: #ef4444;
  color: white;
}

.log-level.warn {
  background: #f59e0b;
  color: white;
}

.log-level.info {
  background: #3b82f6;
  color: white;
}

.log-level.debug {
  background: #8b5cf6;
  color: white;
}

.log-category {
  color: var(--app-primary);
  font-weight: 600;
  padding: 2px 8px;
  background: rgba(var(--app-primary-rgb), 0.1);
  border-radius: 4px;
  font-size: 0.75em;
}

.log-message {
  color: var(--app-text);
  word-break: break-all;
  white-space: pre-wrap;
}

.log-error {
  margin-top: 8px;
}

.log-error details {
  background: var(--app-group-bg);
  border: 1px solid var(--app-border);
  border-radius: 6px;
  padding: 8px;
}

.log-error summary {
  cursor: pointer;
  font-weight: 600;
  color: #ef4444;
  padding: 4px;
  user-select: none;
}

.log-error summary:hover {
  opacity: 0.8;
}

.log-error pre {
  margin: 8px 0 0;
  padding: 8px;
  background: rgba(0, 0, 0, 0.5);
  color: #ff6b6b;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 0.8em;
}

.scroll-target {
  height: 0;
}

/* Status Bar */
.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: var(--app-group-bg);
  border: 1px solid var(--app-border);
  border-radius: 10px;
  font-size: 0.85em;
  color: var(--app-text-secondary);
}

.status-indicator {
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
}

.action-btn {
  padding: 10px 16px;
  background: var(--app-primary);
  color: var(--app-on-primary);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9em;
  transition: all 0.2s ease;
}

.action-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px var(--app-shadow-light);
}

.action-btn.active {
  background: #10b981;
}

.action-btn.danger {
  background: #ef4444;
}

.action-btn.danger:hover {
  background: #dc2626;
}

/* Responsive */
@media (max-width: 768px) {
  .logs-viewer {
    height: auto;
    min-height: 100vh;
    grid-template-rows: auto auto auto auto auto;
  }

  .logs-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .header-actions {
    width: 100%;
    flex-wrap: wrap;
  }

  .action-btn {
    flex: 1;
    min-width: 120px;
  }

  .stats-bar {
    flex-direction: column;
    gap: 8px;
  }

  .log-entry {
    font-size: 0.75em;
  }

  .log-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .log-timestamp {
    min-width: auto;
  }
}
</style>
