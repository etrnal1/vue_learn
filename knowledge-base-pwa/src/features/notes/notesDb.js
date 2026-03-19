import { knowledgeBaseDb } from '../knowledge-base/knowledgeBaseDb.js'

// 升级 Dexie schema，添加 notes 和 noteCategories 表
// 版本 2 在版本 1 的基础上新增
knowledgeBaseDb.version(2).stores({
  docs: '++id, name, type, createdAt, updatedAt',
  meta: 'key',
  notes: '++id, title, category, isStarred, createdAt, updatedAt, deletedAt',
  noteCategories: '++id, &name, sortOrder'
})

// 版本 3: 添加文档版本历史表
knowledgeBaseDb.version(3).stores({
  docs: '++id, name, type, createdAt, updatedAt',
  meta: 'key',
  notes: '++id, title, category, isStarred, createdAt, updatedAt, deletedAt',
  noteCategories: '++id, &name, sortOrder',
  docVersions: '++id, docId, version, createdAt'
})

// 版本 4: 添加文件夹表，docs 增加 folderId 索引
knowledgeBaseDb.version(4).stores({
  docs: '++id, name, type, folderId, createdAt, updatedAt',
  meta: 'key',
  notes: '++id, title, category, isStarred, createdAt, updatedAt, deletedAt',
  noteCategories: '++id, &name, sortOrder',
  docVersions: '++id, docId, version, createdAt',
  folders: '++id, &name, sortOrder, createdAt'
})

const db = knowledgeBaseDb

// ============ 笔记 CRUD ============

export async function listNotes({ category, tag, keyword, starred, sort = 'newest' } = {}) {
  let notes
  try {
    notes = await db.notes.toArray()
    // 过滤未删除的笔记（兼容 deletedAt 为 0、null、undefined）
    notes = notes.filter(n => !n.deletedAt)
  } catch (err) {
    console.error('[notesDb] listNotes failed:', err)
    notes = []
  }

  // 过滤
  if (category) notes = notes.filter(n => n.category === category)
  if (starred) notes = notes.filter(n => n.isStarred)
  if (keyword) {
    const kw = keyword.toLowerCase()
    notes = notes.filter(n =>
      n.title.toLowerCase().includes(kw) ||
      n.content.toLowerCase().includes(kw) ||
      (n.tags || []).some(t => t.toLowerCase().includes(kw))
    )
  }
  if (tag) notes = notes.filter(n => (n.tags || []).includes(tag))

  // 排序
  const sortFns = {
    newest: (a, b) => b.createdAt - a.createdAt,
    oldest: (a, b) => a.createdAt - b.createdAt,
    updated: (a, b) => b.updatedAt - a.updatedAt,
    title: (a, b) => a.title.localeCompare(b.title, 'zh-CN'),
    length: (a, b) => b.wordCount - a.wordCount
  }
  notes.sort(sortFns[sort] || sortFns.newest)

  return notes
}

export async function getNote(id) {
  const note = await db.notes.get(id)
  if (!note || note.deletedAt) return null
  return note
}

export async function createNote({ title, content = '', category = '', tags = [], isStarred = false, expiresAt = 0 }) {
  const now = Date.now()
  const note = {
    title: title.trim(),
    content,
    category,
    tags: tags || [],
    isStarred: !!isStarred,
    expiresAt: expiresAt || 0,
    wordCount: content.length,
    createdAt: now,
    updatedAt: now,
    deletedAt: 0
  }
  const id = await db.notes.add(note)

  // 自动创建分类
  if (category) await ensureCategory(category)

  return { ...note, id }
}

export async function updateNote(id, changes) {
  const existing = await db.notes.get(id)
  if (!existing || existing.deletedAt) return null

  const patch = { updatedAt: Date.now() }
  if (changes.title !== undefined) patch.title = changes.title.trim()
  if (changes.content !== undefined) {
    patch.content = changes.content
    patch.wordCount = changes.content.length
  }
  if (changes.category !== undefined) patch.category = changes.category
  if (changes.tags !== undefined) patch.tags = changes.tags
  if (changes.isStarred !== undefined) patch.isStarred = !!changes.isStarred
  if (changes.expiresAt !== undefined) patch.expiresAt = changes.expiresAt || 0

  await db.notes.update(id, patch)

  if (patch.category) await ensureCategory(patch.category)

  return db.notes.get(id)
}

