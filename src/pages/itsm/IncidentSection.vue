<template>
  <div class="incident-section">
    <div class="section-header">
      <h2>事件管理</h2>
      <button @click="openCreate" class="btn-create">+ 新建工单</button>
    </div>

    <SearchFilter
      v-model:searchQuery="searchQuery"
      v-model:activeFilter="statusFilter"
      :filters="statusFilters"
      placeholder="搜索工单编号、标题或描述..."
    />

    <div class="filter-row">
      <select v-model="priorityFilter" class="mini-select">
        <option value="all">所有优先级</option>
        <option value="critical">紧急</option>
        <option value="high">高</option>
        <option value="medium">中</option>
        <option value="low">低</option>
      </select>
      <select v-model="categoryFilter" class="mini-select">
        <option value="all">所有分类</option>
        <option value="infrastructure">基础设施</option>
        <option value="software">软件</option>
        <option value="hardware">硬件</option>
        <option value="network">网络</option>
        <option value="security">安全</option>
        <option value="other">其他</option>
      </select>
    </div>

    <div v-if="filteredTickets.length === 0" class="empty-state">暂无工单</div>
    <div v-else class="tickets-grid">
      <TicketCard
        v-for="t in filteredTickets"
        :key="t.id"
        :ticket="t"
        :users="users"
        @view="openDetail"
      />
    </div>

    <!-- Create / Edit Modal -->
    <ItsmModal v-if="showForm" :title="editingTicket ? '编辑工单' : '新建工单'" size="medium" @close="closeForm">
      <TicketForm v-model="formData" :users="users" />
      <template #footer>
        <button @click="closeForm" class="btn-secondary">取消</button>
        <button @click="saveTicket" class="btn-primary">{{ editingTicket ? '保存' : '创建' }}</button>
      </template>
    </ItsmModal>

    <!-- Detail Modal -->
    <ItsmModal v-if="viewingTicket" :title="viewingTicket.ticketNo" size="large" @close="viewingTicket = null">
      <div class="detail-header">
        <h3>{{ viewingTicket.title }}</h3>
        <div class="detail-badges">
          <PriorityBadge :priority="viewingTicket.priority" />
          <StatusBadge :status="viewingTicket.status" />
        </div>
      </div>
      <div class="detail-meta">
        <span>分类: {{ getCategoryLabel(viewingTicket.category) }}</span>
        <span>报告人: {{ getUserName(viewingTicket.reporterId) }}</span>
        <span>指派: {{ getUserName(viewingTicket.assigneeId) }}</span>
        <span>创建: {{ formatDate(viewingTicket.createdAt) }}</span>
      </div>
      <div class="detail-desc">{{ viewingTicket.description }}</div>

      <div v-if="viewingTicket.attachments && viewingTicket.attachments.length" class="attachments-section">
        <h4>附件 ({{ viewingTicket.attachments.length }})</h4>
        <div class="attachments-list">
          <div v-for="(file, idx) in viewingTicket.attachments" :key="idx" class="attachment-item">
            <span class="file-icon">{{ getFileIcon(file.name) }}</span>
            <div class="file-info">
              <div class="file-name">{{ file.name }}</div>
              <div class="file-size">{{ formatSize(file.size) }}</div>
            </div>
            <div class="file-actions">
              <a :href="file.data" :download="file.name" class="btn-download" title="下载">⬇️</a>
              <button @click="removeAttachment(idx)" class="btn-remove" title="删除">🗑️</button>
            </div>
          </div>
        </div>
      </div>

      <div class="status-actions">
        <span class="action-label">状态操作:</span>
        <button v-if="viewingTicket.status === 'new'" @click="changeStatus('in_progress')" class="btn-sm btn-blue">开始处理</button>
        <button v-if="viewingTicket.status === 'in_progress'" @click="changeStatus('resolved')" class="btn-sm btn-green">标记解决</button>
        <button v-if="viewingTicket.status === 'in_progress'" @click="changeStatus('new')" class="btn-sm btn-gray">退回新建</button>
        <button v-if="viewingTicket.status === 'resolved'" @click="changeStatus('closed')" class="btn-sm btn-dark">关闭工单</button>
        <button v-if="viewingTicket.status === 'resolved'" @click="changeStatus('in_progress')" class="btn-sm btn-orange">重新处理</button>
        <button v-if="viewingTicket.status === 'closed'" @click="changeStatus('new')" class="btn-sm btn-blue">重新打开</button>
      </div>

      <TicketComments
        :comments="viewingTicket.comments || []"
        :users="users"
        :current-user-id="currentUserId"
        @add-comment="addComment"
      />

      <template #footer>
        <button @click="editFromDetail" class="btn-secondary">编辑</button>
        <button @click="deleteTicket" class="btn-danger">删除</button>
        <button @click="viewingTicket = null" class="btn-primary">关闭</button>
      </template>
    </ItsmModal>
  </div>
