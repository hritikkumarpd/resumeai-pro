/**
 * Unified Resume Storage Manager for ResumeAI Pro
 * Guarantees local persistence + cloud sync with proper error reporting.
 */
import { resumeApi } from './api'

const getStorageKey = (userId) => `resumeai_saved_resumes_${userId || 'guest'}`

const readLocal = (key) => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(value) ? value : []
  } catch (err) {
    console.warn('Invalid local resume cache; starting with an empty cache:', err?.message)
    return []
  }
}

const writeLocal = (key, records) => {
  try {
    localStorage.setItem(key, JSON.stringify(records))
    return true
  } catch (err) {
    console.error('Unable to persist resume cache:', err?.message)
    return false
  }
}

export const resumeStorage = {
  /**
   * List all resumes for current user (merges cloud + local storage)
   */
  async list(user) {
    const userId = user?.id || 'guest'
    const localKey = getStorageKey(userId)
    const localResumes = readLocal(localKey)

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
        writeLocal(localKey, merged)
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
        writeLocal(localKey, updatedLocal)
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
            const latestLocal = readLocal(localKey)
            const latestDraft = latestLocal.find(r => r.id === resumeId)
            const preferredRecord = latestDraft && Date.parse(latestDraft.updated_at || 0) > Date.parse(serverRecord.updated_at || 0)
              ? latestDraft : serverRecord
            const remapped = latestLocal.map(r => r.id === resumeId ? preferredRecord : r)
            writeLocal(localKey, remapped)
            return { ...preferredRecord, savedToCloud: true }
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
            const latestLocal = readLocal(localKey)
            const latestDraft = latestLocal.find(r => r.id === resumeId) || resumeRecord
            const preferredRecord = { ...finalRecord, ...latestDraft, id: finalId, savedToCloud: true }
            const remapped = latestLocal.map(r => r.id === resumeId ? preferredRecord : r)
            writeLocal(localKey, remapped)
            return preferredRecord
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
    writeLocal(localKey, updated)

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
  },

  /**
   * Synchronous local-only save for beforeunload flush.
   * No async cloud calls — guarantees localStorage persistence
   * even when the browser is shutting down.
   */
  saveLocal(payload, user) {
    const userId = user?.id || 'guest'
    const localKey = getStorageKey(userId)
    const now = new Date().toISOString()

    try {
      const localResumes = JSON.parse(localStorage.getItem(localKey) || '[]')
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

      const existingIndex = localResumes.findIndex(r => r.id === resumeId)
      if (existingIndex >= 0) {
        localResumes[existingIndex] = { ...localResumes[existingIndex], ...resumeRecord }
      } else {
        localResumes.unshift(resumeRecord)
      }
      writeLocal(localKey, localResumes)
      return resumeRecord
    } catch (err) {
      console.error('saveLocal failed:', err)
      return null
    }
  }
}
