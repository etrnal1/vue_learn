// API 辅助函数
const API_BASE = '/api';

async function apiRequest(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
}

export const api = {
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
  }
};
