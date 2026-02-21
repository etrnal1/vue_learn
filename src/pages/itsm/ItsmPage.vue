<template>
  <div class="itsm-page">
    <div class="itsm-header">
      <h1>IT 服务管理</h1>
      <div class="header-right">
        <UserSwitcher :current-user="currentUser" :users="users" @switch-user="switchUser" />
      </div>
    </div>

    <ItsmSubTabs :activeTab="activeTab" :tabs="tabs" @update:activeTab="activeTab = $event" />

    <ProcessFlowSection
      v-if="activeTab === 'flows'"
      :flows="flows"
      :users="users"
      :current-user-id="currentUser.id"
      @create-flow="createFlow"
      @update-flow="updateFlow"
      @delete-flow="deleteFlow"
    />

    <CodePlaygroundSection
      v-if="activeTab === 'code'"
    />

    <GitLogSection
      v-if="activeTab === 'gitlog'"
    />

    <ItsmDashboard
      v-if="activeTab === 'dashboard'"
      :tickets="tickets"
      :requests="serviceRequests"
      :articles="articles"
      :users="users"
      @navigate="activeTab = $event"
      @view-ticket="viewTicketFromDashboard"
    />

    <IncidentSection
      v-if="activeTab === 'incidents'"
      ref="incidentSection"
      :tickets="tickets"
      :users="users"
      :current-user-id="currentUser.id"
      @create-ticket="createTicket"
      @update-ticket="updateTicket"
      @delete-ticket="deleteTicket"
    />

    <ServiceRequestSection
      v-if="activeTab === 'requests'"
      :requests="serviceRequests"
      :users="users"
      :current-user-id="currentUser.id"
      :service-catalog="serviceCatalog"
      @create-request="createRequest"
      @update-request="updateRequest"
      @delete-request="deleteRequest"
    />

    <KnowledgeBaseSection
      v-if="activeTab === 'knowledge'"
      :articles="articles"
      :users="users"
      :current-user-id="currentUser.id"
      @create-article="createArticle"
      @update-article="updateArticle"
      @delete-article="deleteArticle"
    />

    <KnowledgeArticlesSection
      v-if="activeTab === 'articles'"
    />

    <ItsmSettings
      v-if="activeTab === 'settings'"
      :users="users"
      :service-catalog="serviceCatalog"
      @add-user="addUser"
      @update-user="updateUser"
      @remove-user="removeUser"
      @create-service-catalog-item="createServiceCatalogItem"
      @update-service-catalog-item="updateServiceCatalogItem"
      @delete-service-catalog-item="deleteServiceCatalogItem"
      @import-data="importData"
      @clear-data="clearData"
    />
  </div>
</template>

<script>
import ItsmSubTabs from '../../components/itsm/ItsmSubTabs.vue'
import UserSwitcher from '../../components/itsm/UserSwitcher.vue'
import ItsmDashboard from './ItsmDashboard.vue'
import IncidentSection from './IncidentSection.vue'
import ServiceRequestSection from './ServiceRequestSection.vue'
import KnowledgeBaseSection from './KnowledgeBaseSection.vue'
import KnowledgeArticlesSection from './KnowledgeArticlesSection.vue'
import ItsmSettings from './ItsmSettings.vue'
import ProcessFlowSection from './ProcessFlowSection.vue'
import CodePlaygroundSection from './CodePlaygroundSection.vue'
import GitLogSection from './GitLogSection.vue'
import { api } from '../../utils/api.js'

const DEFAULT_USERS = [
  { id: 'u1', name: '张三', role: 'admin', avatar: '👨‍💻', email: 'zhangsan@example.com', createdAt: Date.now() },
  { id: 'u2', name: '李四', role: 'approver', avatar: '👩‍💻', email: 'lisi@example.com', createdAt: Date.now() },
  { id: 'u3', name: '王五', role: 'member', avatar: '🧑‍💼', email: 'wangwu@example.com', createdAt: Date.now() }
]

