<template>
  <div class="itsm-settings">
    <h2>设置</h2>

    <!-- User Management -->
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

    <!-- Data Management -->
    <div class="settings-card">
      <DataExportImport @import-data="$emit('import-data', $event)" @clear-data="$emit('clear-data')" />
    </div>

    <!-- Add / Edit User Modal -->
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
  </div>
</template>

<script>
import ItsmModal from '../../components/itsm/ItsmModal.vue'
import DataExportImport from '../../components/itsm/DataExportImport.vue'

const ROLE_LABELS = { admin: '管理员', member: '成员', approver: '审批人' }

export default {
  name: 'ItsmSettings',
  components: { ItsmModal, DataExportImport },
  props: {
    users: { type: Array, required: true }
  },
  emits: ['add-user', 'update-user', 'remove-user', 'import-data', 'clear-data'],
  data() {
    return {
      showAddUser: false,
      editingUser: null,
      userForm: this.emptyUserForm(),
      avatars: ['👨‍💻', '👩‍💻', '🧑‍💼', '👨‍🔧', '👩‍🔧', '🧑‍💻', '👷', '🦸']
    }
  },
  methods: {
    emptyUserForm() {
      return { name: '', email: '', role: 'member', avatar: '👨‍💻' }
    },
    roleLabel(role) {
      return ROLE_LABELS[role] || role
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

.form-group { margin-bottom: 16px; }
.form-group label { display: block; margin-bottom: 6px; font-weight: 600; color: #333; font-size: 0.9em; }

.input-field, .select-field {
  width: 100%; padding: 10px 12px; border: 2px solid #e5e7eb; border-radius: 8px;
  font-size: 0.95em; font-family: inherit; transition: all 0.3s;
}
.input-field:focus, .select-field:focus { outline: none; border-color: #3b82f6; }
.select-field { background: white; cursor: pointer; }

.avatar-picker { display: flex; gap: 8px; flex-wrap: wrap; }
.avatar-option {
  font-size: 1.8em; cursor: pointer; padding: 4px 8px; border-radius: 8px;
  border: 2px solid transparent; transition: all 0.2s;
}
.avatar-option:hover { background: #f3f4f6; }
.avatar-option.active { border-color: #3b82f6; background: #eff6ff; }

.btn-primary { padding: 8px 20px; background: #3b82f6; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; }
.btn-secondary { padding: 8px 20px; background: #e5e7eb; color: #333; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; }

@media (max-width: 1024px) {
  .itsm-settings {
    padding: 0;
  }

  h2 {
    font-size: 1.2em;
  }
}

@media (max-width: 768px) {
  .itsm-settings {
    padding: 0;
  }

  h2 {
    font-size: 1.1em;
    margin-bottom: 16px;
  }

  .settings-card {
    padding: 16px;
    margin-bottom: 16px;
    border-radius: 8px;
  }

  .card-header {
    flex-direction: column;
    gap: 10px;
    align-items: stretch;
  }

  .card-header h3 {
    font-size: 1em;
  }

  .btn-add {
    width: 100%;
    padding: 8px 14px;
    font-size: 0.9em;
  }

  .users-list {
    gap: 8px;
  }

  .user-item {
    flex-direction: column;
    gap: 10px;
    padding: 10px;
  }

  .user-info {
    width: 100%;
    gap: 10px;
  }

  .user-name {
    font-size: 0.95em;
  }

  .user-meta {
    font-size: 0.75em;
  }

  .user-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .btn-icon {
    padding: 6px 8px;
    font-size: 1em;
  }

  .form-group {
    margin-bottom: 12px;
  }

  .form-group label {
    font-size: 0.9em;
    margin-bottom: 6px;
  }

  .input-field {
    padding: 8px 10px;
    font-size: 0.85em;
  }

  .select-field {
    padding: 8px 10px;
    font-size: 0.85em;
  }

  .avatar-picker {
    gap: 6px;
  }

  .avatar-option {
    font-size: 1.5em;
    padding: 4px 6px;
  }

  .btn-primary, .btn-secondary {
    padding: 6px 14px;
    font-size: 0.85em;
  }
}

@media (max-width: 480px) {
  h2 {
    font-size: 1em;
  }

  .settings-card {
    padding: 12px;
    margin-bottom: 12px;
  }

  .card-header h3 {
    font-size: 0.95em;
  }

  .btn-add {
    font-size: 0.8em;
  }

  .user-item {
    gap: 8px;
    padding: 8px;
  }

  .user-avatar {
    font-size: 1.5em;
  }

  .user-name {
    font-size: 0.9em;
  }

  .user-meta {
    font-size: 0.7em;
  }

  .btn-icon {
    padding: 4px 6px;
    font-size: 0.9em;
  }

  .form-group label {
    font-size: 0.85em;
  }

  .input-field, .select-field {
    padding: 6px 8px;
    font-size: 0.8em;
  }

  .avatar-picker {
    gap: 4px;
  }

  .avatar-option {
    font-size: 1.3em;
    padding: 2px 4px;
  }

  .btn-primary, .btn-secondary {
    padding: 5px 12px;
    font-size: 0.75em;
  }
}
</style>
