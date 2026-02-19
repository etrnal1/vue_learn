<template>
  <div class="article-editor">
    <div class="form-group">
      <label>标题 *</label>
      <input v-model="form.title" type="text" class="input-field" placeholder="请输入文章标题">
    </div>
    <div class="form-row">
      <div class="form-group half">
        <label>分类</label>
        <select v-model="form.category" class="select-field">
          <option value="故障排除">故障排除</option>
          <option value="操作指南">操作指南</option>
          <option value="常见问题">常见问题</option>
          <option value="最佳实践">最佳实践</option>
          <option value="系统文档">系统文档</option>
        </select>
      </div>
      <div class="form-group half">
        <label>标签（逗号分隔）</label>
        <input v-model="tagsInput" type="text" class="input-field" placeholder="如: VPN, 网络, 配置">
      </div>
    </div>
    <div class="editor-section">
      <div class="editor-tabs">
        <button class="editor-tab" :class="{ active: mode === 'edit' }" @click="mode = 'edit'">编辑</button>
        <button class="editor-tab" :class="{ active: mode === 'preview' }" @click="mode = 'preview'">预览</button>
      </div>
      <textarea
        v-if="mode === 'edit'"
        v-model="form.content"
        class="markdown-input"
        rows="16"
        placeholder="支持 Markdown 语法..."
      ></textarea>
      <div v-else class="markdown-preview">
        <MarkdownRenderer :content="form.content" />
      </div>
    </div>
  </div>
</template>

<script>
import MarkdownRenderer from './MarkdownRenderer.vue'

export default {
  name: 'ArticleEditor',
  components: { MarkdownRenderer },
  props: {
    modelValue: { type: Object, required: true }
  },
  emits: ['update:modelValue'],
  data() {
    return { mode: 'edit' }
  },
  computed: {
    form: {
      get() { return this.modelValue },
      set(val) { this.$emit('update:modelValue', val) }
    },
    tagsInput: {
      get() { return (this.modelValue.tags || []).join(', ') },
      set(val) {
        this.form.tags = val.split(',').map(t => t.trim()).filter(Boolean)
      }
    }
  }
}
</script>

<style scoped>
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

.form-row {
  display: flex;
  gap: 16px;
}

.half { flex: 1; }

.input-field, .select-field {
  width: 100%;
  padding: 10px 12px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.95em;
  font-family: inherit;
  transition: all 0.3s;
}

.input-field:focus, .select-field:focus {
  outline: none;
  border-color: #10b981;
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.2);
}

.select-field { background: white; cursor: pointer; }

.editor-section {
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.editor-tabs {
  display: flex;
  background: #f9fafb;
  border-bottom: 2px solid #e5e7eb;
}

.editor-tab {
  padding: 8px 20px;
  background: none;
  border: none;
  font-weight: 600;
  cursor: pointer;
  color: #666;
  transition: all 0.2s;
}

.editor-tab.active {
  color: #10b981;
  border-bottom: 2px solid #10b981;
  margin-bottom: -2px;
}

.markdown-input {
  width: 100%;
  padding: 16px;
  border: none;
  font-size: 0.95em;
  font-family: 'Courier New', Courier, monospace;
  resize: vertical;
  min-height: 300px;
}

.markdown-input:focus {
  outline: none;
}

.markdown-preview {
  padding: 16px;
  min-height: 300px;
  line-height: 1.6;
}
</style>