</template>

<script>
import SearchFilter from '../../components/itsm/SearchFilter.vue'
import TicketCard from '../../components/itsm/TicketCard.vue'
import TicketForm from '../../components/itsm/TicketForm.vue'
import TicketComments from '../../components/itsm/TicketComments.vue'
import ItsmModal from '../../components/itsm/ItsmModal.vue'
import StatusBadge from '../../components/itsm/StatusBadge.vue'
import PriorityBadge from '../../components/itsm/PriorityBadge.vue'

const CATEGORY_MAP = {
  infrastructure: '基础设施', software: '软件', hardware: '硬件',
  network: '网络', security: '安全', other: '其他'
}

export default {
  name: 'IncidentSection',
  components: { SearchFilter, TicketCard, TicketForm, TicketComments, ItsmModal, StatusBadge, PriorityBadge },
  props: {
    tickets: { type: Array, required: true },
    users: { type: Array, required: true },
    currentUserId: { type: String, required: true }
  },
  emits: ['create-ticket', 'update-ticket', 'delete-ticket'],
  data() {
    return {
      searchQuery: '',
      statusFilter: 'all',
      priorityFilter: 'all',
      categoryFilter: 'all',
      showForm: false,
      editingTicket: null,
      viewingTicket: null,
      formData: this.emptyForm(),
      statusFilters: [
        { value: 'all', label: '全部' },
        { value: 'new', label: '新建' },
        { value: 'in_progress', label: '处理中' },
        { value: 'resolved', label: '已解决' },
        { value: 'closed', label: '已关闭' }
      ]
    }
  },
  computed: {
    filteredTickets() {
      return this.tickets.filter(t => {
        const q = this.searchQuery ? this.searchQuery.toLowerCase() : ''
        const matchSearch = !q ||
          (t.ticketNo || '').toLowerCase().includes(q) ||
          (t.title || '').toLowerCase().includes(q) ||
          (t.description || '').toLowerCase().includes(q)
        const matchStatus = this.statusFilter === 'all' || t.status === this.statusFilter
        const matchPriority = this.priorityFilter === 'all' || t.priority === this.priorityFilter
        const matchCategory = this.categoryFilter === 'all' || t.category === this.categoryFilter
        return matchSearch && matchStatus && matchPriority && matchCategory
      }).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    }
  },
  methods: {
    emptyForm() {
      return { title: '', description: '', category: 'software', priority: 'medium', assigneeId: '', attachments: [] }
    },
    openCreate() {
      this.editingTicket = null
      this.formData = this.emptyForm()
      this.showForm = true
    },
    openDetail(ticket) {
      this.viewingTicket = JSON.parse(JSON.stringify(ticket))
    },
    closeForm() {
      this.showForm = false
      this.editingTicket = null
    },
    saveTicket() {
      if (!this.formData.title.trim() || !this.formData.description.trim()) {
        alert('请填写标题和描述')
        return
      }
      if (this.editingTicket) {
        this.$emit('update-ticket', { ...this.editingTicket, ...this.formData, updatedAt: Date.now() })
      } else {
        this.$emit('create-ticket', { ...this.formData })
      }
      this.closeForm()
    },
    editFromDetail() {
      this.editingTicket = this.viewingTicket
      this.formData = {
        title: this.viewingTicket.title,
        description: this.viewingTicket.description,
        category: this.viewingTicket.category,
        priority: this.viewingTicket.priority,
        assigneeId: this.viewingTicket.assigneeId
      }
      this.viewingTicket = null
      this.showForm = true
    },
    deleteTicket() {
      if (confirm('确定删除此工单？')) {
        this.$emit('delete-ticket', this.viewingTicket.id)
        this.viewingTicket = null
      }
    },
    changeStatus(status) {
      const updates = { status, updatedAt: Date.now() }
      if (status === 'resolved') updates.resolvedAt = Date.now()
      if (status === 'closed') updates.closedAt = Date.now()
      this.$emit('update-ticket', { ...this.viewingTicket, ...updates })
      this.viewingTicket = { ...this.viewingTicket, ...updates }
    },
    addComment(text) {
      const comment = { id: 'c' + Date.now(), userId: this.currentUserId, text, createdAt: Date.now() }
      const updated = { ...this.viewingTicket, comments: [...(this.viewingTicket.comments || []), comment], updatedAt: Date.now() }
      this.$emit('update-ticket', updated)
      this.viewingTicket = updated
    },
    getUserName(id) {
      const user = this.users.find(u => u.id === id)
      return user ? user.avatar + ' ' + user.name : '未分配'
    },
    getCategoryLabel(cat) {
      return CATEGORY_MAP[cat] || cat
    },
    formatDate(ts) {
      return new Date(ts).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    },
    removeAttachment(idx) {
      if (confirm('确定删除此附件？')) {
        const attachments = [...this.viewingTicket.attachments]
        attachments.splice(idx, 1)
        this.$emit('update-ticket', { ...this.viewingTicket, attachments, updatedAt: Date.now() })
        this.viewingTicket = { ...this.viewingTicket, attachments }
      }
    },
    getFileIcon(name) {
      const ext = name.split('.').pop().toLowerCase()
      const icons = {
        pdf: '📄', doc: '📄', docx: '📄', txt: '📝',
        jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️',
        zip: '📦', rar: '📦', '7z': '📦',
        xls: '📊', xlsx: '📊', csv: '📊',
        ppt: '📽️', pptx: '📽️'
      }
      return icons[ext] || '📎'
    },
    formatSize(bytes) {
      if (bytes < 1024) return bytes + 'B'
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB'
      return (bytes / (1024 * 1024)).toFixed(1) + 'MB'
    }
  }
}
</script>

