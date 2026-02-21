<template>
  <div class="itsm-settings">
    <h2>设置</h2>

    <div class="settings-card">
      <div class="card-header">
        <h3>用户管理</h3>
        <button @click="showAddUser = true" class="btn-add">+ 添加用户</button>
      </div>
      <div class="users-list">
        <div v-for="user in users" :key="user.id" class="user-item">
          <div class="user-info">
            <span class="user-avatar">{{ user.avatar }}</span>
            <div>
              <div class="user-name">{{ user.name }}</div>
              <div class="user-meta">{{ user.email }} · {{ roleLabel(user.role) }}</div>
            </div>
          </div>
          <div class="user-actions">
            <button @click="editUser(user)" class="btn-icon" title="编辑">✏️</button>
            <button v-if="users.length > 1" @click="removeUser(user.id)" class="btn-icon" title="删除">🗑️</button>
          </div>
        </div>
      </div>
    </div>

    <div class="settings-card">
      <div class="card-header">
        <h3>服务目录管理</h3>
        <button @click="openCreateCatalog" class="btn-add">+ 新建目录项</button>
      </div>
      <div class="catalog-list">
        <div v-for="item in sortedCatalog" :key="item.id" class="catalog-item" :class="{ inactive: item.isActive === false }">
          <div class="catalog-main">
            <span class="catalog-icon">{{ item.icon || '📝' }}</span>
            <div>
              <div class="catalog-name">{{ item.name }}</div>
              <div class="catalog-meta">
                <code>{{ item.serviceType }}</code>
                <span>优先级: {{ priorityLabel(item.defaultPriority) }}</span>
                <span>{{ item.requiresApproval === false ? '免审批' : '需审批' }}</span>
                <span>排序: {{ item.sortOrder ?? 999 }}</span>
                <span>字段: {{ Array.isArray(item.formSchema) ? item.formSchema.length : 0 }}</span>
                <span>{{ item.isActive === false ? '已停用' : '已启用' }}</span>
              </div>
            </div>
          </div>
          <div class="catalog-actions">
            <button class="btn-outline" @click="toggleCatalog(item)">{{ item.isActive === false ? '启用' : '停用' }}</button>
            <button class="btn-outline" @click="editCatalog(item)">编辑</button>
            <button class="btn-danger-sm" @click="deleteCatalog(item)">删除</button>
          </div>
        </div>
      </div>
    </div>

    <div class="settings-card">
      <DataExportImport @import-data="$emit('import-data', $event)" @clear-data="$emit('clear-data')" />
    </div>

    <ItsmModal v-if="showAddUser || editingUser" :title="editingUser ? '编辑用户' : '添加用户'" size="small" @close="closeUserForm">
      <div class="form-group">
        <label>姓名 *</label>
        <input v-model="userForm.name" type="text" class="input-field" placeholder="请输入姓名">
      </div>
      <div class="form-group">
        <label>邮箱</label>
        <input v-model="userForm.email" type="email" class="input-field" placeholder="user@example.com">
      </div>
      <div class="form-group">
        <label>角色</label>
        <select v-model="userForm.role" class="select-field">
          <option value="admin">管理员</option>
          <option value="approver">审批人</option>
          <option value="member">成员</option>
        </select>
      </div>
      <div class="form-group">
        <label>头像</label>
        <div class="avatar-picker">
          <span
            v-for="a in avatars"
            :key="a"
            class="avatar-option"
            :class="{ active: userForm.avatar === a }"
            @click="userForm.avatar = a"
          >{{ a }}</span>
        </div>
      </div>
      <template #footer>
        <button @click="closeUserForm" class="btn-secondary">取消</button>
        <button @click="saveUser" class="btn-primary">{{ editingUser ? '保存' : '添加' }}</button>
      </template>
    </ItsmModal>

    <ItsmModal v-if="showCatalogForm" :title="editingCatalog ? '编辑目录项' : '新建目录项'" size="medium" @close="closeCatalogForm">
      <div class="form-grid">
        <div class="form-group">
          <label>编码 (serviceType) *</label>
          <input v-model.trim="catalogForm.serviceType" :disabled="Boolean(editingCatalog)" type="text" class="input-field" placeholder="例如: password_reset">
        </div>
        <div class="form-group">
          <label>显示名称 *</label>
          <input v-model.trim="catalogForm.name" type="text" class="input-field" placeholder="例如: 密码重置">
        </div>
        <div class="form-group">
          <label>图标</label>
          <input v-model.trim="catalogForm.icon" type="text" class="input-field" placeholder="例如: 🔐">
        </div>
        <div class="form-group">
          <label>默认优先级</label>
          <select v-model="catalogForm.defaultPriority" class="select-field">
            <option value="low">低</option>
            <option value="medium">中</option>
            <option value="high">高</option>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label>标题模板</label>
        <input v-model="catalogForm.titleTemplate" type="text" class="input-field" placeholder="例如: 密码重置 - ">
      </div>

      <div class="form-group">
        <label>描述</label>
        <textarea v-model="catalogForm.description" rows="3" class="textarea-field" placeholder="该目录项用于什么场景"></textarea>
      </div>

      <div class="form-group">
        <div class="schema-header">
          <label>扩展字段模板</label>
          <button class="btn-outline" type="button" @click="addSchemaField">+ 新增字段</button>
        </div>
        <div v-if="catalogForm.formSchema.length === 0" class="schema-empty">暂无扩展字段</div>
        <div v-else class="schema-list">
          <div
            v-for="(field, index) in catalogForm.formSchema"
            :key="field.uid"
            class="schema-item"
            :class="{ dragging: dragSchemaIndex === index }"
            draggable="true"
            @dragstart="onSchemaDragStart(index, $event)"
            @dragover.prevent
            @drop="onSchemaDrop(index)"
            @dragend="onSchemaDragEnd"
          >
            <div class="schema-item-header">
              <span class="drag-handle" title="拖拽排序">⋮⋮</span>
              <span class="schema-index">字段 {{ index + 1 }}</span>
              <div class="schema-order-actions">
                <button class="btn-outline" type="button" :disabled="index === 0" @click="moveSchemaField(index, -1)">上移</button>
                <button class="btn-outline" type="button" :disabled="index === catalogForm.formSchema.length - 1" @click="moveSchemaField(index, 1)">下移</button>
              </div>
            </div>
            <div class="form-grid">
              <div class="form-group">
                <label>字段 key *</label>
                <input v-model.trim="field.key" type="text" class="input-field" placeholder="例如: deviceType">
              </div>
              <div class="form-group">
                <label>字段名称 *</label>
                <input v-model.trim="field.label" type="text" class="input-field" placeholder="例如: 设备类型">
              </div>
              <div class="form-group">
                <label>字段类型</label>
                <select v-model="field.type" class="select-field">
                  <option value="text">文本</option>
                  <option value="textarea">多行文本</option>
                  <option value="number">数字</option>
                  <option value="select">下拉选择</option>
                </select>
              </div>
              <div class="form-group">
                <label>占位提示</label>
                <input v-model="field.placeholder" type="text" class="input-field" placeholder="可选">
              </div>
            </div>

            <div v-if="field.type === 'select'" class="form-group">
              <label>选项（每行一个） *</label>
              <textarea
                v-model="field.optionsText"
                rows="3"
                class="textarea-field"
                placeholder="例如：&#10;笔记本&#10;显示器&#10;键盘"
              ></textarea>
            </div>

            <div class="schema-actions">
              <label><input type="checkbox" v-model="field.required"> 必填</label>
              <button class="btn-danger-sm" type="button" @click="removeSchemaField(index)">删除字段</button>
            </div>
          </div>
        </div>
      </div>

      <div class="form-grid">
        <div class="form-group">
          <label>审批角色</label>
          <select v-model="catalogForm.defaultApproverRole" class="select-field">
            <option value="approver">审批人</option>
            <option value="admin">管理员</option>
            <option value="member">成员</option>
          </select>
        </div>
        <div class="form-group">
          <label>处理角色</label>
          <select v-model="catalogForm.defaultAssigneeRole" class="select-field">
            <option value="member">成员</option>
            <option value="approver">审批人</option>
            <option value="admin">管理员</option>
          </select>
        </div>
        <div class="form-group">
          <label>排序</label>
          <input v-model.number="catalogForm.sortOrder" type="number" min="0" max="9999" class="input-field">
        </div>
      </div>

      <div class="checkbox-row">
        <label><input type="checkbox" v-model="catalogForm.requiresApproval"> 需要审批</label>
        <label><input type="checkbox" v-model="catalogForm.isActive"> 启用目录项</label>
      </div>

      <template #footer>
        <button @click="closeCatalogForm" class="btn-secondary">取消</button>
        <button @click="saveCatalog" class="btn-primary">{{ editingCatalog ? '保存' : '创建' }}</button>
      </template>
    </ItsmModal>
  </div>
