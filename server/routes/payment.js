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

  const secret = process.env.RAZORPAY_KEY_SECRET
  if (!secret) {
    console.error('RAZORPAY_KEY_SECRET is not configured on server')
    return res.status(500).json({ error: 'Payment gateway configuration error.' })
  }

  // 1. Verify HMAC signature using timingSafeEqual
  const body = `${razorpay_order_id}|${razorpay_payment_id}`
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex')

  const expectedBuf = Buffer.from(expectedSignature, 'hex')
  const actualBuf   = Buffer.from(razorpay_signature, 'hex')

  if (expectedBuf.length !== actualBuf.length || !crypto.timingSafeEqual(expectedBuf, actualBuf)) {
    console.error('Payment verification failed — signature mismatch', {
      order_id:   razorpay_order_id,
      payment_id: razorpay_payment_id,
    })
    return res.status(400).json({ error: 'Payment verification failed. Signature mismatch.' })
  }

  // 2. Anti-replay protection: verify payment hasn't already been processed
  const { data: existingPayment } = await supabaseAdmin
    .from('payments')
    .select('id')
    .eq('payment_id', razorpay_payment_id)
    .maybeSingle()

  if (existingPayment) {
    return res.status(409).json({ error: 'This payment has already been verified and processed.' })
  }

  // 3. Security: Fetch order details directly from Razorpay to prevent plan tampering
  let verifiedPlanKey = plan
  let orderAmount = 0
  try {
    const rzpOrder = await razorpay.orders.fetch(razorpay_order_id)
    if (!rzpOrder) {
      return res.status(400).json({ error: 'Order not found in payment gateway.' })
    }

    // Verify order belonged to current authenticated user
    if (rzpOrder.notes?.supabase_user_id && rzpOrder.notes.supabase_user_id !== req.user.id) {
      console.error('Payment order user mismatch:', { orderUser: rzpOrder.notes.supabase_user_id, reqUser: req.user.id })
      return res.status(403).json({ error: 'Payment order does not belong to this user account.' })
    }

    // Derive plan directly from trusted Razorpay order notes
    const trustedPlanKey = rzpOrder.notes?.plan || plan
    if (!PLAN_PRICES[trustedPlanKey]) {
      return res.status(400).json({ error: `Invalid plan specified in order: ${trustedPlanKey}` })
    }

    // Verify amount matches plan pricing
    if (rzpOrder.amount < PLAN_PRICES[trustedPlanKey].amount) {
      console.error('Payment amount tampering detected:', { orderAmount: rzpOrder.amount, expected: PLAN_PRICES[trustedPlanKey].amount })
      return res.status(400).json({ error: 'Payment amount does not match plan price.' })
    }

    verifiedPlanKey = trustedPlanKey
    orderAmount = rzpOrder.amount
  } catch (fetchErr) {
    console.warn('Could not fetch Razorpay order directly, checking fallback plan config:', fetchErr?.message)
    if (!verifiedPlanKey || !PLAN_PRICES[verifiedPlanKey]) {
      return res.status(400).json({ error: `Invalid or missing plan: ${verifiedPlanKey}` })
    }
    orderAmount = PLAN_PRICES[verifiedPlanKey].amount
  }

  // 4. Derive canonical clean plan name ('pro' or 'lifetime')
  const planName = verifiedPlanKey.replace(/_monthly|_yearly/, '')

  try {
    // Record payment in payments ledger (guarantees anti-replay)
    await supabaseAdmin.from('payments').insert({
      user_id:    req.user.id,
      order_id:   razorpay_order_id,
      payment_id: razorpay_payment_id,
      plan:       planName,
      amount:     orderAmount,
      status:     'success',
    })

    // Update user profile plan
    await supabaseAdmin.from('profiles').update({
      plan:                planName,
      subscription_status: 'active',
      updated_at:          new Date().toISOString(),
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
      plan:       planName,
    })
  } catch (err) {
    console.error('Error recording payment / updating profile:', err)
    res.status(500).json({ error: 'Payment verified but failed to update profile. Contact support.' })
  }
})

module.exports = router
