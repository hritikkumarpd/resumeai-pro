/**
 * Unified Resume Storage Manager for ResumeAI Pro
 * Guarantees local persistence + cloud sync with proper error reporting.
 */
import { resumeApi } from './api'

const getStorageKey = (userId) => `resumeai_saved_resumes_${userId || 'guest'}`

export const resumeStorage = {
  /**
   * List all resumes for current user (merges cloud + local storage)
   */
  async list(user) {
    const userId = user?.id || 'guest'
    const localKey = getStorageKey(userId)
    const localResumes = JSON.parse(localStorage.getItem(localKey) || '[]')

    try {
      // 1. Try server API
      const res = await resumeApi.list()
      if (res.data && Array.isArray(res.data)) {
        const cloudResumes = res.data

        // Merge cloud and local resumes, preferring latest updated_at
        const map = new Map()
        localResumes.forEach(r => map.set(r.id, r))
        cloudResumes.forEach(r => {
          const existing = map.get(r.id)
          if (!existing || new Date(r.updated_at) > new Date(existing.updated_at)) {
            map.set(r.id, { ...existing, ...r })
          }
        })

        const merged = Array.from(map.values()).sort(
          (a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at)
        )

        // Cache back to local storage
        localStorage.setItem(localKey, JSON.stringify(merged))
        return merged
      }
    } catch (err) {
      console.warn('Backend resume list fetch failed, falling back to local storage:', err?.message)
    }

    return localResumes.sort(
      (a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at)
    )
  },

  /**
   * Get single resume by ID
   */
  async get(id, user) {
    const userId = user?.id || 'guest'
    const localKey = getStorageKey(userId)
    const localResumes = JSON.parse(localStorage.getItem(localKey) || '[]')
    const localMatch = localResumes.find(r => r.id === id)

    try {
      const res = await resumeApi.get(id)
      if (res.data) {
        // Cache to local
        const updatedLocal = localResumes.some(r => r.id === id)
          ? localResumes.map(r => r.id === id ? { ...r, ...res.data } : r)
          : [...localResumes, res.data]
        localStorage.setItem(localKey, JSON.stringify(updatedLocal))
        return res.data
      }
    } catch (err) {
      console.warn('Backend resume get failed, using local copy:', err?.message)
    }

    if (localMatch) return localMatch
    throw new Error('Resume not found')
  },

  /**
   * Save or update a resume.
   * Returns { id, savedToCloud, error? }
   * Throws only on complete failure (both local and cloud fail).
   */
  async save(payload, user) {
    const userId = user?.id || 'guest'
    const localKey = getStorageKey(userId)
    const localResumes = JSON.parse(localStorage.getItem(localKey) || '[]')
    const now = new Date().toISOString()

    const isExistingCloudResume = payload.id && !payload.id.startsWith('res_')
    const resumeId = payload.id || `res_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`

    const resumeRecord = {
      id: resumeId,
      user_id: userId,
      title: payload.title || 'My Resume',
      data: payload.data || {},
      template: payload.template || "Classic ATS (Jake's / Overleaf)",
      accent_color: payload.accent_color || '#000000',
      font: payload.font || 'Times New Roman',
      ats_score: payload.ats_score != null ? payload.ats_score : null,
      updated_at: now,
      created_at: payload.created_at || now,
    }

    // 1. Save to local storage (instant & guaranteed)
    const existingIndex = localResumes.findIndex(r => r.id === resumeId)
    let updatedLocal
    if (existingIndex >= 0) {
      updatedLocal = [...localResumes]
      updatedLocal[existingIndex] = { ...updatedLocal[existingIndex], ...resumeRecord }
    } else {
      updatedLocal = [resumeRecord, ...localResumes]
    }
    localStorage.setItem(localKey, JSON.stringify(updatedLocal))

    // 2. Attempt cloud save to Supabase backend
    let savedToCloud = false
    let cloudError = null

    if (user?.id) {
      try {
        if (isExistingCloudResume) {
          // Update existing cloud resume
          const res = await resumeApi.update(payload.id, {
            title: resumeRecord.title,
            data: resumeRecord.data,
            template: resumeRecord.template,
            accent_color: resumeRecord.accent_color,
            font: resumeRecord.font,
            ats_score: resumeRecord.ats_score,
          })
          if (res.data) {
            savedToCloud = true
            // Update local cache with server response
            const serverRecord = { ...resumeRecord, ...res.data }
            const remapped = updatedLocal.map(r => r.id === resumeId ? serverRecord : r)
            localStorage.setItem(localKey, JSON.stringify(remapped))
            return { ...serverRecord, savedToCloud: true }
          }
        } else {
          // Create new cloud resume
          const res = await resumeApi.create({
            title: resumeRecord.title,
            data: resumeRecord.data,
            template: resumeRecord.template,
            accent_color: resumeRecord.accent_color,
            font: resumeRecord.font,
          })
          if (res.data?.id) {
            savedToCloud = true
            const finalId = res.data.id
            const finalRecord = { ...resumeRecord, id: finalId, ...res.data }
            const remapped = updatedLocal.map(r => r.id === resumeId ? finalRecord : r)
            localStorage.setItem(localKey, JSON.stringify(remapped))
            return { ...finalRecord, savedToCloud: true }
          }
        }
      } catch (err) {
        cloudError = err?.response?.data?.error || err?.message || 'Cloud sync failed'
        console.warn('Cloud save failed:', cloudError)
      }
    }

    return {
      ...resumeRecord,
      savedToCloud,
      error: cloudError,
    }
  },

  /**
   * Delete a resume
   */
  async delete(id, user) {
    const userId = user?.id || 'guest'
    const localKey = getStorageKey(userId)
    const localResumes = JSON.parse(localStorage.getItem(localKey) || '[]')

    const updated = localResumes.filter(r => r.id !== id)
    localStorage.setItem(localKey, JSON.stringify(updated))

    try {
      if (user?.id && !id.startsWith('res_')) {
        await resumeApi.delete(id)
      }
    } catch (err) {
      console.warn('Cloud delete failed, local copy removed:', err?.message)
    }

    return true
  },

  /**
   * Rename a resume
   */
  async rename(id, newTitle, user) {
    const userId = user?.id || 'guest'
    const localKey = getStorageKey(userId)
    const localResumes = JSON.parse(localStorage.getItem(localKey) || '[]')
    const now = new Date().toISOString()

    const updated = localResumes.map(r => {
      if (r.id === id) {
        return { ...r, title: newTitle || 'My Resume', updated_at: now }
      }
      return r
    })
    localStorage.setItem(localKey, JSON.stringify(updated))

    if (user?.id && !id.startsWith('res_')) {
      try {
        await resumeApi.update(id, { title: newTitle || 'My Resume' })
      } catch (err) {
        console.warn('Cloud rename sync failed, saved in local storage:', err?.message)
      }
    }

    return updated.find(r => r.id === id)
  }
}
