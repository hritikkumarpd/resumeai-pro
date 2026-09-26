const router = require('express').Router()
const { requireAuth } = require('../middleware/requireAuth')
const { supabaseAdmin } = require('../lib/supabase')
const { isPaidPlan } = require('../config/plans')

const fs = require('fs')
const net = require('net')

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

/* ── SSRF Security: Host & IP Validator ────────────────────────── */

/**
 * Validates if an IP address string belongs to private, loopback,
 * link-local, carrier-grade NAT, multicast, or cloud metadata ranges.
 */
function isPrivateOrInternalIp(ipStr) {
  if (!ipStr) return true

  // Standard IPv4 check
  if (net.isIPv4(ipStr)) {
    const parts = ipStr.split('.').map(Number)
    const [a, b] = parts
    // 0.0.0.0/8 (Current network)
    if (a === 0) return true
    // 10.0.0.0/8 (Private)
    if (a === 10) return true
    // 127.0.0.0/8 (Loopback)
    if (a === 127) return true
    // 169.254.0.0/16 (Link-local / AWS & GCP Cloud Metadata)
    if (a === 169 && b === 254) return true
    // 172.16.0.0/12 (Private)
    if (a === 172 && b >= 16 && b <= 31) return true
    // 192.168.0.0/16 (Private)
    if (a === 192 && b === 168) return true
    // 100.64.0.0/10 (Shared Address Space / CGNAT)
    if (a === 100 && b >= 64 && b <= 127) return true
    // 192.0.0.0/24 & 192.0.2.0/24 (Documentation / Special)
    if (a === 192 && b === 0) return true
    // 198.51.100.0/24 & 203.0.113.0/24
    if (a === 198 && (b === 18 || b === 19 || b === 51)) return true
    if (a === 203 && b === 0) return true
    // 224.0.0.0/4 (Multicast) or 240.0.0.0/4 (Reserved / Future Use)
    if (a >= 224) return true
    return false
  }

  // Standard IPv6 check
  if (net.isIPv6(ipStr)) {
    const norm = ipStr.toLowerCase()
    // Loopback ::1 / ::
    if (norm === '::1' || norm === '0:0:0:0:0:0:0:1' || norm === '::') return true
    // Unique local address fc00::/7 (fc00 - fdff)
    if (norm.startsWith('fc') || norm.startsWith('fd')) return true
    // Link-local unicast fe80::/10
    if (norm.startsWith('fe8') || norm.startsWith('fe9') || norm.startsWith('fea') || norm.startsWith('feb')) return true
    // IPv4-mapped IPv6 address (e.g. ::ffff:127.0.0.1)
    if (norm.includes('::ffff:')) {
      const v4Part = norm.split('::ffff:')[1]
      return isPrivateOrInternalIp(v4Part)
    }
    return false
  }

  return false
}

/**
 * Checks if a hostname or integer/hex/octal representation resolves to an internal/private host.
 */
function isDisallowedHost(rawHost) {
  if (!rawHost) return true

  // Strip IPv6 brackets and optional port
  let host = rawHost.trim().toLowerCase()
  if (host.startsWith('[') && host.includes(']')) {
    host = host.slice(1, host.indexOf(']'))
  } else {
    host = host.split(':')[0]
  }

  // Known metadata / internal domain patterns
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host === 'metadata.google.internal' ||
    host === 'instance-data' ||
    host === 'metadata'
  ) {
    return true
  }

  // Check if raw host is a standard dot/colon IP string
  if (isPrivateOrInternalIp(host)) {
    return true
  }

  // Check if host is in numeric format (decimal integer, hex 0x..., octal)
  // Example: 2130706433 = 127.0.0.1, 0x7f000001 = 127.0.0.1
  let numVal = null
  if (/^0x[0-9a-f]+$/i.test(host)) {
    numVal = parseInt(host, 16)
  } else if (/^\d+$/.test(host)) {
    numVal = host.startsWith('0') && host.length > 1 ? parseInt(host, 8) : parseInt(host, 10)
  }

  if (numVal !== null && !isNaN(numVal)) {
    if (numVal >= 0 && numVal <= 0xffffffff) {
      const a = (numVal >>> 24) & 0xff
      const b = (numVal >>> 16) & 0xff
      const c = (numVal >>> 8) & 0xff
      const d = numVal & 0xff
      const reconstructedIp = `${a}.${b}.${c}.${d}`
      return isPrivateOrInternalIp(reconstructedIp)
    }
    return true // Block out-of-bounds integer hostnames
  }

  return false
}

