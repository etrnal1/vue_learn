<template>
  <div class="chat-card">
    <div class="chat-header">
      <div class="chat-title-section">
        <h3 class="chat-title">{{ chat.title }}</h3>
        <span class="chat-date">{{ formatDate(chat.createdAt) }}</span>
      </div>
      <div class="chat-actions">
        <button @click="$emit('edit')" class="btn-edit" title="编辑">编辑</button>
        <button @click="deleteChat" class="btn-delete" title="删除">删除</button>
      </div>
    </div>

    <div class="chat-content">
      {{ chat.content }}
    </div>

    <div class="chat-footer">
      <button @click="$emit('toggle-comments')" class="btn-toggle-comments">
        评论 ({{ (chat.comments || []).length }})
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
      <div v-if="!chat.comments || chat.comments.length === 0" class="no-comments">
        <p>还没有评论，快去评论吧！</p>
      </div>

      <div v-else class="comments-list">
        <div v-for="comment in (chat.comments || [])" :key="comment.id" class="comment-item">
          <div class="comment-header">
            <span class="comment-date">{{ formatDate(comment.createdAt) }}</span>
            <div class="comment-actions">
              <button
                @click="editingCommentId === comment.id ? stopEditingComment() : startEditingComment(comment.id, comment.text)"
                class="btn-comment-edit"
                title="编辑"
              >
                {{ editingCommentId === comment.id ? '取消' : '编辑' }}
              </button>
              <button
                @click="deleteCommentHandler(comment.id)"
                class="btn-comment-delete"
                title="删除"
              >
                删除
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
  background: var(--app-card);
  border-radius: 16px;
  padding: 14px;
  box-shadow: var(--app-soft-shadow);
  transition: border-color 0.2s ease, transform 0.2s ease;
  border: 1px solid var(--app-border);
}

.chat-card:hover {
  border-color: color-mix(in srgb, var(--app-primary) 40%, var(--app-border));
  transform: translateY(-1px);
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--app-border);
}

.chat-title-section {
  flex: 1;
}

.chat-title {
  font-size: 1em;
  color: var(--app-text);
  margin: 0 0 5px 0;
  word-break: break-word;
}

.chat-date {
  font-size: 0.77em;
  color: var(--app-text-muted);
}

.chat-actions {
  display: flex;
  gap: 6px;
  margin-left: 8px;
}

.btn-edit,
.btn-delete {
  background: var(--app-card-elevated);
  border: 1px solid var(--app-border);
  font-size: 0.78em;
  cursor: pointer;
  padding: 5px 8px;
  border-radius: 9px;
  transition: transform 0.15s ease;
  font-weight: 600;
}

.btn-edit {
  color: var(--app-primary);
}

.btn-delete {
  color: #ff3b30;
}

.chat-content {
  color: var(--app-text-secondary);
  line-height: 1.6;
  margin-bottom: 10px;
  padding: 10px;
  background: var(--app-card-elevated);
  border-radius: 10px;
  border: 1px solid var(--app-border);
  word-break: break-word;
  white-space: pre-wrap;
  font-size: 0.9em;
}

.chat-footer {
  display: flex;
  justify-content: center;
}

.btn-toggle-comments {
  background: var(--app-card-elevated);
  color: var(--app-text-secondary);
  border: 1px solid var(--app-border);
  padding: 8px 12px;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 600;
  transition: transform 0.2s ease;
  font-size: 0.82em;
}

.btn-toggle-comments:hover {
  transform: translateY(-1px);
}

.comments-section {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--app-border);
}

.comments-header {
  margin-bottom: 10px;
}

.comments-header h4 {
  margin: 0;
  color: var(--app-text);
  font-size: 0.9em;
}

.add-comment-form {
  margin-bottom: 12px;
  padding: 10px;
  background: var(--app-card-elevated);
  border-radius: 10px;
  border: 1px solid var(--app-border);
}

.comment-input {
  width: 100%;
  padding: 9px 10px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  font-size: 0.9em;
  font-family: inherit;
  resize: vertical;
  margin-bottom: 8px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  background: var(--app-card);
  color: var(--app-text);
}

.comment-input:focus {
  outline: none;
  border-color: var(--app-primary);
  box-shadow: 0 0 0 3px var(--app-shadow-light);
}

.btn-add-comment {
  background: var(--app-primary);
  color: white;
  border: 1px solid transparent;
  padding: 8px 12px;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.82em;
}

.no-comments {
  text-align: center;
  padding: 12px 10px;
  color: var(--app-text-muted);
  font-size: 0.84em;
}

.comments-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.comment-item {
  background: var(--app-card-elevated);
  border: 1px solid var(--app-border);
  border-radius: 10px;
  padding: 10px;
}

.comment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.comment-date {
  font-size: 0.75em;
  color: var(--app-text-muted);
}

.comment-actions {
  display: flex;
  gap: 4px;
}

.btn-comment-edit,
.btn-comment-delete {
  background: var(--app-card);
  border: 1px solid var(--app-border);
  font-size: 0.72em;
  cursor: pointer;
  padding: 3px 6px;
  border-radius: 8px;
  font-weight: 600;
}

.btn-comment-edit {
  color: var(--app-primary);
}

.btn-comment-delete {
  color: #ff3b30;
}

.comment-text {
  color: var(--app-text-secondary);
  line-height: 1.5;
  word-break: break-word;
  white-space: pre-wrap;
  font-size: 0.86em;
}

.comment-edit-mode {
  margin-top: 8px;
}

.comment-edit-input {
  width: 100%;
  padding: 9px 10px;
  border: 1px solid var(--app-primary);
  border-radius: 10px;
  font-size: 0.88em;
  font-family: inherit;
  resize: vertical;
  margin-bottom: 6px;
  background: var(--app-card);
  color: var(--app-text);
}

.comment-edit-input:focus {
  outline: none;
  box-shadow: 0 0 0 3px var(--app-shadow-light);
}

.edit-actions {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
}

.btn-save,
.btn-cancel {
  padding: 6px 10px;
  border: 1px solid var(--app-border);
  border-radius: 9px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.78em;
}

.btn-save {
  background: #34c759;
  border-color: transparent;
  color: white;
}

.btn-cancel {
  background: var(--app-card);
  color: var(--app-text-secondary);
}

@media (max-width: 640px) {
  .chat-card {
    padding: 12px;
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
    font-size: 0.94em;
  }

  .comment-input {
    font-size: 16px; /* 防止 iOS 自动缩放 */
  }
}
</style>
