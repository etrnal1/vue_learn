<template>
  <div class="reader-module-wrap">
    <div v-if="!visible" class="reader-module-collapsed">
      <button class="btn btn-sm" type="button" @click="$emit('toggle-visible', true)">显示阅读模块</button>
    </div>
    <div v-else class="reader-module">
      <input
        :value="query"
        class="input reader-input"
        type="text"
        placeholder="文内快速检索..."
        @input="$emit('update:query', $event.target.value)"
        @keyup.enter="$emit('next')"
      >
      <span class="reader-meta">{{ query ? `命中 ${hitCount}` : '支持页内定位' }}</span>
      <slot name="extra"></slot>
      <button class="btn btn-sm" type="button" :disabled="!canNavigate" @click="$emit('prev')">上一个</button>
      <button class="btn btn-sm" type="button" :disabled="!canNavigate" @click="$emit('next')">下一个</button>
      <button class="btn btn-sm" type="button" @click="$emit('top')">页首</button>
      <button class="btn btn-sm" type="button" @click="$emit('bottom')">页尾</button>
      <button class="btn btn-sm" type="button" @click="$emit('toggle-visible', false)">关闭模块</button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ArticleReaderModule',
  props: {
    query: { type: String, default: '' },
    hitCount: { type: Number, default: 0 },
    canNavigate: { type: Boolean, default: false },
    visible: { type: Boolean, default: true }
  },
  emits: ['update:query', 'prev', 'next', 'top', 'bottom', 'toggle-visible']
}
</script>

<style scoped>
.reader-module-wrap {
  margin-bottom: 12px;
}

.reader-module {
  display: grid;
  grid-template-columns: minmax(160px, 1fr) auto auto auto auto auto auto auto;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border: 1px solid var(--app-border, #dbe2ea);
  border-radius: 10px;
  background: color-mix(in srgb, var(--app-card, #ffffff) 95%, #ffffff);
}

.reader-module-collapsed {
  display: flex;
  justify-content: flex-start;
}

.reader-input {
  width: 100%;
}

.reader-meta {
  font-size: 0.8em;
  color: var(--app-text-muted, #64748b);
  white-space: nowrap;
}

@media (max-width: 880px) {
  .reader-module {
    grid-template-columns: 1fr 1fr;
  }
  .reader-meta {
    grid-column: 1 / -1;
  }
}
</style>
