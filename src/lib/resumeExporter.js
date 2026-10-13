/**
 * Resume Multi-Format Exporter & Data Portability Suite
 * Supports JSON Backup, JSON Import, and Plain Text (TXT) ATS Copy.
 */

export function exportResumeToJson(data, title = 'resume') {
  const exportPayload = {
    version: '1.0',
    generator: 'ResumeAI Pro',
    exportedAt: new Date().toISOString(),
    resumeTitle: title,
    data
  }

  const jsonStr = JSON.stringify(exportPayload, null, 2)
  const blob = new Blob([jsonStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const cleanTitle = (title || 'resume').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  a.href = url
  a.download = `${cleanTitle}-backup.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function parseResumeFromJsonFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result)
        const resumeData = parsed.data || parsed
        if (!resumeData.personal) {
          throw new Error('Invalid JSON resume schema: missing personal info.')
        }
        resolve(resumeData)
      } catch (err) {
        reject(new Error('Failed to parse JSON file: ' + err.message))
      }
    }
    reader.onerror = () => reject(new Error('Could not read file.'))
    reader.readAsText(file)
  })
}

export function formatResumeToPlainText(data) {
  if (!data) return ''

  const lines = []

  // Header
  if (data.personal?.name) lines.push(data.personal.name.toUpperCase())
  if (data.personal?.title) lines.push(data.personal.title)

  const contactPieces = [
    data.personal?.email,
    data.personal?.phone,
    data.personal?.location,
    data.personal?.linkedin,
    data.personal?.website
  ].filter(Boolean)
  if (contactPieces.length) lines.push(contactPieces.join(' | '))

  lines.push('\n' + '='.repeat(50) + '\n')

  // Summary
  if (data.summary) {
    lines.push('PROFESSIONAL SUMMARY')
    lines.push('-'.repeat(30))
    lines.push(data.summary.trim())
    lines.push('')
  }

  // Experience
  if (data.experience && data.experience.length > 0) {
    lines.push('WORK EXPERIENCE')
    lines.push('-'.repeat(30))
    data.experience.forEach(exp => {
      lines.push(`${exp.role || 'Role'} — ${exp.company || 'Company'}`)
      if (exp.period || exp.location) {
        lines.push(`${exp.period || ''} | ${exp.location || ''}`)
      }
      if (exp.bullets && exp.bullets.length > 0) {
        exp.bullets.filter(Boolean).forEach(b => lines.push(`• ${b.trim()}`))
      }
      lines.push('')
    })
  }

  // Education
  if (data.education && data.education.length > 0) {
    lines.push('EDUCATION')
    lines.push('-'.repeat(30))
    data.education.forEach(edu => {
      lines.push(`${edu.degree || 'Degree'} — ${edu.school || 'Institution'}`)
      if (edu.period || edu.gpa) lines.push(`${edu.period || ''} | GPA: ${edu.gpa || 'N/A'}`)
      lines.push('')
    })
  }

  // Skills
  if (data.skills && data.skills.length > 0) {
    lines.push('TECHNICAL SKILLS')
    lines.push('-'.repeat(30))
    lines.push(data.skills.join(', '))
    lines.push('')
  }

  // Projects
  if (data.projects && data.projects.length > 0) {
    lines.push('KEY PROJECTS')
    lines.push('-'.repeat(30))
    data.projects.forEach(proj => {
      lines.push(`${proj.name || 'Project'}${proj.link ? ` (${proj.link})` : ''}`)
      if (proj.desc) lines.push(proj.desc.trim())
      lines.push('')
    })
  }

  // Certifications
  if (data.certifications && data.certifications.length > 0) {
    lines.push('CERTIFICATIONS')
    lines.push('-'.repeat(30))
    data.certifications.forEach(cert => {
      lines.push(`• ${cert.name || 'Certification'}${cert.year ? ` (${cert.year})` : ''}`)
    })
    lines.push('')
  }

  return lines.join('\n')
}
