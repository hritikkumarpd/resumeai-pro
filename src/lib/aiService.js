/**
 * AI Service for ResumeAI Pro
 * All AI requests are routed through the Express backend.
 * The server holds the GEMINI_API_KEY — no API keys in the frontend.
 */
import { aiApi, API_BASE } from './api'
import { supabase } from './supabase'

/**
 * Generic SSE stream reader for AI endpoints.
 * @param {string} endpoint - e.g. '/ai/stream/cover-letter'
 * @param {object} payload - request body
 * @param {object} options - { onChunk, onDone, onError, signal }
 */
export async function streamAiRequest(endpoint, payload, { onChunk, onDone, onError, signal } = {}) {
  let token = null
  try {
    const { data: { session } } = await supabase.auth.getSession()
    token = session?.access_token
  } catch (_) {}

  const url = `${API_BASE}${endpoint}`
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(payload),
      signal,
    })

    if (!response.ok) {
      let errMessage = `AI generation failed (Status ${response.status})`
      try {
        const errJson = await response.json()
        if (errJson?.error) errMessage = errJson.error
      } catch (_) {}
      const error = new Error(errMessage)
      if (onError) onError(error)
      throw error
    }

    if (!response.body) {
      throw new Error('Streaming not supported in this browser environment.')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let fullText = ''
    let doneResult = null

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data:')) continue
        const jsonStr = trimmed.slice(5).trim()
        if (!jsonStr) continue

        try {
          const parsed = JSON.parse(jsonStr)
          if (parsed.error) {
            const err = new Error(parsed.error)
            if (onError) onError(err)
            throw err
          }
          if (parsed.chunk) {
            fullText += parsed.chunk
            if (onChunk) onChunk(parsed.chunk, fullText)
          }
          if (parsed.done) {
            doneResult = parsed
          }
        } catch (parseErr) {
          if (parseErr.message && !parseErr.message.includes('JSON')) {
            throw parseErr
          }
        }
      }
    }

    if (buffer.trim().startsWith('data:')) {
      try {
        const parsed = JSON.parse(buffer.trim().slice(5).trim())
        if (parsed.chunk) {
          fullText += parsed.chunk
          if (onChunk) onChunk(parsed.chunk, fullText)
        }
        if (parsed.done) {
          doneResult = parsed
        }
      } catch (_) {}
    }

    const finalResult = doneResult || { done: true, fullText }
    if (onDone) onDone(finalResult, fullText)
    return finalResult
  } catch (err) {
    if (onError) onError(err)
    throw err
  }
}

/**
 * Stream Cover Letter in real-time.
 */
export async function streamCoverLetterWithAI(data, { onChunk, onDone, onError, signal } = {}) {
  return streamAiRequest('/ai/stream/cover-letter', data, { onChunk, onDone, onError, signal })
}

/**
 * Stream Summary Enhancement in real-time.
 */
export async function streamEnhanceSummaryWithAI(data, { onChunk, onDone, onError, signal } = {}) {
  return streamAiRequest('/ai/stream/enhance-summary', data, { onChunk, onDone, onError, signal })
}

/**
 * Stream Bullets Enhancement in real-time.
 */
export async function streamEnhanceBulletsWithAI(data, { onChunk, onDone, onError, signal } = {}) {
  return streamAiRequest('/ai/stream/enhance-bullets', data, { onChunk, onDone, onError, signal })
}

/**
 * Stream Section (e.g. Project) Enhancement in real-time.
 */
export async function streamEnhanceSectionWithAI(data, { onChunk, onDone, onError, signal } = {}) {
  return streamAiRequest('/ai/stream/enhance', data, { onChunk, onDone, onError, signal })
}

/**
 * Enhance Professional Summary via backend AI endpoint (Promise-based).
 */
export async function enhanceSummaryWithAI({ summary, role, skills }) {
  if (!summary || !summary.trim()) {
    throw new Error('Summary text is required.')
  }

  const { data } = await aiApi.enhanceSummary({ summary, role, skills })
  return data
}

/**
 * Enhance Bullet Points via backend AI endpoint (Promise-based).
 */
export async function enhanceBulletsWithAI({ bullets, role, company }) {
  if (!bullets || !Array.isArray(bullets) || bullets.length === 0) {
    throw new Error('Bullets array is required.')
  }

  const { data } = await aiApi.enhanceBullets({ bullets, role, company })
  return data
}

/**
 * Generic section enhancement via backend AI endpoint (Promise-based).
 */
export async function enhanceSectionWithAI({ section, content, context }) {
  if (!section || !content) {
    throw new Error('Section and content are required.')
  }

  const { data } = await aiApi.enhance({ section, content, context })
  return data
}

/**
 * Generate cover letter via dedicated backend AI endpoint (Promise-based).
 */
export async function generateCoverLetterWithAI({ name, role, company, skills, experience, tone }) {
  try {
    const { data } = await aiApi.coverLetter({
      name,
      role,
      company,
      skills,
      experience,
      tone,
    })
    if (data?.letter) {
      return data.letter
    }
  } catch (err) {
    console.warn('Backend cover letter AI error:', err?.response?.data?.error || err?.message)
  }
  return null
}


