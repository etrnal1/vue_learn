<template>
  <div class="code-playground">
    <div class="playground-header">
      <h2>💻 代码编辑器</h2>
      <div class="header-actions">
        <button @click="saveSnippet" class="btn-save">💾 保存片段</button>
        <button @click="loadSnippet" class="btn-load">📂 加载片段</button>
        <button @click="clearAll" class="btn-clear">🗑️ 清空全部</button>
      </div>
    </div>

    <div class="playground-container">
      <div class="editor-section">
        <h3>编辑代码</h3>
        <CodeEditor v-model="currentCode" v-model:lang="currentLanguage" />
      </div>

      <div class="executor-section">
        <h3>执行结果</h3>
        <CodeExecutor :code="currentCode" :language="currentLanguage" />
      </div>
    </div>

    <!-- Snippets History -->
    <div class="snippets-section" v-if="snippets.length">
      <h3>代码片段历史</h3>
      <div class="snippets-list">
        <div v-for="(snippet, idx) in snippets" :key="idx" class="snippet-item">
          <div class="snippet-info">
            <span class="snippet-lang">{{ snippet.language }}</span>
            <span class="snippet-time">{{ formatDate(snippet.timestamp) }}</span>
            <span class="snippet-preview">{{ snippet.code.substring(0, 50) }}...</span>
          </div>
          <div class="snippet-actions">
            <button @click="loadSnippetCode(snippet)" class="btn-icon" title="加载">📥</button>
            <button @click="copySnippetCode(snippet)" class="btn-icon" title="复制">📋</button>
            <button @click="deleteSnippet(idx)" class="btn-icon delete" title="删除">🗑️</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Save Snippet Modal -->
    <ItsmModal v-if="showSaveModal" title="保存代码片段" size="small" @close="showSaveModal = false">
      <div class="form-group">
        <label>片段名称</label>
        <input v-model="snippetName" type="text" class="input-field" placeholder="如: 快速排序">
      </div>
      <div class="form-group">
        <label>描述</label>
        <textarea v-model="snippetDesc" class="textarea-field" rows="2" placeholder="简要描述此代码片段"></textarea>
      </div>
      <template #footer>
        <button @click="showSaveModal = false" class="btn-secondary">取消</button>
        <button @click="confirmSave" class="btn-primary">保存</button>
      </template>
    </ItsmModal>
  </div>
</template>

<script>
import CodeEditor from '../../components/itsm/CodeEditor.vue'
import CodeExecutor from '../../components/itsm/CodeExecutor.vue'
import ItsmModal from '../../components/itsm/ItsmModal.vue'
import { api } from '../../utils/api.js'

export default {
  name: 'CodePlaygroundSection',
  components: { CodeEditor, CodeExecutor, ItsmModal },
  data() {
    return {
      currentCode: '# 输入 Python 代码\nprint("Hello, World!")',
      currentLanguage: 'python',
      snippets: [],
      showSaveModal: false,
      snippetName: '',
      snippetDesc: ''
    }
  },
  methods: {
    saveSnippet() {
      this.snippetName = ''
      this.snippetDesc = ''
      this.showSaveModal = true
    },
    async confirmSave() {
      if (!this.snippetName.trim()) {
        alert('请输入片段名称')
        return
      }

      try {
        const snippet = {
          name: this.snippetName,
          description: this.snippetDesc,
          code: this.currentCode,
          language: this.currentLanguage
        }
        const created = await api.snippets.create(snippet)
        this.snippets.unshift(created)
        this.showSaveModal = false
        alert('✅ 片段已保存')
      } catch (error) {
        console.error('保存失败:', error)
        alert('保存失败: ' + error.message)
      }
    },
    async loadSnippet() {
      try {
        const snippets = await api.snippets.getAll()
        this.snippets = Array.isArray(snippets) ? snippets : []
        if (this.snippets.length === 0) {
          console.log('暂无保存的代码片段')
          // 不显示警告，这是正常的
        }
      } catch (error) {
        console.error('加载代码片段失败:', error)
        this.snippets = []
        // 即使加载失败，也要继续使用编辑器
      }
    },
    loadSnippetCode(snippet) {
      this.currentCode = snippet.code
      this.currentLanguage = snippet.language
    },
    async copySnippetCode(snippet) {
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(snippet.code)
        } else {
          const textarea = document.createElement('textarea')
          textarea.value = snippet.code
          textarea.style.position = 'fixed'
          textarea.style.opacity = '0'
          document.body.appendChild(textarea)
          textarea.select()
          document.execCommand('copy')
          document.body.removeChild(textarea)
        }
        alert('✅ 代码已复制')
      } catch (error) {
        console.error('复制失败:', error)
        alert('复制失败，请手动复制')
      }
    },
    async deleteSnippet(idx) {
      if (confirm('确定删除此片段?')) {
        try {
          const snippet = this.snippets[idx]
          await api.snippets.delete(snippet.id)
          this.snippets.splice(idx, 1)
        } catch (error) {
          console.error('删除失败:', error)
          alert('删除失败: ' + error.message)
        }
      }
    },
    async clearAll() {
      if (confirm('确定要清空所有代码和片段吗?')) {
        try {
          for (const snippet of this.snippets) {
            await api.snippets.delete(snippet.id)
          }
          this.currentCode = ''
          this.snippets = []
        } catch (error) {
          console.error('清空失败:', error)
          alert('清空失败: ' + error.message)
        }
      }
    },
    formatDate(ts) {
      return new Date(ts).toLocaleDateString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  },
  mounted() {
    this.loadSnippet()
  }
}
</script>

