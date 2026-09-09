const router  = require('express').Router()
const { supabaseAdmin } = require('../lib/supabase')
const { sendWelcomeEmail, sendPasswordResetEmail } = require('../lib/mailer')
const { requireAuth } = require('../middleware/requireAuth')

/* ── POST /api/auth/register ────────────────────────────────── */
router.post('/register', async (req, res) => {
  const { email, password, full_name } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' })
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' })
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,               // skip email confirmation for fast launch
    user_metadata: { full_name },
  })

  if (error) {
    if (error.message.includes('already registered')) {
      return res.status(409).json({ error: 'An account with this email already exists.' })
    }
    return res.status(400).json({ error: error.message })
  }

  // Send welcome email (non-blocking)
  sendWelcomeEmail(email, full_name).catch(console.error)

  res.status(201).json({
    message: 'Account created successfully!',
    user: {
      id:    data.user.id,
      email: data.user.email,
      full_name,
    },
  })
})

/* ── POST /api/auth/login ───────────────────────────────────── */
router.post('/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' })
  }

  const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password })

  if (error) {
    return res.status(401).json({ error: 'Invalid email or password.' })
  }

  // Fetch profile
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single()

  res.json({
    access_token:  data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at:    data.session.expires_at,
    user: {
      id:        data.user.id,
      email:     data.user.email,
      full_name: profile?.full_name || data.user.user_metadata?.full_name,
      plan:      profile?.plan || 'free',
      avatar_url: profile?.avatar_url,
    },
  })
})

/* ── GET /api/auth/me ───────────────────────────────────────── */
router.get('/me', requireAuth, async (req, res) => {
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', req.user.id)
    .single()

  res.json({
    id:           req.user.id,
    email:        req.user.email,
    full_name:    profile?.full_name || req.user.user_metadata?.full_name,
    plan:         profile?.plan || 'free',
    avatar_url:   profile?.avatar_url,
    resume_count: profile?.resume_count || 0,
    created_at:   req.user.created_at,
  })
})

/* ── PUT /api/auth/me ───────────────────────────────────────── */
router.put('/me', requireAuth, async (req, res) => {
  const { full_name, avatar_url } = req.body

  const updates = {}
  if (full_name !== undefined) updates.full_name  = full_name
  if (avatar_url !== undefined) updates.avatar_url = avatar_url
  updates.updated_at = new Date().toISOString()

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update(updates)
    .eq('id', req.user.id)
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })

  res.json(data)
})

/* ── POST /api/auth/forgot-password ─────────────────────────── */
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body
  if (!email) return res.status(400).json({ error: 'Email is required.' })

  const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.FRONTEND_URL}/reset-password`,
  })

  // Always return success to prevent user enumeration
  res.json({ message: 'If this email exists, a password reset link has been sent.' })
})

/* ── POST /api/auth/reset-password ──────────────────────────── */
router.post('/reset-password', requireAuth, async (req, res) => {
  const { password } = req.body
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' })
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(req.user.id, { password })
  if (error) return res.status(400).json({ error: error.message })

  res.json({ message: 'Password updated successfully.' })
})

/* ── POST /api/auth/logout ──────────────────────────────────── */
router.post('/logout', requireAuth, async (req, res) => {
  // Supabase sessions are managed client-side, just return success
  res.json({ message: 'Logged out successfully.' })
})

module.exports = router
