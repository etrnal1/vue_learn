<template>
  <div class="confirm-overlay" @click="$emit('cancel')">
    <div class="confirm-dialog" @click.stop>
      <div class="confirm-body">
        <div class="confirm-icon">{{ icon }}</div>
        <p class="confirm-message">{{ message }}</p>
      </div>
      <div class="confirm-actions">
        <button @click="$emit('cancel')" class="btn-cancel">取消</button>
        <button @click="$emit('confirm')" class="btn-confirm" :class="'btn-' + type">{{ confirmText }}</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ConfirmDialog',
  props: {
    message: { type: String, required: true },
    confirmText: { type: String, default: '确定' },
    type: { type: String, default: 'danger' },
    icon: { type: String, default: '⚠️' }
  },
  emits: ['confirm', 'cancel']
}
</script>

<style scoped>
.confirm-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
}

.confirm-dialog {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.25);
  max-width: 400px;
  width: 90%;
  animation: slideUp 0.2s ease;
}

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.confirm-body {
  padding: 28px 24px 20px;
  text-align: center;
}

.confirm-icon {
  font-size: 2.5em;
  margin-bottom: 12px;
}

.confirm-message {
  color: #333;
  font-size: 1em;
  line-height: 1.5;
  margin: 0;
}

.confirm-actions {
  display: flex;
  gap: 10px;
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
  justify-content: flex-end;
}

.btn-cancel, .btn-confirm {
  padding: 8px 20px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel {
  background: #e5e7eb;
  color: #333;
}

.btn-cancel:hover { background: #d1d5db; }

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-danger:hover { background: #dc2626; }

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover { background: #2563eb; }
</style>
