<template>
  <div>
    <div class="section-head">
      <div>
        <p class="eyebrow">Import</p>
        <h2>批量导入</h2>
      </div>
    </div>

    <!-- 选文件阶段 -->
    <div v-if="stage === 'pick'" class="import-pick">
      <div class="import-format-hint">
        <p class="form-hint" style="margin-bottom:6px">支持 <strong>.csv</strong> 或 <strong>.txt</strong>，每行一个单词，列用逗号或 Tab 分隔：</p>
        <pre class="import-hint-code">单词,释义,音标,例句,分类
eloquent,adj. 雄辩的,/ˈeləkwənt/,,
serendipity,"n. 偶然发现，运气好"</pre>
        <p class="form-hint" style="margin-top:6px">只有<strong>第1列（单词）</strong>必填，其余留空即可。首行若为表头会自动跳过。</p>
      </div>

      <label class="btn import-file-btn">
        📂 选择文件
        <input type="file" accept=".csv,.txt,text/plain,text/csv" style="display:none" @change="onFilePicked" />
      </label>

      <div v-if="parseError" class="form-error">{{ parseError }}</div>
    </div>

    <!-- 预览确认阶段 -->
    <div v-else-if="stage === 'preview'" class="import-preview">
      <div class="import-stats-row">
        <span class="pill">共 {{ parsed.length }} 条有效</span>
        <span v-if="invalidCount > 0" class="pill import-pill-warn">跳过 {{ invalidCount }} 行（空单词）</span>
      </div>

      <div class="import-table-wrap">
        <table class="import-table">
          <thead>
            <tr><th>#</th><th>单词</th><th>释义</th><th>音标</th><th>分类</th></tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in previewRows" :key="i">
              <td class="import-num">{{ i + 1 }}</td>
              <td><strong>{{ r.word }}</strong></td>
              <td class="import-meanings">{{ r.meanings.join('；') }}</td>
              <td class="import-muted">{{ r.phonetic }}</td>
              <td class="import-muted">{{ r.categoryName || '' }}</td>
            </tr>
            <tr v-if="parsed.length > previewLimit">
              <td colspan="5" class="import-more">… 还有 {{ parsed.length - previewLimit }} 条（导入后可查看）</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="form-group">
        <label>目标分类（未指定分类的词统一归入）</label>
        <select v-model="targetCategoryId" class="input select">
          <option value="">不指定</option>
          <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </div>

      <div class="form-group">
        <label>重复单词处理</label>
        <select v-model="skipDuplicates" class="input select">
          <option :value="true">跳过（推荐）</option>
          <option :value="false">仍然导入</option>
        </select>
      </div>

      <div class="import-actions">
        <button type="button" class="btn" @click="reset">重新选文件</button>
        <button type="button" class="btn btn-primary" :disabled="importing" @click="doImport">
          {{ importing ? '导入中…' : `导入 ${parsed.length} 条` }}
        </button>
      </div>
    </div>

    <!-- 完成阶段 -->
    <div v-else-if="stage === 'done'" class="import-done">
      <p class="import-done-icon">✅</p>
      <p class="import-done-title">导入完成</p>
      <p class="study-summary-line success">成功导入：{{ result.imported }} 条</p>
      <p v-if="result.skipped > 0" class="study-summary-line" style="color:var(--muted)">跳过重复：{{ result.skipped }} 条</p>
      <div class="import-actions" style="margin-top:20px">
        <button type="button" class="btn" @click="reset">再次导入</button>
        <button type="button" class="btn btn-primary" @click="$emit('done')">查看单词表</button>
      </div>
    </div>
  </div>
</template>

<script>
import { listCategories, addCategory, bulkImport } from '../vocabDb.js'

const PREVIEW_LIMIT = 20

function parseCsvLine(line) {
  const fields = []
  let cur = '', inQuote = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuote) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++ }
        else inQuote = false
      } else cur += ch
    } else {
      if (ch === '"') { inQuote = true }
      else if (ch === ',' || ch === '\t') { fields.push(cur); cur = '' }
      else cur += ch
    }
  }
  fields.push(cur)
  return fields.map((f) => f.trim())
}

function looksLikeHeader(fields) {
  const first = (fields[0] || '').toLowerCase()
  return ['word', '单词', 'vocabulary', 'term'].includes(first)
}

function parseFile(text) {
  const lines = text.split(/\r?\n/)
  const rows = [], invalid = []

  let headerSkipped = false
  for (const raw of lines) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const fields = parseCsvLine(line)
    if (!headerSkipped && looksLikeHeader(fields)) { headerSkipped = true; continue }
    headerSkipped = true

    const word = fields[0] || ''
    if (!word) { invalid.push(line); continue }

    const meaningsRaw = fields[1] || ''
    const meanings = meaningsRaw
      ? meaningsRaw.split(/[;；]/).map((m) => m.trim()).filter(Boolean)
      : []
    rows.push({
      word,
      meanings,
      phonetic: fields[2] || '',
      example: fields[3] || '',
      categoryName: fields[4] || ''
    })
  }
  return { rows, invalidCount: invalid.length }
}

export default {
  name: 'ImportPanel',

  emits: ['done'],

  data() {
    return {
      stage: 'pick',     // pick | preview | done
      parseError: '',
      parsed: [],
      invalidCount: 0,
      categories: [],
      targetCategoryId: '',
      skipDuplicates: true,
      importing: false,
      result: null,
      previewLimit: PREVIEW_LIMIT
    }
  },

  computed: {
    previewRows() {
      return this.parsed.slice(0, this.previewLimit)
    }
  },

  async mounted() {
    this.categories = await listCategories()
  },

  methods: {
    reset() {
      this.stage = 'pick'
      this.parsed = []
      this.invalidCount = 0
      this.parseError = ''
      this.result = null
    },

    onFilePicked(e) {
      const file = e.target.files[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const { rows, invalidCount } = parseFile(ev.target.result)
          if (rows.length === 0) {
            this.parseError = '未解析到有效单词，请检查文件格式。'
            return
          }
          this.parsed = rows
          this.invalidCount = invalidCount
          this.parseError = ''
          this.stage = 'preview'
        } catch (err) {
          this.parseError = '文件读取失败：' + err.message
        }
      }
      reader.readAsText(file, 'utf-8')
      e.target.value = ''
    },

    async doImport() {
      this.importing = true
      try {
        // 解析 CSV 里的分类名称，按需创建分类
        const catMap = {}
        for (const row of this.parsed) {
          if (row.categoryName && !catMap[row.categoryName]) {
            const cat = await addCategory(row.categoryName)
            catMap[row.categoryName] = cat ? cat.id : null
          }
        }
        const rows = this.parsed.map((r) => ({
          ...r,
          categoryId: r.categoryName ? (catMap[r.categoryName] || null) : null
        }))
        this.result = await bulkImport(rows, {
          categoryId: this.targetCategoryId || null,
          skipDuplicates: this.skipDuplicates
        })
        this.stage = 'done'
      } finally {
        this.importing = false
      }
    }
  }
}
</script>
