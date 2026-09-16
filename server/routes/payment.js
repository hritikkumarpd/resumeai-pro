const router = require('express').Router()
const crypto = require('crypto')
const { requireAuth, optionalAuth } = require('../middleware/requireAuth')
const { razorpay } = require('../lib/razorpay')
const { supabaseAdmin } = require('../lib/supabase')
const { sendSubscriptionEmail } = require('../lib/mailer')
const { PLANS, getPlan, isPaidPlan } = require('../config/plans')

/* ── POST /api/payment/create-order ────────────────────────── */
async function handleCreateOrder(req, res) {
  const { plan, amount, currency, receipt } = req.body

  let orderAmount = 0
  let orderCurrency = currency || 'INR'
  let orderPlan = null
  let planLabel = 'ResumeAI Pro Upgrade'

  if (plan) {
    if (!isPaidPlan(plan)) {
      return res.status(400).json({
        error: `Invalid plan: ${plan}. Valid paid plans: monthly, yearly`,
      })
    }
    const planConfig = getPlan(plan)
    if (!planConfig) {
      return res.status(400).json({ error: 'Plan configuration not found.' })
    }
    orderAmount = planConfig.paise
    orderCurrency = planConfig.currency || 'INR'
    orderPlan = plan
    planLabel = planConfig.label
  } else if (amount) {
    orderAmount = parseInt(amount, 10)
  }

  // Minimum amount validation: 100 paise (₹1)
  if (!orderAmount || isNaN(orderAmount) || orderAmount < 100) {
    return res.status(400).json({ error: 'Amount must be at least 100 paise (₹1).' })
  }

  // Pre-flight check: Ensure Razorpay credentials are set in environment
  const keyId = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET
  if (!keyId || !keySecret || keyId.includes('placeholder') || keySecret.includes('placeholder')) {
    console.error('Razorpay credentials missing or placeholder on server!')
    return res.status(500).json({
      error: 'Razorpay keys not configured on backend. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Render Environment Variables.',
    })
  }
  try {
    const userIdShort = (req.user?.id || 'guest').replace(/[^a-zA-Z0-9]/g, '').slice(-8)
    const orderReceipt = (receipt || `rcpt_${userIdShort}_${Date.now()}`).slice(0, 40)
    const order = await razorpay.orders.create({
      amount:   orderAmount,
      currency: orderCurrency,
      receipt:  orderReceipt,
      notes: {
        supabase_user_id: req.user?.id || null,
        plan: orderPlan,
      },
    })

    res.json({
      order_id:   order.id,
      amount:     order.amount,
      currency:   order.currency,
      key_id:     process.env.RAZORPAY_KEY_ID,
      plan_label: planLabel,
    })
  } catch (err) {
    console.error('Razorpay create order error:', err)

    if (err.statusCode === 401) {
      return res.status(401).json({ error: 'Razorpay authentication failed. Check API credentials on Render.' })
    }

    res.status(500).json({ error: err.error?.description || err.message || 'Failed to create payment order. Please try again.' })
  }
}

router.post('/create-order', optionalAuth, handleCreateOrder)

