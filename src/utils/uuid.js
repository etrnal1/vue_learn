/**
 * UUID 生成工具
 */

export function randomUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

export function uuidv4() {
  return randomUUID()
}

export function shortId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}