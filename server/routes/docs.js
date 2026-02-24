import express from 'express'
import fsp from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const router = express.Router()

// 获取项目根目录
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PROJECT_ROOT = path.resolve(__dirname, '../../')

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
        docFiles.push({
          name: entry.name,
          filename: entry.name,
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

  // 按名称排序
  docFiles.sort((a, b) => {
    if (a.name.includes('LEARNING')) return -1
    if (b.name.includes('LEARNING')) return 1
    if (a.name.includes('QUICK')) return -1
    if (b.name.includes('QUICK')) return 1
    return a.name.localeCompare(b.name)
  })

  return docFiles
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
    const docFiles = await scanDocsDirectory()

    const summary = {
      total: docFiles.length,
      totalSize: docFiles.reduce((sum, f) => sum + f.size, 0),
      lastUpdated: docFiles.length > 0
        ? new Date(Math.max(...docFiles.map(f => new Date(f.lastModified))))
        : null
    }

    res.json({
      files: docFiles,
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

    res.json({
      filename: file,
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
    const docFiles = await scanDocsDirectory()

    const summary = {
      total: docFiles.length,
      totalSize: docFiles.reduce((sum, f) => sum + f.size, 0),
      lastUpdated: docFiles.length > 0
        ? new Date(Math.max(...docFiles.map(f => new Date(f.lastModified))))
        : null,
      syncTime: new Date().toISOString()
    }

    res.json({
      files: docFiles,
      summary,
      message: `已同步 ${docFiles.length} 个文档`
    })
  } catch (error) {
    console.error('同步文档失败:', error)
    res.status(500).json({ error: '同步文档失败' })
  }
})

export default router
