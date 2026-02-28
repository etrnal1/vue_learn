<template>
  <div class="ticket-card" @click="$emit('view', ticket)">
    <div class="ticket-header">
      <span class="ticket-no">{{ ticket.ticketNo }}</span>
      <div class="badges">
        <PriorityBadge :priority="ticket.priority" />
        <StatusBadge :status="ticket.status" />
      </div>
    </div>
    <h4 class="ticket-title">{{ ticket.title }}</h4>
    <p class="ticket-desc">{{ ticket.description }}</p>
    <div class="ticket-meta">
      <span class="meta-item">{{ categoryLabel }}</span>
      <span class="meta-item">{{ assigneeName }}</span>
      <span class="meta-item">{{ formatDate(ticket.createdAt) }}</span>
      <span v-if="ticket.comments && ticket.comments.length" class="meta-item">💬 {{ ticket.comments.length }}</span>
    </div>
  </div>
</template>

<script>
import StatusBadge from './StatusBadge.vue'
import PriorityBadge from './PriorityBadge.vue'

const CATEGORY_MAP = {
  infrastructure: '基础设施',
  software: '软件',
  hardware: '硬件',
  network: '网络',
  security: '安全',
  other: '其他'
}

export default {
  name: 'TicketCard',
  components: { StatusBadge, PriorityBadge },
  props: {
    ticket: { type: Object, required: true },
    users: { type: Array, default: () => [] }
  },
  emits: ['view'],
  computed: {
    categoryLabel() {
      return CATEGORY_MAP[this.ticket.category] || this.ticket.category
    },
    assigneeName() {
      const user = this.users.find(u => u.id === this.ticket.assigneeId)
      return user ? user.avatar + ' ' + user.name : '未分配'
    }
  },
  methods: {
    formatDate(ts) {
      return new Date(ts).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    }
  }
}
</script>

<style scoped>
.ticket-card {
  background: white;
  border-radius: 10px;
  padding: 18px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid #e5e7eb;
  cursor: pointer;
  transition: all 0.3s;
}

.ticket-card:hover {
  border-color: #3b82f6;
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.12);
  transform: translateY(-2px);
}

.ticket-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.ticket-no {
  font-weight: 700;
  color: #3b82f6;
  font-size: 0.85em;
}

.badges {
  display: flex;
  gap: 6px;
}

.ticket-title {
  margin: 0 0 8px;
  font-size: 1em;
  color: #333;
  line-height: 1.4;
}

.ticket-desc {
  color: #888;
  font-size: 0.85em;
  margin: 0 0 12px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.ticket-meta {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.meta-item {
  font-size: 0.8em;
  color: #999;
  font-weight: 600;
}
</style>
