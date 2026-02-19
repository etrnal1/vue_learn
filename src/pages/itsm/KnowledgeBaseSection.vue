<template>
  <div class="kb-section">
    <div class="section-header">
      <h2>知识库</h2>
      <button @click="openCreate" class="btn-create">+ 新建文章</button>
    </div>

    <SearchFilter
      v-model:searchQuery="searchQuery"
      v-model:activeFilter="categoryFilter"
      :filters="categoryFilters"
      placeholder="搜索文章标题、内容或标签..."
    />

    <div v-if="filteredArticles.length === 0" class="empty-state">暂无知识库文章</div>
    <div v-else class="articles-grid">
      <ArticleCard
        v-for="a in filteredArticles"
        :key="a.id"
        :article="a"
        :users="users"
        @view="openDetail"
      />
    </div>

    <!-- Create / Edit Modal -->
    <ItsmModal v-if="showForm" :title="editingArticle ? '编辑文章' : '新建文章'" size="large" @close="closeForm">
      <ArticleEditor v-model="formData" />
      <template #footer>
        <button @click="closeForm" class="btn-secondary">取消</button>
        <button @click="saveArticle" class="btn-primary">{{ editingArticle ? '保存' : '发布' }}</button>
      </template>
    </ItsmModal>

    <!-- Detail Modal -->
    <ItsmModal v-if="viewingArticle" :title="viewingArticle.articleNo" size="large" @close="viewingArticle = null">
      <div class="detail-header">
        <h3>{{ viewingArticle.title }}</h3>
      </div>
      <div class="detail-meta">
        <span class="category-tag">{{ viewingArticle.category }}</span>
        <span v-for="tag in viewingArticle.tags" :key="tag" class="tag">{{ tag }}</span>
        <span class="meta-text">{{ getAuthorName(viewingArticle.authorId) }}</span>
        <span class="meta-text">{{ formatDate(viewingArticle.updatedAt) }}</span>
        <span class="meta-text">👁 {{ viewingArticle.viewCount }}</span>
      </div>
      <div class="article-content">
        <MarkdownRenderer :content="viewingArticle.content" />
      </div>
      <template #footer>
        <button @click="editFromDetail" class="btn-secondary">编辑</button>
        <button @click="deleteArticle" class="btn-danger">删除</button>
        <button @click="viewingArticle = null" class="btn-primary">关闭</button>
      </template>
    </ItsmModal>
  </div>
</template>

<script>
import SearchFilter from '../../components/itsm/SearchFilter.vue'
import ArticleCard from '../../components/itsm/ArticleCard.vue'
import ArticleEditor from '../../components/itsm/ArticleEditor.vue'
import MarkdownRenderer from '../../components/itsm/MarkdownRenderer.vue'
import ItsmModal from '../../components/itsm/ItsmModal.vue'

export default {
  name: 'KnowledgeBaseSection',
  components: { SearchFilter, ArticleCard, ArticleEditor, MarkdownRenderer, ItsmModal },
  props: {
    articles: { type: Array, required: true },
    users: { type: Array, required: true },
    currentUserId: { type: String, required: true }
  },
  emits: ['create-article', 'update-article', 'delete-article'],
  data() {
    return {
      searchQuery: '',
      categoryFilter: 'all',
      showForm: false,
      editingArticle: null,
      viewingArticle: null,
      formData: this.emptyForm(),
      categoryFilters: [
        { value: 'all', label: '全部' },
        { value: '故障排除', label: '故障排除' },
        { value: '操作指南', label: '操作指南' },
        { value: '常见问题', label: '常见问题' },
        { value: '最佳实践', label: '最佳实践' },
        { value: '系统文档', label: '系统文档' }
      ]
    }
  },
  computed: {
    filteredArticles() {
      return this.articles.filter(a => {
        const q = this.searchQuery.toLowerCase()
        const matchSearch = !q ||
          a.title.toLowerCase().includes(q) ||
          a.content.toLowerCase().includes(q) ||
          a.tags.some(t => t.toLowerCase().includes(q))
        const matchCategory = this.categoryFilter === 'all' || a.category === this.categoryFilter
        return matchSearch && matchCategory
      }).sort((a, b) => b.updatedAt - a.updatedAt)
    }
  },
  methods: {
    emptyForm() {
      return { title: '', content: '', category: '操作指南', tags: [] }
    },
    openCreate() {
      this.editingArticle = null
      this.formData = this.emptyForm()
      this.showForm = true
    },
    openDetail(article) {
      this.viewingArticle = JSON.parse(JSON.stringify(article))
      // Increment view count
      this.$emit('update-article', { ...article, viewCount: article.viewCount + 1 })
    },
    closeForm() {
      this.showForm = false
      this.editingArticle = null
    },
    saveArticle() {
      if (!this.formData.title.trim() || !this.formData.content.trim()) {
        alert('请填写标题和内容')
        return
      }
      if (this.editingArticle) {
        this.$emit('update-article', { ...this.editingArticle, ...this.formData, updatedAt: Date.now() })
      } else {
        this.$emit('create-article', { ...this.formData })
      }
      this.closeForm()
    },
    editFromDetail() {
      this.editingArticle = this.viewingArticle
      this.formData = {
        title: this.viewingArticle.title,
        content: this.viewingArticle.content,
        category: this.viewingArticle.category,
        tags: [...this.viewingArticle.tags]
      }
      this.viewingArticle = null
      this.showForm = true
    },
    deleteArticle() {
      if (confirm('确定删除此文章？')) {
        this.$emit('delete-article', this.viewingArticle.id)
        this.viewingArticle = null
      }
    },
    getAuthorName(id) {
      const user = this.users.find(u => u.id === id)
      return user ? user.avatar + ' ' + user.name : '未知'
    },
    formatDate(ts) {
      return new Date(ts).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
    }
  }
}
</script>

