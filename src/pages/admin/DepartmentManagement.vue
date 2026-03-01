<template>
  <div class="admin-page">
    <div class="page-head">
      <h2>部门管理</h2>
      <p>支持多级部门树和负责人维护。</p>
    </div>

    <div class="layout-grid">
      <section class="panel">
        <h3>部门列表</h3>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>层级</th>
                <th>部门名称</th>
                <th>负责人</th>
                <th>电话</th>
                <th>排序</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in deptRows" :key="row.id">
                <td>{{ displayLevel(row) }}级部门</td>
                <td>
                  <span class="name-text" :style="{ paddingLeft: `${Math.max(0, row.level - 1) * 18}px` }">{{ row.name }}</span>
                </td>
                <td>{{ row.leader || '-' }}</td>
                <td>{{ row.phone || '-' }}</td>
                <td>{{ row.order }}</td>
                <td>
                  <span :class="['status-tag', row.status]">{{ row.status === 'enabled' ? '启用' : '停用' }}</span>
                </td>
                <td class="action-cell">
                  <button class="link-btn" @click="editItem(row)">编辑</button>
                  <button class="link-btn danger" @click="removeItem(row)">删除</button>
                </td>
              </tr>
              <tr v-if="deptRows.length === 0">
                <td colspan="7" class="empty">暂无部门数据</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <form class="panel form-grid" @submit.prevent="saveItem">
        <h3>{{ editingId ? '编辑部门' : '新增部门' }}</h3>
        <label class="field">
          <span>上级部门</span>
          <select v-model="form.parentId" class="input">
            <option :value="''">无（一级部门）</option>
            <option v-for="item in parentOptions" :key="item.id" :value="item.id">{{ item.label }}</option>
          </select>
        </label>
        <label class="field">
          <span>部门名称</span>
          <input v-model.trim="form.name" class="input" required />
        </label>
        <label class="field">
          <span>负责人</span>
          <input v-model.trim="form.leader" class="input" />
        </label>
        <label class="field">
          <span>联系电话</span>
          <input v-model.trim="form.phone" class="input" placeholder="例如 13800000001" />
        </label>
        <label class="field">
          <span>排序</span>
          <input v-model.number="form.order" type="number" class="input" min="1" />
        </label>
        <label class="field">
          <span>状态</span>
          <select v-model="form.status" class="input">
            <option value="enabled">启用</option>
            <option value="disabled">停用</option>
          </select>
        </label>
        <label class="field">
          <span>部门级别（几级部门）</span>
          <select v-model="form.customLevel" class="input">
            <option :value="null">自动（按层级）</option>
            <option v-for="level in levelOptions" :key="level" :value="level">{{ level }}级部门</option>
          </select>
        </label>
        <div class="actions">
          <button class="btn btn-primary" type="submit">{{ editingId ? '保存修改' : '新增部门' }}</button>
          <button class="btn" type="button" @click="resetForm">重置</button>
        </div>
        <p v-if="message" class="message">{{ message }}</p>
      </form>
    </div>
  </div>
</template>

<script>
import { createRecordId, getDepartments, saveDepartments } from '../../utils/adminMockStore.js'

function sortByOrder(a, b) {
  const byOrder = Number(a.order || 0) - Number(b.order || 0)
  if (byOrder !== 0) return byOrder
  return String(a.name || '').localeCompare(String(b.name || ''), 'zh-CN')
}

function normalizeParentId(parentId) {
  const value = String(parentId || '').trim()
  return value || null
}

