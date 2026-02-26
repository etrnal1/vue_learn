<template>
  <div class="user-admin">
    <div class="section-head">
      <h2>后台用户与授权</h2>
      <p>集中查看用户、调整角色并同步权限模型。</p>
    </div>
    <div class="stats-row">
      <article class="stat-card">
        <div class="stat-label">用户总数</div>
        <div class="stat-value">{{ userStats.total }}</div>
        <div class="stat-note">实时同步当前列表</div>
      </article>
      <article class="stat-card">
        <div class="stat-label">管理员</div>
        <div class="stat-value">{{ userStats.admin }}</div>
        <div class="stat-note">拥有全部权限</div>
      </article>
      <article class="stat-card">
        <div class="stat-label">运维</div>
        <div class="stat-value">{{ userStats.operator }}</div>
        <div class="stat-note">可被授权较多模块</div>
      </article>
      <article class="stat-card">
        <div class="stat-label">访客</div>
        <div class="stat-value">{{ userStats.viewer }}</div>
        <div class="stat-note">只读体验</div>
      </article>
    </div>

    <div class="user-grid">
      <section class="panel user-list">
        <div class="panel-head">
          <input v-model.trim="search" class="input" placeholder="搜索 id / 昵称 / 邮箱" />
          <button class="btn" @click="loadUsers" :disabled="loadingUsers">
            {{ loadingUsers ? '刷新中...' : '刷新' }}
          </button>
        </div>

        <div v-if="loadingUsers" class="placeholder">载入中…</div>
        <div v-else-if="filteredUsers.length === 0" class="placeholder">暂无用户</div>
        <div v-else class="list">
          <button
            v-for="user in filteredUsers"
            :key="user.id"
            class="list-item"
            :class="{ active: selectedUser?.id === user.id }"
            @click="selectUser(user)"
          >
            <div>
              <strong>{{ user.id }}</strong>
              <div class="meta">{{ user.email || '未设置邮箱' }}</div>
            </div>
            <span class="role-chip">{{ user.role || 'member' }}</span>
          </button>
        </div>
      </section>

      <section class="panel user-edit">
        <div v-if="selectedUser">
          <div class="label">当前账号：{{ selectedUser.id }}</div>
          <label class="field">
            <span>昵称</span>
            <input v-model.trim="selectedUser.name" class="input" />
          </label>
          <label class="field">
            <span>邮箱</span>
            <input v-model.trim="selectedUser.email" class="input" type="email" />
          </label>
          <label class="field">
            <span>角色</span>
            <select v-model="selectedUser.role" class="input">
              <option v-for="role in permissionConfig.roles" :key="role.id" :value="role.id">
                {{ role.label }}
              </option>
            </select>
          </label>
          <div class="actions">
            <button class="btn btn-primary" @click="updateUser" :disabled="savingUser">
              {{ savingUser ? '保存中…' : '保存修改' }}
            </button>
            <button class="btn btn-danger" @click="deleteUser" :disabled="savingUser">
              删除账号
            </button>
          </div>
          <p v-if="userMessage" class="message">{{ userMessage }}</p>
        </div>
        <div v-else class="placeholder">
          请选择左侧用户查看或修改角色
        </div>
      </section>
    </div>

    <section class="panel-create">
      <h3>新建用户</h3>
      <form class="form-grid" @submit.prevent="createUser">
        <label class="field">
          <span>账号 ID</span>
          <input v-model.trim="createForm.id" class="input" required placeholder="例如 u101" />
        </label>
        <label class="field">
          <span>昵称</span>
          <input v-model.trim="createForm.name" class="input" required />
        </label>
        <label class="field">
          <span>密码</span>
          <input v-model="createForm.password" class="input" type="password" required />
        </label>
        <label class="field">
          <span>邮箱</span>
          <input v-model.trim="createForm.email" class="input" type="email" />
        </label>
        <label class="field">
          <span>角色</span>
          <select v-model="createForm.role" class="input">
            <option v-for="role in permissionConfig.roles" :key="role.id" :value="role.id">
              {{ role.label }}
            </option>
          </select>
        </label>
        <button class="btn btn-primary" type="submit" :disabled="creatingUser">
          {{ creatingUser ? '创建中…' : '创建用户' }}
        </button>
      </form>
      <p v-if="createMessage" class="message">{{ createMessage }}</p>
    </section>

    <section class="panel permission-config">
      <div class="panel-head">
        <h3>权限模型（标签页访问）</h3>
        <button class="btn btn-primary" @click="savePermissionConfig" :disabled="savingPermission">
          {{ savingPermission ? '保存中…' : '保存' }}
        </button>
      </div>
      <div v-if="permissionConfig.roles.length === 0" class="placeholder">权限配置加载中…</div>
      <div v-else class="permission-table">
        <div class="permission-row head">
          <div class="tab-id">Tab ID</div>
          <div class="role-cell" v-for="role in permissionConfig.roles" :key="role.id">
            {{ role.label }}
          </div>
        </div>
        <div
          v-for="(roleIds, tabId) in permissionConfig.tabPermissions"
          :key="tabId"
          class="permission-row"
        >
          <div class="tab-id">{{ tabId }}</div>
          <div class="role-cell" v-for="role in permissionConfig.roles" :key="`row-${tabId}-${role.id}`">
            <label class="checkbox">
              <input
                type="checkbox"
                :value="role.id"
                :checked="roleIds.includes(role.id)"
                @change="toggleTabRole(tabId, role.id)"
              />
            </label>
          </div>
        </div>
      </div>
      <p v-if="permissionMessage" class="message">{{ permissionMessage }}</p>
    </section>
  </div>
