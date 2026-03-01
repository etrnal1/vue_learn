<template>
  <div class="admin-page">
    <div class="page-head">
      <h2>角色管理</h2>
      <p>维护角色基础信息，并分配菜单权限。</p>
    </div>

    <div class="layout-grid">
      <section class="panel">
        <div class="panel-head">
          <h3>角色列表</h3>
          <button class="btn" @click="resetForm">新增角色</button>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>角色编码</th>
                <th>角色名称</th>
                <th>数据范围</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in roles" :key="item.id">
                <td>{{ item.code }}</td>
                <td>{{ item.name }}</td>
                <td>{{ scopeLabel(item.dataScope) }}</td>
                <td>
                  <span :class="['status-tag', item.status]">{{ item.status === 'enabled' ? '启用' : '停用' }}</span>
                </td>
                <td class="action-cell">
                  <button class="link-btn" @click="editItem(item)">编辑</button>
                  <button class="link-btn danger" @click="removeItem(item)">删除</button>
                </td>
              </tr>
              <tr v-if="roles.length === 0">
                <td colspan="5" class="empty">暂无角色</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <form class="panel form-grid" @submit.prevent="saveItem">
        <h3>{{ editingId ? '编辑角色' : '新增角色' }}</h3>
        <label class="field">
          <span>角色编码</span>
          <input v-model.trim="form.code" class="input" required placeholder="例如 data_admin" />
        </label>
        <label class="field">
          <span>角色名称</span>
          <input v-model.trim="form.name" class="input" required />
        </label>
        <label class="field">
          <span>数据范围</span>
          <select v-model="form.dataScope" class="input">
            <option value="all">全部数据</option>
            <option value="dept_and_children">本部门及子部门</option>
            <option value="dept">本部门</option>
            <option value="self">仅本人</option>
          </select>
        </label>
        <label class="field">
          <span>状态</span>
          <select v-model="form.status" class="input">
            <option value="enabled">启用</option>
            <option value="disabled">停用</option>
          </select>
        </label>
        <label class="field full">
          <span>备注</span>
          <textarea v-model.trim="form.remark" class="input" rows="3" placeholder="可选"></textarea>
        </label>

        <div class="field full">
          <span>菜单权限</span>
          <div class="menu-grid">
            <label v-for="item in menus" :key="item.id" class="menu-item" :class="{ child: item.parentId }">
              <input type="checkbox" :value="item.id" v-model="form.menuIds" />
              <span>{{ item.name }}</span>
            </label>
          </div>
        </div>

        <div class="actions full">
          <button class="btn btn-primary" type="submit">{{ editingId ? '保存修改' : '新增角色' }}</button>
          <button class="btn" type="button" @click="resetForm">重置</button>
        </div>
        <p v-if="message" class="message full">{{ message }}</p>
      </form>
    </div>
  </div>
</template>

<script>
import { createRecordId, getMenus, getRoles, saveRoles } from '../../utils/adminMockStore.js'

function sortByOrder(a, b) {
  const byOrder = Number(a.order || 0) - Number(b.order || 0)
  if (byOrder !== 0) return byOrder
  return String(a.name || '').localeCompare(String(b.name || ''), 'zh-CN')
}

export default {
  name: 'RoleManagement',
  data() {
    return {
      roles: [],
      menus: [],
      editingId: '',
      message: '',
      form: {
        code: '',
        name: '',
        dataScope: 'self',
        status: 'enabled',
        remark: '',
        menuIds: []
      }
    }
  },
  methods: {
    loadData() {
      this.roles = getRoles()
      this.menus = getMenus().sort(sortByOrder)
    },
    resetForm() {
      this.editingId = ''
      this.message = ''
      this.form = {
        code: '',
        name: '',
        dataScope: 'self',
        status: 'enabled',
        remark: '',
        menuIds: []
      }
    },
    scopeLabel(scope) {
      const map = {
        all: '全部数据',
        dept_and_children: '本部门及子部门',
        dept: '本部门',
        self: '仅本人'
      }
      return map[scope] || scope
    },
    saveItem() {
      this.message = ''
      const duplicated = this.roles.some(
        (item) => item.code === this.form.code && item.id !== this.editingId
      )
      if (duplicated) {
        this.message = '角色编码已存在'
        return
      }

      const payload = {
        code: this.form.code,
        name: this.form.name,
        dataScope: this.form.dataScope,
        status: this.form.status,
        remark: this.form.remark,
        menuIds: Array.from(new Set(this.form.menuIds))
      }

      if (this.editingId) {
        this.roles = this.roles.map((item) => (item.id === this.editingId ? { ...item, ...payload } : item))
        this.message = '角色已更新'
      } else {
        this.roles.push({ id: createRecordId('role'), ...payload })
        this.message = '角色已新增'
      }

      saveRoles(this.roles)
      this.resetForm()
      this.loadData()
    },
    editItem(item) {
      this.editingId = item.id
      this.message = ''
      this.form = {
        code: item.code || '',
        name: item.name || '',
        dataScope: item.dataScope || 'self',
        status: item.status || 'enabled',
        remark: item.remark || '',
        menuIds: Array.isArray(item.menuIds) ? [...item.menuIds] : []
      }
    },
    removeItem(item) {
      if (!window.confirm(`确认删除角色「${item.name}」吗？`)) return
      this.roles = this.roles.filter((row) => row.id !== item.id)
      saveRoles(this.roles)
      if (this.editingId === item.id) this.resetForm()
      this.loadData()
      this.message = '角色已删除'
    }
  },
  mounted() {
    this.loadData()
  }
}
</script>

