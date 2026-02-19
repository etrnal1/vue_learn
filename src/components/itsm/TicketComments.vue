<template>
  <div class="ticket-comments">
    <h4>评论 ({{ comments.length }})</h4>
    <div class="add-comment">
      <textarea v-model="newText" placeholder="写下评论..." class="comment-input" rows="2"></textarea>
      <button @click="addComment" class="btn-add">发表评论</button>
    </div>
    <div v-if="comments.length === 0" class="no-comments">暂无评论</div>
    <div v-else class="comments-list">
      <div v-for="c in sortedComments" :key="c.id" class="comment-item">
        <div class="comment-header">
          <span class="comment-user">{{ getUserName(c.userId) }}</span>
          <span class="comment-date">{{ formatDate(c.createdAt) }}</span>
        </div>
        <div class="comment-text">{{ c.text }}</div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'TicketComments',
  props: {
    comments: { type: Array, default: () => [] },
    users: { type: Array, default: () => [] },
    currentUserId: { type: String, default: '' }
  },
  emits: ['add-comment'],
  data() {
    return { newText: '' }
  },
  computed: {
    sortedComments() {
      return [...this.comments].sort((a, b) => b.createdAt - a.createdAt)
    }
  },
  methods: {
    addComment() {
      if (!this.newText.trim()) return
      this.$emit('add-comment', this.newText.trim())
      this.newText = ''
    },
    getUserName(userId) {
      const user = this.users.find(u => u.id === userId)
      return user ? user.avatar + ' ' + user.name : '未知用户'
    },
    formatDate(ts) {
      return new Date(ts).toLocaleDateString('zh-CN', {
        month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
      })
    }
  }
}
</script>

<style scoped>
.ticket-comments {
  margin-top: 20px;
  border-top: 2px solid #f0f0f0;
  padding-top: 16px;
}

h4 {
  margin: 0 0 14px;
  color: #333;
  font-size: 1em;
}

.add-comment {
  margin-bottom: 16px;
}

.comment-input {
  width: 100%;
  padding: 10px 12px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.9em;
  font-family: inherit;
  resize: vertical;
  margin-bottom: 8px;
  transition: all 0.3s;
}

.comment-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 8px rgba(59, 130, 246, 0.2);
}

.btn-add {
  padding: 8px 16px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-add:hover {
  background: #2563eb;
}

.no-comments {
  text-align: center;
  color: #999;
  padding: 20px;
}

.comments-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.comment-item {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
}

.comment-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
}

.comment-user {
  font-weight: 600;
  color: #333;
  font-size: 0.85em;
}

.comment-date {
  color: #999;
  font-size: 0.8em;
}

.comment-text {
  color: #555;
  font-size: 0.9em;
  line-height: 1.5;
  white-space: pre-wrap;
}
</style>
