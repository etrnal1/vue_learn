<template>
  <div class="article-card" @click="$emit('view', article)">
    <div class="article-header">
      <span class="article-no">{{ article.articleNo }}</span>
      <span class="view-count">👁 {{ article.viewCount }}</span>
    </div>
    <h4 class="article-title">{{ article.title }}</h4>
    <p class="article-preview">{{ previewText }}</p>
    <div class="article-meta">
      <span class="category-tag">{{ article.category }}</span>
      <span v-for="tag in article.tags" :key="tag" class="tag">{{ tag }}</span>
    </div>
    <div class="article-footer">
      <span>{{ authorName }}</span>
      <span>{{ formatDate(article.updatedAt) }}</span>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ArticleCard',
  props: {
    article: { type: Object, required: true },
    users: { type: Array, default: () => [] }
  },
  emits: ['view'],
  computed: {
    previewText() {
      const plain = this.article.content.replace(/[#*`>\-\[\]()!]/g, '').trim()
      return plain.length > 100 ? plain.slice(0, 100) + '...' : plain
    },
    authorName() {
      const user = this.users.find(u => u.id === this.article.authorId)
      return user ? user.avatar + ' ' + user.name : '未知'
    }
  },
  methods: {
    formatDate(ts) {
      return new Date(ts).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
    }
  }
}
</script>

<style scoped>
.article-card {
  background: white;
  border-radius: 10px;
  padding: 18px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid #e5e7eb;
  cursor: pointer;
  transition: all 0.3s;
}

.article-card:hover {
  border-color: #10b981;
  box-shadow: 0 4px 16px rgba(16, 185, 129, 0.12);
  transform: translateY(-2px);
}

.article-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.article-no {
  font-weight: 700;
  color: #10b981;
  font-size: 0.85em;
}

.view-count {
  font-size: 0.8em;
  color: #999;
}

.article-title {
  margin: 0 0 8px;
  font-size: 1em;
  color: #333;
  line-height: 1.4;
}

.article-preview {
  color: #888;
  font-size: 0.85em;
  margin: 0 0 12px;
  line-height: 1.5;
}

.article-meta {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.category-tag {
  padding: 3px 10px;
  background: #eff6ff;
  color: #3b82f6;
  border-radius: 12px;
  font-size: 0.75em;
  font-weight: 600;
}

.tag {
  padding: 3px 10px;
  background: #f3f4f6;
  color: #666;
  border-radius: 12px;
  font-size: 0.75em;
  font-weight: 600;
}

.article-footer {
  display: flex;
  justify-content: space-between;
  font-size: 0.8em;
  color: #999;
}
</style>
