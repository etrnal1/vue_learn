import { knowledgeBaseDb, getKnowledgeMeta, setKnowledgeMeta } from './knowledgeBaseDb.js'

// AI 语义搜索：支持两种 embedding 来源
//   - local: 浏览器本地跑一个轻量模型（@huggingface/transformers + ONNX Runtime Web），
//            完全离线、不发送任何数据出设备，但首次使用需要联网下载模型（几十 MB，之后浏览器会缓存）
//   - cloud: 调用一个 OpenAI 兼容的 /embeddings 接口（OpenAI 官方、Azure OpenAI、或任何
//            兼容 OpenAI embeddings 请求格式的第三方服务），效果通常更好，但会把文档内容发到外部服务器

const CONFIG_KEY = 'aiSearchConfig'

const DEFAULT_CONFIG = {
  provider: 'local', // 'local' | 'cloud'
  localModel: 'Xenova/all-MiniLM-L6-v2',
  cloud: { baseUrl: '', apiKey: '', model: 'text-embedding-3-small' }
}

export async function getEmbedConfig() {
  const saved = await getKnowledgeMeta(CONFIG_KEY)
  return {
    ...DEFAULT_CONFIG,
    ...(saved || {}),
    cloud: { ...DEFAULT_CONFIG.cloud, ...((saved && saved.cloud) || {}) }
  }
}

export async function setEmbedConfig(config) {
  await setKnowledgeMeta(CONFIG_KEY, config)
}

// ============ 本地模型（transformers.js，浏览器里跑 ONNX） ============

let _localPipelinePromise = null
let _localPipelineModel = null

async function getLocalPipeline(model, onProgress) {
  if (_localPipelinePromise && _localPipelineModel === model) return _localPipelinePromise
  _localPipelineModel = model
  _localPipelinePromise = (async () => {
    const { pipeline } = await import('@huggingface/transformers')
    return pipeline('feature-extraction', model, onProgress ? { progress_callback: onProgress } : undefined)
  })()
  return _localPipelinePromise
}

// 显式触发（下载并）加载本地模型，供 UI 主动"检测/下载模型"按钮调用，
// 这样用户能看到下载进度，而不是等到搜索/建索引时才第一次悄悄触发下载。
export async function preloadLocalModel(model, onProgress) {
  return getLocalPipeline(model, onProgress)
}

// 是否已经在这次页面会话里成功加载过本地模型（用于 UI 状态展示，注意：刷新页面后会重置，
// 但如果浏览器已经缓存过模型文件，重新加载通常会很快，不需要重新下载）
export function isLocalModelLoaded(model) {
  return !!(_localPipelinePromise && _localPipelineModel === model)
}

export async function embedTextsLocal(texts, model = DEFAULT_CONFIG.localModel) {
  const extractor = await getLocalPipeline(model)
  const vectors = []
  for (const text of texts) {
    const output = await extractor(text, { pooling: 'mean', normalize: true })
    vectors.push(Array.from(output.data))
  }
  return vectors
}

// ============ 云端 API（OpenAI 兼容 /embeddings 接口） ============

export async function embedTextsCloud(texts, cloudConfig) {
  const { baseUrl, apiKey, model } = cloudConfig || {}
  if (!baseUrl || !apiKey) {
    throw new Error('请先在"AI 搜索"设置里填写云端 API 的 Base URL 和 API Key')
  }
  const url = baseUrl.replace(/\/+$/, '') + '/embeddings'
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({ model, input: texts })
  })
  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`云端 embedding 接口报错 (${res.status})：${errText.slice(0, 200)}`)
  }
  const data = await res.json()
  const items = Array.isArray(data?.data) ? data.data : []
  return items
    .slice()
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    .map((item) => item.embedding)
}

export async function embedTexts(texts) {
  const config = await getEmbedConfig()
  if (config.provider === 'cloud') return embedTextsCloud(texts, config.cloud)
  return embedTextsLocal(texts, config.localModel)
}

// ============ 文本分段（按段落切，太长的段落再硬切） ============

export function chunkText(text, maxLen = 400) {
  const clean = String(text || '').trim()
  if (!clean) return []
  const paras = clean.split(/\n{1,}/).map((p) => p.trim()).filter(Boolean)
  const chunks = []
  let buffer = ''
  const flush = () => {
    if (buffer) { chunks.push(buffer); buffer = '' }
  }
  for (const para of paras) {
    const candidate = buffer ? buffer + '\n' + para : para
    if (candidate.length <= maxLen) {
      buffer = candidate
      continue
    }
    flush()
    if (para.length <= maxLen) {
      buffer = para
    } else {
      for (let i = 0; i < para.length; i += maxLen) {
        chunks.push(para.slice(i, i + maxLen))
      }
    }
  }
  flush()
  return chunks
}

