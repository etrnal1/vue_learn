<template>
  <div class="pipeline-manager">
    <div class="header">
      <h1>M9 流水线模块</h1>
      <p class="subtitle">可视化流式任务执行引擎</p>
    </div>

    <div class="tabs">
      <button
        :class="{ active: activeTab === 'pipelines' }"
        @click="activeTab = 'pipelines'"
      >
        流水线列表
      </button>
      <button
        :class="{ active: activeTab === 'modules' }"
        @click="activeTab = 'modules'"
      >
        模块市场
      </button>
      <button
        :class="{ active: activeTab === 'executions' }"
        @click="activeTab = 'executions'"
      >
        执行记录
      </button>
      <button
        :class="{ active: activeTab === 'editor' }"
        @click="activeTab = 'editor'"
      >
        流水线编辑器
      </button>
    </div>

    <!-- 流水线列表 -->
    <div v-if="activeTab === 'pipelines'" class="tab-content">
      <div class="toolbar">
        <button @click="createNewPipeline" class="btn-primary">
          ➕ 创建流水线
        </button>
        <button @click="loadPipelines" class="btn-secondary">
          🔄 刷新
        </button>
      </div>

      <div v-if="loading" class="loading">加载中...</div>

      <div v-else-if="pipelines.length === 0" class="empty">
        <p>暂无流水线</p>
        <button @click="createNewPipeline" class="btn-primary">创建第一个流水线</button>
      </div>

      <div v-else class="pipeline-list">
        <div v-for="pipeline in pipelines" :key="pipeline.id" class="pipeline-card">
          <div class="card-header">
            <h3>{{ pipeline.name }}</h3>
            <span class="status-badge" :class="pipeline.status">
              {{ pipeline.status }}
            </span>
          </div>
          <p class="description">{{ pipeline.description || '无描述' }}</p>
          <div class="card-footer">
            <div class="meta">
              <span>📊 {{ pipeline.nodeCount }} 个节点</span>
              <span>🕐 {{ formatDate(pipeline.created) }}</span>
            </div>
            <div class="actions">
              <button @click="executePipeline(pipeline.id)" class="btn-small">
                ▶️ 运行
              </button>
              <button @click="editPipeline(pipeline)" class="btn-small">
                ✏️ 编辑
              </button>
              <button @click="deletePipeline(pipeline.id)" class="btn-small btn-danger">
                🗑️ 删除
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 模块市场 -->
    <div v-if="activeTab === 'modules'" class="tab-content">
      <div class="toolbar">
        <button @click="loadModules" class="btn-secondary">
          🔄 刷新
        </button>
      </div>

      <div v-if="loading" class="loading">加载中...</div>

      <div v-else class="modules-grid">
        <div v-for="category in moduleCategories" :key="category.id" class="category-section">
          <h2>{{ category.name }} ({{ category.count }})</h2>
          <div class="module-cards">
            <div v-for="module in category.modules" :key="module.type" class="module-card">
              <div class="module-icon">{{ module.icon || '📦' }}</div>
              <h3>{{ module.name }}</h3>
              <p class="module-type">{{ module.type }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 执行记录 -->
    <div v-if="activeTab === 'executions'" class="tab-content">
      <div class="toolbar">
        <button @click="loadExecutions" class="btn-secondary">
          🔄 刷新
        </button>
      </div>

      <div v-if="loading" class="loading">加载中...</div>

      <div v-else-if="executions.length === 0" class="empty">
        <p>暂无执行记录</p>
      </div>

      <div v-else class="execution-list">
        <div v-for="execution in executions" :key="execution.id" class="execution-card">
          <div class="card-header">
            <h3>执行 {{ execution.id }}</h3>
            <span class="status-badge" :class="execution.status">
              {{ getStatusText(execution.status) }}
            </span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: `${execution.progress * 100}%` }"></div>
          </div>
          <div class="card-footer">
            <div class="meta">
              <span>📊 {{ execution.statistics?.completedNodes || 0 }}/{{ execution.statistics?.totalNodes || 0 }} 完成</span>
              <span>🕐 {{ formatDate(execution.created) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 流水线编辑器 -->
    <div v-if="activeTab === 'editor'" class="tab-content">
      <div class="editor-toolbar">
        <input
          v-model="editorPipeline.name"
          placeholder="流水线名称"
          class="pipeline-name-input"
        />
        <button @click="savePipeline" class="btn-primary">💾 保存</button>
        <button @click="testPipeline" class="btn-secondary">🧪 测试运行</button>
      </div>

      <div class="editor-content">
        <div class="editor-info">
          <h3>📝 流水线编辑器</h3>
          <p>这是一个简化的流水线编辑器。完整的可视化编辑器将在后续版本中提供。</p>

          <div class="json-editor">
            <h4>流水线配置（JSON）：</h4>
            <textarea
              v-model="editorJSON"
              rows="20"
              placeholder="在此输入流水线 JSON 配置..."
              class="json-input"
            ></textarea>
          </div>

          <div class="example-section">
            <h4>示例流水线：</h4>
            <button @click="loadExample" class="btn-secondary">加载示例</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PipelineManager',
  data() {
    return {
      activeTab: 'pipelines',
      loading: false,
      pipelines: [],
      modules: [],
      moduleCategories: [],
      executions: [],
      editorPipeline: {
        name: '新建流水线',
        description: '',
        nodes: [],
        edges: [],
        config: {}
      },
      editorJSON: ''
    }
  },
  mounted() {
    this.loadPipelines()
    this.loadModules()
  },
  methods: {
    async loadPipelines() {
      this.loading = true
      try {
        const response = await fetch('/api/pipelines')
        const result = await response.json()
        this.pipelines = result.data || []
      } catch (error) {
        console.error('Failed to load pipelines:', error)
        alert('加载流水线列表失败: ' + error.message)
      } finally {
        this.loading = false
      }
    },

    async loadModules() {
      this.loading = true
      try {
        const response = await fetch('/api/modules/categories')
        const result = await response.json()
        this.moduleCategories = result.categories || []
      } catch (error) {
        console.error('Failed to load modules:', error)
        alert('加载模块列表失败: ' + error.message)
      } finally {
        this.loading = false
      }
    },

    async loadExecutions() {
      this.loading = true
      try {
        // 从流水线中提取执行记录（简化版）
        this.executions = []
      } catch (error) {
        console.error('Failed to load executions:', error)
      } finally {
        this.loading = false
      }
    },

    createNewPipeline() {
      this.activeTab = 'editor'
      this.editorPipeline = {
        name: '新建流水线',
        description: '',
        nodes: [],
        edges: [],
        config: {
          maxConcurrency: 5,
          timeout: 300000,
          errorHandling: 'stop'
        }
      }
      this.editorJSON = JSON.stringify(this.editorPipeline, null, 2)
    },

    loadExample() {
      const example = {
        name: '示例：数据处理流水线',
        description: '生成数据 → 转换 → 过滤 → 输出',
        nodes: [
          {
            id: 'node_1',
            type: 'data-generator',
            name: '生成数据',
            config: {
              count: 20,
              dataType: 'number',
              min: 1,
              max: 100
            }
          },
          {
            id: 'node_2',
            type: 'data-transform',
            name: '数据加倍',
            config: {
              operation: 'double'
            }
          },
          {
            id: 'node_3',
            type: 'condition-filter',
            name: '过滤大于50',
            config: {
              condition: 'item > 50',
              mode: 'filter'
            }
          },
          {
            id: 'node_4',
            type: 'console-output',
            name: '控制台输出',
            config: {
              format: 'json',
              indent: 2
            }
          }
        ],
        edges: [
          { id: 'edge_1', source: 'node_1', target: 'node_2' },
          { id: 'edge_2', source: 'node_2', target: 'node_3' },
          { id: 'edge_3', source: 'node_3', target: 'node_4' }
        ],
        config: {
          maxConcurrency: 5,
          timeout: 300000,
          errorHandling: 'stop'
        }
      }

      this.editorJSON = JSON.stringify(example, null, 2)
      this.editorPipeline = example
    },

    async savePipeline() {
      try {
        // 解析 JSON
        const pipelineData = JSON.parse(this.editorJSON)

        const response = await fetch('/api/pipelines', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(pipelineData)
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const result = await response.json()
        alert(`流水线已保存: ${result.id}`)

        // 刷新列表
        await this.loadPipelines()
        this.activeTab = 'pipelines'
      } catch (error) {
        console.error('Failed to save pipeline:', error)
        alert('保存失败: ' + error.message)
      }
    },

    async testPipeline() {
      try {
        // 解析 JSON
        const pipelineData = JSON.parse(this.editorJSON)

        // 先保存
        const saveResponse = await fetch('/api/pipelines', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(pipelineData)
        })

        const saved = await saveResponse.json()

        // 执行
        const execResponse = await fetch(`/api/pipelines/${saved.id}/execute`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({})
        })

        const execution = await execResponse.json()
        alert(`流水线开始执行: ${execution.executionId}\n请查看控制台输出`)
      } catch (error) {
        console.error('Failed to test pipeline:', error)
        alert('测试运行失败: ' + error.message)
      }
    },

    async executePipeline(pipelineId) {
      try {
        const response = await fetch(`/api/pipelines/${pipelineId}/execute`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({})
        })

        const result = await response.json()
        alert(`流水线开始执行: ${result.executionId}`)

        // 切换到执行记录页面
        this.activeTab = 'executions'
        await this.loadExecutions()
      } catch (error) {
        console.error('Failed to execute pipeline:', error)
        alert('执行失败: ' + error.message)
      }
    },

    editPipeline(pipeline) {
      this.activeTab = 'editor'
      this.editorPipeline = { ...pipeline }
      this.editorJSON = JSON.stringify(pipeline, null, 2)
    },

    async deletePipeline(pipelineId) {
      if (!confirm('确定要删除此流水线吗？')) return

      try {
        await fetch(`/api/pipelines/${pipelineId}`, {
          method: 'DELETE'
        })

        alert('流水线已删除')
        await this.loadPipelines()
      } catch (error) {
        console.error('Failed to delete pipeline:', error)
        alert('删除失败: ' + error.message)
      }
    },

    getStatusText(status) {
      const texts = {
        pending: '等待中',
        running: '运行中',
        paused: '已暂停',
        completed: '已完成',
        failed: '失败',
        cancelled: '已取消',
        active: '活跃'
      }
      return texts[status] || status
    },

    formatDate(dateString) {
      if (!dateString) return '未知'
      const date = new Date(dateString)
      return date.toLocaleString('zh-CN')
    }
  }
}
</script>

