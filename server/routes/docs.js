import express from 'express'
import fsp from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const router = express.Router()

// 获取项目根目录
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PROJECT_ROOT = path.resolve(__dirname, '../../')
const VERSION_REGEX = /^(.*?)(?:[@._ -]v(\d+(?:\.\d+)*))$/i
const LEARNING_ORDER_HINTS = [
  ['README', 1],
  ['QUICK_START', 2],
  ['STARTUP_GUIDE', 3],
  ['LEARNING_GUIDE', 4],
  ['QUICK_REFERENCE', 5],
  ['DOCUMENTATION_CENTER_SUMMARY', 6],
  ['DOCUMENTATION_CENTER_GUIDE', 7],
  ['RESPONSIVE_DESIGN', 8],
  ['PROJECT_ARCHITECTURE', 9],
  ['AUTO_UPDATE_GUIDE', 10],
  ['MIGRATION_COMPLETE', 11],
  ['MOBILE_TEST_GUIDE', 12],
  ['IOS_TRANSFER_GUIDE', 13]
]

function humanizeName(name) {
  return name
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function parseVersion(versionRaw) {
  if (!versionRaw) return { raw: null, parts: [0], label: 'latest' }
  const parts = String(versionRaw)
    .split('.')
    .map((n) => Number.parseInt(n, 10))
    .filter((n) => Number.isFinite(n))
  return {
    raw: versionRaw,
    parts: parts.length ? parts : [0],
    label: `v${versionRaw}`
  }
}

function compareVersionDesc(a, b) {
  const ap = a.parts || a.versionParts || [0]
  const bp = b.parts || b.versionParts || [0]
  const len = Math.max(ap.length, bp.length)
  for (let i = 0; i < len; i += 1) {
    const av = ap[i] ?? 0
    const bv = bp[i] ?? 0
    if (av !== bv) return bv - av
  }
  return 0
}

function detectLearningRank(baseName) {
  const normalized = String(baseName || '').toUpperCase()
  for (const [hint, rank] of LEARNING_ORDER_HINTS) {
    if (normalized === hint) return rank
  }
  for (const [hint, rank] of LEARNING_ORDER_HINTS) {
    if (normalized.includes(hint)) return rank + 100
  }
  if (normalized.includes('QUICK')) return 50
  if (normalized.includes('GUIDE')) return 80
  return 999
}

function extractDocMeta(entryName) {
  const withoutExt = entryName.replace(/\.md$/i, '')
  const versionMatch = withoutExt.match(VERSION_REGEX)
  const rawBaseName = versionMatch ? versionMatch[1].trim() : withoutExt
  const versionRaw = versionMatch ? versionMatch[2] : null
  const version = parseVersion(versionRaw)
  const learningRank = detectLearningRank(rawBaseName)

  return {
    docId: rawBaseName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
    rawBaseName,
    displayTitle: humanizeName(rawBaseName),
    version,
    learningRank
  }
}

function createSnippet(content, keyword, size = 120) {
  const text = String(content || '').replace(/\s+/g, ' ').trim()
  if (!text) return ''
  const idx = text.toLowerCase().indexOf(keyword.toLowerCase())
  if (idx < 0) return text.slice(0, size)
  const start = Math.max(0, idx - Math.floor(size / 2))
  const end = Math.min(text.length, start + size)
  const prefix = start > 0 ? '...' : ''
  const suffix = end < text.length ? '...' : ''
  return `${prefix}${text.slice(start, end)}${suffix}`
}

// 扫描文档目录
async function scanDocsDirectory() {
  const docFiles = []

  try {
    // 检查根目录的 markdown 文件
    const entries = await fsp.readdir(PROJECT_ROOT, { withFileTypes: true })

    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.md')) {
        const filePath = path.join(PROJECT_ROOT, entry.name)
        const stat = await fsp.stat(filePath)
        const meta = extractDocMeta(entry.name)
        docFiles.push({
          name: entry.name,
          filename: entry.name,
          docId: meta.docId,
          title: meta.displayTitle,
          rawBaseName: meta.rawBaseName,
          version: meta.version.raw,
          versionLabel: meta.version.label,
          versionParts: meta.version.parts,
          learningRank: meta.learningRank,
          size: stat.size,
          sizeKB: Math.round(stat.size / 1024),
          lastModified: stat.mtime.toISOString(),
          extension: '.md'
        })
      }
    }
  } catch (error) {
    console.error('扫描文档目录失败:', error)
    return []
  }

  const grouped = new Map()
  for (const file of docFiles) {
    const existing = grouped.get(file.docId) || {
      docId: file.docId,
      title: file.title,
      learningRank: file.learningRank,
      versions: []
    }
    existing.versions.push(file)
    grouped.set(file.docId, existing)
  }

  const groups = [...grouped.values()]
    .map((group) => {
      const versions = [...group.versions].sort((a, b) => {
        const byVersion = compareVersionDesc(a, b)
        if (byVersion !== 0) return byVersion
        return new Date(b.lastModified) - new Date(a.lastModified)
      })
      const latest = versions[0] || null
      return {
        docId: group.docId,
        title: group.title,
        learningRank: group.learningRank,
        latestVersion: latest?.versionLabel || 'latest',
        latestFilename: latest?.filename || null,
        versions: versions.map((item) => ({
          filename: item.filename,
          version: item.version,
          versionLabel: item.versionLabel,
          lastModified: item.lastModified,
          size: item.size,
          sizeKB: item.sizeKB
        }))
      }
    })
    .sort((a, b) => {
      if (a.learningRank !== b.learningRank) return a.learningRank - b.learningRank
      return a.title.localeCompare(b.title)
    })

  const latestFiles = groups
    .map((group) => {
      const latest = group.versions[0]
      return latest ? { ...latest, docId: group.docId, title: group.title, learningRank: group.learningRank } : null
    })
    .filter(Boolean)

  return {
    files: docFiles,
    groups,
    learningPath: groups.map((g, idx) => ({
      step: idx + 1,
      docId: g.docId,
      title: g.title,
      latestFilename: g.latestFilename,
      latestVersion: g.latestVersion
    })),
    latestFiles
  }
}

