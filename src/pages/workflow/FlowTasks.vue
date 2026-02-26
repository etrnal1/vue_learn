<template>
  <div class="flow-tasks">
    <header class="tasks-header">
      <div>
        <h2>流程任务</h2>
        <p class="subtitle">查看和管理分配给你的流程任务</p>
      </div>
      <div class="header-actions">
        <select v-model="filterStatus" class="filter-select">
          <option value="">所有状态</option>
          <option value="pending">待处理</option>
          <option value="in_progress">进行中</option>
          <option value="completed">已完成</option>
        </select>
        <button class="btn btn-primary" @click="loadTasks">刷新</button>
      </div>
    </header>

    <div v-if="loading" class="state-message">加载中...</div>
    <div v-else-if="filteredTasks.length === 0" class="state-message">
      暂无{{ filterStatus ? '该状态的' : '' }}任务
    </div>

    <div v-else class="tasks-list">
      <div v-for="task in filteredTasks" :key="task.id" class="task-item">
        <div class="task-status" :class="`status-${task.status}`"></div>
        <div class="task-content">
          <h3>{{ task.title }}</h3>
          <p class="task-flow">📋 {{ task.flowName }}</p>
          <p class="task-desc">{{ task.description }}</p>
          <div class="task-meta">
            <span v-if="task.dueDate" class="meta-tag">📅 {{ formatDate(task.dueDate) }}</span>
            <span v-if="task.priority" class="meta-tag" :class="`priority-${task.priority}`">
              {{ getPriorityLabel(task.priority) }}
            </span>
            <span class="meta-tag">👤 {{ task.assignee || '未分配' }}</span>
          </div>
        </div>
        <div class="task-actions">
          <button class="btn btn-small" @click="handleTask(task)">
            {{ task.status === 'pending' ? '开始' : '查看' }}
          </button>
          <button class="btn btn-small btn-secondary" @click="completeTask(task)">
            {{ task.status === 'completed' ? '已完成' : '完成' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'FlowTasks',
  data() {
    return {
      tasks: [],
      filterStatus: '',
      loading: false
    }
  },
  computed: {
    filteredTasks() {
      if (!this.filterStatus) return this.tasks
      return this.tasks.filter((task) => task.status === this.filterStatus)
    }
  },
  methods: {
    async loadTasks() {
      this.loading = true
      try {
        this.tasks = [
          {
            id: 'task_1',
            title: '审核申请表',
            flowName: '请假申请',
            description: '需要审核新提交的请假申请单',
            status: 'pending',
            priority: 'high',
            dueDate: Date.now() + 86400000,
            assignee: '张三'
          }
        ]
      } catch (error) {
        console.error('加载任务失败:', error)
      } finally {
        this.loading = false
      }
    },
    handleTask(task) {
      alert(`开始处理任务: ${task.title}`)
      task.status = 'in_progress'
    },
    completeTask(task) {
      task.status = 'completed'
      alert(`任务已完成: ${task.title}`)
    },
    formatDate(value) {
      if (!value) return '—'
      const date = new Date(Number(value))
      if (Number.isNaN(date.getTime())) return '—'
      return date.toLocaleString('zh-CN', { month: 'short', day: 'numeric' })
    },
    getPriorityLabel(priority) {
      const labels = { low: '低', medium: '中', high: '高', urgent: '紧急' }
      return labels[priority] || priority
    }
  },
  mounted() {
    this.loadTasks()
  }
}
</script>

<style scoped>
.flow-tasks {
  padding: 16px;
  max-width: 1000px;
  margin: 0 auto;
}

.tasks-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.tasks-header h2 {
  margin: 0 0 4px;
  font-size: 1.8em;
}

.subtitle {
  margin: 0;
  color: var(--app-text-muted);
  font-size: 0.95em;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.filter-select {
  padding: 8px 12px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-card-elevated);
  color: var(--app-text);
}

.state-message {
  text-align: center;
  padding: 60px 20px;
  color: var(--app-text-muted);
}

.tasks-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.task-item {
  display: flex;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: var(--app-card);
  box-shadow: var(--app-soft-shadow);
  align-items: flex-start;
}

.task-status {
  width: 4px;
  height: 100%;
  border-radius: 2px;
  min-height: 60px;
}

.status-pending {
  background: #f59e0b;
}

.status-in_progress {
  background: #3b82f6;
}

.status-completed {
  background: #10b981;
}

.task-content {
  flex: 1;
  min-width: 0;
}

.task-content h3 {
  margin: 0 0 4px;
  font-size: 1.05em;
}

.task-flow {
  margin: 0;
  color: var(--app-text-muted);
  font-size: 0.9em;
}

.task-desc {
  margin: 6px 0;
  color: var(--app-text-muted);
  font-size: 0.9em;
}

.task-meta {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 8px;
}

.meta-tag {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  background: var(--app-card-elevated);
  color: var(--app-text-muted);
  font-size: 0.8em;
  font-weight: 600;
}

.priority-high,
.priority-urgent {
  background: #fee2e2;
  color: #b91c1c;
}

.priority-medium {
  background: #fef3c7;
  color: #92400e;
}

.priority-low {
  background: #dbeafe;
  color: #1e40af;
}

.task-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.btn {
  padding: 6px 10px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: var(--app-primary);
  color: var(--app-on-primary);
  font-weight: 600;
  cursor: pointer;
  font-size: 0.8em;
}

.btn-small {
  padding: 6px 10px;
}

.btn-secondary {
  background: var(--app-card-elevated);
  color: var(--app-text);
  border: 1px solid var(--app-border);
}

@media (max-width: 768px) {
  .flow-tasks {
    padding: 12px;
  }

  .tasks-header {
    flex-direction: column;
  }

  .tasks-header h2 {
    font-size: 1.4em;
  }

  .header-actions {
    width: 100%;
  }

  .filter-select {
    flex: 1;
  }

  .task-item {
    flex-direction: column;
  }

  .task-status {
    width: 100%;
    height: 4px;
    min-height: auto;
  }

  .task-actions {
    width: 100%;
  }

  .btn {
    flex: 1;
  }
}
</style>
