const router = require('express').Router()

// Helper: Call Google Gemini API
async function callGemini(prompt, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 600 }
    })
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message || `Gemini error ${response.status}`)
  }
  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
}

// POST /api/ai/enhance-summary
router.post('/enhance-summary', async (req, res) => {
  const { summary, role, skills } = req.body
  const apiKey = req.headers['x-gemini-key'] || req.headers['x-api-key'] || process.env.GEMINI_API_KEY

  if (apiKey) {
    try {
      const prompt = `You are an elite technical resume coach and ATS optimization specialist.
Rewrite and elevate this resume summary to be high-impact, ATS-friendly, professional (3-4 sentences), and metric-driven:
Target Role: ${role || 'Software Development Engineer (AI & ML)'}
Key Technical Skills: ${(skills || []).join(', ')}
Current Summary: "${summary}"
Output ONLY the final summary paragraph. No quotes or markdown.`

      const enhanced = await callGemini(prompt, apiKey)
      if (enhanced) return res.json({ enhanced })
    } catch (err) {
      console.warn('Backend Gemini API error:', err.message)
    }
  }

  // Free fallback
  const cleanRole = role || 'Software Development Engineer (AI & ML)'
  const skillsStr = (skills && skills.length > 0) ? skills.slice(0, 5).join(', ') : 'Python, Java, React, SQL, Machine Learning'
  const fallback = `Results-driven ${cleanRole} with a strong foundation in Computer Science, Machine Learning, and Full-Stack Engineering. Proven expertise in building scalable web applications and high-throughput systems leveraging ${skillsStr}. Demonstrated track record of optimizing system response latency by 35%+, implementing clean modular architectures, and delivering robust production-ready solutions in collaborative agile teams.`
  
  res.json({ enhanced: fallback })
})

// POST /api/ai/enhance-bullets
router.post('/enhance-bullets', async (req, res) => {
  const { bullets, role, company } = req.body
  const apiKey = req.headers['x-gemini-key'] || req.headers['x-api-key'] || process.env.GEMINI_API_KEY

  if (apiKey) {
    try {
      const prompt = `You are an elite tech resume coach for Google, Amazon, and top startups.
Elevate each of the following work experience bullet points using the Google X-Y-Z formula ("Accomplished [X] as measured by [Y], by doing [Z]") with strong action verbs and quantifiable metrics.
Role: ${role || 'Software Engineer'}
Company: ${company || 'Tech Company'}
Original Bullets:
${(bullets || []).map((b, i) => `${i+1}. ${b}`).join('\n')}
Return ONLY the enhanced bullets, one per line.`

      const text = await callGemini(prompt, apiKey)
      if (text) {
        const lines = text.split('\n').map(l => l.replace(/^[-•*\d.]+\s*/, '').trim()).filter(Boolean)
        if (lines.length > 0) return res.json({ bullets: lines })
      }
    } catch (err) {
      console.warn('Backend Gemini API error:', err.message)
    }
  }

  // Free fallback
  const enhanced = (bullets || []).map(b => {
    let t = (b || '').trim()
    if (!t) return t
    t = t.replace(/^(worked on|helped with|responsible for)\s+/i, 'Architected and engineered ')
    t = t.charAt(0).toUpperCase() + t.slice(1)
    if (!/\d+[%kKmM]?/.test(t) && t.length > 20) {
      t += ', increasing system performance and workflow efficiency by 32%.'
    }
    if (!t.endsWith('.')) t += '.'
    return t
  })

  res.json({ bullets: enhanced })
})

module.exports = router
