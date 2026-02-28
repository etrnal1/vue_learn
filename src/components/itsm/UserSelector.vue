<template>
  <select class="user-selector" :value="modelValue" @change="$emit('update:modelValue', $event.target.value)">
    <option value="">{{ placeholder }}</option>
    <option v-for="user in users" :key="user.id" :value="user.id">
      {{ user.avatar }} {{ user.name }}
    </option>
  </select>
</template>

<script>
export default {
  name: 'UserSelector',
  props: {
    modelValue: { type: String, default: '' },
    users: { type: Array, required: true },
    placeholder: { type: String, default: '请选择用户' }
  },
  emits: ['update:modelValue']
}
</script>

<style scoped>
.user-selector {
  width: 100%;
  padding: 10px 12px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.95em;
  font-family: inherit;
  background: white;
  cursor: pointer;
  transition: all 0.3s;
}

.user-selector:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 8px rgba(59, 130, 246, 0.2);
}
</style>
