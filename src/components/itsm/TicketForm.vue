<template>
  <div class="ticket-form">
    <div class="form-group">
      <label>标题 *</label>
      <input v-model="form.title" type="text" class="input-field" placeholder="请输入工单标题">
    </div>
    <div class="form-group">
      <label>描述 *</label>
      <textarea v-model="form.description" class="textarea-field" rows="4" placeholder="请详细描述问题"></textarea>
    </div>
    <div class="form-row">
      <div class="form-group half">
        <label>分类</label>
        <select v-model="form.category" class="select-field">
          <option value="infrastructure">基础设施</option>
          <option value="software">软件</option>
          <option value="hardware">硬件</option>
          <option value="network">网络</option>
          <option value="security">安全</option>
          <option value="other">其他</option>
        </select>
      </div>
      <div class="form-group half">
        <label>优先级</label>
        <select v-model="form.priority" class="select-field">
          <option value="low">低</option>
          <option value="medium">中</option>
          <option value="high">高</option>
          <option value="critical">紧急</option>
        </select>
      </div>
    </div>
    <div class="form-group">
      <label>指派给</label>
      <UserSelector v-model="form.assigneeId" :users="users" placeholder="请选择处理人" />
    </div>
    <div class="form-group">
      <label>附件</label>
      <FileUpload v-model:files="form.attachments" />
    </div>
  </div>
</template>

<script>
import UserSelector from './UserSelector.vue'
import FileUpload from './FileUpload.vue'

export default {
  name: 'TicketForm',
  components: { UserSelector, FileUpload },
  props: {
    modelValue: { type: Object, required: true },
    users: { type: Array, default: () => [] }
  },
  emits: ['update:modelValue'],
  computed: {
    form: {
      get() { return this.modelValue },
      set(val) { this.$emit('update:modelValue', val) }
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

.half {
  flex: 1;
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

</style>
