<template>
  <div>
    <div class="section-head">
      <div>
        <p class="eyebrow">Study</p>
        <h2>{{ source === 'mistakes' ? '记错本复习' : '背单词' }}</h2>
      </div>
    </div>

    <div v-if="stage === 'config'" class="study-config">
      <div v-if="source === 'all'" class="form-group">
        <label>范围</label>
        <select v-model="categoryFilter" class="input select">
          <option value="">全部分类</option>
          <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </div>
      <div class="form-group">
        <label>出卡顺序</label>
        <select v-model="order" class="input select">
          <option value="sequential">按添加顺序</option>
          <option value="random">随机</option>
        </select>
      </div>
      <button type="button" class="btn btn-primary study-start-btn" @click="startSession">开始学习</button>
      <div v-if="noWordsMsg" class="empty compact">
        <p>{{ noWordsMsg }}</p>
      </div>
    </div>

    <div v-else-if="stage === 'session'" class="study-session">
      <p class="study-progress">{{ currentIndex + 1 }} / {{ queue.length }}</p>

      <div class="flip-card" @click="flipped = !flipped">
        <div v-if="!flipped" class="flip-face">
          <div class="flip-word">{{ currentWord.word }}</div>
          <div v-if="currentWord.phonetic" class="flip-phonetic">{{ currentWord.phonetic }}</div>
          <button type="button" class="speak-btn flip-speak" @click.stop="speakCurrent" title="朗读">🔊</button>
          <p class="flip-hint">点击卡片查看释义</p>
        </div>
        <div v-else class="flip-face flip-back">
          <div class="flip-word small">{{ currentWord.word }}</div>
          <button type="button" class="speak-btn" style="margin: 4px auto 8px; display: block" @click.stop="speakCurrent" title="朗读">🔊</button>
          <ul class="flip-meanings">
            <li v-for="(m, i) in currentWord.meanings" :key="i">{{ m }}</li>
          </ul>
          <p v-if="currentWord.example" class="flip-example">{{ currentWord.example }}</p>
        </div>
      </div>

      <div class="study-answer-actions">
        <button type="button" class="btn btn-danger btn-answer" @click="answer(false)">不认识</button>
        <button type="button" class="btn btn-success btn-answer" @click="answer(true)">认识</button>
      </div>
    </div>

    <div v-else-if="stage === 'summary'" class="study-summary">
      <p class="study-summary-line">本轮完成 {{ queue.length }} 个单词</p>
      <p class="study-summary-line success">认识：{{ results.correct }}</p>
      <p class="study-summary-line danger">不认识：{{ results.wrong }}</p>
      <div class="study-summary-actions">
        <button type="button" class="btn" @click="stage = 'config'">再来一轮</button>
        <button v-if="source === 'mistakes'" type="button" class="btn btn-primary" @click="$emit('exit')">返回记错本</button>
      </div>
    </div>
  </div>
</template>

<script>
import { listWords, listCategories, recordStudyResult } from '../vocabDb.js'
import { speak } from '../tts.js'

export default {
  name: 'StudyPanel',

  props: {
    source: { type: String, default: 'all' }
  },

  emits: ['exit', 'mistake-count-change'],

  data() {
    return {
      categories: [],
      categoryFilter: '',
      order: 'sequential',
      stage: 'config',
      queue: [],
      currentIndex: 0,
      flipped: false,
      results: { correct: 0, wrong: 0 },
      noWordsMsg: ''
    }
  },

  computed: {
    currentWord() {
      return this.queue[this.currentIndex] || {}
    }
  },

  async mounted() {
    this.categories = await listCategories()
  },

  methods: {
    async startSession() {
      const query = this.source === 'mistakes'
        ? { mistakeOnly: true }
        : { categoryId: this.categoryFilter || undefined }
      let words = await listWords(query)
      if (!words.length) {
        this.noWordsMsg = this.source === 'mistakes' ? '记错本是空的，先去背单词标记几个不认识的词吧。' : '这个范围内还没有单词。'
        return
      }
      this.noWordsMsg = ''
      if (this.order === 'random') {
        words = [...words].sort(() => Math.random() - 0.5)
      }
      this.queue = words
      this.currentIndex = 0
      this.flipped = false
      this.results = { correct: 0, wrong: 0 }
      this.stage = 'session'
    },
    async answer(remembered) {
      const word = this.currentWord
      await recordStudyResult(word.id, remembered)
      if (remembered) this.results.correct++
      else this.results.wrong++
      await this.emitMistakeCount()
      this.flipped = false
      if (this.currentIndex + 1 >= this.queue.length) {
        this.stage = 'summary'
      } else {
        this.currentIndex++
      }
    },
    speakCurrent() {
      speak(this.currentWord.word)
    },
    async emitMistakeCount() {
      const mistakes = await listWords({ mistakeOnly: true })
      this.$emit('mistake-count-change', mistakes.length)
    }
  }
}
</script>
