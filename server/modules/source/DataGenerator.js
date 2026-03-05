import { Module } from '../base/Module.js'

/**
 * 数据生成器模块
 * 生成指定数量的测试数据
 */
export default class DataGenerator extends Module {
  constructor(config = {}) {
    super({
      type: 'data-generator',
      name: '数据生成器',
      category: 'source',
      description: '生成指定数量的测试数据',
      version: '1.0.0',
      inputs: [],
      outputs: [
        { name: 'output', type: 'array', description: '生成的数据数组' }
      ],
      parameters: [
        {
          name: 'count',
          type: 'number',
          required: true,
          default: 10,
          minimum: 1,
          maximum: 1000,
          description: '生成数据的数量'
        },
        {
          name: 'dataType',
          type: 'string',
          default: 'number',
          enum: ['number', 'string', 'object'],
          description: '数据类型'
        },
        {
          name: 'min',
          type: 'number',
          default: 1,
          description: '最小值（仅数字类型）'
        },
        {
          name: 'max',
          type: 'number',
          default: 100,
          description: '最大值（仅数字类型）'
        }
      ],
      ...config
    })
  }

  async execute(input, context) {
    const { count, dataType, min, max } = this.config

    context.logger?.info(`Generating ${count} items of type ${dataType}`)

    const data = []

    for (let i = 0; i < count; i++) {
      let item

      switch (dataType) {
        case 'number':
          item = Math.floor(Math.random() * (max - min + 1)) + min
          break

        case 'string':
          item = `item_${i + 1}_${Math.random().toString(36).substring(7)}`
          break

        case 'object':
          item = {
            id: i + 1,
            value: Math.floor(Math.random() * (max - min + 1)) + min,
            name: `Item ${i + 1}`,
            timestamp: new Date().toISOString()
          }
          break

        default:
          item = i + 1
      }

      data.push(item)
    }

    context.logger?.info(`Generated ${data.length} items`)

    return {
      output: data,
      metadata: {
        count: data.length,
        dataType,
        generatedAt: new Date().toISOString()
      }
    }
  }
}
