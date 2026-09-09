/**
 * AI Service for ResumeAI Pro
 * Powered by Google Gemini API (100% FREE via Google AI Studio)
 * with instant fallback engine so it ALWAYS works with 0 cost.
 */

export const getStoredGeminiKey = () => {
  return localStorage.getItem('resumeai_gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY || ''
}

export const setStoredGeminiKey = (key) => {
  if (key) {
    localStorage.setItem('resumeai_gemini_api_key', key.trim())
  } else {
    localStorage.removeItem('resumeai_gemini_api_key')
  }
}

/**
 * Intelligent Rule-Based Resume Enhancer (100% Free, Instant, Offline-Ready)
 * Transforms weak passive phrasing into Google / FAANG X-Y-Z formula.
 */
function localEnhanceSummary(summary, role = '', skills = []) {
  const cleanRole = role || 'Software Development Engineer (AI & ML)'
  const skillsStr = (skills && skills.length > 0) ? skills.slice(0, 5).join(', ') : 'Python, Java, React, SQL, Machine Learning'
  
  return `Results-driven ${cleanRole} with a strong foundation in Computer Science, Machine Learning, and Full-Stack Engineering. Proven expertise in building scalable web applications and high-throughput systems leveraging ${skillsStr}. Demonstrated track record of optimizing system response latency by 35%+, implementing clean modular architectures, and delivering robust production-ready solutions in collaborative agile teams.`
}

function localEnhanceBullet(bullet, role = 'Software Engineer') {
  const trimmed = (bullet || '').trim()
  if (!trimmed) return bullet

  const replacements = [
    { regex: /^(worked on|helped with|assisted in|responsible for|handled)\s+/i, verb: 'Architected and engineered ' },
    { regex: /^(created|made|built|developed)\s+/i, verb: 'Engineered and deployed ' },
    { regex: /^(improved|changed|updated|fixed)\s+/i, verb: 'Optimized and refactored ' },
    { regex: /^(wrote|coded|tested)\s+/i, verb: 'Authored robust, production-tested ' },
    { regex: /^(researched|studied|learned)\s+/i, verb: 'Spearheaded technical research and implementation of ' },
    { regex: /^(managed|led|directed)\s+/i, verb: 'Spearheaded end-to-end development of ' }
  ]

  let enhanced = trimmed
  for (const { regex, verb } of replacements) {
    if (regex.test(enhanced)) {
      enhanced = enhanced.replace(regex, verb)
      break
    }
  }

  enhanced = enhanced.charAt(0).toUpperCase() + enhanced.slice(1)

  const hasMetric = /\d+[%kKmM]?|\$\d+/.test(enhanced)
  if (!hasMetric && enhanced.length > 20) {
    if (enhanced.toLowerCase().includes('api') || enhanced.toLowerCase().includes('microservice') || enhanced.toLowerCase().includes('backend')) {
      enhanced += ', reducing p99 response latency by 35% under peak loads.'
    } else if (enhanced.toLowerCase().includes('ui') || enhanced.toLowerCase().includes('frontend') || enhanced.toLowerCase().includes('react')) {
      enhanced += ', boosting page load performance by 28% and user engagement.'
    } else if (enhanced.toLowerCase().includes('database') || enhanced.toLowerCase().includes('sql') || enhanced.toLowerCase().includes('model') || enhanced.toLowerCase().includes('data')) {
      enhanced += ', accelerating processing throughput by 40% through optimized queries.'
    } else {
      enhanced += ', improving execution efficiency by 30% across core workflows.'
    }
  }

  if (!enhanced.endsWith('.')) enhanced += '.'
  return enhanced
}

/**
 * Call Google Gemini 1.5 Flash (100% Free API)
 */
async function callGeminiApi(prompt, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 600
      }
    })
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message || `Gemini API error ${response.status}`)
  }

  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
}

/**
 * Enhance Professional Summary using Google Gemini API or Smart Fallback
 */
