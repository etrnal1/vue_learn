<template>
  <div class="admin-page">
    <div class="page-head">
      <h2>菜单管理</h2>
      <p>支持 1 级菜单、2 级菜单维护，并可配置后台左侧导航分组。</p>
    </div>

    <form class="panel form-grid" @submit.prevent="saveItem">
      <h3>{{ editingId ? '编辑菜单' : '新增菜单' }}</h3>
      <label class="field">
        <span>上级菜单</span>
        <select v-model="form.parentId" class="input">
          <option :value="''">无（一级菜单）</option>
          <option v-for="item in topMenus" :key="item.id" :value="item.id">{{ item.name }}</option>
        </select>
      </label>
      <label class="field">
        <span>菜单名称</span>
        <input v-model.trim="form.name" class="input" required />
      </label>
      <label class="field">
        <span>路由路径</span>
        <input v-model.trim="form.path" class="input" required placeholder="例如 /system/menu" />
      </label>
      <label class="field">
        <span>组件标识</span>
        <input v-model.trim="form.component" class="input" required placeholder="例如 MenuManagement" />
      </label>
      <label class="field">
        <span>图标</span>
        <input v-model.trim="form.icon" class="input" placeholder="可选" />
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
      <div class="actions">
        <button class="btn btn-primary" type="submit">{{ editingId ? '保存修改' : '新增菜单' }}</button>
        <button class="btn" type="button" @click="resetForm">重置</button>
      </div>
      <p v-if="message" class="message">{{ message }}</p>
    </form>

    <section class="panel">
      <h3>菜单列表</h3>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>层级</th>
              <th>名称</th>
              <th>路径</th>
              <th>组件</th>
              <th>排序</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in menuRows" :key="row.id">
              <td>{{ row.level === 1 ? '一级' : '二级' }}</td>
              <td>
                <span :class="['name-text', { child: row.level === 2 }]">{{ row.name }}</span>
              </td>
              <td>{{ row.path }}</td>
              <td>{{ row.component }}</td>
              <td>{{ row.order }}</td>
              <td>
                <span :class="['status-tag', row.status]">{{ row.status === 'enabled' ? '启用' : '停用' }}</span>
              </td>
              <td class="action-cell">
                <button class="link-btn" @click="editItem(row)">编辑</button>
                <button class="link-btn danger" @click="removeItem(row)">删除</button>
              </td>
            </tr>
            <tr v-if="menuRows.length === 0">
              <td colspan="7" class="empty">暂无菜单数据</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="panel">
      <div class="panel-head">
        <h3>后台导航分组配置</h3>
        <button class="btn btn-primary" type="button" @click="saveSidebarConfig">保存导航配置</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>模块</th>
              <th>分组编码</th>
              <th>分组名称</th>
              <th>分组图标</th>
              <th>分组排序</th>
              <th>菜单排序</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in navRows" :key="`nav-${row.id}`">
              <td class="nav-name">{{ row.label }}<small>{{ row.id }}</small></td>
              <td><input v-model.trim="row.groupKey" class="input input-sm" /></td>
              <td><input v-model.trim="row.groupTitle" class="input input-sm" /></td>
              <td><input v-model.trim="row.groupIcon" class="input input-sm" /></td>
              <td><input v-model.number="row.groupOrder" type="number" class="input input-sm" min="1" /></td>
              <td><input v-model.number="row.tabOrder" type="number" class="input input-sm" min="1" /></td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="navMessage" class="message">{{ navMessage }}</p>
    </section>
  </div>
</template>

<script>
import {
  createRecordId,
  getMenus,
  getSidebarNavConfig,
  saveMenus,
  saveSidebarNavConfig
} from '../../utils/adminMockStore.js'

const NAV_TAB_OPTIONS = [
  { id: 'home', label: '首页' },
  { id: 'spring', label: 'Spring 参考' },
  { id: 'excel', label: 'Excel 参考' },
  { id: 'chat', label: '聊天记录' },
  { id: 'itsm', label: 'IT 服务管理' },
  { id: 'git', label: 'Git 管理' },
  { id: 'video', label: '视频管理' },
  { id: 'music', label: '音乐管理' },
  { id: 'album', label: '相册管理' },
  { id: 'wiki', label: '维基百科' },
  { id: 'logs', label: '日志中心' },
  { id: 'weibo', label: '微博抓取' },
  { id: 'scheduler', label: '定时任务' },
  { id: 'docs', label: '文档中心' },
  { id: 'ffmpeg', label: 'FFmpeg 工具' },
  { id: 'monitor', label: '设备状态大屏' },
  { id: 'docker', label: 'Docker 管理' },
  { id: 'terminal', label: '本机终端' },
  { id: 'database', label: '数据库' },
  { id: 'userAdmin', label: '后台用户' },
  { id: 'menuManagement', label: '菜单管理' },
  { id: 'roleManagement', label: '角色管理' },
  { id: 'departmentManagement', label: '部门管理' },
  { id: 'flowTracking', label: '流程追踪' },
  { id: 'flowDiagram', label: '流程图编辑' },
  { id: 'flowPreview', label: '流程预览/导出' },
  { id: 'flowPreviewConsole', label: '流程预览（控制台风格）' },
  { id: 'flowAgentRunner', label: '流程代理执行' },
  { id: 'tradeFlowExplorer', label: '交易流程讲解' },
  { id: 'flowTasks', label: '流程任务' },
  { id: 'flowFiles', label: '流程文件管理' },
  { id: 'flowInstances', label: '流程实例管理' },
  { id: 'flowWorkItems', label: '流程工作项管理' },
  { id: 'flowManagement', label: '流程管理' },
  { id: 'flowAutomation', label: '流程自动化' },
  { id: 'authLogs', label: '认证日志' },
  { id: 'runtimeLogs', label: '实时日志' }
]

