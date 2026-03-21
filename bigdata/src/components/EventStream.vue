<template>
  <div class="event-card">
    <div class="event-header">
      <span class="event-title">实时事件流</span>
      <span class="event-count">{{ events.length }} 条</span>
      <span class="pulse-dot"></span>
      <span class="live-label">LIVE</span>
    </div>
    <div class="event-list" ref="listEl">
      <transition-group name="event-slide" tag="div">
        <div v-for="e in events" :key="e.id" class="event-row" :style="{ '--ec': e.color }">
          <span class="event-icon">{{ e.icon }}</span>
          <span class="event-time">{{ e.time }}</span>
          <span class="event-type-badge" :style="{ background: e.color + '22', color: e.color }">
            {{ typeLabel(e.type) }}
          </span>
          <span class="event-msg">{{ e.msg }}</span>
        </div>
      </transition-group>
    </div>
  </div>
</template>

<script>
const TYPE_LABELS = {
  order: '订单', user: '用户', alert: '告警', pay: '支付', system: '系统'
}
export default {
  name: 'EventStream',
  props: {
    events: { type: Array, default: () => [] },
  },
  methods: {
    typeLabel(t) { return TYPE_LABELS[t] || t },
  },
}
</script>

<style scoped>
.event-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
}
.event-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.event-title { font-size: 12px; font-weight: 600; color: var(--text); }
.event-count { font-size: 11px; color: var(--text2); flex: 1; }
.pulse-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: #00e676;
  box-shadow: 0 0 6px #00e676;
  animation: blink 1.2s ease-in-out infinite;
}
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
.live-label { font-size: 10px; color: #00e676; font-weight: 700; letter-spacing: 1px; }

.event-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}
.event-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 14px;
  border-bottom: 1px solid #0a1120;
  font-size: 12px;
  transition: background 0.15s;
}
.event-row:hover { background: #0a1726; }
.event-icon { font-size: 14px; flex-shrink: 0; width: 20px; text-align: center; }
.event-time { color: var(--text3); flex-shrink: 0; font-size: 11px; width: 58px; }
.event-type-badge {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 4px;
  width: 36px;
  text-align: center;
}
.event-msg { color: var(--text2); flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* 进入动画 */
.event-slide-enter-active { transition: all 0.3s ease; }
.event-slide-enter-from   { opacity: 0; transform: translateX(-10px); }
</style>