// 验证文件名，防止路径遍历
function validateFilename(filename) {
  if (!/^[\w\-_.]+\.md$/.test(filename)) {
    return false
  }

  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return false
  }

  return true
}

// GET /api/docs/list - 获取文档列表
router.get('/list', async (req, res) => {
  try {
    const data = await scanDocsDirectory()
    const docFiles = data.files || []

    const summary = {
      total: docFiles.length,
      totalGroups: (data.groups || []).length,
      totalSize: docFiles.reduce((sum, f) => sum + f.size, 0),
      lastUpdated: docFiles.length > 0
        ? new Date(Math.max(...docFiles.map(f => new Date(f.lastModified))))
        : null
    }

    res.json({
      files: data.latestFiles || [],
      groups: data.groups || [],
      learningPath: data.learningPath || [],
      summary
    })
  } catch (error) {
    console.error('获取文档列表失败:', error)
    res.status(500).json({ error: '获取文档列表失败' })
  }
})

// GET /api/docs/content - 获取文档内容
router.get('/content', async (req, res) => {
  const { file } = req.query

  if (!file) {
    return res.status(400).json({ error: '文件名参数缺失' })
  }

  if (!validateFilename(file)) {
    return res.status(400).json({ error: '无效的文件名' })
  }

  try {
    const filePath = path.join(PROJECT_ROOT, file)

    // 确保文件在项目根目录内
    const resolvedPath = path.resolve(filePath)
    const resolvedRoot = path.resolve(PROJECT_ROOT)

    if (!resolvedPath.startsWith(resolvedRoot)) {
      return res.status(403).json({ error: '无权访问该文件' })
    }

    // 检查文件是否存在
    try {
      await fsp.access(filePath)
    } catch {
      return res.status(404).json({ error: '文件不存在' })
    }

    // 读取文件内容
    const content = await fsp.readFile(filePath, 'utf-8')
    const stat = await fsp.stat(filePath)
    const meta = extractDocMeta(file)

    res.json({
      filename: file,
      docId: meta.docId,
      title: meta.displayTitle,
      version: meta.version.raw,
      versionLabel: meta.version.label,
      content,
      size: stat.size,
      lastModified: stat.mtime.toISOString()
    })
  } catch (error) {
    console.error('读取文档内容失败:', error)
    res.status(500).json({ error: '读取文档内容失败' })
  }
})

// POST /api/docs/sync - 同步文档（重新扫描）
router.post('/sync', async (req, res) => {
  try {
    const data = await scanDocsDirectory()
    const docFiles = data.files || []

    const summary = {
      total: docFiles.length,
      totalGroups: (data.groups || []).length,
      totalSize: docFiles.reduce((sum, f) => sum + f.size, 0),
      lastUpdated: docFiles.length > 0
        ? new Date(Math.max(...docFiles.map(f => new Date(f.lastModified))))
        : null,
      syncTime: new Date().toISOString()
    }

    res.json({
      files: data.latestFiles || [],
      groups: data.groups || [],
      learningPath: data.learningPath || [],
      summary,
      message: `已同步 ${docFiles.length} 个文档`
    })
  } catch (error) {
    console.error('同步文档失败:', error)
    res.status(500).json({ error: '同步文档失败' })
  }
})

// GET /api/docs/search - 文档全文搜索（标题+内容）
router.get('/search', async (req, res) => {
  const q = String(req.query.q || '').trim()
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 30))

  if (!q) {
    return res.json({ query: q, matches: [] })
  }

  try {
    const data = await scanDocsDirectory()
    const docFiles = data.files || []

    const matches = []
    for (const file of docFiles) {
      const filePath = path.join(PROJECT_ROOT, file.filename)
      const content = await fsp.readFile(filePath, 'utf-8').catch(() => '')
      const nameText = `${file.title} ${file.filename}`.toLowerCase()
      const bodyText = content.toLowerCase()
      const needle = q.toLowerCase()

      let score = 0
      const nameIdx = nameText.indexOf(needle)
      const bodyIdx = bodyText.indexOf(needle)
      if (nameIdx >= 0) score += 120 - Math.min(nameIdx, 60)
      if (bodyIdx >= 0) score += 60

      if (score <= 0) continue

      matches.push({
        filename: file.filename,
        docId: file.docId,
        title: file.title,
        version: file.version,
        versionLabel: file.versionLabel,
        learningRank: file.learningRank,
        sizeKB: file.sizeKB,
        lastModified: file.lastModified,
        snippet: createSnippet(content, q),
        score
      })
    }

    matches.sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score
      if (a.learningRank !== b.learningRank) return a.learningRank - b.learningRank
      return a.title.localeCompare(b.title)
    })

    res.json({
      query: q,
      matches: matches.slice(0, limit)
    })
  } catch (error) {
    console.error('搜索文档失败:', error)
    res.status(500).json({ error: '搜索文档失败' })
  }
})

export default router
