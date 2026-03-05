import { Module } from '../base/Module.js'

/**
 * 条件过滤模块
 * 根据指定条件过滤数据
 */
export default class ConditionFilter extends Module {
  constructor(config = {}) {
    super({
      type: 'condition-filter',
      name: '条件过滤',
      category: 'filter',
      description: '根据条件过滤数据',
      version: '1.0.0',
      inputs: [
        { name: 'input', type: 'array', required: true, description: '输入数据数组' }
      ],
      outputs: [
        { name: 'matched', type: 'array', description: '匹配的数据' },
        { name: 'unmatched', type: 'array', description: '未匹配的数据' }
      ],
      parameters: [
        {
          name: 'condition',
          type: 'string',
          required: true,
          default: 'item > 50',
          description: '过滤条件表达式'
        },
        {
          name: 'mode',
          type: 'string',
          default: 'filter',
          enum: ['filter', 'split'],
          description: '过滤模式：filter只返回匹配项，split返回匹配和未匹配'
        }
      ],
      ...config
    })
  }

  async execute(input, context) {
    if (!Array.isArray(input)) {
      input = [input]
    }

    const { condition, mode } = this.config

    context.logger?.info(`Filtering ${input.length} items with condition: ${condition}`)

    const matched = []
    const unmatched = []

    try {
      // 编译条件函数
      const conditionFn = this.compileCondition(condition)

      // 过滤数据
      for (let i = 0; i < input.length; i++) {
        const item = input[i]

        try {
          const result = conditionFn(item, i, input)

          if (result) {
            matched.push(item)
          } else {
            unmatched.push(item)
          }
        } catch (error) {
          context.logger?.warn(`Condition evaluation error for item ${i}: ${error.message}`)
          unmatched.push(item)
        }
      }

      context.logger?.info(`Filtered: ${matched.length} matched, ${unmatched.length} unmatched`)

      if (mode === 'filter') {
        // 只返回匹配的数据
        return {
          output: matched,
          metadata: {
            matchedCount: matched.length,
            unmatchedCount: unmatched.length,
            totalCount: input.length,
            condition
          }
        }
      } else {
        // 返回两路输出
        return {
          output: {
            matched,
            unmatched
          },
          metadata: {
            matchedCount: matched.length,
            unmatchedCount: unmatched.length,
            totalCount: input.length,
            condition
          }
        }
      }
    } catch (error) {
      context.logger?.error(`Filter error: ${error.message}`)
      throw error
    }
  }

  /**
   * 编译条件表达式为函数
   */
  compileCondition(condition) {
    // 创建安全的函数执行环境
    // 允许使用 item, index, array 变量
    try {
      return new Function('item', 'index', 'array', `
        // 为对象类型提供属性访问
        if (typeof item === 'object' && item !== null) {
          const { id, value, name } = item
          return (${condition})
        }
        // 为基本类型直接使用 item
        return (${condition})
      `)
    } catch (error) {
      throw new Error(`Invalid condition expression: ${error.message}`)
    }
  }
}
