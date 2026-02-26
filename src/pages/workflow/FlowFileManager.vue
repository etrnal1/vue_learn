<template>
  <div class="flow-file-manager">
    <header class="manager-header">
      <div>
        <h2>流程文件管理</h2>
        <p class="subtitle">管理流程相关的文档和附件</p>
      </div>
      <button class="btn btn-primary" @click="uploadFile">上传文件</button>
    </header>

    <div v-if="files.length === 0" class="empty-state">
      <p>暂无文件</p>
    </div>

    <div v-else class="files-grid">
      <div v-for="file in files" :key="file.id" class="file-card">
        <div class="file-icon">{{ getFileIcon(file.name) }}</div>
        <h4>{{ file.name }}</h4>
        <p class="file-size">{{ formatSize(file.size) }}</p>
        <p class="file-date">{{ formatDate(file.createdAt) }}</p>
        <div class="file-actions">
          <button class="btn btn-small">下载</button>
          <button class="btn btn-small btn-danger">删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'FlowFileManager',
  data() {
    return {
      files: [
        { id: 1, name: '流程文档.pdf', size: 102400, createdAt: Date.now() },
        { id: 2, name: '配置文件.json', size: 2048, createdAt: Date.now() - 86400000 }
      ]
    }
  },
  methods: {
    uploadFile() {
      alert('上传文件功能')
    },
    getFileIcon(filename) {
      if (filename.endsWith('.pdf')) return '📄'
      if (filename.endsWith('.json')) return '⚙️'
      if (filename.endsWith('.csv')) return '📊'
      return '📎'
    },
    formatSize(bytes) {
      if (bytes === 0) return '0 B'
      const k = 1024
      const sizes = ['B', 'KB', 'MB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
    },
    formatDate(value) {
      const date = new Date(value)
      return date.toLocaleString('zh-CN')
    }
  }
}
</script>

<style scoped>
.flow-file-manager {
  padding: 16px;
}

.manager-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 24px;
}

.manager-header h2 {
  margin: 0 0 4px;
}

.subtitle {
  margin: 0;
  color: var(--app-text-muted);
  font-size: 0.95em;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--app-text-muted);
}

.files-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.file-card {
  padding: 16px;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  background: var(--app-card);
  text-align: center;
}

.file-icon {
  font-size: 2.5em;
  margin-bottom: 8px;
}

.file-card h4 {
  margin: 8px 0;
  word-break: break-all;
}

.file-size,
.file-date {
  margin: 4px 0;
  color: var(--app-text-muted);
  font-size: 0.85em;
}

.file-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.btn {
  flex: 1;
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

.btn-danger {
  background: #ef4444;
  color: white;
}

@media (max-width: 768px) {
  .flow-file-manager {
    padding: 12px;
  }

  .files-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  }
}
</style>
