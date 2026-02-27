<template>
  <div class="parameter-mapping-dialog">
    <div class="dialog-header">
      <h3>参数映射配置 - {{ stepName }}</h3>
      <button class="close-btn" @click="$emit('close')">✕</button>
    </div>

    <div class="dialog-body">
      <!-- 标签切换 -->
      <div class="tabs">
        <button :class="{ active: activeTab === 'input' }" @click="activeTab = 'input'">
          📥 输入参数
        </button>
        <button :class="{ active: activeTab === 'output' }" @click="activeTab = 'output'">
          📤 输出参数
        </button>
        <button :class="{ active: activeTab === 'preview' }" @click="activeTab = 'preview'">
          👁️ 预览
        </button>
      </div>

      <!-- 输入参数编辑 -->
      <div v-if="activeTab === 'input'" class="parameters-section">
        <div class="section-header">
          <h4>输入参数 (Input)</h4>
          <button class="btn btn-sm btn-primary" @click="addParameter('input')">+ 添加</button>
        </div>

        <div v-if="inputParameters.length === 0" class="empty-state">
          未配置输入参数
        </div>

        <div v-else class="parameters-list">
          <div v-for="(param, index) in inputParameters" :key="param.id" class="parameter-item">
            <div class="param-overview">
              <div class="param-name">{{ param.paramName }}</div>
              <div class="param-source" :class="'source-' + param.sourceType">
                {{ getSourceLabel(param.sourceType) }}
                <span v-if="param.sourceValue" class="source-value">{{ param.sourceValue }}</span>
              </div>
            </div>
            <div class="param-actions">
              <button class="btn btn-sm btn-text" @click="editParameter(index, 'input')">编辑</button>
              <button class="btn btn-sm btn-text btn-danger" @click="removeParameter(index, 'input')">删除</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 输出参数编辑 -->
      <div v-if="activeTab === 'output'" class="parameters-section">
        <div class="section-header">
          <h4>输出参数 (Output)</h4>
          <button class="btn btn-sm btn-primary" @click="addParameter('output')">+ 添加</button>
        </div>

        <div v-if="outputParameters.length === 0" class="empty-state">
          未配置输出参数
        </div>

        <div v-else class="parameters-list">
          <div v-for="(param, index) in outputParameters" :key="param.id" class="parameter-item">
            <div class="param-overview">
              <div class="param-name">{{ param.paramName }}</div>
              <div class="param-mapping" v-if="param.mappingTo">
                → {{ param.mappingTo }}
              </div>
            </div>
            <div class="param-actions">
              <button class="btn btn-sm btn-text" @click="editParameter(index, 'output')">编辑</button>
              <button class="btn btn-sm btn-text btn-danger" @click="removeParameter(index, 'output')">删除</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 预览面板 -->
      <div v-if="activeTab === 'preview'" class="preview-section">
        <div class="preview-group">
          <h4>参数映射总览</h4>
          <div class="preview-content">
            <div class="preview-inputs">
              <h5>输入</h5>
              <div v-if="inputParameters.length === 0" class="empty">无</div>
              <div v-else>
                <div v-for="param in inputParameters" :key="param.id" class="preview-item">
                  <code>{{ param.paramName }}</code>
                  <span class="arrow">←</span>
                  <span class="source">{{ getSourceDisplay(param) }}</span>
                </div>
              </div>
            </div>

            <div class="preview-outputs">
              <h5>输出</h5>
              <div v-if="outputParameters.length === 0" class="empty">无</div>
              <div v-else>
                <div v-for="param in outputParameters" :key="param.id" class="preview-item">
                  <code>{{ param.paramName }}</code>
                  <span class="arrow">→</span>
                  <span class="target">{{ param.mappingTo || '(未映射)' }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="preview-group">
          <h4>测试参数计算</h4>
          <div class="test-panel">
            <div class="test-input">
              <label>变量值 (JSON 格式):</label>
              <textarea v-model="testVariablesStr" class="form-textarea" placeholder='{"varName": "value"}'>
              </textarea>
            </div>

            <button class="btn btn-primary" @click="testParameters">运行测试</button>

            <div v-if="testResult" class="test-result">
              <h5>计算结果</h5>
              <pre>{{ testResult }}</pre>
            </div>
          </div>
        </div>
      </div>

      <!-- 参数编辑表单 -->
      <div v-if="editingIndex !== null" class="edit-form">
        <h4>{{ editingParamType === 'input' ? '编辑输入参数' : '编辑输出参数' }}</h4>

        <div class="form-group">
          <label>参数名称 <span class="required">*</span></label>
          <input v-model="editingParameter.paramName" type="text" class="form-input" placeholder="如：amount, orderId">
        </div>

        <div v-if="editingParamType === 'input'" class="form-group">
          <label>来源 <span class="required">*</span></label>
          <select v-model="editingParameter.sourceType" class="form-select">
            <option value="constant">常量 (Constant)</option>
            <option value="variable">流程变量 (Variable)</option>
            <option value="expression">表达式 (Expression)</option>
            <option value="previous_step">前一步输出 (Previous Step)</option>
          </select>
        </div>

        <div class="form-group">
          <label>
            {{
              editingParamType === 'input' ? '来源值' : '映射目标'
            }}
            <span class="required">*</span>
          </label>
          <input v-model="editingParameter.sourceValue" type="text" class="form-input"
                 :placeholder="getSourcePlaceholder()">
          <div v-if="editingParamType === 'input' && editingParameter.sourceType === 'expression'"
               class="help-text">
            表达式格式: ${varName}, ${add(100, 200)}, ${toUpperCase(status)}
          </div>
        </div>

        <div v-if="editingParamType === 'output'" class="form-group">
          <label>映射到变量</label>
          <input v-model="editingParameter.mappingTo" type="text" class="form-input"
                 placeholder="步骤输出将映射到此变量">
        </div>

        <div class="form-group">
          <label>说明</label>
          <textarea v-model="editingParameter.description" class="form-textarea"
                    placeholder="参数说明"></textarea>
        </div>

        <div class="form-actions">
          <button class="btn btn-primary btn-sm" @click="saveParameter">保存</button>
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
import { evaluateParameter } from '../../../utils/parameterEvaluator.js'

export default {
  name: 'ParameterMappingDialog',
  props: {
    flowId: {
      type: String,
      required: true
    },
    stepId: {
      type: String,
      required: true
    },
    stepName: {
      type: String,
      default: '步骤'
    },
    availableVariables: {
      type: Array,
      default: () => []
    }
  },
  emits: ['close', 'parameters-updated'],
  data() {
    return {
      inputParameters: [],
      outputParameters: [],
      editingIndex: null,
      editingParamType: null,
      editingParameter: {},
      activeTab: 'input',
      loading: false,
      testVariablesStr: '{}',
      testResult: null
    }
  },
  async mounted() {
    await this.loadParameters()
  },
  methods: {
    getEmptyParameter(paramType) {
      return {
        id: null,
        paramName: '',
        paramType,
        sourceType: 'constant',
        sourceValue: '',
        mappingTo: '',
        description: '',
        stepOrder: paramType === 'input' ? this.inputParameters.length : this.outputParameters.length
      }
    },

    async loadParameters() {
      this.loading = true
      try {
        const data = await api.flows.getStepParameters(this.flowId, this.stepId)
        const params = data || []

        this.inputParameters = params.filter(p => p.param_type === 'input')
        this.outputParameters = params.filter(p => p.param_type === 'output')
      } catch (error) {
        console.error('加载参数失败:', error)
      } finally {
        this.loading = false
      }
    },

    getSourceLabel(sourceType) {
      const labels = {
        'constant': '常量',
        'variable': '变量',
        'expression': '表达式',
        'previous_step': '前一步'
      }
      return labels[sourceType] || sourceType
    },

    getSourceDisplay(param) {
      const type = param.sourceType
      const value = param.sourceValue

      switch(type) {
        case 'constant':
          return `"${value}"`
        case 'variable':
          return `$${value}`
        case 'expression':
          return `${value}`
        case 'previous_step':
          return `←${value}`
        default:
          return value
      }
    },

    getSourcePlaceholder() {
      if (this.editingParamType === 'output') {
        return '如：orderStatus, totalAmount'
      }

      const sourceType = this.editingParameter.sourceType
      const placeholders = {
        'constant': '如：1000，true，hello',
        'variable': '选择变量名称',
        'expression': '如：${amount*2}，${toUpperCase(status)}',
        'previous_step': '如：amount, status'
      }
      return placeholders[sourceType] || ''
    },

    addParameter(paramType) {
      this.editingIndex = paramType === 'input' ? this.inputParameters.length : this.outputParameters.length
      this.editingParamType = paramType
      this.editingParameter = this.getEmptyParameter(paramType)
    },

    editParameter(index, paramType) {
      this.editingIndex = index
      this.editingParamType = paramType
      const params = paramType === 'input' ? this.inputParameters : this.outputParameters
      this.editingParameter = { ...params[index] }
    },

    async saveParameter() {
      if (!this.editingParameter.paramName) {
        alert('参数名称不能为空')
        return
      }

      try {
        if (this.editingParameter.id) {
          // 更新
          await api.flows.updateStepParameter(this.flowId, this.editingParameter.id, this.editingParameter)
        } else {
          // 创建
          const result = await api.flows.createStepParameter(this.flowId, this.stepId, {
            ...this.editingParameter,
            param_type: this.editingParamType,
            step_id: this.stepId,
            flow_id: this.flowId
          })
          this.editingParameter.id = result.id

          if (this.editingParamType === 'input') {
            this.inputParameters.push(this.editingParameter)
          } else {
            this.outputParameters.push(this.editingParameter)
          }
        }

        this.cancelEdit()
        await this.loadParameters()
        this.$emit('parameters-updated')
      } catch (error) {
        console.error('保存参数失败:', error)
        alert('保存失败：' + error.message)
      }
    },

    async removeParameter(index, paramType) {
      const params = paramType === 'input' ? this.inputParameters : this.outputParameters
      const param = params[index]

      if (!confirm(`确定删除参数 "${param.paramName}" 吗？`)) {
        return
      }

      try {
        await api.flows.deleteStepParameter(this.flowId, param.id)
        params.splice(index, 1)
        this.$emit('parameters-updated')
      } catch (error) {
        console.error('删除参数失败:', error)
        alert('删除失败：' + error.message)
      }
    },

    cancelEdit() {
      this.editingIndex = null
      this.editingParamType = null
      this.editingParameter = {}
    },

    testParameters() {
      try {
        const variables = JSON.parse(this.testVariablesStr)
        const results = {}

        // 计算输入参数
        for (const param of this.inputParameters) {
          const value = evaluateParameter({
            sourceType: param.sourceType,
            sourceValue: param.sourceValue,
            variableValues: variables
          })
          results[param.paramName] = value
        }

        // 展示输出参数信息
        for (const param of this.outputParameters) {
          results[`${param.paramName} (输出)`] = param.mappingTo ? `→ ${param.mappingTo}` : '(未映射)'
        }

        this.testResult = JSON.stringify(results, null, 2)
      } catch (error) {
        this.testResult = `错误: ${error.message}`
      }
    }
  }
}
</script>

<style scoped>
.parameter-mapping-dialog {
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

.tabs {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  border-bottom: 1px solid var(--app-border);
}

.tabs button {
  padding: 10px 16px;
  background: none;
  border: none;
  font-size: 0.9rem;
  font-weight: 500;
  color: #666;
  cursor: pointer;
  border-bottom: 3px solid transparent;
  margin-bottom: -1px;
  transition: all 0.2s;
}

.tabs button:hover {
  color: var(--app-primary);
}

.tabs button.active {
  color: var(--app-primary);
  border-bottom-color: var(--app-primary);
}

.parameters-section,
.preview-section {
  margin-bottom: 20px;
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

.parameters-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.parameter-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--app-card);
  border: 1px solid var(--app-border);
  border-radius: 8px;
}

.param-overview {
  flex: 1;
  min-width: 0;
}

.param-name {
  font-weight: 600;
  font-size: 0.95rem;
  margin-bottom: 4px;
}

.param-source {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  background: #f3f4f6;
  color: #374151;
}

.source-constant { background: #dbeafe; color: #1e40af; }
.source-variable { background: #dcfce7; color: #166534; }
.source-expression { background: #fce7f3; color: #831843; }
.source-previous_step { background: #fed7aa; color: #92400e; }

.source-value {
  margin-left: 6px;
  font-weight: 500;
}

.param-mapping {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  background: #dcfce7;
  color: #166534;
  margin-left: 8px;
}

.param-actions {
  display: flex;
  gap: 8px;
  margin-left: 16px;
}

.preview-group {
  background: var(--app-card);
  border: 1px solid var(--app-border);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.preview-group h4 {
  margin: 0 0 12px 0;
  font-size: 0.95rem;
  font-weight: 600;
}

.preview-group h5 {
  margin: 0 0 8px 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: #666;
}

.preview-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.preview-inputs,
.preview-outputs {
  padding: 12px;
  background: var(--app-bg);
  border-radius: 6px;
}

.preview-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  font-size: 0.85rem;
}

.preview-item code {
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: monospace;
}

.arrow {
  color: #999;
  flex-shrink: 0;
}

.source,
.target {
  flex: 1;
  min-width: 0;
  word-break: break-all;
}

.empty {
  color: #999;
  font-style: italic;
}

.test-panel {
  background: var(--app-bg);
  border-radius: 6px;
  padding: 12px;
}

.test-input {
  margin-bottom: 12px;
}

.test-input label {
  display: block;
  margin-bottom: 6px;
  font-size: 0.9rem;
  font-weight: 500;
}

.form-textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--app-border);
  border-radius: 6px;
  font-family: monospace;
  font-size: 0.85rem;
  min-height: 100px;
  resize: vertical;
}

.test-result {
  margin-top: 12px;
  padding: 12px;
  background: var(--app-card);
  border-radius: 6px;
  border: 1px solid var(--app-border);
}

.test-result h5 {
  margin: 0 0 8px 0;
  font-size: 0.9rem;
}

.test-result pre {
  margin: 0;
  overflow-x: auto;
  font-size: 0.8rem;
  line-height: 1.4;
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
.form-select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--app-border);
  border-radius: 6px;
  font-family: inherit;
  font-size: 0.9rem;
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: var(--app-primary);
  box-shadow: 0 0 0 3px rgba(var(--app-primary-rgb), 0.1);
}

.help-text {
  font-size: 0.8rem;
  color: #666;
  margin-top: 4px;
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

.btn-text {
  border: none;
  background: none;
  color: var(--app-primary);
}

.btn-text:hover {
  text-decoration: underline;
}

.btn-danger:hover {
  color: #dc2626;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 0.85rem;
}
</style>
