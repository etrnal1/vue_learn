<template>
  <div class="process-flow-section">
    <div class="section-header">
      <h2>流程管理</h2>
      <button @click="openCreate" class="btn-create">+ 新建流程</button>
    </div>

    <SearchFilter
      v-model:searchQuery="searchQuery"
      :filters="[]"
      placeholder="搜索流程名称..."
    />

    <div v-if="filteredFlows.length === 0" class="empty-state">暂无流程</div>
    <div v-else class="flows-grid">
      <div v-for="flow in filteredFlows" :key="flow.id" class="flow-card" @click="openDetail(flow)">
        <div class="flow-header">
          <span class="flow-icon">{{ flow.icon }}</span>
          <h4>{{ flow.name }}</h4>
        </div>
        <p class="flow-desc">{{ flow.description }}</p>
        <div class="flow-footer">
          <span class="step-count">{{ flow.steps.length }} 个步骤</span>
          <span class="author">{{ getAuthorName(flow.authorId) }}</span>
        </div>
      </div>
    </div>

    <!-- Create / Edit Modal -->
    <ItsmModal v-if="showForm" :title="editingFlow ? '编辑流程' : '新建流程'" size="large" @close="closeForm">
      <div class="form-group">
        <label>流程名称 *</label>
        <input v-model="formData.name" type="text" class="input-field" placeholder="如: 工单处理流程">
      </div>
      <div class="form-group">
        <label>流程图标</label>
        <div class="icon-picker">
          <span
            v-for="icon in ['🔄', '📊', '🎯', '⚙️', '🚀', '📋', '✅', '⏳', '🔴', '🟡', '🟢', '🔵']"
            :key="icon"
            class="icon-option"
            :class="{ active: formData.icon === icon }"
            @click="formData.icon = icon"
          >{{ icon }}</span>
        </div>
      </div>
      <div class="form-group">
        <label>描述</label>
        <textarea v-model="formData.description" class="textarea-field" rows="2" placeholder="简要描述此流程的用途"></textarea>
      </div>

      <div class="steps-section">
        <div class="steps-header">
          <h3>流程步骤</h3>
          <button @click="addStep" class="btn-sm">+ 添加步骤</button>
        </div>
        <div v-if="formData.steps.length === 0" class="empty-hint">还没有步骤，请添加</div>
        <div v-else class="steps-list">
          <div v-for="(step, idx) in formData.steps" :key="idx" class="step-item">
            <div class="step-num">{{ idx + 1 }}</div>
            <div class="step-content">
              <input v-model="step.title" class="step-input" placeholder="步骤标题">
              <textarea v-model="step.description" class="step-textarea" rows="2" placeholder="步骤描述"></textarea>
            </div>
            <div class="step-actions">
              <button v-if="idx > 0" @click="moveStep(idx, -1)" class="btn-icon">⬆️</button>
              <button v-if="idx < formData.steps.length - 1" @click="moveStep(idx, 1)" class="btn-icon">⬇️</button>
              <button @click="removeStep(idx)" class="btn-icon delete">🗑️</button>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <button @click="closeForm" class="btn-secondary">取消</button>
        <button @click="saveFlow" class="btn-primary">{{ editingFlow ? '保存' : '创建' }}</button>
      </template>
    </ItsmModal>

    <!-- Detail Modal -->
    <ItsmModal v-if="viewingFlow" :title="viewingFlow.name" size="large" @close="viewingFlow = null">
      <div class="flow-detail">
        <div class="detail-header">
          <span class="icon">{{ viewingFlow.icon }}</span>
          <div class="detail-info">
            <h3>{{ viewingFlow.name }}</h3>
            <p>{{ viewingFlow.description }}</p>
            <div class="detail-meta">
              <span>{{ getAuthorName(viewingFlow.authorId) }} · {{ formatDate(viewingFlow.updatedAt) }}</span>
            </div>
          </div>
        </div>

        <div class="flow-timeline">
          <div v-for="(step, idx) in viewingFlow.steps" :key="idx" class="timeline-item">
            <div class="timeline-node">{{ idx + 1 }}</div>
            <div class="timeline-content">
              <h4>{{ step.title }}</h4>
              <p>{{ step.description }}</p>
            </div>
            <div v-if="idx < viewingFlow.steps.length - 1" class="timeline-arrow">⬇️</div>
          </div>
        </div>
      </div>

      <template #footer>
        <button @click="editFromDetail" class="btn-secondary">编辑</button>
        <button @click="deleteFlow" class="btn-danger">删除</button>
        <button @click="viewingFlow = null" class="btn-primary">关闭</button>
      </template>
    </ItsmModal>
  </div>
