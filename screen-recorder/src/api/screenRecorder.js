const BASE = '/api/screen-recorder'

async function request(method, path, body, opts = {}) {
  const headers = { ...opts.headers }
  let fetchBody

  if (body instanceof Blob || body instanceof ArrayBuffer || ArrayBuffer.isView(body)) {
    fetchBody = body
    headers['Content-Type'] = 'application/octet-stream'
  } else if (body !== undefined && body !== null) {
    fetchBody = JSON.stringify(body)
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: fetchBody,
    signal: opts.signal
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  if (res.status === 204) return null
  return res.json()
}

// 会话管理
export function createSession(settings) {
  return request('POST', '/sessions', settings)
}

export function completeSession(sessionId, meta) {
  return request('POST', `/sessions/${sessionId}/complete`, meta)
}

export function abortSession(sessionId) {
  return navigator.sendBeacon
    ? (navigator.sendBeacon(`${BASE}/sessions/${sessionId}/abort`), Promise.resolve())
    : request('DELETE', `/sessions/${sessionId}`)
}

// Chunk 上传（直接发送 Blob，绕过 JSON 序列化）
export async function uploadChunk(sessionId, seq, blob, signal) {
  const res = await fetch(`${BASE}/sessions/${sessionId}/chunks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'X-Chunk-Seq': String(seq)
    },
    body: blob,
    signal
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

// 录制文件管理
export function listRecordings(page = 1, size = 20) {
  return request('GET', `/recordings?page=${page}&size=${size}`)
}

export function deleteRecording(id) {
  return request('DELETE', `/recordings/${id}`)
}

export function renameRecording(id, name) {
  return request('PATCH', `/recordings/${id}`, { name })
}

export function getStreamUrl(id) {
  return `${BASE}/recordings/${id}/stream`
}

export function getDownloadUrl(id) {
  return `${BASE}/recordings/${id}/download`
}

export function getThumbnailUrl(id) {
  return `${BASE}/recordings/${id}/thumbnail`
}

export function extractThumbnail(id, timeSec = 3) {
  return request('POST', `/recordings/${id}/thumbnail`, { timeSec })
}

// FFmpeg 转换任务
export function createConvertTask(recordingId, options = {}) {
  return request('POST', '/tasks/convert', { recordingId, ...options })
}

export function getTask(taskId) {
  return request('GET', `/tasks/${taskId}`)
}
