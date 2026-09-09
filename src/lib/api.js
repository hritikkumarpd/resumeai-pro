/**
 * Axios API client — points to our Express server (Railway/Render).
 * Automatically attaches the Supabase JWT token to every request.
 */
import axios from 'axios'
import { supabase } from './supabase'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000'

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

// ── Request interceptor: attach JWT ─────────────────────────────
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`
  }
  return config
})

// ── Response interceptor: handle 401 ────────────────────────────
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      // Try to refresh session
      const { data } = await supabase.auth.refreshSession()
      if (data?.session) {
        error.config.headers.Authorization = `Bearer ${data.session.access_token}`
        return api.request(error.config)
      }
      // If refresh fails, redirect to login
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

/* ── Auth ───────────────────────────────────────────────────────── */
export const authApi = {
  register:       (data) => api.post('/auth/register', data),
  login:          (data) => api.post('/auth/login', data),
  me:             ()     => api.get('/auth/me'),
  updateProfile:  (data) => api.put('/auth/me', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword:  (data) => api.post('/auth/reset-password', data),
  logout:         ()     => api.post('/auth/logout'),
}

/* ── Resumes ────────────────────────────────────────────────────── */
export const resumeApi = {
  list:      ()         => api.get('/resumes'),
  create:    (data)     => api.post('/resumes', data),
  get:       (id)       => api.get(`/resumes/${id}`),
  update:    (id, data) => api.put(`/resumes/${id}`, data),
  delete:    (id)       => api.delete(`/resumes/${id}`),
  duplicate: (id)       => api.post(`/resumes/${id}/duplicate`),
}

/* ── ATS ────────────────────────────────────────────────────────── */
export const atsApi = {
  analyze:       (data)  => api.post('/ats/analyze', data),
  history:       (params) => api.get('/ats/history', { params }),
  deleteHistory: (id)    => api.delete(`/ats/history/${id}`),
}

/* ── Cover Letters ──────────────────────────────────────────────── */
export const coverLetterApi = {
  list:   ()         => api.get('/cover-letters'),
  create: (data)     => api.post('/cover-letters', data),
  get:    (id)       => api.get(`/cover-letters/${id}`),
  update: (id, data) => api.put(`/cover-letters/${id}`, data),
  delete: (id)       => api.delete(`/cover-letters/${id}`),
}

/* ── PDF ────────────────────────────────────────────────────────── */
export const pdfApi = {
  generate: (resumeData, accentColor, font) =>
    api.post('/pdf/generate', { resumeData, accentColor, font }, {
      responseType: 'blob',
      timeout: 60000,  // PDF generation can take up to 60s
    }),
}

/* ── AI ──────────────────────────────────────────────────────────── */
export const aiApi = {
  enhanceSummary: (data) => api.post('/ai/enhance-summary', data),
  enhanceBullets: (data) => api.post('/ai/enhance-bullets', data),
}

/* ── Payment (Razorpay) ────────────────────────────────────────── */
export const paymentApi = {
  createOrder: (plan) => api.post('/payment/create-order', { plan }),
  verify:      (data) => api.post('/payment/verify', data),
}

export default api