function sortMenus(a, b) {
  const orderDiff = Number(a.order || 0) - Number(b.order || 0)
  if (orderDiff !== 0) return orderDiff
  return String(a.name || '').localeCompare(String(b.name || ''), 'zh-CN')
}

function normalizeParentId(parentId) {
  const value = String(parentId || '').trim()
  return value || null
}

export default {
  name: 'MenuManagement',
  data() {
    return {
      menus: [],
      navRows: [],
      editingId: '',
      message: '',
      navMessage: '',
      form: {
        parentId: '',
        name: '',
        path: '',
        component: '',
        icon: '',
        order: 1,
        status: 'enabled'
      }
    }
  },
  computed: {
    topMenus() {
      return this.menus.filter((item) => !item.parentId).sort(sortMenus)
    },
    menuRows() {
      const top = this.topMenus
      const rows = []
      top.forEach((parent) => {
        rows.push({ ...parent, level: 1 })
        const children = this.menus
          .filter((item) => item.parentId === parent.id)
          .sort(sortMenus)
          .map((item) => ({ ...item, level: 2 }))
        rows.push(...children)
      })
      return rows
    }
  },
  methods: {
    loadData() {
      this.menus = getMenus()
      const config = getSidebarNavConfig()
      const map = Object.fromEntries(config.map((item) => [item.id, item]))
      this.navRows = NAV_TAB_OPTIONS.map((tab, index) => {
        const current = map[tab.id]
        return {
          id: tab.id,
          label: tab.label,
          groupKey: current?.groupKey || 'other',
          groupTitle: current?.groupTitle || '未分组',
          groupIcon: current?.groupIcon || '📁',
          groupOrder: Number(current?.groupOrder || 99),
          tabOrder: Number(current?.tabOrder || index + 1)
        }
      })
    },
    resetForm() {
      this.editingId = ''
      this.message = ''
      this.form = {
        parentId: '',
        name: '',
        path: '',
        component: '',
        icon: '',
        order: 1,
        status: 'enabled'
      }
    },
    saveItem() {
      this.message = ''
      const parentId = normalizeParentId(this.form.parentId)
      if (parentId) {
        const parent = this.menus.find((item) => item.id === parentId)
        if (!parent || parent.parentId) {
          this.message = '二级菜单只能挂在一级菜单下'
          return
        }
      }

      if (this.editingId) {
        this.menus = this.menus.map((item) => {
          if (item.id !== this.editingId) return item
          return {
            ...item,
            parentId,
            name: this.form.name,
            path: this.form.path,
            component: this.form.component,
            icon: this.form.icon,
            order: Number(this.form.order || 1),
            status: this.form.status
          }
        })
        this.message = '菜单已更新'
      } else {
        this.menus.push({
          id: createRecordId('menu'),
          parentId,
          name: this.form.name,
          path: this.form.path,
          component: this.form.component,
          icon: this.form.icon,
          order: Number(this.form.order || 1),
          status: this.form.status
        })
        this.message = '菜单已新增'
      }

      saveMenus(this.menus)
      this.resetForm()
      this.loadData()
    },
    saveSidebarConfig() {
      const payload = this.navRows.map((item) => ({
        id: item.id,
        groupKey: item.groupKey,
        groupTitle: item.groupTitle,
        groupIcon: item.groupIcon,
        groupOrder: Number(item.groupOrder || 99),
        tabOrder: Number(item.tabOrder || 99)
      }))
      saveSidebarNavConfig(payload)
      this.navMessage = '导航配置已保存，左侧菜单已实时刷新'
    },
    editItem(row) {
      this.editingId = row.id
      this.message = ''
      this.form = {
        parentId: row.parentId || '',
        name: row.name || '',
        path: row.path || '',
        component: row.component || '',
        icon: row.icon || '',
        order: Number(row.order || 1),
        status: row.status || 'enabled'
      }
    },
    removeItem(row) {
      const hasChildren = this.menus.some((item) => item.parentId === row.id)
      if (hasChildren) {
        this.message = '请先删除二级菜单后再删除一级菜单'
        return
      }
      if (!window.confirm(`确认删除菜单「${row.name}」吗？`)) return
      this.menus = this.menus.filter((item) => item.id !== row.id)
      saveMenus(this.menus)
      this.loadData()
      if (this.editingId === row.id) this.resetForm()
      this.message = '菜单已删除'
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

.panel {
  border: 1px solid var(--app-border);
  border-radius: 14px;
  background: var(--app-card);
  padding: 14px;
}

.panel-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
  margin-bottom: 10px;
}

.panel-head h3 {
  margin: 0;
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

.input-sm {
  min-width: 120px;
  padding: 6px 8px;
  font-size: 12px;
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

.nav-name {
  min-width: 160px;
}

.nav-name small {
  display: block;
  color: var(--app-text-muted);
  font-size: 11px;
  margin-top: 2px;
}

.name-text.child {
  padding-left: 18px;
  position: relative;
}

.name-text.child::before {
  content: '└';
  position: absolute;
  left: 0;
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
  grid-column: 1 / -1;
  margin: 0;
  color: var(--app-text-secondary);
}
</style>