</template>

<script>
import ItsmModal from '../../components/itsm/ItsmModal.vue'
import DataExportImport from '../../components/itsm/DataExportImport.vue'

const ROLE_LABELS = { admin: '管理员', member: '成员', approver: '审批人' }
const PRIORITY_LABELS = { low: '低', medium: '中', high: '高' }

export default {
  name: 'ItsmSettings',
  components: { ItsmModal, DataExportImport },
  props: {
    users: { type: Array, required: true },
    serviceCatalog: { type: Array, default: () => [] }
  },
  emits: [
    'add-user',
    'update-user',
    'remove-user',
    'create-service-catalog-item',
    'update-service-catalog-item',
    'delete-service-catalog-item',
    'import-data',
    'clear-data'
  ],
  data() {
    return {
      showAddUser: false,
      editingUser: null,
      showCatalogForm: false,
      editingCatalog: null,
      dragSchemaIndex: null,
      userForm: this.emptyUserForm(),
      catalogForm: this.emptyCatalogForm(),
      avatars: ['👨‍💻', '👩‍💻', '🧑‍💼', '👨‍🔧', '👩‍🔧', '🧑‍💻', '👷', '🦸']
    }
  },
  computed: {
    sortedCatalog() {
      return [...this.serviceCatalog].sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999))
    }
  },
  methods: {
    emptyUserForm() {
      return { name: '', email: '', role: 'member', avatar: '👨‍💻' }
    },
    emptyCatalogForm() {
      return {
        serviceType: '',
        name: '',
        icon: '📝',
        description: '',
        titleTemplate: '',
        formSchema: [],
        defaultPriority: 'medium',
        requiresApproval: true,
        defaultApproverRole: 'approver',
        defaultAssigneeRole: 'member',
        isActive: true,
        sortOrder: 999
      }
    },
    emptySchemaField() {
      return {
        uid: `field_${Date.now()}_${Math.random().toString(16).slice(2, 7)}`,
        key: '',
        label: '',
        type: 'text',
        required: false,
        placeholder: '',
        optionsText: ''
      }
    },
    roleLabel(role) {
      return ROLE_LABELS[role] || role
    },
    priorityLabel(priority) {
      return PRIORITY_LABELS[priority] || priority
    },
    editUser(user) {
      this.editingUser = user
      this.userForm = { name: user.name, email: user.email, role: user.role, avatar: user.avatar }
    },
    closeUserForm() {
      this.showAddUser = false
      this.editingUser = null
      this.userForm = this.emptyUserForm()
    },
    saveUser() {
      if (!this.userForm.name.trim()) { alert('请输入姓名'); return }
      if (this.editingUser) {
        this.$emit('update-user', { ...this.editingUser, ...this.userForm })
      } else {
        this.$emit('add-user', { ...this.userForm })
      }
      this.closeUserForm()
    },
    removeUser(id) {
      if (confirm('确定删除此用户？')) {
        this.$emit('remove-user', id)
      }
    },

    openCreateCatalog() {
      this.editingCatalog = null
      this.catalogForm = this.emptyCatalogForm()
      this.showCatalogForm = true
    },
    editCatalog(item) {
      this.editingCatalog = item
      this.catalogForm = {
        id: item.id,
        serviceType: item.serviceType,
        name: item.name,
        icon: item.icon || '📝',
        description: item.description || '',
        titleTemplate: item.titleTemplate || '',
        formSchema: (Array.isArray(item.formSchema) ? item.formSchema : []).map((field) => ({
          uid: `field_${Date.now()}_${Math.random().toString(16).slice(2, 7)}`,
          key: field.key || '',
          label: field.label || '',
          type: field.type || 'text',
          required: Boolean(field.required),
          placeholder: field.placeholder || '',
          optionsText: Array.isArray(field.options) ? field.options.join('\n') : ''
        })),
        defaultPriority: item.defaultPriority || 'medium',
        requiresApproval: item.requiresApproval !== false,
        defaultApproverRole: item.defaultApproverRole || 'approver',
        defaultAssigneeRole: item.defaultAssigneeRole || 'member',
        isActive: item.isActive !== false,
        sortOrder: item.sortOrder ?? 999
      }
      this.showCatalogForm = true
    },
    closeCatalogForm() {
      this.showCatalogForm = false
      this.editingCatalog = null
      this.dragSchemaIndex = null
      this.catalogForm = this.emptyCatalogForm()
    },
    addSchemaField() {
      this.catalogForm.formSchema.push(this.emptySchemaField())
    },
    removeSchemaField(index) {
      this.catalogForm.formSchema.splice(index, 1)
    },
    moveSchemaField(index, offset) {
      const target = index + offset
      if (target < 0 || target >= this.catalogForm.formSchema.length) return
      const cloned = [...this.catalogForm.formSchema]
      const [moved] = cloned.splice(index, 1)
      cloned.splice(target, 0, moved)
      this.catalogForm.formSchema = cloned
    },
    onSchemaDragStart(index, event) {
      this.dragSchemaIndex = index
      if (event?.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData('text/plain', String(index))
      }
    },
    onSchemaDrop(targetIndex) {
      if (this.dragSchemaIndex === null || this.dragSchemaIndex === targetIndex) return
      this.moveSchemaField(this.dragSchemaIndex, targetIndex - this.dragSchemaIndex)
      this.dragSchemaIndex = null
    },
    onSchemaDragEnd() {
      this.dragSchemaIndex = null
    },
    saveCatalog() {
      if (!this.catalogForm.serviceType.trim()) { alert('请输入 serviceType'); return }
      if (!this.catalogForm.name.trim()) { alert('请输入显示名称'); return }

      const parsedSchema = []
      for (const field of this.catalogForm.formSchema) {
        if (!field.key.trim() || !field.label.trim()) {
          alert('扩展字段的 key 和名称不能为空')
          return
        }

        const normalizedField = {
          key: field.key.trim(),
          label: field.label.trim(),
          type: field.type || 'text',
          required: Boolean(field.required)
        }

        if (field.placeholder && field.placeholder.trim()) {
          normalizedField.placeholder = field.placeholder.trim()
        }

        if (normalizedField.type === 'select') {
          const options = field.optionsText
            .split('\n')
            .map(item => item.trim())
            .filter(Boolean)
          if (options.length === 0) {
            alert(`字段「${normalizedField.label}」为下拉类型，必须配置选项`)
            return
          }
          normalizedField.options = options
        }

        parsedSchema.push(normalizedField)
      }

      const payload = {
        ...this.catalogForm,
        formSchema: parsedSchema
      }
      payload.formSchema = parsedSchema.map((field) => ({ ...field }))

      if (this.editingCatalog) {
        this.$emit('update-service-catalog-item', payload)
      } else {
        this.$emit('create-service-catalog-item', payload)
      }
      this.closeCatalogForm()
    },
    toggleCatalog(item) {
      this.$emit('update-service-catalog-item', { ...item, isActive: item.isActive === false })
    },
    deleteCatalog(item) {
      if (confirm(`确定删除目录项「${item.name}」？`)) {
        this.$emit('delete-service-catalog-item', item.id)
      }
    }
  }
}
</script>

