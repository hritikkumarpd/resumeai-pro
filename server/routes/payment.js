const router = require('express').Router()
const crypto = require('crypto')
const { requireAuth } = require('../middleware/requireAuth')
const { razorpay } = require('../lib/razorpay')
const { supabaseAdmin } = require('../lib/supabase')
const { sendSubscriptionEmail } = require('../lib/mailer')

/* ── Plan → amount mapping (in paise) ──────────────────────── */
const PLAN_PRICES = {
  pro_monthly: { amount: 158100,  currency: 'INR', label: 'Pro Monthly'  },   // ₹1,581
  pro_yearly:  { amount: 1198800, currency: 'INR', label: 'Pro Yearly'   },   // ₹11,988
  lifetime:    { amount: 1241200, currency: 'INR', label: 'Lifetime'     },   // ₹12,412
}

/* ── POST /api/payment/create-order ────────────────────────── */
router.post('/create-order', requireAuth, async (req, res) => {
  const { plan } = req.body

  const planConfig = PLAN_PRICES[plan]
  if (!planConfig) {
    return res.status(400).json({ error: `Invalid plan: ${plan}. Valid plans: ${Object.keys(PLAN_PRICES).join(', ')}` })
  }

  if (planConfig.amount < 100) {
    return res.status(400).json({ error: 'Amount must be at least 100 paise (₹1).' })
  }

  try {
    const order = await razorpay.orders.create({
      amount:   planConfig.amount,
      currency: planConfig.currency,
      receipt:  `receipt_${req.user.id}_${Date.now()}`,
      notes: {
        supabase_user_id: req.user.id,
        plan,
      },
    })

    res.json({
      order_id: order.id,
      amount:   order.amount,
      currency: order.currency,
      key_id:   process.env.RAZORPAY_KEY_ID,
      plan_label: planConfig.label,
    })
  } catch (err) {
    console.error('Razorpay create order error:', err)

    if (err.statusCode === 401) {
      return res.status(401).json({ error: 'Razorpay authentication failed. Check API credentials.' })
    }

    res.status(500).json({ error: 'Failed to create payment order. Please try again.' })
  }
})

/* ── POST /api/payment/verify ──────────────────────────────── */
router.post('/verify', requireAuth, async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = req.body

  // Validate required fields
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({
      error: 'Missing required fields: razorpay_order_id, razorpay_payment_id, razorpay_signature',
    })
  }

  if (!plan || !PLAN_PRICES[plan]) {
    return res.status(400).json({ error: `Invalid or missing plan: ${plan}` })
  }

  // Verify signature using HMAC-SHA256
  const body = `${razorpay_order_id}|${razorpay_payment_id}`
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex')

  if (expectedSignature !== razorpay_signature) {
    console.error('Payment verification failed — signature mismatch', {
      order_id:   razorpay_order_id,
      payment_id: razorpay_payment_id,
    })
    return res.status(400).json({ error: 'Payment verification failed. Signature mismatch.' })
  }

  // Signature verified — update user profile
  const planName = plan.replace(/_monthly|_yearly/, '')

  try {
    await supabaseAdmin.from('profiles').update({
      plan:                planName,
      subscription_status: 'active',
    }).eq('id', req.user.id)

    // Send confirmation email
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', req.user.id)
      .single()

    const { data: user } = await supabaseAdmin.auth.admin.getUserById(req.user.id)

    sendSubscriptionEmail(
      user?.user?.email,
      profile?.full_name,
      planName,
    ).catch(console.error)

    res.json({
      success:    true,
      message:    'Payment verified successfully!',
      payment_id: razorpay_payment_id,
      order_id:   razorpay_order_id,
    })
  } catch (err) {
    console.error('Error updating profile after payment:', err)
    res.status(500).json({ error: 'Payment verified but failed to update profile. Contact support.' })
  }
})

module.exports = router