</template>

<script>
import SearchFilter from '../../components/itsm/SearchFilter.vue'
import ItsmModal from '../../components/itsm/ItsmModal.vue'

export default {
  name: 'ProcessFlowSection',
  components: { SearchFilter, ItsmModal },
  props: {
    flows: { type: Array, required: true },
    users: { type: Array, required: true },
    currentUserId: { type: String, required: true }
  },
  emits: ['create-flow', 'update-flow', 'delete-flow'],
  data() {
    return {
      searchQuery: '',
      showForm: false,
      editingFlow: null,
      viewingFlow: null,
      formData: this.emptyForm()
    }
  },
  computed: {
    filteredFlows() {
      return this.flows.filter(f => {
        const q = this.searchQuery.toLowerCase()
        return !q || f.name.toLowerCase().includes(q) || f.description.toLowerCase().includes(q)
      }).sort((a, b) => b.updatedAt - a.updatedAt)
    }
  },
  methods: {
    emptyForm() {
      return { name: '', description: '', icon: '🔄', steps: [] }
    },
    openCreate() {
      this.editingFlow = null
      this.formData = this.emptyForm()
      this.showForm = true
    },
    openDetail(flow) {
      this.viewingFlow = JSON.parse(JSON.stringify(flow))
    },
    closeForm() {
      this.showForm = false
      this.editingFlow = null
      this.formData = this.emptyForm()
    },
    addStep() {
      this.formData.steps.push({ title: '', description: '' })
    },
    removeStep(idx) {
      this.formData.steps.splice(idx, 1)
    },
    moveStep(idx, direction) {
      const newIdx = idx + direction
      const temp = this.formData.steps[idx]
      this.formData.steps[idx] = this.formData.steps[newIdx]
      this.formData.steps[newIdx] = temp
    },
    saveFlow() {
      if (!this.formData.name.trim()) {
        alert('请填写流程名称')
        return
      }
      if (this.formData.steps.length === 0) {
        alert('请至少添加一个步骤')
        return
      }
      if (this.editingFlow) {
        this.$emit('update-flow', { ...this.editingFlow, ...this.formData, updatedAt: Date.now() })
      } else {
        this.$emit('create-flow', { ...this.formData })
      }
      this.closeForm()
    },
    editFromDetail() {
      this.editingFlow = this.viewingFlow
      this.formData = {
        name: this.viewingFlow.name,
        description: this.viewingFlow.description,
        icon: this.viewingFlow.icon,
        steps: JSON.parse(JSON.stringify(this.viewingFlow.steps))
      }
      this.viewingFlow = null
      this.showForm = true
    },
    deleteFlow() {
      if (confirm('确定删除此流程？')) {
        this.$emit('delete-flow', this.viewingFlow.id)
        this.viewingFlow = null
      }
    },
    getAuthorName(id) {
      const user = this.users.find(u => u.id === id)
      return user ? user.avatar + ' ' + user.name : '未知'
    },
    formatDate(ts) {
      return new Date(ts).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    }
  }
}
</script>

