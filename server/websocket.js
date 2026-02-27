import { WebSocketServer } from 'ws'

// WebSocket 连接管理
const connections = new Map() // userId -> Set of ws connections
const rooms = new Map()       // roomId -> Set of ws connections

/**
 * 初始化 WebSocket 服务器
 * @param {import('http').Server} server - HTTP 服务器实例
 */
export function initWebSocket(server) {
  const wss = new WebSocketServer({ server, path: '/ws' })

  wss.on('connection', (ws, req) => {
    console.log('[websocket] 新连接建立')

    // 心跳检测
    ws.isAlive = true
    ws.on('pong', () => { ws.isAlive = true })

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data)
        handleClientMessage(ws, message)
      } catch (error) {
        console.error('[websocket] 消息解析失败:', error)
      }
    })

    ws.on('close', () => {
      console.log('[websocket] 连接关闭')
      // 清理连接
      removeConnection(ws)
    })

    ws.on('error', (error) => {
      console.error('[websocket] 连接错误:', error)
    })
  })

  // 心跳检测（30秒）
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) {
        console.log('[websocket] 连接超时，关闭')
        return ws.terminate()
      }
      ws.isAlive = false
      ws.ping()
    })
  }, 30000)

  wss.on('close', () => {
    clearInterval(heartbeatInterval)
  })

  return wss
}

/**
 * 处理客户端消息
 */
function handleClientMessage(ws, message) {
  const { type, payload } = message

  switch (type) {
    case 'subscribe':
      // 订阅执行实例房间
      const { executionId } = payload
      joinRoom(ws, `execution:${executionId}`)
      ws.send(JSON.stringify({
        type: 'subscribed',
        executionId
      }))
      break

    case 'unsubscribe':
      // 取消订阅
      const { executionId: execId } = payload
      leaveRoom(ws, `execution:${execId}`)
      break

    case 'ping':
      // 客户端心跳
      ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }))
      break

    default:
      console.warn('[websocket] 未知消息类型:', type)
  }
}

/**
 * 加入房间
 */
function joinRoom(ws, roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Set())
  }
  rooms.get(roomId).add(ws)
  ws.rooms = ws.rooms || new Set()
  ws.rooms.add(roomId)
  console.log(`[websocket] 加入房间: ${roomId}`)
}

/**
 * 离开房间
 */
function leaveRoom(ws, roomId) {
  if (rooms.has(roomId)) {
    rooms.get(roomId).delete(ws)
    if (rooms.get(roomId).size === 0) {
      rooms.delete(roomId)
    }
  }
  if (ws.rooms) {
    ws.rooms.delete(roomId)
  }
  console.log(`[websocket] 离开房间: ${roomId}`)
}

/**
 * 移除连接
 */
function removeConnection(ws) {
  if (ws.rooms) {
    ws.rooms.forEach(roomId => {
      leaveRoom(ws, roomId)
    })
  }
}

/**
 * 广播到房间
 * @param {string} roomId - 房间ID
 * @param {object} message - 消息对象
 */
export function broadcastToRoom(roomId, message) {
  const room = rooms.get(roomId)
  if (!room || room.size === 0) return

  const data = JSON.stringify(message)
  let sent = 0

  room.forEach((ws) => {
    if (ws.readyState === 1) { // OPEN
      ws.send(data)
      sent++
    }
  })

  console.log(`[websocket] 广播到房间 ${roomId}，发送 ${sent} 条消息`)
}

/**
 * 广播到所有连接
 */
export function broadcastToAll(message) {
  // 由 wss 实例持有，暂不实现
}
