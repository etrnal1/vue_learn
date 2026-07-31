import Dexie from 'dexie'

// 背单词模块独立的 Dexie 数据库，跟 knowledgeBaseDb（docs/notes/embeddings...）完全隔离，
// 避免语义无关的两套数据挤在同一个库里，以后各自的 schema 升级也互不影响
export const vocabDb = new Dexie('vocab-pwa')

vocabDb.version(1).stores({
  words: '++id, categoryId, favorite, isMistake, word, createdAt',
  categories: '++id, name, createdAt'
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
    updatedAt: now
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
