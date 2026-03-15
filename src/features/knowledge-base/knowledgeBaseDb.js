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

export async function saveKnowledgeDoc(doc) {
  const now = Date.now()
  const payload = {
    createdAt: doc.createdAt || now,
    updatedAt: now,
    ...doc
  }
  if (payload.id == null) {
    const id = await knowledgeBaseDb.docs.add(payload)
    return knowledgeBaseDb.docs.get(id)
  }
  await knowledgeBaseDb.docs.put(payload)
  return knowledgeBaseDb.docs.get(payload.id)
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

export async function getKnowledgeDoc(id) {
  return knowledgeBaseDb.docs.get(id)
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
