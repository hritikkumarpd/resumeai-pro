const router = require('express').Router()
const { requireAuth } = require('../middleware/requireAuth')
const { supabaseAdmin } = require('../lib/supabase')
const { isPaidPlan } = require('../config/plans')

const fs = require('fs')

const FREE_EXPORT_LIMIT = 3

function getChromeExecutablePath() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH && fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
    return process.env.PUPPETEER_EXECUTABLE_PATH
  }
  const paths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
  ]
  for (const p of paths) {
    if (fs.existsSync(p)) return p
  }
  return undefined
}

/* ── Quota helpers (atomic Supabase RPC) ───────────────────────── */

/**
 * Check + atomically increment the free-plan user's monthly export count.
 * Returns { allowed, used, limit, month } or null if user is paid/error.
 */
async function checkAndIncrementQuota(userId) {
  try {
    const { data, error } = await supabaseAdmin.rpc('increment_export_usage', {
      p_user_id: userId,
      p_limit: FREE_EXPORT_LIMIT,
    })
    if (error) {
      console.error('increment_export_usage RPC error:', error.message)
      return null // fail-open: allow export if RPC fails
    }
    return data
  } catch (err) {
    console.error('Quota check failed:', err.message)
    return null // fail-open
  }
}

/**
 * Read current monthly usage without incrementing.
 */
async function getQuota(userId) {
  try {
    const { data, error } = await supabaseAdmin.rpc('get_export_usage', {
      p_user_id: userId,
    })
    if (error) {
      console.error('get_export_usage RPC error:', error.message)
      return { used: 0, limit: FREE_EXPORT_LIMIT, month: null }
    }
    return data
  } catch (err) {
    console.error('Quota read failed:', err.message)
    return { used: 0, limit: FREE_EXPORT_LIMIT, month: null }
  }
}

/**
 * Calculate when the current month's quota resets (1st of next month, 00:00 UTC).
 */
function getQuotaResetDate() {
  const now = new Date()
  const resetDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
  return resetDate.toISOString()
}

/* ── GET /api/pdf/quota — Read current export usage ────────────── */
router.get('/quota', requireAuth, async (req, res) => {
  const userPlan = req.profile?.plan || 'free'
  if (isPaidPlan(userPlan)) {
    return res.json({
      plan: userPlan,
      unlimited: true,
      used: 0,
      limit: Infinity,
    })
  }

  const quota = await getQuota(req.user.id)
  res.json({
    plan: 'free',
    unlimited: false,
    used: quota.used || 0,
    limit: quota.limit || FREE_EXPORT_LIMIT,
    month: quota.month,
    resets_at: getQuotaResetDate(),
  })
})

/* ── POST /api/pdf/render-html (Direct Vector PDF from Client HTML) ── */
/**
 * Renders raw HTML sent from frontend into a 100% vector, selectable PDF
 * with fully active clickable hyperlinks using headless Puppeteer Chrome.
 * Protected by requireAuth to prevent unauthorized access and DoS.
 * Free-plan users are limited to FREE_EXPORT_LIMIT exports per calendar month.
 */
