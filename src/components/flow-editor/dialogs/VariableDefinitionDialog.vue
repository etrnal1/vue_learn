<template>
  <div class="variable-definition-dialog">
    <div class="dialog-header">
      <h3>流程变量管理</h3>
      <button class="close-btn" @click="$emit('close')">✕</button>
    </div>

    <div class="dialog-body">
      <!-- 变量列表 -->
      <div class="variables-section">
        <div class="section-header">
          <h4>变量列表</h4>
          <button class="btn btn-sm btn-primary" @click="addNewVariable">
            + 新增变量
          </button>
        </div>

        <div v-if="variables.length === 0" class="empty-state">
          暂无变量，点击上方按钮添加
        </div>

        <div v-else class="variables-list">
          <div v-for="(variable, index) in variables" :key="variable.id" class="variable-item">
            <div class="variable-info">
              <div class="var-name">{{ variable.name }}</div>
              <div class="var-meta">
                <span class="type-badge" :class="'type-' + variable.type">{{ variable.type }}</span>
                <span v-if="variable.required" class="badge-required">必填</span>
              </div>
              <div v-if="variable.description" class="var-description">{{ variable.description }}</div>
            </div>
            <div class="variable-actions">
              <button class="btn btn-sm btn-text" @click="editVariable(index)">编辑</button>
              <button class="btn btn-sm btn-text btn-danger" @click="removeVariable(index)">删除</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 编辑表单 -->
      <div v-if="editingIndex !== null" class="edit-form">
        <h4>变量详情</h4>

        <div class="form-group">
          <label>变量名称 <span class="required">*</span></label>
          <input v-model="editingVariable.name" type="text" class="form-input" placeholder="输入变量名称">
        </div>

        <div class="form-group">
          <label>类型 <span class="required">*</span></label>
          <select v-model="editingVariable.type" class="form-select">
            <option value="string">字符串 (string)</option>
            <option value="number">数字 (number)</option>
            <option value="boolean">布尔值 (boolean)</option>
            <option value="array">数组 (array)</option>
            <option value="object">对象 (object)</option>
            <option value="any">任意 (any)</option>
          </select>
        </div>

        <div class="form-group">
          <label>默认值</label>
          <input v-model="editingVariable.defaultValueStr" type="text" class="form-input"
                 :placeholder="`输入 ${editingVariable.type} 类型的默认值`">
          <div class="help-text">JSON格式：对象/数组可用 {"key": "value"} 或 [1,2,3]</div>
        </div>

        <div class="form-group">
          <label>描述</label>
          <textarea v-model="editingVariable.description" class="form-textarea"
                    placeholder="说明此变量的用途"></textarea>
        </div>

        <div class="form-group checkbox">
          <input v-model="editingVariable.required" type="checkbox" id="required-check">
          <label for="required-check">必填</label>
        </div>

        <div class="form-actions">
          <button class="btn btn-sm btn-primary" @click="saveVariable">保存</button>
          <button class="btn btn-sm" @click="cancelEdit">取消</button>
        </div>
      </div>
    </div>

    <div class="dialog-footer">
      <button class="btn btn-primary" @click="$emit('close')">完成</button>
    </div>
  </div>
</template>

<script>
import api from '../../../utils/api.js'

