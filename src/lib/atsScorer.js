/**
 * Advanced ATS Score & Audit Engine
 * Performs 12 critical checks mimicking modern Enterprise ATS parsers (Workday, Taleo, Greenhouse, Lever).
 */

const STRONG_ACTION_VERBS = new Set([
  'architected', 'engineered', 'developed', 'deployed', 'implemented',
  'refactored', 'designed', 'automated', 'built', 'configured',
  'containerized', 'scaled', 'spearheaded', 'orchestrated', 'championed',
  'mentored', 'directed', 'led', 'guided', 'accelerated', 'streamlined',
  'overhauled', 'maximized', 'minimized', 'reduced', 'eliminated',
  'analyzed', 'benchmarked', 'evaluated', 'formulated', 'synthesized',
  'modeled', 'quantified', 'launched', 'delivered', 'executed', 'pioneered'
])

export function auditResumeATS(data) {
  if (!data) return { score: 0, grade: 'Needs Work', checks: [] }

  const checks = []
  let score = 0
  const maxScore = 100

  // 1. Contact: Full Name (Weight: 5)
  const hasName = Boolean(data.personal?.name && data.personal.name.trim().length >= 3)
  checks.push({
    id: 'name',
    category: 'Contact Info',
    label: 'Candidate Full Name',
    passed: hasName,
    points: hasName ? 5 : 0,
    maxPoints: 5,
    tip: hasName ? 'Full legal name provided.' : 'Add your full name at the top of your resume.'
  })
  if (hasName) score += 5

  // 2. Contact: Email (Weight: 5)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const hasEmail = Boolean(data.personal?.email && emailRegex.test(data.personal.email.trim()))
  checks.push({
    id: 'email',
    category: 'Contact Info',
    label: 'Professional Email Address',
    passed: hasEmail,
    points: hasEmail ? 5 : 0,
    maxPoints: 5,
    tip: hasEmail ? 'Valid email detected for recruiter contact.' : 'Provide a clean, professional email address.'
  })
  if (hasEmail) score += 5

  // 3. Contact: Phone (Weight: 5)
  const phoneClean = (data.personal?.phone || '').replace(/[\s\-\(\)\+]/g, '')
  const hasPhone = phoneClean.length >= 8
  checks.push({
    id: 'phone',
    category: 'Contact Info',
    label: 'Direct Phone Number',
    passed: hasPhone,
    points: hasPhone ? 5 : 0,
    maxPoints: 5,
    tip: hasPhone ? 'Phone number parsed correctly.' : 'Include a contact phone number with country code.'
  })
  if (hasPhone) score += 5

  // 4. Contact: LinkedIn or Portfolio URL (Weight: 5)
  const hasLink = Boolean(data.personal?.linkedin?.trim() || data.personal?.website?.trim())
  checks.push({
    id: 'links',
    category: 'Contact Info',
    label: 'LinkedIn / GitHub / Portfolio Link',
    passed: hasLink,
    points: hasLink ? 5 : 0,
    maxPoints: 5,
    tip: hasLink ? 'Online portfolio or professional profile linked.' : 'Add your LinkedIn or GitHub profile URL to boost recruiter credibility.'
  })
  if (hasLink) score += 5

  // 5. Professional Summary (Weight: 10)
  const summaryText = (data.summary || '').trim()
  const summaryWords = summaryText ? summaryText.split(/\s+/).length : 0
  const hasGoodSummary = summaryWords >= 30 && summaryWords <= 140
  checks.push({
    id: 'summary',
    category: 'Summary',
    label: 'Concise Professional Summary (30–120 words)',
    passed: hasGoodSummary,
    points: hasGoodSummary ? 10 : (summaryWords > 0 ? 5 : 0),
    maxPoints: 10,
    tip: hasGoodSummary
      ? `Summary length is optimal (${summaryWords} words).`
      : summaryWords === 0
        ? 'Add a 3-4 sentence summary highlighting target role and core achievements.'
        : `Summary is ${summaryWords < 30 ? 'too short (under 30 words)' : 'too long (over 140 words)'}. Aim for 3-4 punchy sentences.`
  })
  score += hasGoodSummary ? 10 : (summaryWords > 0 ? 5 : 0)

  // 6. First-Person Pronouns Check (Weight: 5)
  // ATS best practice: never use "I", "me", "my", "we"
  const allText = [
    summaryText,
    ...(data.experience || []).flatMap(e => e.bullets || []),
    ...(data.projects || []).map(p => p.desc || '')
  ].join(' ')
  const pronounMatch = allText.match(/\b(I|me|my|myself|we|our|us)\b/i)
  const noFirstPerson = !pronounMatch
  checks.push({
    id: 'first_person',
    category: 'ATS Standards',
    label: 'No First-Person Pronouns (I, me, my)',
    passed: noFirstPerson,
    points: noFirstPerson ? 5 : 0,
    maxPoints: 5,
    tip: noFirstPerson
      ? 'Clean 3rd-person executive tone maintained.'
      : `Avoid personal pronouns like "${pronounMatch?.[0]}". Begin bullet points directly with past-tense action verbs.`
  })
  if (noFirstPerson) score += 5

  // 7. Work Experience Entries (Weight: 10)
  const expCount = (data.experience || []).filter(e => e.company?.trim() && e.role?.trim()).length
  const hasExp = expCount >= 1
  checks.push({
    id: 'experience_entries',
    category: 'Experience',
    label: 'Structured Work Experience / Internships',
    passed: hasExp,
    points: expCount >= 2 ? 10 : (expCount === 1 ? 7 : 0),
    maxPoints: 10,
    tip: expCount >= 2
      ? `${expCount} verified professional roles documented.`
      : expCount === 1
        ? '1 experience entry found. Adding 1 more internship or role improves candidate ranking.'
        : 'Add at least 1 work experience or relevant internship.'
  })
  score += expCount >= 2 ? 10 : (expCount === 1 ? 7 : 0)

  // 8. Measurable Metrics & Numbers (Weight: 15)
  // Detects: 25%, $1.5M, 15,000, 3x, 40ms, 99.9%, etc.
  const allBullets = (data.experience || []).flatMap(e => e.bullets || []).filter(Boolean)
  const metricRegex = /(\d+[\.,]?\d*[%kKmMxXbB]?|\$\d+|\d+\+|\b\d+\b)/
  const bulletsWithMetrics = allBullets.filter(b => metricRegex.test(b)).length
  const hasMetrics = bulletsWithMetrics >= 2
  checks.push({
    id: 'metrics',
    category: 'Experience',
    label: 'Quantifiable Metrics & Numbers in Bullets',
    passed: hasMetrics,
    points: bulletsWithMetrics >= 3 ? 15 : (bulletsWithMetrics >= 1 ? 8 : 0),
    maxPoints: 15,
    tip: hasMetrics
      ? `${bulletsWithMetrics} bullet points include measurable metrics (%, numbers, scale).`
      : 'Include quantifiable results (e.g. "reduced latency by 35%", "handled 10k+ users"). Recruiters favor numbers.'
  })
  score += bulletsWithMetrics >= 3 ? 15 : (bulletsWithMetrics >= 1 ? 8 : 0)

  // 9. Strong Action Verbs (Weight: 10)
  let actionVerbsFound = 0
  allBullets.forEach(b => {
    const firstWord = b.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, '')
    if (STRONG_ACTION_VERBS.has(firstWord)) actionVerbsFound++
  })
  const hasActionVerbs = actionVerbsFound >= 2
  checks.push({
    id: 'action_verbs',
    category: 'Experience',
    label: 'Strong Action Verbs starting Bullets',
    passed: hasActionVerbs,
    points: actionVerbsFound >= 3 ? 10 : (actionVerbsFound >= 1 ? 5 : 0),
    maxPoints: 10,
    tip: hasActionVerbs
      ? `${actionVerbsFound} bullets start with strong past-tense action verbs.`
      : 'Start each bullet point with a powerful past-tense verb (e.g. Architected, Engineered, Spearheaded, Accelerated).'
  })
  score += actionVerbsFound >= 3 ? 10 : (actionVerbsFound >= 1 ? 5 : 0)

  // 10. Technical & Core Skills Density (Weight: 15)
  const skillsCount = (data.skills || []).filter(s => s && s.trim()).length
  const hasGoodSkills = skillsCount >= 8
  checks.push({
    id: 'skills',
    category: 'Skills',
    label: 'Comprehensive Skills Density (8+ skills)',
    passed: hasGoodSkills,
    points: skillsCount >= 10 ? 15 : (skillsCount >= 5 ? 8 : 0),
    maxPoints: 15,
    tip: hasGoodSkills
      ? `${skillsCount} skills listed for ATS keyword indexing.`
      : `Only ${skillsCount} skill(s) listed. Add at least 8-12 relevant technical tools & frameworks.`
  })
  score += skillsCount >= 10 ? 15 : (skillsCount >= 5 ? 8 : 0)

  // 11. Education Section (Weight: 8)
  const eduCount = (data.education || []).filter(e => e.school?.trim() && e.degree?.trim()).length
  const hasEdu = eduCount >= 1
  checks.push({
    id: 'education',
    category: 'Education',
    label: 'Verified Degree & College Information',
    passed: hasEdu,
    points: hasEdu ? 8 : 0,
    maxPoints: 8,
    tip: hasEdu ? 'Degree and institution details provided.' : 'Add your college, degree branch, and graduation year.'
  })
  if (hasEdu) score += 8

  // 12. Technical Projects (Weight: 7)
  const projCount = (data.projects || []).filter(p => p.name?.trim()).length
  const hasProjects = projCount >= 1
  checks.push({
    id: 'projects',
    category: 'Projects',
    label: 'Key Projects with Descriptions & Links',
    passed: hasProjects,
    points: projCount >= 2 ? 7 : (projCount === 1 ? 4 : 0),
    maxPoints: 7,
    tip: hasProjects
      ? `${projCount} project(s) showcase hands-on technical execution.`
      : 'Include at least 1-2 notable projects to prove practical competency.'
  })
  score += projCount >= 2 ? 7 : (projCount === 1 ? 4 : 0)

  const finalScore = Math.min(Math.max(score, 15), maxScore)
  const grade = finalScore >= 90 ? 'A+ (Top 5%)'
              : finalScore >= 80 ? 'A (Strong ATS Pass)'
              : finalScore >= 65 ? 'B (Moderate Match)'
              : 'Needs Improvement'

  const passedCount = checks.filter(c => c.passed).length

  return {
    score: finalScore,
    grade,
    passedCount,
    totalChecks: checks.length,
    checks,
    metricsCount: bulletsWithMetrics,
    actionVerbsCount: actionVerbsFound
  }
}
