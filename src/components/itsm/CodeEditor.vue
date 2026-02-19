<template>
  <div class="code-editor-container">
    <div class="editor-toolbar">
      <select v-model="language" class="language-select" @change="updateTheme">
        <option value="python">Python 🐍</option>
        <option value="javascript">JavaScript 📜</option>
        <option value="bash">Bash 🖥️</option>
        <option value="html">HTML 🌐</option>
        <option value="sql">SQL 💾</option>
      </select>
      <button @click="clearCode" class="btn-icon" title="清空">🗑️</button>
      <button @click="formatCode" class="btn-icon" title="格式化">✨</button>
      <button @click="copyCode" class="btn-icon" title="复制">📋</button>
    </div>

    <textarea
      v-model="code"
      class="code-textarea"
      :class="'lang-' + language"
      :placeholder="getPlaceholder()"
      spellcheck="false"
    ></textarea>
  </div>
</template>

<script>
export default {
  name: 'CodeEditor',
  props: {
    modelValue: { type: String, default: '' },
    lang: { type: String, default: 'python' }
  },
  emits: ['update:modelValue'],
  data() {
    return {
      language: this.lang
    }
  },
  computed: {
    code: {
      get() { return this.modelValue },
      set(val) { this.$emit('update:modelValue', val) }
    }
  },
  methods: {
    getPlaceholder() {
      const placeholders = {
        python: '# 输入 Python 代码\nprint("Hello, World!")',
        javascript: '// 输入 JavaScript 代码\nconsole.log("Hello, World!");',
        bash: '#!/bin/bash\n# 输入 Bash 命令\necho "Hello, World!"',
        html: '<!-- 输入 HTML -->\n<h1>Hello, World!</h1>',
        sql: '-- 输入 SQL\nSELECT * FROM users;'
      }
      return placeholders[this.language] || ''
    },
    clearCode() {
      if (confirm('确定要清空所有代码吗？')) {
        this.code = ''
      }
    },
    formatCode() {
      // 简单的格式化：自动缩进
      const lines = this.code.split('\n')
      let indentLevel = 0
      const formatted = lines.map(line => {
        const trimmed = line.trim()
        if (trimmed.startsWith('}') || trimmed.startsWith(']') || trimmed.startsWith(')')) {
          indentLevel = Math.max(0, indentLevel - 1)
        }
        const result = '  '.repeat(indentLevel) + trimmed
        if (trimmed.endsWith('{') || trimmed.endsWith('[') || trimmed.endsWith('(')) {
          indentLevel++
        }
        return result
      }).join('\n')
      this.code = formatted
    },
    copyCode() {
      navigator.clipboard.writeText(this.code)
      alert('代码已复制到剪贴板')
    },
    updateTheme() {
      this.$emit('update:modelValue', this.code)
    }
  },
  watch: {
    lang(newVal) {
      this.language = newVal
    }
  }
}
</script>

<style scoped>
.code-editor-container {
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  background: #1e293b;
}

.editor-toolbar {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 10px 12px;
  background: #0f172a;
  border-bottom: 1px solid #334155;
}

.language-select {
  padding: 6px 12px;
  background: #1e293b;
  color: #e2e8f0;
  border: 1px solid #334155;
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.language-select:hover {
  border-color: #64748b;
}

.btn-icon {
  background: none;
  border: none;
  font-size: 1.2em;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background 0.2s;
}

.btn-icon:hover {
  background: #334155;
}

.code-textarea {
  width: 100%;
  height: 400px;
  padding: 16px;
  background: #1e293b;
  color: #e2e8f0;
  border: none;
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 0.95em;
  line-height: 1.6;
  resize: vertical;
  tab-size: 2;
  white-space: pre;
}

.code-textarea:focus {
  outline: none;
  background: #0f172a;
}

@media (max-width: 1024px) {
  .code-textarea {
    height: 300px;
    font-size: 0.85em;
  }
}

@media (max-width: 768px) {
  .code-editor-container {
    border-radius: 6px;
  }

  .editor-toolbar {
    padding: 8px;
    gap: 6px;
  }

  .language-select {
    padding: 4px 8px;
    font-size: 0.85em;
  }

  .btn-icon {
    padding: 3px 6px;
    font-size: 1em;
  }

  .code-textarea {
    height: 250px;
    padding: 12px;
    font-size: 0.8em;
  }
}

@media (max-width: 480px) {
  .code-textarea {
    height: 200px;
    font-size: 0.75em;
    padding: 10px;
  }

  .editor-toolbar {
    flex-wrap: wrap;
  }

  .language-select {
    flex: 1;
    min-width: 100px;
  }
}

.code-textarea::placeholder {
  color: #64748b;
}

/* 语言相关样式 */
.lang-python { }
.lang-javascript { }
.lang-bash { }
.lang-html { }
.lang-sql { }
</style>