export default {
  name: 'DepartmentManagement',
  data() {
    return {
      departments: [],
      levelOptions: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      editingId: '',
      message: '',
      form: {
        parentId: '',
        name: '',
        leader: '',
        phone: '',
        order: 1,
        status: 'enabled',
        customLevel: null
      }
    }
  },
  computed: {
    parentOptions() {
      const disabled = new Set(this.editingId ? this.collectDescendantIds(this.editingId) : [])
      if (this.editingId) disabled.add(this.editingId)
      return this.flattenTree()
        .filter((item) => !disabled.has(item.id))
        .map((item) => ({
          id: item.id,
          label: `${'\u3000'.repeat(Math.max(0, item.level - 1))}${this.displayLevel(item)}级部门 - ${item.name}`
        }))
    },
    deptRows() {
      return this.flattenTree()
    }
  },
  methods: {
    getChildren(parentId) {
      return this.departments
        .filter((item) => normalizeParentId(item.parentId) === normalizeParentId(parentId))
        .sort(sortByOrder)
    },
    flattenTree(parentId = null, level = 1, visited = new Set()) {
      const rows = []
      const children = this.getChildren(parentId)
      children.forEach((item) => {
        if (visited.has(item.id)) return
        visited.add(item.id)
        rows.push({ ...item, level })
        rows.push(...this.flattenTree(item.id, level + 1, visited))
      })
      return rows
    },
    collectDescendantIds(id, visited = new Set()) {
      const children = this.getChildren(id)
      children.forEach((child) => {
        if (visited.has(child.id)) return
        visited.add(child.id)
        this.collectDescendantIds(child.id, visited)
      })
      return visited
    },
    loadData() {
      this.departments = getDepartments()
    },
    resetForm() {
      this.editingId = ''
      this.message = ''
      this.form = {
        parentId: '',
        name: '',
        leader: '',
        phone: '',
        order: 1,
        status: 'enabled',
        customLevel: null
      }
    },
    displayLevel(row) {
      const custom = Number(row.customLevel)
      if (Number.isFinite(custom) && custom > 0) return custom
      return Number(row.level || 1)
    },
    saveItem() {
      this.message = ''
      const parentId = normalizeParentId(this.form.parentId)
      if (parentId) {
        const parent = this.departments.find((item) => item.id === parentId)
        if (!parent) {
          this.message = '上级部门不存在'
          return
        }
        if (this.editingId && parentId === this.editingId) {
          this.message = '上级部门不能选择自己'
          return
        }
        if (this.editingId && this.collectDescendantIds(this.editingId).has(parentId)) {
          this.message = '上级部门不能选择当前部门的子级'
          return
        }
      }

      const payload = {
        parentId,
        name: this.form.name,
        leader: this.form.leader,
        phone: this.form.phone,
        order: Number(this.form.order || 1),
        status: this.form.status,
        customLevel: this.form.customLevel ? Number(this.form.customLevel) : null
      }

      if (this.editingId) {
        this.departments = this.departments.map((item) => (item.id === this.editingId ? { ...item, ...payload } : item))
        this.message = '部门已更新'
      } else {
        this.departments.push({ id: createRecordId('dept'), ...payload })
        this.message = '部门已新增'
      }

      saveDepartments(this.departments)
      this.resetForm()
      this.loadData()
    },
    editItem(row) {
      this.editingId = row.id
      this.message = ''
      this.form = {
        parentId: row.parentId || '',
        name: row.name || '',
        leader: row.leader || '',
        phone: row.phone || '',
        order: Number(row.order || 1),
        status: row.status || 'enabled',
        customLevel: row.customLevel ? Number(row.customLevel) : null
      }
    },
    removeItem(row) {
      const hasChildren = this.departments.some((item) => item.parentId === row.id)
      if (hasChildren) {
        this.message = '请先删除子部门'
        return
      }
      if (!window.confirm(`确认删除部门「${row.name}」吗？`)) return
      this.departments = this.departments.filter((item) => item.id !== row.id)
      saveDepartments(this.departments)
      if (this.editingId === row.id) this.resetForm()
      this.loadData()
      this.message = '部门已删除'
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
  grid-template-columns: 1.2fr 1fr;
  gap: 12px;
}

.panel {
  border: 1px solid var(--app-border);
  border-radius: 14px;
  background: var(--app-card);
  padding: 14px;
}

.panel h3 {
  margin: 0 0 10px;
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

.name-text {
  display: inline-block;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
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

.input {
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: var(--app-card-elevated);
  color: var(--app-text);
  padding: 8px 10px;
}

.actions {
  display: flex;
  gap: 8px;
  align-items: end;
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
  grid-column: 1 / -1;
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
