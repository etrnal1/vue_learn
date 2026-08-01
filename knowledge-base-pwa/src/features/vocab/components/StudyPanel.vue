<template>
  <div>
    <div class="section-head">
      <div>
        <p class="eyebrow">Study</p>
        <h2>{{ source === 'mistakes' ? '记错本复习' : source === 'srs' ? '今日复习' : '自由背诵' }}</h2>
      </div>
    </div>

    <!-- 配置阶段 -->
    <div v-if="stage === 'config'" class="study-config">
      <!-- SRS 模式：显示今日待复习数量 -->
      <div v-if="source === 'srs'" class="srs-due-info">
        <span class="srs-due-count">{{ dueCount }}</span>
        <span class="srs-due-label">个单词待复习</span>
      </div>

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
      <button type="button" class="btn btn-primary study-start-btn" :disabled="source === 'srs' && dueCount === 0" @click="startSession">
        {{ source === 'srs' && dueCount === 0 ? '今日已复习完' : '开始学习' }}
      </button>
      <div v-if="noWordsMsg" class="empty compact">
        <p>{{ noWordsMsg }}</p>
      </div>
      <button v-if="source === 'srs'" type="button" class="btn srs-free-link" @click="$emit('switch-to-free')">
        改用自由背诵（全部单词）→
      </button>
    </div>

    <!-- 学习阶段 -->
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

      <!-- SRS 三档答题 -->
      <div v-if="source === 'srs'" class="study-answer-actions srs-actions">
        <button type="button" class="btn btn-danger btn-answer" @click="answerSrs(1)">不认识</button>
        <button type="button" class="btn btn-warning btn-answer" @click="answerSrs(3)">模糊</button>
        <button type="button" class="btn btn-success btn-answer" @click="answerSrs(5)">认识</button>
      </div>
      <!-- 自由模式两档答题 -->
      <div v-else class="study-answer-actions">
        <button type="button" class="btn btn-danger btn-answer" @click="answerFree(false)">不认识</button>
        <button type="button" class="btn btn-success btn-answer" @click="answerFree(true)">认识</button>
      </div>
    </div>

    <!-- 总结阶段 -->
    <div v-else-if="stage === 'summary'" class="study-summary">
      <p class="study-summary-line">本轮完成 {{ queue.length }} 个单词</p>
      <p class="study-summary-line success">认识：{{ results.correct }}</p>
      <p v-if="source === 'srs'" class="study-summary-line warning">模糊：{{ results.hard }}</p>
      <p class="study-summary-line danger">不认识：{{ results.wrong }}</p>
      <div class="study-summary-actions">
        <button type="button" class="btn" @click="restart">再来一轮</button>
        <button v-if="source === 'mistakes'" type="button" class="btn btn-primary" @click="$emit('exit')">返回记错本</button>
      </div>
    </div>
  </div>
</template>

<script>
import { listWords, listCategories, recordStudyResult, getDueWords, getDueCount, updateSrs } from '../vocabDb.js'
import { speak } from '../tts.js'

export default {
  name: 'StudyPanel',

  props: {
    source: { type: String, default: 'all' } // 'srs' | 'all' | 'mistakes'
  },

  emits: ['exit', 'mistake-count-change', 'switch-to-free'],

  data() {
    return {
      categories: [],
      categoryFilter: '',
      order: 'sequential',
      stage: 'config',
      queue: [],
      currentIndex: 0,
      flipped: false,
      results: { correct: 0, hard: 0, wrong: 0 },
      noWordsMsg: '',
      dueCount: 0
    }
  },

  computed: {
    currentWord() {
      return this.queue[this.currentIndex] || {}
    }
  },

  async mounted() {
    this.categories = await listCategories()
    if (this.source === 'srs') {
      this.dueCount = await getDueCount()
    }
  },

  methods: {
    async startSession() {
      let words
      if (this.source === 'srs') {
        words = await getDueWords({ categoryId: this.categoryFilter || undefined })
        if (!words.length) { this.noWordsMsg = '今日没有待复习单词。'; return }
      } else if (this.source === 'mistakes') {
        words = await listWords({ mistakeOnly: true })
        if (!words.length) { this.noWordsMsg = '记错本是空的，先去背单词标记几个不认识的词吧。'; return }
      } else {
        words = await listWords({ categoryId: this.categoryFilter || undefined })
        if (!words.length) { this.noWordsMsg = '这个范围内还没有单词。'; return }
      }
      this.noWordsMsg = ''
      if (this.order === 'random') words = [...words].sort(() => Math.random() - 0.5)
      this.queue = words
      this.currentIndex = 0
      this.flipped = false
      this.results = { correct: 0, hard: 0, wrong: 0 }
      this.stage = 'session'
    },

    async answerSrs(quality) {
      const word = this.currentWord
      await updateSrs(word.id, quality)
      if (quality === 5) this.results.correct++
      else if (quality === 3) this.results.hard++
      else this.results.wrong++
      await this.emitMistakeCount()
      this.advance()
    },

    async answerFree(remembered) {
      const word = this.currentWord
      await recordStudyResult(word.id, remembered)
      if (remembered) this.results.correct++
      else this.results.wrong++
      await this.emitMistakeCount()
      this.advance()
    },

    advance() {
      this.flipped = false
      if (this.currentIndex + 1 >= this.queue.length) {
        this.stage = 'summary'
      } else {
        this.currentIndex++
      }
    },

    async restart() {
      if (this.source === 'srs') {
        this.dueCount = await getDueCount()
      }
      this.stage = 'config'
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
