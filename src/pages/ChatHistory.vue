<template>
  <div class="chat-history">
    <!-- 新增聊天记录表单 -->
    <div class="add-chat-section">
      <h2>➕ 新增聊天记录</h2>
      <div class="form-group">
        <input
          v-model="newChat.title"
          type="text"
          placeholder="聊天标题..."
          class="input-field"
        >
        <textarea
          v-model="newChat.content"
          placeholder="聊天内容..."
          class="textarea-field"
          rows="4"
        ></textarea>
        <button @click="addChat" class="btn-primary">💾 保存</button>
      </div>
    </div>

    <!-- 聊天记录列表 -->
    <div class="chats-section">
      <h2>📋 聊天记录 ({{ chats.length }})</h2>

      <div class="search-bar">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索聊天记录..."
          class="search-input"
        >
      </div>

      <div v-if="filteredChats.length === 0" class="empty-state">
        <p>😴 还没有聊天记录，快去创建一个吧！</p>
      </div>

      <div class="chats-grid">
        <ChatCard
          v-for="chat in filteredChats"
          :key="chat.id"
          :chat="chat"
          @edit="editChat"
          @delete="deleteChat"
          @toggle-comments="toggleComments"
          :show-comments="expandedChatId === chat.id"
          @add-comment="addComment"
          @delete-comment="deleteComment"
          @edit-comment="editComment"
        />
      </div>
    </div>

    <!-- 编辑模态框 -->
    <div v-if="editingChat" class="modal-overlay" @click="cancelEdit">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>✏️ 编辑聊天记录</h3>
          <button @click="cancelEdit" class="btn-close">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>标题</label>
            <input
              v-model="editingChat.title"
              type="text"
              class="input-field"
            >
          </div>
          <div class="form-group">
            <label>内容</label>
            <textarea
              v-model="editingChat.content"
              class="textarea-field"
              rows="6"
            ></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="cancelEdit" class="btn-secondary">取消</button>
          <button @click="saveEdit" class="btn-primary">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import ChatCard from '../components/ChatCard.vue'

export default {
  name: 'ChatHistory',
  components: {
    ChatCard
  },
  data() {
    return {
      chats: [],
      newChat: {
        title: '',
        content: ''
      },
      searchQuery: '',
      editingChat: null,
      expandedChatId: null
    }
  },
  computed: {
    filteredChats() {
      if (!this.searchQuery) {
        return this.chats.sort((a, b) => b.createdAt - a.createdAt)
      }
      return this.chats.filter(chat =>
        chat.title.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        chat.content.toLowerCase().includes(this.searchQuery.toLowerCase())
      ).sort((a, b) => b.createdAt - a.createdAt)
    }
  },
  methods: {
    addChat() {
      if (!this.newChat.title.trim() || !this.newChat.content.trim()) {
        alert('请填写标题和内容')
        return
      }

      const chat = {
        id: Date.now(),
        title: this.newChat.title,
        content: this.newChat.content,
        createdAt: new Date().getTime(),
        updatedAt: new Date().getTime(),
        comments: []
      }

      this.chats.push(chat)
      this.newChat = { title: '', content: '' }
      this.saveTolocalStorage()
      alert('✅ 聊天记录已保存')
    },

    editChat(chat) {
      this.editingChat = JSON.parse(JSON.stringify(chat))
    },

    saveEdit() {
      const index = this.chats.findIndex(c => c.id === this.editingChat.id)
      if (index !== -1) {
        this.chats[index] = {
          ...this.editingChat,
          updatedAt: new Date().getTime()
        }
        this.saveTolocalStorage()
        this.editingChat = null
        alert('✅ 编辑成功')
      }
    },

    cancelEdit() {
      this.editingChat = null
    },

    deleteChat(id) {
      if (confirm('确定要删除这条聊天记录吗？')) {
        this.chats = this.chats.filter(chat => chat.id !== id)
        this.saveTolocalStorage()
        alert('✅ 已删除')
      }
    },

    toggleComments(id) {
      this.expandedChatId = this.expandedChatId === id ? null : id
    },

    addComment(payload) {
      const chat = this.chats.find(c => c.id === payload.chatId)
      if (chat) {
        const comment = {
          id: Date.now(),
          text: payload.text,
          createdAt: new Date().getTime()
        }
        chat.comments.push(comment)
        this.saveTolocalStorage()
      }
    },

    deleteComment(payload) {
      const chat = this.chats.find(c => c.id === payload.chatId)
      if (chat) {
        chat.comments = chat.comments.filter(c => c.id !== payload.commentId)
        this.saveTolocalStorage()
      }
    },

    editComment(payload) {
      const chat = this.chats.find(c => c.id === payload.chatId)
      if (chat) {
        const comment = chat.comments.find(c => c.id === payload.commentId)
        if (comment) {
          comment.text = payload.text
          this.saveTolocalStorage()
        }
      }
    },

    saveTolocalStorage() {
      localStorage.setItem('chatHistory', JSON.stringify(this.chats))
    },

    loadFromlocalStorage() {
      const data = localStorage.getItem('chatHistory')
      if (data) {
        this.chats = JSON.parse(data)
      }
    }
  },
  mounted() {
    this.loadFromlocalStorage()
  }
}
</script>

