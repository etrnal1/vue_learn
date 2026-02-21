<template>
  <div class="sr-section">
    <div class="section-header">
      <h2>服务请求</h2>
      <div class="header-actions">
        <button
          class="view-toggle"
          :class="{ active: viewMode === 'catalog' }"
          @click="viewMode = 'catalog'"
        >服务目录</button>
        <button
          class="view-toggle"
          :class="{ active: viewMode === 'list' }"
          @click="viewMode = 'list'"
        >我的请求</button>
      </div>
    </div>

    <div v-if="viewMode === 'catalog'" class="catalog-grid">
      <ServiceCatalogCard
        v-for="s in catalogItems"
        :key="s.id || s.serviceType"
        :service="s"
        @select="openCreateFromCatalog"
      />
    </div>

    <div v-else>
      <SearchFilter
        v-model:searchQuery="searchQuery"
        v-model:activeFilter="statusFilter"
        :filters="statusFilters"
        placeholder="搜索请求编号或标题..."
      />

      <div v-if="filteredRequests.length === 0" class="empty-state">暂无服务请求</div>
      <div v-else class="requests-grid">
        <ServiceRequestCard
          v-for="r in filteredRequests"
          :key="r.id"
          :request="r"
          :users="users"
          @view="openDetail"
        />
      </div>
    </div>

    <ItsmModal v-if="showForm" title="提交服务请求" size="medium" @close="closeCreateForm">
      <ServiceRequestForm v-model="formData" :catalog-item="selectedCatalogItem" />
      <template #footer>
        <button @click="closeCreateForm" class="btn-secondary">取消</button>
        <button @click="saveDraft" class="btn-gray">保存草稿</button>
        <button @click="submitRequest" class="btn-primary">提交请求</button>
      </template>
    </ItsmModal>

    <ItsmModal v-if="viewingRequest" :title="viewingRequest.requestNo" size="large" @close="viewingRequest = null">
      <div class="detail-header">
        <h3>{{ viewingRequest.title }}</h3>
        <StatusBadge :status="viewingRequest.status" />
      </div>
      <div class="detail-meta">
        <span>类型: {{ getServiceTypeLabel(viewingRequest.serviceType) }}</span>
        <span>请求人: {{ getUserName(viewingRequest.requesterId) }}</span>
        <span>审批人: {{ getUserName(viewingRequest.approverId) }}</span>
        <span>处理人: {{ getUserName(viewingRequest.assigneeId) }}</span>
        <PriorityBadge :priority="viewingRequest.priority" />
      </div>
      <div class="detail-desc">{{ viewingRequest.description }}</div>
      <div v-if="hasFormData(normalizedFormData(viewingRequest.formData))" class="extra-fields">
        <h4>扩展字段</h4>
        <div v-for="(value, key) in normalizedFormData(viewingRequest.formData)" :key="key" class="extra-field-row">
          <span class="k">{{ key }}</span>
          <span class="v">{{ value }}</span>
        </div>
      </div>

      <div v-if="viewingRequest.approvalNote" class="approval-note">
        <strong>审批意见:</strong> {{ viewingRequest.approvalNote }}
      </div>

      <div class="status-actions">
        <span class="action-label">操作:</span>
        <button v-if="viewingRequest.status === 'draft'" @click="submitExisting" class="btn-sm btn-blue">提交</button>
        <button v-if="viewingRequest.status === 'submitted' && isApprover" @click="showApprovalDialog = true" class="btn-sm btn-green">审批</button>
        <button v-if="viewingRequest.status === 'submitted' && isApprover" @click="rejectRequest" class="btn-sm btn-red">拒绝</button>
        <button v-if="viewingRequest.status === 'approved'" @click="changeStatus('in_progress')" class="btn-sm btn-blue">开始处理</button>
        <button v-if="viewingRequest.status === 'in_progress'" @click="changeStatus('completed')" class="btn-sm btn-green">完成</button>
      </div>

      <template #footer>
        <button v-if="viewingRequest.status === 'draft'" @click="deleteRequest" class="btn-danger">删除</button>
        <button @click="viewingRequest = null" class="btn-primary">关闭</button>
      </template>
    </ItsmModal>

    <ItsmModal v-if="showApprovalDialog" title="审批意见" size="small" @close="showApprovalDialog = false">
      <div class="form-group">
        <label>审批意见</label>
        <textarea v-model="approvalNote" class="textarea-field" rows="3" placeholder="请输入审批意见..."></textarea>
      </div>
      <template #footer>
        <button @click="showApprovalDialog = false" class="btn-secondary">取消</button>
        <button @click="approveRequest" class="btn-primary">确认审批</button>
      </template>
    </ItsmModal>
  </div>
