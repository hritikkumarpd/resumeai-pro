const router = require('express').Router()
const { supabaseAdmin } = require('../lib/supabase')
const { requireAuth, optionalAuth } = require('../middleware/requireAuth')
const { callGeminiJson, isGeminiAvailable } = require('../lib/gemini')

/* ── Stop words for keyword extraction ──────────────────────── */
const STOP_WORDS = new Set([
  'the','a','an','and','or','but','in','on','at','to','for','of','with','by',
  'is','are','was','were','be','been','being','have','has','had','do','does',
  'did','will','would','could','should','may','might','shall','must','can',
  'need','dare','ought','used','also','just','more','very','than','that',
  'this','these','those','they','them','their','its','our','your','his','her',
  'not','all','each','every','some','any','few','most','other','such','only',
  'own','same','so','what','which','who','whom','how','when','where','why',
  'about','after','before','between','into','through','during','above','below',
  'from','up','out','off','over','under','again','further','then','once',
  'here','there','both','either','neither','nor','too','well','work','team',
  'using','new','use','make','like','get','take','come','see','know','want',
])

/* ── ATS keyword analysis (JD matching) ────────────────────── */
function extractKeywords(text) {
  return [...new Set(
    text.toLowerCase()
      .replace(/[^\w\s+#.]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOP_WORDS.has(w) && isNaN(w))
  )]
}

function analyzeKeywordMatch(resumeText, jobDescription) {
  const jobKeywords    = extractKeywords(jobDescription)
  const resumeKeywords = new Set(extractKeywords(resumeText))

  const matched = jobKeywords.filter(k => resumeKeywords.has(k))
  const missing = jobKeywords.filter(k => !resumeKeywords.has(k))

  const score = jobKeywords.length === 0
    ? 50
    : Math.round(Math.min((matched.length / jobKeywords.length) * 100, 100))

  return {
    score,
    matched:        matched.slice(0, 50),
    missing:        missing.slice(0, 30),
    total_keywords: jobKeywords.length,
  }
}

/* ── Comprehensive Deterministic ATS Scoring Engine ─────────── */
const ACTION_VERBS = new Set([
  'achieved','administered','analyzed','architected','automated','built',
  'collaborated','configured','created','decreased','delivered','deployed',
  'designed','developed','directed','drove','eliminated','enabled',
  'engineered','enhanced','established','executed','expanded','facilitated',
  'generated','grew','headed','identified','implemented','improved',
  'increased','initiated','innovated','integrated','introduced','launched',
  'led','managed','mentored','migrated','modernized','monitored','negotiated',
  'operated','optimized','orchestrated','organized','oversaw','performed',
  'pioneered','planned','produced','programmed','published','reduced',
  'refactored','re-engineered','resolved','restructured','revamped','scaled',
  'secured','simplified','spearheaded','standardized','streamlined',
  'strengthened','supervised','supported','transformed','troubleshot',
  'unified','upgraded','utilized',
])

function analyzeResumeStructure(resumeData) {
  const scores = {
    contact:    { score: 0, max: 10, details: [] },
    summary:    { score: 0, max: 15, details: [] },
    skills:     { score: 0, max: 20, details: [] },
    experience: { score: 0, max: 25, details: [] },
    education:  { score: 0, max: 10, details: [] },
    projects:   { score: 0, max: 10, details: [] },
    formatting: { score: 0, max: 10, details: [] },
  }
  const strengths = []
  const issues = []
  const recommendations = []

  const p = resumeData.personal || {}
  const summary = resumeData.summary || ''
  const experience = resumeData.experience || []
  const education = resumeData.education || []
  const skills = resumeData.skills || []
  const projects = resumeData.projects || []
  const certifications = resumeData.certifications || []

  // ── Contact Information (10 pts) ───────────────────────────
  if (p.name && p.name.trim().length > 2) {
    scores.contact.score += 2
    scores.contact.details.push('Name present')
  } else {
    issues.push('Missing or incomplete name')
    recommendations.push('Add your full name at the top of your resume')
  }

  if (p.email && p.email.includes('@')) {
    scores.contact.score += 2
    scores.contact.details.push('Email present')
  } else {
    issues.push('Missing email address')
    recommendations.push('Add a professional email address')
  }

  if (p.phone && p.phone.replace(/\D/g, '').length >= 8) {
    scores.contact.score += 2
    scores.contact.details.push('Phone present')
  } else {
    issues.push('Missing phone number')
    recommendations.push('Add a phone number for recruiter contact')
  }

  if (p.location && p.location.trim().length > 2) {
    scores.contact.score += 2
    scores.contact.details.push('Location present')
  } else {
    issues.push('Missing location')
    recommendations.push('Add your city/location')
  }

  if ((p.linkedin && p.linkedin.trim().length > 5) || (p.website && p.website.trim().length > 5)) {
    scores.contact.score += 2
    scores.contact.details.push('LinkedIn/Website present')
    strengths.push('Professional online presence (LinkedIn/website)')
  } else {
    recommendations.push('Consider adding a LinkedIn profile or personal website')
  }

  // ── Professional Summary (15 pts) ──────────────────────────
  if (summary && summary.trim().length > 0) {
    scores.summary.score += 3
    scores.summary.details.push('Summary present')

    const wordCount = summary.trim().split(/\s+/).length
    if (wordCount >= 30 && wordCount <= 80) {
      scores.summary.score += 4
      scores.summary.details.push('Good summary length')
      strengths.push('Well-sized professional summary')
    } else if (wordCount < 30) {
      scores.summary.score += 1
      issues.push('Professional summary is too short')
      recommendations.push('Expand your summary to 30-80 words for better ATS performance')
    } else {
      scores.summary.score += 2
      issues.push('Professional summary is quite long')
      recommendations.push('Consider condensing your summary to 30-80 words')
    }

    // Check for keywords/buzzwords
    const summaryLower = summary.toLowerCase()
    const hasKeywords = ['experience', 'skills', 'develop', 'engineer', 'build', 'design',
      'manage', 'lead', 'proficient', 'expertise', 'passion'].some(kw => summaryLower.includes(kw))
    if (hasKeywords) {
      scores.summary.score += 4
      scores.summary.details.push('Contains relevant keywords')
    } else {
      scores.summary.score += 1
      recommendations.push('Add relevant industry keywords to your summary')
    }

    // Check for action-oriented language
    const hasActionLanguage = ['driven', 'proven', 'accomplished', 'results', 'impact',
      'innovative', 'dedicated', 'strategic'].some(w => summaryLower.includes(w))
    if (hasActionLanguage) {
      scores.summary.score += 4
      strengths.push('Strong action-oriented summary language')
    } else {
      scores.summary.score += 1
      recommendations.push('Use action-oriented language in your summary (e.g., "results-driven", "proven track record")')
    }
  } else {
    issues.push('Missing professional summary')
    recommendations.push('Add a professional summary — it\'s one of the first things ATS and recruiters read')
  }

  // ── Skills (20 pts) ────────────────────────────────────────
  if (skills.length > 0) {
    scores.skills.score += 4
    scores.skills.details.push(`${skills.length} skills listed`)

    if (skills.length >= 6) {
      scores.skills.score += 6
      strengths.push(`Strong skills section with ${skills.length} skills`)
    } else {
      scores.skills.score += 2
      issues.push('Few skills listed')
      recommendations.push('Add more relevant technical and soft skills (aim for 8-15)')
    }

    // Check for duplication
    const uniqueSkills = new Set(skills.map(s => s.toLowerCase().trim()))
    if (uniqueSkills.size === skills.length) {
      scores.skills.score += 4
      scores.skills.details.push('No duplicate skills')
    } else {
      scores.skills.score += 1
      issues.push('Duplicate skills detected')
      recommendations.push('Remove duplicate skills from your skills section')
    }

    // Technical skill density (bonus for technical terms)
    const techTerms = ['python', 'java', 'javascript', 'react', 'node', 'sql', 'aws',
      'docker', 'kubernetes', 'api', 'machine learning', 'typescript', 'git', 'cloud',
      'database', 'linux', 'html', 'css', 'angular', 'vue', 'mongodb', 'redis',
      'graphql', 'rest', 'agile', 'scrum', 'devops', 'ci/cd', 'tensorflow', 'pytorch']
    const skillsLower = skills.map(s => s.toLowerCase()).join(' ')
    const techCount = techTerms.filter(t => skillsLower.includes(t)).length
    if (techCount >= 5) {
      scores.skills.score += 6
      strengths.push('Strong technical skill variety')
    } else if (techCount >= 2) {
      scores.skills.score += 3
    } else {
      scores.skills.score += 1
      recommendations.push('Consider adding more specific technical skills relevant to your target role')
    }
  } else {
    issues.push('Missing skills section')
    recommendations.push('Add a skills section — it\'s critical for ATS keyword matching')
  }

  // ── Experience (25 pts) ────────────────────────────────────
  if (experience.length > 0) {
    scores.experience.score += 4
    scores.experience.details.push(`${experience.length} position(s)`)

    let totalBullets = 0
    let actionVerbBullets = 0
    let hasAllDates = true
    let hasAllTitles = true
    let hasAllCompanies = true

    experience.forEach(exp => {
      if (!exp.period || exp.period.trim().length < 4) hasAllDates = false
      if (!exp.role || exp.role.trim().length < 2) hasAllTitles = false
      if (!exp.company || exp.company.trim().length < 2) hasAllCompanies = false

      const bullets = exp.bullets || []
      totalBullets += bullets.length

      bullets.forEach(bullet => {
        const firstWord = bullet.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, '')
        if (ACTION_VERBS.has(firstWord)) actionVerbBullets++
      })
    })

    // Job titles
    if (hasAllTitles) {
      scores.experience.score += 3
      scores.experience.details.push('All positions have titles')
    } else {
      issues.push('Some experience entries are missing job titles')
      recommendations.push('Add clear job titles to all positions')
    }

    // Company names
    if (hasAllCompanies) {
      scores.experience.score += 2
      scores.experience.details.push('All positions have company names')
    } else {
      issues.push('Some experience entries are missing company names')
      recommendations.push('Add company names to all positions')
    }

    // Dates
    if (hasAllDates) {
      scores.experience.score += 2
      scores.experience.details.push('All positions have dates')
    } else {
      issues.push('Some experience entries are missing dates')
      recommendations.push('Add date ranges (e.g., "Jun 2023 – Present") to all positions')
    }

    // Bullet points
    if (totalBullets >= experience.length * 3) {
      scores.experience.score += 5
      strengths.push('Detailed experience with multiple bullet points')
    } else if (totalBullets >= experience.length * 2) {
      scores.experience.score += 3
      recommendations.push('Add more bullet points to each experience (aim for 3-5 per position)')
    } else {
      scores.experience.score += 1
      issues.push('Too few bullet points in experience section')
      recommendations.push('Add 3-5 achievement-focused bullet points per position')
    }

    // Action verbs
    if (totalBullets > 0) {
      const actionVerbRatio = actionVerbBullets / totalBullets
      if (actionVerbRatio >= 0.6) {
        scores.experience.score += 5
        strengths.push('Strong use of action verbs in experience bullets')
      } else if (actionVerbRatio >= 0.3) {
        scores.experience.score += 3
        recommendations.push('Start more bullet points with strong action verbs (e.g., Developed, Designed, Led)')
      } else {
        scores.experience.score += 1
        issues.push('Weak action verbs in experience bullets')
        recommendations.push('Begin each bullet with a past-tense action verb (Architected, Implemented, Reduced, etc.)')
      }
    }

    // Metrics in bullets
    const allBulletText = experience.flatMap(e => e.bullets || []).join(' ')
    const hasMetrics = /\d+[%kKmM]|\$\d+|\d+\+/.test(allBulletText)
    if (hasMetrics) {
      scores.experience.score += 4
      strengths.push('Quantified achievements with metrics')
    } else {
      scores.experience.score += 1
      recommendations.push('Add quantifiable metrics where possible (e.g., "reduced load time by 40%")')
    }
  } else {
    issues.push('Missing experience section')
    recommendations.push('Add your work experience — this is the most important section for most roles')
  }

  // ── Education (10 pts) ─────────────────────────────────────
  if (education.length > 0) {
    scores.education.score += 3
    scores.education.details.push(`${education.length} education entry/entries`)

    const hasInstitution = education.every(e => e.school && e.school.trim().length > 2)
    const hasDegree = education.every(e => e.degree && e.degree.trim().length > 2)
    const hasDates = education.every(e => e.period && e.period.trim().length > 2)

    if (hasDegree) {
      scores.education.score += 3
      scores.education.details.push('Degrees listed')
    } else {
      issues.push('Some education entries missing degree')
      recommendations.push('Add degree names to all education entries')
    }

    if (hasInstitution) {
      scores.education.score += 2
      scores.education.details.push('Institutions listed')
    } else {
      recommendations.push('Add institution names to all education entries')
    }

    if (hasDates) {
      scores.education.score += 2
      scores.education.details.push('Dates included')
    } else {
      recommendations.push('Add graduation dates to education entries')
    }
  } else {
    issues.push('Missing education section')
    recommendations.push('Add your education — degree, institution, and graduation year')
  }

  // ── Projects (10 pts) ──────────────────────────────────────
  if (projects.length > 0) {
    scores.projects.score += 3
    scores.projects.details.push(`${projects.length} project(s)`)

    const hasDescriptions = projects.every(p => p.desc && p.desc.trim().length > 20)
    if (hasDescriptions) {
      scores.projects.score += 4
      strengths.push('Detailed project descriptions')
    } else {
      scores.projects.score += 1
      recommendations.push('Add detailed descriptions to all projects highlighting technologies and impact')
    }

    const hasLinks = projects.some(p => p.link && p.link.trim().length > 5)
    if (hasLinks) {
      scores.projects.score += 3
      scores.projects.details.push('Project links included')
    } else {
      scores.projects.score += 1
      recommendations.push('Add links to project repositories or live demos')
    }
  } else {
    recommendations.push('Consider adding a projects section to showcase your practical skills')
  }

  // ── Formatting (10 pts) ────────────────────────────────────
  let formattingScore = 0
  const sectionCount = [summary, experience.length, education.length, skills.length, projects.length]
    .filter(Boolean).length

  if (sectionCount >= 4) {
    formattingScore += 4
    strengths.push('Well-structured resume with multiple sections')
  } else if (sectionCount >= 3) {
    formattingScore += 2
    recommendations.push('Add more sections for a complete resume (summary, experience, education, skills, projects)')
  } else {
    issues.push('Resume has too few sections')
    recommendations.push('Add more sections — a complete resume needs at least summary, experience, education, and skills')
  }

  // Check for empty sections
  const emptyExperience = experience.some(e => (!e.bullets || e.bullets.length === 0 || e.bullets.every(b => !b.trim())))
  if (!emptyExperience && experience.length > 0) {
    formattingScore += 3
    scores.formatting.details.push('No empty experience entries')
  } else if (emptyExperience) {
    issues.push('Some experience entries have empty bullet points')
    recommendations.push('Fill in bullet points for all experience entries')
  }

  // Certifications bonus
  if (certifications && certifications.length > 0) {
    formattingScore += 3
    strengths.push('Certifications/achievements section included')
  } else {
    formattingScore += 1
  }

  scores.formatting.score = Math.min(formattingScore, scores.formatting.max)

  // ── Calculate total score ──────────────────────────────────
  const totalScore = Object.values(scores).reduce((sum, cat) => sum + Math.min(cat.score, cat.max), 0)
  const maxScore = Object.values(scores).reduce((sum, cat) => sum + cat.max, 0)
  const normalizedScore = Math.round((totalScore / maxScore) * 100)

  return {
    score: normalizedScore,
    breakdown: Object.fromEntries(
      Object.entries(scores).map(([key, val]) => [
        key,
        {
          score: Math.min(val.score, val.max),
          max: val.max,
          percentage: Math.round((Math.min(val.score, val.max) / val.max) * 100),
          details: val.details,
        }
      ])
    ),
    strengths: [...new Set(strengths)],
    issues: [...new Set(issues)],
    recommendations: [...new Set(recommendations)],
  }
}

/* ── Helper: parse raw text into structured resume sections ──── */
function parseResumeTextToStructure(text) {
  if (!text || typeof text !== 'string') return { personal: {} }

  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/)
  const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}|\+?\d{10,12}/)
  const linkedinMatch = text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[A-Za-z0-9_-]+/i)
  const githubMatch = text.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[A-Za-z0-9_-]+/i)

  const candidateName = lines[0] && lines[0].length < 50 && !lines[0].includes('@') ? lines[0] : ''

  const sectionKeywords = [
    { key: 'summary', regex: /^(?:professional\s+summary|summary|profile|about\s+me|objective)/i },
    { key: 'experience', regex: /^(?:work\s+experience|experience|employment\s+history|professional\s+experience)/i },
    { key: 'skills', regex: /^(?:technical\s+skills|skills|core\s+competencies|technologies)/i },
    { key: 'education', regex: /^(?:education|academic\s+background|qualifications)/i },
    { key: 'projects', regex: /^(?:projects|personal\s+projects|academic\s+projects)/i },
    { key: 'certifications', regex: /^(?:certifications|certificates|licenses)/i },
  ]

  const sections = {
    personal: {
      name: candidateName,
      email: emailMatch ? emailMatch[0] : '',
      phone: phoneMatch ? phoneMatch[0] : '',
      linkedin: linkedinMatch ? linkedinMatch[0] : '',
      website: githubMatch ? githubMatch[0] : '',
      location: '',
    },
    summary: '',
    experience: [],
    skills: [],
    education: [],
    projects: [],
    certifications: [],
  }

  let currentSection = null
  let currentContent = []

  function flushSection(sec, content) {
    if (!sec || content.length === 0) return
    const joined = content.join(' ')
    if (sec === 'summary') {
      sections.summary = joined
    } else if (sec === 'skills') {
      const rawSkills = content.join(',').split(/[,|•·\n]/).map(s => s.trim()).filter(s => s.length > 1 && s.length < 40)
      sections.skills = [...new Set(rawSkills)]
    } else if (sec === 'experience') {
      const bullets = content.filter(l => l.startsWith('-') || l.startsWith('•') || l.startsWith('*')).map(l => l.replace(/^[-•*]\s*/, ''))
      sections.experience.push({
        role: content[0] || 'Experience Role',
        company: content[1] || 'Company',
        period: '2022-Present',
        bullets: bullets.length > 0 ? bullets : content.slice(0, 4),
      })
    } else if (sec === 'education') {
      sections.education.push({
        school: content[0] || 'University / Institution',
        degree: content[1] || 'Degree',
        year: '2024',
      })
    } else if (sec === 'projects') {
      sections.projects.push({
        name: content[0] || 'Key Project',
        desc: content.slice(1).join(' '),
      })
    } else if (sec === 'certifications') {
      content.forEach(c => sections.certifications.push({ name: c }))
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const matchedSec = sectionKeywords.find(s => s.regex.test(line))

    if (matchedSec) {
      if (currentSection) flushSection(currentSection, currentContent)
      currentSection = matchedSec.key
      currentContent = []
    } else if (currentSection) {
      currentContent.push(line)
    }
  }

  if (currentSection) flushSection(currentSection, currentContent)

  // If no explicit skills section, scan common technologies in text
  if (sections.skills.length === 0) {
    const commonTech = [
      'javascript','typescript','react','node.js','python','java','sql','aws',
      'docker','kubernetes','html','css','git','mongodb','postgresql','express',
      'c++','c#','ruby','go','rust','rest api','microservices','tailwind','graphql'
    ]
    const textLower = text.toLowerCase()
    sections.skills = commonTech.filter(tech => textLower.includes(tech))
  }

  return sections
}