// ============ cosine 相似度 ============

export function cosineSimilarity(a, b) {
  const len = Math.min(a.length, b.length)
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  if (!normA || !normB) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

// ============ 索引管理（文档） ============

export async function removeDocIndex(docId) {
  await knowledgeBaseDb.docEmbeddings.where('docId').equals(docId).delete()
}

export async function buildDocIndex(doc) {
  await removeDocIndex(doc.id)
  const chunks = chunkText(doc.contentText || '')
  if (!chunks.length) return 0
  const config = await getEmbedConfig()
  const vectors = await embedTexts(chunks)
  const now = Date.now()
  const rows = chunks.map((chunk, i) => ({
    docId: doc.id,
    docName: doc.name,
    chunkIndex: i,
    chunkText: chunk,
    vector: vectors[i],
    provider: config.provider,
    createdAt: now
  }))
  await knowledgeBaseDb.docEmbeddings.bulkAdd(rows)
  return chunks.length
}

// 给一批文档重建索引，onProgress(doneCount, total, currentDocName) 用来展示进度
export async function buildAllIndex(docs, onProgress) {
  let done = 0
  for (const doc of docs) {
    try {
      await buildDocIndex(doc)
    } catch (err) {
      console.error('[semanticSearch] 索引文档失败:', doc.name, err)
      throw err
    } finally {
      done++
      if (onProgress) onProgress(done, docs.length, doc.name)
    }
  }
}

// ============ 索引管理（笔记，结构与文档一致） ============

export async function removeNoteIndex(noteId) {
  await knowledgeBaseDb.noteEmbeddings.where('noteId').equals(noteId).delete()
}

export async function buildNoteIndex(note) {
  await removeNoteIndex(note.id)
  const chunks = chunkText(note.content || '')
  if (!chunks.length) return 0
  const config = await getEmbedConfig()
  const vectors = await embedTexts(chunks)
  const now = Date.now()
  const rows = chunks.map((chunk, i) => ({
    noteId: note.id,
    noteTitle: note.title,
    chunkIndex: i,
    chunkText: chunk,
    vector: vectors[i],
    provider: config.provider,
    createdAt: now
  }))
  await knowledgeBaseDb.noteEmbeddings.bulkAdd(rows)
  return chunks.length
}

// 给一批笔记重建索引，onProgress(doneCount, total, currentNoteTitle) 用来展示进度
export async function buildAllNoteIndex(notes, onProgress) {
  let done = 0
  for (const note of notes) {
    try {
      await buildNoteIndex(note)
    } catch (err) {
      console.error('[semanticSearch] 索引笔记失败:', note.title, err)
      throw err
    } finally {
      done++
      if (onProgress) onProgress(done, notes.length, note.title)
    }
  }
}

// ============ 索引统计 / 清空（文档 + 笔记） ============

export async function clearAllIndex() {
  await knowledgeBaseDb.docEmbeddings.clear()
  await knowledgeBaseDb.noteEmbeddings.clear()
}

export async function getIndexStats() {
  const docRows = await knowledgeBaseDb.docEmbeddings.toArray()
  const noteRows = await knowledgeBaseDb.noteEmbeddings.toArray()
  const docIds = new Set(docRows.map((r) => r.docId))
  const noteIds = new Set(noteRows.map((r) => r.noteId))
  return {
    docs: docIds.size,
    chunks: docRows.length,
    notes: noteIds.size,
    noteChunks: noteRows.length
  }
}

// ============ 语义搜索（文档 + 笔记 混合排序） ============

export async function semanticSearch(query, topK = 10) {
  const trimmed = String(query || '').trim()
  if (!trimmed) return []
  const [queryVector] = await embedTexts([trimmed])
  const [docRows, noteRows] = await Promise.all([
    knowledgeBaseDb.docEmbeddings.toArray(),
    knowledgeBaseDb.noteEmbeddings.toArray()
  ])
  if (!docRows.length && !noteRows.length) return []
  const scored = [
    ...docRows.map((row) => ({ ...row, kind: 'doc', score: cosineSimilarity(queryVector, row.vector) })),
    ...noteRows.map((row) => ({ ...row, kind: 'note', score: cosineSimilarity(queryVector, row.vector) }))
  ]
  scored.sort((a, b) => b.score - a.score)
  // 同一篇文档/笔记只保留分数最高的一段，避免长内容霸占结果列表
  const seen = new Set()
  const results = []
  for (const item of scored) {
    const key = item.kind + ':' + (item.kind === 'doc' ? item.docId : item.noteId)
    if (seen.has(key)) continue
    seen.add(key)
    results.push(item)
    if (results.length >= topK) break
  }
  return results
}
