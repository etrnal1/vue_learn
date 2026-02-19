<template>
  <span class="status-badge" :class="statusClass">{{ label }}</span>
</template>

<script>
const STATUS_MAP = {
  new: { label: '新建', cls: 'new' },
  in_progress: { label: '处理中', cls: 'in-progress' },
  resolved: { label: '已解决', cls: 'resolved' },
  closed: { label: '已关闭', cls: 'closed' },
  draft: { label: '草稿', cls: 'draft' },
  submitted: { label: '已提交', cls: 'submitted' },
  approved: { label: '已审批', cls: 'approved' },
  rejected: { label: '已拒绝', cls: 'rejected' },
  completed: { label: '已完成', cls: 'completed' }
}

export default {
  name: 'StatusBadge',
  props: {
    status: { type: String, required: true }
  },
  computed: {
    statusClass() {
      return 'status-' + (STATUS_MAP[this.status]?.cls || 'new')
    },
    label() {
      return STATUS_MAP[this.status]?.label || this.status
    }
  }
}
</script>

<style scoped>
.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.8em;
  font-weight: 700;
  white-space: nowrap;
}

.status-new { background: #dbeafe; color: #1d4ed8; }
.status-in-progress { background: #fef3c7; color: #92400e; }
.status-resolved { background: #d1fae5; color: #065f46; }
.status-closed { background: #e5e7eb; color: #374151; }
.status-draft { background: #f3f4f6; color: #6b7280; }
.status-submitted { background: #dbeafe; color: #1d4ed8; }
.status-approved { background: #d1fae5; color: #065f46; }
.status-rejected { background: #fee2e2; color: #991b1b; }
.status-completed { background: #d1fae5; color: #065f46; }
</style>