router.post('/render-html', requireAuth, async (req, res) => {
  const { html, name = 'Resume' } = req.body

  if (!html || typeof html !== 'string') {
    return res.status(400).json({ error: 'Resume HTML string is required.' })
  }

  // Prevent payload explosion DoS
  if (html.length > 2 * 1024 * 1024) {
    return res.status(400).json({ error: 'Resume HTML exceeds maximum allowed size (2MB).' })
  }

  // ── Quota: PRE-CHECK for free-plan users (read-only, no increment yet) ──
  const userPlan = req.profile?.plan || 'free'
  const isFreeUser = !isPaidPlan(userPlan)
  if (isFreeUser) {
    const currentUsage = await getQuota(req.user.id)
    if (currentUsage && currentUsage.used >= FREE_EXPORT_LIMIT) {
      return res.status(429).json({
        error: `Monthly export limit reached (${currentUsage.used}/${currentUsage.limit}). Upgrade to Pro for unlimited exports.`,
        used: currentUsage.used,
        limit: currentUsage.limit,
        month: currentUsage.month,
        resets_at: getQuotaResetDate(),
        upgrade_url: `${(process.env.FRONTEND_URL || 'https://resumeaihritik.vercel.app').replace(/\/+$/, '')}/pricing`,
      })
    }
  }

  let browser = null
  try {
    const puppeteer = require('puppeteer')
    const executablePath = getChromeExecutablePath()
    browser = await puppeteer.launch({
      executablePath,
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--font-render-hinting=medium'
      ],
    })

    const page = await browser.newPage()

    // Block SSRF to cloud metadata (169.254.169.254), loopback interfaces, and local files
    await page.setRequestInterception(true)
    page.on('request', (interceptedReq) => {
      const url = (interceptedReq.url() || '').toLowerCase()
      if (
        url.startsWith('file:') ||
        url.includes('169.254.169.254') ||
        url.includes('metadata.google.internal') ||
        url.includes('127.0.0.1') ||
        url.includes('localhost') ||
        url.includes('0.0.0.0')
      ) {
        interceptedReq.abort()
      } else {
        interceptedReq.continue()
      }
    })

    // 96 DPI A4 viewport
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 })
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 })

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      preferCSSPageSize: true,
      tagged: true, // Enables selectable text layer & PDF accessibility
      outline: true,
    })

    await browser.close()
    browser = null

    // ── Quota: INCREMENT only AFTER successful PDF generation ──
    // This prevents consuming a quota slot when Puppeteer crashes/times out
    if (isFreeUser) {
      const quotaResult = await checkAndIncrementQuota(req.user.id)
      // If a concurrent request snuck in and exhausted the quota between
      // our pre-check and this increment, the RPC will roll back the increment
      // and return allowed=false. But the PDF was already generated, so we
      // still serve it this time (the next request will be blocked).
      // This is a deliberate fail-open for the current request to avoid
      // generating a PDF and then throwing it away.
    }

    const safeName = (name || 'Resume').replace(/[^a-zA-Z0-9_-]/g, '_')
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${safeName}_ATS_Resume.pdf"`,
      'Content-Length': pdf.length,
    })
    res.end(pdf)
  } catch (err) {
    if (browser) await browser.close().catch(() => {})
    console.error('PDF render-html error:', err)
    res.status(500).json({ error: 'PDF generation failed: ' + err.message })
  }
})

/* ── POST /api/pdf/generate ─────────────────────────────────── */
/**
 * Generates a PDF from resume data using Puppeteer.
 * Free-plan users are limited to FREE_EXPORT_LIMIT exports per calendar month.
 */
router.post('/generate', requireAuth, async (req, res) => {
  const { resumeData, accentColor = '#7C3AED', font = 'Inter' } = req.body

  if (!resumeData || !resumeData.personal) {
    return res.status(400).json({ error: 'Resume data with personal info is required.' })
  }

  // ── Quota: PRE-CHECK for free-plan users (read-only, no increment yet) ──
  const userPlan = req.profile?.plan || 'free'
  const isFreeUser = !isPaidPlan(userPlan)
  if (isFreeUser) {
    const currentUsage = await getQuota(req.user.id)
    if (currentUsage && currentUsage.used >= FREE_EXPORT_LIMIT) {
      return res.status(429).json({
        error: `Monthly export limit reached (${currentUsage.used}/${currentUsage.limit}). Upgrade to Pro for unlimited exports.`,
        used: currentUsage.used,
        limit: currentUsage.limit,
        month: currentUsage.month,
        resets_at: getQuotaResetDate(),
        upgrade_url: `${(process.env.FRONTEND_URL || 'https://resumeaihritik.vercel.app').replace(/\/+$/, '')}/pricing`,
      })
    }
  }

  // Build HTML for the resume with active hyperlinks
  const html = buildResumeHtml(resumeData, accentColor, font)

  let browser = null
  try {
    const puppeteer = require('puppeteer')
    const executablePath = getChromeExecutablePath()
    browser = await puppeteer.launch({
      executablePath,
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    })

    const page = await browser.newPage()

    await page.setRequestInterception(true)
    page.on('request', (interceptedReq) => {
      const url = (interceptedReq.url() || '').toLowerCase()
      if (
        url.startsWith('file:') ||
        url.includes('169.254.169.254') ||
        url.includes('metadata.google.internal') ||
        url.includes('127.0.0.1') ||
        url.includes('localhost') ||
        url.includes('0.0.0.0')
      ) {
        interceptedReq.abort()
      } else {
        interceptedReq.continue()
      }
    })

    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 })

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      tagged: true,
    })

    await browser.close()
    browser = null

    // ── Quota: INCREMENT only AFTER successful PDF generation ──
    if (isFreeUser) {
      await checkAndIncrementQuota(req.user.id)
    }

    const name = (resumeData.personal?.name || 'Resume').replace(/[^a-zA-Z0-9]/g, '_')
    res.set({
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${name}_Resume.pdf"`,
      'Content-Length':      pdf.length,
    })
    res.end(pdf)

  } catch (err) {
    if (browser) await browser.close().catch(() => {})
    console.error('PDF generation error:', err)
    res.status(500).json({ error: 'PDF generation failed. Please try again.' })
  }
})