<style scoped>
.process-flow-section { animation: fadeIn 0.4s ease; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.section-header {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;
}
.section-header h2 { margin: 0; color: #333; font-size: 1.4em; }

.btn-create {
  padding: 10px 22px; background: #6366f1; color: white;
  border: none; border-radius: 8px; font-weight: 700; cursor: pointer;
}
.btn-create:hover { background: #4f46e5; }

.flows-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.flow-card {
  background: white;
  border-radius: 10px;
  padding: 18px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid #e5e7eb;
  cursor: pointer;
  transition: all 0.3s;
}

.flow-card:hover {
  border-color: #6366f1;
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.12);
  transform: translateY(-2px);
}

.flow-header {
  display: flex; align-items: center; gap: 10px; margin-bottom: 10px;
}
.flow-icon { font-size: 1.8em; }
.flow-header h4 { margin: 0; color: #333; font-size: 1em; }

.flow-desc {
  color: #888; font-size: 0.85em; margin: 0 0 12px;
  line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2;
  -webkit-box-orient: vertical; overflow: hidden;
}

.flow-footer {
  display: flex; gap: 12px; font-size: 0.8em; color: #999;
}

.empty-state { text-align: center; padding: 60px 20px; color: #999; }

/* Form styles */
.form-group { margin-bottom: 16px; }
.form-group label { display: block; margin-bottom: 6px; font-weight: 600; color: #333; font-size: 0.9em; }

.input-field {
  width: 100%; padding: 10px 12px; border: 2px solid #e5e7eb; border-radius: 8px;
  font-size: 0.95em; font-family: inherit; transition: all 0.3s;
}
.input-field:focus { outline: none; border-color: #6366f1; }

.textarea-field {
  width: 100%; padding: 10px 12px; border: 2px solid #e5e7eb; border-radius: 8px;
  font-size: 0.95em; font-family: inherit; resize: vertical;
}
.textarea-field:focus { outline: none; border-color: #6366f1; }

.icon-picker {
  display: flex; gap: 8px; flex-wrap: wrap;
}

.icon-option {
  font-size: 1.8em; cursor: pointer; padding: 6px 10px; border-radius: 8px;
  border: 2px solid transparent; transition: all 0.2s;
}
.icon-option:hover { background: #f3f4f6; }
.icon-option.active { border-color: #6366f1; background: #eef2ff; }

.steps-section {
  border-top: 2px solid #f0f0f0; padding-top: 16px; margin-top: 16px;
}

.steps-header {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;
}
.steps-header h3 { margin: 0; color: #333; font-size: 1em; }

.btn-sm {
  padding: 6px 14px; background: #6366f1; color: white;
  border: none; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 0.85em;
}
.btn-sm:hover { background: #4f46e5; }

.empty-hint { text-align: center; color: #ccc; padding: 16px; }

.steps-list { display: flex; flex-direction: column; gap: 12px; }

.step-item {
  display: flex; gap: 12px; padding: 12px; background: #f9fafb;
  border: 1px solid #e5e7eb; border-radius: 8px;
}

.step-num {
  background: #6366f1; color: white; width: 32px; height: 32px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 6px; font-weight: 700; flex-shrink: 0;
}

.step-content { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }

.step-input {
  width: 100%; padding: 8px 10px; border: 1px solid #e5e7eb; border-radius: 6px;
  font-size: 0.9em; font-family: inherit;
}
.step-input:focus { outline: none; border-color: #6366f1; }

.step-textarea {
  width: 100%; padding: 8px 10px; border: 1px solid #e5e7eb; border-radius: 6px;
  font-size: 0.85em; font-family: inherit; resize: vertical;
}
.step-textarea:focus { outline: none; border-color: #6366f1; }

.step-actions { display: flex; gap: 4px; flex-direction: column; }

.btn-icon {
  background: white; border: 1px solid #e5e7eb; padding: 4px 8px;
  border-radius: 4px; cursor: pointer; font-size: 0.9em; transition: all 0.2s;
}
.btn-icon:hover { border-color: #6366f1; }
.btn-icon.delete:hover { border-color: #ef4444; color: #ef4444; }

/* Detail modal */
.flow-detail { }

.detail-header {
  display: flex; gap: 16px; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #f0f0f0;
}

.icon { font-size: 3em; }

.detail-info { flex: 1; }

.detail-info h3 { margin: 0 0 6px; color: #333; font-size: 1.3em; }
.detail-info p { margin: 0; color: #888; font-size: 0.9em; }
.detail-meta { margin-top: 10px; font-size: 0.8em; color: #999; }

.flow-timeline {
  display: flex; flex-direction: column; gap: 20px; margin: 20px 0;
}

.timeline-item {
  position: relative; padding-left: 50px;
}

.timeline-node {
  position: absolute; left: 0; top: 0;
  background: #6366f1; color: white; width: 40px; height: 40px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 50%; font-weight: 700;
}

.timeline-content {
  background: #f9fafb; padding: 16px; border-radius: 8px; border-left: 4px solid #6366f1;
}

.timeline-content h4 { margin: 0 0 6px; color: #333; }
.timeline-content p { margin: 0; color: #666; font-size: 0.9em; line-height: 1.5; }

.timeline-arrow {
  position: absolute; left: 15px; top: 50px; color: #ccc;
}

.btn-primary { padding: 8px 20px; background: #6366f1; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; }
.btn-secondary { padding: 8px 20px; background: #e5e7eb; color: #333; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; }
.btn-danger { padding: 8px 20px; background: #ef4444; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; }

@media (max-width: 1024px) {
  .flows-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .process-flow-section {
    padding: 0;
  }

  .section-header {
    flex-direction: column;
    gap: 10px;
    align-items: stretch;
  }

  .section-header h2 {
    font-size: 1.1em;
  }

  .btn-create {
    width: 100%;
    padding: 10px 16px;
    font-size: 0.9em;
  }

  .flows-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .flow-header {
    gap: 8px;
  }

  .flow-icon {
    font-size: 1.5em;
  }

  .flow-header h4 {
    font-size: 0.95em;
  }

  .flow-desc {
    font-size: 0.8em;
  }

  .flow-footer {
    font-size: 0.75em;
    gap: 8px;
  }

  .detail-header {
    flex-direction: column;
    gap: 12px;
  }

  .icon {
    font-size: 2.5em;
  }

  .detail-info h3 {
    font-size: 1em;
  }

  .detail-info p {
    font-size: 0.85em;
  }

  .flow-timeline {
    gap: 16px;
  }

  .timeline-node {
    width: 36px;
    height: 36px;
    font-size: 0.9em;
  }

  .timeline-item {
    padding-left: 44px;
  }

  .timeline-content h4 {
    font-size: 0.95em;
  }

  .timeline-content p {
    font-size: 0.8em;
  }

  .steps-header {
    gap: 8px;
  }

  .steps-header h3 {
    font-size: 0.95em;
  }

  .btn-sm {
    padding: 6px 12px;
    font-size: 0.85em;
  }

  .step-item {
    gap: 8px;
    padding: 10px;
  }

  .step-num {
    width: 28px;
    height: 28px;
    font-size: 0.85em;
  }

  .step-input, .step-textarea {
    font-size: 0.85em;
  }

  .btn-primary, .btn-secondary {
    padding: 6px 14px;
    font-size: 0.85em;
  }

  .btn-danger {
    padding: 6px 14px;
    font-size: 0.85em;
  }
}

@media (max-width: 480px) {
  .section-header h2 {
    font-size: 1em;
  }

  .btn-create {
    font-size: 0.85em;
  }

  .flow-header h4 {
    font-size: 0.9em;
  }

  .flow-desc {
    font-size: 0.75em;
  }

  .detail-header {
    gap: 8px;
  }

  .icon {
    font-size: 2em;
  }

  .detail-info h3 {
    font-size: 0.95em;
  }

  .detail-info p {
    font-size: 0.8em;
  }

  .flow-timeline {
    gap: 12px;
  }

  .timeline-node {
    width: 32px;
    height: 32px;
    font-size: 0.8em;
  }

  .timeline-item {
    padding-left: 40px;
  }

  .timeline-content h4 {
    font-size: 0.9em;
  }

  .timeline-content p {
    font-size: 0.75em;
  }

  .step-item {
    gap: 6px;
    padding: 8px;
  }

  .step-num {
    width: 24px;
    height: 24px;
    font-size: 0.75em;
  }

  .step-input, .step-textarea {
    font-size: 0.8em;
  }

  .btn-sm {
    padding: 4px 8px;
    font-size: 0.75em;
  }

  .btn-primary, .btn-secondary, .btn-danger {
    padding: 5px 12px;
    font-size: 0.75em;
  }
}
</style>
