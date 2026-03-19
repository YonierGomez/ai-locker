import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const msg = err.response?.data?.error || err.message || 'Request failed'
    return Promise.reject(new Error(msg))
  }
)

// ── Prompts ──
export const promptsApi = {
  list: (params) => api.get('/prompts', { params }),
  get: (id) => api.get(`/prompts/${id}`),
  create: (data) => api.post('/prompts', data),
  update: (id, data) => api.put(`/prompts/${id}`, data),
  toggleFavorite: (id) => api.patch(`/prompts/${id}/favorite`),
  incrementUse: (id) => api.patch(`/prompts/${id}/use`),
  delete: (id) => api.delete(`/prompts/${id}`),
}

// ── Skills ──
export const skillsApi = {
  list: (params) => api.get('/skills', { params }),
  get: (id) => api.get(`/skills/${id}`),
  create: (data) => api.post('/skills', data),
  update: (id, data) => api.put(`/skills/${id}`, data),
  toggleFavorite: (id) => api.patch(`/skills/${id}/favorite`),
  toggle: (id) => api.patch(`/skills/${id}/toggle`),
  delete: (id) => api.delete(`/skills/${id}`),
}

// ── Steering ──
export const steeringApi = {
  list: (params) => api.get('/steering', { params }),
  get: (id) => api.get(`/steering/${id}`),
  create: (data) => api.post('/steering', data),
  update: (id, data) => api.put(`/steering/${id}`, data),
  toggleFavorite: (id) => api.patch(`/steering/${id}/favorite`),
  toggle: (id) => api.patch(`/steering/${id}/toggle`),
  delete: (id) => api.delete(`/steering/${id}`),
}

// ── MCP ──
export const mcpApi = {
  list: (params) => api.get('/mcp', { params }),
  get: (id) => api.get(`/mcp/${id}`),
  create: (data) => api.post('/mcp', data),
  update: (id, data) => api.put(`/mcp/${id}`, data),
  toggleFavorite: (id) => api.patch(`/mcp/${id}/favorite`),
  toggle: (id) => api.patch(`/mcp/${id}/toggle`),
  delete: (id) => api.delete(`/mcp/${id}`),
  exportActive: () => api.get('/mcp/export/active'),
}

// ── Commands ──
export const commandsApi = {
  list: (params) => api.get('/commands', { params }),
  get: (id) => api.get(`/commands/${id}`),
  create: (data) => api.post('/commands', data),
  update: (id, data) => api.put(`/commands/${id}`, data),
  toggleFavorite: (id) => api.patch(`/commands/${id}/favorite`),
  incrementUse: (id) => api.patch(`/commands/${id}/use`),
  delete: (id) => api.delete(`/commands/${id}`),
}

// ── Tags ──
export const tagsApi = {
  list: () => api.get('/tags'),
  create: (data) => api.post('/tags', data),
  update: (id, data) => api.put(`/tags/${id}`, data),
  delete: (id) => api.delete(`/tags/${id}`),
}

// ── Categories ──
export const categoriesApi = {
  list: (params) => api.get('/categories', { params }),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
}

// ── Settings ──
export const settingsApi = {
  get: () => api.get('/settings'),
  update: (data) => api.put('/settings', data),
  stats: () => api.get('/settings/stats'),
}

// ── Trash ──
export const trashApi = {
  list: () => api.get('/trash'),
  count: () => api.get('/trash/count'),
  restore: (type, id) => api.patch(`/trash/${type}/${id}/restore`),
  deletePermanent: (type, id) => api.delete(`/trash/${type}/${id}`),
  empty: () => api.delete('/trash'),
  cleanup: () => api.post('/trash/cleanup'),
}

// ── Backup / S3 ──
export const backupApi = {
  exportJson: () => window.open('/api/backup/export/json', '_blank'),
  importJson: (data, merge = false) => api.post(`/backup/import/json?merge=${merge}`, data),
  s3Upload: () => api.post('/backup/s3/upload'),
  s3List: () => api.get('/backup/s3/list'),
  s3Restore: (key, merge = false) => api.post('/backup/s3/restore', { key, merge }),
  s3Test: (config) => api.post('/backup/s3/test', config),
  s3Status: () => api.get('/backup/s3/status'),
}

export default api
