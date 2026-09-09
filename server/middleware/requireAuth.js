const { supabaseAdmin } = require('../lib/supabase')

/**
 * Middleware: verify Supabase JWT from Authorization header.
 * Attaches req.user (Supabase user) and req.profile (profiles row).
 */
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header. Expected: Bearer <token>' })
  }

  const token = authHeader.split(' ')[1]

  try {
    // Verify the JWT with Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token. Please log in again.' })
    }

    // Fetch the user's profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    req.user    = user
    req.profile = profile || {}
    req.token   = token
    next()
  } catch (err) {
    console.error('Auth middleware error:', err)
    res.status(401).json({ error: 'Authentication failed.' })
  }
}

/**
 * Middleware: check if user has an active Pro or Lifetime plan.
 * Use after requireAuth.
 */
function requirePro(req, res, next) {
  const plan = req.profile?.plan
  if (plan === 'pro' || plan === 'lifetime') return next()
  return res.status(403).json({
    error: 'This feature requires a Pro or Lifetime plan.',
    upgrade_url: `${process.env.FRONTEND_URL}/pricing`,
  })
}

module.exports = { requireAuth, requirePro }
