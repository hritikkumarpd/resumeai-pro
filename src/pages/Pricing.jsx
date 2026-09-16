import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle, ArrowRight, Zap, Award, Star, Loader2, Check, AlertCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { paymentApi } from '../lib/api'
import { PLANS } from '../config/plans'

const plansList = [
  PLANS.free,
  PLANS.monthly,
  PLANS.yearly,
]

const tableFeatures = [
  { label: 'Resumes',                 free: '3',     pro: 'Unlimited' },
  { label: 'Templates',               free: '5',     pro: 'All 50+'   },
  { label: 'AI Writing Assistant',    free: false,   pro: true        },
  { label: 'Cover Letter Generator',  free: false,   pro: true        },
  { label: 'Advanced ATS Checker',    free: 'Basic', pro: 'Full 7-Category' },
  { label: 'PDF Download',            free: true,    pro: true        },
  { label: 'DOCX Export',            free: false,    pro: true        },
  { label: 'LinkedIn Optimization',   free: false,   pro: true        },
  { label: 'Support',                 free: 'Email', pro: 'Priority'  },
]

const testimonials = [
  { name: 'Sarah K.',    text: 'Upgraded to Pro and landed 3 interviews in a week!',     avatar: 'SK', color: '#7C3AED' },
  { name: 'Mike P.',     text: 'The AI assistant writes high-impact bullet points.',      avatar: 'MP', color: '#06B6D4' },
  { name: 'Ananya R.',   text: 'Worth every rupee. Got my dream job within 30 days.',    avatar: 'AR', color: '#EC4899' },
]

function Cell({ value }) {
  if (value === true)  return <CheckCircle size={16} className="text-emerald-400 mx-auto" />
  if (value === false) return <span className="text-slate-700 mx-auto block text-center">—</span>
  return <span className="text-slate-300 text-sm text-center block font-medium">{value}</span>
}