export default {
  name: 'VariableDefinitionDialog',
  props: {
    flowId: {
      type: String,
      required: true
    }
  },
  emits: ['close', 'variables-updated'],
  data() {
    return {
      variables: [],
      editingIndex: null,
      editingVariable: this.getEmptyVariable(),
      loading: false
    }
  },
  async mounted() {
    await this.loadVariables()
  },
  methods: {
    getEmptyVariable() {
      return {
        id: null,
        name: '',
        type: 'string',
        defaultValueStr: '',
        defaultValue: null,
        description: '',
        required: false
      }
    },

    async loadVariables() {
      this.loading = true
      try {
        const data = await api.flows.getVariables(this.flowId)
        this.variables = (data || []).map(v => ({
          ...v,
          defaultValueStr: this.valueToString(v.default_value)
        }))
      } catch (error) {
        console.error('加载变量失败:', error)
      } finally {
        this.loading = false
      }
    },

    valueToString(value) {
      if (value === null || value === undefined) return ''
      if (typeof value === 'string') return value
      try {
        return JSON.stringify(value)
      } catch (e) {
        return String(value)
      }
    },

    parseValue(str, type) {
      if (!str) return null

      try {
        if (type === 'number') {
          return Number(str)
        } else if (type === 'boolean') {
          return str === 'true' || str === '1' || str === true
        } else if (type === 'array' || type === 'object') {
          return JSON.parse(str)
        }
        return str
      } catch (e) {
        console.warn('值解析失败:', e)
        return str
      }
    },

    addNewVariable() {
      this.editingIndex = this.variables.length
      this.editingVariable = this.getEmptyVariable()
    },

    editVariable(index) {
      this.editingIndex = index
      const variable = this.variables[index]
      this.editingVariable = {
        ...variable,
        defaultValueStr: this.valueToString(variable.default_value)
      }
    },

    async saveVariable() {
      if (!this.editingVariable.name) {
        alert('变量名称不能为空')
        return
      }

      const variable = {
        ...this.editingVariable,
        defaultValue: this.parseValue(this.editingVariable.defaultValueStr, this.editingVariable.type)
      }

      try {
        if (variable.id) {
          // 更新变量
          await api.flows.updateVariable(this.flowId, variable.id, variable)
        } else {
          // 创建变量
          const result = await api.flows.createVariable(this.flowId, variable)
          variable.id = result.id
          this.variables.push(variable)
        }

        // 更新列表
        if (this.editingIndex !== null && this.editingIndex < this.variables.length) {
          this.variables[this.editingIndex] = {
            ...variable,
            defaultValueStr: this.valueToString(variable.defaultValue)
          }
        }

        this.cancelEdit()
        this.$emit('variables-updated', this.variables)
      } catch (error) {
        console.error('保存变量失败:', error)
        alert('保存失败：' + error.message)
      }
    },

    async removeVariable(index) {
      const variable = this.variables[index]
      if (!confirm(`确定删除变量 "${variable.name}" 吗？`)) {
        return
      }

      try {
        await api.flows.deleteVariable(this.flowId, variable.id)
        this.variables.splice(index, 1)
        this.$emit('variables-updated', this.variables)
      } catch (error) {
        console.error('删除变量失败:', error)
        alert('删除失败：' + error.message)
      }
    },

    cancelEdit() {
      this.editingIndex = null
      this.editingVariable = this.getEmptyVariable()
    }
  }
}
</script>

<style scoped>
.variable-definition-dialog {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: 90vh;
  background: var(--app-bg);
  border-radius: 12px;
  overflow: hidden;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--app-border);
  background: var(--app-card);
}

.dialog-header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
}

.dialog-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.variables-section {
  margin-bottom: 30px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-header h4 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.empty-state {
  padding: 40px 20px;
  text-align: center;
  color: #999;
  background: var(--app-card);
  border-radius: 8px;
}

.variables-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.variable-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--app-card);
  border: 1px solid var(--app-border);
  border-radius: 8px;
}

.variable-info {
  flex: 1;
  min-width: 0;
}

.var-name {
  font-weight: 600;
  font-size: 0.95rem;
  margin-bottom: 4px;
}

.var-meta {
  display: flex;
  gap: 8px;
  margin-bottom: 6px;
}

.type-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
}

.type-string { background: #dbeafe; color: #1e40af; }
.type-number { background: #fed7aa; color: #92400e; }
.type-boolean { background: #c7d2fe; color: #312e81; }
.type-array { background: #d1fae5; color: #065f46; }
.type-object { background: #fce7f3; color: #831843; }
.type-any { background: #f3f4f6; color: #374151; }

.badge-required {
  padding: 2px 8px;
  background: #fee2e2;
  color: #991b1b;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
}

.var-description {
  font-size: 0.85rem;
  color: #666;
  margin-top: 4px;
}

.variable-actions {
  display: flex;
  gap: 8px;
  margin-left: 16px;
}

.edit-form {
  background: var(--app-card);
  border: 1px solid var(--app-border);
  border-radius: 8px;
  padding: 20px;
  margin-top: 20px;
}

.edit-form h4 {
  margin: 0 0 16px 0;
  font-size: 1rem;
  font-weight: 600;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  font-size: 0.9rem;
}

.required {
  color: #ef4444;
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--app-border);
  border-radius: 6px;
  font-family: inherit;
  font-size: 0.9rem;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--app-primary);
  box-shadow: 0 0 0 3px rgba(var(--app-primary-rgb), 0.1);
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.help-text {
  font-size: 0.8rem;
  color: #666;
  margin-top: 4px;
}

.form-group.checkbox {
  display: flex;
  align-items: center;
}

.form-group.checkbox input {
  width: auto;
  margin-right: 8px;
  cursor: pointer;
}

.form-group.checkbox label {
  margin: 0;
  cursor: pointer;
  font-weight: normal;
}

.form-actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}

.dialog-footer {
  padding: 16px 20px;
  border-top: 1px solid var(--app-border);
  background: var(--app-card);
  text-align: right;
}

.btn {
  padding: 8px 16px;
  border: 1px solid var(--app-border);
  border-radius: 6px;
  background: var(--app-card);
  color: inherit;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:hover {
  background: #f5f5f5;
}

.btn-primary {
  background: var(--app-primary);
  color: white;
  border-color: var(--app-primary);
}

.btn-primary:hover {
  opacity: 0.9;
}

.btn-danger:hover {
  color: #dc2626;
}

.btn-text {
  border: none;
  background: none;
  color: var(--app-primary);
}

.btn-text:hover {
  text-decoration: underline;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 0.85rem;
}
</style>
