const router = require('express').Router()
const { supabaseAdmin } = require('../lib/supabase')
const { requireAuth } = require('../middleware/requireAuth')

/* ── ATS keyword analysis logic ─────────────────────────────── */
function analyzeAts(resumeText, jobDescription) {
  const stopWords = new Set(['the','a','an','and','or','but','in','on','at','to','for','of','with','by','is','are','was','were','be','been','being','have','has','had','do','does','did','will','would','could','should','may','might','shall','must','can','need','dare','ought','used'])

  function extractKeywords(text) {
    return [...new Set(
      text.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2 && !stopWords.has(w) && isNaN(w))
    )]
  }

  const jobKeywords    = extractKeywords(jobDescription)
  const resumeKeywords = new Set(extractKeywords(resumeText))

  const matched = jobKeywords.filter(k => resumeKeywords.has(k))
  const missing  = jobKeywords.filter(k => !resumeKeywords.has(k))

  // Score: weighted by how many job keywords appear in resume
  const score = jobKeywords.length === 0
    ? 50
    : Math.round(Math.min((matched.length / jobKeywords.length) * 100, 100))

  return {
    score,
    matched:        matched.slice(0, 50),
    missing:        missing.slice(0, 30),
    total_keywords: jobKeywords.length,
  }
}

/* ── POST /api/ats/analyze ──────────────────────────────────── */
router.post('/analyze', requireAuth, async (req, res) => {
  const { resume_text, job_description, resume_id, job_title, company } = req.body

  if (!resume_text || !job_description) {
    return res.status(400).json({ error: 'resume_text and job_description are required.' })
  }
  if (job_description.trim().length < 50) {
    return res.status(400).json({ error: 'Job description seems too short. Please paste the full job posting.' })
  }

  const result = analyzeAts(resume_text, job_description)

  // Save to history
  const { data: record, error } = await supabaseAdmin
    .from('ats_history')
    .insert({
      user_id:          req.user.id,
      resume_id:        resume_id || null,
      job_title:        job_title || null,
      company:          company   || null,
      job_description,
      resume_text,
      score:            result.score,
      matched_keywords: result.matched,
      missing_keywords: result.missing,
      total_keywords:   result.total_keywords,
    })
    .select()
    .single()

  if (error) console.error('ATS history save error:', error)

  // Update ats_score on resume if resume_id provided
  if (resume_id) {
    await supabaseAdmin
      .from('resumes')
      .update({ ats_score: result.score })
      .eq('id', resume_id)
      .eq('user_id', req.user.id)
  }

  res.json({
    ...result,
    id:         record?.id,
    created_at: record?.created_at,
  })
})

/* ── GET /api/ats/history ───────────────────────────────────── */
router.get('/history', requireAuth, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 50)
  const page  = parseInt(req.query.page) || 0

  const { data, error, count } = await supabaseAdmin
    .from('ats_history')
    .select('id, job_title, company, score, matched_keywords, missing_keywords, created_at', { count: 'exact' })
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1)

  if (error) return res.status(500).json({ error: error.message })

  res.json({
    data,
    total: count,
    page,
    limit,
  })
})

/* ── DELETE /api/ats/history/:id ────────────────────────────── */
router.delete('/history/:id', requireAuth, async (req, res) => {
  const { error } = await supabaseAdmin
    .from('ats_history')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ message: 'ATS history record deleted.' })
})

module.exports = router