/* ── Gemini AI ATS Analyzer ─────────────────────────────────── */
async function analyzeWithAiAts(resumeText, jobDescription) {
  if (!isGeminiAvailable() || !resumeText || !resumeText.trim()) return null

  const cleanResume = resumeText.trim().slice(0, 4500)
  const cleanJd = (jobDescription || '').trim().slice(0, 3000)

  const prompt = `You are an elite Applicant Tracking System (ATS) algorithm and senior technical recruiter.
Evaluate this candidate resume against standard ATS algorithms (Workday, Taleo, Greenhouse, Lever)${cleanJd ? ' and against the target Job Description' : ''}.

${cleanJd ? `TARGET JOB DESCRIPTION:\n"""\n${cleanJd}\n"""\n` : ''}

CANDIDATE RESUME:
"""
${cleanResume}
"""

CRITICAL INSTRUCTIONS:
1. Compute a realistic ATS compatibility score from 0 to 100 based on standard keyword coverage, section structure, action-oriented bullet points, and formatting compliance.
2. Provide a 7-category score breakdown:
   - "contact": score (0-10, max: 10, details: array of 1-3 short strings)
   - "summary": score (0-15, max: 15, details: array of 1-3 short strings)
   - "skills": score (0-20, max: 20, details: array of 1-3 short strings)
   - "experience": score (0-25, max: 25, details: array of 1-3 short strings)
   - "education": score (0-10, max: 10, details: array of 1-3 short strings)
   - "projects": score (0-10, max: 10, details: array of 1-3 short strings)
   - "formatting": score (0-10, max: 10, details: array of 1-3 short strings)
3. "strengths": 3 to 6 specific, tangible strengths identified in this resume.
4. "issues": 2 to 5 specific ATS vulnerabilities or gaps found (e.g. missing critical skills, lack of quantified impact, formatting gaps).
5. "recommendations": 3 to 6 practical, prioritized steps to maximize the candidate's interview callback rate.
6. "matched_keywords": An array of technical, domain, and qualification keywords that match the target role.
7. "missing_keywords": An array of high-priority keywords from the job description (or expected in this domain) that the resume is missing.
8. "ai_feedback": A 2-4 sentence executive summary from the AI hiring manager summarizing the resume's ATS readiness and key advice.

Return ONLY valid JSON matching this schema:
{
  "score": 75,
  "breakdown": {
    "contact": { "score": 10, "max": 10, "details": ["Full name, email, phone, and links present"] },
    "summary": { "score": 11, "max": 15, "details": ["Clear role-targeted summary"] },
    "skills": { "score": 15, "max": 20, "details": ["Good keyword density"] },
    "experience": { "score": 19, "max": 25, "details": ["Strong action verbs"] },
    "education": { "score": 10, "max": 10, "details": ["Degree clearly documented"] },
    "projects": { "score": 7, "max": 10, "details": ["Relevant technical projects"] },
    "formatting": { "score": 8, "max": 10, "details": ["ATS standard chronological layout"] }
  },
  "strengths": ["..."],
  "issues": ["..."],
  "recommendations": ["..."],
  "matched_keywords": ["..."],
  "missing_keywords": ["..."],
  "ai_feedback": "..."
}`

  try {
    const aiResult = await callGeminiJson(prompt, 2000)
    if (aiResult && typeof aiResult.score === 'number' && aiResult.breakdown) {
      const defaultBreakdown = {
        contact: { score: 8, max: 10, details: [] },
        summary: { score: 10, max: 15, details: [] },
        skills: { score: 14, max: 20, details: [] },
        experience: { score: 18, max: 25, details: [] },
        education: { score: 8, max: 10, details: [] },
        projects: { score: 7, max: 10, details: [] },
        formatting: { score: 8, max: 10, details: [] },
      }

      const normalizedBreakdown = {}
      for (const [cat, def] of Object.entries(defaultBreakdown)) {
        const item = aiResult.breakdown[cat] || {}
        const s = typeof item.score === 'number' ? Math.min(Math.max(Math.round(item.score), 0), def.max) : def.score
        normalizedBreakdown[cat] = {
          score: s,
          max: def.max,
          percentage: Math.round((s / def.max) * 100),
          details: Array.isArray(item.details) && item.details.length > 0 ? item.details : [`${cat.charAt(0).toUpperCase() + cat.slice(1)} evaluated`],
        }
      }

      return {
        score: Math.min(Math.max(Math.round(aiResult.score), 0), 100),
        breakdown: normalizedBreakdown,
        strengths: Array.isArray(aiResult.strengths) && aiResult.strengths.length > 0 ? aiResult.strengths : ['Solid foundational resume structure.'],
        issues: Array.isArray(aiResult.issues) ? aiResult.issues : [],
        recommendations: Array.isArray(aiResult.recommendations) && aiResult.recommendations.length > 0 ? aiResult.recommendations : ['Tailor resume bullet points specifically to target job description keywords.'],
        matched_keywords: Array.isArray(aiResult.matched_keywords) ? aiResult.matched_keywords : [],
        missing_keywords: Array.isArray(aiResult.missing_keywords) ? aiResult.missing_keywords : [],
        ai_feedback: typeof aiResult.ai_feedback === 'string' ? aiResult.ai_feedback : '',
        is_ai_powered: true,
      }
    }
  } catch (err) {
    console.warn('AI ATS evaluation error, falling back to deterministic:', err.message)
  }
  return null
}