export async function deleteNote(id) {
  await db.notes.update(id, { deletedAt: Date.now() })
}

export async function toggleStar(id) {
  const note = await db.notes.get(id)
  if (!note || note.deletedAt) return null
  await db.notes.update(id, { isStarred: !note.isStarred, updatedAt: Date.now() })
  return db.notes.get(id)
}

// ============ 分类 ============

async function ensureCategory(name) {
  const existing = await db.noteCategories.where('name').equals(name).first()
  if (!existing) {
    const colors = ['#0f766e', '#2563eb', '#dc2626', '#d97706', '#7c3aed', '#db2777', '#059669', '#4f46e5']
    const count = await db.noteCategories.count()
    await db.noteCategories.add({
      name,
      color: colors[count % colors.length],
      sortOrder: count,
      createdAt: Date.now()
    })
  }
}

export async function listCategories() {
  return db.noteCategories.orderBy('sortOrder').toArray()
}

export async function createCategory(name, color = '#0f766e') {
  const existing = await db.noteCategories.where('name').equals(name).first()
  if (existing) return existing
  const count = await db.noteCategories.count()
  const id = await db.noteCategories.add({ name, color, sortOrder: count, createdAt: Date.now() })
  return db.noteCategories.get(id)
}

export async function deleteCategory(id) {
  await db.noteCategories.delete(id)
}

// ============ 统计 ============

export async function getStats() {
  const allNotes = (await db.notes.toArray()).filter(n => !n.deletedAt)
  const totalNotes = allNotes.length
  const totalWords = allNotes.reduce((sum, n) => sum + (n.wordCount || 0), 0)
  const starredCount = allNotes.filter(n => n.isStarred).length

  // 分类统计
  const catMap = {}
  for (const n of allNotes) {
    const cat = n.category || '未分类'
    catMap[cat] = (catMap[cat] || 0) + 1
  }
  const categories = Object.entries(catMap)
    .map(([name, count]) => ({ name, count, percentage: totalNotes > 0 ? ((count / totalNotes) * 100).toFixed(1) : '0' }))
    .sort((a, b) => b.count - a.count)

  // 标签统计
  const tagMap = {}
  for (const n of allNotes) {
    for (const t of (n.tags || [])) {
      tagMap[t] = (tagMap[t] || 0) + 1
    }
  }
  const tags = Object.entries(tagMap)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 30)

  // 最近30天趋势
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
  const trendMap = {}
  for (const n of allNotes) {
    if (n.createdAt >= thirtyDaysAgo) {
      const date = new Date(n.createdAt).toISOString().slice(0, 10)
      trendMap[date] = (trendMap[date] || 0) + 1
    }
  }
  const trendData = Object.entries(trendMap)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return { totalNotes, totalWords, starredCount, categories, tags, trendData, avgWordCount: totalNotes > 0 ? Math.round(totalWords / totalNotes) : 0 }
}

// ============ 获取所有标签 ============

export async function getAllTags() {
  const allNotes = (await db.notes.toArray()).filter(n => !n.deletedAt)
  const tagSet = new Set()
  for (const n of allNotes) {
    for (const t of (n.tags || [])) tagSet.add(t)
  }
  return [...tagSet].sort()
}

// ============ 导出 ============

export async function exportNotes(format = 'json') {
  const notes = await listNotes()

  if (format === 'csv') {
    const BOM = '\ufeff'
    const header = 'ID,标题,内容,分类,标签,星标,字数,创建时间,更新时间\n'
    const rows = notes.map(n =>
      `"${n.id}","${(n.title || '').replace(/"/g, '""')}","${(n.content || '').replace(/"/g, '""')}","${n.category}","${(n.tags || []).join(';')}",${n.isStarred ? 1 : 0},${n.wordCount},${new Date(n.createdAt).toISOString()},${new Date(n.updatedAt).toISOString()}`
    )
    return BOM + header + rows.join('\n')
  }

  if (format === 'markdown') {
    return notes.map(n =>
      `# ${n.title}\n\n**分类**: ${n.category || '无'} | **标签**: ${(n.tags || []).join(', ') || '无'} | **创建时间**: ${new Date(n.createdAt).toLocaleString()}\n\n${n.content}\n\n---\n`
    ).join('\n')
  }

  return JSON.stringify({ notes, exportedAt: new Date().toISOString(), total: notes.length }, null, 2)
}
