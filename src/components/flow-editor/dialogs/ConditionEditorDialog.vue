<template>
  <div class="condition-editor-dialog">
    <div class="dialog-overlay" @click="$emit('close')"></div>

    <div class="dialog-content">
      <div class="dialog-header">
        <h3>条件编辑器</h3>
        <button class="close-btn" @click="$emit('close')">×</button>
      </div>

      <div class="dialog-body">
        <!-- 条件类型选择 -->
        <div class="condition-type-selector">
          <label>条件类型</label>
          <div class="type-buttons">
            <button
              :class="{ active: conditionType === 'simple' }"
              @click="conditionType = 'simple'"
            >
              简单条件
            </button>
            <button
              :class="{ active: conditionType === 'complex' }"
              @click="conditionType = 'complex'"
            >
              复合条件
            </button>
          </div>
        </div>

        <!-- 简单条件编辑 -->
        <div v-if="conditionType === 'simple'" class="simple-condition-editor">
          <div class="condition-group">
            <div class="form-row">
              <div class="form-field">
                <label>字段</label>
                <input
                  v-model="simpleCondition.field"
                  type="text"
                  class="app-input"
                  placeholder="例: amount, status"
                />
              </div>

              <div class="form-field">
                <label>操作符</label>
                <select v-model="simpleCondition.operator" class="app-select">
                  <option value=""></option>
                  <option value=">">&gt;</option>
                  <option value="<">&lt;</option>
                  <option value="==">=</option>
                  <option value="!=">!=</option>
                  <option value=">=">&gt;=</option>
                  <option value="<=">&lt;=</option>
                  <option value="includes">包含</option>
                  <option value="startsWith">开始于</option>
                  <option value="endsWith">结束于</option>
                  <option value="isEmpty">为空</option>
                  <option value="isNotEmpty">非空</option>
                </select>
              </div>

              <div v-if="!isUnaryOperator(simpleCondition.operator)" class="form-field">
                <label>值</label>
                <input
                  v-model="simpleCondition.value"
                  type="text"
                  class="app-input"
                  placeholder="例: 1000, approved"
                />
              </div>
            </div>

            <!-- 条件预览 -->
            <div class="condition-preview">
              <span class="label">表达式预览：</span>
              <code class="preview-code">{{ simpleConditionPreview }}</code>
            </div>

            <!-- 测试条件 -->
            <div class="condition-test">
              <button class="btn btn-sm btn-outline" @click="showTestPanel = !showTestPanel">
                {{ showTestPanel ? '隐藏测试' : '测试条件' }}
              </button>

              <div v-if="showTestPanel" class="test-panel">
                <textarea
                  v-model="testContextJson"
                  class="app-textarea"
                  placeholder='输入测试数据 (JSON格式)\n例: {"amount": 5000, "status": "approved"}'
                  rows="4"
                ></textarea>
                <button class="btn btn-sm btn-primary" @click="testCondition">
                  执行测试
                </button>
                <div v-if="testResult !== null" class="test-result" :class="testResult ? 'success' : 'failure'">
                  结果: <strong>{{ testResult ? '满足' : '不满足' }}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 复合条件编辑 -->
        <div v-if="conditionType === 'complex'" class="complex-condition-editor">
          <div class="form-field">
            <label>逻辑类型</label>
            <div class="logic-buttons">
              <button
                :class="{ active: complexLogic === 'and' }"
                @click="complexLogic = 'and'"
              >
                AND (全部满足)
              </button>
              <button
                :class="{ active: complexLogic === 'or' }"
                @click="complexLogic = 'or'"
              >
                OR (任一满足)
              </button>
            </div>
          </div>

          <div class="conditions-list">
            <div v-for="(cond, idx) in complexConditions" :key="idx" class="condition-item">
              <div class="condition-item-header">
                <span class="index">{{ idx + 1 }}</span>
                <button class="remove-btn" @click="removeCondition(idx)">删除</button>
              </div>

              <div class="condition-item-body">
                <input
                  v-model="cond.field"
                  type="text"
                  class="app-input"
                  placeholder="字段"
                />
                <select v-model="cond.operator" class="app-select">
                  <option value=""></option>
                  <option value=">">></option>
                  <option value="<"><</option>
                  <option value="==">==</option>
                  <option value="!=">!=</option>
                  <option value=">=">=</option>
                  <option value="<="><=</option>
                  <option value="includes">包含</option>
                  <option value="startsWith">开始于</option>
                  <option value="endsWith">结束于</option>
                </select>
                <input
                  v-if="!isUnaryOperator(cond.operator)"
                  v-model="cond.value"
                  type="text"
                  class="app-input"
                  placeholder="值"
                />
              </div>
            </div>
          </div>

          <button class="btn btn-sm btn-outline" @click="addCondition">
            + 添加条件
          </button>

          <!-- 复合条件预览 -->
          <div class="condition-preview">
            <span class="label">表达式预览：</span>
            <code class="preview-code">{{ complexConditionPreview }}</code>
          </div>
        </div>
      </div>

      <!-- 对话框底部按钮 -->
      <div class="dialog-footer">
        <button class="btn btn-outline" @click="$emit('close')">取消</button>
        <button class="btn btn-primary" @click="saveCondition">保存条件</button>
      </div>
    </div>
  </div>
</template>

<script>
import {
  evaluateSimpleCondition,
  evaluateCondition,
  conditionToString,
  parseConditionExpression
} from '../../../utils/conditionEvaluator.js'

