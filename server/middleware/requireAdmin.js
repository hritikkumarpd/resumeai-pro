const crypto = require('crypto')

/**
 * Middleware: restrict to admin users.
 * Checks X-Admin-Secret header against env var using timingSafeEqual.
 */
function requireAdmin(req, res, next) {
  const adminSecret = process.env.ADMIN_SECRET
  if (!adminSecret || adminSecret === 'your-super-secret-admin-key-change-this' && process.env.NODE_ENV === 'production') {
    console.error('ADMIN_SECRET is not securely configured on server')
    return res.status(500).json({ error: 'Admin access is disabled. Please configure a secure ADMIN_SECRET in server/.env.' })
  }

  const clientSecret = req.headers['x-admin-secret']
  if (!clientSecret || typeof clientSecret !== 'string') {
    return res.status(403).json({ error: 'Forbidden — admin access only.' })
  }

  const expectedBuf = Buffer.from(adminSecret)
  const actualBuf   = Buffer.from(clientSecret)

  if (expectedBuf.length !== actualBuf.length || !crypto.timingSafeEqual(expectedBuf, actualBuf)) {
    return res.status(403).json({ error: 'Forbidden — invalid admin secret key.' })
  }

  next()
}

module.exports = { requireAdmin }
