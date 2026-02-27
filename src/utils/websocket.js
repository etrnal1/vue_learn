/**
 * WebSocket 客户端封装
 * 支持自动重连、事件订阅、心跳检测
 */

class WebSocketClient {
  constructor(url) {
    this.url = url
    this.ws = null
    this.listeners = new Map() // event -> Set of callbacks
    this.reconnectInterval = 3000
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 10
    this.heartbeatInterval = null
    this.isManualClose = false
  }

  /**
   * 连接 WebSocket
   */
  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('[websocket] 已连接，跳过')
      return
    }

    console.log('[websocket] 连接到:', this.url)
    this.ws = new WebSocket(this.url)

    this.ws.onopen = () => {
      console.log('[websocket] 连接成功')
      this.reconnectAttempts = 0
      this.startHeartbeat()
      this.emit('connected')
    }

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        this.handleMessage(message)
      } catch (error) {
        console.error('[websocket] 消息解析失败:', error)
      }
    }

    this.ws.onerror = (error) => {
      console.error('[websocket] 连接错误:', error)
      this.emit('error', error)
    }

    this.ws.onclose = () => {
      console.log('[websocket] 连接关闭')
      this.stopHeartbeat()
      this.emit('disconnected')

      if (!this.isManualClose) {
        this.reconnect()
      }
    }
  }

  /**
   * 断开连接
   */
  disconnect() {
    this.isManualClose = true
    this.stopHeartbeat()
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  /**
   * 重新连接
   */
  reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[websocket] 重连次数达到上限')
      this.emit('reconnect_failed')
      return
    }

    this.reconnectAttempts++
    console.log(`[websocket] ${this.reconnectInterval}ms 后尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)

    setTimeout(() => {
      this.connect()
    }, this.reconnectInterval)
  }

  /**
   * 发送消息
   */
  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      console.warn('[websocket] 连接未打开，无法发送消息')
    }
  }

  /**
   * 订阅执行实例
   */
  subscribe(executionId) {
    this.send({
      type: 'subscribe',
      payload: { executionId }
    })
  }

  /**
   * 取消订阅
   */
  unsubscribe(executionId) {
    this.send({
      type: 'unsubscribe',
      payload: { executionId }
    })
  }

  /**
   * 监听事件
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event).add(callback)
  }

  /**
   * 移除事件监听
   */
  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback)
    }
  }

  /**
   * 触发事件
   */
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach((callback) => {
        try {
          callback(data)
        } catch (error) {
          console.error(`[websocket] 事件 ${event} 回调错误:`, error)
        }
      })
    }
  }

  /**
   * 处理服务器消息
   */
  handleMessage(message) {
    const { type, executionId, payload, timestamp } = message

    // 触发通用消息事件
    this.emit('message', message)

    // 触发特定类型事件
    this.emit(type, { executionId, payload, timestamp })
  }

  /**
   * 启动心跳
   */
  startHeartbeat() {
    this.stopHeartbeat()
    this.heartbeatInterval = setInterval(() => {
      this.send({ type: 'ping' })
    }, 25000) // 25秒发送一次心跳
  }

  /**
   * 停止心跳
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }
}

// 创建全局 WebSocket 实例
let wsClient = null

/**
 * 获取 WebSocket 客户端
 */
export function getWebSocketClient() {
  if (!wsClient) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.hostname
    const port = import.meta.env.VITE_WS_PORT || '4001'
    const url = `${protocol}//${host}:${port}/ws`

    wsClient = new WebSocketClient(url)
    wsClient.connect()
  }
  return wsClient
}

/**
 * 断开 WebSocket
 */
export function disconnectWebSocket() {
  if (wsClient) {
    wsClient.disconnect()
    wsClient = null
  }
}

export default { getWebSocketClient, disconnectWebSocket }