/**
 * Determine if an intercepted Puppeteer request is safe.
 * Restricts resource types to static presentation assets (no scripts, xhr, fetch, websockets, frames).
 */
function isSafePuppeteerRequest(interceptedReq) {
  const resourceType = interceptedReq.resourceType()
  const allowedResourceTypes = ['document', 'stylesheet', 'image', 'font']
  if (!allowedResourceTypes.includes(resourceType)) {
    return false
  }

  const rawUrl = (interceptedReq.url() || '').trim()
  if (!rawUrl) return false

  // Allow inline images
  if (rawUrl.startsWith('data:image/')) return true
  if (rawUrl.startsWith('data:')) return false // block other data schemes

  let parsedUrl
  try {
    parsedUrl = new URL(rawUrl)
  } catch {
    return false
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return false
  }

  if (isDisallowedHost(parsedUrl.hostname)) {
    return false
  }

  return true
}

/* ── Quota helpers (atomic Supabase RPC) ───────────────────────── */

/**
 * Check + atomically increment the free-plan user's monthly export count.
 * Returns { allowed, used, limit, month } or null if error.
 */
async function checkAndIncrementQuota(userId) {
  try {
    const { data, error } = await supabaseAdmin.rpc('increment_export_usage', {
      p_user_id: userId,
      p_limit: FREE_EXPORT_LIMIT,
    })
    if (error) {
      console.error('increment_export_usage RPC error:', error.message)
      return null
    }
    return data
  } catch (err) {
    console.error('Quota check failed:', err.message)
    return null
  }
}

/**
 * Rollback quota reservation if PDF generation unexpectedly fails.
 */
