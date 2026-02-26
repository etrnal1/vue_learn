<template>
  <div class="flow-editor">
    <!-- 流程列表或编辑器 -->
    <div v-if="!editingFlow" class="flow-list-view">
      <header class="editor-header">
        <div>
          <h2>流程图编辑器</h2>
          <p class="subtitle">创建和编辑流程节点、连线与条件</p>
        </div>
        <button class="btn btn-primary" @click="createNewFlow">
          + 新建流程
        </button>
      </header>

      <div v-if="flows.length === 0" class="empty-state">
        <div class="empty-icon">🌀</div>
        <p>暂无流程</p>
        <button class="btn btn-primary" @click="createNewFlow">创建第一个流程</button>
      </div>

      <div v-else class="flow-cards">
        <div v-for="flow in flows" :key="flow.id" class="flow-card-item">
          <div class="card-header">
            <h3>{{ flow.name }}</h3>
            <span class="badge">{{ (flow.steps || []).length }} 步</span>
          </div>
          <p class="card-desc">{{ flow.description || '暂无描述' }}</p>

          <!-- 步骤预览 -->
          <div v-if="flow.steps && flow.steps.length > 0" class="steps-preview-list">
            <div class="preview-title">步骤预览：</div>
            <div class="steps-preview-items">
              <div v-for="(step, idx) in flow.steps.slice(0, 3)" :key="step.id || idx" class="preview-step">
                <span class="step-num">{{ idx + 1 }}</span>
                <span class="step-title">{{ step.name || '（未命名）' }}</span>
              </div>
              <div v-if="flow.steps.length > 3" class="preview-more">
                +{{ flow.steps.length - 3 }} 更多...
              </div>
            </div>
          </div>

          <div class="card-actions">
            <button class="btn btn-small" @click="editFlow(flow)">编辑</button>
            <button class="btn btn-small btn-danger" @click="deleteFlow(flow)">删除</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 流程编辑器 -->
    <div v-else class="flow-editor-view">
      <header class="editor-header">
        <button class="btn-back" @click="editingFlow = null">← 返回</button>
        <div class="flow-info">
          <h2>
            <input
              v-model="editingFlow.name"
              class="flow-name-input"
              placeholder="流程名称"
              @input="scheduleAutoSave"
            />
          </h2>
          <textarea
            v-model="editingFlow.description"
            class="flow-desc-input"
            placeholder="流程描述"
            rows="2"
            @input="scheduleAutoSave"
          ></textarea>
        </div>
        <div class="editor-actions">
          <button class="btn btn-success" :disabled="saving" @click="saveFlow">
            {{ saving ? '保存中...' : '保存' }}
          </button>
        </div>
      </header>

      <!-- 步骤编辑 -->
      <div class="steps-editor">
        <div class="steps-header">
          <h3>流程步骤</h3>
          <button class="btn btn-small" @click="addStep">+ 添加步骤</button>
        </div>

        <div v-if="!editingFlow.steps || editingFlow.steps.length === 0" class="no-steps">
          <p>暂无步骤，点击上面的按钮添加</p>
        </div>

        <div v-else class="steps-list">
          <div
            v-for="(step, index) in editingFlow.steps"
            :key="step.id || index"
            class="step-item"
            :class="{ 'editing-step': editingStepIndex === index }"
          >
            <div class="step-number">{{ index + 1 }}</div>
            <div class="step-content">
              <input
                v-model="step.name"
                class="step-input"
                placeholder="步骤名称"
                @input="scheduleAutoSave"
              />
              <textarea
                v-model="step.description"
                class="step-textarea"
                placeholder="步骤描述"
                rows="2"
                @input="scheduleAutoSave"
              ></textarea>
              <div class="step-meta">
                <input
                  v-model="step.assignee"
                  class="step-input-sm"
                  placeholder="负责人"
                  @input="scheduleAutoSave"
                />
                <input
                  v-model="step.duration"
                  class="step-input-sm"
                  placeholder="预计耗时（如 2h）"
                  @input="scheduleAutoSave"
                />
                <label class="checkbox">
                  <input v-model="step.conditional" type="checkbox" @change="scheduleAutoSave" />
                  <span>条件触发</span>
                </label>
              </div>
            </div>
            <div class="step-actions">
              <button
                class="btn-icon"
                :disabled="index === 0"
                @click="moveStep(index, -1)"
                title="上移"
              >
                ↑
              </button>
              <button
                class="btn-icon"
                :disabled="index === editingFlow.steps.length - 1"
                @click="moveStep(index, 1)"
                title="下移"
              >
                ↓
              </button>
              <button
                class="btn-icon btn-danger"
                @click="removeStep(index)"
                title="删除"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 预览 -->
      <div class="steps-preview">
        <h3>预览</h3>
        <div class="preview-list">
          <div
            v-for="(step, index) in editingFlow.steps || []"
            :key="step.id || index"
            class="preview-item"
          >
            <div class="preview-index">{{ index + 1 }}</div>
            <div class="preview-info">
              <p class="preview-title">{{ step.name || `步骤 ${index + 1}` }}</p>
              <p class="preview-desc">{{ step.description }}</p>
              <div class="preview-meta">
                <span v-if="step.assignee">👤 {{ step.assignee }}</span>
                <span v-if="step.duration">⏱ {{ step.duration }}</span>
                <span v-if="step.conditional">⚡ 条件触发</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 消息提示 -->
    <div v-if="message" class="message" :class="[message.type, { 'auto-save': message.text.includes('自动') }]">
      {{ message.text }}
    </div>
  </div>
