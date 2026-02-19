<template>
  <span class="priority-badge" :class="'priority-' + priority">{{ label }}</span>
</template>

<script>
const PRIORITY_MAP = {
  low: '低',
  medium: '中',
  high: '高',
  critical: '紧急'
}

export default {
  name: 'PriorityBadge',
  props: {
    priority: { type: String, required: true }
  },
  computed: {
    label() {
      return PRIORITY_MAP[this.priority] || this.priority
    }
  }
}
</script>

<style scoped>
.priority-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.8em;
  font-weight: 700;
  white-space: nowrap;
}

.priority-low { background: #d1fae5; color: #065f46; }
.priority-medium { background: #fef3c7; color: #92400e; }
.priority-high { background: #fed7aa; color: #9a3412; }
.priority-critical { background: #fee2e2; color: #991b1b; }
</style>
