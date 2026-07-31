<template>
  <div v-if="!reviewing">
    <div class="section-head">
      <div>
        <p class="eyebrow">Mistakes</p>
        <h2>记错本</h2>
      </div>
      <span class="pill">{{ words.length }}</span>
    </div>

    <button v-if="words.length" type="button" class="btn btn-primary word-review-btn" @click="reviewing = true">
      开始复习记错本
    </button>

    <div v-if="words.length === 0" class="empty">
      <strong>记错本是空的</strong>
      <p>背单词时标记"不认识"的词会自动出现在这里</p>
    </div>

    <div v-else class="word-card-grid">
      <div v-for="w in words" :key="w.id" class="word-card">
        <div class="word-card-main">
          <div class="word-card-head">
            <strong class="word-text">{{ w.word }}</strong>
            <span v-if="w.phonetic" class="word-phonetic">{{ w.phonetic }}</span>
          </div>
          <p class="word-meanings">{{ w.meanings.join('；') }}</p>
        </div>
        <button type="button" class="mini-btn word-master-btn" @click="markMastered(w.id)">已掌握</button>
      </div>
    </div>
  </div>

  <StudyPanel v-else source="mistakes" @exit="handleExit" @mistake-count-change="$emit('mistake-count-change', $event)" />
</template>

<script>
import StudyPanel from './StudyPanel.vue'
import { listWords, setMistake } from '../vocabDb.js'

export default {
  name: 'MistakeBookPanel',

  components: { StudyPanel },

  emits: ['mistake-count-change'],

  data() {
    return {
      words: [],
      reviewing: false
    }
  },

  async mounted() {
    await this.loadWords()
  },

  methods: {
    async loadWords() {
      this.words = await listWords({ mistakeOnly: true })
      this.$emit('mistake-count-change', this.words.length)
    },
    async markMastered(id) {
      await setMistake(id, false)
      await this.loadWords()
    },
    async handleExit() {
      this.reviewing = false
      await this.loadWords()
    }
  }
}
</script>
