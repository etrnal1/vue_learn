import Dexie from 'dexie'

const db = new Dexie('surge-configs')

db.version(1).stores({
  configs: '++id, name, createdAt, updatedAt'
})

export async function listSurgeConfigs() {
  return db.configs.orderBy('updatedAt').reverse().toArray()
}

export async function saveSurgeConfig(name, config) {
  const now = Date.now()
  const id = await db.configs.add({ name, config, createdAt: now, updatedAt: now })
  return id
}

export async function updateSurgeConfig(id, name, config) {
  await db.configs.update(id, { name, config, updatedAt: Date.now() })
}

export async function deleteSurgeConfig(id) {
  await db.configs.delete(id)
}
