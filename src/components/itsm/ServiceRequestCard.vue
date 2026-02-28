<template>
  <div class="sr-card" @click="$emit('view', request)">
    <div class="sr-header">
      <span class="sr-no">{{ request.requestNo }}</span>
      <StatusBadge :status="request.status" />
    </div>
    <h4 class="sr-title">{{ request.title }}</h4>
    <p class="sr-desc">{{ request.description }}</p>
    <div class="sr-meta">
      <span>{{ serviceTypeLabel }}</span>
      <PriorityBadge :priority="request.priority" />
      <span>{{ requesterName }}</span>
      <span>{{ formatDate(request.createdAt) }}</span>
    </div>
  </div>
</template>

<script>
import StatusBadge from './StatusBadge.vue'
import PriorityBadge from './PriorityBadge.vue'

const SERVICE_TYPE_MAP = {
  account: '账号管理',
  software_install: '软件安装',
  hardware: '硬件申请',
  permission: '权限申请',
  vpn: 'VPN 配置',
  email: '邮箱服务',
  other: '其他'
}

export default {
  name: 'ServiceRequestCard',
  components: { StatusBadge, PriorityBadge },
  props: {
    request: { type: Object, required: true },
    users: { type: Array, default: () => [] }
  },
  emits: ['view'],
  computed: {
    serviceTypeLabel() {
      return SERVICE_TYPE_MAP[this.request.serviceType] || this.request.serviceType
    },
    requesterName() {
      const user = this.users.find(u => u.id === this.request.requesterId)
      return user ? user.avatar + ' ' + user.name : '未知'
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
.sr-card {
  background: white;
  border-radius: 10px;
  padding: 18px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid #e5e7eb;
  cursor: pointer;
  transition: all 0.3s;
}

.sr-card:hover {
  border-color: #3b82f6;
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.12);
  transform: translateY(-2px);
}

.sr-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.sr-no {
  font-weight: 700;
  color: #8b5cf6;
  font-size: 0.85em;
}

.sr-title {
  margin: 0 0 8px;
  font-size: 1em;
  color: #333;
}

.sr-desc {
  color: #888;
  font-size: 0.85em;
  margin: 0 0 12px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.sr-meta {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
  font-size: 0.8em;
  color: #999;
  font-weight: 600;
}
</style>