<style scoped>
.chat-history {
  animation: fadeIn 0.5s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 新增聊天表单 */
.add-chat-section {
  background: white;
  border-radius: 12px;
  padding: 30px;
  margin-bottom: 40px;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
  border-left: 4px solid #667eea;
}

.add-chat-section h2 {
  font-size: 1.5em;
  color: #333;
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #333;
}

.input-field,
.textarea-field {
  width: 100%;
  padding: 12px 15px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 1em;
  font-family: inherit;
  transition: all 0.3s;
}

.input-field:focus,
.textarea-field:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 10px rgba(102, 126, 234, 0.2);
}

.textarea-field {
  resize: vertical;
}

/* 按钮 */
.btn-primary,
.btn-secondary,
.btn-danger,
.btn-warning {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 0.95em;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  margin-top: 15px;
}

.btn-primary:hover {
  box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
  transform: translateY(-2px);
}

.btn-secondary {
  background: #e5e7eb;
  color: #333;
}

.btn-secondary:hover {
  background: #d1d5db;
}

.btn-danger {
  background: #ef4444;
  color: white;
  padding: 8px 15px;
  font-size: 0.85em;
}

.btn-danger:hover {
  background: #dc2626;
}

.btn-warning {
  background: #f59e0b;
  color: white;
  padding: 8px 15px;
  font-size: 0.85em;
}

.btn-warning:hover {
  background: #d97706;
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.5em;
  cursor: pointer;
  color: #999;
}

.btn-close:hover {
  color: #333;
}

/* 聊天列表 */
.chats-section {
  background: white;
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
}

.chats-section h2 {
  font-size: 1.5em;
  color: #333;
  margin-bottom: 20px;
}

.search-bar {
  margin-bottom: 25px;
}

.search-input {
  width: 100%;
  padding: 12px 15px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 1em;
  transition: all 0.3s;
}

.search-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 10px rgba(102, 126, 234, 0.2);
}

.chats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #999;
  font-size: 1.2em;
}

/* 模态框 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease;
}

.modal {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    transform: translateY(50px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 2px solid #e5e7eb;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.3em;
  color: #333;
}

.modal-body {
  padding: 20px;
}

.modal-footer {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding: 20px;
  border-top: 2px solid #e5e7eb;
}

.modal-footer button {
  min-width: 100px;
}

@media (max-width: 768px) {
  .chats-grid {
    grid-template-columns: 1fr;
  }

  .add-chat-section,
  .chats-section {
    padding: 20px;
  }

  .modal {
    width: 95%;
  }
}
</style>
