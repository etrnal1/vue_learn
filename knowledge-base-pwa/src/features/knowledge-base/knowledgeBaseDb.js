import Dexie from 'dexie'

const DB_NAME = 'knowledge-base-pwa'

export const knowledgeBaseDb = new Dexie(DB_NAME)

knowledgeBaseDb.version(1).stores({
  docs: '++id, name, type, createdAt, updatedAt',
  meta: 'key'
})

export async function listKnowledgeDocs() {
  return knowledgeBaseDb.docs.orderBy('createdAt').reverse().toArray()
}

export async function saveKnowledgeDocs(docs) {
  const now = Date.now()
  const payload = (Array.isArray(docs) ? docs : []).map((doc) => ({
    createdAt: doc.createdAt || now,
    updatedAt: now,
    ...doc
  }))
  if (!payload.length) return []
  await knowledgeBaseDb.docs.bulkAdd(payload)
  return listKnowledgeDocs()
}

export async function removeKnowledgeDoc(id) {
  await knowledgeBaseDb.docs.delete(id)
}

export async function clearKnowledgeDocs() {
  await knowledgeBaseDb.docs.clear()
}

export async function setKnowledgeMeta(key, value) {
  await knowledgeBaseDb.meta.put({ key, value, updatedAt: Date.now() })
}

export async function getKnowledgeMeta(key) {
  const record = await knowledgeBaseDb.meta.get(key)
  return record?.value
}

// ============ 密码保护 ============

async function hashPassword(password) {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + 'kb-pwa-salt-2024')
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function setPassword(password) {
  if (!password) {
    await knowledgeBaseDb.meta.delete('passwordHash')
    return
  }
  const hash = await hashPassword(password)
  await knowledgeBaseDb.meta.put({ key: 'passwordHash', value: hash, updatedAt: Date.now() })
}

export async function verifyPassword(password) {
  const record = await knowledgeBaseDb.meta.get('passwordHash')
  if (!record?.value) return true // 未设置密码
  const hash = await hashPassword(password)
  return hash === record.value
}

export async function hasPassword() {
  const record = await knowledgeBaseDb.meta.get('passwordHash')
  return !!(record?.value)
}

// ============ 备份与恢复 ============

export async function exportAllData() {
  const docs = await knowledgeBaseDb.docs.toArray()
  const meta = await knowledgeBaseDb.meta.toArray()

  let notes = []
  let noteCategories = []
  try {
    notes = await knowledgeBaseDb.notes.toArray()
    noteCategories = await knowledgeBaseDb.noteCategories.toArray()
  } catch (_) {
    // notes 表可能尚未创建
  }

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    data: { docs, meta, notes, noteCategories },
    stats: {
      docs: docs.length,
      notes: notes.filter(n => !n.deletedAt).length,
      categories: noteCategories.length
    }
  }
}

export async function importAllData(backup, mode = 'merge') {
  if (!backup?.data) throw new Error('无效的备份文件')

  const { docs = [], meta = [], notes = [], noteCategories = [] } = backup.data
  const result = { docs: 0, notes: 0, categories: 0 }

  if (mode === 'replace') {
    await knowledgeBaseDb.docs.clear()
    await knowledgeBaseDb.meta.clear()
    try {
      await knowledgeBaseDb.notes.clear()
      await knowledgeBaseDb.noteCategories.clear()
    } catch (_) {}
  }

  // 导入时去除 id 让 Dexie 自动分配，避免主键冲突
  if (docs.length) {
    const cleaned = docs.map(({ id, ...rest }) => rest)
    await knowledgeBaseDb.docs.bulkAdd(cleaned)
    result.docs = cleaned.length
  }

  if (meta.length) {
    for (const item of meta) {
      await knowledgeBaseDb.meta.put(item)
    }
  }

  try {
    if (noteCategories.length) {
      for (const cat of noteCategories) {
        const existing = await knowledgeBaseDb.noteCategories.where('name').equals(cat.name).first()
        if (!existing) {
          const { id, ...rest } = cat
          await knowledgeBaseDb.noteCategories.add(rest)
          result.categories++
        }
      }
    }

    if (notes.length) {
      const cleaned = notes.map(({ id, ...rest }) => rest)
      await knowledgeBaseDb.notes.bulkAdd(cleaned)
      result.notes = cleaned.length
    }
  } catch (_) {
    // notes 表可能尚未创建
  }

  return result
}
