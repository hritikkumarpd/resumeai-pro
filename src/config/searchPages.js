export const siteOrigin = 'https://www.dailyresumeai.online'
export const siteName = 'DailyResumeAI'

export const publicPages = {
  '/': {
    title: 'DailyResumeAI | Resume Builder and ATS Checker',
    heading: 'DailyResumeAI resume builder and ATS checker',
    description: 'Build a resume, check it against a job description, and draft a cover letter with DailyResumeAI. Explore resume templates and export your resume as a PDF.',
  },
  '/templates': {
    title: 'Resume Templates | DailyResumeAI',
    heading: 'DailyResumeAI resume templates',
    description: 'Explore resume layouts for freshers, experienced professionals and campus placements. Choose a template, customize its font, and edit your experience.',
  },
  '/pricing': {
    title: 'Resume Builder Plans and Pricing | DailyResumeAI',
    heading: 'DailyResumeAI plans and pricing',
    description: 'Compare DailyResumeAI’s free and paid resume builder plans, view pricing in Indian rupees, and review the features available with each plan.',
  },
}

export const websiteSchema = {
  '@context': 'https://schema.org', '@type': 'WebSite', name: siteName,
  alternateName: ['Daily Resume AI', 'ResumeAI Pro'], url: siteOrigin + '/',
}