<style scoped>
.code-playground {
  animation: fadeIn 0.4s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.playground-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
}

.playground-header h2 {
  margin: 0;
  color: #333;
  font-size: 1.4em;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.btn-save, .btn-load, .btn-clear {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.9em;
}

.btn-save {
  background: #3b82f6;
  color: white;
}
.btn-save:hover { background: #2563eb; }

.btn-load {
  background: #8b5cf6;
  color: white;
}
.btn-load:hover { background: #7c3aed; }

.btn-clear {
  background: #ef4444;
  color: white;
}
.btn-clear:hover { background: #dc2626; }

.playground-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 28px;
}

.editor-section, .executor-section {
  display: flex;
  flex-direction: column;
}

.editor-section h3, .executor-section h3 {
  margin: 0 0 12px;
  color: #333;
  font-size: 1em;
  font-weight: 700;
}

.snippets-section {
  background: white;
  border-radius: 10px;
  padding: 22px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.snippets-section h3 {
  margin: 0 0 16px;
  color: #333;
}

.snippets-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 300px;
  overflow-y: auto;
}

.snippet-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  transition: all 0.2s;
}

.snippet-item:hover {
  border-color: #3b82f6;
  background: #eff6ff;
}

.snippet-info {
  display: flex;
  gap: 12px;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.snippet-lang {
  padding: 3px 8px;
  background: #dbeafe;
  color: #1e40af;
  border-radius: 4px;
  font-size: 0.75em;
  font-weight: 700;
  white-space: nowrap;
}

.snippet-time {
  font-size: 0.8em;
  color: #999;
}

.snippet-preview {
  color: #666;
  font-size: 0.85em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.snippet-actions {
  display: flex;
  gap: 6px;
}

.btn-icon {
  background: none;
  border: none;
  font-size: 1em;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 4px;
  transition: background 0.2s;
}

.btn-icon:hover {
  background: #e5e7eb;
}

.btn-icon.delete:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

/* Modal forms */
.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 600;
  color: #333;
  font-size: 0.9em;
}

.input-field {
  width: 100%;
  padding: 10px 12px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.95em;
  font-family: inherit;
  transition: all 0.3s;
}

.input-field:focus {
  outline: none;
  border-color: #3b82f6;
}

.textarea-field {
  width: 100%;
  padding: 10px 12px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.95em;
  font-family: inherit;
  resize: vertical;
}

.textarea-field:focus {
  outline: none;
  border-color: #3b82f6;
}

.btn-primary {
  padding: 8px 20px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}

.btn-secondary {
  padding: 8px 20px;
  background: #e5e7eb;
  color: #333;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}

@media (max-width: 1024px) {
  .playground-container {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 1024px) {
  .playground-container {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .editor-section, .executor-section {
    max-height: 500px;
  }
}

@media (max-width: 768px) {
  .code-playground {
    padding: 0;
  }

  .playground-header {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
    margin-bottom: 12px;
  }

  .playground-header h2 {
    font-size: 1.1em;
  }

  .header-actions {
    width: 100%;
    flex-wrap: wrap;
    gap: 6px;
  }

  .btn-save, .btn-load, .btn-clear {
    flex: 1;
    padding: 6px 12px;
    font-size: 0.8em;
  }

  .playground-container {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .editor-section h3, .executor-section h3 {
    font-size: 0.9em;
    margin-bottom: 8px;
  }

  .snippets-section {
    padding: 12px;
    margin-top: 12px;
  }

  .snippet-item {
    flex-direction: column;
    gap: 8px;
    padding: 8px;
  }

  .snippet-info {
    flex-wrap: wrap;
    width: 100%;
  }

  .snippet-actions {
    width: 100%;
    justify-content: flex-start;
  }
}

@media (max-width: 480px) {
  .playground-header h2 {
    font-size: 1em;
  }

  .btn-save, .btn-load, .btn-clear {
    padding: 6px 8px;
    font-size: 0.75em;
  }

  .snippets-list {
    max-height: 250px;
  }
}
</style>