<style scoped>
.incident-section { animation: fadeIn 0.4s ease; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-header h2 { margin: 0; color: #333; font-size: 1.4em; }

.btn-create {
  padding: 10px 22px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-create:hover { background: #2563eb; transform: translateY(-1px); }

.filter-row {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.mini-select {
  padding: 8px 12px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.85em;
  background: white;
  cursor: pointer;
}
.mini-select:focus { outline: none; border-color: #3b82f6; }

.tickets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 16px;
}

.empty-state { text-align: center; padding: 60px 20px; color: #999; font-size: 1.1em; }

/* Detail modal styles */
.detail-header { margin-bottom: 16px; }
.detail-header h3 { margin: 0 0 10px; color: #333; font-size: 1.2em; }
.detail-badges { display: flex; gap: 8px; }
.detail-meta { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 16px; font-size: 0.85em; color: #666; }
.detail-desc { background: #f9fafb; padding: 16px; border-radius: 8px; color: #555; line-height: 1.6; margin-bottom: 16px; white-space: pre-wrap; }

.attachments-section { margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #e5e7eb; }
.attachments-section h4 { margin: 0 0 12px; color: #333; font-size: 0.95em; }
.attachments-list { display: flex; flex-direction: column; gap: 8px; }
.attachment-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; }
.file-icon { font-size: 1.5em; }
.file-info { flex: 1; min-width: 0; }
.file-name { font-weight: 600; color: #333; font-size: 0.9em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.file-size { font-size: 0.8em; color: #999; margin-top: 2px; }
.file-actions { display: flex; gap: 6px; }
.btn-download { background: #3b82f6; color: white; border: none; border-radius: 4px; padding: 4px 8px; cursor: pointer; text-decoration: none; font-size: 0.9em; transition: background 0.2s; }
.btn-download:hover { background: #2563eb; }
.btn-remove { background: none; border: none; color: #ef4444; cursor: pointer; padding: 4px 8px; border-radius: 4px; transition: background 0.2s; }
.btn-remove:hover { background: rgba(239, 68, 68, 0.1); }

.status-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 16px;
  padding: 12px;
  background: #f9fafb;
  border-radius: 8px;
}

.action-label { font-weight: 600; color: #333; font-size: 0.9em; margin-right: 4px; }

.btn-sm {
  padding: 6px 14px;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.85em;
  cursor: pointer;
  transition: all 0.2s;
  color: white;
}
.btn-blue { background: #3b82f6; }
.btn-blue:hover { background: #2563eb; }
.btn-green { background: #10b981; }
.btn-green:hover { background: #059669; }
.btn-gray { background: #9ca3af; }
.btn-gray:hover { background: #6b7280; }
.btn-dark { background: #374151; }
.btn-dark:hover { background: #1f2937; }
.btn-orange { background: #f59e0b; }
.btn-orange:hover { background: #d97706; }

.btn-primary {
  padding: 8px 20px; background: #3b82f6; color: white;
  border: none; border-radius: 8px; font-weight: 600; cursor: pointer;
}
.btn-primary:hover { background: #2563eb; }
.btn-secondary {
  padding: 8px 20px; background: #e5e7eb; color: #333;
  border: none; border-radius: 8px; font-weight: 600; cursor: pointer;
}
.btn-secondary:hover { background: #d1d5db; }
.btn-danger {
  padding: 8px 20px; background: #ef4444; color: white;
  border: none; border-radius: 8px; font-weight: 600; cursor: pointer;
}
.btn-danger:hover { background: #dc2626; }

@media (max-width: 1024px) {
  .tickets-grid {
    grid-template-columns: 1fr;
  }

  .filter-row {
    flex-direction: column;
  }

  .mini-select {
    width: 100%;
  }
}

@media (max-width: 768px) {
  .incident-section {
    padding: 0;
  }

  .section-header {
    flex-direction: column;
    gap: 10px;
    align-items: stretch;
  }

  .section-header h2 {
    font-size: 1.1em;
    margin-bottom: 0;
  }

  .btn-create {
    width: 100%;
    padding: 10px 16px;
    font-size: 0.9em;
  }

  .filter-row {
    flex-direction: column;
    gap: 8px;
  }

  .mini-select {
    width: 100%;
    padding: 8px 10px;
    font-size: 0.85em;
  }

  .tickets-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .detail-header {
    flex-direction: column;
    gap: 8px;
  }

  .detail-badges {
    width: 100%;
    flex-wrap: wrap;
  }

  .detail-meta {
    gap: 8px;
    font-size: 0.8em;
    flex-direction: column;
  }

  .detail-desc {
    padding: 12px;
    font-size: 0.85em;
  }

  .status-actions {
    flex-wrap: wrap;
    gap: 6px;
    padding: 8px;
  }

  .btn-sm {
    padding: 5px 10px;
    font-size: 0.75em;
  }

  .btn-primary, .btn-secondary, .btn-danger {
    padding: 6px 16px;
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

  .mini-select {
    font-size: 0.8em;
  }

  .detail-header h3 {
    font-size: 1em;
  }

  .detail-meta {
    font-size: 0.75em;
  }

  .btn-sm {
    padding: 4px 8px;
    font-size: 0.7em;
  }

  .btn-primary, .btn-secondary, .btn-danger {
    padding: 5px 12px;
    font-size: 0.75em;
  }

  .action-label {
    font-size: 0.8em;
  }
}
</style>