<style scoped>
.pipeline-manager {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.header {
  margin-bottom: 30px;
}

.header h1 {
  font-size: 32px;
  margin-bottom: 8px;
  color: #1a1a1a;
}

.subtitle {
  font-size: 16px;
  color: #666;
}

.tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  border-bottom: 2px solid #e0e0e0;
}

.tabs button {
  padding: 12px 24px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 15px;
  color: #666;
  border-bottom: 3px solid transparent;
  transition: all 0.2s;
}

.tabs button:hover {
  color: #333;
}

.tabs button.active {
  color: #2563eb;
  border-bottom-color: #2563eb;
}

.tab-content {
  min-height: 500px;
}

.toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.btn-primary,
.btn-secondary,
.btn-small,
.btn-danger {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-primary {
  background: #2563eb;
  color: white;
}

.btn-primary:hover {
  background: #1d4ed8;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

.btn-small {
  padding: 6px 12px;
  font-size: 13px;
}

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-danger:hover {
  background: #dc2626;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #666;
}

.empty {
  text-align: center;
  padding: 60px 20px;
  color: #999;
}

.pipeline-list,
.execution-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.pipeline-card,
.execution-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  transition: all 0.2s;
}

.pipeline-card:hover,
.execution-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.card-header h3 {
  font-size: 18px;
  color: #1a1a1a;
  margin: 0;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.status-badge.active,
.status-badge.running {
  background: #dbeafe;
  color: #1e40af;
}

.status-badge.completed {
  background: #dcfce7;
  color: #166534;
}

.status-badge.failed {
  background: #fee2e2;
  color: #991b1b;
}

.status-badge.paused {
  background: #fef3c7;
  color: #92400e;
}

.description {
  color: #666;
  font-size: 14px;
  margin-bottom: 16px;
}

.card-footer {
  border-top: 1px solid #f0f0f0;
  padding-top: 16px;
}

.meta {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: #666;
  margin-bottom: 12px;
}

.actions {
  display: flex;
  gap: 8px;
}

.modules-grid {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.category-section h2 {
  font-size: 20px;
  margin-bottom: 16px;
  color: #1a1a1a;
}

.module-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.module-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  transition: all 0.2s;
  cursor: pointer;
}

.module-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.module-icon {
  font-size: 36px;
  margin-bottom: 12px;
}

.module-card h3 {
  font-size: 16px;
  margin: 0 0 8px 0;
  color: #1a1a1a;
}

.module-type {
  font-size: 12px;
  color: #999;
  font-family: monospace;
}

.progress-bar {
  height: 8px;
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
  margin: 12px 0;
}

.progress-fill {
  height: 100%;
  background: #2563eb;
  transition: width 0.3s;
}

.editor-toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  align-items: center;
}

.pipeline-name-input {
  flex: 1;
  padding: 10px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 16px;
}

.editor-content {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 30px;
}

.editor-info h3 {
  font-size: 20px;
  margin-bottom: 12px;
}

.editor-info p {
  color: #666;
  margin-bottom: 24px;
}

.json-editor h4,
.example-section h4 {
  font-size: 16px;
  margin-bottom: 12px;
}

.json-input {
  width: 100%;
  padding: 16px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  resize: vertical;
}

.example-section {
  margin-top: 24px;
}
</style>