</template>

<script>
import { api } from '../../utils/api.js'

export default {
  name: 'FlowDiagramEditor',
  data() {
    return {
      flows: [],
      editingFlow: null,
      editingStepIndex: null,
      loading: false,
      saving: false,
      message: null,
      autoSaveTimer: null,
      lastSavedFlow: null,
      isAutoSaving: false,
      autoSaveEnabled: true,
      autoSaveInterval: 10000  // 每 10 秒自动保存一次
    }
  },
  methods: {
    async loadFlows() {
      this.loading = true
      try {
        const result = await api.flows.getAll()
        this.flows = Array.isArray(result) ? result : []
      } catch (error) {
        this.showMessage(`加载流程失败: ${error?.message}`, 'error')
      } finally {
        this.loading = false
      }
    },
    createNewFlow() {
      this.editingFlow = {
        id: `flow_${Date.now()}`,
        name: '',
        description: '',
        icon: '🌀',
        steps: [],
        created_at: Date.now(),
        updated_at: Date.now()
      }
      this.editingStepIndex = null
    },
    editFlow(flow) {
      this.editingFlow = JSON.parse(JSON.stringify(flow))
      this.lastSavedFlow = JSON.parse(JSON.stringify(flow))
      this.editingStepIndex = null
    },
    async saveFlow() {
      if (!this.editingFlow.name.trim()) {
        this.showMessage('请输入流程名称', 'error')
        return
      }

      if (!this.editingFlow.steps || this.editingFlow.steps.length === 0) {
        this.showMessage('请至少添加一个步骤', 'error')
        return
      }

      this.saving = true
      try {
        // 检查是否是新流程：id 是临时生成的（包含 flow_）或在现有流程列表中不存在
        const isNew = !this.flows.some(f => f.id === this.editingFlow.id)

        // 准备流程数据，确保步骤有正确的 order 字段
        const flowData = {
          id: this.editingFlow.id || `flow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: this.editingFlow.name.trim(),
          description: this.editingFlow.description || '',
          icon: this.editingFlow.icon || '🌀',
          steps: (this.editingFlow.steps || []).map((step, index) => ({
            id: step.id || `step_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
            name: step.name || '',
            description: step.description || '',
            assignee: step.assignee || '',
            duration: step.duration || '',
            order: index,
            conditional: step.conditional || false
          }))
        }

        let result

        if (isNew) {
          result = await api.flows.create(flowData)
        } else {
          result = await api.flows.update(this.editingFlow.id, flowData)
        }

        this.showMessage('流程已保存', 'success')
        await this.loadFlows()
        this.editingFlow = null
      } catch (error) {
        this.showMessage(`保存失败: ${error?.message}`, 'error')
        console.error('保存流程错误:', error)
      } finally {
        this.saving = false
      }
    },
    async deleteFlow(flow) {
      if (!window.confirm(`确定删除流程 "${flow.name}" 吗？此操作不可撤销。`)) {
        return
      }

      try {
        await api.flows.delete(flow.id)
        this.showMessage('流程已删除', 'success')
        await this.loadFlows()
      } catch (error) {
        this.showMessage(`删除失败: ${error?.message}`, 'error')
      }
    },
    addStep() {
      if (!this.editingFlow.steps) {
        this.$set(this.editingFlow, 'steps', [])
      }
      const newStep = {
        id: `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: '',
        description: '',
        assignee: '',
        duration: '',
        conditional: false
      }
      this.editingFlow.steps.push(newStep)
      this.scheduleAutoSave()
      this.$nextTick(() => {
        this.editingStepIndex = this.editingFlow.steps.length - 1
      })
    },
    removeStep(index) {
      if (this.editingFlow.steps && this.editingFlow.steps.length > 0) {
        this.$delete(this.editingFlow.steps, index)
        this.editingFlow.steps.splice(index, 1)
        if (this.editingStepIndex === index) {
          this.editingStepIndex = null
        }
        this.scheduleAutoSave()
      }
    },
    moveStep(index, direction) {
      if (!this.editingFlow.steps) return
      const newIndex = index + direction
      if (newIndex >= 0 && newIndex < this.editingFlow.steps.length) {
        const temp = this.editingFlow.steps[index]
        this.$set(this.editingFlow.steps, index, this.editingFlow.steps[newIndex])
        this.$set(this.editingFlow.steps, newIndex, temp)
        this.scheduleAutoSave()
      }
    },
    // 自动保存功能
    hasChanges() {
      if (!this.editingFlow || !this.lastSavedFlow) return true
      return JSON.stringify(this.editingFlow) !== JSON.stringify(this.lastSavedFlow)
    },
    scheduleAutoSave() {
      // 清除旧的计时器
      if (this.autoSaveTimer) {
        clearTimeout(this.autoSaveTimer)
      }

      // 如果禁用了自动保存，则不调度
      if (!this.autoSaveEnabled) return

      // 设置新的计时器
      this.autoSaveTimer = setTimeout(() => {
        if (this.editingFlow && this.hasChanges()) {
          this.autoSave()
        }
      }, this.autoSaveInterval)
    },
    async autoSave() {
      if (!this.editingFlow || this.isAutoSaving || !this.autoSaveEnabled) return

      // 如果有未保存的更改，执行保存
      if (!this.hasChanges()) return

      this.isAutoSaving = true
      try {
        const isNew = !this.flows.some(f => f.id === this.editingFlow.id)

        const flowData = {
          id: this.editingFlow.id || `flow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: this.editingFlow.name.trim() || '未命名流程',
          description: this.editingFlow.description || '',
          icon: this.editingFlow.icon || '🌀',
          steps: (this.editingFlow.steps || []).map((step, index) => ({
            id: step.id || `step_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
            name: step.name || '',
            description: step.description || '',
            assignee: step.assignee || '',
            duration: step.duration || '',
            order: index,
            conditional: step.conditional || false
          }))
        }

        // 如果没有步骤，则不保存（避免保存无效流程）
        if (flowData.steps.length === 0) return

        let result
        if (isNew) {
          result = await api.flows.create(flowData)
        } else {
          result = await api.flows.update(this.editingFlow.id, flowData)
        }

        // 更新最后保存的状态
        this.lastSavedFlow = JSON.parse(JSON.stringify(this.editingFlow))

        // 显示自动保存提示（仅显示 2 秒）
        this.message = { text: '✓ 已自动保存', type: 'success' }
        setTimeout(() => {
          if (this.message && this.message.text === '✓ 已自动保存') {
            this.message = null
          }
        }, 2000)
      } catch (error) {
        console.error('自动保存失败:', error)
        this.message = { text: `自动保存失败: ${error?.message}`, type: 'error' }
      } finally {
        this.isAutoSaving = false
      }
    },
    showMessage(text, type = 'info') {
      this.message = { text, type }
      setTimeout(() => {
        this.message = null
      }, 3000)
    }
  },
  mounted() {
    this.loadFlows()
  },
  beforeUnmount() {
    // 页面卸载前，清除自动保存计时器
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer)
    }
  }
}
</script>

<style scoped>
.flow-editor {
  padding: 16px;
  max-width: 1200px;
  margin: 0 auto;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.editor-header h2 {
  margin: 0 0 4px;
  font-size: 1.8em;
}

.subtitle {
  margin: 0;
  color: var(--app-text-muted);
  font-size: 0.95em;
}

.flow-info {
  flex: 1;
  min-width: 200px;
}

.flow-name-input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-card-elevated);
  color: var(--app-text);
  font-size: 1em;
  font-weight: 600;
}

.flow-desc-input {
  width: 100%;
  margin-top: 8px;
  padding: 8px 10px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-card-elevated);
  color: var(--app-text);
  font-size: 0.9em;
  resize: vertical;
  font-family: inherit;
}

.editor-actions {
  display: flex;
  gap: 8px;
}

.btn-back {
  border: none;
  background: transparent;
  color: var(--app-primary);
  font-size: 1.1em;
  padding: 8px;
  cursor: pointer;
  font-weight: 600;
}

/* 按钮样式 */
.btn {
  padding: 8px 14px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: var(--app-primary);
  color: var(--app-on-primary);
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s ease;
  font-size: 0.95em;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-small {
  padding: 6px 10px;
  font-size: 0.85em;
}

.btn-primary {
  background: var(--app-primary);
  color: var(--app-on-primary);
}

.btn-success {
  background: #10b981;
  color: white;
}

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-icon {
  border: 1px solid var(--app-border);
  background: var(--app-card-elevated);
  color: var(--app-text);
  padding: 6px 8px;
  font-size: 0.9em;
}

.btn-icon.btn-danger {
  background: #fee2e2;
  color: #b91c1c;
}

.btn-icon:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* 流程列表 */
.flow-list-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  border: 2px dashed var(--app-border);
  border-radius: 16px;
  background: var(--app-card);
}

.empty-icon {
  font-size: 3em;
  margin-bottom: 12px;
}

.empty-state p {
  margin: 0 0 16px;
  color: var(--app-text-muted);
  font-size: 1.1em;
}

.flow-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.flow-card-item {
  padding: 16px;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  background: var(--app-card);
  box-shadow: var(--app-soft-shadow);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}

.card-header h3 {
  margin: 0;
  font-size: 1.1em;
}

.badge {
  background: var(--app-primary);
  color: var(--app-on-primary);
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.8em;
  font-weight: 600;
  white-space: nowrap;
}

.card-desc {
  margin: 0;
  color: var(--app-text-muted);
  font-size: 0.9em;
  line-height: 1.4;
}

/* 步骤预览 */
.steps-preview-list {
  padding: 10px;
  background: var(--app-card-elevated);
  border-radius: 8px;
  border-left: 3px solid var(--app-primary);
}

.preview-title {
  font-size: 0.8em;
  font-weight: 600;
  color: var(--app-text-muted);
  margin-bottom: 6px;
}

.steps-preview-items {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.preview-step {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85em;
}

.step-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--app-primary);
  color: var(--app-on-primary);
  font-weight: 600;
  font-size: 0.8em;
  flex-shrink: 0;
}

.step-title {
  color: var(--app-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.preview-more {
  font-size: 0.8em;
  color: var(--app-text-muted);
  font-style: italic;
  padding-left: 24px;
}

.card-actions {
  display: flex;
  gap: 8px;
}

/* 编辑器视图 */
.flow-editor-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.steps-editor {
  background: var(--app-card);
  border: 1px solid var(--app-border);
  border-radius: 12px;
  padding: 16px;
}

.steps-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.steps-header h3 {
  margin: 0;
  font-size: 1.1em;
}

.no-steps {
  text-align: center;
  padding: 40px 20px;
  color: var(--app-text-muted);
  border: 1px dashed var(--app-border);
  border-radius: 8px;
  background: var(--app-card-elevated);
}

.steps-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.step-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: var(--app-card-elevated);
  align-items: flex-start;
}

.step-item.editing-step {
  border-color: var(--app-primary);
  background: rgba(0, 122, 255, 0.05);
}

.step-number {
  width: 32px;
  height: 32px;
  min-width: 32px;
  border-radius: 50%;
  background: var(--app-primary);
  color: var(--app-on-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.9em;
}

.step-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.step-input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--app-border);
  border-radius: 6px;
  background: var(--app-card);
  color: var(--app-text);
  font-weight: 600;
}

.step-textarea {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--app-border);
  border-radius: 6px;
  background: var(--app-card);
  color: var(--app-text);
  font-family: inherit;
  font-size: 0.9em;
  resize: vertical;
}

.step-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.step-input-sm {
  flex: 1;
  min-width: 120px;
  padding: 6px 8px;
  border: 1px solid var(--app-border);
  border-radius: 6px;
  background: var(--app-card);
  color: var(--app-text);
  font-size: 0.85em;
}

.checkbox {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 0.9em;
}

.checkbox input {
  cursor: pointer;
}

.step-actions {
  display: flex;
  gap: 4px;
  flex-direction: column;
}

/* 预览 */
.steps-preview {
  background: var(--app-card);
  border: 1px solid var(--app-border);
  border-radius: 12px;
  padding: 16px;
}

.steps-preview h3 {
  margin: 0 0 12px;
  font-size: 1.1em;
}

.preview-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preview-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-card-elevated);
}

.preview-index {
  width: 28px;
  height: 28px;
  min-width: 28px;
  border-radius: 50%;
  background: var(--app-primary);
  color: var(--app-on-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.85em;
}

.preview-info {
  flex: 1;
}

.preview-title {
  margin: 0;
  font-weight: 600;
  color: var(--app-text);
}

.preview-desc {
  margin: 4px 0 0;
  color: var(--app-text-muted);
  font-size: 0.9em;
}

.preview-meta {
  display: flex;
  gap: 12px;
  margin-top: 6px;
  flex-wrap: wrap;
  font-size: 0.85em;
  color: var(--app-text-muted);
}

/* 消息提示 */
.message {
  position: fixed;
  bottom: 20px;
  right: 20px;
  padding: 12px 16px;
  border-radius: 8px;
  background: #10b981;
  color: white;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
}

.message.error {
  background: #ef4444;
}

.message.auto-save {
  bottom: 80px;
  right: 20px;
  background: #8b5cf6;
  opacity: 0.9;
  font-size: 0.85em;
  padding: 8px 12px;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .flow-editor {
    padding: 12px;
  }

  .editor-header {
    flex-direction: column;
    gap: 12px;
  }

  .editor-header h2 {
    font-size: 1.4em;
  }

  .flow-cards {
    grid-template-columns: 1fr;
  }

  .steps-preview-list {
    padding: 8px;
  }

  .preview-step {
    font-size: 0.8em;
  }

  .step-num {
    width: 16px;
    height: 16px;
    font-size: 0.7em;
  }

  .step-meta {
    flex-direction: column;
    gap: 6px;
  }

  .step-input-sm {
    min-width: 100%;
  }

  .step-actions {
    flex-direction: row;
    gap: 2px;
  }

  .steps-editor,
  .steps-preview {
    padding: 12px;
  }

  .message {
    bottom: 12px;
    right: 12px;
    left: 12px;
  }
}

@media (max-width: 480px) {
  .flow-editor {
    padding: 8px;
  }

  .editor-header h2 {
    font-size: 1.2em;
  }

  .editor-actions {
    width: 100%;
  }

  .btn {
    flex: 1;
  }

  .card-header {
    flex-direction: column;
  }

  .step-item {
    flex-direction: column;
    gap: 8px;
  }

  .step-number {
    align-self: flex-start;
  }

  .step-actions {
    width: 100%;
    flex-direction: row;
  }

  .btn-icon {
    flex: 1;
  }

  .preview-item {
    gap: 8px;
  }
}
</style>