/* ── POST /api/ats/analyze (JD keyword + full structure analysis) ── */
router.post('/analyze', optionalAuth, async (req, res) => {
  const { resume_text, job_description, resume_id, job_title, company, resume_data } = req.body

  if (!resume_text && !resume_data) {
    return res.status(400).json({ error: 'resume_text or resume_data is required.' })
  }

  const structuredData = resume_data && typeof resume_data === 'object'
    ? resume_data
    : parseResumeTextToStructure(resume_text || '')

  const textForKeywords = resume_text || (
    [
      structuredData.personal?.name,
      structuredData.personal?.title,
      structuredData.summary,
      structuredData.skills?.join(', '),
      structuredData.experience?.map(e => `${e.role} at ${e.company}: ${(e.bullets || []).join(' ')}`).join('\n'),
      structuredData.education?.map(e => `${e.degree} from ${e.school}`).join('\n'),
      structuredData.projects?.map(p => `${p.name}: ${p.desc || ''}`).join('\n'),
    ].filter(Boolean).join('\n\n')
  )

  // 1. Try AI-powered ATS evaluation first
  let aiAtsResult = null
  if (isGeminiAvailable()) {
    aiAtsResult = await analyzeWithAiAts(textForKeywords, job_description)
  }

  let finalScore = 0
  let finalBreakdown = null
  let finalStrengths = []
  let finalIssues = []
  let finalRecommendations = []
  let matchedKeywords = []
  let missingKeywords = []
  let keywordResult = null
  let isAiPowered = false
  let aiFeedback = ''

  if (aiAtsResult) {
    finalScore = aiAtsResult.score
    finalBreakdown = aiAtsResult.breakdown
    finalStrengths = aiAtsResult.strengths
    finalIssues = aiAtsResult.issues
    finalRecommendations = aiAtsResult.recommendations
    matchedKeywords = aiAtsResult.matched_keywords
    missingKeywords = aiAtsResult.missing_keywords
    aiFeedback = aiAtsResult.ai_feedback
    isAiPowered = true
    keywordResult = {
      score: aiAtsResult.score,
      matched: matchedKeywords,
      missing: missingKeywords,
      total_keywords: matchedKeywords.length + missingKeywords.length,
    }
  } else {
    // 2. Deterministic Fallback Engine
    const structureResult = analyzeResumeStructure(structuredData)
    if (job_description && job_description.trim().length >= 20) {
      keywordResult = analyzeKeywordMatch(textForKeywords, job_description)
      structureResult.score = Math.round(structureResult.score * 0.4 + keywordResult.score * 0.6)
    }
    finalScore = structureResult.score
    finalBreakdown = structureResult.breakdown
    finalStrengths = structureResult.strengths
    finalIssues = structureResult.issues
    finalRecommendations = structureResult.recommendations
    matchedKeywords = keywordResult ? keywordResult.matched : []
    missingKeywords = keywordResult ? keywordResult.missing : []
    isAiPowered = false
  }

  // Save to history if user is authenticated
  let record = null
  if (req.user?.id) {
    const { data, error } = await supabaseAdmin
      .from('ats_history')
      .insert({
        user_id:          req.user.id,
        resume_id:        resume_id || null,
        job_title:        job_title || null,
        company:          company   || null,
        job_description:  job_description || '',
        resume_text:      textForKeywords,
        score:            finalScore,
        matched_keywords: matchedKeywords,
        missing_keywords: missingKeywords,
        total_keywords:   matchedKeywords.length + missingKeywords.length,
      })
      .select()
      .single()

    if (error) console.error('ATS history save error:', error)
    record = data

    // Update ats_score on resume if resume_id provided
    if (resume_id) {
      await supabaseAdmin
        .from('resumes')
        .update({ ats_score: finalScore })
        .eq('id', resume_id)
        .eq('user_id', req.user.id)
    }
  }

  res.json({
    score:            finalScore,
    breakdown:        finalBreakdown,
    strengths:        finalStrengths,
    issues:           finalIssues,
    recommendations:  finalRecommendations,
    matched_keywords: matchedKeywords,
    missing_keywords: missingKeywords,
    keyword_match:    keywordResult,
    ai_feedback:      aiFeedback,
    is_ai_powered:    isAiPowered,
    id:               record?.id,
    created_at:       record?.created_at,
  })
})

