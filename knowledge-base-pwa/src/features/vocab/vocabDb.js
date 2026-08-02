import Dexie from 'dexie'

// 背单词模块独立的 Dexie 数据库，跟 knowledgeBaseDb（docs/notes/embeddings...）完全隔离，
// 避免语义无关的两套数据挤在同一个库里，以后各自的 schema 升级也互不影响
export const vocabDb = new Dexie('vocab-pwa')

vocabDb.version(1).stores({
  words: '++id, categoryId, favorite, isMistake, word, createdAt',
  categories: '++id, name, createdAt'
})

// v2: 加 srsDue 索引支持间隔重复查询
vocabDb.version(2).stores({
  words: '++id, categoryId, favorite, isMistake, word, createdAt, srsDue',
  categories: '++id, name, createdAt'
}).upgrade((tx) => {
  const now = Date.now()
  return tx.table('words').toCollection().modify((word) => {
    if (word.srsDue === undefined) {
      word.srsInterval = 0
      word.srsEase = 2.5
      word.srsDue = now
      word.srsReviews = 0
    }
  })
})

// ============ 单词 ============

export async function listWords({ categoryId, favoriteOnly, mistakeOnly } = {}) {
  let words = await vocabDb.words.orderBy('createdAt').reverse().toArray()
  if (categoryId !== undefined && categoryId !== null && categoryId !== '') {
    words = words.filter((w) => w.categoryId === categoryId)
  }
  if (favoriteOnly) words = words.filter((w) => w.favorite === 1)
  if (mistakeOnly) words = words.filter((w) => w.isMistake === 1)
  return words
}

export async function getWord(id) {
  return vocabDb.words.get(id)
}

export async function addWord(data) {
  const now = Date.now()
  const payload = {
    word: String(data.word || '').trim(),
    meanings: (Array.isArray(data.meanings) ? data.meanings : [])
      .map((m) => String(m || '').trim())
      .filter(Boolean),
    example: String(data.example || '').trim(),
    phonetic: String(data.phonetic || '').trim(),
    note: String(data.note || '').trim(),
    categoryId: data.categoryId || null,
    favorite: 0,
    isMistake: 0,
    correctCount: 0,
    wrongCount: 0,
    createdAt: now,
    updatedAt: now,
    srsInterval: 0,
    srsEase: 2.5,
    srsDue: now,
    srsReviews: 0,
    audioUrl: String(data.audioUrl || '')
  }
  const id = await vocabDb.words.add(payload)
  return vocabDb.words.get(id)
}

export async function updateWord(id, changes) {
  const patch = { updatedAt: Date.now() }
  if (changes.word !== undefined) patch.word = String(changes.word).trim()
  if (changes.meanings !== undefined) {
    patch.meanings = changes.meanings.map((m) => String(m || '').trim()).filter(Boolean)
  }
  if (changes.example !== undefined) patch.example = String(changes.example).trim()
  if (changes.phonetic !== undefined) patch.phonetic = String(changes.phonetic).trim()
  if (changes.note !== undefined) patch.note = String(changes.note).trim()
  if (changes.audioUrl !== undefined) patch.audioUrl = changes.audioUrl || ''
  if (changes.categoryId !== undefined) patch.categoryId = changes.categoryId || null
  await vocabDb.words.update(id, patch)
  return vocabDb.words.get(id)
}

export async function deleteWord(id) {
  await vocabDb.words.delete(id)
}

export async function toggleFavorite(id) {
  const word = await vocabDb.words.get(id)
  if (!word) return
  await vocabDb.words.update(id, { favorite: word.favorite === 1 ? 0 : 1 })
}

export async function setMistake(id, isMistake) {
  await vocabDb.words.update(id, { isMistake: isMistake ? 1 : 0 })
}

// ============ SRS (间隔重复 SM-2) ============

export async function getDueWords({ categoryId } = {}) {
  const now = Date.now()
  let words = await vocabDb.words.where('srsDue').belowOrEqual(now).toArray()
  if (categoryId) words = words.filter((w) => w.categoryId === categoryId)
  return words
}

