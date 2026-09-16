const router = require('express').Router()
const { requireAuth } = require('../middleware/requireAuth')

/**
 * Call Google Gemini API with the server-side API key.
 * User-supplied keys are NOT accepted — all AI goes through server key.
 */
async function callGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return null
  }

  const models = ['gemini-2.0-flash', 'gemini-1.5-flash']

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 800 }
        })
      })
      if (response.ok) {
        const data = await response.json()
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
        if (text) return text
      }
    } catch (_) {
      // Try next model
    }
  }
  return null
}

/**
 * Development fallback: improve summary without fabricating information.
 * Used ONLY when GEMINI_API_KEY is not configured.
 */
function fallbackEnhanceSummary(summary, role, skills) {
  const cleanRole = role || 'Technical Professional'
  const skillsStr = (skills && skills.length > 0) ? skills.slice(0, 6).join(', ') : ''

  const raw = (summary || '').trim()
  if (!raw) {
    const parts = [`Results-driven ${cleanRole} with a strong foundation in building scalable technical solutions.`]
    if (skillsStr) parts.push(`Demonstrated expertise in ${skillsStr}.`)
    parts.push('Committed to engineering excellence, clean architecture, and delivering measurable impact in collaborative agile environments.')
    return parts.join(' ')
  }

  // Light transformation: improve wording without inventing facts
  let enhanced = raw
    .replace(/\b(worked on)\b/gi, 'developed')
    .replace(/\b(responsible for)\b/gi, 'led')
    .replace(/\b(helped with)\b/gi, 'contributed to')
    .replace(/\b(handled)\b/gi, 'managed')
    .replace(/\b(fixed)\b/gi, 'resolved')
    .replace(/\b(i am a|i'm a)\b/gi, '')
    .trim()

  // Capitalize first letter
  enhanced = enhanced.charAt(0).toUpperCase() + enhanced.slice(1)
  if (!enhanced.endsWith('.')) enhanced += '.'

  return enhanced
}

/**
 * Development fallback: improve bullets without fabricating metrics.
 */
function fallbackEnhanceBullets(bullets) {
  return (bullets || []).map(b => {
    let t = (b || '').trim()
    if (!t) return t

    t = t
      .replace(/^(worked on)\s+/i, 'Developed ')
      .replace(/^(helped with)\s+/i, 'Contributed to ')
      .replace(/^(responsible for)\s+/i, 'Led ')
      .replace(/^(handled)\s+/i, 'Managed ')
      .replace(/^(fixed)\s+/i, 'Resolved ')
      .replace(/^(made)\s+/i, 'Built ')
      .replace(/^(wrote)\s+/i, 'Authored ')
      .replace(/^(created)\s+/i, 'Designed and implemented ')

    t = t.charAt(0).toUpperCase() + t.slice(1)
    if (!t.endsWith('.')) t += '.'
    return t
  })
}

/* ── POST /api/ai/enhance-summary ──────────────────────────── */
router.post('/enhance-summary', requireAuth, async (req, res) => {
  const { summary, role, skills } = req.body

  if (!summary || !summary.trim()) {
    return res.status(400).json({ error: 'Summary text is required.' })
  }

  const prompt = `You are an expert resume coach and ATS optimization specialist.
Rewrite and improve this professional summary to be high-impact, ATS-friendly, and concise (3-4 sentences).

Target Role: ${role || 'Software Engineer'}
Key Skills: ${(skills || []).join(', ')}
Current Summary: "${summary}"

CRITICAL RULES:
- DO NOT fabricate metrics, percentages, or numbers the user did not provide.
- DO NOT invent employers, degrees, certifications, or technologies.
- DO NOT add specific percentages like "35%" or "40%" unless the user wrote them.
- Improve grammar, clarity, professional wording, and ATS keyword density.
- Use strong professional language without inventing facts.
- Output ONLY the final summary paragraph. No markdown, quotes, or preambles.`

  try {
    const enhanced = await callGemini(prompt)
    if (enhanced) {
      return res.json({
        original: summary,
        enhanced: enhanced.replace(/^["']|["']$/g, '').trim(),
      })
    }
  } catch (err) {
    console.warn('Gemini API error:', err.message)
  }

  // Development fallback (no API key configured)
  const fallback = fallbackEnhanceSummary(summary, role, skills)
  res.json({
    original: summary,
    enhanced: fallback,
    _fallback: true,
  })
})

/* ── POST /api/ai/enhance-bullets ──────────────────────────── */
router.post('/enhance-bullets', requireAuth, async (req, res) => {
  const { bullets, role, company } = req.body

  if (!bullets || !Array.isArray(bullets) || bullets.length === 0) {
    return res.status(400).json({ error: 'Bullets array is required.' })
  }

  const prompt = `You are an expert resume coach.
Improve each of the following work experience bullet points with strong action verbs and professional language.

Role: ${role || 'Software Engineer'}
Company: ${company || 'Tech Company'}

Original Bullets:
${bullets.map((b, i) => `${i + 1}. ${b}`).join('\n')}

CRITICAL RULES:
- DO NOT fabricate metrics, percentages, or numbers the user did not provide.
- DO NOT invent specific numbers like "35%", "40%", "250k+", etc.
- If the user provided metrics, keep them. If not, do NOT add any.
- Improve grammar, use strong past-tense action verbs (Architected, Engineered, Developed, etc.).
- Keep each bullet concise and impactful.
- Return ONLY the enhanced bullets, one per line. No numbering, no markdown.`

  try {
    const text = await callGemini(prompt)
    if (text) {
      const lines = text.split('\n')
        .map(l => l.replace(/^[-•*\d.]+\s*/, '').trim())
        .filter(Boolean)
      if (lines.length > 0) {
        return res.json({
          original: bullets,
          bullets: lines,
        })
      }
    }
  } catch (err) {
    console.warn('Gemini API error:', err.message)
  }

  // Development fallback
  const enhanced = fallbackEnhanceBullets(bullets)
  res.json({
    original: bullets,
    bullets: enhanced,
    _fallback: true,
  })
})

/* ── POST /api/ai/enhance ──────────────────────────────────── */
router.post('/enhance', requireAuth, async (req, res) => {
  const { section, content, context } = req.body

  if (!section || !content) {
    return res.status(400).json({ error: 'section and content are required.' })
  }

  const sectionPrompts = {
    summary: `Improve this professional summary to be ATS-friendly and impactful (3-4 sentences). Role: ${context?.role || 'Professional'}. Skills: ${(context?.skills || []).join(', ')}.`,
    skills: `Organize and improve this skills list for ATS compatibility. Return as a comma-separated list of skills.`,
    projects: `Improve this project description to highlight technical impact and technologies used. Keep factual.`,
    achievements: `Improve this achievement description with professional language. Keep factual — do not invent metrics.`,
  }

  const systemPrompt = sectionPrompts[section] || 'Improve this resume content professionally.'

  const prompt = `${systemPrompt}

Content to improve:
"${content}"

CRITICAL RULES:
- DO NOT fabricate metrics, percentages, or numbers not in the original.
- DO NOT invent employers, degrees, certifications, or technologies.
- Improve grammar, clarity, and professional wording only.
- Output ONLY the improved content. No markdown, quotes, or preambles.`

  try {
    const enhanced = await callGemini(prompt)
    if (enhanced) {
      return res.json({
        original: content,
        enhanced: enhanced.replace(/^["']|["']$/g, '').trim(),
      })
    }
  } catch (err) {
    console.warn('Gemini API error:', err.message)
  }

  // Fallback: return lightly cleaned content
  let fallback = content.trim()
  fallback = fallback.charAt(0).toUpperCase() + fallback.slice(1)
  if (!fallback.endsWith('.')) fallback += '.'

  res.json({
    original: content,
    enhanced: fallback,
    _fallback: true,
  })
})

module.exports = router
