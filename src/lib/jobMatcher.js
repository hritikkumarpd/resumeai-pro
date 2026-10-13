/**
 * Target Job Description (JD) Keyword Matcher & Gap Analysis Engine
 * Extracts hard skills, technologies, and core qualifications from any pasted job posting.
 */

const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and',
  'any', 'are', 'aren\'t', 'as', 'at', 'be', 'because', 'been', 'before', 'being',
  'below', 'between', 'both', 'but', 'by', 'can', 'can\'t', 'cannot', 'could',
  'couldn\'t', 'did', 'didn\'t', 'do', 'does', 'doesn\'t', 'doing', 'don\'t',
  'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', 'hadn\'t',
  'has', 'hasn\'t', 'have', 'haven\'t', 'having', 'he', 'he\'d', 'he\'ll', 'he\'s',
  'her', 'here', 'here\'s', 'hers', 'herself', 'him', 'himself', 'his', 'how',
  'how\'s', 'i', 'i\'d', 'i\'ll', 'i\'m', 'i\'ve', 'if', 'in', 'into', 'is',
  'isn\'t', 'it', 'it\'s', 'its', 'itself', 'let\'s', 'me', 'more', 'most',
  'mustn\'t', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once',
  'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over',
  'own', 'same', 'shan\'t', 'she', 'she\'d', 'she\'ll', 'she\'s', 'should',
  'shouldn\'t', 'so', 'some', 'such', 'than', 'that', 'that\'s', 'the', 'their',
  'theirs', 'them', 'themselves', 'then', 'there', 'there\'s', 'these', 'they',
  'they\'d', 'they\'ll', 'they\'re', 'they\'ve', 'this', 'those', 'through',
  'to', 'too', 'under', 'until', 'up', 'very', 'was', 'wasn\'t', 'we', 'we\'d',
  'we\'ll', 'we\'re', 'we\'ve', 'were', 'weren\'t', 'what', 'what\'s', 'when',
  'when\'s', 'where', 'where\'s', 'which', 'while', 'who', 'who\'s', 'whom',
  'why', 'why\'s', 'with', 'won\'t', 'would', 'wouldn\'t', 'you', 'you\'d',
  'you\'ll', 'you\'re', 'you\'ve', 'your', 'yours', 'yourself', 'yourselves',
  'job', 'role', 'team', 'company', 'work', 'working', 'experience', 'years',
  'skills', 'ability', 'strong', 'knowledge', 'responsibilities', 'requirements',
  'candidate', 'looking', 'opportunity', 'plus', 'preferred', 'degree', 'bachelor',
  'bachelors', 'master', 'masters', 'joining', 'join', 'help', 'ideal', 'apply'
])

export function analyzeJobDescriptionMatch(jdText, resumeData) {
  if (!jdText || !jdText.trim()) {
    return {
      matchRate: 0,
      matchedKeywords: [],
      missingKeywords: [],
      recommendations: []
    }
  }

  // Aggregate all words in the resume
  const resumeText = [
    resumeData.personal?.title || '',
    resumeData.summary || '',
    ...(resumeData.skills || []),
    ...(resumeData.experience || []).flatMap(e => [e.company, e.role, ...(e.bullets || [])]),
    ...(resumeData.projects || []).flatMap(p => [p.name, p.desc]),
    ...(resumeData.education || []).flatMap(ed => [ed.school, ed.degree])
  ].join(' ').toLowerCase()

  // Clean tokens from JD
  const cleanedJd = jdText
    .toLowerCase()
    .replace(/[^a-z0-9+#\.\s\-]/g, ' ')

  const words = cleanedJd.split(/\s+/).filter(w => w.length >= 3 && !STOP_WORDS.has(w))

  // Count word frequencies to identify priority keywords
  const freq = {}
  words.forEach(w => {
    // normalize common tech aliases
    const term = w.replace(/^[\.\-]+|[\.\-]+$/g, '')
    if (term.length >= 3 && !STOP_WORDS.has(term)) {
      freq[term] = (freq[term] || 0) + 1
    }
  })

  // Extract top keywords sorted by frequency
  const sortedKeywords = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([term]) => term)

  const matchedKeywords = []
  const missingKeywords = []

  sortedKeywords.forEach(kw => {
    // Check if resume contains keyword
    const escaped = kw.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')
    const regex = new RegExp(`\\b${escaped}\\b`, 'i')
    if (regex.test(resumeText)) {
      matchedKeywords.push(kw)
    } else {
      missingKeywords.push(kw)
    }
  })

  const total = sortedKeywords.length
  const matchRate = total > 0 ? Math.round((matchedKeywords.length / total) * 100) : 0

  const recommendations = []
  if (missingKeywords.length > 0) {
    recommendations.push(`Add top missing keywords (${missingKeywords.slice(0, 5).join(', ')}) into your Skills or Experience bullet points.`)
  }
  if (matchRate < 60) {
    recommendations.push('Your resume match is below 60%. Consider tailoring your Professional Summary to mirror the role title and primary requirements.')
  } else if (matchRate >= 80) {
    recommendations.push('High match rate! Your resume is strongly aligned with this job posting.')
  }

  return {
    matchRate,
    matchedKeywords,
    missingKeywords,
    recommendations
  }
}
