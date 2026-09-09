const router = require('express').Router()
const { supabaseAdmin } = require('../lib/supabase')
const { requireAdmin }  = require('../middleware/requireAdmin')

/* ── GET /api/admin/stats ───────────────────────────────────── */
router.get('/stats', requireAdmin, async (req, res) => {
  // Pull from admin_stats view with safe fallback
  let statsData = {}
  try {
    const { data: stats } = await supabaseAdmin
      .from('admin_stats')
      .select('*')
      .single()
    if (stats) statsData = stats
  } catch (_) {}

  // Fallback counts if view is not configured
  if (!statsData.total_users) {
    try {
      const [{ count: uCount }, { count: rCount }, { count: pCount }] = await Promise.all([
        supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('resumes').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).neq('plan', 'free'),
      ])
      statsData = {
        total_users: uCount || 0,
        total_resumes: rCount || 0,
        pro_users: pCount || 0,
        ...statsData
      }
    } catch (_) {}
  }

  // Recent signups (last 10)
  let recentUsers = []
  try {
    const { data: users } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, plan, created_at')
      .order('created_at', { ascending: false })
      .limit(10)
    if (users) recentUsers = users
  } catch (_) {}

  // Signups per day (last 7 days)
  let dailySignups = []
  try {
    const rpcRes = await supabaseAdmin.rpc('signups_per_day')
    if (rpcRes?.data) dailySignups = rpcRes.data
  } catch (_) {}

  res.json({
    ...statsData,
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
  const emailMap = {}
  try {
    await Promise.all(
      (data || []).map(async (u) => {
        try {
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(u.id)
          if (authUser?.user?.email) {
            emailMap[u.id] = authUser.user.email
          }
        } catch (_) {}
      })
    )
  } catch (_) {}

  const enriched = (data || []).map(u => ({
    ...u,
    email: emailMap[u.id] || 'Not specified',
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
