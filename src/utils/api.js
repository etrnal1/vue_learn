// API 辅助函数
const API_BASE_STORAGE_KEY = 'vue_learning_api_base_url';
const AUTH_TOKEN_STORAGE_KEY = 'vue_learning_auth_token';
const configuredBaseRaw = (import.meta.env.VITE_API_BASE_URL || '').trim();

function normalizeApiBase(base) {
  const raw = String(base || '').trim();
  if (!raw) return '';
  const trimmed = raw.replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

function getRuntimeApiBase() {
  if (typeof window === 'undefined') return '';
  try {
    return normalizeApiBase(window.localStorage?.getItem(API_BASE_STORAGE_KEY) || '');
  } catch (error) {
    return '';
  }
}

function isHttpRuntime() {
  if (typeof window === 'undefined') return false;
  return /^https?:$/.test(window.location?.protocol || '');
}

const configuredApiBase = normalizeApiBase(configuredBaseRaw);
const relativeApiBase = '/api';
let activeApiBase = '';
let activeAuthToken = '';

function getApiBaseCandidates() {
  const seen = new Set();
  const list = [];
  const push = (base) => {
    const normalized = normalizeApiBase(base);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    list.push(normalized);
  };

  const runtimeApiBase = getRuntimeApiBase();

  push(activeApiBase);

  if (isHttpRuntime()) {
    // 浏览器访问页面时，优先跟随当前访问域名，避免旧 IP 锁死。
    push(relativeApiBase);
    push(runtimeApiBase);
    push(configuredApiBase);
  } else {
    // file:// 或原生容器环境优先使用显式配置地址。
    push(runtimeApiBase);
    push(configuredApiBase);
    push(relativeApiBase);
  }

  return list.length > 0 ? list : [relativeApiBase];
}

function buildApiUrl(base, endpoint) {
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}${normalizedEndpoint}`;
}

function getRuntimeAuthToken() {
  if (typeof window === 'undefined') return '';
  try {
    return String(window.localStorage?.getItem(AUTH_TOKEN_STORAGE_KEY) || '').trim();
  } catch (error) {
    return '';
  }
}

function getActiveAuthToken() {
  return String(activeAuthToken || getRuntimeAuthToken() || '').trim();
}

function saveAuthToken(token) {
  const value = String(token || '').trim();
  activeAuthToken = value;
  if (typeof window === 'undefined') return;
  try {
    if (value) {
      window.localStorage?.setItem(AUTH_TOKEN_STORAGE_KEY, value);
    } else {
      window.localStorage?.removeItem(AUTH_TOKEN_STORAGE_KEY);
    }
  } catch (error) {
    // ignore storage errors
  }
}

function rememberActiveApiBase(base) {
  const normalized = normalizeApiBase(base);
  if (!normalized) return;
  activeApiBase = normalized;
}

export function getApiUrl(endpoint) {
  const base = getApiBaseCandidates()[0];
  return buildApiUrl(base, endpoint);
}

async function parseErrorFromResponse(response) {
  const fallback = { error: `HTTP ${response.status}` };
  const payload = await response.json().catch(() => fallback);
  const err = new Error(payload.error || `HTTP ${response.status}`);
  err.details = payload;
  err.status = response.status;
  return err;
}

async function apiRequest(endpoint, options = {}) {
  const method = String(options.method || 'GET').toUpperCase();
  const canRetryResponseError = method === 'GET' || method === 'HEAD';
  let lastError = null;
  const token = getActiveAuthToken();
  const optionHeaders = options.headers || {};
  const headers = {
    'Content-Type': 'application/json',
    ...optionHeaders
  };
  if (token && !headers.Authorization && !headers.authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  for (const base of getApiBaseCandidates()) {
    const url = buildApiUrl(base, endpoint);
    try {
      const response = await fetch(url, {
        headers,
        ...options
      });

      if (!response.ok) {
        const err = await parseErrorFromResponse(response);
        err.apiBase = base;
        if (!canRetryResponseError) throw err;
        lastError = err;
        continue;
      }

      const payload = await response.json().catch(() => {
        const err = new Error('API 返回了非 JSON 响应');
        err.apiBase = base;
        throw err;
      });
      rememberActiveApiBase(base);
      return payload;
    } catch (error) {
      if (error?.name === 'AbortError') throw error;
      lastError = error;
    }
  }

  try {
    throw lastError || new Error('API 请求失败');
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
}

export const api = {
  setBaseUrl: (base) => {
    const normalized = normalizeApiBase(base);
    if (typeof window !== 'undefined') {
      if (normalized) {
        window.localStorage?.setItem(API_BASE_STORAGE_KEY, normalized.replace(/\/api$/, ''));
      } else {
        window.localStorage?.removeItem(API_BASE_STORAGE_KEY);
      }
    }
    activeApiBase = normalized;
  },
  getBaseInfo: () => ({
    active: activeApiBase || getApiBaseCandidates()[0],
    configured: configuredApiBase || '',
    runtime: getRuntimeApiBase() || ''
  }),
  setAuthToken: (token) => saveAuthToken(token),
  getAuthToken: () => getActiveAuthToken(),
  clearAuthToken: () => saveAuthToken(''),
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
    getCurrentRole: () => apiRequest('/users/current-role'),
    setCurrentRole: (role) => apiRequest('/users/current-role', { method: 'POST', body: JSON.stringify({ role }) }),
    create: (user) => apiRequest('/users', { method: 'POST', body: JSON.stringify(user) }),
    update: (id, data) => apiRequest(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => apiRequest(`/users/${id}`, { method: 'DELETE' }),
    switchCurrent: (id) => apiRequest(`/users/switch/${id}`, { method: 'POST' })
  },

  // Auth
  auth: {
    register: (payload) => apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
    login: async (id, password) => {
      const result = await apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ id, password }) });
      if (result?.token) saveAuthToken(result.token);
      return result;
    },
    me: () => apiRequest('/auth/me'),
    logout: async () => {
      try {
        return await apiRequest('/auth/logout', { method: 'POST' });
      } finally {
        saveAuthToken('');
      }
    }
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
    upload: (file, onProgress) => new Promise((resolve, reject) => {
      if (!(file instanceof File)) {
        reject(new Error('无效文件'));
        return;
      }
      const xhr = new XMLHttpRequest();
      const url = getApiUrl(`/videos/upload?filename=${encodeURIComponent(file.name)}`);
      xhr.open('POST', url, true);
      xhr.responseType = 'json';
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
      xhr.upload.onprogress = (evt) => {
        if (!evt.lengthComputable || typeof onProgress !== 'function') return;
        const percent = Math.max(0, Math.min(100, (evt.loaded / evt.total) * 100));
        onProgress(percent, evt.loaded, evt.total);
      };
      xhr.onload = () => {
        const ok = xhr.status >= 200 && xhr.status < 300;
        const body = xhr.response || {};
        if (!ok) {
          reject(new Error(body.error || `HTTP ${xhr.status}`));
          return;
        }
        resolve(body);
      };
      xhr.onerror = () => reject(new Error('上传失败：网络异常'));
      xhr.send(file);
    }),
    diagnoseLegacy: () => apiRequest('/videos/diagnose-legacy'),
    migrateLegacy: () => apiRequest('/videos/migrate-legacy', { method: 'POST' }),
    clip: (payload) => apiRequest('/videos/clip', { method: 'POST', body: JSON.stringify(payload) }),
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

  // FFmpeg Tools
  ffmpeg: {
    presets: () => apiRequest('/ffmpeg/presets'),
    run: (payload) => apiRequest('/ffmpeg/run', { method: 'POST', body: JSON.stringify(payload) }),
    streamUrl: (filePath) => getApiUrl(`/ffmpeg/stream?path=${encodeURIComponent(filePath)}`),
    downloadUrl: (filePath) => getApiUrl(`/ffmpeg/download?path=${encodeURIComponent(filePath)}`)
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

  // System Monitor
  systemMonitor: {
    getStatus: () => apiRequest('/system-monitor/status')
  },

  // Terminal Console
  terminal: {
    createSession: (payload = {}) => apiRequest('/terminal/sessions', { method: 'POST', body: JSON.stringify(payload) }),
    listSessions: () => apiRequest('/terminal/sessions'),
    getOutput: (sessionId, cursor = 0) => apiRequest(`/terminal/sessions/${encodeURIComponent(sessionId)}/output?cursor=${encodeURIComponent(cursor)}`),
    sendInput: (sessionId, input) => apiRequest(`/terminal/sessions/${encodeURIComponent(sessionId)}/input`, {
      method: 'POST',
      body: JSON.stringify({ input })
    }),
    closeSession: (sessionId) => apiRequest(`/terminal/sessions/${encodeURIComponent(sessionId)}`, { method: 'DELETE' })
  },

  // Documentation
  docs: {
    list: () => apiRequest('/docs/list'),
    getContent: (filename) => apiRequest(`/docs/content?file=${encodeURIComponent(filename)}`),
    sync: () => apiRequest('/docs/sync', { method: 'POST' }),
    search: (query, limit = 30) => apiRequest(`/docs/search?q=${encodeURIComponent(query)}&limit=${encodeURIComponent(limit)}`)
  }
};
