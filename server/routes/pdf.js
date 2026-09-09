const router = require('express').Router()
const { requireAuth } = require('../middleware/requireAuth')

/* ── POST /api/pdf/generate ─────────────────────────────────── */
/**
 * Generates a PDF from resume HTML using Puppeteer.
 * Frontend sends resume data → server renders HTML → returns PDF buffer.
 */
router.post('/generate', requireAuth, async (req, res) => {
  const { resumeData, accentColor = '#7C3AED', font = 'Inter' } = req.body

  if (!resumeData || !resumeData.personal) {
    return res.status(400).json({ error: 'Resume data with personal info is required.' })
  }

  // Build HTML for the resume
  const html = buildResumeHtml(resumeData, accentColor, font)

  try {
    // Lazy-load puppeteer to avoid startup overhead
    const puppeteer = require('puppeteer')

    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    })

    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    })

    await browser.close()

    const name = (resumeData.personal?.name || 'Resume').replace(/[^a-zA-Z0-9]/g, '_')
    res.set({
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${name}_Resume.pdf"`,
      'Content-Length':      pdf.length,
    })
    res.end(pdf)

  } catch (err) {
    console.error('PDF generation error:', err)
    res.status(500).json({ error: 'PDF generation failed. Please try again.' })
  }
})

/* ── HTML Builder ───────────────────────────────────────────── */
function buildResumeHtml(d, accent, font) {
  const p = d.personal || {}
  const exp = (d.experience || [])
  const edu = (d.education  || [])
  const skills = (d.skills  || [])
  const projects = (d.projects || [])
  const certs = (d.certifications || [])

  const sectionHeader = (title) =>
    `<div style="font-size:8pt;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:${accent};border-bottom:1px solid ${accent};padding-bottom:3px;margin:14px 0 6px;">${title}</div>`

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=${encodeURIComponent(font)}:wght@400;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: '${font}', Arial, sans-serif; font-size: 9pt; color: #1e293b; background: white; }
  .header { background: linear-gradient(135deg,#1a1040,${accent}); padding: 22px 28px; }
  .header h1 { font-size: 20pt; font-weight: 700; color: white; font-family: Georgia, serif; }
  .header .title { font-size: 10pt; color: ${accent}dd; margin-top: 2px; }
  .header .contact { font-size: 7.5pt; color: rgba(255,255,255,0.6); margin-top: 6px; display: flex; flex-wrap: wrap; gap: 12px; }
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
  <h1>${p.name || 'Your Name'}</h1>
  <div class="title">${p.title || ''}</div>
  <div class="contact">
    ${p.email    ? `<span>${p.email}</span>` : ''}
    ${p.phone    ? `<span>${p.phone}</span>` : ''}
    ${p.location ? `<span>${p.location}</span>` : ''}
    ${p.linkedin ? `<span>${p.linkedin}</span>` : ''}
    ${p.website  ? `<span>${p.website}</span>` : ''}
  </div>
</div>
<div class="body">
  ${d.summary ? `${sectionHeader('Professional Summary')}<p style="line-height:1.5;color:#334155;">${d.summary}</p>` : ''}

  ${exp.length ? `${sectionHeader('Work Experience')}${exp.map(e => `
    <div style="margin-bottom:10px;">
      <div class="exp-header">
        <div><div class="job-title">${e.role}</div><div class="company">${e.company}${e.location ? ` · ${e.location}` : ''}</div></div>
        <div class="date">${e.period}</div>
      </div>
      <div style="margin-top:3px;">${(e.bullets || []).map(b => `<div class="bullet"><span style="color:${accent}">▸</span><span style="line-height:1.4;color:#334155;">${b}</span></div>`).join('')}</div>
    </div>`).join('')}` : ''}

  ${edu.length ? `${sectionHeader('Education')}${edu.map(e => `
    <div class="edu-row"><div><strong>${e.degree}</strong><span style="color:#475569;"> · ${e.school}</span>${e.gpa ? `<span style="color:#94a3b8;"> · GPA: ${e.gpa}</span>` : ''}</div><span class="date">${e.period}</span></div>`).join('')}` : ''}

  ${skills.length ? `${sectionHeader('Skills')}<div style="margin-top:2px;">${skills.map(s => `<span class="skill-tag">${s}</span>`).join('')}</div>` : ''}

  ${projects.length ? `${sectionHeader('Projects')}${projects.map(p => `
    <div style="margin-bottom:6px;"><strong>${p.name}</strong>${p.link ? `<span style="color:#94a3b8;font-size:7.5pt;"> · ${p.link}</span>` : ''}<div style="color:#475569;font-size:8.5pt;margin-top:1px;">${p.desc}</div></div>`).join('')}` : ''}

  ${certs.length ? `${sectionHeader('Certifications')}${certs.map(c => `
    <div style="display:flex;justify-content:space-between;"><div><strong>${c.name}</strong>${c.issuer ? `<span style="color:#475569;"> · ${c.issuer}</span>` : ''}</div><span class="date">${c.year}</span></div>`).join('')}` : ''}
</div>
</body>
</html>`
}

module.exports = router
