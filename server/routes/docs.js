import express from 'express'
import fsp from 'fs/promises'
import path from 'path'

const router = express.Router()

// 文档所在目录（项目根目录）
const DOCS_DIR = path.resolve(process.cwd())

// 允许的文件
const ALLOWED_FILES = [
  'LEARNING_GUIDE.md',
  'QUICK_REFERENCE.md',
  'README.md'
]

/**
 * 验证文件名，防止目录遍历攻击
 */
function validateFileName(filename) {
  if (!filename || typeof filename !== 'string') {
    return null
  }

  const normalized = path.normalize(filename)
  if (normalized.includes('..') || normalized.startsWith('/')) {
    return null
  }

  if (!ALLOWED_FILES.includes(normalized)) {
    return null
  }

  return normalized
}

/**
 * GET /api/docs/list - 获取所有可用文档
 */
router.get('/list', async (req, res) => {
  try {
    const files = []

    for (const filename of ALLOWED_FILES) {
      const filepath = path.join(DOCS_DIR, filename)
      try {
        const stat = await fsp.stat(filepath)
        if (stat.isFile()) {
          files.push({
            name: filename.replace('.md', ''),
            filename: filename,
            size: stat.size,
            lastModified: stat.mtime.toISOString(),
            displayName: filename === 'LEARNING_GUIDE.md'
              ? '完整学习指南'
              : filename === 'QUICK_REFERENCE.md'
              ? '快速参考卡'
              : 'README'
          })
        }
      } catch (error) {
        // 文件不存在，跳过
      }
    }

    res.json({
      success: true,
      files: files,
      lastSync: new Date().toISOString()
    })
  } catch (error) {
    console.error('获取文档列表失败:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * GET /api/docs/content - 获取文档内容
 */
router.get('/content', async (req, res) => {
  const { file } = req.query

  // 验证文件名
  const validatedFile = validateFileName(file)
  if (!validatedFile) {
    return res.status(400).json({ error: '无效的文件名' })
  }

  try {
    const filepath = path.join(DOCS_DIR, validatedFile)
    const content = await fsp.readFile(filepath, 'utf-8')

    // 获取文件统计信息
    const stat = await fsp.stat(filepath)

    res.json({
      success: true,
      filename: validatedFile,
      content: content,
      size: stat.size,
      lastModified: stat.mtime.toISOString(),
      createdAt: stat.birthtime.toISOString()
    })
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({ error: '文档不存在' })
    }
    console.error('读取文档失败:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * POST /api/docs/sync - 同步文档列表（重新扫描）
 */
router.post('/sync', async (req, res) => {
  try {
    const files = []

    for (const filename of ALLOWED_FILES) {
      const filepath = path.join(DOCS_DIR, filename)
      try {
        const stat = await fsp.stat(filepath)
        if (stat.isFile()) {
          files.push({
            name: filename.replace('.md', ''),
            filename: filename,
            size: stat.size,
            lastModified: stat.mtime.toISOString(),
            displayName: filename === 'LEARNING_GUIDE.md'
              ? '完整学习指南'
              : filename === 'QUICK_REFERENCE.md'
              ? '快速参考卡'
              : 'README'
          })
        }
      } catch (error) {
        // 文件不存在，跳过
      }
    }

    res.json({
      success: true,
      files: files,
      syncedAt: new Date().toISOString(),
      message: `成功同步 ${files.length} 个文档`
    })
  } catch (error) {
    console.error('同步文档失败:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router
