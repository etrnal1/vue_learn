<template>
  <div class="itsm-page">
    <div class="itsm-header">
      <h1>IT 服务管理</h1>
      <UserSwitcher :current-user="currentUser" :users="users" @switch-user="switchUser" />
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
    CodePlaygroundSection
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

.itsm-header h1 {
  margin: 0;
  font-size: 1.6em;
  color: #333;
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

@media (max-width: 1024px) {
  .itsm-page {
    padding: 0;
  }

  .itsm-header {
    gap: 12px;
    margin-bottom: 16px;
  }

  .itsm-header h1 {
    font-size: 1.3em;
  }
}

@media (max-width: 768px) {
  .itsm-page {
    padding: 8px;
  }

  .itsm-header {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
    margin-bottom: 12px;
  }

  .itsm-header h1 {
    font-size: 1.1em;
  }
}

@media (max-width: 480px) {
  .itsm-page {
    padding: 4px;
  }

  .itsm-header {
    margin-bottom: 8px;
  }

  .itsm-header h1 {
    font-size: 1em;
  }
}
</style>
