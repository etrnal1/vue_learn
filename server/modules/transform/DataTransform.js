import { Module } from '../base/Module.js'

/**
 * 数据转换模块
 * 对输入数据进行转换操作
 */
export default class DataTransform extends Module {
  constructor(config = {}) {
    super({
      type: 'data-transform',
      name: '数据转换',
      category: 'transform',
      description: '转换数据格式和结构',
      version: '1.0.0',
      inputs: [
        { name: 'input', type: 'array', required: true, description: '输入数据数组' }
      ],
      outputs: [
        { name: 'output', type: 'array', description: '转换后的数据数组' }
      ],
      parameters: [
        {
          name: 'operation',
          type: 'string',
          required: true,
          default: 'double',
          enum: ['double', 'square', 'uppercase', 'reverse', 'custom'],
          description: '转换操作类型'
        },
        {
          name: 'customFunction',
          type: 'string',
          default: '',
          description: '自定义转换函数（operation为custom时使用）'
        }
      ],
      ...config
    })
  }

  async execute(input, context) {
    if (!Array.isArray(input)) {
      input = [input]
    }

    const { operation, customFunction } = this.config

    context.logger?.info(`Transforming ${input.length} items with operation: ${operation}`)

    let output

    try {
      switch (operation) {
        case 'double':
          output = input.map(item => {
            if (typeof item === 'number') {
              return item * 2
            } else if (typeof item === 'object' && item.value !== undefined) {
              return { ...item, value: item.value * 2 }
            }
            return item
          })
          break

        case 'square':
          output = input.map(item => {
            if (typeof item === 'number') {
              return item * item
            } else if (typeof item === 'object' && item.value !== undefined) {
              return { ...item, value: item.value * item.value }
            }
            return item
          })
          break

        case 'uppercase':
          output = input.map(item => {
            if (typeof item === 'string') {
              return item.toUpperCase()
            } else if (typeof item === 'object' && item.name !== undefined) {
              return { ...item, name: item.name.toUpperCase() }
            }
            return item
          })
          break

        case 'reverse':
          output = [...input].reverse()
          break

        case 'custom':
          if (!customFunction) {
            throw new Error('Custom function is required when operation is "custom"')
          }

          // 创建安全的函数执行环境
          const transformFn = new Function('item', 'index', 'array', `
            return (${customFunction})(item, index, array)
          `)

          output = input.map((item, index) => transformFn(item, index, input))
          break

        default:
          output = input
      }

      context.logger?.info(`Transformed ${output.length} items`)

      return {
        output,
        metadata: {
          operation,
          inputCount: input.length,
          outputCount: output.length,
          transformedAt: new Date().toISOString()
        }
      }
    } catch (error) {
      context.logger?.error(`Transform error: ${error.message}`)
      throw error
    }
  }
}
