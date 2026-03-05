import { Module } from '../base/Module.js'

/**
 * 控制台输出模块
 * 将数据输出到控制台
 */
export default class ConsoleOutput extends Module {
  constructor(config = {}) {
    super({
      type: 'console-output',
      name: '控制台输出',
      category: 'sink',
      description: '输出数据到控制台',
      version: '1.0.0',
      inputs: [
        { name: 'input', type: 'any', required: true, description: '要输出的数据' }
      ],
      outputs: [],
      parameters: [
        {
          name: 'format',
          type: 'string',
          default: 'json',
          enum: ['json', 'table', 'simple'],
          description: '输出格式'
        },
        {
          name: 'indent',
          type: 'number',
          default: 2,
          minimum: 0,
          maximum: 8,
          description: 'JSON缩进空格数'
        },
        {
          name: 'maxItems',
          type: 'number',
          default: 100,
          minimum: 1,
          maximum: 1000,
          description: '最大输出项数'
        },
        {
          name: 'showMetadata',
          type: 'boolean',
          default: true,
          description: '显示元数据'
        }
      ],
      ...config
    })
  }

  async execute(input, context) {
    const { format, indent, maxItems, showMetadata } = this.config

    context.logger?.info(`Outputting data in ${format} format`)

    try {
      // 限制输出项数
      let outputData = input
      let truncated = false

      if (Array.isArray(input) && input.length > maxItems) {
        outputData = input.slice(0, maxItems)
        truncated = true
      }

      // 输出到控制台
      console.log('\n' + '='.repeat(60))
      console.log(`[ConsoleOutput] Execution ${context.executionId}`)
      console.log('='.repeat(60))

      switch (format) {
        case 'json':
          console.log(JSON.stringify(outputData, null, indent))
          break

        case 'table':
          if (Array.isArray(outputData) && outputData.length > 0) {
            // 检查是否为对象数组
            if (typeof outputData[0] === 'object') {
              console.table(outputData)
            } else {
              console.table(outputData.map((item, index) => ({ index, value: item })))
            }
          } else {
            console.log(outputData)
          }
          break

        case 'simple':
          if (Array.isArray(outputData)) {
            outputData.forEach((item, index) => {
              console.log(`[${index}]`, item)
            })
          } else {
            console.log(outputData)
          }
          break

        default:
          console.log(outputData)
      }

      if (truncated) {
        console.log(`\n... and ${input.length - maxItems} more items (truncated)`)
      }

      if (showMetadata) {
        console.log('\nMetadata:')
        console.log({
          itemCount: Array.isArray(input) ? input.length : 1,
          dataType: Array.isArray(input) ? 'array' : typeof input,
          outputAt: new Date().toISOString()
        })
      }

      console.log('='.repeat(60) + '\n')

      context.logger?.info('Data output completed')

      return {
        output: null,
        metadata: {
          itemCount: Array.isArray(input) ? input.length : 1,
          format,
          truncated,
          outputAt: new Date().toISOString()
        }
      }
    } catch (error) {
      context.logger?.error(`Output error: ${error.message}`)
      throw error
    }
  }
}
