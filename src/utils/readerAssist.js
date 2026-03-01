const BLOCK_SELECTOR = 'p, li, blockquote, h1, h2, h3, h4, h5, h6, td, th'

function safeCssEscape(value) {
  const text = String(value || '')
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(text)
  }
  return text.replace(/"/g, '\\"')
}

export function flashElement(element, className, duration = 1000) {
  if (!element || !className) return
  element.classList.add(className)
  window.setTimeout(() => {
    element.classList.remove(className)
  }, Math.max(120, Number(duration) || 1000))
}

export function findReaderRoot(scopeEl, selector = '.read-main .markdown') {
  return scopeEl?.querySelector?.(selector) || null
}

export function buildInPageMatches(root, query, options = {}) {
  const q = String(query || '').trim().toLowerCase()
  if (!root || !q) return []

  const limit = Math.max(1, Number(options.limit) || 120)
  const previewBefore = Math.max(0, Number(options.previewBefore) || 14)
  const previewAfter = Math.max(0, Number(options.previewAfter) || 18)

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const nodes = []
  let fullText = ''
  let node = walker.nextNode()

  while (node) {
    const text = String(node.nodeValue || '')
    if (text.trim()) {
      nodes.push({ node, start: fullText.length, text })
      fullText += text
    }
    node = walker.nextNode()
  }

  if (!fullText) return []

  const lower = fullText.toLowerCase()
  let cursor = 0
  const output = []

  while (output.length < limit) {
    const idx = lower.indexOf(q, cursor)
    if (idx === -1) break
    cursor = idx + q.length

    const host = nodes.find((item) => idx >= item.start && idx < item.start + item.text.length)
    const block = host?.node?.parentElement?.closest(BLOCK_SELECTOR)
    const blockId = block ? (block.dataset.blockAnchor || `blk_${idx}_${output.length}`) : ''
    if (block && !block.dataset.blockAnchor) {
      block.dataset.blockAnchor = blockId
    }

    const left = Math.max(0, idx - previewBefore)
    const right = Math.min(fullText.length, idx + q.length + previewAfter)
    const preview = fullText.slice(left, right).replace(/\s+/g, ' ').trim()

    output.push({
      id: `hit_${idx}_${output.length}`,
      blockId,
      preview
    })
  }

  return output
}

export function jumpToInPageMatch(root, match, options = {}) {
  if (!root || !match?.blockId) return false
  const behavior = options.behavior || 'smooth'
  const block = options.block || 'center'
  const focusClass = options.focusClass || 'inpage-match-focus'
  const focusDuration = Number(options.focusDuration) || 1000
  const escapedId = safeCssEscape(match.blockId)
  const target = root.querySelector(`[data-block-anchor="${escapedId}"]`)
  if (!target) return false
  target.scrollIntoView({ behavior, block })
  flashElement(target, focusClass, focusDuration)
  return true
}

export function jumpReaderToTop(root, options = {}) {
  if (!root) return false
  root.scrollIntoView({
    behavior: options.behavior || 'smooth',
    block: options.block || 'start'
  })
  return true
}

export function jumpReaderToBottom(root, options = {}) {
  if (!root) return false
  const anchor = root.lastElementChild || root
  anchor.scrollIntoView({
    behavior: options.behavior || 'smooth',
    block: options.block || 'end'
  })
  return true
}

export function locateListItemById(listRoot, id, options = {}) {
  if (!listRoot || !id) return false
  const dataAttr = String(options.dataAttr || 'data-article-id')
  const highlightClass = String(options.highlightClass || 'located')
  const highlightDuration = Number(options.highlightDuration) || 1200
  const escaped = safeCssEscape(id)
  const item = listRoot.querySelector(`[${dataAttr}="${escaped}"]`)
  if (!item) return false
  item.scrollIntoView({
    behavior: options.behavior || 'smooth',
    block: options.block || 'center'
  })
  flashElement(item, highlightClass, highlightDuration)
  return true
}
