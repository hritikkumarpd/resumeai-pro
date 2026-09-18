const router = require('express').Router()
const crypto = require('crypto')
const { requireAuth, optionalAuth } = require('../middleware/requireAuth')
const { razorpay } = require('../lib/razorpay')
const { supabaseAdmin } = require('../lib/supabase')
const { sendSubscriptionEmail } = require('../lib/mailer')
const { PLANS, getPlan, isPaidPlan, resolvePlanKey } = require('../config/plans')

/* ── POST /api/payment/create-order ────────────────────────── */
async function handleCreateOrder(req, res) {
  const { plan, receipt } = req.body

  if (!plan || !isPaidPlan(plan)) {
    return res.status(400).json({
      error: `Valid paid plan required ('monthly' or 'yearly'). Received: ${plan || 'none'}`,
    })
  }

  const resolvedPlanKey = resolvePlanKey(plan)
  const planConfig = getPlan(resolvedPlanKey)
  if (!planConfig || !planConfig.paise) {
    return res.status(400).json({ error: 'Plan configuration not found.' })
  }

  const orderAmount = planConfig.paise
  const orderCurrency = planConfig.currency || 'INR'
  const planLabel = planConfig.label

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
    const ts = Date.now().toString(36)  // base36 timestamp = 8 chars max
    const rawReceipt = receipt || `rcpt_${userIdShort}_${ts}`
    const orderReceipt = rawReceipt.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40)
    const order = await razorpay.orders.create({
      amount:   orderAmount,
      currency: orderCurrency,
      receipt:  orderReceipt,
      notes: {
        supabase_user_id: req.user?.id || null,
        plan: resolvedPlanKey,
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
    } catch (replayErr) {
      console.warn('Anti-replay check failed (table may not exist yet):', replayErr?.message)
      // Non-fatal: continue with verification — table may not be created yet
    }
  }

  // 3. Security: Fetch order details directly from Razorpay to verify plan and amount
  let rzpOrder = null
  try {
    rzpOrder = await razorpay.orders.fetch(orderId)
  } catch (rzpErr) {
    console.error('Failed to fetch Razorpay order for verification:', rzpErr.message)
    return res.status(400).json({
      success: false,
      error: 'Could not fetch order from payment gateway. Verification failed.',
    })
  }

  if (!rzpOrder) {
    return res.status(400).json({ success: false, error: 'Order not found in payment gateway.' })
  }

  // Determine trusted plan from Razorpay order notes (NEVER blindly trust client-supplied req.body.plan)
  let orderPlanKey = resolvePlanKey(rzpOrder.notes?.plan)

  // Fallback for legacy orders: match strictly by amount paid
  if (!orderPlanKey) {
    if (rzpOrder.amount === PLANS.yearly.paise) {
      orderPlanKey = 'yearly'
    } else if (rzpOrder.amount === PLANS.monthly.paise) {
      orderPlanKey = 'monthly'
    }
  }

  const planConfig = getPlan(orderPlanKey)
  if (!planConfig || !isPaidPlan(orderPlanKey)) {
    console.error('Payment verification rejected: no valid paid plan linked to order', {
      orderId,
      notes: rzpOrder.notes,
      amount: rzpOrder.amount,
    })
    return res.status(400).json({
      success: false,
      error: 'Invalid order: No recognized subscription plan associated with this order.',
    })
  }

  // Enforce that paid amount is at least the required price for this plan
  if (rzpOrder.amount < planConfig.paise) {
    console.error('Payment price mismatch detected (tampering attempt):', {
      orderId,
      paidAmount: rzpOrder.amount,
      expectedAmount: planConfig.paise,
      plan: orderPlanKey,
    })
    return res.status(400).json({
      success: false,
      error: 'Payment verification failed: Paid amount does not meet plan price.',
    })
  }

  const resolvedPlan = orderPlanKey
  const orderAmount = rzpOrder.amount

  // 4. Record payment and update subscription if user is authenticated
  if (req.user?.id) {
    try {
      // 4a. Insert payment ledger record
      const { error: ledgerErr } = await supabaseAdmin.from('payments').insert({
        user_id:    req.user.id,
        order_id:   orderId,
        payment_id: paymentId,
        plan:       resolvedPlan,
        amount:     orderAmount || 0,
        status:     'success',
      })
      if (ledgerErr) console.warn('Payment ledger insert failed:', ledgerErr.message)

      // 4b. Calculate subscription expiry
      const now = new Date()
      let expiresAt = new Date(now)
      if (resolvedPlan === 'yearly') {
        expiresAt.setFullYear(expiresAt.getFullYear() + 1)
      } else {
        expiresAt.setMonth(expiresAt.getMonth() + 1)
      }

      // 4c. Update user profile with subscription
      const { error: profileErr } = await supabaseAdmin.from('profiles').update({
        plan:                resolvedPlan,
        updated_at:          now.toISOString(),
      }).eq('id', req.user.id)
      if (profileErr) console.warn('Profile update failed:', profileErr.message)

      // 4d. Send confirmation email (non-blocking)
      try {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('full_name')
          .eq('id', req.user.id)
          .single()

        const { data: authUser } = await supabaseAdmin.auth.admin
          .getUserById(req.user.id)

        if (authUser?.user?.email) {
          sendSubscriptionEmail(
            authUser.user.email,
            profile?.full_name,
            resolvedPlan,
          ).catch(emailErr => console.warn('Subscription email failed:', emailErr?.message))
        }
      } catch (emailLookupErr) {
        console.warn('Email lookup for subscription confirmation failed:', emailLookupErr?.message)
      }
    } catch (err) {
      // CRITICAL: Log full error for debugging payment issues
      console.error('Post-payment account updates FAILED:', err)
    }
  }

  res.json({
    success:    true,
    message:    'Payment verified successfully!',
    payment_id: paymentId,
    order_id:   orderId,
    plan:       resolvedPlan || null,
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

  // Idempotency check (non-fatal if webhook_events table doesn't exist)
  try {
    const { data: existing } = await supabaseAdmin
      .from('webhook_events')
      .select('id')
      .eq('event_id', eventId)
      .maybeSingle()

    if (existing) {
      return res.status(200).json({ status: 'already_processed' })
    }
  } catch (idempotencyErr) {
    console.warn('Webhook idempotency check failed (table may not exist):', idempotencyErr?.message)
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
      const resolvedWebhookPlan = resolvePlanKey(planKey)
      const planConfig = getPlan(resolvedWebhookPlan)
      if (userId && resolvedWebhookPlan && isPaidPlan(resolvedWebhookPlan) && planConfig && (!payment.amount || payment.amount >= planConfig.paise)) {
        // Update profile (same as verify endpoint, serves as backup)
        const now = new Date()
        let expiresAt = new Date(now)
        if (resolvedWebhookPlan === 'yearly') expiresAt.setFullYear(expiresAt.getFullYear() + 1)
        else expiresAt.setMonth(expiresAt.getMonth() + 1)

        const { error: whProfileErr } = await supabaseAdmin.from('profiles').update({
          plan:                resolvedWebhookPlan,
          updated_at:          now.toISOString(),
        }).eq('id', userId)
        if (whProfileErr) console.error('Webhook profile update error:', whProfileErr)
      } else if (payment.amount && planConfig && payment.amount < planConfig.paise) {
        console.warn('Webhook ignored underpaid payment:', payment.id, 'paid:', payment.amount, 'required:', planConfig.paise)
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
