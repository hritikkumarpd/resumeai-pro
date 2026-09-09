const router = require('express').Router()
const { supabaseAdmin } = require('../lib/supabase')
const { requireAdmin }  = require('../middleware/requireAdmin')

/* ── GET /api/admin/stats ───────────────────────────────────── */
router.get('/stats', requireAdmin, async (req, res) => {
  // Pull from admin_stats view
  const { data: stats, error: statsErr } = await supabaseAdmin
    .from('admin_stats')
    .select('*')
    .single()

  // Recent signups (last 10)
  const { data: recentUsers } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, plan, created_at')
    .order('created_at', { ascending: false })
    .limit(10)

  // Signups per day (last 7 days)
  const { data: dailySignups } = await supabaseAdmin.rpc('signups_per_day').catch(() => ({ data: [] }))

  res.json({
    ...(stats || {}),
    recent_users:  recentUsers  || [],
    daily_signups: dailySignups || [],
  })
})

/* ── GET /api/admin/users ───────────────────────────────────── */
router.get('/users', requireAdmin, async (req, res) => {
  const limit  = Math.min(parseInt(req.query.limit) || 50, 200)
  const page   = parseInt(req.query.page) || 0
  const search = req.query.search || ''

  let query = supabaseAdmin
    .from('profiles')
    .select('id, full_name, plan, resume_count, created_at, updated_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1)

  if (search) {
    query = query.ilike('full_name', `%${search}%`)
  }

  const { data, error, count } = await query
  if (error) return res.status(500).json({ error: error.message })

  // Get emails from auth.users (requires service role)
  const userIds = (data || []).map(u => u.id)
  const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers({ perPage: limit })
  const emailMap = {}
  ;(authUsers?.users || []).forEach(u => { emailMap[u.id] = u.email })

  const enriched = (data || []).map(u => ({
    ...u,
    email: emailMap[u.id] || 'unknown',
  }))

  res.json({ data: enriched, total: count, page, limit })
})

/* ── PUT /api/admin/users/:id/plan ──────────────────────────── */
router.put('/users/:id/plan', requireAdmin, async (req, res) => {
  const { plan } = req.body
  if (!['free','pro','lifetime'].includes(plan)) {
    return res.status(400).json({ error: 'Plan must be one of: free, pro, lifetime' })
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update({ plan, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json({ message: `Plan updated to ${plan}`, user: data })
})

/* ── DELETE /api/admin/users/:id ────────────────────────────── */
router.delete('/users/:id', requireAdmin, async (req, res) => {
  const { error } = await supabaseAdmin.auth.admin.deleteUser(req.params.id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ message: 'User deleted.' })
})

/* ── GET /api/admin/resumes ─────────────────────────────────── */
router.get('/resumes', requireAdmin, async (req, res) => {
  const { data, error, count } = await supabaseAdmin
    .from('resumes')
    .select('id, title, template, ats_score, created_at, user_id', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ data, total: count })
})

module.exports = router