</template>

<script>
import { api } from '../utils/api.js'

export default {
  name: 'UserAdminConsole',
  data() {
    return {
      users: [],
      selectedUser: null,
      search: '',
      loadingUsers: false,
      savingUser: false,
      creatingUser: false,
      createForm: {
        id: '',
        name: '',
        password: '',
        email: '',
        role: ''
      },
      createMessage: '',
      userMessage: '',
      permissionConfig: {
        roles: [],
        tabPermissions: {}
      },
      permissionMessage: '',
      savingPermission: false
    }
  },
  computed: {
    filteredUsers() {
      const keyword = String(this.search || '').toLowerCase().trim()
      if (!keyword) return this.users
      return this.users.filter((user) => {
        return (
          user.id?.toLowerCase().includes(keyword) ||
          user.name?.toLowerCase().includes(keyword) ||
          user.email?.toLowerCase().includes(keyword)
        )
      })
    },
    userStats() {
      const base = { total: this.users.length, admin: 0, operator: 0, viewer: 0 }
      for (const user of this.users) {
        const role = String(user?.role || 'member').toLowerCase()
        if (role === 'admin') base.admin += 1
        else if (role === 'operator') base.operator += 1
        else if (role === 'viewer') base.viewer += 1
      }
      base.viewer = base.total - base.admin - base.operator
      return base
    }
  },
  methods: {
    async loadUsers() {
      this.loadingUsers = true
      this.userMessage = ''
      try {
        const result = await api.users.getAll()
        this.users = Array.isArray(result) ? result : []
        if (this.selectedUser) {
          this.selectedUser = this.users.find((item) => item.id === this.selectedUser.id) || null
        }
      } catch (error) {
        this.userMessage = error?.message || '加载用户失败'
      } finally {
        this.loadingUsers = false
      }
    },
    selectUser(user) {
      this.selectedUser = { ...user }
      this.userMessage = ''
    },
    async updateUser() {
      if (!this.selectedUser) return
      this.savingUser = true
      this.userMessage = ''
      try {
        await api.users.update(this.selectedUser.id, {
          name: this.selectedUser.name,
          role: this.selectedUser.role,
          email: this.selectedUser.email
        })
        this.userMessage = '更新成功'
        await this.loadUsers()
      } catch (error) {
        this.userMessage = error?.message || '更新失败'
      } finally {
        this.savingUser = false
      }
    },
    async deleteUser() {
      if (!this.selectedUser) return
      if (!confirm(`确定删除用户 ${this.selectedUser.id}？`)) return
      this.savingUser = true
      try {
        await api.users.delete(this.selectedUser.id)
        this.userMessage = '删除成功'
        this.selectedUser = null
        await this.loadUsers()
      } catch (error) {
        this.userMessage = error?.message || '删除失败'
      } finally {
        this.savingUser = false
      }
    },
    async createUser() {
      if (!this.createForm.id || !this.createForm.name || !this.createForm.password) {
        this.createMessage = '请填写账号/昵称/密码'
        return
      }
      this.creatingUser = true
      this.createMessage = ''
      try {
        await api.users.create({
          id: this.createForm.id,
          name: this.createForm.name,
          password: this.createForm.password,
          email: this.createForm.email || null,
          role: this.createForm.role || this.permissionConfig.roles[0]?.id || 'member'
        })
        this.createMessage = '创建成功'
        this.createForm = {
          id: '',
          name: '',
          password: '',
          email: '',
          role: this.permissionConfig.roles[0]?.id || ''
        }
        await this.loadUsers()
      } catch (error) {
        this.createMessage = error?.message || '创建失败'
      } finally {
        this.creatingUser = false
      }
    },
    async loadPermissionConfig() {
      try {
        const config = await api.users.getPermissionConfig()
        this.permissionConfig = {
          roles: Array.isArray(config?.roles) ? config.roles : [],
          tabPermissions: config?.tabPermissions || {}
        }
        if (this.createForm.role === '' && this.permissionConfig.roles.length > 0) {
          this.createForm.role = this.permissionConfig.roles[0].id
        }
      } catch (error) {
        this.permissionMessage = error?.message || '加载权限模型失败'
      }
    },
    toggleTabRole(tabId, roleId) {
      const next = new Set(this.permissionConfig.tabPermissions[tabId] || [])
      if (next.has(roleId)) next.delete(roleId)
      else next.add(roleId)
      this.permissionConfig = {
        ...this.permissionConfig,
        tabPermissions: {
          ...this.permissionConfig.tabPermissions,
          [tabId]: Array.from(next)
        }
      }
    },
    async savePermissionConfig() {
      this.savingPermission = true
      this.permissionMessage = ''
      try {
        await api.users.setPermissionConfig(this.permissionConfig)
        this.permissionMessage = '权限模型已保存'
      } catch (error) {
        this.permissionMessage = error?.message || '保存失败'
      } finally {
        this.savingPermission = false
      }
    }
  },
  mounted() {
    this.loadUsers()
    this.loadPermissionConfig()
  }
}
</script>

