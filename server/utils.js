// 将 snake_case 键名转换为 camelCase
export function snakeToCamel(str) {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

// 递归将对象的所有键从 snake_case 转换为 camelCase
export function toCamelCase(obj) {
  if (Array.isArray(obj)) {
    return obj.map(toCamelCase);
  }
  if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      const camelKey = snakeToCamel(key);
      result[camelKey] = toCamelCase(value);
    }
    return result;
  }
  return obj;
}

// Express 中间件：自动将所有 JSON 响应的键名转为 camelCase
export function camelCaseResponse(req, res, next) {
  const originalJson = res.json.bind(res);
  res.json = (data) => {
    return originalJson(toCamelCase(data));
  };
  next();
}