async function rollbackQuota(userId) {
  try {
    const monthKey = new Date().toISOString().slice(0, 7) // 'YYYY-MM'
    const { data: usage } = await supabaseAdmin
      .from('monthly_usage')
      .select('export_count')
      .eq('user_id', userId)
      .eq('month_key', monthKey)
      .maybeSingle()

    if (usage && usage.export_count > 0) {
      await supabaseAdmin
        .from('monthly_usage')
        .update({
          export_count: usage.export_count - 1,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('month_key', monthKey)
    }
  } catch (err) {
    console.warn('Quota rollback failed:', err.message)
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

  // ── Quota: ATOMIC PRE-INCREMENT for free-plan users ──
  // Checks and reserves quota slot BEFORE slow PDF generation (fixes TOCTOU race condition RESUMEAI-003)
  const userPlan = req.profile?.plan || 'free'
  const isFreeUser = !isPaidPlan(userPlan)
  let quotaReserved = false

  if (isFreeUser) {
    const quotaResult = await checkAndIncrementQuota(req.user.id)
    // Distinguish a quota-exhausted result (allowed:false) from a system/RPC error (null).
    // A null result means the quota check itself failed — do not misreport it as "limit reached".
    if (!quotaResult) {
      return res.status(503).json({
        error: 'Unable to verify export quota right now. Please try again in a moment.',
      })
    }
    if (quotaResult.allowed === false) {
      const currentUsed = quotaResult?.used ?? FREE_EXPORT_LIMIT
      return res.status(429).json({
        error: `Monthly export limit reached (${currentUsed}/${FREE_EXPORT_LIMIT}). Upgrade to Pro for unlimited exports.`,
        used: currentUsed,
        limit: FREE_EXPORT_LIMIT,
        month: quotaResult?.month || new Date().toISOString().slice(0, 7),
        resets_at: getQuotaResetDate(),
        upgrade_url: `${(process.env.FRONTEND_URL || 'https://dailyresumeai.online').replace(/\/+$/, '')}/pricing`,
      })
    }
    quotaReserved = true
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

    // Disable client-side JavaScript execution inside PDF renderer (fixes RESUMEAI-002)
    await page.setJavaScriptEnabled(false)

    // Intercept and strictly block SSRF to cloud metadata, private IPs, decimal/hex IPs, and non-media assets
    await page.setRequestInterception(true)
    page.on('request', (interceptedReq) => {
      if (isSafePuppeteerRequest(interceptedReq)) {
        interceptedReq.continue()
      } else {
        interceptedReq.abort()
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

    const safeName = (name || 'Resume').replace(/[^a-zA-Z0-9_-]/g, '_')
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${safeName}_ATS_Resume.pdf"`,
      'Content-Length': pdf.length,
    })
    res.end(pdf)
  } catch (err) {
    if (browser) await browser.close().catch(() => {})
    // Roll back quota reservation if PDF generation failed
    if (quotaReserved) {
      await rollbackQuota(req.user.id)
    }
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

  // ── Quota: ATOMIC PRE-INCREMENT for free-plan users ──
  const userPlan = req.profile?.plan || 'free'
  const isFreeUser = !isPaidPlan(userPlan)
  let quotaReserved = false

  if (isFreeUser) {
    const quotaResult = await checkAndIncrementQuota(req.user.id)
    // Distinguish a quota-exhausted result (allowed:false) from a system/RPC error (null).
    if (!quotaResult) {
      return res.status(503).json({
        error: 'Unable to verify export quota right now. Please try again in a moment.',
      })
    }
    if (quotaResult.allowed === false) {
      const currentUsed = quotaResult?.used ?? FREE_EXPORT_LIMIT
      return res.status(429).json({
        error: `Monthly export limit reached (${currentUsed}/${FREE_EXPORT_LIMIT}). Upgrade to Pro for unlimited exports.`,
        used: currentUsed,
        limit: FREE_EXPORT_LIMIT,
        month: quotaResult?.month || new Date().toISOString().slice(0, 7),
        resets_at: getQuotaResetDate(),
        upgrade_url: `${(process.env.FRONTEND_URL || 'https://dailyresumeai.online').replace(/\/+$/, '')}/pricing`,
      })
    }
    quotaReserved = true
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

    // Disable client-side JavaScript execution
    await page.setJavaScriptEnabled(false)

    // Intercept and block SSRF
    await page.setRequestInterception(true)
    page.on('request', (interceptedReq) => {
      if (isSafePuppeteerRequest(interceptedReq)) {
        interceptedReq.continue()
      } else {
        interceptedReq.abort()
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

    const name = (resumeData.personal?.name || 'Resume').replace(/[^a-zA-Z0-9]/g, '_')
    res.set({
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${name}_Resume.pdf"`,
      'Content-Length':      pdf.length,
    })
    res.end(pdf)

  } catch (err) {
    if (browser) await browser.close().catch(() => {})
    if (quotaReserved) {
      await rollbackQuota(req.user.id)
    }
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
  @import url('https://fonts.googleapis.com/css2?family=${encodeURIComponent(safeFont)}:wght@400;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: '${safeFont}', Arial, sans-serif; font-size: 9pt; color: #1e293b; background: white; }
  a { color: inherit; text-decoration: none; }
  a:hover { text-decoration: underline; }
  .header { background: linear-gradient(135deg,#1a1040,${safeAccent}); padding: 22px 28px; }
  .header h1 { font-size: 20pt; font-weight: 700; color: white; font-family: Georgia, serif; }
  .header .title { font-size: 10pt; color: ${safeAccent}dd; margin-top: 2px; }
  .header .contact { font-size: 7.5pt; color: rgba(255,255,255,0.75); margin-top: 6px; display: flex; flex-wrap: wrap; gap: 12px; }
  .header .contact a { color: rgba(255,255,255,0.85); }
  .body { padding: 14px 28px 20px; }
  .bullet { display: flex; gap: 6px; margin: 2px 0; }
  .bullet::before { content: "▸"; color: ${safeAccent}; flex-shrink: 0; }
  .exp-header { display: flex; justify-content: space-between; align-items: flex-start; }
  .job-title { font-weight: 700; font-size: 9.5pt; }
  .company { color: #475569; font-size: 8.5pt; }
  .date { color: #94a3b8; font-size: 7.5pt; white-space: nowrap; margin-left: 8px; }
  .skill-tag { display: inline-block; background: ${safeAccent}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 7pt; margin: 1px; }
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
