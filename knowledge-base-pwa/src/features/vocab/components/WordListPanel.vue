<template>
  <div>
    <div class="section-head">
      <div>
        <p class="eyebrow">Words</p>
        <h2>单词表</h2>
      </div>
      <span class="pill">{{ filteredWords.length }}</span>
    </div>

    <div class="toolbar-group vocab-filter-bar">
      <select v-model="categoryFilter" class="input select">
        <option value="">全部分类</option>
        <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
      <button type="button" class="btn" :class="{ 'btn-active': favoriteOnly }" @click="favoriteOnly = !favoriteOnly">
        {{ favoriteOnly ? '★ 收藏' : '☆ 收藏' }}
      </button>
    </div>

    <div class="toolbar-group">
      <input v-model.trim="searchKeyword" class="input" placeholder="搜索单词、释义…" />
    </div>

    <div v-if="filteredWords.length === 0" class="empty">
      <strong>{{ categoryFilter || favoriteOnly || searchKeyword ? '没有匹配的单词' : '还没有单词' }}</strong>
      <p>{{ categoryFilter || favoriteOnly || searchKeyword ? '试试调整筛选条件' : '点击"添加单词"开始记录' }}</p>
    </div>

    <div v-else class="word-card-grid">
      <div v-for="w in filteredWords" :key="w.id" class="word-card" @click="$emit('edit', w.id)">
        <div class="word-card-main">
          <div class="word-card-head">
            <strong class="word-text">{{ w.word }}</strong>
            <span v-if="w.phonetic" class="word-phonetic">{{ w.phonetic }}</span>
            <span v-if="w.isMistake" class="mistake-tag">记错本</span>
          </div>
          <p class="word-meanings">{{ w.meanings.join('；') }}</p>
          <span v-if="categoryName(w.categoryId)" class="note-cat-tag">{{ categoryName(w.categoryId) }}</span>
        </div>
        <button type="button" class="speak-btn" @click.stop="speakWithAudio(w.audioUrl, w.word)" title="朗读">🔊</button>
        <button type="button" class="star-btn" :class="{ starred: w.favorite === 1 }" @click.stop="toggleFav(w.id)">
          {{ w.favorite === 1 ? '★' : '☆' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { listWords, listCategories, toggleFavorite } from '../vocabDb.js'
import { speakWithAudio } from '../tts.js'

export default {
  name: 'WordListPanel',

  emits: ['edit'],

  data() {
    return {
      words: [],
      categories: [],
      categoryFilter: '',
      favoriteOnly: false,
      searchKeyword: ''
    }
  },

  computed: {
    filteredWords() {
      let list = this.words
      if (this.categoryFilter !== '') {
        list = list.filter((w) => w.categoryId === this.categoryFilter)
      }
      if (this.favoriteOnly) {
        list = list.filter((w) => w.favorite === 1)
      }
      if (this.searchKeyword) {
        const kw = this.searchKeyword.toLowerCase()
        list = list.filter((w) =>
          w.word.toLowerCase().includes(kw) ||
          (w.meanings || []).some((m) => m.toLowerCase().includes(kw))
        )
      }
      return list
    }
  },

  async mounted() {
    await this.loadAll()
  },

  methods: {
    async loadAll() {
      this.words = await listWords()
      this.categories = await listCategories()
    },
    categoryName(id) {
      const c = this.categories.find((cat) => cat.id === id)
      return c ? c.name : ''
    },
    async toggleFav(id) {
      await toggleFavorite(id)
      await this.loadAll()
    },
    speakWithAudio(audioUrl, word) {
      speakWithAudio(audioUrl, word)
    }
  }
}
</script>