const DEFAULT_SERVICE_CATALOG = [
  { id: 'sc_account', serviceType: 'account', icon: '👤', name: '账号管理', description: '创建、修改或删除系统账号', formSchema: [], titleTemplate: '账号管理 - ', defaultPriority: 'medium', requiresApproval: true },
  { id: 'sc_software_install', serviceType: 'software_install', icon: '💿', name: '软件安装', description: '申请安装或更新软件', formSchema: [], titleTemplate: '软件安装 - ', defaultPriority: 'medium', requiresApproval: true },
  { id: 'sc_hardware', serviceType: 'hardware', icon: '🖥️', name: '硬件申请', description: '申请电脑、显示器等设备', formSchema: [], titleTemplate: '硬件申请 - ', defaultPriority: 'high', requiresApproval: true },
  { id: 'sc_permission', serviceType: 'permission', icon: '🔑', name: '权限申请', description: '申请系统或文件夹访问权限', formSchema: [], titleTemplate: '权限申请 - ', defaultPriority: 'high', requiresApproval: true },
  { id: 'sc_vpn', serviceType: 'vpn', icon: '🔒', name: 'VPN 配置', description: '申请 VPN 账号或排障', formSchema: [], titleTemplate: 'VPN 配置 - ', defaultPriority: 'medium', requiresApproval: false },
  { id: 'sc_email', serviceType: 'email', icon: '📧', name: '邮箱服务', description: '邮箱创建、密码重置、邮件组', formSchema: [], titleTemplate: '邮箱服务 - ', defaultPriority: 'low', requiresApproval: false },
  { id: 'sc_other', serviceType: 'other', icon: '📝', name: '其他', description: '其他 IT 服务请求', formSchema: [], titleTemplate: '其他请求 - ', defaultPriority: 'medium', requiresApproval: true }
]

