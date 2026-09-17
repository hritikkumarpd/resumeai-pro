const router = require('express').Router()
const { optionalAuth } = require('../middleware/requireAuth')
const { callGemini, isGeminiAvailable } = require('../lib/gemini')

// Startup check: warn if GEMINI_API_KEY is not configured
if (!isGeminiAvailable()) {
  console.warn('⚠️  GEMINI_API_KEY not set — AI features will use basic fallback (no Gemini)')
} else {
  console.log('🤖 Gemini AI initialized with gemini-3.6-flash')
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
router.post('/enhance-summary', optionalAuth, async (req, res) => {
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

  // Fallback: basic word-swap improvement (no AI)
  const fallback = fallbackEnhanceSummary(summary, role, skills)
  res.json({
    original: summary,
    enhanced: fallback,
    _fallback: true,
    _fallback_reason: isGeminiAvailable() ? 'Gemini returned no result' : 'GEMINI_API_KEY not configured on server',
  })
})

/* ── POST /api/ai/enhance-bullets ──────────────────────────── */
router.post('/enhance-bullets', optionalAuth, async (req, res) => {
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

  // Fallback: basic word-swap improvement (no AI)
  const enhanced = fallbackEnhanceBullets(bullets)
  res.json({
    original: bullets,
    bullets: enhanced,
    _fallback: true,
    _fallback_reason: isGeminiAvailable() ? 'Gemini returned no result' : 'GEMINI_API_KEY not configured on server',
  })
})

/* ── POST /api/ai/enhance ──────────────────────────────────── */
router.post('/enhance', optionalAuth, async (req, res) => {
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
    _fallback_reason: isGeminiAvailable() ? 'Gemini returned no result' : 'GEMINI_API_KEY not configured on server',
  })
})

/* ── POST /api/ai/cover-letter ─────────────────────────────── */
router.post('/cover-letter', optionalAuth, async (req, res) => {
  const { name, role, company, skills, experience, tone } = req.body

  if (!role || !company) {
    return res.status(400).json({ error: 'Job role and company name are required.' })
  }

  const skillList = skills || 'relevant technical and interpersonal skills'
  const expText = experience || 'relevant professional experience'
  const toneText = tone || 'Professional'
  const applicantName = name || 'the applicant'

  const prompt = `You are an expert career coach and professional cover letter writer.
Write a complete, professional cover letter for ${applicantName} applying for the "${role}" position at ${company}.

Applicant Details:
- Name: ${applicantName}
- Key Skills: ${skillList}
- Experience: ${expText}
- Desired Tone: ${toneText}

CRITICAL RULES:
- Write a COMPLETE cover letter with date, greeting, 3-4 body paragraphs, and closing.
- Match the tone: ${toneText} (Professional = formal, Enthusiastic = energetic, Confident = assertive, Humble = modest).
- Mention the company name "${company}" and the role "${role}" naturally.
- Highlight the applicant's skills: ${skillList}.
- DO NOT fabricate specific metrics, company names, or achievements the applicant did not provide.
- DO NOT use generic placeholder text like "[Your Name]" or "[Address]".
- Use the applicant's actual name: ${applicantName}.
- Output ONLY the cover letter text. No markdown formatting, no code blocks, no preamble.
- Start with today's date, then the greeting.`

  try {
    const letter = await callGemini(prompt, 1500)
    if (letter) {
      const cleaned = letter
        .replace(/^```[\s\S]*?\n/, '')
        .replace(/```\s*$/, '')
        .replace(/^["']|["']$/g, '')
        .trim()
      return res.json({ letter: cleaned })
    }
  } catch (err) {
    console.warn('Gemini cover letter error:', err.message)
  }

  // Smart template fallback when Gemini is unavailable
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const openings = {
    Professional: `I am writing to express my strong interest in the ${role} position at ${company}.`,
    Enthusiastic: `I was thrilled to discover the ${role} opening at ${company} and am excited to apply!`,
    Confident:    `With ${expText} of proven expertise, I am the ideal candidate for the ${role} role at ${company}.`,
    Humble:       `I am honored to apply for the ${role} position at ${company} and believe I can make a meaningful contribution.`,
  }
  const opening = openings[toneText] || openings.Professional

  const fallbackLetter = `${today}

Hiring Manager
${company}

Dear Hiring Manager,

${opening}

Throughout my career${experience ? ` spanning ${experience}` : ''}, I have developed a strong foundation in ${skillList}. My background has equipped me with the technical depth and collaborative mindset to deliver exceptional results and contribute meaningfully to ${company}'s mission and goals.

In my previous roles, I have consistently demonstrated the ability to solve complex problems, collaborate with cross-functional teams, and drive measurable outcomes. I am particularly drawn to ${company} because of your reputation for innovation and commitment to excellence — values that deeply align with my own professional philosophy.

I am confident that my expertise in ${skillList} would make me a valuable addition to your team. I look forward to the opportunity to bring my unique perspective and skills to the ${role} position and contribute to ${company}'s continued success.

Thank you for considering my application. I would welcome the opportunity to discuss how my background and enthusiasm align with your needs. Please feel free to reach out at your earliest convenience.

Warm regards,

${applicantName}
${role} Applicant`

  res.json({
    letter: fallbackLetter,
    _fallback: true,
    _fallback_reason: isGeminiAvailable() ? 'Gemini returned no result' : 'GEMINI_API_KEY not configured — using smart template',
  })
})

module.exports = router
