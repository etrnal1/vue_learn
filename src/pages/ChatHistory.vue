<template>
  <div class="chat-history">
    <!-- 新增聊天记录表单 -->
    <div class="add-chat-section">
      <h2>新增聊天记录</h2>
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
        <button @click="addChat" class="btn-primary">保存</button>
      </div>
    </div>

    <!-- 聊天记录列表 -->
    <div class="chats-section">
      <h2>聊天记录 ({{ chats.length }})</h2>

      <div class="search-bar">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索聊天记录..."
          class="search-input"
        >
      </div>

      <div v-if="filteredChats.length === 0" class="empty-state">
        <p>还没有聊天记录，先新增一条吧。</p>
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
          <h3>编辑聊天记录</h3>
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
import { api } from '../utils/api.js'

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
    async addChat() {
      if (!this.newChat.title.trim() || !this.newChat.content.trim()) {
        alert('请填写标题和内容')
        return
      }

      try {
        const chat = {
          id: Date.now(),
          title: this.newChat.title,
          content: this.newChat.content
        }

        const created = await api.chats.create(chat)
        created.comments = []
        this.chats.unshift(created)
        this.newChat = { title: '', content: '' }
        alert('✅ 聊天记录已保存')
      } catch (error) {
        console.error('保存失败:', error)
        alert('保存失败: ' + error.message)
      }
    },

    editChat(chat) {
      this.editingChat = JSON.parse(JSON.stringify(chat))
    },

    async saveEdit() {
      try {
        const result = await api.chats.update(this.editingChat.id, {
          title: this.editingChat.title,
          content: this.editingChat.content
        })

        const index = this.chats.findIndex(c => c.id === this.editingChat.id)
        if (index !== -1) {
          this.chats[index] = {
            ...result,
            comments: this.chats[index].comments
          }
        }
        this.editingChat = null
        alert('✅ 编辑成功')
      } catch (error) {
        console.error('编辑失败:', error)
        alert('编辑失败: ' + error.message)
      }
    },

    cancelEdit() {
      this.editingChat = null
    },

    async deleteChat(id) {
      if (confirm('确定要删除这条聊天记录吗？')) {
        try {
          await api.chats.delete(id)
          this.chats = this.chats.filter(chat => chat.id !== id)
          alert('✅ 已删除')
        } catch (error) {
          console.error('删除失败:', error)
          alert('删除失败: ' + error.message)
        }
      }
    },

    toggleComments(id) {
      this.expandedChatId = this.expandedChatId === id ? null : id
    },

    async addComment(payload) {
      try {
        const comment = {
          commentId: Date.now(),
          text: payload.text
        }
        const created = await api.chats.addComment(payload.chatId, comment)

        const chat = this.chats.find(c => c.id === payload.chatId)
        if (chat) {
          chat.comments.push(created)
        }
      } catch (error) {
        console.error('添加评论失败:', error)
        alert('添加评论失败: ' + error.message)
      }
    },

    async deleteComment(payload) {
      try {
        await api.chats.deleteComment(payload.chatId, payload.commentId)

        const chat = this.chats.find(c => c.id === payload.chatId)
        if (chat) {
          chat.comments = chat.comments.filter(c => c.id !== payload.commentId)
        }
      } catch (error) {
        console.error('删除评论失败:', error)
        alert('删除评论失败: ' + error.message)
      }
    },

    async editComment(payload) {
      // 注意：当前API不支持编辑评论，需要先删除再添加
      try {
        await api.chats.deleteComment(payload.chatId, payload.commentId)
        const newComment = await api.chats.addComment(payload.chatId, {
          commentId: Date.now(),
          text: payload.text
        })

        const chat = this.chats.find(c => c.id === payload.chatId)
        if (chat) {
          const idx = chat.comments.findIndex(c => c.id === payload.commentId)
          if (idx !== -1) {
            chat.comments.splice(idx, 1, newComment)
          }
        }
      } catch (error) {
        console.error('编辑评论失败:', error)
        alert('编辑评论失败: ' + error.message)
      }
    },

    async loadFromlocalStorage() {
      try {
        const chats = await api.chats.getAll()
        this.chats = Array.isArray(chats) ? chats : []

        // 为每个聊天加载评论
        for (const chat of this.chats) {
          try {
            const fullChat = await api.chats.getOne(chat.id)
            chat.comments = Array.isArray(fullChat.comments) ? fullChat.comments : []
          } catch (e) {
            console.warn(`加载聊天 ${chat.id} 的评论失败:`, e)
            chat.comments = []
          }
        }
      } catch (error) {
        console.warn('加载聊天记录失败:', error)
        this.chats = []
        // 继续使用页面，不中断
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
  color: var(--app-text);
}

.add-chat-section {
  background: var(--app-card);
  border-radius: 18px;
  padding: 22px;
  margin-bottom: 14px;
  box-shadow: var(--app-soft-shadow);
  border: 1px solid var(--app-border);
}

.add-chat-section h2 {
  font-size: 1.12em;
  color: var(--app-text);
  margin-bottom: 12px;
}

.form-group {
  margin-bottom: 10px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 600;
  color: var(--app-text-secondary);
  font-size: 0.88em;
}

.input-field,
.textarea-field {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  font-size: 0.95em;
  font-family: inherit;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  background: var(--app-card-elevated);
  color: var(--app-text);
}

.input-field:focus,
.textarea-field:focus {
  outline: none;
  border-color: var(--app-primary);
  box-shadow: 0 0 0 3px var(--app-shadow-light);
}

.textarea-field {
  resize: vertical;
}

.btn-primary,
.btn-secondary,
.btn-danger,
.btn-warning {
  padding: 9px 14px;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  font-size: 0.86em;
}

.btn-primary {
  background: var(--app-primary);
  border-color: transparent;
  color: white;
  margin-top: 6px;
  box-shadow: 0 8px 18px var(--app-shadow);
}

.btn-primary:hover {
  transform: translateY(-1px);
}

.btn-secondary {
  background: var(--app-card-elevated);
  color: var(--app-text-secondary);
}

.btn-danger {
  background: #ff3b30;
  border-color: transparent;
  color: white;
  box-shadow: 0 8px 18px rgba(255, 59, 48, 0.24);
}

.btn-warning {
  background: #ff9500;
  border-color: transparent;
  color: white;
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.2em;
  cursor: pointer;
  color: var(--app-text-muted);
  padding: 4px 8px;
  border-radius: 10px;
}

.btn-close:hover {
  color: var(--app-text);
  background: var(--app-card-elevated);
}

.chats-section {
  background: var(--app-card);
  border-radius: 18px;
  padding: 22px;
  box-shadow: var(--app-soft-shadow);
  border: 1px solid var(--app-border);
}

.chats-section h2 {
  font-size: 1.12em;
  color: var(--app-text);
  margin-bottom: 12px;
}

.search-bar {
  margin-bottom: 14px;
}

.search-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  font-size: 0.95em;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  background: var(--app-card-elevated);
  color: var(--app-text);
}

.search-input:focus {
  outline: none;
  border-color: var(--app-primary);
  box-shadow: 0 0 0 3px var(--app-shadow-light);
}

.chats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 12px;
}

.empty-state {
  text-align: center;
  padding: 36px 20px;
  color: var(--app-text-muted);
  font-size: 0.96em;
  border: 1px dashed var(--app-border);
  border-radius: 14px;
  background: var(--app-card-elevated);
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--app-card);
  border-radius: 20px;
  box-shadow: 0 24px 50px rgba(0, 0, 0, 0.3);
  border: 1px solid var(--app-border);
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 18px;
  border-bottom: 1px solid var(--app-border);
}

.modal-header h3 {
  margin: 0;
  font-size: 1.02em;
  color: var(--app-text);
}

.modal-body {
  padding: 16px 18px;
}

.modal-footer {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding: 14px 18px 16px;
  border-top: 1px solid var(--app-border);
}

.modal-footer button {
  min-width: 88px;
}

@media (max-width: 768px) {
  .chats-grid {
    grid-template-columns: 1fr;
  }

  .add-chat-section,
  .chats-section {
    padding: 14px;
  }

  .modal {
    width: 96%;
    border-radius: 16px;
  }
}
</style>