export default {
  name: 'ItsmPage',
  components: {
    ItsmSubTabs, UserSwitcher, ItsmDashboard,
    IncidentSection, ServiceRequestSection, KnowledgeBaseSection, KnowledgeArticlesSection, ItsmSettings, ProcessFlowSection,
    CodePlaygroundSection, GitLogSection
  },
  data() {
    return {
      activeTab: 'dashboard',
      tabs: [
        { id: 'dashboard', label: '📊 仪表板' },
        { id: 'incidents', label: '🎫 事件管理' },
        { id: 'requests', label: '📋 服务请求' },
        { id: 'knowledge', label: '📚 知识库' },
        { id: 'articles', label: '📖 知识文章' },
        { id: 'flows', label: '🔄 流程管理' },
        { id: 'code', label: '💻 代码编辑器' },
        { id: 'gitlog', label: '📋 提交历史' },
        { id: 'settings', label: '⚙️ 设置' }
      ],
      users: [],
      currentUser: DEFAULT_USERS[0],
      tickets: [],
      serviceRequests: [],
      articles: [],
      flows: [],
      serviceCatalog: [...DEFAULT_SERVICE_CATALOG]
    }
  },
  methods: {
    normalizeCatalogItem(item) {
      const normalized = { ...item }
      if (typeof normalized.formSchema === 'string') {
        try {
          normalized.formSchema = JSON.parse(normalized.formSchema)
        } catch (error) {
          normalized.formSchema = []
        }
      }
      if (!Array.isArray(normalized.formSchema)) {
        normalized.formSchema = []
      }
      return normalized
    },
    // === User Management ===
    async switchUser(user) {
      try {
        await api.users.switchCurrent(user.id)
        this.currentUser = user
      } catch (error) {
        console.error('切换用户失败:', error)
        alert('切换用户失败: ' + error.message)
      }
    },
    async addUser(userData) {
      try {
        const user = {
          id: 'u' + Date.now(),
          ...userData,
          createdAt: Date.now()
        }
        const created = await api.users.create(user)
        this.users.push(created)
      } catch (error) {
        console.error('添加用户失败:', error)
        alert('添加用户失败: ' + error.message)
      }
    },
    async updateUser(updated) {
      try {
        const result = await api.users.update(updated.id, updated)
        const idx = this.users.findIndex(u => u.id === updated.id)
        if (idx !== -1) {
          this.users[idx] = result
          if (this.currentUser.id === updated.id) {
            this.currentUser = result
          }
        }
      } catch (error) {
        console.error('更新用户失败:', error)
        alert('更新用户失败: ' + error.message)
      }
    },
    async removeUser(id) {
      try {
        await api.users.delete(id)
        this.users = this.users.filter(u => u.id !== id)
        if (this.currentUser.id === id && this.users.length > 0) {
          this.currentUser = this.users[0]
          await api.users.switchCurrent(this.currentUser.id)
        }
      } catch (error) {
        console.error('删除用户失败:', error)
        alert('删除用户失败: ' + error.message)
      }
    },
    async createServiceCatalogItem(item) {
      try {
        const created = this.normalizeCatalogItem(await api.serviceCatalog.create(item))
        this.serviceCatalog.push(created)
        this.serviceCatalog.sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999))
      } catch (error) {
        console.error('创建服务目录失败:', error)
        alert('创建服务目录失败: ' + error.message)
      }
    },
    async updateServiceCatalogItem(item) {
      try {
        const updated = this.normalizeCatalogItem(await api.serviceCatalog.update(item.id, item))
        const idx = this.serviceCatalog.findIndex(s => s.id === item.id)
        if (idx !== -1) {
          this.serviceCatalog[idx] = updated
          this.serviceCatalog.sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999))
        }
      } catch (error) {
        console.error('更新服务目录失败:', error)
        alert('更新服务目录失败: ' + error.message)
      }
    },
    async deleteServiceCatalogItem(id) {
      try {
        await api.serviceCatalog.delete(id)
        this.serviceCatalog = this.serviceCatalog.filter(s => s.id !== id)
      } catch (error) {
        console.error('删除服务目录失败:', error)
        alert('删除服务目录失败: ' + error.message)
      }
    },

    // === Tickets ===
    async createTicket(data) {
      try {
        const ticket = {
          id: 't' + Date.now(),
          title: data.title,
          description: data.description,
          category: data.category,
          priority: data.priority,
          status: 'new',
          assigneeId: data.assigneeId || null,
          reporterId: this.currentUser.id,
          relatedArticleIds: [],
          attachments: data.attachments || []
        }
        const created = await api.tickets.create(ticket)
        // 将后端返回的字段名映射到前端格式
        created.comments = []
        this.tickets.unshift(created)
      } catch (error) {
        console.error('创建工单失败:', error)
        alert('创建工单失败: ' + error.message)
      }
    },
    async updateTicket(updated) {
      try {
        const result = await api.tickets.update(updated.id, updated)
        const idx = this.tickets.findIndex(t => t.id === updated.id)
        if (idx !== -1) {
          this.tickets[idx] = { ...result, comments: updated.comments || [] }
        }
      } catch (error) {
        console.error('更新工单失败:', error)
        alert('更新工单失败: ' + error.message)
      }
    },
    async deleteTicket(id) {
      try {
        await api.tickets.delete(id)
        this.tickets = this.tickets.filter(t => t.id !== id)
      } catch (error) {
        console.error('删除工单失败:', error)
        alert('删除工单失败: ' + error.message)
      }
    },
    viewTicketFromDashboard(ticket) {
      this.activeTab = 'incidents'
      this.$nextTick(() => {
        if (this.$refs.incidentSection) {
          this.$refs.incidentSection.openDetail(ticket)
        }
      })
    },

    // === Service Requests ===
    async createRequest(data) {
      try {
        const request = {
          id: 'sr' + Date.now(),
          serviceType: data.serviceType,
          title: data.title,
          description: data.description,
          formData: data.formData || {},
          priority: data.priority,
          status: data.status || 'submitted',
          requesterId: this.currentUser.id,
          approverId: null,
          assigneeId: null,
          approvalNote: null
        }
        const created = await api.requests.create(request)
        created.comments = []
        this.serviceRequests.unshift(created)
      } catch (error) {
        console.error('创建服务请求失败:', error)
        alert('创建服务请求失败: ' + error.message)
      }
    },
    async updateRequest(updated) {
      try {
        const result = await api.requests.update(updated.id, updated)
        const idx = this.serviceRequests.findIndex(r => r.id === updated.id)
        if (idx !== -1) {
          this.serviceRequests[idx] = { ...result, comments: updated.comments || [] }
        }
      } catch (error) {
        console.error('更新服务请求失败:', error)
        alert('更新服务请求失败: ' + error.message)
      }
    },
    async deleteRequest(id) {
      try {
        await api.requests.delete(id)
        this.serviceRequests = this.serviceRequests.filter(r => r.id !== id)
      } catch (error) {
        console.error('删除服务请求失败:', error)
        alert('删除服务请求失败: ' + error.message)
      }
    },

    // === Articles ===
    async createArticle(data) {
      try {
        const uniqueId = `kb${Date.now()}_${Math.random().toString(16).slice(2, 8)}`
        const article = {
          id: uniqueId,
          title: data.title,
          content: data.content,
          category: data.category,
          tags: data.tags || [],
          authorId: this.currentUser.id
        }
        const created = await api.articles.create(article)
        this.articles.unshift(created)
      } catch (error) {
        console.error('创建文章失败:', error)
        alert('创建文章失败: ' + error.message)
      }
    },
    async updateArticle(updated) {
      try {
        const result = await api.articles.update(updated.id, updated)
        const idx = this.articles.findIndex(a => a.id === updated.id)
        if (idx !== -1) {
          this.articles[idx] = result
        }
      } catch (error) {
        console.error('更新文章失败:', error)
        alert('更新文章失败: ' + error.message)
      }
    },
    async deleteArticle(id) {
      try {
        await api.articles.delete(id)
        this.articles = this.articles.filter(a => a.id !== id)
      } catch (error) {
        console.error('删除文章失败:', error)
        alert('删除文章失败: ' + error.message)
      }
    },

    // === Flows ===
    async createFlow(data) {
      try {
        const flow = {
          id: 'flow' + Date.now(),
          name: data.name,
          description: data.description,
          icon: data.icon,
          steps: data.steps,
          authorId: this.currentUser.id
        }
        const created = await api.flows.create(flow)
        this.flows.unshift(created)
      } catch (error) {
        console.error('创建流程失败:', error)
        alert('创建流程失败: ' + error.message)
      }
    },
    async updateFlow(updated) {
      try {
        const result = await api.flows.update(updated.id, updated)
        const idx = this.flows.findIndex(f => f.id === updated.id)
        if (idx !== -1) {
          this.flows[idx] = result
        }
      } catch (error) {
        console.error('更新流程失败:', error)
        alert('更新流程失败: ' + error.message)
      }
    },
    async deleteFlow(id) {
      try {
        await api.flows.delete(id)
        this.flows = this.flows.filter(f => f.id !== id)
      } catch (error) {
        console.error('删除流程失败:', error)
        alert('删除流程失败: ' + error.message)
      }
    },

    // === Data Loading ===
    async loadFromStorage() {
      try {
        // 加载用户
        let users = []
        try {
          users = await api.users.getAll()
        } catch (e) {
          console.warn('加载用户列表失败:', e)
          users = []
        }

        // 如果没有用户，创建默认用户
        if (users.length === 0) {
          try {
            for (const user of DEFAULT_USERS) {
              await api.users.create(user)
            }
            users = [...DEFAULT_USERS]
          } catch (e) {
            console.warn('创建默认用户失败:', e)
            users = [...DEFAULT_USERS]
          }
        }

        this.users = users

        // 加载当前用户
        let currentUser = null
        try {
          currentUser = await api.users.getCurrent()
        } catch (e) {
          console.warn('加载当前用户失败:', e)
        }

        if (currentUser) {
          this.currentUser = currentUser
        } else {
          this.currentUser = this.users[0] || DEFAULT_USERS[0]
          try {
            await api.users.switchCurrent(this.currentUser.id)
          } catch (e) {
            console.warn('切换用户失败:', e)
          }
        }

        // 加载工单（列表API不返回comments，需要补充默认值）
        try {
          const tickets = await api.tickets.getAll()
          this.tickets = Array.isArray(tickets) ? tickets.map(t => ({ comments: [], ...t })) : []
        } catch (e) {
          console.warn('加载工单失败:', e)
          this.tickets = []
        }

        // 加载服务请求
        try {
          const requests = await api.requests.getAll()
          this.serviceRequests = Array.isArray(requests) ? requests.map(r => ({ comments: [], ...r })) : []
        } catch (e) {
          console.warn('加载服务请求失败:', e)
          this.serviceRequests = []
        }

        // 加载服务目录
        try {
          const catalog = await api.serviceCatalog.getAll({ includeInactive: true })
          this.serviceCatalog = Array.isArray(catalog) && catalog.length > 0
            ? catalog.map(this.normalizeCatalogItem)
            : [...DEFAULT_SERVICE_CATALOG]
        } catch (e) {
          console.warn('加载服务目录失败:', e)
          this.serviceCatalog = [...DEFAULT_SERVICE_CATALOG]
        }

        // 加载文章
        try {
          const articles = await api.articles.getAll()
          this.articles = Array.isArray(articles) ? articles : []
        } catch (e) {
          console.warn('加载文章失败:', e)
          this.articles = []
        }

        // 加载流程
        try {
          const flows = await api.flows.getAll()
          this.flows = Array.isArray(flows) ? flows : []
        } catch (e) {
          console.warn('加载流程失败:', e)
          this.flows = []
        }

      } catch (e) {
        console.error('Failed to load ITSM data:', e)
        // 发生错误时使用默认数据
        this.users = [...DEFAULT_USERS]
        this.currentUser = this.users[0]
        this.tickets = []
        this.serviceRequests = []
        this.articles = []
        this.flows = []
        this.serviceCatalog = [...DEFAULT_SERVICE_CATALOG]
      }
    },
    async importData(data) {
      try {
        // 使用迁移 API 导入数据
        const result = await api.migrate.import(data)
        console.log('数据导入成功:', result)

        // 重新加载数据
        await this.loadFromStorage()

        alert('数据导入成功！')
      } catch (error) {
        console.error('数据导入失败:', error)
        alert('数据导入失败: ' + error.message)
      }
    },
    async clearData() {
      if (!confirm('确定要清空所有数据吗？此操作不可恢复！')) {
        return
      }

      try {
        // 删除所有数据（需要先删除依赖的数据）
        for (const flow of this.flows) {
          await api.flows.delete(flow.id)
        }
        for (const article of this.articles) {
          await api.articles.delete(article.id)
        }
        for (const request of this.serviceRequests) {
          await api.requests.delete(request.id)
        }
        for (const ticket of this.tickets) {
          await api.tickets.delete(ticket.id)
        }
        for (const user of this.users) {
          if (!DEFAULT_USERS.find(u => u.id === user.id)) {
            await api.users.delete(user.id)
          }
        }

        // 重置本地状态
        this.users = [...DEFAULT_USERS]
        this.currentUser = this.users[0]
        this.tickets = []
        this.serviceRequests = []
        this.articles = []
        this.flows = []
        this.serviceCatalog = [...DEFAULT_SERVICE_CATALOG]

        alert('数据清空成功！')
      } catch (error) {
        console.error('清空数据失败:', error)
        alert('清空数据失败: ' + error.message)
      }
    }
  },
  mounted() {
    this.loadFromStorage()
  }
}
</script>

