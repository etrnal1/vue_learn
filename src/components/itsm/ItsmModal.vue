<template>
  <div class="modal-overlay" @click="$emit('close')">
    <div class="modal" :class="sizeClass" @click.stop>
      <div class="modal-header">
        <h3>{{ title }}</h3>
        <button @click="$emit('close')" class="btn-close">✕</button>
      </div>
      <div class="modal-body">
        <slot></slot>
      </div>
      <div v-if="$slots.footer" class="modal-footer">
        <slot name="footer"></slot>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ItsmModal',
  props: {
    title: { type: String, default: '' },
    size: { type: String, default: 'medium' }
  },
  emits: ['close'],
  computed: {
    sizeClass() {
      return 'modal-' + this.size
    }
  },
  mounted() {
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', this.handleEsc)
  },
  beforeUnmount() {
    document.body.style.overflow = ''
    document.removeEventListener('keydown', this.handleEsc)
  },
  methods: {
    handleEsc(e) {
      if (e.key === 'Escape') this.$emit('close')
    }
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.25);
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  animation: slideUp 0.3s ease;
}

.modal-small { max-width: 400px; }
.modal-medium { max-width: 600px; }
.modal-large { max-width: 900px; }

@media (max-width: 768px) {
  .modal {
    width: 95%;
    border-radius: 10px;
    max-height: 95vh;
  }

  .modal-small { max-width: 100%; }
  .modal-medium { max-width: 100%; }
  .modal-large { max-width: 100%; }

  .modal-header {
    padding: 16px;
  }

  .modal-header h3 {
    font-size: 1.1em;
  }

  .modal-body {
    padding: 16px;
  }

  .modal-footer {
    padding: 14px;
    gap: 8px;
  }
}

@media (max-width: 480px) {
  .modal {
    width: 100%;
    max-height: 100vh;
    border-radius: 8px 8px 0 0;
  }

  .modal-header {
    padding: 12px;
  }

  .modal-header h3 {
    font-size: 1em;
  }

  .btn-close {
    font-size: 1.2em;
  }

  .modal-body {
    padding: 12px;
  }

  .modal-footer {
    padding: 10px;
  }
}

@keyframes slideUp {
  from { transform: translateY(30px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 22px;
  border-bottom: 2px solid #e5e7eb;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.2em;
  color: #333;
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.4em;
  cursor: pointer;
  color: #999;
  padding: 4px 8px;
  border-radius: 6px;
  transition: all 0.2s;
}

.btn-close:hover {
  background: #f3f4f6;
  color: #333;
}

.modal-body {
  padding: 22px;
}

.modal-footer {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding: 16px 22px;
  border-top: 2px solid #e5e7eb;
}
</style>