export default {
  name: 'ConditionEditorDialog',
  props: {
    condition: {
      type: Object,
      default: null
    }
  },
  emits: ['save', 'close'],
  data() {
    return {
      conditionType: 'simple', // 'simple' | 'complex'
      simpleCondition: {
        field: '',
        operator: '',
        value: ''
      },
      complexLogic: 'and', // 'and' | 'or'
      complexConditions: [
        { field: '', operator: '', value: '' }
      ],
      showTestPanel: false,
      testContextJson: '{}',
      testResult: null
    }
  },
  computed: {
    simpleConditionPreview() {
      if (!this.simpleCondition.field || !this.simpleCondition.operator) {
        return '(请填写字段和操作符)'
      }
      return conditionToString(this.simpleCondition)
    },
    complexConditionPreview() {
      const validConditions = this.complexConditions.filter(
        c => c.field && c.operator
      )
      if (validConditions.length === 0) {
        return '(请至少添加一个条件)'
      }
      const condition = {
        type: this.complexLogic,
        conditions: validConditions
      }
      return conditionToString(condition)
    }
  },
  watch: {
    condition: {
      immediate: true,
      handler(newVal) {
        if (newVal) {
          this.loadCondition(newVal)
        }
      }
    }
  },
  methods: {
    loadCondition(condition) {
      if (!condition) return

      if (condition.operator) {
        // 简单条件
        this.conditionType = 'simple'
        this.simpleCondition = { ...condition }
      } else if (condition.type && condition.conditions) {
        // 复合条件
        this.conditionType = 'complex'
        this.complexLogic = condition.type
        this.complexConditions = condition.conditions.map(c => ({ ...c }))
      }
    },

    isUnaryOperator(operator) {
      return operator === 'isEmpty' || operator === 'isNotEmpty'
    },

    addCondition() {
      this.complexConditions.push({
        field: '',
        operator: '',
        value: ''
      })
    },

    removeCondition(index) {
      this.complexConditions.splice(index, 1)
    },

    testCondition() {
      try {
        const context = JSON.parse(this.testContextJson)
        const condition = this.conditionType === 'simple'
          ? this.simpleCondition
          : { type: this.complexLogic, conditions: this.complexConditions }

        this.testResult = evaluateCondition(condition, context)
      } catch (error) {
        this.$emit('error', `测试失败: ${error.message}`)
        this.testResult = null
      }
    },

    saveCondition() {
      let finalCondition = null

      if (this.conditionType === 'simple') {
        if (!this.simpleCondition.field || !this.simpleCondition.operator) {
          alert('请填写完整的简单条件')
          return
        }
        finalCondition = { ...this.simpleCondition }
      } else {
        const validConditions = this.complexConditions.filter(
          c => c.field && c.operator
        )
        if (validConditions.length === 0) {
          alert('请至少添加一个有效的条件')
          return
        }
        finalCondition = {
          type: this.complexLogic,
          conditions: validConditions
        }
      }

      this.$emit('save', finalCondition)
    }
  }
}
</script>

<style scoped>
.condition-editor-dialog {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
}

.dialog-content {
  position: relative;
  background: var(--app-card);
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.dialog-header {
  padding: 20px;
  border-bottom: 1px solid var(--app-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dialog-header h3 {
  margin: 0;
  font-size: 1.25rem;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--app-text);
}

.dialog-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.dialog-footer {
  padding: 20px;
  border-top: 1px solid var(--app-border);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.condition-type-selector,
.simple-condition-editor,
.complex-condition-editor {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.type-buttons,
.logic-buttons {
  display: flex;
  gap: 8px;
}

.type-buttons button,
.logic-buttons button {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--app-border);
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.type-buttons button.active,
.logic-buttons button.active {
  background: var(--app-primary);
  color: white;
  border-color: var(--app-primary);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1.5fr;
  gap: 8px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-field label {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--app-text);
}

.app-input,
.app-select,
.app-textarea {
  padding: 8px 12px;
  border: 1px solid var(--app-border);
  border-radius: 6px;
  background: var(--app-bg);
  color: var(--app-text);
  font-family: inherit;
  font-size: 0.9rem;
}

.app-select {
  cursor: pointer;
}

.condition-preview {
  padding: 12px;
  background: var(--app-bg);
  border: 1px solid var(--app-border);
  border-radius: 6px;
  display: flex;
  gap: 8px;
  align-items: center;
}

.condition-preview .label {
  font-size: 0.9rem;
  color: #666;
  white-space: nowrap;
}

.preview-code {
  flex: 1;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 0.85rem;
  color: var(--app-primary);
  background: transparent;
  word-break: break-all;
}

.condition-test {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.test-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: var(--app-bg);
  border: 1px solid var(--app-border);
  border-radius: 6px;
}

.test-result {
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 0.9rem;
}

.test-result.success {
  background: #d1fae5;
  color: #065f46;
}

.test-result.failure {
  background: #fee2e2;
  color: #991b1b;
}

.conditions-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.condition-item {
  padding: 12px;
  background: var(--app-bg);
  border: 1px solid var(--app-border);
  border-radius: 6px;
}

.condition-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 0.9rem;
  font-weight: 600;
}

.condition-item-header .index {
  background: var(--app-primary);
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
}

.remove-btn {
  background: #ef4444;
  color: white;
  border: none;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
}

.condition-item-body {
  display: grid;
  grid-template-columns: 1fr 1fr 1.5fr;
  gap: 8px;
}

.btn {
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--app-primary);
  color: white;
}

.btn-primary:hover {
  opacity: 0.9;
}

.btn-outline {
  background: transparent;
  border: 1px solid var(--app-border);
  color: var(--app-text);
}

.btn-outline:hover {
  background: var(--app-hover);
}

@media (max-width: 640px) {
  .dialog-content {
    width: 95%;
    max-height: 95vh;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .condition-item-body {
    grid-template-columns: 1fr;
  }
}
</style>
