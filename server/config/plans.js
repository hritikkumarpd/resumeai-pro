/**
 * ResumeAI Pro — Centralized Plan Configuration
 * Single source of truth for pricing, limits, and plan metadata.
 * All monetary amounts stored in paise (1 INR = 100 paise) for Razorpay.
 */

const PLANS = {
  free: {
    key: 'free',
    label: 'Free',
    price: 0,
    paise: 0,
    currency: 'INR',
    interval: null,
    resumeLimit: 3,
    features: {
      aiEnhancer: false,
      advancedAts: false,
      coverLetter: false,
      allTemplates: false,
      docxExport: false,
    },
  },
  monthly: {
    key: 'monthly',
    label: 'Pro Monthly',
    price: 99,
    paise: 9900,
    currency: 'INR',
    interval: 'month',
    resumeLimit: Infinity,
    features: {
      aiEnhancer: true,
      advancedAts: true,
      coverLetter: true,
      allTemplates: true,
      docxExport: true,
    },
  },
  yearly: {
    key: 'yearly',
    label: 'Pro Yearly',
    price: 999,
    paise: 99900,
    currency: 'INR',
    interval: 'year',
    resumeLimit: Infinity,
    features: {
      aiEnhancer: true,
      advancedAts: true,
      coverLetter: true,
      allTemplates: true,
      docxExport: true,
    },
  },
}

/**
 * Valid paid plan keys (excludes 'free')
 */
const PAID_PLAN_KEYS = Object.keys(PLANS).filter(k => k !== 'free')

/**
 * Look up plan config by key. Returns null if invalid.
 */
function getPlan(key) {
  return PLANS[key] || null
}

/**
 * Check if a plan key is a paid (premium) plan.
 */
function isPaidPlan(planKey) {
  return planKey === 'monthly' || planKey === 'yearly'
}

module.exports = { PLANS, PAID_PLAN_KEYS, getPlan, isPaidPlan }
