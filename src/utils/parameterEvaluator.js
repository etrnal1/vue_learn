/**
 * 参数评估引擎
 * 支持常量、变量引用、表达式、步骤输出等多种来源
 * 用于流程参数传递和数据映射系统
 */

/**
 * 安全的函数库
 * 支持字符串、数学、日期、数组操作
 */
const SAFE_FUNCTIONS = {
  // 字符串函数
  'length': (str) => String(str).length,
  'toUpperCase': (str) => String(str).toUpperCase(),
  'toLowerCase': (str) => String(str).toLowerCase(),
  'substring': (str, start, end) => String(str).substring(start, end),
  'includes': (str, substr) => String(str).includes(substr),
  'replace': (str, from, to) => String(str).replace(from, to),
  'trim': (str) => String(str).trim(),
  'split': (str, sep) => String(str).split(sep),

  // 数学函数
  'add': (...args) => args.reduce((a, b) => Number(a) + Number(b), 0),
  'subtract': (a, b) => Number(a) - Number(b),
  'multiply': (a, b) => Number(a) * Number(b),
  'divide': (a, b) => Number(a) / Number(b),
  'ceil': (n) => Math.ceil(Number(n)),
  'floor': (n) => Math.floor(Number(n)),
  'round': (n) => Math.round(Number(n)),
  'abs': (n) => Math.abs(Number(n)),
  'max': (...args) => Math.max(...args.map(Number)),
  'min': (...args) => Math.min(...args.map(Number)),

  // 日期函数
  'now': () => Date.now(),
  'getDate': () => new Date().toISOString().split('T')[0],
  'getTime': () => new Date().getTime(),

  // 数组函数
  'join': (arr, sep = ',') => Array.isArray(arr) ? arr.join(sep) : String(arr),
  'arrayLength': (arr) => Array.isArray(arr) ? arr.length : 0,
  'first': (arr) => Array.isArray(arr) ? arr[0] : null,
  'last': (arr) => Array.isArray(arr) ? arr[arr.length-1] : null,

  // 类型转换
  'toString': (val) => String(val),
  'toNumber': (val) => Number(val),
  'toBoolean': (val) => Boolean(val),
  'isNull': (val) => val === null || val === undefined,
  'isEmpty': (val) => !val || String(val).trim() === '',
  'isNotEmpty': (val) => val && String(val).trim() !== ''
}

/**
 * 解析参数值（根据来源类型）
 * @param {Object} config - 参数配置 { sourceType, sourceValue, variableValues, previousStepOutput, allVariables }
 * @returns {*} 解析后的参数值
 */
export function evaluateParameter(config = {}) {
  const {
    sourceType = 'constant',
    sourceValue = '',
    variableValues = {},
    previousStepOutput = {},
    allVariables = {}
  } = config

  try {
    switch(sourceType) {
      case 'constant':
        return parseValue(sourceValue)

      case 'variable':
        // 从变量值或全局变量中获取
        return variableValues[sourceValue] !== undefined
          ? variableValues[sourceValue]
          : allVariables[sourceValue]?.default_value || null

      case 'expression':
        return evaluateExpression(sourceValue, { ...allVariables, ...variableValues })

      case 'previous_step':
        return previousStepOutput[sourceValue] || null

      default:
        return null
    }
  } catch (error) {
    console.error(`参数评估失败: ${error.message}`, { sourceType, sourceValue })
    return null
  }
}

/**
 * 表达式求值
 * 支持变量引用: ${varName}
 * 支持函数调用: ${add(100, 200)}
 * 支持方法链: ${toUpperCase(status)}
 * @param {string} expr - 表达式字符串
 * @param {Object} variables - 变量值映射
 * @returns {*} 计算结果
 */
function evaluateExpression(expr, variables = {}) {
  if (!expr) return null

  let result = expr

  // 第一步：替换变量引用 ${varName}
  result = result.replace(/\$\{([^}]+)\}/g, (match, content) => {
    const trimmed = content.trim()

    // 检查是否是函数调用
    if (trimmed.includes('(') && trimmed.includes(')')) {
      return evaluateFunctionCall(trimmed, variables)
    }

    // 简单变量引用
    const value = variables[trimmed]
    if (value !== undefined) {
      return String(value)
    }

    // 返回原值（变量不存在）
    return match
  })

  // 第二步：基础算术计算（仅当内容是纯数值表达式时）
  if (/^[\d\s+\-*/().]+$/.test(result)) {
    try {
      // 使用Function代替eval进行安全计算
      const compute = Function('"use strict"; return (' + result + ')')
      return compute()
    } catch (e) {
      console.warn('算术表达式计算失败:', e.message)
      return result
    }
  }

  return result
}

/**
 * 函数调用评估
 * @param {string} funcContent - 函数调用内容，如 "add(100, 200)"
 * @param {Object} variables - 变量映射
 * @returns {*} 函数执行结果
 */
function evaluateFunctionCall(funcContent, variables = {}) {
  const funcMatch = funcContent.match(/^([a-zA-Z_]\w*)\s*\((.*)\)$/)
  if (!funcMatch) return funcContent

  const [, funcName, argsStr] = funcMatch

  // 检查函数是否在白名单中
  if (!SAFE_FUNCTIONS[funcName]) {
    console.warn(`未知函数: ${funcName}`)
    return funcContent
  }

  try {
    // 解析参数
    const args = parseArguments(argsStr, variables)

    // 调用函数
    return SAFE_FUNCTIONS[funcName](...args)
  } catch (error) {
    console.error(`函数执行失败 ${funcName}:`, error.message)
    return funcContent
  }
}

