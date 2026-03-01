function asNumber(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

export function buildHistorySnapshot(article, options = {}) {
  const now = Date.now()
  const time = asNumber(options.updatedAt ?? article?.updatedAt, now)
  const fallbackSeq = Math.max(1, asNumber(options.seq ?? article?.versionSeq, 1))
  return {
    id: String(options.id || `ver_${time}_${Math.random().toString(16).slice(2, 6)}`),
    title: String(options.title ?? article?.title ?? ''),
    summary: String(options.summary ?? article?.summary ?? '初始版本'),
    note: String(options.note ?? ''),
    label: String(options.label || `v${fallbackSeq}`),
    action: String(options.action || 'edit'),
    publishedAt: asNumber(options.publishedAt, 0),
    category: String(options.category ?? article?.category ?? '').trim(),
    tags: Array.isArray(options.tags ?? article?.tags)
      ? [...(options.tags ?? article?.tags)].map((t) => String(t).trim()).filter(Boolean).slice(0, 20)
      : [],
    content: String(options.content ?? article?.content ?? ''),
    updatedAt: time
  }
}

export function nextVersionSeq(article) {
  const fromCurrent = Math.max(1, asNumber(article?.versionSeq, 1))
  const fromHistory = Array.isArray(article?.history)
    ? article.history.reduce((max, item) => {
      const match = String(item?.label || '').match(/^v(\d+)$/i)
      return Math.max(max, match ? asNumber(match[1], 0) : 0)
    }, 0)
    : 0
  return Math.max(fromCurrent, fromHistory) + 1
}

export function normalizeHistoryEntries(history, fallbackArticle = {}, fallbackUpdatedAt = Date.now()) {
  const normalized = Array.isArray(history)
    ? history
      .map((ver) => ({
        id: String(ver.id || `ver_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`),
        title: String(ver.title || fallbackArticle.title || ''),
        summary: String(ver.summary || ''),
        note: String(ver.note || ''),
        label: String(ver.label || ''),
        action: String(ver.action || 'edit'),
        publishedAt: asNumber(ver.publishedAt, 0),
        content: String(ver.content || ''),
        category: String(ver.category || '').trim(),
        tags: Array.isArray(ver.tags) ? ver.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 20) : [],
        updatedAt: asNumber(ver.updatedAt, fallbackUpdatedAt)
      }))
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    : []

  if (normalized.length > 0) return normalized

  return [
    buildHistorySnapshot(fallbackArticle, {
      updatedAt: fallbackUpdatedAt,
      label: 'v1',
      note: '初始版本',
      action: 'publish',
      publishedAt: fallbackUpdatedAt
    })
  ]
}

export function normalizeAnnotations(list, fallbackTime = Date.now()) {
  if (!Array.isArray(list)) return []
  return list
    .map((ann) => ({
      id: String(ann.id || `ann_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`),
      quote: String(ann.quote || '').trim(),
      note: String(ann.note || '').trim(),
      color: String(ann.color || 'yellow'),
      status: String(ann.status || 'open') === 'resolved' ? 'resolved' : 'open',
      replies: Array.isArray(ann.replies)
        ? ann.replies
          .map((reply) => ({
            id: String(reply.id || `ann_reply_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`),
            author: String(reply.author || '当前用户').trim() || '当前用户',
            text: String(reply.text || '').trim(),
            createdAt: asNumber(reply.createdAt, fallbackTime)
          }))
          .filter((reply) => reply.text)
          .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
        : [],
      createdAt: asNumber(ann.createdAt, fallbackTime)
    }))
    .filter((ann) => ann.quote)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
}

function escapeRegExp(text) {
  return String(text || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function applyAnnotationsToHtml(html, annotations = []) {
  let output = String(html || '')
  for (const ann of Array.isArray(annotations) ? annotations : []) {
    const quote = String(ann?.quote || '').trim()
    if (!quote) continue
    const pattern = new RegExp(escapeRegExp(quote))
    if (!pattern.test(output)) continue
    output = output.replace(
      pattern,
      `<mark class="text-annotation ann-${String(ann.color || 'yellow')}" data-ann-id="${String(ann.id || '')}">${quote}</mark>`
    )
  }
  return output
}

export function filterHistoryEntries(history, mode = 'all') {
  const list = Array.isArray(history) ? history : []
  if (mode === 'publish') {
    return list.filter((item) => String(item?.action) === 'publish')
  }
  if (mode === 'edit') {
    return list.filter((item) => String(item?.action || 'edit') !== 'publish')
  }
  return list
}
