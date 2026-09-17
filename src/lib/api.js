/**
 * Axios API client — points to our Express server (Railway/Render).
 * Automatically attaches the Supabase JWT token to every request.
 */
import axios from 'axios'
import { supabase } from './supabase'

const rawApiBase = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/+$/, '')
const API_BASE = rawApiBase.endsWith('/api') ? rawApiBase : `${rawApiBase}/api`

const api = axios.create({
  baseURL: API_BASE,
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
    const isExempt = error.config?.url?.includes('/auth/login') ||
                     error.config?.url?.includes('/auth/register') ||
                     error.config?.url?.includes('/auth/forgot-password') ||
                     error.config?.url?.includes('/ai/') ||
                     error.config?.url?.includes('/ats/')

    if (error.response?.status === 401 && !isExempt) {
      // Try to refresh session
      try {
        const { data } = await supabase.auth.refreshSession()
        if (data?.session) {
          error.config.headers.Authorization = `Bearer ${data.session.access_token}`
          return api.request(error.config)
        }
      } catch (_) {}

      // If refresh fails and not already on /login or work-in-progress pages, redirect
      const safePages = ['/login', '/register', '/builder', '/ats', '/cover-letter']
      if (!safePages.some(p => window.location.pathname.startsWith(p))) {
        window.location.href = '/login'
      }
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
  analyze:        (data)   => api.post('/ats/analyze', data),
  analyzeResume:  (data)   => api.post('/ats/analyze-resume', data),
  history:        (params) => api.get('/ats/history', { params }),
  deleteHistory:  (id)     => api.delete(`/ats/history/${id}`),
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
  /** Render client-side HTML into a vector PDF via backend Puppeteer (auto-attaches JWT) */
  renderHtml: (html, name) =>
    api.post('/pdf/render-html', { html, name }, {
      responseType: 'blob',
      timeout: 60000,
    }),
  /** Get current month's export usage for the authenticated user */
  quota: () => api.get('/pdf/quota'),
}

/* ── AI ──────────────────────────────────────────────────────────── */
export const aiApi = {
  enhanceSummary: (data) => api.post('/ai/enhance-summary', data),
  enhanceBullets: (data) => api.post('/ai/enhance-bullets', data),
  enhance:        (data) => api.post('/ai/enhance', data),
  coverLetter:    (data) => api.post('/ai/cover-letter', data),
}

/* ── Payment (Razorpay Standard Checkout) ───────────────────────── */
export const paymentApi = {
  createOrder: async (planOrOptions) => {
    const payload = typeof planOrOptions === 'string' ? { plan: planOrOptions } : { ...planOrOptions }
    const planKey = payload.plan
    const legacyPlanMap = {
      monthly: 'pro_monthly',
      yearly:  'pro_yearly',
    }

    try {
      return await api.post('/payment/create-order', payload)
    } catch (err) {
      // If backend is running older code expecting pro_monthly / pro_yearly
      if (err.response?.status === 400 && (err.response?.data?.error?.includes('pro_monthly') || err.response?.data?.error?.includes('Valid plans'))) {
        const legacyPlan = legacyPlanMap[planKey] || `pro_${planKey}`
        return await api.post('/payment/create-order', { ...payload, plan: legacyPlan })
      }
      if (err.response?.status === 404) {
        return await api.post('/create-order', payload)
      }
      throw err
    }
  },
  verify: async (data) => {
    try {
      return await api.post('/payment/verify-payment', data)
    } catch (err) {
      if (err.response?.status === 404) {
        try {
          return await api.post('/payment/verify', data)
        } catch (e2) {
          if (e2.response?.status === 404) {
            return await api.post('/verify-payment', data)
          }
          throw e2
        }
      }
      throw err
    }
  },
}

/* ── Admin ─────────────────────────────────────────────────────── */
export const adminApi = {
  getStats: (secret) =>
    api.get('/admin/stats', {
      headers: { 'X-Admin-Secret': secret }
    }),
  getUsers: (secret, page = 0, search = '') =>
    api.get('/admin/users', {
      headers: { 'X-Admin-Secret': secret },
      params: { page, search }
    }),
  updateUserPlan: (secret, id, plan) =>
    api.put(`/admin/users/${id}/plan`, { plan }, {
      headers: { 'X-Admin-Secret': secret }
    }),
  deleteUser: (secret, id) =>
    api.delete(`/admin/users/${id}`, {
      headers: { 'X-Admin-Secret': secret }
    }),
  getResumes: (secret) =>
    api.get('/admin/resumes', {
      headers: { 'X-Admin-Secret': secret }
    }),
}

export default api
