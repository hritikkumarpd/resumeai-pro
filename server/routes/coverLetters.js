const router = require('express').Router()
const { supabaseAdmin } = require('../lib/supabase')
const { requireAuth } = require('../middleware/requireAuth')

/* ── GET /api/cover-letters ─────────────────────────────────── */
router.get('/', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('cover_letters')
    .select('id, title, job_role, company, tone, created_at, updated_at')
    .eq('user_id', req.user.id)
    .order('updated_at', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

/* ── POST /api/cover-letters ────────────────────────────────── */
router.post('/', requireAuth, async (req, res) => {
  const { title, content, job_role, company, tone } = req.body

  if (!content) return res.status(400).json({ error: 'Cover letter content is required.' })

  const { data, error } = await supabaseAdmin
    .from('cover_letters')
    .insert({
      user_id:  req.user.id,
      title:    title    || 'Cover Letter',
      content,
      job_role: job_role || null,
      company:  company  || null,
      tone:     tone     || 'Professional',
    })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json(data)
})

/* ── GET /api/cover-letters/:id ─────────────────────────────── */
router.get('/:id', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('cover_letters')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .single()

  if (error || !data) return res.status(404).json({ error: 'Cover letter not found.' })
  res.json(data)
})

/* ── PUT /api/cover-letters/:id ─────────────────────────────── */
router.put('/:id', requireAuth, async (req, res) => {
  const { title, content, job_role, company, tone } = req.body

  const updates = { updated_at: new Date().toISOString() }
  if (title    !== undefined) updates.title    = title
  if (content  !== undefined) updates.content  = content
  if (job_role !== undefined) updates.job_role = job_role
  if (company  !== undefined) updates.company  = company
  if (tone     !== undefined) updates.tone     = tone

  const { data, error } = await supabaseAdmin
    .from('cover_letters')
    .update(updates)
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

/* ── DELETE /api/cover-letters/:id ──────────────────────────── */
router.delete('/:id', requireAuth, async (req, res) => {
  const { error } = await supabaseAdmin
    .from('cover_letters')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ message: 'Cover letter deleted.' })
})

module.exports = router
