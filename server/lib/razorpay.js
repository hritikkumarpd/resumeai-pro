const Razorpay = require('razorpay')

const keyId = process.env.RAZORPAY_KEY_ID
const keySecret = process.env.RAZORPAY_KEY_SECRET

if (!keyId || !keySecret) {
  if (process.env.NODE_ENV === 'production') {
    console.error('FATAL: RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET not set in production — payments WILL fail')
  } else {
    console.warn('⚠️  RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET not set — payments will not work')
  }
}

const razorpay = new Razorpay({
  key_id:     keyId     || 'rzp_test_placeholder',
  key_secret: keySecret || 'placeholder_secret',
})

module.exports = { razorpay }
