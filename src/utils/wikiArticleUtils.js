function asNumber(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function escapeHtml(input) {
  return String(input || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
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
    .map((ann) => {
      const rawQuote = String(ann.quote || '').trim()
      const migratedQuote = rawQuote.length > 18 ? rawQuote.replace(/\.{3,}\s*$/, '') : rawQuote
      return ({
      id: String(ann.id || `ann_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`),
      quote: migratedQuote,
      note: String(ann.note || '').trim(),
      color: String(ann.color || 'yellow'),
      status: String(ann.status || 'open') === 'resolved' ? 'resolved' : 'open',
      anchor: ann?.anchor && typeof ann.anchor === 'object'
        ? {
          blockExcerpt: String(ann.anchor.blockExcerpt || '').trim().slice(0, 120),
          blockTag: String(ann.anchor.blockTag || '').trim().toLowerCase()
        }
        : null,
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
    })})
    .filter((ann) => ann.quote)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
}

function escapeRegExp(text) {
  return String(text || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildFlexibleWhitespacePattern(text) {
  const tokens = String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (!tokens.length) return null
  const body = tokens.map((token) => escapeRegExp(token)).join('\\s+')
  return new RegExp(body, 'i')
}

function buildQuoteVariants(quote) {
  const normalized = String(quote || '').replace(/\s+/g, ' ').trim()
  if (!normalized) return []
  const variants = [normalized]
  if (normalized.length > 160) variants.push(normalized.slice(0, 160).trim())
  if (normalized.length > 96) variants.push(normalized.slice(0, 96).trim())
  if (normalized.length > 48) variants.push(normalized.slice(0, 48).trim())
  return Array.from(new Set(variants.filter(Boolean)))
}

function normalizeLooseText(text) {
  return String(text || '').replace(/\s+/g, ' ').trim().toLowerCase()
}

const BLOCK_SELECTOR = 'p, li, blockquote, h1, h2, h3, h4, h5, h6, td, th'

function tryWrapByQuoteInRoot(root, ann) {
  const quote = String(ann?.quote || '').trim()
  if (!quote || !root) return false
  const variants = buildQuoteVariants(quote)
  if (!variants.length) return false

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let node = walker.nextNode()
  while (node) {
    const raw = String(node.nodeValue || '')
    if (!raw.trim()) {
      node = walker.nextNode()
      continue
    }
    for (const variant of variants) {
      const directIdx = raw.toLowerCase().indexOf(variant.toLowerCase())
      let start = directIdx
      let matchText = directIdx >= 0 ? raw.slice(directIdx, directIdx + variant.length) : ''
      if (start < 0) {
        const flex = buildFlexibleWhitespacePattern(variant)
        const m = flex ? raw.match(flex) : null
        if (m && typeof m.index === 'number') {
          start = m.index
          matchText = m[0]
        }
      }
      if (start < 0 || !matchText) continue

      const end = start + matchText.length
      const before = raw.slice(0, start)
      const after = raw.slice(end)

      const wrap = document.createElement('span')
      wrap.className = 'ann-inline-wrap'

      const mark = document.createElement('mark')
      mark.className = `text-annotation ann-${String(ann.color || 'yellow')}`
      mark.dataset.annId = String(ann.id || '')
      mark.textContent = matchText

      const note = document.createElement('span')
      const noteText = String(ann.note || '').trim()
      note.className = `ann-inline-note${noteText ? '' : ' is-empty'}`
      note.textContent = noteText ? '注' : '亮'
      if (noteText) note.title = noteText

      wrap.appendChild(mark)
      wrap.appendChild(note)

      const frag = document.createDocumentFragment()
      if (before) frag.appendChild(document.createTextNode(before))
      frag.appendChild(wrap)
      if (after) frag.appendChild(document.createTextNode(after))
      node.parentNode?.replaceChild(frag, node)
      return true
    }
    node = walker.nextNode()
  }
  return false
}

function findAnchorBlock(host, ann) {
  const excerpt = normalizeLooseText(ann?.anchor?.blockExcerpt || '')
  if (!excerpt) return null
  const tag = String(ann?.anchor?.blockTag || '').trim().toLowerCase()
  const blocks = Array.from(host.querySelectorAll(BLOCK_SELECTOR))
  if (!blocks.length) return null
  const list = tag ? blocks.filter((el) => el.tagName.toLowerCase() === tag) : blocks
  for (const block of list) {
    const text = normalizeLooseText(block.textContent || '')
    if (text && text.includes(excerpt)) return block
  }
  return null
}

export function applyAnnotationsToHtml(html, annotations = []) {
  const source = String(html || '')
  const list = Array.isArray(annotations) ? annotations : []
  if (!source || list.length === 0) return source
  if (typeof document === 'undefined') return source

  const host = document.createElement('div')
  host.innerHTML = source

  for (const ann of list) {
    const anchorBlock = findAnchorBlock(host, ann)
    if (anchorBlock && tryWrapByQuoteInRoot(anchorBlock, ann)) {
      continue
    }
    tryWrapByQuoteInRoot(host, ann)
  }

  return host.innerHTML
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
