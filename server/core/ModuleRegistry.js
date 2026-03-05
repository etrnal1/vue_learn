/**
 * 模块注册表
 * 负责模块的注册、加载和管理
 */
export class ModuleRegistry {
  constructor() {
    // 注册的模块信息 Map<type, moduleInfo>
    this.modules = new Map()

    // 已加载的模块实例 Map<type, moduleInstance>
    this.loadedModules = new Map()
  }

  /**
   * 注册模块
   * @param {string} type - 模块类型标识
   * @param {string} modulePath - 模块文件路径
   * @param {Object} metadata - 模块元数据
   */
  register(type, modulePath, metadata = {}) {
    this.modules.set(type, {
      type,
      path: modulePath,
      metadata: {
        name: metadata.name || type,
        category: metadata.category || 'transform',
        description: metadata.description || '',
        version: metadata.version || '1.0.0',
        author: metadata.author || 'System',
        icon: metadata.icon || '📦',
        ...metadata
      },
      loaded: false
    })

    console.log(`[ModuleRegistry] Registered module: ${type}`)
  }

  /**
   * 动态加载模块
   * @param {string} type - 模块类型
   * @param {Object} config - 模块配置
   * @returns {Promise<Module>} 模块实例
   */
  async load(type, config = {}) {
    // 如果已加载，返回缓存的实例
    if (this.loadedModules.has(type)) {
      const CachedModule = this.loadedModules.get(type)
      return new CachedModule(config)
    }

    // 获取模块信息
    const moduleInfo = this.modules.get(type)
    if (!moduleInfo) {
      throw new Error(`Module type '${type}' not registered`)
    }

    try {
      // 动态导入模块
      const moduleExport = await import(moduleInfo.path)
      const ModuleClass = moduleExport.default || moduleExport[type]

      if (!ModuleClass) {
        throw new Error(`Module '${type}' does not export a valid class`)
      }

      // 缓存模块类
      this.loadedModules.set(type, ModuleClass)

      // 更新加载状态
      moduleInfo.loaded = true

      console.log(`[ModuleRegistry] Loaded module: ${type}`)

      // 返回新实例
      return new ModuleClass(config)
    } catch (error) {
      console.error(`[ModuleRegistry] Failed to load module '${type}':`, error)
      throw new Error(`Failed to load module '${type}': ${error.message}`)
    }
  }

  /**
   * 批量注册模块
   * @param {Array} moduleList - 模块列表
   */
  registerBatch(moduleList) {
    moduleList.forEach(({ type, path, metadata }) => {
      this.register(type, path, metadata)
    })
  }

  /**
   * 获取所有已注册的模块
   * @returns {Array} 模块列表
   */
  listModules() {
    return Array.from(this.modules.entries()).map(([type, info]) => ({
      type,
      ...info.metadata,
      loaded: info.loaded
    }))
  }

  /**
   * 按类别获取模块
   * @param {string} category - 类别名称
   * @returns {Array} 模块列表
   */
  getModulesByCategory(category) {
    return this.listModules().filter(m => m.category === category)
  }

  /**
   * 获取模块详情
   * @param {string} type - 模块类型
   * @returns {Object|null} 模块信息
   */
  getModule(type) {
    const moduleInfo = this.modules.get(type)
    if (!moduleInfo) return null

    return {
      type,
      ...moduleInfo.metadata,
      loaded: moduleInfo.loaded
    }
  }

  /**
   * 卸载模块
   * @param {string} type - 模块类型
   */
  unload(type) {
    this.loadedModules.delete(type)

    const moduleInfo = this.modules.get(type)
    if (moduleInfo) {
      moduleInfo.loaded = false
    }

    console.log(`[ModuleRegistry] Unloaded module: ${type}`)
  }

  /**
   * 检查模块是否已注册
   * @param {string} type - 模块类型
   * @returns {boolean}
   */
  has(type) {
    return this.modules.has(type)
  }

  /**
   * 清空注册表
   */
  clear() {
    this.modules.clear()
    this.loadedModules.clear()
    console.log('[ModuleRegistry] Registry cleared')
  }
}

export default ModuleRegistry
