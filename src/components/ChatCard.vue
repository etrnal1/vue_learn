<template>
  <div class="chat-card">
    <div class="chat-header">
      <div class="chat-title-section">
        <h3 class="chat-title">{{ chat.title }}</h3>
        <span class="chat-date">{{ formatDate(chat.createdAt) }}</span>
      </div>
      <div class="chat-actions">
        <button @click="$emit('edit')" class="btn-edit" title="编辑">✏️</button>
        <button @click="deleteChat" class="btn-delete" title="删除">🗑️</button>
      </div>
    </div>

    <div class="chat-content">
      {{ chat.content }}
    </div>

    <div class="chat-footer">
      <button @click="$emit('toggle-comments')" class="btn-toggle-comments">
        💬 评论 ({{ chat.comments.length }})
      </button>
    </div>

    <!-- 评论部分 -->
    <div v-if="showComments" class="comments-section">
      <div class="comments-header">
        <h4>评论</h4>
      </div>

      <!-- 添加评论 -->
      <div class="add-comment-form">
        <textarea
          v-model="newCommentText"
          placeholder="写下你的评论..."
          class="comment-input"
          rows="2"
        ></textarea>
        <button @click="addComment" class="btn-add-comment">发表评论</button>
      </div>

      <!-- 评论列表 -->
      <div v-if="chat.comments.length === 0" class="no-comments">
        <p>还没有评论，快去评论吧！</p>
      </div>

      <div v-else class="comments-list">
        <div v-for="comment in chat.comments" :key="comment.id" class="comment-item">
          <div class="comment-header">
            <span class="comment-date">{{ formatDate(comment.createdAt) }}</span>
            <div class="comment-actions">
              <button
                @click="editingCommentId === comment.id ? stopEditingComment() : startEditingComment(comment.id, comment.text)"
                class="btn-comment-edit"
                title="编辑"
              >
                {{ editingCommentId === comment.id ? '✕' : '✏️' }}
              </button>
              <button
                @click="deleteCommentHandler(comment.id)"
                class="btn-comment-delete"
                title="删除"
              >
                🗑️
              </button>
            </div>
          </div>

          <!-- 编辑模式 -->
          <div v-if="editingCommentId === comment.id" class="comment-edit-mode">
            <textarea
              v-model="editingCommentText"
              class="comment-edit-input"
              rows="2"
            ></textarea>
            <div class="edit-actions">
              <button @click="saveCommentEdit(comment.id)" class="btn-save">保存</button>
              <button @click="stopEditingComment" class="btn-cancel">取消</button>
            </div>
          </div>

          <!-- 显示模式 -->
          <div v-else class="comment-text">
            {{ comment.text }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ChatCard',
  props: {
    chat: {
      type: Object,
      required: true
    },
    showComments: {
      type: Boolean,
      default: false
    }
  },
  emits: ['edit', 'delete', 'toggle-comments', 'add-comment', 'delete-comment', 'edit-comment'],
  data() {
    return {
      newCommentText: '',
      editingCommentId: null,
      editingCommentText: ''
    }
  },
  methods: {
    deleteChat() {
      if (confirm('确定要删除这条聊天记录吗？')) {
        this.$emit('delete')
      }
    },

    addComment() {
      if (!this.newCommentText.trim()) {
        alert('评论不能为空')
        return
      }

      this.$emit('add-comment', {
        chatId: this.chat.id,
        text: this.newCommentText
      })

      this.newCommentText = ''
    },

    deleteCommentHandler(commentId) {
      if (confirm('确定要删除这条评论吗？')) {
        this.$emit('delete-comment', {
          chatId: this.chat.id,
          commentId: commentId
        })
      }
    },

    startEditingComment(commentId, text) {
      this.editingCommentId = commentId
      this.editingCommentText = text
    },

    stopEditingComment() {
      this.editingCommentId = null
      this.editingCommentText = ''
    },

    saveCommentEdit(commentId) {
      if (!this.editingCommentText.trim()) {
        alert('评论不能为空')
        return
      }

      this.$emit('edit-comment', {
        chatId: this.chat.id,
        commentId: commentId,
        text: this.editingCommentText
      })

      this.stopEditingComment()
    },

    formatDate(timestamp) {
      const date = new Date(timestamp)
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  }
}
</script>

<style scoped>
.chat-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s;
  border: 1px solid #e5e7eb;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.chat-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-color: #667eea;
}

/* 聊天头部 */
.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 15px;
  padding-bottom: 15px;
  border-bottom: 2px solid #f0f0f0;
}

.chat-title-section {
  flex: 1;
}

.chat-title {
  font-size: 1.1em;
  color: #333;
  margin: 0 0 8px 0;
  word-break: break-word;
}

.chat-date {
  font-size: 0.85em;
  color: #999;
}

