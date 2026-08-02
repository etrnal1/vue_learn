<template>
  <div class="word-form">
    <div class="form-group">
      <label>单词 *</label>
      <input v-model.trim="form.word" class="input" type="text" placeholder="例如 apple" autocapitalize="off" autocorrect="off" />
    </div>

    <div class="form-group">
      <label>释义 / 翻译 *</label>
      <div v-for="(m, idx) in form.meanings" :key="idx" class="meaning-row">
        <input v-model.trim="form.meanings[idx]" class="input" type="text" placeholder="例如 n. 苹果" />
        <button v-if="form.meanings.length > 1" type="button" class="mini-btn danger" @click="removeMeaning(idx)">✕</button>
      </div>
      <button type="button" class="mini-btn" @click="addMeaning">+ 再加一条释义</button>
    </div>

    <div class="form-group">
      <label>音标</label>
      <div class="phonetic-row">
        <input v-model.trim="form.phonetic" class="input" type="text" placeholder="例如 /ˈæpl/（选填）" />
        <button type="button" class="mini-btn" :disabled="!form.word || lookingUp" @click="autoLookup">
          {{ lookingUp ? '查询中…' : '自动查询' }}
        </button>
      </div>
      <p v-if="lookupMsg" class="form-hint" :class="{ 'form-hint-err': lookupFailed }">{{ lookupMsg }}</p>
    </div>

    <div class="form-group">
      <label>例句</label>
      <textarea v-model.trim="form.example" class="input word-example-textarea" placeholder="例句（选填）"></textarea>
    </div>

    <div class="form-group">
      <label>分类</label>
      <select v-model="form.categoryId" class="input select">
        <option :value="null">未分类</option>
        <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
      <div class="new-category-row">
        <input v-model.trim="newCategoryName" class="input" type="text" placeholder="新建分类名称" @keydown.enter="createCategory" />
        <button type="button" class="mini-btn" @click="createCategory">新建</button>
      </div>
    </div>

    <p v-if="error" class="form-error">{{ error }}</p>

    <div class="word-form-actions">
      <button v-if="wordId" type="button" class="btn btn-danger" @click="handleDelete">删除</button>
      <button type="button" class="btn btn-primary word-form-submit" @click="handleSubmit">{{ wordId ? '保存修改' : '添加单词' }}</button>
    </div>
  </div>
</template>

<script>
import { addWord, updateWord, deleteWord, getWord, listCategories, addCategory } from '../vocabDb.js'
import { lookupPhoneticAndAudio } from '../tts.js'

export default {
  name: 'WordForm',

  props: {
    wordId: { type: Number, default: null }
  },

  emits: ['done', 'deleted'],

  data() {
    return {
      categories: [],
      newCategoryName: '',
      error: '',
      lookingUp: false,
      lookupMsg: '',
      lookupFailed: false,
      form: {
        word: '',
        meanings: [''],
        phonetic: '',
        audioUrl: '',
        example: '',
        categoryId: null
      }
    }
  },

  async mounted() {
    this.categories = await listCategories()
    if (this.wordId) {
      const word = await getWord(this.wordId)
      if (word) {
        this.form.word = word.word
        this.form.meanings = word.meanings && word.meanings.length ? [...word.meanings] : ['']
        this.form.phonetic = word.phonetic || ''
        this.form.audioUrl = word.audioUrl || ''
        this.form.example = word.example || ''
        this.form.categoryId = word.categoryId || null
      }
    }
  },

  methods: {
    async autoLookup() {
      if (!this.form.word) return
      this.lookingUp = true
      this.lookupMsg = ''
      this.lookupFailed = false
      try {
        const { phonetic, audioUrl } = await lookupPhoneticAndAudio(this.form.word)
        if (phonetic) {
          this.form.phonetic = phonetic
          this.form.audioUrl = audioUrl || ''
          this.lookupMsg = audioUrl ? '音标 + 真人发音已获取' : '音标已自动填入'
          this.lookupFailed = false
        } else {
          this.lookupMsg = '未找到音标，可手动输入'
          this.lookupFailed = true
        }
      } catch {
        this.lookupMsg = '查询失败（可能未联网），可手动输入'
        this.lookupFailed = true
      } finally {
        this.lookingUp = false
      }
    },
    addMeaning() {
      this.form.meanings.push('')
    },
    removeMeaning(idx) {
      this.form.meanings.splice(idx, 1)
    },
    async createCategory() {
      if (!this.newCategoryName) return
      const cat = await addCategory(this.newCategoryName)
      this.newCategoryName = ''
      this.categories = await listCategories()
      if (cat) this.form.categoryId = cat.id
    },
    async handleSubmit() {
      const word = this.form.word.trim()
      const meanings = this.form.meanings.map((m) => m.trim()).filter(Boolean)
      if (!word) {
        this.error = '请输入单词'
        return
      }
      if (!meanings.length) {
        this.error = '请至少填写一条释义'
        return
      }
      this.error = ''
      const payload = {
        word,
        meanings,
        phonetic: this.form.phonetic,
        audioUrl: this.form.audioUrl,
        example: this.form.example,
        categoryId: this.form.categoryId
      }
      if (this.wordId) {
        await updateWord(this.wordId, payload)
      } else {
        await addWord(payload)
      }
      this.$emit('done')
    },
    async handleDelete() {
      if (!this.wordId) return
      if (!confirm(`确定删除单词"${this.form.word}"吗？`)) return
      await deleteWord(this.wordId)
      this.$emit('deleted')
    }
  }
}
</script>
