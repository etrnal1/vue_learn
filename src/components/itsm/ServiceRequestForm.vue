<template>
  <div class="sr-form">
    <div class="form-group">
      <label>服务类型</label>
      <select v-model="form.serviceType" class="select-field">
        <option value="account">账号管理</option>
        <option value="software_install">软件安装</option>
        <option value="hardware">硬件申请</option>
        <option value="permission">权限申请</option>
        <option value="vpn">VPN 配置</option>
        <option value="email">邮箱服务</option>
        <option value="other">其他</option>
      </select>
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
  </div>
</template>

<script>
export default {
  name: 'ServiceRequestForm',
  props: {
    modelValue: { type: Object, required: true }
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