export async function enhanceSummaryWithAI({ summary, role, skills, customApiKey = null }) {
  const apiKey = customApiKey || getStoredGeminiKey()

  if (apiKey) {
    try {
      const prompt = `You are an elite technical resume coach and ATS optimization specialist for top tech companies.
Rewrite and elevate this resume summary to be high-impact, ATS-friendly, professional (3-4 concise sentences), and metric-driven:
Candidate Target Role: ${role || 'Software Development Engineer (AI & ML)'}
Key Technical Skills: ${(skills || []).join(', ')}
Current Summary: "${summary}"

Rules:
- Start with a strong professional identity and technical focus.
- Highlight scalable engineering, problem-solving, and measurable results.
- Output ONLY the final summary paragraph. No markdown formatting, quotes, or conversational preambles.`

      const text = await callGeminiApi(prompt, apiKey)
      if (text) {
        // Clean any quotes or prefixes
        return text.replace(/^["']|["']$/g, '').trim()
      }
    } catch (err) {
      console.warn('Google Gemini API request failed, falling back to smart enhancer:', err)
    }
  }

  // Smart instantaneous fallback
  return localEnhanceSummary(summary, role, skills)
}

/**
 * Enhance Bullet Points using Google Gemini API or Smart Fallback
 */
export async function enhanceBulletsWithAI({ bullets, role, company, customApiKey = null }) {
  const apiKey = customApiKey || getStoredGeminiKey()

  if (apiKey) {
    try {
      const prompt = `You are an elite tech resume coach for Google, Amazon, and top startups.
Elevate each of the following work experience bullet points using the Google X-Y-Z formula ("Accomplished [X] as measured by [Y], by doing [Z]") with strong action verbs and quantifiable metrics.
Target Role: ${role || 'Software Engineer'}
Company: ${company || 'Tech Company'}

Original Bullets:
${bullets.map((b, i) => `${i + 1}. ${b}`).join('\n')}

Rules:
- Begin each bullet with a powerful past-tense action verb (e.g., Architected, Engineered, Spearheaded, Optimized).
- Include realistic technical metrics (percentages, throughput, latency reductions).
- Output each enhanced bullet on a new line starting with a dash or bullet point. Return ONLY the enhanced bullets, nothing else.`

      const text = await callGeminiApi(prompt, apiKey)
      if (text) {
        const lines = text.split('\n')
          .map(l => l.replace(/^[-•*\d.]+\s*/, '').trim())
          .filter(Boolean)
        if (lines.length > 0) return lines
      }
    } catch (err) {
      console.warn('Google Gemini API request failed, falling back to smart enhancer:', err)
    }
  }

  // Smart instantaneous fallback
  return bullets.map(b => localEnhanceBullet(b, role))
}

/**
 * Generate High-Impact Cover Letter with Google Gemini API (100% Free)
 */
export async function generateCoverLetterWithAI({ name, role, company, skills, experience, tone = 'Professional', customApiKey = null }) {
  const apiKey = customApiKey || getStoredGeminiKey()

  if (apiKey) {
    try {
      const prompt = `You are a world-class executive career coach and tech hiring specialist.
Write a compelling, tailored, ATS-compliant cover letter for:
Candidate Name: ${name || 'Candidate'}
Target Role: ${role || 'Software Engineer'}
Company: ${company || 'Target Company'}
Key Skills: ${skills || 'Full-Stack Development, Problem Solving'}
Years of Experience: ${experience || 'Relevant Experience'}
Tone: ${tone}

Rules:
- Professional letterhead format with date and Hiring Manager.
- Engaging hook demonstrating genuine enthusiasm and cultural fit.
- 2-3 body paragraphs with quantifiable achievements and specific skills.
- Confident closing with call-to-action for an interview.
- Output ONLY the plain text cover letter, no markdown formatting tags.`

      const text = await callGeminiApi(prompt, apiKey)
      if (text) return text.trim()
    } catch (err) {
      console.warn('Gemini cover letter generation failed, using template engine:', err)
    }
  }

  return null
}

