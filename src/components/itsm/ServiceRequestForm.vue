<template>
  <div class="sr-form">
    <div class="form-group">
      <label>服务类型</label>
      <input :value="catalogItem?.name || form.serviceType" type="text" class="input-field" disabled>
    </div>

    <div class="form-group">
      <label>标题 *</label>
      <input v-model="form.title" type="text" class="input-field" placeholder="请输入请求标题">
    </div>

    <div class="form-group">
      <label>描述 *</label>
      <textarea v-model="form.description" class="textarea-field" rows="4" placeholder="请详细描述您的需求"></textarea>
    </div>

    <div class="form-group">
      <label>优先级</label>
      <select v-model="form.priority" class="select-field">
        <option value="low">低</option>
        <option value="medium">中</option>
        <option value="high">高</option>
      </select>
    </div>

    <div v-if="normalizedSchema.length > 0" class="dynamic-form">
      <h4>目录扩展字段</h4>
      <div v-for="field in normalizedSchema" :key="field.key" class="form-group">
        <label>{{ field.label }} <span v-if="field.required">*</span></label>

        <input
          v-if="field.type === 'text'"
          :value="getFieldValue(field.key)"
          type="text"
          class="input-field"
          :placeholder="field.placeholder || ''"
          @input="setFieldValue(field.key, $event.target.value)"
        >

        <textarea
          v-else-if="field.type === 'textarea'"
          :value="getFieldValue(field.key)"
          class="textarea-field"
          rows="3"
          :placeholder="field.placeholder || ''"
          @input="setFieldValue(field.key, $event.target.value)"
        ></textarea>

        <input
          v-else-if="field.type === 'number'"
          :value="getFieldValue(field.key)"
          type="number"
          class="input-field"
          :placeholder="field.placeholder || ''"
          @input="setFieldValue(field.key, $event.target.value)"
        >

        <select
          v-else-if="field.type === 'select'"
          :value="getFieldValue(field.key)"
          class="select-field"
          @change="setFieldValue(field.key, $event.target.value)"
        >
          <option value="">请选择</option>
          <option v-for="opt in field.options" :key="String(opt)" :value="String(opt)">{{ opt }}</option>
        </select>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ServiceRequestForm',
  props: {
    modelValue: { type: Object, required: true },
    catalogItem: { type: Object, default: null }
  },
  emits: ['update:modelValue'],
  computed: {
    form: {
      get() { return this.modelValue },
      set(val) { this.$emit('update:modelValue', val) }
    },
    normalizedSchema() {
      const schema = this.catalogItem?.formSchema
      return Array.isArray(schema) ? schema.filter(f => f?.key && f?.label && f?.type) : []
    }
  },
  methods: {
    getFieldValue(key) {
      const map = this.form.formData || {}
      return map[key] ?? ''
    },
    setFieldValue(key, value) {
      this.form = {
        ...this.form,
        formData: {
          ...(this.form.formData || {}),
          [key]: value
        }
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

.input-field, .textarea-field, .select-field {
  width: 100%;
  padding: 10px 12px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.95em;
  font-family: inherit;
  transition: all 0.3s;
}

.input-field:focus, .textarea-field:focus, .select-field:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 8px rgba(59, 130, 246, 0.2);
}

.textarea-field { resize: vertical; }
.select-field { background: white; cursor: pointer; }

.dynamic-form {
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px dashed #d1d5db;
}

.dynamic-form h4 {
  margin: 0 0 12px;
  color: #1f2937;
  font-size: 0.95em;
}
</style>
