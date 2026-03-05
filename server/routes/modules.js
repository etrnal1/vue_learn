import express from 'express'
import { ModuleRegistry } from '../core/ModuleRegistry.js'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = express.Router()

// 创建模块注册表实例
const registry = new ModuleRegistry()

// 注册内置模块
function registerBuiltinModules() {
  const modulesBasePath = path.join(__dirname, '../modules')

  // Source 模块
  registry.register(
    'data-generator',
    path.join(modulesBasePath, 'source/DataGenerator.js'),
    {
      name: '数据生成器',
      category: 'source',
      description: '生成测试数据',
      version: '1.0.0',
      icon: '📊'
    }
  )

  // Transform 模块
  registry.register(
    'data-transform',
    path.join(modulesBasePath, 'transform/DataTransform.js'),
    {
      name: '数据转换',
      category: 'transform',
      description: '转换数据格式',
      version: '1.0.0',
      icon: '🔄'
    }
  )

  // Filter 模块
  registry.register(
    'condition-filter',
    path.join(modulesBasePath, 'filter/ConditionFilter.js'),
    {
      name: '条件过滤',
      category: 'filter',
      description: '根据条件过滤数据',
      version: '1.0.0',
      icon: '🔍'
    }
  )

  // Sink 模块
  registry.register(
    'console-output',
    path.join(modulesBasePath, 'sink/ConsoleOutput.js'),
    {
      name: '控制台输出',
      category: 'sink',
      description: '输出到控制台',
      version: '1.0.0',
      icon: '📝'
    }
  )

  console.log('[Modules] Builtin modules registered')
}

// 初始化
registerBuiltinModules()

/**
 * 获取模块列表
 * GET /api/modules
 */
router.get('/api/modules', (req, res) => {
  try {
    const { category, page = 1, limit = 50 } = req.query

    let modules = registry.listModules()

    // 按类别过滤
    if (category) {
      modules = modules.filter(m => m.category === category)
    }

    // 分页
    const start = (page - 1) * limit
    const end = start + parseInt(limit)
    const paginated = modules.slice(start, end)

    res.json({
      data: paginated,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: modules.length,
        pages: Math.ceil(modules.length / limit)
      }
    })
  } catch (error) {
    console.error('[Modules] List error:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * 获取模块详情
 * GET /api/modules/:type
 */
router.get('/api/modules/:type', async (req, res) => {
  try {
    const module = registry.getModule(req.params.type)

    if (!module) {
      return res.status(404).json({ error: 'Module not found' })
    }

    // 尝试加载模块以获取完整的参数信息
    try {
      const instance = await registry.load(req.params.type)
      const metadata = instance.getMetadata()

      res.json({
        ...module,
        config: {
          inputs: metadata.inputs,
          outputs: metadata.outputs,
          parameters: metadata.parameters
        }
      })
    } catch (error) {
      // 如果加载失败，返回基本信息
      res.json(module)
    }
  } catch (error) {
    console.error('[Modules] Get error:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * 按类别获取模块
 * GET /api/modules/category/:category
 */
router.get('/api/modules/category/:category', (req, res) => {
  try {
    const modules = registry.getModulesByCategory(req.params.category)

    res.json({
      category: req.params.category,
      modules
    })
  } catch (error) {
    console.error('[Modules] Get by category error:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * 获取模块类别列表
 * GET /api/modules/categories
 */
router.get('/api/modules/categories', (req, res) => {
  try {
    const modules = registry.listModules()
    const categories = {}

    modules.forEach(module => {
      if (!categories[module.category]) {
        categories[module.category] = {
          name: getCategoryName(module.category),
          count: 0,
          modules: []
        }
      }

      categories[module.category].count++
      categories[module.category].modules.push({
        type: module.type,
        name: module.name,
        icon: module.icon
      })
    })

    res.json({
      categories: Object.entries(categories).map(([id, data]) => ({
        id,
        ...data
      }))
    })
  } catch (error) {
    console.error('[Modules] Categories error:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * 获取类别名称
 */
function getCategoryName(category) {
  const names = {
    source: '数据源',
    transform: '转换',
    filter: '过滤',
    sink: '数据汇',
    control: '控制',
    utility: '工具'
  }
  return names[category] || category
}

// 导出注册表供其他模块使用
export { registry }
export default router
