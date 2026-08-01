<template>
  <div class="notes-page">
    <!-- 顶部 Hero -->
    <section class="hero">
      <div>
        <p class="eyebrow">Vocabulary</p>
        <h1>背单词</h1>
        <p class="hero-text">碎片时间记单词，翻卡片背诵，答错自动进记错本。离线可用。</p>
      </div>
      <div class="hero-actions vocab-hero-actions">
        <button type="button" class="btn" :class="{ 'btn-active': subView === 'list' }" @click="subView = 'list'">📖 单词表</button>
        <button type="button" class="btn" :class="{ 'btn-active': subView === 'study' }" @click="subView = 'study'">🗂️ 背单词</button>
        <button type="button" class="btn" :class="{ 'btn-active': subView === 'mistakes' }" @click="subView = 'mistakes'">
          📕 记错本
          <span v-if="mistakeCount > 0" class="pill vocab-mistake-pill">{{ mistakeCount }}</span>
        </button>
        <button type="button" class="btn btn-primary" :class="{ 'btn-active': subView === 'add' }" @click="subView = 'add'">➕ 添加单词</button>
      </div>
    </section>

    <!-- 子视图 -->
    <section class="panel">
      <WordListPanel v-if="subView === 'list'" ref="listPanel" @edit="openEdit" />

      <StudyPanel v-else-if="subView === 'study'" source="all" @mistake-count-change="onMistakeCountChange" />

      <MistakeBookPanel v-else-if="subView === 'mistakes'" @mistake-count-change="onMistakeCountChange" />

      <template v-else-if="subView === 'add'">
        <div class="section-head">
          <div>
            <p class="eyebrow">Add</p>
            <h2>添加单词</h2>
          </div>
        </div>
        <WordForm @done="handleAddDone" />
      </template>
    </section>

    <!-- 编辑单词 -->
    <transition name="sheet">
      <div v-if="editId !== null" class="sheet-overlay" @click.self="closeEdit">
        <div class="sheet-panel">
          <div class="sheet-content">
            <div class="section-head">
              <div>
                <p class="eyebrow">Edit</p>
                <h2>编辑单词</h2>
              </div>
              <button type="button" class="mini-btn" @click="closeEdit">关闭</button>
            </div>
            <WordForm :word-id="editId" @done="closeEdit" @deleted="closeEdit" />
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
import WordForm from './components/WordForm.vue'
import WordListPanel from './components/WordListPanel.vue'
import StudyPanel from './components/StudyPanel.vue'
import MistakeBookPanel from './components/MistakeBookPanel.vue'
import { listWords } from './vocabDb.js'

export default {
  name: 'VocabPage',

  components: { WordForm, WordListPanel, StudyPanel, MistakeBookPanel },

  emits: ['mistake-count-change'],

  data() {
    return {
      subView: 'list', // list | study | mistakes | add
      editId: null,
      mistakeCount: 0
    }
  },

  async mounted() {
    await this.refreshMistakeCount()
  },

  methods: {
    openEdit(id) {
      this.editId = id
    },
    async closeEdit() {
      this.editId = null
      await this.$nextTick()
      await this.$refs.listPanel?.loadAll()
      await this.refreshMistakeCount()
    },
    async handleAddDone() {
      this.subView = 'list'
      await this.refreshMistakeCount()
    },
    onMistakeCountChange(count) {
      this.mistakeCount = count
      this.$emit('mistake-count-change', count)
    },
    async refreshMistakeCount() {
      const mistakes = await listWords({ mistakeOnly: true })
      this.onMistakeCountChange(mistakes.length)
    }
  }
}
</script>
