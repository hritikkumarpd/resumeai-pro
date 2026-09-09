const router = require('express').Router()
const { supabaseAdmin } = require('../lib/supabase')
const { requireAuth } = require('../middleware/requireAuth')

const FREE_PLAN_LIMIT = 3  // max resumes on free plan

/* ── GET /api/resumes ───────────────────────────────────────── */
router.get('/', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('resumes')
    .select('id, title, template, accent_color, ats_score, created_at, updated_at')
    .eq('user_id', req.user.id)
    .order('updated_at', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

/* ── POST /api/resumes ──────────────────────────────────────── */
router.post('/', requireAuth, async (req, res) => {
  // Enforce free plan limit
  if (req.profile?.plan === 'free') {
    const { count } = await supabaseAdmin
      .from('resumes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id)

    if (count >= FREE_PLAN_LIMIT) {
      return res.status(403).json({
        error: `Free plan allows up to ${FREE_PLAN_LIMIT} resumes. Upgrade to Pro for unlimited resumes.`,
        upgrade_url: `${process.env.FRONTEND_URL}/pricing`,
      })
    }
  }

  const { title, data, template, accent_color, font } = req.body
  if (!title) return res.status(400).json({ error: 'Resume title is required.' })

  const { data: resume, error } = await supabaseAdmin
    .from('resumes')
    .insert({
      user_id:      req.user.id,
      title:        title || 'My Resume',
      data:         data  || {},
      template:     template    || 'Modern Dark',
      accent_color: accent_color || '#7C3AED',
      font:         font || 'Inter',
    })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })

  // Update resume count in profile
  await supabaseAdmin.rpc('increment_resume_count', { user_id: req.user.id }).catch(() => {})

  res.status(201).json(resume)
})

/* ── GET /api/resumes/:id ───────────────────────────────────── */
router.get('/:id', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('resumes')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)  // ensure ownership
    .single()

  if (error || !data) {
    return res.status(404).json({ error: 'Resume not found.' })
  }
  res.json(data)
})

/* ── PUT /api/resumes/:id ───────────────────────────────────── */
router.put('/:id', requireAuth, async (req, res) => {
  const { title, data, template, accent_color, font, ats_score } = req.body

  // Verify ownership
  const { data: existing } = await supabaseAdmin
    .from('resumes')
    .select('id')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .single()

  if (!existing) return res.status(404).json({ error: 'Resume not found.' })

  const updates = { updated_at: new Date().toISOString() }
  if (title        !== undefined) updates.title        = title
  if (data         !== undefined) updates.data         = data
  if (template     !== undefined) updates.template     = template
  if (accent_color !== undefined) updates.accent_color = accent_color
  if (font         !== undefined) updates.font         = font
  if (ats_score    !== undefined) updates.ats_score    = ats_score

  const { data: updated, error } = await supabaseAdmin
    .from('resumes')
    .update(updates)
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(updated)
})

/* ── DELETE /api/resumes/:id ────────────────────────────────── */
router.delete('/:id', requireAuth, async (req, res) => {
  const { error } = await supabaseAdmin
    .from('resumes')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)

  if (error) return res.status(500).json({ error: error.message })

  // Decrement resume count in profile
  await supabaseAdmin.rpc('decrement_resume_count', { user_id: req.user.id }).catch(() => {})

  res.json({ message: 'Resume deleted successfully.' })
})

/* ── POST /api/resumes/:id/duplicate ───────────────────────── */
router.post('/:id/duplicate', requireAuth, async (req, res) => {
  // Enforce free plan limit on duplicate
  if (req.profile?.plan === 'free') {
    const { count } = await supabaseAdmin
      .from('resumes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id)

    if (count >= FREE_PLAN_LIMIT) {
      return res.status(403).json({
        error: `Free plan allows up to ${FREE_PLAN_LIMIT} resumes. Upgrade to Pro for unlimited resumes.`,
        upgrade_url: `${process.env.FRONTEND_URL}/pricing`,
      })
    }
  }

  const { data: original, error: fetchErr } = await supabaseAdmin
    .from('resumes')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .single()

  if (fetchErr || !original) return res.status(404).json({ error: 'Resume not found.' })

  const { data: copy, error } = await supabaseAdmin
    .from('resumes')
    .insert({
      user_id:      req.user.id,
      title:        `${original.title} (Copy)`,
      data:         original.data,
      template:     original.template,
      accent_color: original.accent_color,
      font:         original.font,
    })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })

  // Increment resume count
  await supabaseAdmin.rpc('increment_resume_count', { user_id: req.user.id }).catch(() => {})

  res.status(201).json(copy)
})

module.exports = router
