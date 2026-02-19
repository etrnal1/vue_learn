<template>
  <div class="itsm-dashboard">
    <h2>仪表板</h2>

    <!-- Stats Row -->
    <div class="stats-grid">
      <StatCard icon="🎫" :value="stats.totalTickets" label="总工单数" color="#3b82f6" />
      <StatCard icon="🔥" :value="stats.openTickets" label="待处理工单" color="#ef4444" />
      <StatCard icon="📋" :value="stats.totalRequests" label="服务请求" color="#8b5cf6" />
      <StatCard icon="📚" :value="stats.totalArticles" label="知识库文章" color="#10b981" />
      <StatCard icon="✅" :value="stats.resolvedToday" label="今日解决" color="#f59e0b" />
      <StatCard icon="👥" :value="stats.totalUsers" label="团队成员" color="#6366f1" />
    </div>

    <!-- Recent Tickets -->
    <div class="section-card">
      <div class="section-title">
        <h3>最近工单</h3>
        <button @click="$emit('navigate', 'incidents')" class="link-btn">查看全部 →</button>
      </div>
      <div v-if="recentTickets.length === 0" class="empty-hint">暂无工单</div>
      <div v-else class="recent-list">
        <div v-for="t in recentTickets" :key="t.id" class="recent-item" @click="$emit('view-ticket', t)">
          <div class="item-left">
            <span class="item-no">{{ t.ticketNo }}</span>
            <span class="item-title">{{ t.title }}</span>
          </div>
          <div class="item-right">
            <PriorityBadge :priority="t.priority" />
            <StatusBadge :status="t.status" />
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Requests -->
    <div class="section-card">
      <div class="section-title">
        <h3>最近服务请求</h3>
        <button @click="$emit('navigate', 'requests')" class="link-btn">查看全部 →</button>
      </div>
      <div v-if="recentRequests.length === 0" class="empty-hint">暂无请求</div>
      <div v-else class="recent-list">
        <div v-for="r in recentRequests" :key="r.id" class="recent-item">
          <div class="item-left">
            <span class="item-no sr-no">{{ r.requestNo }}</span>
            <span class="item-title">{{ r.title }}</span>
          </div>
          <StatusBadge :status="r.status" />
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="section-card">
      <h3>快速操作</h3>
      <div class="quick-actions">
        <button @click="$emit('navigate', 'incidents')" class="action-btn blue">+ 新建工单</button>
        <button @click="$emit('navigate', 'requests')" class="action-btn purple">+ 提交请求</button>
        <button @click="$emit('navigate', 'knowledge')" class="action-btn green">+ 写文章</button>
      </div>
    </div>
  </div>
</template>

<script>
import StatCard from '../../components/itsm/StatCard.vue'
import StatusBadge from '../../components/itsm/StatusBadge.vue'
import PriorityBadge from '../../components/itsm/PriorityBadge.vue'

export default {
  name: 'ItsmDashboard',
  components: { StatCard, StatusBadge, PriorityBadge },
  props: {
    tickets: { type: Array, required: true },
    requests: { type: Array, required: true },
    articles: { type: Array, required: true },
    users: { type: Array, required: true }
  },
  emits: ['navigate', 'view-ticket'],
  computed: {
    stats() {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayTs = today.getTime()
      return {
        totalTickets: this.tickets.length,
        openTickets: this.tickets.filter(t => t.status === 'new' || t.status === 'in_progress').length,
        totalRequests: this.requests.length,
        totalArticles: this.articles.length,
        resolvedToday: this.tickets.filter(t => t.resolvedAt && t.resolvedAt >= todayTs).length,
        totalUsers: this.users.length
      }
    },
    recentTickets() {
      return [...this.tickets].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5)
    },
    recentRequests() {
      return [...this.requests].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5)
    }
  }
}
</script>

<style scoped>
.itsm-dashboard { animation: fadeIn 0.4s ease; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

h2 { margin: 0 0 24px; color: #333; font-size: 1.4em; }

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 28px;
}

.section-card {
  background: white;
  border-radius: 10px;
  padding: 22px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-title h3 { margin: 0; color: #333; font-size: 1.1em; }

.link-btn {
  background: none;
  border: none;
  color: #3b82f6;
  font-weight: 600;
  cursor: pointer;
  font-size: 0.9em;
}
.link-btn:hover { text-decoration: underline; }

.empty-hint { text-align: center; color: #ccc; padding: 20px; }

.recent-list { display: flex; flex-direction: column; gap: 8px; }

.recent-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: #f9fafb;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.recent-item:hover { background: #eff6ff; }

.item-left { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
.item-right { display: flex; gap: 8px; align-items: center; }

.item-no { font-weight: 700; color: #3b82f6; font-size: 0.85em; white-space: nowrap; }
.sr-no { color: #8b5cf6; }
.item-title { color: #333; font-size: 0.9em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.quick-actions { display: flex; gap: 12px; flex-wrap: wrap; }

.action-btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
  color: white;
  transition: all 0.2s;
}
.action-btn:hover { transform: translateY(-2px); }
.blue { background: #3b82f6; }
.purple { background: #8b5cf6; }
.green { background: #10b981; }

@media (max-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  h2 {
    font-size: 1.2em;
  }
}

@media (max-width: 768px) {
  .itsm-dashboard {
    padding: 0;
  }

  h2 {
    font-size: 1.1em;
    margin-bottom: 16px;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    margin-bottom: 20px;
  }

  .section-card {
    padding: 16px;
    margin-bottom: 16px;
  }

  .section-title {
    margin-bottom: 12px;
  }

  .section-title h3 {
    font-size: 0.95em;
  }

  .link-btn {
    font-size: 0.85em;
  }

  .recent-item {
    padding: 8px 10px;
    font-size: 0.85em;
  }

  .item-left {
    gap: 8px;
  }

  .item-no {
    font-size: 0.8em;
  }

  .item-title {
    font-size: 0.85em;
  }

  .quick-actions {
    gap: 8px;
  }

  .action-btn {
    padding: 10px 16px;
    font-size: 0.85em;
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  h2 {
    font-size: 1em;
    margin-bottom: 12px;
  }

  .section-card {
    padding: 12px;
    margin-bottom: 12px;
    border-radius: 8px;
  }

  .section-title h3 {
    font-size: 0.9em;
  }

  .recent-item {
    padding: 6px 8px;
    flex-direction: column;
    gap: 6px;
  }

  .item-left {
    width: 100%;
    gap: 6px;
  }

  .item-right {
    width: 100%;
  }

  .quick-actions {
    flex-direction: column;
  }

  .action-btn {
    width: 100%;
    padding: 8px 12px;
    font-size: 0.8em;
  }
}
</style>
