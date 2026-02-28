<template>
  <div class="data-export-import">
    <h3>数据管理</h3>
    <div class="actions-row">
      <button @click="exportData" class="btn btn-export">📤 导出数据</button>
      <label class="btn btn-import">
        📥 导入数据
        <input type="file" accept=".json" @change="importData" style="display:none">
      </label>
      <button @click="showClearConfirm = true" class="btn btn-clear">🗑️ 清空数据</button>
    </div>
    <p v-if="message" class="message" :class="messageType">{{ message }}</p>

    <ConfirmDialog
      v-if="showClearConfirm"
      message="确定要清空所有 ITSM 数据吗？此操作不可恢复！"
      confirm-text="清空"
      @confirm="clearData"
      @cancel="showClearConfirm = false"
    />
  </div>
</template>

<script>
import ConfirmDialog from './ConfirmDialog.vue'

export default {
  name: 'DataExportImport',
  components: { ConfirmDialog },
  emits: ['import-data', 'clear-data'],
  data() {
    return {
      message: '',
      messageType: 'success',
      showClearConfirm: false
    }
  },
  methods: {
    exportData() {
      const keys = ['itsm_users', 'itsm_current_user', 'itsm_tickets', 'itsm_service_requests', 'itsm_articles', 'itsm_flows', 'itsm_counters']
      const data = {}
      keys.forEach(k => {
        const val = localStorage.getItem(k)
        if (val) data[k] = JSON.parse(val)
      })
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'itsm-backup-' + new Date().toISOString().slice(0, 10) + '.json'
      a.click()
      URL.revokeObjectURL(url)
      this.showMessage('数据导出成功！', 'success')
    },
    importData(e) {
      const file = e.target.files[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result)
          this.$emit('import-data', data)
          this.showMessage('数据导入成功！', 'success')
        } catch {
          this.showMessage('导入失败：文件格式无效', 'error')
        }
      }
      reader.readAsText(file)
      e.target.value = ''
    },
    clearData() {
      this.showClearConfirm = false
      this.$emit('clear-data')
      this.showMessage('数据已清空', 'success')
    },
    showMessage(text, type) {
      this.message = text
      this.messageType = type
      setTimeout(() => { this.message = '' }, 3000)
    }
  }
}
</script>

<style scoped>
.data-export-import {
  background: white;
  border-radius: 10px;
  padding: 22px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

h3 {
  margin: 0 0 16px;
  color: #333;
  font-size: 1.1em;
}

.actions-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 0.9em;
}

.btn-export { background: #3b82f6; color: white; }
.btn-export:hover { background: #2563eb; }
.btn-import { background: #10b981; color: white; display: inline-block; text-align: center; }
.btn-import:hover { background: #059669; }
.btn-clear { background: #ef4444; color: white; }
.btn-clear:hover { background: #dc2626; }

.message {
  margin-top: 14px;
  padding: 10px 14px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9em;
}

.success { background: #d1fae5; color: #065f46; }
.error { background: #fee2e2; color: #991b1b; }
</style>
