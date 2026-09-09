require('express-async-errors')
require('dotenv').config()

const express    = require('express')
const cors       = require('cors')
const helmet     = require('helmet')
const morgan     = require('morgan')
const compression = require('compression')
const rateLimit  = require('express-rate-limit')

const authRoutes        = require('./routes/auth')
const resumeRoutes      = require('./routes/resumes')
const atsRoutes         = require('./routes/ats')
const coverLetterRoutes = require('./routes/coverLetters')
const paymentRoutes     = require('./routes/payment')
const pdfRoutes         = require('./routes/pdf')
const adminRoutes       = require('./routes/admin')
const aiRoutes          = require('./routes/ai')

const app  = express()
const PORT = process.env.PORT || 4000

/* ── Reverse Proxy Configuration (Render/Railway/Vercel) ─────── */
app.set('trust proxy', 1)

/* ── Security & Middleware ──────────────────────────────────── */
app.use(helmet())
app.use(compression())
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))

// CORS — allow only verified frontend origins
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://resumeaipro.vercel.app',
  'https://resumeaihritik.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
].filter(Boolean)

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) {
      return callback(null, true)
    }
    return callback(new Error('Cross-Origin Request Blocked by CORS Policy'))
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-Admin-Secret'],
}))

// JSON body parsing (no raw body middleware needed — Razorpay uses HMAC on parsed JSON)

// JSON body parsing for all other routes
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

/* ── Rate Limiting ──────────────────────────────────────────── */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
})
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many auth attempts, please try again in 15 minutes.' },
})

app.use('/api/', globalLimiter)
app.use('/api/auth/', authLimiter)

/* ── Routes ─────────────────────────────────────────────────── */
app.use('/api/auth',          authRoutes)
app.use('/api/resumes',       resumeRoutes)
app.use('/api/ats',           atsRoutes)
app.use('/api/cover-letters', coverLetterRoutes)
app.use('/api/payment',       paymentRoutes)
app.use('/api/pdf',           pdfRoutes)
app.use('/api/admin',         adminRoutes)
app.use('/api/ai',            aiRoutes)

/* ── Health Check ───────────────────────────────────────────── */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ResumeAI Pro API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
  })
})

app.get('/', (req, res) => {
  res.json({ message: 'ResumeAI Pro API is running 🚀' })
})

/* ── 404 Handler ────────────────────────────────────────────── */
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` })
})

/* ── Global Error Handler ───────────────────────────────────── */
app.use((err, req, res, next) => {
  console.error('Server Error:', err)

  // Supabase / Postgres errors
  if (err.code === '23505') {
    return res.status(409).json({ error: 'A record with this value already exists.' })
  }
  if (err.code === '23503') {
    return res.status(400).json({ error: 'Referenced record does not exist.' })
  }

  const status  = err.statusCode || err.status || 500
  const message = err.message || 'Internal server error'

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  })
})

/* ── Start Server ───────────────────────────────────────────── */
app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════╗
  ║  ResumeAI Pro API Server              ║
  ║  Running on port ${PORT}                 ║
  ║  ENV: ${process.env.NODE_ENV || 'development'}               ║
  ╚═══════════════════════════════════════╝
  `)
})

module.exports = app