<style scoped>
.admin-page {
  display: grid;
  gap: 14px;
}

.page-head h2 {
  margin: 0;
}

.page-head p {
  margin: 6px 0 0;
  color: var(--app-text-muted);
}

.layout-grid {
  display: grid;
  grid-template-columns: 1.15fr 1fr;
  gap: 12px;
}

.panel {
  border: 1px solid var(--app-border);
  border-radius: 14px;
  background: var(--app-card);
  padding: 14px;
}

.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.panel-head h3 {
  margin: 0;
}

.table-wrap {
  overflow: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  border-bottom: 1px solid var(--app-border);
  padding: 10px 8px;
  text-align: left;
  white-space: nowrap;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 10px;
}

.form-grid h3 {
  margin: 0;
  grid-column: 1 / -1;
}

.field {
  display: grid;
  gap: 6px;
  font-size: 13px;
}

.field.full {
  grid-column: 1 / -1;
}

.input {
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: var(--app-card-elevated);
  color: var(--app-text);
  padding: 8px 10px;
}

.menu-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 6px 10px;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.menu-item.child {
  padding-left: 14px;
}

.actions {
  display: flex;
  gap: 8px;
}

.btn {
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: var(--app-card-elevated);
  color: var(--app-text-secondary);
  padding: 8px 12px;
  cursor: pointer;
}

.btn-primary {
  background: var(--app-primary);
  border-color: var(--app-primary);
  color: var(--app-on-primary);
}

.status-tag {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
}

.status-tag.enabled {
  background: rgba(34, 197, 94, 0.15);
  color: #15803d;
}

.status-tag.disabled {
  background: rgba(239, 68, 68, 0.14);
  color: #b91c1c;
}

.action-cell {
  display: flex;
  gap: 10px;
}

.link-btn {
  border: none;
  background: transparent;
  color: var(--app-primary);
  cursor: pointer;
  padding: 0;
}

.link-btn.danger {
  color: #dc2626;
}

.empty {
  text-align: center;
  color: var(--app-text-muted);
}

.message {
  margin: 0;
}

/* Enterprise overrides */
.admin-page {
  padding: 6px;
  border-radius: 14px;
  background:
    radial-gradient(circle at 92% -8%, color-mix(in srgb, var(--app-primary) 10%, transparent), transparent 44%),
    linear-gradient(180deg, color-mix(in srgb, var(--app-bg) 94%, #ffffff), var(--app-bg));
}

.page-head {
  border: 1px solid var(--app-border);
  border-radius: 12px;
  padding: 12px 14px;
  background: color-mix(in srgb, var(--app-card) 96%, #ffffff);
  box-shadow: var(--app-soft-shadow);
}

.page-head h2 {
  font-size: 1.05em;
}

.page-head p {
  font-size: 0.82em;
}

.panel {
  border-radius: 12px;
  background: color-mix(in srgb, var(--app-card) 97%, #ffffff);
  box-shadow: var(--app-soft-shadow);
}

.panel h3 {
  font-size: 0.95em;
}

.input,
.btn {
  border-radius: 9px;
  font-size: 12px;
}

.btn-primary {
  box-shadow: 0 8px 18px color-mix(in srgb, var(--app-primary) 22%, transparent);
}

th {
  font-size: 12px;
  font-weight: 700;
  color: var(--app-text-secondary);
  background: color-mix(in srgb, var(--app-primary) 6%, transparent);
}

td {
  font-size: 12px;
}

tbody tr:hover {
  background: color-mix(in srgb, var(--app-primary) 8%, transparent);
}

.menu-item {
  padding: 4px 6px;
  border-radius: 8px;
  border: 1px solid transparent;
}

.menu-item:hover {
  border-color: color-mix(in srgb, var(--app-primary) 30%, var(--app-border));
  background: color-mix(in srgb, var(--app-primary) 7%, transparent);
}

.status-tag {
  border: 1px solid transparent;
}

.status-tag.enabled {
  border-color: rgba(22, 163, 74, 0.25);
}

.status-tag.disabled {
  border-color: rgba(220, 38, 38, 0.2);
}

@media (max-width: 1040px) {
  .layout-grid {
    grid-template-columns: 1fr;
  }
}
</style>