</template>

<script>
import SearchFilter from '../../components/itsm/SearchFilter.vue'
import ServiceCatalogCard from '../../components/itsm/ServiceCatalogCard.vue'
import ServiceRequestCard from '../../components/itsm/ServiceRequestCard.vue'
import ServiceRequestForm from '../../components/itsm/ServiceRequestForm.vue'
import ItsmModal from '../../components/itsm/ItsmModal.vue'
import StatusBadge from '../../components/itsm/StatusBadge.vue'
import PriorityBadge from '../../components/itsm/PriorityBadge.vue'

const SERVICE_TYPE_MAP = {
  account: '账号管理', software_install: '软件安装', hardware: '硬件申请',
  permission: '权限申请', vpn: 'VPN 配置', email: '邮箱服务', other: '其他'
}

const DEFAULT_SERVICE_CATALOG = [
  { id: 'account', serviceType: 'account', icon: '👤', name: '账号管理', description: '创建、修改或删除系统账号', titleTemplate: '账号管理 - ', defaultPriority: 'medium', requiresApproval: true },
  { id: 'software_install', serviceType: 'software_install', icon: '💿', name: '软件安装', description: '申请安装或更新软件', titleTemplate: '软件安装 - ', defaultPriority: 'medium', requiresApproval: true },
  { id: 'hardware', serviceType: 'hardware', icon: '🖥️', name: '硬件申请', description: '申请电脑、显示器等设备', titleTemplate: '硬件申请 - ', defaultPriority: 'high', requiresApproval: true },
  { id: 'permission', serviceType: 'permission', icon: '🔑', name: '权限申请', description: '申请系统或文件夹访问权限', titleTemplate: '权限申请 - ', defaultPriority: 'high', requiresApproval: true },
  { id: 'vpn', serviceType: 'vpn', icon: '🔒', name: 'VPN 配置', description: '申请 VPN 账号或排障', titleTemplate: 'VPN 配置 - ', defaultPriority: 'medium', requiresApproval: false },
  { id: 'email', serviceType: 'email', icon: '📧', name: '邮箱服务', description: '邮箱创建、密码重置、邮件组', titleTemplate: '邮箱服务 - ', defaultPriority: 'low', requiresApproval: false },
  { id: 'other', serviceType: 'other', icon: '📝', name: '其他', description: '其他 IT 服务请求', titleTemplate: '其他请求 - ', defaultPriority: 'medium', requiresApproval: true }
]

