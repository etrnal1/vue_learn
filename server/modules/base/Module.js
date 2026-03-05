/**
 * 模块基类
 * 所有流水线模块必须继承此类
 */
export class Module {
  constructor(config) {
    this.id = config.id || null
    this.type = config.type
    this.name = config.name
    this.category = config.category || 'transform'
    this.description = config.description || ''
    this.version = config.version || '1.0.0'
    this.author = config.author || 'System'

    // 输入输出定义
    this.inputs = config.inputs || []
    this.outputs = config.outputs || []

    // 参数定义
    this.parameters = config.parameters || []

    // 运行时配置
    this.config = config.config || {}
  }

  /**
   * 初始化模块
   * 在模块首次加载时调用
   */
  async init() {
    // 子类可重写此方法
  }

  /**
   * 验证输入数据
   * @param {*} input - 输入数据
   * @returns {{ valid: boolean, errors: string[] }}
   */
  validate(input) {
    const errors = []

    // 检查必需的输入
    this.inputs.forEach(inputDef => {
      if (inputDef.required && (input === null || input === undefined)) {
        errors.push(`Missing required input: ${inputDef.name}`)
      }
    })

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * 执行模块逻辑
   * 子类必须实现此方法
   * @param {*} input - 输入数据
   * @param {Object} context - 执行上下文
   * @returns {Promise<{ output: *, metadata: Object }>}
   */
  async execute(input, context) {
    throw new Error(`Module ${this.type} must implement execute() method`)
  }

  /**
   * 清理资源
   * 在模块卸载时调用
   */
  async cleanup() {
    // 子类可重写此方法
  }

  /**
   * 获取模块元数据
   */
  getMetadata() {
    return {
      type: this.type,
      name: this.name,
      category: this.category,
      description: this.description,
      version: this.version,
      author: this.author,
      inputs: this.inputs,
      outputs: this.outputs,
      parameters: this.parameters
    }
  }
}

export default Module