/**
 * 解析函数参数
 * @param {string} argsStr - 参数字符串 "arg1, arg2, arg3"
 * @param {Object} variables - 变量映射
 * @returns {Array} 参数数组
 */
function parseArguments(argsStr, variables = {}) {
  if (!argsStr || argsStr.trim() === '') return []

  // 简单的参数分割（逗号分割）
  return argsStr.split(',').map(arg => {
    const trimmed = arg.trim()

    // 变量引用
    if (trimmed.startsWith('${') && trimmed.endsWith('}')) {
      const varName = trimmed.slice(2, -1)
      return variables[varName]
    }

    // 数字
    if (/^-?\d+\.?\d*$/.test(trimmed)) {
      return Number(trimmed)
    }

    // 布尔值
    if (trimmed === 'true') return true
    if (trimmed === 'false') return false

    // 字符串（去除引号）
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      return trimmed.slice(1, -1)
    }

    // 原值
    return trimmed
  })
}

/**
 * 解析常量值（字符串到对应类型的转换）
 * @param {string} value - 值字符串
 * @returns {*} 转换后的值
 */
function parseValue(value) {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const str = String(value).trim()

  // 布尔值
  if (str === 'true') return true
  if (str === 'false') return false

  // 数字
  if (/^-?\d+\.?\d*$/.test(str)) {
    return Number(str)
  }

  // null 值
  if (str === 'null') return null

  // JSON 对象/数组
  if ((str.startsWith('{') && str.endsWith('}')) ||
      (str.startsWith('[') && str.endsWith(']'))) {
    try {
      return JSON.parse(str)
    } catch (e) {
      console.warn('JSON 解析失败:', e)
      return str
    }
  }

  // 默认为字符串
  return str
}

/**
 * 批量评估参数
 * @param {Array} parameterConfigs - 参数配置数组
 * @param {Object} context - 上下文 { variableValues, previousStepOutput, allVariables }
 * @returns {Object} 参数名->值的映射
 */
export function evaluateParameterBatch(parameterConfigs = [], context = {}) {
  const result = {}

  for (const config of parameterConfigs) {
    if (!config.paramName) continue

    const value = evaluateParameter({
      ...config,
      ...context
    })

    result[config.paramName] = value
  }

  return result
}

/**
 * 验证参数映射配置
 * @param {Object} mapping - 参数映射配置
 * @returns {boolean} 是否有效
 */
export function isValidParameterMapping(mapping) {
  if (!mapping || typeof mapping !== 'object') return false

  return (
    mapping.paramName &&
    typeof mapping.paramName === 'string' &&
    mapping.paramName.trim() !== '' &&
    mapping.sourceType &&
    ['constant', 'variable', 'expression', 'previous_step'].includes(mapping.sourceType)
  )
}

/**
 * 验证参数值类型
 * @param {*} value - 参数值
 * @param {string} type - 期望的类型
 * @returns {boolean} 是否符合类型
 */
export function validateParameterType(value, type) {
  if (type === 'any') return true

  switch(type) {
    case 'string':
      return typeof value === 'string'

    case 'number':
      return typeof value === 'number' && !isNaN(value)

    case 'boolean':
      return typeof value === 'boolean'

    case 'array':
      return Array.isArray(value)

    case 'object':
      return value !== null && typeof value === 'object' && !Array.isArray(value)

    default:
      return true
  }
}

/**
 * 获取变量的默认值
 * @param {Object} variable - 变量定义
 * @returns {*} 默认值
 */
export function getVariableDefaultValue(variable) {
  if (!variable) return null

  if (variable.default_value !== null && variable.default_value !== undefined) {
    return variable.default_value
  }

  // 根据类型返回默认值
  switch(variable.type) {
    case 'string':
      return ''
    case 'number':
      return 0
    case 'boolean':
      return false
    case 'array':
      return []
    case 'object':
      return {}
    default:
      return null
  }
}

/**
 * 获取支持的函数列表（用于编辑器自动完成）
 * @returns {Array} 函数名数组
 */
export function getSupportedFunctions() {
  return Object.keys(SAFE_FUNCTIONS)
}

/**
 * 获取函数说明（用于编辑器提示）
 * @param {string} funcName - 函数名
 * @returns {string} 函数说明
 */
export function getFunctionDescription(funcName) {
  const descriptions = {
    'length': '获取字符串长度',
    'toUpperCase': '转换为大写',
    'toLowerCase': '转换为小写',
    'substring': '截取子字符串',
    'includes': '检查包含关系',
    'replace': '字符串替换',
    'trim': '移除空格',
    'split': '分割字符串',
    'add': '加法计算',
    'subtract': '减法计算',
    'multiply': '乘法计算',
    'divide': '除法计算',
    'ceil': '向上取整',
    'floor': '向下取整',
    'round': '四舍五入',
    'abs': '绝对值',
    'max': '最大值',
    'min': '最小值',
    'now': '当前时间戳',
    'getDate': '当前日期',
    'getTime': '当前时间毫秒',
    'join': '数组转字符串',
    'arrayLength': '数组长度',
    'first': '获取首个元素',
    'last': '获取最后元素',
    'toString': '转为字符串',
    'toNumber': '转为数字',
    'toBoolean': '转为布尔值',
    'isNull': '是否为空',
    'isEmpty': '是否为空字符串',
    'isNotEmpty': '是否不为空'
  }
  return descriptions[funcName] || '无说明'
}

export default {
  evaluateParameter,
  evaluateParameterBatch,
  isValidParameterMapping,
  validateParameterType,
  getVariableDefaultValue,
  getSupportedFunctions,
  getFunctionDescription
}