export async function getDueCount() {
  return vocabDb.words.where('srsDue').belowOrEqual(Date.now()).count()
}

// quality: 1=不认识 3=模糊 5=认识（SM-2）
export async function updateSrs(id, quality) {
  const word = await vocabDb.words.get(id)
  if (!word) return 1

  const ease = word.srsEase ?? 2.5
  const reviews = word.srsReviews ?? 0
  const interval = word.srsInterval ?? 0

  let newInterval, newEase

  if (quality < 3) {
    newInterval = 1
    newEase = Math.max(1.3, parseFloat((ease - 0.2).toFixed(2)))
  } else {
    if (reviews === 0) newInterval = 1
    else if (reviews === 1) newInterval = 6
    else newInterval = Math.max(1, Math.round(interval * ease))

    newEase = ease + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
    newEase = Math.max(1.3, parseFloat(newEase.toFixed(2)))
  }

  const newDue = Date.now() + newInterval * 24 * 60 * 60 * 1000

  await vocabDb.words.update(id, {
    srsInterval: newInterval,
    srsEase: newEase,
    srsDue: newDue,
    srsReviews: reviews + 1,
    isMistake: quality < 3 ? 1 : quality === 5 ? 0 : (word.isMistake || 0),
    correctCount: quality >= 3 ? (word.correctCount || 0) + 1 : (word.correctCount || 0),
    wrongCount: quality < 3 ? (word.wrongCount || 0) + 1 : (word.wrongCount || 0)
  })

  return newInterval
}

// ============ 批量导入 ============

export async function bulkImport(rows, { categoryId = null, skipDuplicates = true } = {}) {
  const existing = await vocabDb.words.toArray()
  const existingSet = new Set(existing.map((w) => w.word.toLowerCase().trim()))
  const now = Date.now()
  let imported = 0, skipped = 0

  for (const row of rows) {
    const key = (row.word || '').toLowerCase().trim()
    if (!key) continue
    if (skipDuplicates && existingSet.has(key)) { skipped++; continue }
    await vocabDb.words.add({
      word: row.word.trim(),
      meanings: Array.isArray(row.meanings) ? row.meanings.filter(Boolean) : [],
      example: row.example || '',
      phonetic: row.phonetic || '',
      note: '',
      categoryId: row.categoryId || categoryId || null,
      favorite: 0, isMistake: 0, correctCount: 0, wrongCount: 0,
      createdAt: now, updatedAt: now,
      srsInterval: 0, srsEase: 2.5, srsDue: now, srsReviews: 0
    })
    existingSet.add(key)
    imported++
  }
  return { imported, skipped }
}

export async function recordStudyResult(id, remembered) {
  const word = await vocabDb.words.get(id)
  if (!word) return
  if (remembered) {
    await vocabDb.words.update(id, {
      isMistake: 0,
      correctCount: (word.correctCount || 0) + 1
    })
  } else {
    await vocabDb.words.update(id, {
      isMistake: 1,
      wrongCount: (word.wrongCount || 0) + 1
    })
  }
}

// ============ 分类 ============

export async function listCategories() {
  return vocabDb.categories.orderBy('createdAt').toArray()
}

export async function addCategory(name) {
  const trimmed = String(name || '').trim()
  if (!trimmed) return null
  const existing = await vocabDb.categories.where('name').equals(trimmed).first()
  if (existing) return existing
  const id = await vocabDb.categories.add({ name: trimmed, createdAt: Date.now() })
  return vocabDb.categories.get(id)
}

export async function deleteCategory(id) {
  const words = await vocabDb.words.where('categoryId').equals(id).toArray()
  await vocabDb.transaction('rw', vocabDb.words, vocabDb.categories, async () => {
    for (const w of words) {
      await vocabDb.words.update(w.id, { categoryId: null })
    }
    await vocabDb.categories.delete(id)
  })
}
