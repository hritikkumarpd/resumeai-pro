/**
 * ResumeAI Pro — Frontend Plan Configuration
 * Mirrors server/config/plans.js for UI display.
 * Prices in INR (display currency). No secrets.
 */

export const PLANS = {
  free: {
    key: 'free',
    name: 'Free',
    price: 0,
    currency: 'INR',
    symbol: '₹',
    interval: null,
    desc: 'Perfect to get started',
    cta: 'Get Started Free',
    featured: false,
    features: [
      '3 Resumes',
      '5 Basic Templates',
      'PDF Download',
      'Basic ATS Score',
      'Email Support',
    ],
    missing: [
      'AI Writing Assistant',
      'Unlimited Resumes',
      'Cover Letter Generator',
      'All 50+ Templates',
      'Priority Support',
      'DOCX Export',
    ],
  },
  monthly: {
    key: 'monthly',
    name: 'Pro Monthly',
    price: 99,
    currency: 'INR',
    symbol: '₹',
    interval: 'month',
    desc: 'For serious job seekers',
    cta: 'Upgrade to Pro',
    featured: true,
    features: [
      'Unlimited Resumes',
      'All 50+ Templates',
      'AI Writing Assistant',
      'Cover Letter Generator',
      'Advanced ATS Checker',
      'PDF & DOCX Export',
      'LinkedIn Optimization',
      'Priority Support',
      'Custom Colors & Fonts',
    ],
    missing: [],
  },
  yearly: {
    key: 'yearly',
    name: 'Pro Yearly',
    price: 999,
    currency: 'INR',
    symbol: '₹',
    interval: 'year',
    desc: 'Best value — save ₹189/year',
    cta: 'Upgrade to Pro Yearly',
    featured: false,
    features: [
      'Everything in Pro Monthly',
      'Priority Support',
      'All Future Updates',
    ],
    missing: [],
  },
}

/**
 * Check if a plan key grants premium features.
 */
export function isPaidPlan(planKey) {
  return planKey === 'monthly' || planKey === 'yearly'
}