export default {
  name: 'ServiceRequestSection',
  components: { SearchFilter, ServiceCatalogCard, ServiceRequestCard, ServiceRequestForm, ItsmModal, StatusBadge, PriorityBadge },
  props: {
    requests: { type: Array, required: true },
    users: { type: Array, required: true },
    currentUserId: { type: String, required: true },
    serviceCatalog: { type: Array, default: () => [] }
  },
  emits: ['create-request', 'update-request', 'delete-request'],
  data() {
    return {
      viewMode: 'catalog',
      searchQuery: '',
      statusFilter: 'all',
      showForm: false,
      viewingRequest: null,
      showApprovalDialog: false,
      approvalNote: '',
      selectedCatalogItem: null,
      formData: this.emptyForm(),
      statusFilters: [
        { value: 'all', label: '全部' },
        { value: 'draft', label: '草稿' },
        { value: 'submitted', label: '已提交' },
        { value: 'approved', label: '已审批' },
        { value: 'in_progress', label: '处理中' },
        { value: 'completed', label: '已完成' },
        { value: 'rejected', label: '已拒绝' }
      ]
    }
  },
  computed: {
    catalogItems() {
      const source = this.serviceCatalog.length > 0 ? this.serviceCatalog : DEFAULT_SERVICE_CATALOG
      return source
        .filter(item => item.isActive !== false)
        .map((item) => ({
        ...item,
        serviceType: item.serviceType || item.id
      }))
    },
    filteredRequests() {
      return this.requests.filter(r => {
        const q = this.searchQuery ? this.searchQuery.toLowerCase() : ''
        const matchSearch = !q ||
          (r.requestNo || '').toLowerCase().includes(q) ||
          (r.title || '').toLowerCase().includes(q)
        const matchStatus = this.statusFilter === 'all' || r.status === this.statusFilter
        return matchSearch && matchStatus
      }).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    },
    isApprover() {
      const user = this.users.find(u => u.id === this.currentUserId)
      return user && (user.role === 'approver' || user.role === 'admin')
    }
  },
  methods: {
    emptyForm() {
      return { serviceType: 'other', title: '', description: '', priority: 'medium', formData: {} }
    },
    closeCreateForm() {
      this.showForm = false
      this.selectedCatalogItem = null
      this.formData = this.emptyForm()
    },
    openCreateFromCatalog(service) {
      this.selectedCatalogItem = service
      this.formData = {
        ...this.emptyForm(),
        serviceType: service.serviceType || service.id || 'other',
        title: service.titleTemplate || (service.name ? `${service.name} - ` : ''),
        priority: service.defaultPriority || 'medium',
        formData: {}
      }
      this.showForm = true
    },
    openDetail(request) {
      this.viewingRequest = JSON.parse(JSON.stringify(request))
    },
    saveDraft() {
      if (!this.formData.title.trim()) { alert('请填写标题'); return }
      this.$emit('create-request', { ...this.formData, status: 'draft' })
      this.closeCreateForm()
    },
    submitRequest() {
      if (!this.formData.title.trim() || !this.formData.description.trim()) { alert('请填写标题和描述'); return }
      if (this.hasMissingRequiredDynamicFields()) { return }
      this.$emit('create-request', { ...this.formData, status: 'submitted' })
      this.closeCreateForm()
    },
    hasMissingRequiredDynamicFields() {
      const schema = Array.isArray(this.selectedCatalogItem?.formSchema) ? this.selectedCatalogItem.formSchema : []
      for (const field of schema) {
        if (!field?.required) continue
        const value = (this.formData.formData || {})[field.key]
        if (value === undefined || value === null || String(value).trim() === '') {
          alert(`请填写必填字段: ${field.label}`)
          return true
        }
      }
      return false
    },
    hasFormData(formData) {
      return formData && typeof formData === 'object' && Object.keys(formData).length > 0
    },
    normalizedFormData(raw) {
      if (!raw) return {}
      if (typeof raw === 'string') {
        try {
          const parsed = JSON.parse(raw)
          return parsed && typeof parsed === 'object' ? parsed : {}
        } catch (error) {
          return {}
        }
      }
      return raw && typeof raw === 'object' ? raw : {}
    },
    submitExisting() {
      this.changeStatus('submitted')
    },
    approveRequest() {
      const updates = {
        status: 'approved',
        approverId: this.currentUserId,
        approvalNote: this.approvalNote,
        approvedAt: Date.now(),
        updatedAt: Date.now()
      }
      this.$emit('update-request', { ...this.viewingRequest, ...updates })
      this.viewingRequest = { ...this.viewingRequest, ...updates }
      this.showApprovalDialog = false
      this.approvalNote = ''
    },
    rejectRequest() {
      const note = prompt('请输入拒绝原因:')
      if (note === null) return
      const updates = {
        status: 'rejected',
        approverId: this.currentUserId,
        approvalNote: note,
        updatedAt: Date.now()
      }
      this.$emit('update-request', { ...this.viewingRequest, ...updates })
      this.viewingRequest = { ...this.viewingRequest, ...updates }
    },
    changeStatus(status) {
      const updates = { status, updatedAt: Date.now() }
      if (status === 'completed') updates.completedAt = Date.now()
      if (status === 'in_progress') updates.assigneeId = this.currentUserId
      this.$emit('update-request', { ...this.viewingRequest, ...updates })
      this.viewingRequest = { ...this.viewingRequest, ...updates }
    },
    deleteRequest() {
      if (confirm('确定删除此请求？')) {
        this.$emit('delete-request', this.viewingRequest.id)
        this.viewingRequest = null
      }
    },
    getUserName(id) {
      if (!id) return '未指定'
      const user = this.users.find(u => u.id === id)
      return user ? user.avatar + ' ' + user.name : '未知'
    },
    getServiceTypeLabel(type) {
      return SERVICE_TYPE_MAP[type] || type
    }
  }
}
</script>

