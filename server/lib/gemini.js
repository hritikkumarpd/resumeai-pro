/**
 * Google Gemini API Client for ResumeAI Pro
 * Uses server-side GEMINI_API_KEY.
 */

function isGeminiAvailable() {
  return !!process.env.GEMINI_API_KEY
}

const MODELS = [
  'gemini-3.6-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-3.5-flash',
]

/**
 * Call Google Gemini API with fallback models and retry on temporary high demand.
 * @param {string} prompt 
 * @param {number} maxTokens 
 * @returns {Promise<string|null>}
 */
async function callGemini(prompt, maxTokens = 1500) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return null
  }

  for (const model of MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: maxTokens }
          })
        })

        if (response.ok) {
          const data = await response.json()
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
          if (text) return text
        } else {
          const errBody = await response.text().catch(() => '')
          if (response.status === 503 && attempt === 0) {
            // Wait 500ms and try next model or retry
            await new Promise(r => setTimeout(r, 500))
            continue
          }
          console.warn(`Gemini ${model} returned ${response.status}:`, errBody.slice(0, 160))
          break
        }
      } catch (err) {
        console.warn(`Gemini ${model} network error:`, err.message)
        break
      }
    }
  }
  return null
}

/**
 * Call Google Gemini API and parse the response as JSON.
 * @param {string} prompt 
 * @param {number} maxTokens 
 * @returns {Promise<object|null>}
 */
async function callGeminiJson(prompt, maxTokens = 2500) {
  const raw = await callGemini(prompt, maxTokens)
  if (!raw) return null

  try {
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
    return JSON.parse(cleaned)
  } catch (err) {
    console.warn('Failed to parse Gemini JSON directly, attempting recovery substring:', err.message)
    const firstBrace = raw.indexOf('{')
    const lastBrace = raw.lastIndexOf('}')
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(raw.slice(firstBrace, lastBrace + 1))
      } catch (innerErr) {
        console.warn('Gemini JSON recovery failed:', innerErr.message)
      }
    }
    return null
  }
}

module.exports = {
  callGemini,
  callGeminiJson,
  isGeminiAvailable,
}