<style scoped>
.itsm-settings { animation: fadeIn 0.4s ease; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

h2 { margin: 0 0 24px; color: #333; font-size: 1.4em; }

.settings-card {
  background: white;
  border-radius: 10px;
  padding: 22px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.card-header {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;
}
.card-header h3 { margin: 0; color: #333; }

.btn-add {
  padding: 8px 18px; background: #3b82f6; color: white;
  border: none; border-radius: 8px; font-weight: 600; cursor: pointer;
}
.btn-add:hover { background: #2563eb; }

.users-list { display: flex; flex-direction: column; gap: 10px; }

.user-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 16px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;
}

.user-info { display: flex; align-items: center; gap: 12px; }
.user-avatar { font-size: 1.8em; }
.user-name { font-weight: 600; color: #333; }
.user-meta { font-size: 0.8em; color: #999; margin-top: 2px; }

.user-actions { display: flex; gap: 6px; }

.btn-icon {
  background: none; border: none; font-size: 1em; cursor: pointer;
  padding: 6px 8px; border-radius: 6px; transition: background 0.2s;
}
.btn-icon:hover { background: #e5e7eb; }

.catalog-list { display: flex; flex-direction: column; gap: 10px; }
.catalog-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}
.catalog-item.inactive { opacity: 0.65; }
.catalog-main { display: flex; align-items: center; gap: 10px; }
.catalog-icon { font-size: 1.4em; }
.catalog-name { font-weight: 700; color: #333; }
.catalog-meta { display: flex; flex-wrap: wrap; gap: 8px; font-size: 0.78em; color: #6b7280; }
.catalog-meta code { background: #eef2ff; color: #3730a3; padding: 2px 6px; border-radius: 4px; }
.catalog-actions { display: flex; gap: 8px; }

.btn-outline {
  padding: 6px 10px;
  border: 1px solid #cbd5e1;
  background: white;
  border-radius: 6px;
  color: #334155;
  cursor: pointer;
}
.btn-outline:hover { border-color: #3b82f6; color: #1d4ed8; }

.btn-danger-sm {
  padding: 6px 10px;
  border: none;
  border-radius: 6px;
  background: #ef4444;
  color: white;
  cursor: pointer;
}
.btn-danger-sm:hover { background: #dc2626; }

.form-group { margin-bottom: 16px; }
.form-group label { display: block; margin-bottom: 6px; font-weight: 600; color: #333; font-size: 0.9em; }

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.input-field, .select-field, .textarea-field {
  width: 100%; padding: 10px 12px; border: 2px solid #e5e7eb; border-radius: 8px;
  font-size: 0.95em; font-family: inherit; transition: all 0.3s;
}
.input-field:focus, .select-field:focus, .textarea-field:focus { outline: none; border-color: #3b82f6; }
.select-field { background: white; cursor: pointer; }

.schema-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.schema-empty {
  padding: 10px 12px;
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  font-size: 0.85em;
  color: #64748b;
}

.schema-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.schema-item {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;
  padding: 10px;
  cursor: grab;
}

.schema-item.dragging {
  opacity: 0.55;
  border-color: #3b82f6;
}

.schema-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}

.drag-handle {
  color: #64748b;
  font-size: 1em;
  line-height: 1;
}

.schema-index {
  font-size: 0.82em;
  color: #64748b;
  margin-right: auto;
}

.schema-order-actions {
  display: flex;
  gap: 6px;
}

.schema-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 4px;
  font-size: 0.86em;
  color: #374151;
}

.avatar-picker { display: flex; gap: 8px; flex-wrap: wrap; }
.avatar-option {
  font-size: 1.8em; cursor: pointer; padding: 4px 8px; border-radius: 8px;
  border: 2px solid transparent; transition: all 0.2s;
}
.avatar-option:hover { background: #f3f4f6; }
.avatar-option.active { border-color: #3b82f6; background: #eff6ff; }

.checkbox-row {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 0.9em;
  color: #374151;
  margin-bottom: 10px;
}

.btn-primary { padding: 8px 20px; background: #3b82f6; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; }
.btn-secondary { padding: 8px 20px; background: #e5e7eb; color: #333; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; }

@media (max-width: 768px) {
  .itsm-settings { padding: 0; }
  h2 { font-size: 1.1em; margin-bottom: 16px; }
  .settings-card { padding: 16px; margin-bottom: 16px; border-radius: 8px; }

  .card-header {
    flex-direction: column;
    gap: 10px;
    align-items: stretch;
  }

  .btn-add {
    width: 100%;
    padding: 8px 14px;
    font-size: 0.9em;
  }

  .user-item,
  .catalog-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .catalog-actions,
  .user-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .checkbox-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
</style>