<style scoped>
.kb-section { animation: fadeIn 0.4s ease; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.section-header {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;
}
.section-header h2 { margin: 0; color: #333; font-size: 1.4em; }

.btn-create {
  padding: 10px 22px; background: #10b981; color: white;
  border: none; border-radius: 8px; font-weight: 700; cursor: pointer;
}
.btn-create:hover { background: #059669; }

.articles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.empty-state { text-align: center; padding: 60px 20px; color: #999; }

.detail-header h3 { margin: 0 0 12px; color: #333; font-size: 1.3em; }

.detail-meta {
  display: flex; gap: 10px; flex-wrap: wrap; align-items: center;
  margin-bottom: 20px;
}

.category-tag {
  padding: 4px 12px; background: #eff6ff; color: #3b82f6;
  border-radius: 12px; font-size: 0.8em; font-weight: 600;
}

.tag {
  padding: 4px 12px; background: #f3f4f6; color: #666;
  border-radius: 12px; font-size: 0.8em; font-weight: 600;
}

.meta-text { font-size: 0.85em; color: #999; }

.article-content {
  background: #fafafa; border-radius: 8px; padding: 24px;
  min-height: 200px;
}

.btn-primary { padding: 8px 20px; background: #3b82f6; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; }
.btn-secondary { padding: 8px 20px; background: #e5e7eb; color: #333; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; }
.btn-danger { padding: 8px 20px; background: #ef4444; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; }

@media (max-width: 1024px) {
  .articles-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .kb-section {
    padding: 0;
  }

  .section-header {
    flex-direction: column;
    gap: 10px;
    align-items: stretch;
  }

  .section-header h2 {
    font-size: 1.1em;
  }

  .btn-create {
    width: 100%;
    padding: 10px 16px;
    font-size: 0.9em;
  }

  .articles-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .detail-header h3 {
    font-size: 1em;
  }

  .detail-meta {
    gap: 8px;
    flex-wrap: wrap;
    font-size: 0.8em;
  }

  .category-tag, .tag {
    padding: 3px 8px;
    font-size: 0.7em;
  }

  .meta-text {
    font-size: 0.75em;
  }

  .article-content {
    padding: 12px;
  }

  .btn-primary, .btn-secondary, .btn-danger {
    padding: 6px 14px;
    font-size: 0.85em;
  }
}

@media (max-width: 480px) {
  .section-header h2 {
    font-size: 1em;
  }

  .btn-create {
    font-size: 0.85em;
  }

  .detail-header h3 {
    font-size: 0.95em;
  }

  .detail-meta {
    font-size: 0.7em;
    gap: 4px;
  }

  .category-tag, .tag {
    padding: 2px 6px;
    font-size: 0.65em;
  }

  .btn-primary, .btn-secondary, .btn-danger {
    padding: 5px 12px;
    font-size: 0.75em;
  }
}
</style>
