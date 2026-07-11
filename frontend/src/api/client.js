import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
})

// ── Request interceptor — attach Bearer token ────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Response interceptor — handle 401 ────────────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const status = err.response?.status
    if (status === 401) {
      // Try refreshing
      const refreshToken = localStorage.getItem('refresh_token')
      if (refreshToken && !err.config._retried) {
        err.config._retried = true
        try {
          const { data } = await axios.post(`${API_BASE}/auth/refresh`, {
            refresh_token: refreshToken,
          })
          localStorage.setItem('access_token', data.access_token)
          localStorage.setItem('refresh_token', data.refresh_token)
          err.config.headers.Authorization = `Bearer ${data.access_token}`
          return api(err.config)
        } catch {
          // Refresh failed — force logout
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          window.dispatchEvent(new Event('auth:logout'))
        }
      } else {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        window.dispatchEvent(new Event('auth:logout'))
      }
    }
    return Promise.reject(err)
  }
)

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  refresh: (data) => api.post('/auth/refresh', data),
  logout: () => api.post('/auth/logout'),
  oauthSync: (supabase_token) => api.post('/auth/oauth-sync', { supabase_token }),
}

// ── Users ─────────────────────────────────────────────────────────────────────
export const usersApi = {
  me: () => api.get('/users/me'),
  update: (data) => api.patch('/users/me', data),
}

// ── Videos ───────────────────────────────────────────────────────────────────
export const videosApi = {
  create: (data) => api.post('/videos/', data),
  list: (params) => api.get('/videos/', { params }),
  get: (id) => api.get(`/videos/${id}`),
  getJobs: (id) => api.get(`/videos/${id}/jobs`),
  delete: (id) => api.delete(`/videos/${id}`),
}
