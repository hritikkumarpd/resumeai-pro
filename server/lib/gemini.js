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

/**
 * Call Google Gemini API with fallback models and stream chunks as they arrive.
 * @param {string} prompt 
 * @param {function} onChunk - Callback receiving text chunks
 * @param {number} maxTokens 
 * @returns {Promise<{fullText: string, model: string}|null>}
 */
async function streamGemini(prompt, onChunk, maxTokens = 1500) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return null
  }

  // Once any chunk has been flushed to the caller's onChunk (which writes to the client SSE
  // stream), we must NOT retry another model or fall back — doing so would concatenate a second
  // response on top of the partial one the client already received. This flag makes the whole
  // function commit to the first model that produces output.
  let flushedAny = false

  for (const model of MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: maxTokens }
          })
        })

        if (response.ok && response.body) {
          const reader = response.body.getReader()
          const decoder = new TextDecoder()
          let buffer = ''
          let fullText = ''

          const emit = (textChunk) => {
            fullText += textChunk
            flushedAny = true
            if (typeof onChunk === 'function') {
              onChunk(textChunk)
            }
          }

          try {
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
                if (!jsonStr || jsonStr === '[DONE]') continue
                try {
                  const parsed = JSON.parse(jsonStr)
                  const textChunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text
                  if (textChunk) emit(textChunk)
                } catch (e) {
                  // Ignore incomplete SSE json fragments
                }
              }
            }

            if (buffer.trim().startsWith('data:')) {
              try {
                const parsed = JSON.parse(buffer.trim().slice(5).trim())
                const textChunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text
                if (textChunk) emit(textChunk)
              } catch (e) {}
            }
          } catch (readErr) {
            // Stream dropped mid-flight. If we already sent chunks to the client, return what we
            // have rather than retrying another model (which would duplicate output downstream).
            console.warn(`Gemini stream ${model} interrupted:`, readErr.message)
            if (fullText) return { fullText, model }
            throw readErr
          }

          if (fullText) {
            return { fullText, model }
          }
        } else {
          const errBody = await response.text().catch(() => '')
          if (response.status === 503 && attempt === 0 && !flushedAny) {
            await new Promise(r => setTimeout(r, 500))
            continue
          }
          console.warn(`Gemini stream ${model} returned ${response.status}:`, errBody.slice(0, 160))
          break
        }
      } catch (err) {
        console.warn(`Gemini stream ${model} network error:`, err.message)
        break
      }
    }

    // If a previous model already streamed output to the client, do not try the next model.
    if (flushedAny) break
  }
  return null
}

module.exports = {
  callGemini,
  callGeminiJson,
  streamGemini,
  isGeminiAvailable,
}