/* ── POST /api/ats/analyze-resume (structured resume scoring) ── */
router.post('/analyze-resume', optionalAuth, async (req, res) => {
  const { resume_data, job_description, resume_text, resume_id, job_title, company } = req.body

  if (!resume_data && !resume_text) {
    return res.status(400).json({ error: 'resume_data (JSON) or resume_text is required.' })
  }

  const structuredData = (resume_data && typeof resume_data === 'object')
    ? resume_data
    : parseResumeTextToStructure(resume_text || '')

  const parts = []
  const p = structuredData.personal || {}
  if (p.name) parts.push(p.name)
  if (p.title) parts.push(p.title)
  if (structuredData.summary) parts.push(structuredData.summary)
  ;(structuredData.experience || []).forEach(exp => {
    if (exp.role) parts.push(exp.role)
    if (exp.company) parts.push(exp.company)
    ;(exp.bullets || []).forEach(b => parts.push(b))
  })
  ;(structuredData.skills || []).forEach(s => parts.push(s))
  ;(structuredData.education || []).forEach(edu => {
    if (edu.degree) parts.push(edu.degree)
    if (edu.school) parts.push(edu.school)
  })
  ;(structuredData.projects || []).forEach(proj => {
    if (proj.name) parts.push(proj.name)
    if (proj.desc) parts.push(proj.desc)
  })
  ;(structuredData.certifications || []).forEach(c => {
    if (c.name) parts.push(c.name)
  })

  const fullResumeText = parts.join('\n') || resume_text || ''

  // 1. Try AI-powered ATS evaluation first
  let aiAtsResult = null
  if (isGeminiAvailable()) {
    aiAtsResult = await analyzeWithAiAts(fullResumeText, job_description)
  }

  let finalScore = 0
  let finalBreakdown = null
  let finalStrengths = []
  let finalIssues = []
  let finalRecommendations = []
  let matchedKeywords = []
  let missingKeywords = []
  let keywordResult = null
  let isAiPowered = false
  let aiFeedback = ''

  if (aiAtsResult) {
    finalScore = aiAtsResult.score
    finalBreakdown = aiAtsResult.breakdown
    finalStrengths = aiAtsResult.strengths
    finalIssues = aiAtsResult.issues
    finalRecommendations = aiAtsResult.recommendations
    matchedKeywords = aiAtsResult.matched_keywords
    missingKeywords = aiAtsResult.missing_keywords
    aiFeedback = aiAtsResult.ai_feedback
    isAiPowered = true
    keywordResult = {
      score: aiAtsResult.score,
      matched: matchedKeywords,
      missing: missingKeywords,
      total_keywords: matchedKeywords.length + missingKeywords.length,
    }
  } else {
    // 2. Structured ATS analysis fallback
    const structureResult = analyzeResumeStructure(structuredData)
    if (job_description && job_description.trim().length >= 20) {
      keywordResult = analyzeKeywordMatch(fullResumeText, job_description)
      structureResult.score = Math.round(structureResult.score * 0.4 + keywordResult.score * 0.6)
    }
    finalScore = structureResult.score
    finalBreakdown = structureResult.breakdown
    finalStrengths = structureResult.strengths
    finalIssues = structureResult.issues
    finalRecommendations = structureResult.recommendations
    matchedKeywords = keywordResult ? keywordResult.matched : []
    missingKeywords = keywordResult ? keywordResult.missing : []
    isAiPowered = false
  }

  // Save to history if user is authenticated
  let record = null
  if (req.user?.id) {
    const { data, error } = await supabaseAdmin
      .from('ats_history')
      .insert({
        user_id:          req.user.id,
        resume_id:        resume_id || null,
        job_title:        job_title || null,
        company:          company   || null,
        job_description:  job_description || '',
        resume_text:      JSON.stringify(structuredData),
        score:            finalScore,
        matched_keywords: matchedKeywords,
        missing_keywords: missingKeywords,
        total_keywords:   matchedKeywords.length + missingKeywords.length,
      })
      .select()
      .single()

    if (error) console.error('ATS history save error:', error)
    record = data

    if (resume_id) {
      await supabaseAdmin
        .from('resumes')
        .update({ ats_score: finalScore })
        .eq('id', resume_id)
        .eq('user_id', req.user.id)
    }
  }

  res.json({
    score:            finalScore,
    breakdown:        finalBreakdown,
    strengths:        finalStrengths,
    issues:           finalIssues,
    recommendations:  finalRecommendations,
    matched_keywords: matchedKeywords,
    missing_keywords: missingKeywords,
    keyword_match:    keywordResult,
    ai_feedback:      aiFeedback,
    is_ai_powered:    isAiPowered,
    id:               record?.id,
    created_at:       record?.created_at,
  })
})

/* ── GET /api/ats/history ───────────────────────────────────── */
router.get('/history', requireAuth, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 50)
  const page  = parseInt(req.query.page) || 0

  const { data, error, count } = await supabaseAdmin
    .from('ats_history')
    .select('id, job_title, company, score, matched_keywords, missing_keywords, created_at', { count: 'exact' })
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1)

  if (error) return res.status(500).json({ error: error.message })

  res.json({
    data,
    total: count,
    page,
    limit,
  })
})

/* ── DELETE /api/ats/history/:id ────────────────────────────── */
router.delete('/history/:id', requireAuth, async (req, res) => {
  const { error } = await supabaseAdmin
    .from('ats_history')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ message: 'ATS history record deleted.' })
})

module.exports = router
