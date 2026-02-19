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
      @add-user="addUser"
      @update-user="updateUser"
      @remove-user="removeUser"
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

const DEFAULT_USERS = [
  { id: 'u1', name: '张三', role: 'admin', avatar: '👨‍💻', email: 'zhangsan@example.com', createdAt: Date.now() },
  { id: 'u2', name: '李四', role: 'approver', avatar: '👩‍💻', email: 'lisi@example.com', createdAt: Date.now() },
  { id: 'u3', name: '王五', role: 'member', avatar: '🧑‍💼', email: 'wangwu@example.com', createdAt: Date.now() }
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
      counters: { ticket: 0, request: 0, article: 0, flow: 0 }
    }
  },
  methods: {
    // === User Management ===
    switchUser(user) {
      this.currentUser = user
      this.saveToStorage('itsm_current_user', user.id)
    },
    addUser(userData) {
      const user = {
        id: 'u' + Date.now(),
        ...userData,
        createdAt: Date.now()
      }
      this.users.push(user)
      this.saveToStorage('itsm_users', this.users)
    },
    updateUser(updated) {
      const idx = this.users.findIndex(u => u.id === updated.id)
      if (idx !== -1) {
        this.users[idx] = { ...this.users[idx], ...updated }
        if (this.currentUser.id === updated.id) {
          this.currentUser = this.users[idx]
        }
        this.saveToStorage('itsm_users', this.users)
      }
    },
    removeUser(id) {
      this.users = this.users.filter(u => u.id !== id)
      if (this.currentUser.id === id && this.users.length > 0) {
        this.currentUser = this.users[0]
        this.saveToStorage('itsm_current_user', this.currentUser.id)
      }
      this.saveToStorage('itsm_users', this.users)
    },

    // === Tickets ===
    createTicket(data) {
      this.counters.ticket++
      const ticket = {
        id: 't' + Date.now(),
        ticketNo: 'INC-' + String(this.counters.ticket).padStart(5, '0'),
        title: data.title,
        description: data.description,
        category: data.category,
        priority: data.priority,
        status: 'new',
        assigneeId: data.assigneeId || '',
        reporterId: this.currentUser.id,
        relatedArticleIds: [],
        attachments: data.attachments || [],
        comments: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        resolvedAt: null,
        closedAt: null
      }
      this.tickets.push(ticket)
      this.saveTickets()
    },
    updateTicket(updated) {
      const idx = this.tickets.findIndex(t => t.id === updated.id)
      if (idx !== -1) {
        this.tickets[idx] = { ...updated }
        this.saveTickets()
      }
    },
    deleteTicket(id) {
      this.tickets = this.tickets.filter(t => t.id !== id)
      this.saveTickets()
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
    createRequest(data) {
      this.counters.request++
      const request = {
        id: 'sr' + Date.now(),
        requestNo: 'SR-' + String(this.counters.request).padStart(5, '0'),
        serviceType: data.serviceType,
        title: data.title,
        description: data.description,
        priority: data.priority,
        status: data.status || 'submitted',
        requesterId: this.currentUser.id,
        approverId: '',
        assigneeId: '',
        approvalNote: '',
        comments: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        approvedAt: null,
        completedAt: null
      }
      this.serviceRequests.push(request)
      this.saveRequests()
    },
    updateRequest(updated) {
      const idx = this.serviceRequests.findIndex(r => r.id === updated.id)
      if (idx !== -1) {
        this.serviceRequests[idx] = { ...updated }
        this.saveRequests()
      }
    },
    deleteRequest(id) {
      this.serviceRequests = this.serviceRequests.filter(r => r.id !== id)
      this.saveRequests()
    },

    // === Articles ===
    createArticle(data) {
      this.counters.article++
      const article = {
        id: 'kb' + Date.now(),
        articleNo: 'KB-' + String(this.counters.article).padStart(5, '0'),
        title: data.title,
        content: data.content,
        category: data.category,
        tags: data.tags || [],
        authorId: this.currentUser.id,
        viewCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
      this.articles.push(article)
      this.saveArticles()
    },
    updateArticle(updated) {
      const idx = this.articles.findIndex(a => a.id === updated.id)
      if (idx !== -1) {
        this.articles[idx] = { ...updated }
        this.saveArticles()
      }
    },
    deleteArticle(id) {
      this.articles = this.articles.filter(a => a.id !== id)
      this.saveArticles()
    },

    // === Flows ===
    createFlow(data) {
      this.counters.flow++
      const flow = {
        id: 'flow' + Date.now(),
        flowNo: 'FLOW-' + String(this.counters.flow).padStart(5, '0'),
        name: data.name,
        description: data.description,
        icon: data.icon,
        steps: data.steps,
        authorId: this.currentUser.id,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
      this.flows.push(flow)
      this.saveFlows()
    },
    updateFlow(updated) {
      const idx = this.flows.findIndex(f => f.id === updated.id)
      if (idx !== -1) {
        this.flows[idx] = { ...updated }
        this.saveFlows()
      }
    },
    deleteFlow(id) {
      this.flows = this.flows.filter(f => f.id !== id)
      this.saveFlows()
    },
    saveFlows() {
      this.saveToStorage('itsm_flows', this.flows)
      this.saveToStorage('itsm_counters', this.counters)
    },

    // === Storage ===
    saveToStorage(key, data) {
      localStorage.setItem(key, JSON.stringify(data))
    },
    saveTickets() {
      this.saveToStorage('itsm_tickets', this.tickets)
      this.saveToStorage('itsm_counters', this.counters)
    },
    saveRequests() {
      this.saveToStorage('itsm_service_requests', this.serviceRequests)
      this.saveToStorage('itsm_counters', this.counters)
    },
    saveArticles() {
      this.saveToStorage('itsm_articles', this.articles)
      this.saveToStorage('itsm_counters', this.counters)
    },
    loadFromStorage() {
      try {
        const users = localStorage.getItem('itsm_users')
        this.users = users ? JSON.parse(users) : [...DEFAULT_USERS]

        const currentUserId = localStorage.getItem('itsm_current_user')
        if (currentUserId) {
          const id = JSON.parse(currentUserId)
          const found = this.users.find(u => u.id === id)
          if (found) this.currentUser = found
        }
        if (!this.users.find(u => u.id === this.currentUser.id)) {
          this.currentUser = this.users[0] || DEFAULT_USERS[0]
        }

        const tickets = localStorage.getItem('itsm_tickets')
        this.tickets = tickets ? JSON.parse(tickets) : []

        const requests = localStorage.getItem('itsm_service_requests')
        this.serviceRequests = requests ? JSON.parse(requests) : []

        const articles = localStorage.getItem('itsm_articles')
        this.articles = articles ? JSON.parse(articles) : []

        const flows = localStorage.getItem('itsm_flows')
        this.flows = flows ? JSON.parse(flows) : []

        const counters = localStorage.getItem('itsm_counters')
        this.counters = counters ? JSON.parse(counters) : { ticket: 0, request: 0, article: 0, flow: 0 }

        // First time: save defaults
        if (!users) {
          this.saveToStorage('itsm_users', this.users)
          this.saveToStorage('itsm_current_user', this.currentUser.id)
        }
      } catch (e) {
        console.error('Failed to load ITSM data:', e)
      }
    },
    importData(data) {
      if (data.itsm_users) {
        this.users = data.itsm_users
        this.saveToStorage('itsm_users', this.users)
      }
      if (data.itsm_tickets) {
        this.tickets = data.itsm_tickets
        this.saveToStorage('itsm_tickets', this.tickets)
      }
      if (data.itsm_service_requests) {
        this.serviceRequests = data.itsm_service_requests
        this.saveToStorage('itsm_service_requests', this.serviceRequests)
      }
      if (data.itsm_articles) {
        this.articles = data.itsm_articles
        this.saveToStorage('itsm_articles', this.articles)
      }
      if (data.itsm_flows) {
        this.flows = data.itsm_flows
        this.saveToStorage('itsm_flows', this.flows)
      }
      if (data.itsm_counters) {
        this.counters = data.itsm_counters
        this.saveToStorage('itsm_counters', this.counters)
      }
      if (data.itsm_current_user) {
        const found = this.users.find(u => u.id === data.itsm_current_user)
        if (found) {
          this.currentUser = found
          this.saveToStorage('itsm_current_user', found.id)
        }
      }
    },
    clearData() {
      const keys = ['itsm_users', 'itsm_current_user', 'itsm_tickets', 'itsm_service_requests', 'itsm_articles', 'itsm_flows', 'itsm_counters']
      keys.forEach(k => localStorage.removeItem(k))
      this.users = [...DEFAULT_USERS]
      this.currentUser = this.users[0]
      this.tickets = []
      this.serviceRequests = []
      this.articles = []
      this.flows = []
      this.counters = { ticket: 0, request: 0, article: 0, flow: 0 }
      this.saveToStorage('itsm_users', this.users)
      this.saveToStorage('itsm_current_user', this.currentUser.id)
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
