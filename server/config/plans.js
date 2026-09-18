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
 * Plan key aliases for backward compatibility with older deployments and variations
 */
const PLAN_ALIASES = {
  pro: 'monthly',
  pro_monthly: 'monthly',
  'pro monthly': 'monthly',
  promonthly: 'monthly',
  'pro-monthly': 'monthly',
  pro_plan: 'monthly',
  'pro plan': 'monthly',
  pro_yearly: 'yearly',
  'pro yearly': 'yearly',
  proyearly: 'yearly',
  'pro-yearly': 'yearly',
  lifetime: 'yearly',
  enterprise: 'yearly',
  starter: 'monthly',
}

function resolvePlanKey(key) {
  if (!key) return null
  const str = String(key).trim()
  const lower = str.toLowerCase()
  const normalized = lower.replace(/[\s-]+/g, '_')
  return PLAN_ALIASES[normalized] || PLAN_ALIASES[lower] || PLAN_ALIASES[str] || (PLANS[normalized] ? normalized : lower)
}

/**
 * Valid paid plan keys (excludes 'free')
 */
const PAID_PLAN_KEYS = ['monthly', 'yearly', 'pro', 'pro_monthly', 'pro_yearly', 'lifetime', 'enterprise', 'starter']

/**
 * Look up plan config by key. Returns null if invalid.
 */
function getPlan(key) {
  const resolved = resolvePlanKey(key)
  return PLANS[resolved] || null
}

/**
 * Check if a plan key is a paid (premium) plan.
 */
function isPaidPlan(planKey) {
  if (!planKey) return false
  const resolved = resolvePlanKey(planKey)
  return resolved === 'monthly' || resolved === 'yearly'
}

module.exports = { PLANS, PAID_PLAN_KEYS, getPlan, isPaidPlan, resolvePlanKey }
