// API 辅助函数
const configuredBase = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');
const API_BASE = configuredBase ? `${configuredBase}/api` : '/api';

export function getApiUrl(endpoint) {
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE}${normalizedEndpoint}`;
}

async function apiRequest(endpoint, options = {}) {
  try {
    const response = await fetch(getApiUrl(endpoint), {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      const err = new Error(error.error || `HTTP ${response.status}`);
      err.details = error;
      throw err;
    }

    return await response.json();
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
}

export const api = {
  request: apiRequest,
  get: (endpoint, options = {}) => apiRequest(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options = {}) => apiRequest(endpoint, {
    ...options,
    method: 'POST',
    body: body === undefined ? undefined : JSON.stringify(body)
  }),
  put: (endpoint, body, options = {}) => apiRequest(endpoint, {
    ...options,
    method: 'PUT',
    body: body === undefined ? undefined : JSON.stringify(body)
  }),
  delete: (endpoint, options = {}) => apiRequest(endpoint, { ...options, method: 'DELETE' }),

  // Users
  users: {
    getAll: () => apiRequest('/users'),
    getCurrent: () => apiRequest('/users/current'),
    create: (user) => apiRequest('/users', { method: 'POST', body: JSON.stringify(user) }),
    update: (id, data) => apiRequest(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => apiRequest(`/users/${id}`, { method: 'DELETE' }),
    switchCurrent: (id) => apiRequest(`/users/switch/${id}`, { method: 'POST' })
  },

  // Tickets
  tickets: {
    getAll: () => apiRequest('/tickets'),
    getOne: (id) => apiRequest(`/tickets/${id}`),
    create: (ticket) => apiRequest('/tickets', { method: 'POST', body: JSON.stringify(ticket) }),
    update: (id, data) => apiRequest(`/tickets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => apiRequest(`/tickets/${id}`, { method: 'DELETE' }),
    addComment: (id, comment) => apiRequest(`/tickets/${id}/comments`, { method: 'POST', body: JSON.stringify(comment) }),
    deleteComment: (ticketId, commentId) => apiRequest(`/tickets/${ticketId}/comments/${commentId}`, { method: 'DELETE' })
  },

  // Service Requests
  requests: {
    getAll: () => apiRequest('/service-requests'),
    getOne: (id) => apiRequest(`/service-requests/${id}`),
    create: (request) => apiRequest('/service-requests', { method: 'POST', body: JSON.stringify(request) }),
    update: (id, data) => apiRequest(`/service-requests/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => apiRequest(`/service-requests/${id}`, { method: 'DELETE' }),
    addComment: (id, comment) => apiRequest(`/service-requests/${id}/comments`, { method: 'POST', body: JSON.stringify(comment) }),
    deleteComment: (reqId, commentId) => apiRequest(`/service-requests/${reqId}/comments/${commentId}`, { method: 'DELETE' })
  },

  // Articles
  articles: {
    getAll: () => apiRequest('/articles'),
    getOne: (id) => apiRequest(`/articles/${id}`),
    create: (article) => apiRequest('/articles', { method: 'POST', body: JSON.stringify(article) }),
    update: (id, data) => apiRequest(`/articles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => apiRequest(`/articles/${id}`, { method: 'DELETE' }),
    incrementView: (id) => apiRequest(`/articles/${id}/view`, { method: 'POST' })
  },

  // Flows
  flows: {
    getAll: () => apiRequest('/flows'),
    getOne: (id) => apiRequest(`/flows/${id}`),
    create: (flow) => apiRequest('/flows', { method: 'POST', body: JSON.stringify(flow) }),
    update: (id, data) => apiRequest(`/flows/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => apiRequest(`/flows/${id}`, { method: 'DELETE' })
  },

  // Chats
  chats: {
    getAll: () => apiRequest('/chats'),
    getOne: (id) => apiRequest(`/chats/${id}`),
    create: (chat) => apiRequest('/chats', { method: 'POST', body: JSON.stringify(chat) }),
    update: (id, data) => apiRequest(`/chats/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => apiRequest(`/chats/${id}`, { method: 'DELETE' }),
    addComment: (id, comment) => apiRequest(`/chats/${id}/comments`, { method: 'POST', body: JSON.stringify(comment) }),
    deleteComment: (chatId, commentId) => apiRequest(`/chats/${chatId}/comments/${commentId}`, { method: 'DELETE' })
  },

  // Code Snippets
  snippets: {
    getAll: () => apiRequest('/code-snippets'),
    create: (snippet) => apiRequest('/code-snippets', { method: 'POST', body: JSON.stringify(snippet) }),
    delete: (id) => apiRequest(`/code-snippets/${id}`, { method: 'DELETE' })
  },

  // Migration
  migrate: {
    import: (data) => apiRequest('/migrate', { method: 'POST', body: JSON.stringify(data) }),
    export: () => apiRequest('/migrate/export')
  },

  // Service Catalog
  serviceCatalog: {
    getAll: (options = {}) => {
      const query = options.includeInactive ? '?includeInactive=1' : ''
      return apiRequest(`/service-catalog${query}`)
    },
    getOne: (serviceType) => apiRequest(`/service-catalog/${serviceType}`),
    create: (item) => apiRequest('/service-catalog', { method: 'POST', body: JSON.stringify(item) }),
    update: (id, item) => apiRequest(`/service-catalog/${id}`, { method: 'PUT', body: JSON.stringify(item) }),
    delete: (id) => apiRequest(`/service-catalog/${id}`, { method: 'DELETE' })
  },

  // Local Videos
  videos: {
    getLibrary: () => apiRequest('/videos/library'),
    saveLibrary: (items) => apiRequest('/videos/library', { method: 'PUT', body: JSON.stringify({ items }) }),
    scan: (payload) => apiRequest('/videos/scan', { method: 'POST', body: JSON.stringify(payload) }),
    optimize: (payload) => apiRequest('/videos/optimize', { method: 'POST', body: JSON.stringify(payload) }),
    streamUrl: (filePath) => getApiUrl(`/videos/stream?path=${encodeURIComponent(filePath)}`),
    downloadUrl: (filePath) => getApiUrl(`/videos/download?path=${encodeURIComponent(filePath)}`)
  },

  // Local Music
  music: {
    scan: (payload) => apiRequest('/music/scan', { method: 'POST', body: JSON.stringify(payload) }),
    streamUrl: (filePath) => getApiUrl(`/music/stream?path=${encodeURIComponent(filePath)}`),
    downloadUrl: (filePath) => getApiUrl(`/music/download?path=${encodeURIComponent(filePath)}`)
  },

  // Album Library
  albums: {
    getLibrary: () => apiRequest('/albums/library'),
    saveLibrary: (items) => apiRequest('/albums/library', { method: 'PUT', body: JSON.stringify({ items }) })
  },

  // Document Scanner
  docScanner: {
    scan: (payload) => apiRequest('/doc-scanner/scan', { method: 'POST', body: JSON.stringify(payload) }),
    read: (filePath) => apiRequest(`/doc-scanner/read?path=${encodeURIComponent(filePath)}`),
    getScheduler: () => apiRequest('/doc-scanner/scheduler'),
    startScheduler: (payload) => apiRequest('/doc-scanner/scheduler/start', { method: 'POST', body: JSON.stringify(payload) }),
    stopScheduler: () => apiRequest('/doc-scanner/scheduler/stop', { method: 'POST' }),
    runScheduler: () => apiRequest('/doc-scanner/scheduler/run', { method: 'POST' })
  },

  // Weibo Public Crawler
  weibo: {
    fetch: (payload) => apiRequest('/weibo/fetch', { method: 'POST', body: JSON.stringify(payload) }),
    save: (payload) => apiRequest('/weibo/save', { method: 'POST', body: JSON.stringify(payload) }),
    saved: (uid) => apiRequest(`/weibo/saved?uid=${encodeURIComponent(uid)}`),
    scheduler: () => apiRequest('/weibo/scheduler'),
    startScheduler: (payload) => apiRequest('/weibo/scheduler/start', { method: 'POST', body: JSON.stringify(payload) }),
    stopScheduler: () => apiRequest('/weibo/scheduler/stop', { method: 'POST' }),
    runScheduler: () => apiRequest('/weibo/scheduler/run', { method: 'POST' })
  },

  // Script Runner
  scriptRunner: {
    execute: (payload) => apiRequest('/script-runner/execute', { method: 'POST', body: JSON.stringify(payload) })
  },

  // Scheduler Tasks
  schedulerTasks: {
    getAll: () => apiRequest('/scheduler-tasks'),
    create: (task) => apiRequest('/scheduler-tasks', { method: 'POST', body: JSON.stringify(task) }),
    update: (id, task) => apiRequest(`/scheduler-tasks/${id}`, { method: 'PUT', body: JSON.stringify(task) }),
    remove: (id) => apiRequest(`/scheduler-tasks/${id}`, { method: 'DELETE' }),
    run: (id) => apiRequest(`/scheduler-tasks/${id}/run`, { method: 'POST' }),
    toggle: (id) => apiRequest(`/scheduler-tasks/${id}/toggle`, { method: 'POST' }),
    toggleAll: (enabled) => apiRequest('/scheduler-tasks/toggle-all', { method: 'POST', body: JSON.stringify({ enabled }) }),
    logsAll: () => apiRequest('/scheduler-tasks/logs/all'),
    clearLogs: () => apiRequest('/scheduler-tasks/logs', { method: 'DELETE' }),
    importLegacyDocScheduler: (status) => apiRequest('/scheduler-tasks/import-legacy-doc-scheduler', { method: 'POST', body: JSON.stringify({ status }) })
  },

  // Wiki Library
  wiki: {
    getLibrary: () => apiRequest('/wiki/library'),
    saveLibrary: (items) => apiRequest('/wiki/library', { method: 'PUT', body: JSON.stringify({ items }) }),
    importDocument: (payload, options = {}) => apiRequest('/wiki/import-document', {
      ...options,
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },

  // Runtime Logs
  runtimeLogs: {
    getAll: (limit = 400) => apiRequest(`/runtime-logs?limit=${encodeURIComponent(limit)}`),
    clear: () => apiRequest('/runtime-logs', { method: 'DELETE' })
  },

  // Documentation
  docs: {
    list: () => apiRequest('/docs/list'),
    getContent: (filename) => apiRequest(`/docs/content?file=${encodeURIComponent(filename)}`),
    sync: () => apiRequest('/docs/sync', { method: 'POST' }),
    search: (query, limit = 30) => apiRequest(`/docs/search?q=${encodeURIComponent(query)}&limit=${encodeURIComponent(limit)}`)
  }
};