/* ── HTML Builder with Clickable Hyperlinks ─────────────────── */
function escapeHtml(str) {
  if (str === null || str === undefined) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function buildResumeHtml(d, accent, font) {
  const p = d.personal || {}
  const exp = (d.experience || [])
  const edu = (d.education  || [])
  const skills = (d.skills  || [])
  const projects = (d.projects || [])
  const certs = (d.certifications || [])

  const safeAccent = /^#[0-9a-fA-F]{3,8}$/.test(accent) ? accent : '#7C3AED'
  const safeFont = font ? font.replace(/[^a-zA-Z0-9 _-]/g, '') : 'Inter'

  function formatUrl(url) {
    if (!url) return ''
    const trimmed = url.trim()
    const valid = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    return escapeHtml(valid)
  }

  function cleanUrlDisplay(url) {
    if (!url) return ''
    const display = url.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '')
    return escapeHtml(display)
  }

  const cleanPhone = (p.phone || '').replace(/[^0-9+]/g, '')

  const sectionHeader = (title) =>
    `<div style="font-size:8pt;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:${safeAccent};border-bottom:1px solid ${safeAccent};padding-bottom:3px;margin:14px 0 6px;">${escapeHtml(title)}</div>`

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=${encodeURIComponent(font)}:wght@400;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: '${font}', Arial, sans-serif; font-size: 9pt; color: #1e293b; background: white; }
  a { color: inherit; text-decoration: none; }
  a:hover { text-decoration: underline; }
  .header { background: linear-gradient(135deg,#1a1040,${accent}); padding: 22px 28px; }
  .header h1 { font-size: 20pt; font-weight: 700; color: white; font-family: Georgia, serif; }
  .header .title { font-size: 10pt; color: ${accent}dd; margin-top: 2px; }
  .header .contact { font-size: 7.5pt; color: rgba(255,255,255,0.75); margin-top: 6px; display: flex; flex-wrap: wrap; gap: 12px; }
  .header .contact a { color: rgba(255,255,255,0.85); }
  .body { padding: 14px 28px 20px; }
  .bullet { display: flex; gap: 6px; margin: 2px 0; }
  .bullet::before { content: "▸"; color: ${accent}; flex-shrink: 0; }
  .exp-header { display: flex; justify-content: space-between; align-items: flex-start; }
  .job-title { font-weight: 700; font-size: 9.5pt; }
  .company { color: #475569; font-size: 8.5pt; }
  .date { color: #94a3b8; font-size: 7.5pt; white-space: nowrap; margin-left: 8px; }
  .skill-tag { display: inline-block; background: ${accent}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 7pt; margin: 1px; }
  .edu-row { display: flex; justify-content: space-between; }
</style>
</head>
<body>
<div class="header">
  <h1>${escapeHtml(p.name || 'Your Name')}</h1>
  <div class="title">${escapeHtml(p.title || '')}</div>
  <div class="contact">
    ${cleanPhone ? `<a href="tel:${cleanPhone}">📞 ${escapeHtml(p.phone)}</a>` : ''}
    ${p.email    ? `<a href="mailto:${escapeHtml(p.email.trim())}">✉️ ${escapeHtml(p.email)}</a>` : ''}
    ${p.location ? `<span>📍 ${escapeHtml(p.location)}</span>` : ''}
    ${p.linkedin ? `<a href="${formatUrl(p.linkedin)}" target="_blank" rel="noopener noreferrer">💼 ${cleanUrlDisplay(p.linkedin)}</a>` : ''}
    ${p.website  ? `<a href="${formatUrl(p.website)}" target="_blank" rel="noopener noreferrer">🌐 ${cleanUrlDisplay(p.website)}</a>` : ''}
  </div>
</div>
<div class="body">
  ${d.summary ? `${sectionHeader('Professional Summary')}<p style="line-height:1.5;color:#334155;">${escapeHtml(d.summary)}</p>` : ''}

  ${exp.length ? `${sectionHeader('Work Experience')}${exp.map(e => `
    <div style="margin-bottom:10px;">
      <div class="exp-header">
        <div><div class="job-title">${escapeHtml(e.role)}</div><div class="company">${escapeHtml(e.company)}${e.location ? ` · ${escapeHtml(e.location)}` : ''}</div></div>
        <div class="date">${escapeHtml(e.period)}</div>
      </div>
      <div style="margin-top:3px;">${(e.bullets || []).map(b => `<div class="bullet"><span style="color:${safeAccent}">▸</span><span style="line-height:1.4;color:#334155;">${escapeHtml(b)}</span></div>`).join('')}</div>
    </div>`).join('')}` : ''}

  ${edu.length ? `${sectionHeader('Education')}${edu.map(e => `
    <div class="edu-row"><div><strong>${escapeHtml(e.degree)}</strong><span style="color:#475569;"> · ${escapeHtml(e.school)}</span>${e.gpa ? `<span style="color:#94a3b8;"> · Score: ${escapeHtml(e.gpa)}</span>` : ''}</div><span class="date">${escapeHtml(e.period)}</span></div>`).join('')}` : ''}

  ${skills.length ? `${sectionHeader('Skills')}<div style="margin-top:2px;">${skills.map(s => `<span class="skill-tag">${escapeHtml(s)}</span>`).join('')}</div>` : ''}

  ${projects.length ? `${sectionHeader('Projects')}${projects.map(p => `
    <div style="margin-bottom:6px;">
      <div style="display:flex;justify-content:space-between;align-items:baseline;">
        <strong>${escapeHtml(p.name)}</strong>
        ${p.link ? `<a href="${formatUrl(p.link)}" target="_blank" rel="noopener noreferrer" style="color:${safeAccent};font-size:7.5pt;text-decoration:underline;">${cleanUrlDisplay(p.link)} ↗</a>` : ''}
      </div>
      <div style="color:#475569;font-size:8.5pt;margin-top:1px;">${escapeHtml(p.desc)}</div>
    </div>`).join('')}` : ''}

  ${certs.length ? `${sectionHeader('Certifications & Achievements')}${certs.map(c => `
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:3px;">
      <div>
        <strong>${escapeHtml(c.name)}</strong>
        ${c.issuer ? `<span style="color:#475569;"> · ${escapeHtml(c.issuer)}</span>` : ''}
        ${c.link ? `<a href="${formatUrl(c.link)}" target="_blank" rel="noopener noreferrer" style="color:${safeAccent};font-size:7.5pt;margin-left:6px;text-decoration:underline;">[Verify ↗]</a>` : ''}
      </div>
      <span class="date">${escapeHtml(c.year)}</span>
    </div>`).join('')}` : ''}
</div>
</body>
</html>`
}

module.exports = router