/* ── POST /api/payment/verify & /api/payment/verify-payment ── */
async function handleVerifyPayment(req, res) {
  const orderId   = req.body.razorpay_order_id   || req.body.order_id
  const paymentId = req.body.razorpay_payment_id || req.body.payment_id
  const signature = req.body.razorpay_signature  || req.body.signature
  const plan      = req.body.plan

  // Validate required fields
  if (!orderId || !paymentId || !signature) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: razorpay_order_id, razorpay_payment_id, razorpay_signature',
    })
  }

  const secret = process.env.RAZORPAY_KEY_SECRET
  if (!secret) {
    console.error('RAZORPAY_KEY_SECRET is not configured on server')
    return res.status(500).json({ success: false, error: 'Payment gateway configuration error.' })
  }

  // 1. Verify HMAC signature using timingSafeEqual: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
  const body = `${orderId}|${paymentId}`
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex')

  let isMatch = false
  try {
    const expectedBuf = Buffer.from(expectedSignature, 'utf8')
    const actualBuf   = Buffer.from(String(signature), 'utf8')
    isMatch = expectedBuf.length === actualBuf.length && crypto.timingSafeEqual(expectedBuf, actualBuf)
  } catch {
    isMatch = false
  }

  if (!isMatch) {
    console.error('Payment verification failed — signature mismatch', {
      order_id:   orderId,
      payment_id: paymentId,
    })
    return res.status(400).json({ success: false, error: 'Payment verification failed. Signature mismatch.' })
  }

  // 2. Anti-replay protection: verify payment hasn't already been processed
  if (req.user?.id) {
    try {
      const { data: existingPayment } = await supabaseAdmin
        .from('payments')
        .select('id')
        .eq('payment_id', paymentId)
        .maybeSingle()

      if (existingPayment) {
        return res.status(409).json({ success: false, error: 'This payment has already been verified and processed.' })
      }
    } catch (_) {}
  }

  // 3. Security: Fetch order details directly from Razorpay if plan is specified
  let verifiedPlanKey = plan
  let orderAmount = 0
  if (verifiedPlanKey) {
    try {
      const rzpOrder = await razorpay.orders.fetch(orderId)
      if (rzpOrder) {
        const trustedPlanKey = rzpOrder.notes?.plan || plan
        const trustedPlan = getPlan(trustedPlanKey)
        if (trustedPlan && isPaidPlan(trustedPlanKey)) {
          verifiedPlanKey = trustedPlanKey
          orderAmount = rzpOrder.amount
        }
      }
    } catch (_) {}
  }

  // 4. Record payment and update subscription if user is authenticated
  if (req.user?.id) {
    try {
      await supabaseAdmin.from('payments').insert({
        user_id:    req.user.id,
        order_id:   orderId,
        payment_id: paymentId,
        plan:       verifiedPlanKey || 'monthly',
        amount:     orderAmount || 0,
        status:     'success',
      }).catch(err => console.warn('Payment ledger insert skipped:', err?.message))

      const now = new Date()
      let expiresAt = new Date(now)
      if (verifiedPlanKey === 'yearly') {
        expiresAt.setFullYear(expiresAt.getFullYear() + 1)
      } else {
        expiresAt.setMonth(expiresAt.getMonth() + 1)
      }

      await supabaseAdmin.from('profiles').update({
        plan:                verifiedPlanKey || 'monthly',
        subscription_status: 'active',
        subscription_end:    expiresAt.toISOString(),
        updated_at:          now.toISOString(),
      }).eq('id', req.user.id).catch(err => console.warn('Profile update skipped:', err?.message))

      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('full_name')
        .eq('id', req.user.id)
        .single()
        .catch(() => ({ data: null }))

      const { data: authUser } = await supabaseAdmin.auth.admin
        .getUserById(req.user.id)
        .catch(() => ({ data: null }))

      if (authUser?.user?.email) {
        sendSubscriptionEmail(
          authUser.user.email,
          profile?.full_name,
          verifiedPlanKey || 'monthly',
        ).catch(console.error)
      }
    } catch (err) {
      console.warn('Post-payment account updates skipped:', err?.message)
    }
  }

  res.json({
    success:    true,
    message:    'Payment verified successfully!',
    payment_id: paymentId,
    order_id:   orderId,
    plan:       verifiedPlanKey || null,
  })
}

router.post('/verify', optionalAuth, handleVerifyPayment)
router.post('/verify-payment', optionalAuth, handleVerifyPayment)

/* ── POST /api/payment/webhook ─────────────────────────────── */
router.post('/webhook', async (req, res) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.warn('RAZORPAY_WEBHOOK_SECRET not configured — webhook disabled')
    return res.status(200).json({ status: 'ignored' })
  }

  // Verify webhook signature
  const receivedSignature = req.headers['x-razorpay-signature']
  if (!receivedSignature) {
    return res.status(400).json({ error: 'Missing webhook signature' })
  }

  const payloadToVerify = req.rawBody || JSON.stringify(req.body)
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(payloadToVerify)
    .digest('hex')

  const expectedBuf = Buffer.from(expectedSignature, 'hex')
  const actualBuf   = Buffer.from(receivedSignature, 'hex')

  if (expectedBuf.length !== actualBuf.length || !crypto.timingSafeEqual(expectedBuf, actualBuf)) {
    console.error('Webhook signature verification failed')
    return res.status(400).json({ error: 'Invalid webhook signature' })
  }

  const event = req.body
  const eventId = event.event_id || `${event.event}_${Date.now()}`
  const eventType = event.event

  // Idempotency check
  const { data: existing } = await supabaseAdmin
    .from('webhook_events')
    .select('id')
    .eq('event_id', eventId)
    .maybeSingle()

  if (existing) {
    return res.status(200).json({ status: 'already_processed' })
  }

  // Log webhook event
  await supabaseAdmin.from('webhook_events').insert({
    event_id:   eventId,
    event_type: eventType,
    payload:    event,
    processed:  true,
  }).catch(err => console.error('Failed to log webhook event:', err))

  // Handle relevant events
  if (eventType === 'payment.captured') {
    const payment = event.payload?.payment?.entity
    if (payment) {
      const userId = payment.notes?.supabase_user_id
      const planKey = payment.notes?.plan
      if (userId && planKey && isPaidPlan(planKey)) {
        // Update profile (same as verify endpoint, serves as backup)
        const now = new Date()
        let expiresAt = new Date(now)
        if (planKey === 'monthly') expiresAt.setMonth(expiresAt.getMonth() + 1)
        else if (planKey === 'yearly') expiresAt.setFullYear(expiresAt.getFullYear() + 1)

        await supabaseAdmin.from('profiles').update({
          plan:                planKey,
          subscription_status: 'active',
          subscription_end:    expiresAt.toISOString(),
          updated_at:          now.toISOString(),
        }).eq('id', userId).catch(err => console.error('Webhook profile update error:', err))
      }
    }
  } else if (eventType === 'payment.failed') {
    const payment = event.payload?.payment?.entity
    if (payment) {
      console.warn('Payment failed via webhook:', payment.id, payment.error_description)
    }
  }

  res.status(200).json({ status: 'ok' })
})

router.handleCreateOrder = handleCreateOrder
router.handleVerifyPayment = handleVerifyPayment
module.exports = router
