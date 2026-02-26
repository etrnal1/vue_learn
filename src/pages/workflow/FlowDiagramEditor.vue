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

      <div v-if="loading && flows.length === 0" class="list-loading">
        <div class="list-loading__icon">⏳</div>
        <p>正在加载流程...</p>
      </div>

      <div v-else-if="!loading && flows.length === 0" class="empty-state">
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
              <div v-for="(step, idx) in flow.steps" :key="step.id || idx" class="preview-step">
                <span class="step-num">{{ idx + 1 }}</span>
                <div class="step-info">
                  <span class="step-title">{{ step.name || '（未命名）' }}</span>
                  <span v-if="step.description" class="step-desc">{{ step.description }}</span>
                  <span v-if="step.tip" class="preview-tip">提示：{{ step.tip }}</span>
                  <span v-if="step.note" class="preview-note">备注：{{ step.note }}</span>
                </div>
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
          <button class="btn btn-success" :disabled="!canSaveFlow" @click="saveFlow">
            {{ saving ? '保存中...' : '保存' }}
          </button>
        </div>
      </header>

      <!-- 步骤编辑 -->
      <div class="steps-editor">
        <div class="steps-header">
          <div>
            <h3>流程步骤</h3>
            <p class="steps-count">共 {{ editingFlow.steps?.length || 0 }} 个步骤</p>
          </div>
          <button class="btn btn-small" @click="addStep">+ 添加步骤</button>
        </div>

        <div v-if="!editingFlow.steps || editingFlow.steps.length === 0" class="no-steps">
          <p>暂无步骤，点击上面的按钮添加</p>
        </div>

        <div v-else class="steps-list-wrapper">
          <div class="steps-list">
            <div
              v-for="(step, index) in editingFlow.steps"
              :key="step.id || index"
              class="step-item"
              :class="{ 'editing-step': editingStepIndex === index }"
            >
              <div class="step-header-row">
                <div class="step-number">{{ index + 1 }}</div>
                <input
                  v-model="step.name"
                  class="step-input"
                  placeholder="步骤名称"
                  @input="scheduleAutoSave"
                />
                <div class="step-actions">
                  <button
                    class="btn-icon"
                    :disabled="index === 0"
                    @click="moveStep(index, -1)"
                    title="上移"
                  >
                    ⬆️
                  </button>
                  <button
                    class="btn-icon"
                    :disabled="index === editingFlow.steps.length - 1"
                    @click="moveStep(index, 1)"
                    title="下移"
                  >
                    ⬇️
                  </button>
                  <button
                    class="btn-icon btn-danger"
                    @click="removeStep(index)"
                    title="删除"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <div class="step-content">
                <div class="step-field">
                  <label class="step-label">
                    <span class="label-text">描述</span>
                    <span class="label-hint">说明这个步骤的内容和目的</span>
                  </label>
                  <textarea
                    v-model="step.description"
                    class="step-textarea"
                    placeholder="例如：评估申请人的请假理由和工作状况"
                    rows="2"
                    @input="scheduleAutoSave"
                  ></textarea>
                </div>

                <div class="step-fields-row">
                  <div class="step-field">
                    <label class="step-label">
                      <span class="label-text">负责人</span>
                      <span class="label-hint">完成此步骤的人员角色或名称</span>
                    </label>
                    <input
                      v-model="step.assignee"
                      class="step-input-sm"
                      placeholder="例如：部门经理"
                      @input="scheduleAutoSave"
                    />
                  </div>
                  <div class="step-field">
                    <label class="step-label">
                      <span class="label-text">预计耗时</span>
                      <span class="label-hint">完成此步骤的大约时间</span>
                    </label>
                    <input
                      v-model="step.duration"
                      class="step-input-sm"
                      placeholder="例如：2h、30min"
                      @input="scheduleAutoSave"
                    />
                  </div>
                </div>

                <div class="step-field">
                  <label class="step-label">
                    <span class="label-text">提示</span>
                    <span class="label-hint">可写操作注意点或前置条件（选填）</span>
                  </label>
                  <textarea
                    v-model="step.tip"
                    class="step-textarea"
                    placeholder="例如：先确认申请表已填写完整"
                    rows="2"
                    @input="scheduleAutoSave"
                  ></textarea>
                </div>
                <div class="step-field">
                  <label class="step-label">
                    <span class="label-text">备注</span>
                    <span class="label-hint">写下任何补充说明或交付内容（选填）</span>
                  </label>
                  <textarea
                    v-model="step.note"
                    class="step-textarea"
                    placeholder="例如：本步骤需要同步记录在工单中"
                    rows="2"
                    @input="scheduleAutoSave"
                  ></textarea>
                </div>

                <label class="step-label checkbox-label">
                  <input v-model="step.conditional" type="checkbox" @change="scheduleAutoSave" />
                  <span class="label-text">条件触发</span>
                  <span class="label-hint">勾选表示该步骤仅在满足特定条件时执行</span>
                </label>
              </div>
            </div>
          </div>

          <!-- 步骤数量提示 -->
          <div v-if="editingFlow.steps && editingFlow.steps.length > 0" class="steps-info">
            <p>💡 已添加 {{ editingFlow.steps.length }} 个步骤，可以使用上⬆️ 下⬇️ 按钮调整顺序</p>
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
              <p v-if="step.tip" class="preview-tip">提示：{{ step.tip }}</p>
              <p v-if="step.note" class="preview-note">备注：{{ step.note }}</p>
              <div class="preview-meta">
                <span v-if="step.assignee">👤 {{ step.assignee }}</span>
                <span v-if="step.duration">⏱ {{ step.duration }}</span>
                <span v-if="step.conditional">⚡ 条件触发</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="versions-panel">
        <div class="versions-header">
          <div>
            <h3>版本历史</h3>
            <p class="subtitle">展示已发布的快照，支持手动创建与回滚</p>
          </div>
          <div class="versions-actions">
            <button class="btn btn-small" :disabled="creatingVersion" @click="createVersion">
              {{ creatingVersion ? '创建中…' : '创建版本' }}
            </button>
            <button class="btn btn-small btn-danger" :disabled="rollingBack || !flowVersions.length" @click="rollbackVersion">
              {{ rollingBack ? '回滚中…' : '回滚最新' }}
            </button>
          </div>
        </div>
        <div v-if="versionsLoading" class="versions-loading">
          <span class="list-loading__icon">⏳</span>
          <p>加载版本...</p>
        </div>
        <div v-else-if="versionError" class="versions-error">
          <p>版本加载失败：{{ versionError }}</p>
        </div>
        <div v-else-if="flowVersions.length === 0" class="versions-empty">
          <p>暂无版本</p>
        </div>
        <ul v-else class="versions-list">
          <li v-for="version in flowVersions" :key="version.id" class="versions-item">
            <div>
              <strong>{{ version.name || version.note || version.id }}</strong>
              <p>{{ formatDate(version.created_at || version.createdAt || version.timestamp) }}</p>
            </div>
            <span class="versions-status">{{ version.status || '未知' }}</span>
          </li>
        </ul>
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
import { recordAudit } from '../../utils/auditLog.js'

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
      autoSaveInterval: 10000,  // 每 10 秒自动保存一次
      flowVersions: [],
      versionsLoading: false,
      versionError: '',
      creatingVersion: false,
      rollingBack: false
    }
  },
  computed: {
    hasSteps() {
      return Array.isArray(this.editingFlow?.steps) && this.editingFlow.steps.length > 0
    },
    canSaveFlow() {
      return Boolean(
        this.editingFlow &&
        this.editingFlow.name?.trim() &&
        this.hasSteps &&
        !this.saving
      )
    }
  },
  methods: {
    buildFlowPayload(sourceFlow = this.editingFlow, options = {}) {
      if (!sourceFlow) return null
      const { fallbackName = '未命名流程' } = options
      const now = Date.now()
      const seed = Math.random().toString(36).substr(2, 6)
      const steps = (Array.isArray(sourceFlow.steps) ? sourceFlow.steps : []).map((step, index) => ({
        id: step.id || `step_${now}_${index}_${seed}`,
        name: step.name || '',
        description: step.description || '',
        assignee: step.assignee || '',
        duration: step.duration || '',
        order: index,
        conditional: !!step.conditional,
        tip: step.tip || '',
        note: step.note || ''
      }))

      return {
        id: sourceFlow.id || `flow_${now}_${seed}`,
        name: (sourceFlow.name || '').trim() || fallbackName,
        description: sourceFlow.description || '',
        icon: sourceFlow.icon || '🌀',
        steps
      }
    },
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
    async createVersion() {
      if (!this.editingFlow) return
      const note = window.prompt('请输入版本变更说明（可选）：', '')
      if (note === null) return
      this.creatingVersion = true
      try {
        const payload = this.buildFlowPayload(this.editingFlow)
        await api.flows.createRelease(this.editingFlow.id, {
          note: note.trim() || '手动版本',
          snapshot: payload
        })
        this.showMessage('版本已创建', 'success')
        recordAudit({ action: 'create_version', detail: note || '', flowId: this.editingFlow.id })
        await this.loadVersions(this.editingFlow.id)
      } catch (error) {
        this.showMessage(`创建版本失败: ${error?.message}`, 'error')
      } finally {
        this.creatingVersion = false
      }
    },
    async rollbackVersion() {
      if (!this.editingFlow) return
      if (!window.confirm('确定回滚到最近发布版本？')) {
        return
      }
      this.rollingBack = true
      try {
        await api.flows.rollbackRelease(this.editingFlow.id)
        this.showMessage('流程已回滚到发布版本', 'success')
        recordAudit({ action: 'rollback_flow', detail: this.editingFlow.name || '', flowId: this.editingFlow.id })
        await this.loadFlows()
        this.editingFlow = null
      } catch (error) {
        this.showMessage(`回滚失败: ${error?.message}`, 'error')
      } finally {
        this.rollingBack = false
      }
    },
    async loadVersions(flowId) {
      if (!flowId) {
        this.flowVersions = []
        return
      }
      this.versionsLoading = true
      this.versionError = ''
      try {
        const result = await api.flows.getReleases()
        const candidates = Array.isArray(result) ? result : []
        const normalized = candidates.filter((release) => {
          const owner = release.flowId || release.flow_id || release.flow
          return owner === flowId
        })
        this.flowVersions = normalized.sort((a, b) => {
          const left = new Date(a.created_at || a.createdAt || a.timestamp || 0).getTime()
          const right = new Date(b.created_at || b.createdAt || b.timestamp || 0).getTime()
          return right - left
        })
      } catch (error) {
        this.versionError = error?.message || '获取版本失败'
      } finally {
        this.versionsLoading = false
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
      this.lastSavedFlow = null
      this.flowVersions = []
      this.versionError = ''
    },
    editFlow(flow) {
      this.editingFlow = JSON.parse(JSON.stringify(flow))
      this.lastSavedFlow = JSON.parse(JSON.stringify(flow))
      this.editingStepIndex = null
      this.loadVersions(flow.id)
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
        const flowData = this.buildFlowPayload(this.editingFlow)
        if (!flowData || flowData.steps.length === 0) {
          this.showMessage('请至少添加一个步骤', 'error')
          return
        }

        const isNew = !this.flows.some(f => f.id === flowData.id)

        let result
        if (isNew) {
          result = await api.flows.create(flowData)
        } else {
          result = await api.flows.update(flowData.id, flowData)
        }

        this.showMessage('流程已保存', 'success')
        await this.loadFlows()
        this.lastSavedFlow = JSON.parse(JSON.stringify(this.editingFlow))
        this.editingFlow = null
        recordAudit({ action: 'save_flow', detail: flowData.name, flowId: flowData.id })
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
        recordAudit({ action: 'delete_flow', detail: flow.name || '', flowId: flow.id })
      } catch (error) {
        this.showMessage(`删除失败: ${error?.message}`, 'error')
      }
    },
    addStep() {
      if (!this.editingFlow.steps) {
        this.editingFlow.steps = []
      }
      const newStep = {
        id: `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: '',
        description: '',
        assignee: '',
        duration: '',
        conditional: false,
        tip: '',
        note: ''
      }
      this.editingFlow.steps.push(newStep)
      this.scheduleAutoSave()
      this.$nextTick(() => {
        this.editingStepIndex = this.editingFlow.steps.length - 1
      })
    },
    removeStep(index) {
      if (this.editingFlow.steps && this.editingFlow.steps.length > 0) {
        this.editingFlow.steps.splice(index, 1)
        if (this.editingStepIndex === index) {
          this.editingStepIndex = null
        }
        this.scheduleAutoSave()
      }
    },
    moveStep(index, direction) {
      if (!this.editingFlow.steps || this.editingFlow.steps.length < 2) return
      const newIndex = index + direction

      // 检查新索引是否有效
      if (newIndex < 0 || newIndex >= this.editingFlow.steps.length) return

      // 交换步骤
      const stepsCopy = [...this.editingFlow.steps]
      const [moved] = stepsCopy.splice(index, 1)
      stepsCopy.splice(newIndex, 0, moved)
      this.editingFlow.steps = stepsCopy

      if (this.editingStepIndex === index) {
        this.editingStepIndex = newIndex
      }

      // 触发自动保存
      this.scheduleAutoSave()

      // 提示用户
      if (direction === -1) {
        this.showMessage(`已将第 ${index + 1} 步上移到第 ${newIndex + 1} 步`, 'info')
      } else {
        this.showMessage(`已将第 ${index + 1} 步下移到第 ${newIndex + 1} 步`, 'info')
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
        const flowData = this.buildFlowPayload(this.editingFlow)
        if (!flowData || flowData.steps.length === 0) return

        const isNew = !this.flows.some(f => f.id === flowData.id)
        let result
        if (isNew) {
          result = await api.flows.create(flowData)
        } else {
          result = await api.flows.update(flowData.id, flowData)
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

.list-loading {
  text-align: center;
  padding: 40px 20px;
  border: 1px dashed var(--app-border);
  border-radius: 12px;
  background: var(--app-card);
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  color: var(--app-text-muted);
}

.list-loading__icon {
  font-size: 2em;
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
  max-height: 260px;
  overflow-y: auto;
}

.preview-step {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 0.85em;
  padding: 6px 0;
}

.step-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--app-primary);
  color: var(--app-on-primary);
  font-weight: 600;
  font-size: 0.75em;
  flex-shrink: 0;
  margin-top: 1px;
}

.step-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.step-title {
  color: var(--app-text);
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.step-desc {
  color: var(--app-text-muted);
  font-size: 0.9em;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  line-height: 1.3;
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

.steps-count {
  margin: 4px 0 0;
  font-size: 0.85em;
  color: var(--app-text-muted);
}

.no-steps {
  text-align: center;
  padding: 40px 20px;
  color: var(--app-text-muted);
  border: 1px dashed var(--app-border);
  border-radius: 8px;
  background: var(--app-card-elevated);
}

/* 步骤列表容器 - 支持滚动 */
.steps-list-wrapper {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.steps-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 70vh;
  overflow-y: auto;
  padding-right: 8px;
}

.steps-list::-webkit-scrollbar {
  width: 6px;
}

.steps-list::-webkit-scrollbar-track {
  background: var(--app-card);
  border-radius: 3px;
}

.steps-list::-webkit-scrollbar-thumb {
  background: var(--app-border);
  border-radius: 3px;
}

.steps-list::-webkit-scrollbar-thumb:hover {
  background: var(--app-text-muted);
}

.step-item {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: var(--app-card-elevated);
}

.step-item.editing-step {
  border-color: var(--app-primary);
  background: rgba(0, 122, 255, 0.05);
}

/* 步骤头部行 - 包含编号、名称、操作按钮 */
.step-header-row {
  display: flex;
  gap: 12px;
  align-items: center;
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
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.step-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.step-label {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.label-text {
  font-weight: 600;
  font-size: 0.9em;
  color: var(--app-text);
}

.label-hint {
  font-size: 0.75em;
  color: var(--app-text-muted);
  font-weight: normal;
}

.step-input {
  flex: 1;
  padding: 8px 10px;
  border: 1px solid var(--app-border);
  border-radius: 6px;
  background: var(--app-card);
  color: var(--app-text);
  font-weight: 600;
  min-width: 200px;
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

/* 步骤属性行 */
.step-fields-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.step-input-sm {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid var(--app-border);
  border-radius: 6px;
  background: var(--app-card);
  color: var(--app-text);
  font-size: 0.85em;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  flex-direction: row;
}

.checkbox-label input {
  cursor: pointer;
  margin: 0;
}

/* 操作按钮 */
.step-actions {
  display: flex;
  gap: 6px;
  flex-direction: row;
}

/* 步骤信息提示 */
.steps-info {
  padding: 12px;
  background: rgba(0, 122, 255, 0.05);
  border: 1px solid rgba(0, 122, 255, 0.2);
  border-radius: 8px;
  color: var(--app-text-muted);
  font-size: 0.9em;
  text-align: center;
}

.steps-info p {
  margin: 0;
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

.preview-tip,
.preview-note {
  margin: 4px 0 0;
  font-size: 0.8em;
  color: var(--app-text-muted);
}

.preview-note {
  color: var(--app-text);
  font-weight: 500;
}

.preview-meta {
  display: flex;
  gap: 12px;
  margin-top: 6px;
  flex-wrap: wrap;
  font-size: 0.85em;
  color: var(--app-text-muted);
}

.versions-panel {
  margin-top: 20px;
  padding: 16px;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  background: var(--app-card);
  box-shadow: var(--app-soft-shadow);
}

.versions-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}

.versions-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.versions-loading,
.versions-error,
.versions-empty {
  padding: 12px;
  text-align: center;
  color: var(--app-text-muted);
}

.versions-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.versions-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--app-border);
  background: var(--app-card-elevated);
}

.versions-item strong {
  display: block;
  font-size: 0.95em;
}

.versions-status {
  font-size: 0.8em;
  color: var(--app-text);
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(16, 185, 129, 0.12);
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

  /* 移动端步骤列表 */
  .steps-list {
    max-height: 60vh;
  }

  .step-header-row {
    flex-wrap: wrap;
  }

  .step-input {
    min-width: auto;
  }

  .step-fields-row {
    grid-template-columns: 1fr;
  }

  .step-actions {
    flex-direction: row;
    gap: 4px;
  }

  .btn-icon {
    padding: 4px 8px;
    font-size: 0.9em;
  }

  .steps-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .flow-cards {
    grid-template-columns: 1fr;
  }

  .steps-preview-list {
    padding: 8px;
  }

  .preview-step {
    font-size: 0.8em;
    gap: 6px;
  }

  .step-num {
    width: 18px;
    height: 18px;
    font-size: 0.65em;
  }

  .step-desc {
    font-size: 0.85em;
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
