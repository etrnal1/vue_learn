<template>
  <div class="file-upload">
    <div class="upload-area" @dragover.prevent="dragover = true" @dragleave="dragover = false" @drop.prevent="handleDrop">
      <div class="upload-icon">📎</div>
      <p>拖拽文件到此处或点击选择</p>
      <input type="file" multiple @change="handleSelect" ref="fileInput" style="display:none">
      <button @click="$refs.fileInput.click()" class="btn-select">选择文件</button>
    </div>

    <div v-if="files.length" class="files-list">
      <div v-for="(f, idx) in files" :key="idx" class="file-item">
        <span class="file-icon">{{ getFileIcon(f.name) }}</span>
        <div class="file-info">
          <div class="file-name">{{ f.name }}</div>
          <div class="file-size">{{ formatSize(f.size) }}</div>
        </div>
        <button @click="removeFile(idx)" class="btn-remove">✕</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'FileUpload',
  props: {
    max: { type: Number, default: 5 },
    maxSize: { type: Number, default: 10 * 1024 * 1024 * 1024 } // 10GB
  },
  emits: ['update:files'],
  data() {
    return {
      files: [],
      dragover: false
    }
  },
  methods: {
    handleSelect(e) {
      this.addFiles(Array.from(e.target.files))
      e.target.value = ''
    },
    handleDrop(e) {
      this.dragover = false
      this.addFiles(Array.from(e.dataTransfer.files))
    },
    addFiles(newFiles) {
      for (const f of newFiles) {
        if (this.files.length >= this.max) {
          alert(`最多只能上传 ${this.max} 个文件`)
          break
        }
        if (f.size > this.maxSize) {
          alert(`文件 ${f.name} 超过 ${this.formatSize(this.maxSize)} 限制`)
          continue
        }
        // 转换为 base64 以便存储
        const reader = new FileReader()
        reader.onload = (e) => {
          this.files.push({
            name: f.name,
            size: f.size,
            type: f.type,
            data: e.target.result
          })
          this.$emit('update:files', this.files)
        }
        reader.readAsDataURL(f)
      }
    },
    removeFile(idx) {
      this.files.splice(idx, 1)
      this.$emit('update:files', this.files)
    },
    getFileIcon(name) {
      const ext = name.split('.').pop().toLowerCase()
      const icons = {
        pdf: '📄', doc: '📄', docx: '📄', txt: '📝',
        jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️',
        zip: '📦', rar: '📦', '7z': '📦',
        xls: '📊', xlsx: '📊', csv: '📊',
        ppt: '📽️', pptx: '📽️'
      }
      return icons[ext] || '📎'
    },
    formatSize(bytes) {
      if (bytes < 1024) return bytes + 'B'
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB'
      return (bytes / (1024 * 1024)).toFixed(1) + 'MB'
    }
  }
}
</script>

<style scoped>
.file-upload {
  margin-bottom: 16px;
}

.upload-area {
  border: 2px dashed #e5e7eb;
  border-radius: 8px;
  padding: 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  background: #f9fafb;
}

.upload-area:hover {
  border-color: #3b82f6;
  background: #eff6ff;
}

.upload-icon {
  font-size: 2.5em;
  margin-bottom: 10px;
}

.upload-area p {
  color: #666;
  margin: 8px 0;
  font-size: 0.95em;
}

.btn-select {
  padding: 8px 20px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 8px;
}

.btn-select:hover {
  background: #2563eb;
}

.files-list {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  transition: all 0.2s;
}

.file-item:hover {
  border-color: #3b82f6;
  box-shadow: 0 2px 6px rgba(59, 130, 246, 0.1);
}

.file-icon {
  font-size: 1.5em;
  flex-shrink: 0;
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-weight: 600;
  color: #333;
  font-size: 0.9em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-size {
  font-size: 0.8em;
  color: #999;
  margin-top: 2px;
}

.btn-remove {
  background: none;
  border: none;
  color: #ef4444;
  font-size: 1.1em;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background 0.2s;
  flex-shrink: 0;
}

.btn-remove:hover {
  background: rgba(239, 68, 68, 0.1);
}
</style>