<style scoped>
.user-admin { display: flex; flex-direction: column; gap: 16px; }
.section-head h2 { margin: 0; font-size: 1.2em; }
.section-head p { margin: 4px 0 0; color: var(--app-text-muted); }
  .user-grid {
    display: grid;
    grid-template-columns: 1.1fr 1fr;
    gap: 16px;
  }
  .panel {
    border: 0;
    border-radius: 20px;
    padding: 18px;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.02));
    box-shadow: 0 18px 40px rgba(15, 22, 42, 0.25);
    backdrop-filter: blur(26px);
  }
  .user-list .panel-head {
    display: flex;
    gap: 10px;
    align-items: center;
  }
  .placeholder {
    color: var(--app-text-muted);
    padding: 18px;
    text-align: center;
  }
  .list {
    display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;
}
  .list-item {
    border: 0;
    border-radius: 14px;
    padding: 12px 14px;
    background: rgba(15, 23, 42, 0.4);
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    color: rgba(255, 255, 255, 0.9);
    transition: transform 0.2s ease, background 0.2s ease;
  }
  .list-item:hover {
    transform: translateY(-1px);
    background: rgba(59, 130, 246, 0.08);
  }
  .list-item.active {
    border: 1px solid rgba(59, 130, 246, 0.6);
    box-shadow: inset 0 0 10px rgba(59, 130, 246, 0.3);
    background: rgba(59, 130, 246, 0.18);
    color: var(--app-on-primary);
  }
.meta {
  font-size: 0.75em;
  color: var(--app-text-muted);
}
.role-chip {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.75em;
  background: rgba(255, 255, 255, 0.12);
}
.user-edit .field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 10px;
}
.input {
  border: 1px solid var(--app-border);
  border-radius: 8px;
  padding: 8px 10px;
  background: var(--app-card-elevated);
  color: var(--app-text);
}
.actions {
  margin-top: 12px;
  display: flex;
  gap: 8px;
}
.btn {
  border: 1px solid var(--app-border);
  border-radius: 8px;
  padding: 6px 12px;
  cursor: pointer;
  background: var(--app-card-elevated);
  color: var(--app-text);
}
.btn-primary {
  background: var(--app-primary);
  color: var(--app-on-primary);
  border-color: transparent;
}
.btn-danger {
  border-color: #fecaca;
  color: #b91c1c;
  background: #fff5f5;
}
.panel-create {
  margin-top: -6px;
  border: 0;
  border-radius: 20px;
  padding: 18px;
  background: linear-gradient(160deg, rgba(99, 102, 241, 0.25), rgba(59, 130, 246, 0.15));
  box-shadow: 0 16px 40px rgba(59, 130, 246, 0.25);
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  align-items: end;
}
.permission-config .panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.permission-table {
  margin-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
}
.permission-row {
  display: grid;
  grid-template-columns: 220px repeat(auto-fit, minmax(80px, 1fr));
  gap: 6px;
  padding: 8px 0;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.permission-row.head {
  font-weight: 600;
  color: var(--app-text-muted);
  border-color: rgba(255, 255, 255, 0.3);
}
.tab-id {
  font-size: 0.85em;
  color: var(--app-text-secondary);
}
.role-cell {
  display: flex;
  justify-content: center;
}
.checkbox input[type='checkbox'] {
  width: 16px;
  height: 16px;
}
.message {
  margin-top: 10px;
  font-size: 0.85em;
  color: var(--app-text-muted);
}
.stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
  margin-top: 12px;
}
.stat-card {
  padding: 14px;
  border-radius: 14px;
  background: rgba(59, 130, 246, 0.15);
  border: 1px solid rgba(59, 130, 246, 0.3);
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.stat-label {
  font-size: 0.78em;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--app-text-muted);
}
.stat-value {
  font-size: 1.9em;
  font-weight: 700;
  color: #eef2ff;
}
.stat-note {
  font-size: 0.75em;
  color: var(--app-text-muted);
}
@media (max-width: 980px) {
  .user-grid {
    grid-template-columns: 1fr;
  }
}
</style>