<style scoped>
.sr-section { animation: fadeIn 0.4s ease; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-header h2 { margin: 0; color: #333; font-size: 1.4em; }

.header-actions { display: flex; gap: 8px; }

.view-toggle {
  padding: 8px 18px;
  border: 2px solid #e5e7eb;
  background: white;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  color: #666;
  transition: all 0.2s;
}
.view-toggle.active {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.catalog-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.requests-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 16px;
}

.empty-state { text-align: center; padding: 60px 20px; color: #999; font-size: 1.1em; }

.detail-header { margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start; }
.detail-header h3 { margin: 0; color: #333; font-size: 1.2em; }
.detail-meta { display: flex; gap: 14px; flex-wrap: wrap; margin-bottom: 16px; font-size: 0.85em; color: #666; align-items: center; }
.detail-desc { background: #f9fafb; padding: 16px; border-radius: 8px; color: #555; line-height: 1.6; margin-bottom: 16px; white-space: pre-wrap; }

.extra-fields {
  margin-bottom: 16px;
  padding: 12px 14px;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.extra-fields h4 {
  margin: 0 0 10px;
  font-size: 0.92em;
  color: #334155;
}

.extra-field-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 4px 0;
  font-size: 0.86em;
}

.extra-field-row .k {
  color: #64748b;
}

.extra-field-row .v {
  color: #111827;
  font-weight: 600;
}

.approval-note {
  background: #eff6ff;
  border-left: 4px solid #3b82f6;
  padding: 12px 16px;
  border-radius: 0 8px 8px 0;
  margin-bottom: 16px;
  font-size: 0.9em;
  color: #333;
}

.status-actions {
  display: flex; gap: 8px; align-items: center; flex-wrap: wrap;
  margin-bottom: 16px; padding: 12px; background: #f9fafb; border-radius: 8px;
}
.action-label { font-weight: 600; color: #333; font-size: 0.9em; }

.btn-sm { padding: 6px 14px; border: none; border-radius: 6px; font-weight: 600; font-size: 0.85em; cursor: pointer; color: white; }
.btn-blue { background: #3b82f6; } .btn-blue:hover { background: #2563eb; }
.btn-green { background: #10b981; } .btn-green:hover { background: #059669; }
.btn-red { background: #ef4444; } .btn-red:hover { background: #dc2626; }

.btn-primary, .btn-secondary, .btn-gray, .btn-danger {
  padding: 8px 18px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}
.btn-primary { background: #3b82f6; color: white; }
.btn-primary:hover { background: #2563eb; }
.btn-secondary { background: #e5e7eb; color: #333; }
.btn-gray { background: #6b7280; color: white; }
.btn-gray:hover { background: #4b5563; }
.btn-danger { background: #ef4444; color: white; }
.btn-danger:hover { background: #dc2626; }

.form-group { margin-bottom: 16px; }
.form-group label { display: block; margin-bottom: 6px; font-weight: 600; color: #333; font-size: 0.9em; }
.textarea-field {
  width: 100%;
  padding: 10px 12px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.95em;
  font-family: inherit;
}

@media (max-width: 768px) {
  .section-header {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .catalog-grid {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 12px;
  }

  .requests-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .detail-meta {
    gap: 10px;
    font-size: 0.8em;
  }
}
</style>