// Dynamically load Razorpay SDK if not already in window
function loadRazorpaySdk() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true)
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export default function Pricing() {
  const [loadingPlan, setLoadingPlan] = useState(null)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)
  const { user, profile, isAuthenticated, refreshProfile } = useAuth()
  const navigate = useNavigate()

  const handlePayment = async (planKey) => {
    // 1. Free plan doesn't trigger payment
    if (planKey === 'free') {
      navigate(isAuthenticated ? '/builder' : '/login')
      return
    }

    if (!isAuthenticated) {
      navigate('/login?redirect=/pricing')
      return
    }

    setError(null)
    setSuccessMsg(null)
    setLoadingPlan(planKey)

    try {
      // Step 1: Ensure Razorpay SDK is loaded
      const isLoaded = await loadRazorpaySdk()
      if (!isLoaded) {
        throw new Error('Razorpay SDK failed to load. Please check your internet connection.')
      }

      // Step 2: Create order on backend (amount in paise calculated securely server-side)
      const { data } = await paymentApi.createOrder(planKey)
      const { order_id, amount, currency, key_id } = data

      // Step 3: Open Razorpay checkout modal (Test Mode)
      const options = {
        key:         key_id || import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount:      amount,
        currency:    currency || 'INR',
        name:        'ResumeAI Pro',
        description: data.plan_label || `Pro Plan Upgrade (${planKey})`,
        order_id:    order_id,
        prefill: {
          name:  profile?.full_name || user?.user_metadata?.full_name || '',
          email: user?.email || '',
        },
        theme: {
          color: '#7C3AED',
        },
        handler: async function (response) {
          try {
            setLoadingPlan(planKey)
            // Step 4: Backend verifies signature
            await paymentApi.verify({
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
              plan: planKey,
            })

            // Step 5: Success — refresh profile and notify
            await refreshProfile()
            setSuccessMsg('Payment verified successfully! Welcome to Pro.')
            setTimeout(() => {
              navigate('/dashboard?upgrade=success&plan=' + planKey)
            }, 1500)
          } catch (verifyErr) {
            console.error('Payment verification failed:', verifyErr)
            setError(verifyErr.response?.data?.error || 'Payment verification failed. Please contact support if money was deducted.')
          } finally {
            setLoadingPlan(null)
          }
        },
        modal: {
          ondismiss: function () {
            setLoadingPlan(null)
            setError('Checkout was cancelled.')
            setTimeout(() => setError(null), 4000)
          },
          escape: true,
          backdropclose: false,
        },
        notes: {
          plan: planKey,
        },
      }

      const rzp = new window.Razorpay(options)

      rzp.on('payment.failed', function (response) {
        console.error('Payment failed:', response.error)
        setError(response.error?.description || 'Payment failed. Please try again.')
        setLoadingPlan(null)
      })

      rzp.open()
    } catch (err) {
      console.error('Payment order creation error:', err)
      setError(err.response?.data?.error || err.message || 'Failed to initiate checkout. Please try again.')
      setLoadingPlan(null)
    }
  }

  return (
    <main className="pt-[72px]">
      {/* Header */}
      <section className="py-20 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-grid pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none"
             style={{ background: 'radial-gradient(ellipse at 50% 0%,rgba(124,58,237,.3) 0%,transparent 60%)' }} />
        <div className="max-w-[1200px] mx-auto px-6 relative">
          <div className="section-tag mb-5 mx-auto w-fit"><Award size={12} /> Pricing</div>
          <h1 className="font-heading font-extrabold mb-4" style={{ fontSize: 'clamp(2.5rem,5vw,4rem)' }}>
            Simple, <span className="gradient-text">transparent pricing</span>
          </h1>
          <p className="text-slate-400 text-lg mb-4 max-w-xl mx-auto">
            Start free, upgrade when you're ready. All prices in Indian Rupees (₹).
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Check size={12} /> Razorpay Test Mode Active
          </div>
        </div>
      </section>

      {/* Notifications */}
      {error && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl text-sm font-medium shadow-2xl flex items-center gap-3 bg-red-900/90 text-red-200 border border-red-500/40 backdrop-blur-md">
          <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-2 text-red-400 hover:text-white font-bold">×</button>
        </div>
      )}

      {successMsg && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl text-sm font-medium shadow-2xl flex items-center gap-3 bg-emerald-900/90 text-emerald-200 border border-emerald-500/40 backdrop-blur-md">
          <CheckCircle size={16} className="text-emerald-400 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Plan Cards */}
      <section className="pb-20">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plansList.map(plan => {
              const isCurrentPlan = profile?.plan === plan.key || (!profile?.plan && plan.key === 'free')
              const isFree = plan.key === 'free'

              return (
                <div key={plan.key}
                     className="relative p-8 rounded-2xl flex flex-col transition-all duration-300 hover:-translate-y-1"
                     style={{
                       background: plan.featured ? 'linear-gradient(135deg,rgba(124,58,237,.25),rgba(6,182,212,.12))' : '#111338',
                       border: `1px solid ${plan.featured ? 'rgba(124,58,237,.5)' : 'rgba(124,58,237,.2)'}`,
                       boxShadow: plan.featured ? '0 0 50px rgba(124,58,237,.25)' : 'none',
                     }}>
                  {plan.featured && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-white text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap"
                         style={{ background: 'linear-gradient(135deg,#7C3AED,#06B6D4)' }}>
                      MOST POPULAR
                    </div>
                  )}

                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">{plan.name}</div>
                  <div className="flex items-end gap-1 mb-1">
                    <span className="text-slate-400 text-2xl pb-1 font-semibold">{plan.symbol}</span>
                    <span className="font-heading font-extrabold text-5xl leading-none text-white">{plan.price}</span>
                    <span className="text-slate-400 text-sm pb-2">
                      {plan.interval ? `/${plan.interval}` : ' forever'}
                    </span>
                  </div>
                  <p className="text-slate-400 text-sm mb-6">{plan.desc}</p>

                  <ul className="flex flex-col gap-2.5 flex-1 mb-7">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-center gap-2.5 text-sm text-slate-300">
                        <CheckCircle size={14} className="text-emerald-400 flex-shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                    {plan.missing.map(f => (
                      <li key={f} className="flex items-center gap-2.5 text-sm text-slate-600">
                        <span className="w-3.5 flex-shrink-0 text-center">×</span>
                        <span className="line-through">{f}</span>
                      </li>
                    ))}
                  </ul>

                  {isFree ? (
                    <button
                      onClick={() => handlePayment('free')}
                      className={`py-3.5 text-center rounded-xl font-semibold text-sm transition-all cursor-pointer ${
                        isCurrentPlan ? 'btn-secondary opacity-70' : 'btn-secondary'
                      }`}
                    >
                      {isCurrentPlan ? 'Current Plan' : plan.cta}
                    </button>
                  ) : isCurrentPlan ? (
                    <button disabled
                            className="py-3.5 text-center rounded-xl font-semibold text-sm btn-secondary opacity-60 cursor-not-allowed">
                      Current Plan
                    </button>
                  ) : (
                    <button
                      onClick={() => handlePayment(plan.key)}
                      disabled={loadingPlan === plan.key}
                      className={`py-3.5 text-center rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        plan.featured ? 'btn-primary' : 'btn-secondary'
                      }`}
                    >
                      {loadingPlan === plan.key ? (
                        <><Loader2 size={16} className="animate-spin" /> Processing...</>
                      ) : (
                        plan.cta
                      )}
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          <p className="text-center text-slate-500 text-sm mt-8">
            ✓ Razorpay Test Mode &nbsp;·&nbsp; ✓ Free plan forever &nbsp;·&nbsp; ✓ Cancel anytime &nbsp;·&nbsp; ✓ Instant access
          </p>
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="py-20" style={{ background: '#0D0F2E' }}>
        <div className="max-w-[800px] mx-auto px-6">
          <h2 className="font-heading font-bold text-2xl text-center mb-10">
            Full <span className="gradient-text">feature comparison</span>
          </h2>
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(124,58,237,.2)' }}>
            <table className="w-full">
              <thead>
                <tr style={{ background: '#111338', borderBottom: '1px solid rgba(124,58,237,.2)' }}>
                  <th className="text-left px-5 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400 w-1/2">Feature</th>
                  <th className="px-5 py-4 text-center">
                    <span className="text-sm font-bold text-slate-300">Free</span>
                  </th>
                  <th className="px-5 py-4 text-center">
                    <span className="text-sm font-bold gradient-text">Pro</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {tableFeatures.map((f, i) => (
                  <tr key={f.label} style={{ borderBottom: '1px solid rgba(124,58,237,.1)', background: i % 2 === 0 ? '#111338' : 'transparent' }}>
                    <td className="px-5 py-3.5 text-sm text-slate-300">{f.label}</td>
                    <td className="px-5 py-3.5"><Cell value={f.free} /></td>
                    <td className="px-5 py-3.5"><Cell value={f.pro} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <div className="max-w-[900px] mx-auto px-6">
          <h2 className="font-heading font-bold text-xl text-center mb-8">What Pro users say</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {testimonials.map(t => (
              <div key={t.name} className="p-5 rounded-2xl" style={{ background: '#111338', border: '1px solid rgba(124,58,237,.2)' }}>
                <div className="flex mb-2">
                  {Array.from({length:5}).map((_,i) => <Star key={i} size={12} className="fill-yellow-400 text-yellow-400" />)}
                </div>
                <p className="text-slate-300 text-sm italic mb-3">"{t.text}"</p>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-white" style={{ background: t.color }}>{t.avatar}</div>
                  <span className="text-slate-400 text-xs">{t.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20 pb-28">
        <div className="max-w-[700px] mx-auto px-6 text-center">
          <div className="p-12 rounded-3xl relative overflow-hidden"
               style={{ background: 'linear-gradient(135deg,rgba(124,58,237,.3),rgba(6,182,212,.15))', border: '1px solid rgba(124,58,237,.35)' }}>
            <div className="relative">
              <Zap size={32} className="text-purple-400 mx-auto mb-4" />
              <h2 className="font-heading font-extrabold text-2xl mb-3">Start building for free</h2>
              <p className="text-slate-400 text-sm mb-6">No payment required. Upgrade to Pro whenever you need.</p>
              <Link to="/builder" className="btn-primary px-8 py-3.5 rounded-xl gap-2">
                Build My Resume <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
