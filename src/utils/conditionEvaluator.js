/**
 * 条件表达式求值引擎
 * 支持简单的条件表达式解析和运行时求值
 */

/**
 * 简单条件对象结构
 * @typedef {Object} SimpleCondition
 * @property {string} field - 字段名
 * @property {string} operator - 操作符 (>, <, ==, !=, >=, <=, includes, startsWith, endsWith)
 * @property {any} value - 比较值
 */

/**
 * 复合条件对象结构
 * @typedef {Object} ComplexCondition
 * @property {string} type - 'and' 或 'or'
 * @property {Array<SimpleCondition|ComplexCondition>} conditions - 子条件数组
 */

/**
 * 安全的操作符集合
 */
const SAFE_OPERATORS = {
  '>': (a, b) => a > b,
  '<': (a, b) => a < b,
  '==': (a, b) => a == b,
  '!=': (a, b) => a != b,
  '>=': (a, b) => a >= b,
  '<=': (a, b) => a <= b,
  'includes': (a, b) => String(a).includes(String(b)),
  'startsWith': (a, b) => String(a).startsWith(String(b)),
  'endsWith': (a, b) => String(a).endsWith(String(b)),
  'isEmpty': (a) => !a || String(a).trim() === '',
  'isNotEmpty': (a) => a && String(a).trim() !== ''
}

/**
 * 评估简单条件
 * @param {SimpleCondition} condition - 条件对象
 * @param {Object} context - 上下文数据
 * @returns {boolean} 条件是否满足
 */
export function evaluateSimpleCondition(condition, context = {}) {
  if (!condition || !condition.field || !condition.operator) {
    return false
  }

  const { field, operator, value } = condition
  const fieldValue = getNestedValue(context, field)

  if (!SAFE_OPERATORS[operator]) {
    console.warn(`Unsupported operator: ${operator}`)
    return false
  }

  try {
    return SAFE_OPERATORS[operator](fieldValue, value)
  } catch (error) {
    console.error(`Error evaluating condition: ${error.message}`)
    return false
  }
}

/**
 * 评估复合条件 (支持 AND/OR 逻辑)
 * @param {ComplexCondition|SimpleCondition} condition - 条件对象
 * @param {Object} context - 上下文数据
 * @returns {boolean} 条件是否满足
 */
export function evaluateCondition(condition, context = {}) {
  if (!condition) {
    return false
  }

  // 简单条件
  if (condition.operator) {
    return evaluateSimpleCondition(condition, context)
  }

  // 复合条件
  if (condition.type && condition.conditions && Array.isArray(condition.conditions)) {
    const results = condition.conditions.map(cond => evaluateCondition(cond, context))

    if (condition.type === 'and') {
      return results.every(r => r === true)
    } else if (condition.type === 'or') {
      return results.some(r => r === true)
    }
  }

  return false
}

/**
 * 从嵌套对象中获取值
 * @param {Object} obj - 对象
 * @param {string} path - 路径 (如 "user.profile.age")
 * @returns {any} 值
 */
export function getNestedValue(obj, path) {
  if (!obj || !path) return undefined

  return path.split('.').reduce((acc, part) => {
    return acc?.[part]
  }, obj)
}

/**
 * 解析表达式字符串为条件对象
 * 简单格式: "field > value" 或 "field == value"
 * 复合格式: "(field1 > value1) AND (field2 == value2)"
 * @param {string} expression - 表达式字符串
 * @returns {SimpleCondition|ComplexCondition|null} 解析后的条件对象
 */
export function parseConditionExpression(expression) {
  if (!expression || typeof expression !== 'string') {
    return null
  }

  expression = expression.trim()

  // 处理 AND/OR 逻辑
  if (expression.toUpperCase().includes(' AND ') || expression.toUpperCase().includes(' OR ')) {
    return parseComplexExpression(expression)
  }

  // 处理简单条件
  return parseSimpleExpression(expression)
}

/**
 * 解析简单表达式
 * @param {string} expr - 表达式字符串
 * @returns {SimpleCondition|null}
 */
function parseSimpleExpression(expr) {
  const operators = ['>=', '<=', '==', '!=', '>', '<', 'includes', 'startsWith', 'endsWith', 'isEmpty', 'isNotEmpty']

  for (const op of operators) {
    const regex = new RegExp(`^\\s*([\\w.]+)\\s*${op === 'isEmpty' || op === 'isNotEmpty' ? op : `${op.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`}\\s*(.*)$`, 'i')
    const match = expr.match(regex)

    if (match) {
      const field = match[1].trim()
      const value = match[2]?.trim()

      // 处理值的类型转换
      let parsedValue = value
      if (value === 'true') parsedValue = true
      else if (value === 'false') parsedValue = false
      else if (value === 'null') parsedValue = null
      else if (!isNaN(value) && value !== '') parsedValue = Number(value)
      else if (value?.startsWith('"') && value?.endsWith('"')) parsedValue = value.slice(1, -1)

      return {
        field,
        operator: op,
        value: parsedValue
      }
    }
  }

  return null
}

/**
 * 解析复合表达式
 * @param {string} expr - 表达式字符串
 * @returns {ComplexCondition|null}
 */
function parseComplexExpression(expr) {
  const andRegex = /\s+AND\s+/i
  const orRegex = /\s+OR\s+/i

  // 检查是否包含 AND
  if (andRegex.test(expr)) {
    const parts = expr.split(andRegex)
    const conditions = parts
      .map(part => parseSimpleExpression(part.replace(/[()]/g, '')))
      .filter(cond => cond !== null)

    return conditions.length > 0 ? { type: 'and', conditions } : null
  }

  // 检查是否包含 OR
  if (orRegex.test(expr)) {
    const parts = expr.split(orRegex)
    const conditions = parts
      .map(part => parseSimpleExpression(part.replace(/[()]/g, '')))
      .filter(cond => cond !== null)

    return conditions.length > 0 ? { type: 'or', conditions } : null
  }

  return null
}

/**
 * 将条件对象转换为可读的字符串
 * @param {SimpleCondition|ComplexCondition} condition - 条件对象
 * @returns {string} 可读的表达式字符串
 */
export function conditionToString(condition) {
  if (!condition) return ''

  if (condition.operator) {
    // 简单条件
    const value = typeof condition.value === 'string' ? `"${condition.value}"` : condition.value
    return `${condition.field} ${condition.operator} ${value}`
  }

  if (condition.type && condition.conditions) {
    // 复合条件
    const parts = condition.conditions.map(cond => `(${conditionToString(cond)})`)
    const operator = condition.type.toUpperCase()
    return parts.join(` ${operator} `)
  }

  return ''
}

/**
 * 验证条件对象的结构
 * @param {any} condition - 需要验证的对象
 * @returns {boolean} 是否是有效的条件对象
 */
export function isValidCondition(condition) {
  if (!condition || typeof condition !== 'object') {
    return false
  }

  // 检查简单条件
  if (condition.operator) {
    return (
      typeof condition.field === 'string' &&
      typeof condition.operator === 'string' &&
      condition.field.length > 0 &&
      SAFE_OPERATORS[condition.operator] !== undefined
    )
  }

  // 检查复合条件
  if (condition.type && Array.isArray(condition.conditions)) {
    return (
      (condition.type === 'and' || condition.type === 'or') &&
      condition.conditions.length > 0 &&
      condition.conditions.every(cond => isValidCondition(cond))
    )
  }

  return false
}