.chat-actions {
  display: flex;
  gap: 8px;
  margin-left: 10px;
}

.btn-edit,
.btn-delete {
  background: none;
  border: none;
  font-size: 1.1em;
  cursor: pointer;
  padding: 5px 8px;
  border-radius: 6px;
  transition: all 0.2s;
}

.btn-edit {
  color: #667eea;
}

.btn-edit:hover {
  background: rgba(102, 126, 234, 0.1);
}

.btn-delete {
  color: #ef4444;
}

.btn-delete:hover {
  background: rgba(239, 68, 68, 0.1);
}

/* 聊天内容 */
.chat-content {
  color: #555;
  line-height: 1.6;
  margin-bottom: 15px;
  padding: 12px;
  background: #f9fafb;
  border-radius: 8px;
  word-break: break-word;
  white-space: pre-wrap;
}

/* 聊天页脚 */
.chat-footer {
  display: flex;
  justify-content: center;
}

.btn-toggle-comments {
  background: #f0f0f0;
  color: #333;
  border: none;
  padding: 10px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s;
}

.btn-toggle-comments:hover {
  background: #e5e7eb;
  transform: translateY(-2px);
}

/* 评论部分 */
.comments-section {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 2px solid #f0f0f0;
  animation: expandComments 0.3s ease;
}

@keyframes expandComments {
  from {
    opacity: 0;
    max-height: 0;
  }
  to {
    opacity: 1;
    max-height: 1000px;
  }
}

.comments-header {
  margin-bottom: 15px;
}

.comments-header h4 {
  margin: 0;
  color: #333;
  font-size: 1em;
}

/* 添加评论表单 */
.add-comment-form {
  margin-bottom: 20px;
  padding: 15px;
  background: #f9fafb;
  border-radius: 8px;
}

.comment-input {
  width: 100%;
  padding: 10px 12px;
  border: 2px solid #e5e7eb;
  border-radius: 6px;
  font-size: 0.95em;
  font-family: inherit;
  resize: vertical;
  margin-bottom: 10px;
  transition: all 0.3s;
}

.comment-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 8px rgba(102, 126, 234, 0.2);
}

.btn-add-comment {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s;
}

.btn-add-comment:hover {
  box-shadow: 0 3px 10px rgba(102, 126, 234, 0.3);
}

/* 没有评论 */
.no-comments {
  text-align: center;
  padding: 20px 10px;
  color: #999;
}

/* 评论列表 */
.comments-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.comment-item {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  transition: all 0.3s;
}

.comment-item:hover {
  border-color: #667eea;
  box-shadow: 0 2px 6px rgba(102, 126, 234, 0.1);
}

.comment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.comment-date {
  font-size: 0.8em;
  color: #999;
}

.comment-actions {
  display: flex;
  gap: 6px;
}

.btn-comment-edit,
.btn-comment-delete {
  background: none;
  border: none;
  font-size: 0.9em;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 4px;
  transition: all 0.2s;
}

.btn-comment-edit {
  color: #667eea;
}

.btn-comment-edit:hover {
  background: rgba(102, 126, 234, 0.1);
}

.btn-comment-delete {
  color: #ef4444;
}

.btn-comment-delete:hover {
  background: rgba(239, 68, 68, 0.1);
}

/* 评论文本 */
.comment-text {
  color: #555;
  line-height: 1.5;
  word-break: break-word;
  white-space: pre-wrap;
}

/* 编辑模式 */
.comment-edit-mode {
  margin-top: 10px;
}

.comment-edit-input {
  width: 100%;
  padding: 10px 12px;
  border: 2px solid #667eea;
  border-radius: 6px;
  font-size: 0.95em;
  font-family: inherit;
  resize: vertical;
  margin-bottom: 8px;
  transition: all 0.3s;
}

.comment-edit-input:focus {
  outline: none;
  box-shadow: 0 0 8px rgba(102, 126, 234, 0.3);
}

.edit-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.btn-save,
.btn-cancel {
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s;
  font-size: 0.85em;
}

.btn-save {
  background: #10b981;
  color: white;
}

.btn-save:hover {
  background: #059669;
  transform: translateY(-2px);
}

.btn-cancel {
  background: #e5e7eb;
  color: #333;
}

.btn-cancel:hover {
  background: #d1d5db;
}

/* 响应式设计 */
@media (max-width: 640px) {
  .chat-card {
    padding: 15px;
  }

  .chat-header {
    flex-direction: column;
  }

  .chat-actions {
    margin-left: 0;
    margin-top: 10px;
    width: 100%;
    justify-content: flex-end;
  }

  .chat-title {
    font-size: 1em;
  }

  .comment-input {
    font-size: 16px; /* 防止 iOS 自动缩放 */
  }
}
</style>