<style scoped>
.itsm-page {
  animation: fadeIn 0.5s ease;
  transition: background 0.4s, color 0.4s;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.itsm-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.itsm-header h1 {
  margin: 0;
  font-size: 1.6em;
  background: var(--itsm-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

@media (max-width: 1024px) {
  .itsm-page { padding: 0; }
  .itsm-header { gap: 12px; margin-bottom: 16px; }
  .itsm-header h1 { font-size: 1.3em; }
}

@media (max-width: 768px) {
  .itsm-page { padding: 8px; }
  .itsm-header {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
    margin-bottom: 12px;
  }
  .itsm-header h1 { font-size: 1.1em; }
}

@media (max-width: 480px) {
  .itsm-page { padding: 4px; }
  .itsm-header { margin-bottom: 8px; }
  .itsm-header h1 { font-size: 1em; }
}
</style>

<!-- Unscoped: ITSM child component theme overrides (variables set by App.vue) -->
<style>
/* ============================
   ITSM Child Component Overrides
   (theme variables inherited from App.vue)
   ============================ */

/* Page background */
.app[data-theme] .itsm-page {
  background: var(--itsm-bg);
  color: var(--itsm-text);
  border-radius: 12px;
  padding: 20px;
  min-height: 80vh;
  transition: background 0.4s ease, color 0.4s ease;
}

/* Sub Tabs */
.app[data-theme] .itsm-page .itsm-sub-tabs {
  border-bottom-color: var(--itsm-border);
}

.app[data-theme] .itsm-page .sub-tab {
  background: var(--itsm-card-bg);
  border-color: var(--itsm-border);
  color: var(--itsm-text-secondary);
}

.app[data-theme] .itsm-page .sub-tab:hover {
  color: var(--itsm-primary);
  border-color: var(--itsm-primary);
}

.app[data-theme] .itsm-page .sub-tab.active {
  background: var(--itsm-gradient);
  color: white;
  border-color: transparent;
  box-shadow: 0 4px 12px var(--itsm-shadow);
}

/* Cards / Panels */
.app[data-theme] .itsm-page .stat-card,
.app[data-theme] .itsm-page .ticket-card,
.app[data-theme] .itsm-page .article-item,
.app[data-theme] .itsm-page .snippet-item,
.app[data-theme] .itsm-page .timeline-card,
.app[data-theme] .itsm-page .snippets-section,
.app[data-theme] .itsm-page .articles-list,
.app[data-theme] .itsm-page .article-detail,
.app[data-theme] .itsm-page .article-placeholder,
.app[data-theme] .itsm-page .service-card,
.app[data-theme] .itsm-page .request-card,
.app[data-theme] .itsm-page .flow-card,
.app[data-theme] .itsm-page .code-executor,
.app[data-theme] .itsm-page .settings-section {
  background: var(--itsm-card-bg);
  border-color: var(--itsm-border);
  color: var(--itsm-text);
}

/* Headings */
.app[data-theme] .itsm-page h2,
.app[data-theme] .itsm-page h3 {
  color: var(--itsm-text);
}

/* Text */
.app[data-theme] .itsm-page .commit-subject,
.app[data-theme] .itsm-page .article-title,
.app[data-theme] .itsm-page .detail-header h2,
.app[data-theme] .itsm-page .card-main {
  color: var(--itsm-text);
}

.app[data-theme] .itsm-page .commit-date,
.app[data-theme] .itsm-page .article-time,
.app[data-theme] .itsm-page .detail-meta,
.app[data-theme] .itsm-page .stat-label {
  color: var(--itsm-text-muted);
}

/* Buttons */
.app[data-theme] .itsm-page .btn-primary,
.app[data-theme] .itsm-page .btn-save {
  background: var(--itsm-primary);
}

.app[data-theme] .itsm-page .btn-primary:hover,
.app[data-theme] .itsm-page .btn-save:hover {
  background: var(--itsm-primary-dark);
}

/* Active / Selected States */
.app[data-theme] .itsm-page .article-item.active {
  background: var(--itsm-primary-light);
  border-left-color: var(--itsm-primary);
}

.app[data-theme] .itsm-page .category-btn.active,
.app[data-theme] .itsm-page .filter-btn.active {
  background: var(--itsm-primary);
  border-color: var(--itsm-primary);
  color: white;
}

.app[data-theme] .itsm-page .category-btn:hover,
.app[data-theme] .itsm-page .filter-btn:hover {
  border-color: var(--itsm-primary);
  color: var(--itsm-primary);
}

.app[data-theme] .itsm-page .category-btn,
.app[data-theme] .itsm-page .filter-btn {
  background: var(--itsm-card-bg);
  border-color: var(--itsm-border);
  color: var(--itsm-text-secondary);
}

/* Links & Hash */
.app[data-theme] .itsm-page .commit-hash {
  color: var(--itsm-primary);
  background: var(--itsm-primary-light);
}

/* Input / Search */
.app[data-theme] .itsm-page .search-input,
.app[data-theme] .itsm-page .input-field,
.app[data-theme] .itsm-page .textarea-field,
.app[data-theme] .itsm-page .language-select {
  background: var(--itsm-card-bg);
  border-color: var(--itsm-border);
  color: var(--itsm-text);
}

.app[data-theme] .itsm-page .search-input:focus,
.app[data-theme] .itsm-page .input-field:focus,
.app[data-theme] .itsm-page .textarea-field:focus {
  border-color: var(--itsm-primary);
}

/* Hover backgrounds */
.app[data-theme] .itsm-page .article-item:hover,
.app[data-theme] .itsm-page .snippet-item:hover {
  background: var(--itsm-hover-bg);
}

/* Timeline dot */
.app[data-theme] .itsm-page .timeline-dot {
  background: var(--itsm-card-bg);
}

/* Stat numbers */
.app[data-theme] .itsm-page .stat-number {
  color: var(--itsm-text);
}

/* Modal */
.app[data-theme] .itsm-page .modal {
  background: var(--itsm-card-bg);
  color: var(--itsm-text);
}

.app[data-theme] .itsm-page .modal-header {
  border-bottom-color: var(--itsm-border);
}

.app[data-theme] .itsm-page .modal-header h3 {
  color: var(--itsm-text);
}

.app[data-theme] .itsm-page .modal-footer {
  border-top-color: var(--itsm-border);
}

/* Markdown content */
.app[data-theme] .itsm-page .detail-content {
  color: var(--itsm-text);
}

/* Dark theme: special overrides for code editor */
.app[data-theme="dark"] .itsm-page .code-editor-container {
  border-color: var(--itsm-border);
}

.app[data-theme="dark"] .itsm-page .executor-header {
  background: var(--itsm-card-bg);
  border-bottom-color: var(--itsm-border);
}

.app[data-theme="dark"] .itsm-page .output-tabs {
  background: #1a2332;
  border-bottom-color: var(--itsm-border);
}

.app[data-theme="dark"] .itsm-page .output-tab {
  background: #1a2332;
  color: var(--itsm-text-muted);
}

.app[data-theme="dark"] .itsm-page .output-tab.active {
  color: var(--itsm-primary);
  border-bottom-color: var(--itsm-primary);
}

.app[data-theme="dark"] .itsm-page .output-text {
  background: var(--itsm-card-bg);
  color: var(--itsm-text);
}

.app[data-theme="dark"] .itsm-page .output-text pre {
  color: var(--itsm-text);
}

.app[data-theme="dark"] .itsm-page .info-item {
  border-bottom-color: var(--itsm-border);
}

.app[data-theme="dark"] .itsm-page .info-item .label {
  color: var(--itsm-text-secondary);
}

.app[data-theme="dark"] .itsm-page .info-item .value {
  color: var(--itsm-text-muted);
}

/* Dark: user switcher */
.app[data-theme="dark"] .itsm-page .user-switcher {
  background: var(--itsm-card-bg);
  border-color: var(--itsm-border);
  color: var(--itsm-text);
}

/* Dark: form sections */
.app[data-theme="dark"] .itsm-page .form-group label {
  color: var(--itsm-text);
}

.app[data-theme="dark"] .itsm-page .btn-secondary {
  background: var(--itsm-border);
  color: var(--itsm-text);
}

/* Dark: detail sections */
.app[data-theme="dark"] .itsm-page .detail-header {
  border-bottom-color: var(--itsm-border);
}

.app[data-theme="dark"] .itsm-page .commit-body {
  background: #0f172a;
  color: var(--itsm-text-secondary);
}

.app[data-theme="dark"] .itsm-page .file-item.file-added { background: rgba(16, 185, 129, 0.1); }
.app[data-theme="dark"] .itsm-page .file-item.file-modified { background: rgba(245, 158, 11, 0.1); }
.app[data-theme="dark"] .itsm-page .file-item.file-deleted { background: rgba(239, 68, 68, 0.1); }
.app[data-theme="dark"] .itsm-page .file-path { color: var(--itsm-text-secondary); }

/* Dark: back button */
.app[data-theme="dark"] .itsm-page .btn-back {
  background: var(--itsm-card-bg);
  border-color: var(--itsm-border);
  color: var(--itsm-primary);
}

/* Dark: close button */
.app[data-theme="dark"] .itsm-page .btn-close {
  color: var(--itsm-text-muted);
}

/* Dark: timeline */
.app[data-theme="dark"] .itsm-page .timeline::before {
  background: linear-gradient(to bottom, var(--itsm-primary), #8b5cf6, var(--itsm-border));
}

.app[data-theme="dark"] .itsm-page .change-bar {
  background: var(--itsm-border);
}

/* Dark: expand hint */
.app[data-theme="dark"] .itsm-page .expand-hint {
  color: var(--itsm-text-muted);
}

.app[data-theme="dark"] .itsm-page .generated-at {
  color: var(--itsm-text-muted);
  border-top-color: var(--itsm-border);
}

/* Dark: placeholder */
.app[data-theme="dark"] .itsm-page .article-placeholder,
.app[data-theme="dark"] .itsm-page .empty-output {
  color: var(--itsm-text-muted);
}
</style>
