/**
 * AI Service for ResumeAI Pro
 * All AI requests are routed through the Express backend.
 * The server holds the GEMINI_API_KEY — no API keys in the frontend.
 */
import { aiApi } from './api'

/**
 * Enhance Professional Summary via backend AI endpoint.
 * Returns { original, enhanced } — user must explicitly apply.
 */
export async function enhanceSummaryWithAI({ summary, role, skills }) {
  if (!summary || !summary.trim()) {
    throw new Error('Summary text is required.')
  }

  const { data } = await aiApi.enhanceSummary({ summary, role, skills })
  return data // { original, enhanced, _fallback? }
}

/**
 * Enhance Bullet Points via backend AI endpoint.
 * Returns { original, bullets } — user must explicitly apply.
 */
export async function enhanceBulletsWithAI({ bullets, role, company }) {
  if (!bullets || !Array.isArray(bullets) || bullets.length === 0) {
    throw new Error('Bullets array is required.')
  }

  const { data } = await aiApi.enhanceBullets({ bullets, role, company })
  return data // { original, bullets, _fallback? }
}

/**
 * Generic section enhancement via backend AI endpoint.
 * Returns { original, enhanced } — user must explicitly apply.
 */
export async function enhanceSectionWithAI({ section, content, context }) {
  if (!section || !content) {
    throw new Error('Section and content are required.')
  }

  const { data } = await aiApi.enhance({ section, content, context })
  return data // { original, enhanced, _fallback? }
}

/**
 * Generate cover letter via dedicated backend AI endpoint.
 * Returns the generated letter string or null on failure.
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

