import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle, ArrowRight, Zap, Award, Star, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { paymentApi } from '../lib/api'

const plans = [
  {
    key: null, name: 'Free', monthly: 0, yearly: 0, desc: 'Perfect to get started', featured: false, cta: 'Get Started Free',
    features: ['1 Resume', '5 Basic Templates', 'PDF Download', 'Basic ATS Score', 'Email Support'],
    missing:  ['AI Writing Assistant', 'Unlimited Resumes', 'Cover Letter Generator', 'All 50+ Templates', 'Priority Support', 'DOCX Export'],
  },
  {
    key: 'pro', name: 'Pro', monthly: 19, yearly: 12, desc: 'For serious job seekers', featured: true, cta: 'Start 14-Day Free Trial',
    monthlyKey: 'pro_monthly', yearlyKey: 'pro_yearly',
    features: ['Unlimited Resumes', 'All 50+ Templates', 'AI Writing Assistant', 'Cover Letter Generator', 'Advanced ATS Checker', 'PDF & DOCX Export', 'LinkedIn Optimization', 'Priority Support', 'Custom Colors & Fonts'],
    missing:  [],
  },
  {
    key: 'lifetime', name: 'Lifetime', monthly: 149, yearly: 149, desc: 'Pay once, own forever', featured: false, cta: 'Get Lifetime Access',
    monthlyKey: 'lifetime', yearlyKey: 'lifetime',
    features: ['Everything in Pro', 'Lifetime Updates', 'White-label Export', 'API Access (100 calls/day)', 'Dedicated Account Manager', 'Early Feature Access'],
    missing:  [],
  },
]

const tableFeatures = [
  { label: 'Resumes',                 free: '1',     pro: 'Unlimited', life: 'Unlimited' },
  { label: 'Templates',               free: '5',     pro: '50+',       life: '50+'       },
  { label: 'AI Writing Assistant',    free: false,   pro: true,        life: true        },
  { label: 'Cover Letter Generator',  free: false,   pro: true,        life: true        },
  { label: 'Advanced ATS Checker',    free: 'Basic', pro: 'Full',      life: 'Full'      },
  { label: 'PDF Download',            free: true,    pro: true,        life: true        },
  { label: 'DOCX Export',            free: false,    pro: true,        life: true        },
  { label: 'LinkedIn Optimization',   free: false,   pro: true,        life: true        },
  { label: 'API Access',              free: false,   pro: false,       life: true        },
  { label: 'White-label Export',      free: false,   pro: false,       life: true        },
  { label: 'Support',                 free: 'Email', pro: 'Priority',  life: 'Dedicated' },
]

const testimonials = [
  { name: 'Sarah K.',    text: 'Upgraded to Pro and landed 3 interviews in a week!',         avatar: 'SK', color: '#7C3AED' },
  { name: 'Mike P.',     text: 'The AI assistant writes better bullet points than I do.',     avatar: 'MP', color: '#06B6D4' },
  { name: 'Ananya R.',   text: 'Worth every penny. Got my dream job within 30 days.',        avatar: 'AR', color: '#EC4899' },
]

function Cell({ value }) {
  if (value === true)  return <CheckCircle size={16} className="text-emerald-400 mx-auto" />
  if (value === false) return <span className="text-slate-700 mx-auto block text-center">—</span>
  return <span className="text-slate-300 text-sm text-center block">{value}</span>
}

export default function Pricing() {
  const [yearly, setYearly] = useState(false)
  const [loadingPlan, setLoadingPlan] = useState(null)
  const [error, setError] = useState(null)
  const { user, profile, isAuthenticated, refreshProfile } = useAuth()
  const navigate = useNavigate()

  const handlePayment = async (planKey) => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }

    setError(null)
    setLoadingPlan(planKey)

    try {
      // Step 1: Create order on backend
      const { data } = await paymentApi.createOrder(planKey)
      const { order_id, amount, currency, key_id } = data

      // Step 2: Open Razorpay checkout modal
      const options = {
        key:       key_id,
        amount:    amount,
        currency:  currency,
        name:      'ResumeAI Pro',
        description: data.plan_label || 'Plan Upgrade',
        order_id:  order_id,
        prefill: {
          name:  profile?.full_name || '',
          email: user?.email || '',
        },
        theme: {
          color: '#7C3AED',
        },
        handler: async function (response) {
          // Step 3: Verify payment on backend
          try {
            await paymentApi.verify({
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
              plan: planKey,
            })

            // Success — refresh profile and redirect
            await refreshProfile()
            navigate('/dashboard?upgrade=success&plan=' + planKey)
          } catch (verifyErr) {
            console.error('Payment verification failed:', verifyErr)
            setError('Payment verification failed. Please contact support if money was deducted.')
          }
        },
        modal: {
          ondismiss: function () {
            setLoadingPlan(null)
            setError('Payment cancelled.')
            setTimeout(() => setError(null), 4000)
          },
          escape:      true,
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
      console.error('Create order error:', err)
      setError(err.response?.data?.error || 'Failed to initiate payment. Please try again.')
    } finally {
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
          <p className="text-slate-400 text-lg mb-8 max-w-xl mx-auto">
            Start free, upgrade when you're ready. No hidden fees, no surprises.
          </p>

          {/* Toggle */}
          <div className="inline-flex items-center gap-1 p-1 rounded-full" style={{ background: '#111338', border: '1px solid rgba(124,58,237,.3)' }}>
            <button onClick={() => setYearly(false)}
                    className="px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200"
                    style={!yearly ? { background: 'linear-gradient(135deg,#7C3AED,#06B6D4)', color: '#fff' } : { color: '#64748B' }}>
              Monthly
            </button>
            <button onClick={() => setYearly(true)}
                    className="px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 flex items-center gap-2"
                    style={yearly ? { background: 'linear-gradient(135deg,#7C3AED,#06B6D4)', color: '#fff' } : { color: '#64748B' }}>
              Yearly
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                    style={{ background: 'rgba(16,185,129,.2)', color: '#10B981' }}>
                SAVE 37%
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Error Toast */}
      {error && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl text-sm font-medium shadow-2xl animate-pulse"
             style={{ background: 'rgba(239,68,68,.15)', border: '1px solid rgba(239,68,68,.4)', color: '#FCA5A5', backdropFilter: 'blur(12px)' }}>
          {error}
          <button onClick={() => setError(null)} className="ml-3 text-red-400 hover:text-red-300 font-bold">×</button>
        </div>
      )}

      {/* Plans */}
      <section className="pb-20">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map(plan => {
              const price = yearly ? plan.yearly : plan.monthly
              const planKey = plan.key === null ? null : (yearly && plan.yearlyKey ? plan.yearlyKey : plan.monthlyKey)
              const isCurrentPlan = profile?.plan === plan.key
              return (
                <div key={plan.name}
                     className="relative p-8 rounded-2xl flex flex-col transition-all duration-300 hover:-translate-y-2"
                     style={{
                       background: plan.featured ? 'linear-gradient(135deg,rgba(124,58,237,.25),rgba(6,182,212,.12))' : '#111338',
                       border: `1px solid ${plan.featured ? 'rgba(124,58,237,.5)' : 'rgba(124,58,237,.2)'}`,
                       boxShadow: plan.featured ? '0 0 60px rgba(124,58,237,.25)' : 'none',
                     }}>
                  {plan.featured && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-white text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap"
                         style={{ background: 'linear-gradient(135deg,#7C3AED,#06B6D4)' }}>
                      MOST POPULAR
                    </div>
                  )}

                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">{plan.name}</div>
                  <div className="flex items-end gap-1 mb-1">
                    <span className="text-slate-400 text-lg pb-1.5">$</span>
                    <span className="font-heading font-extrabold text-5xl leading-none">{price}</span>
                    <span className="text-slate-500 text-sm pb-2">{plan.name === 'Lifetime' ? ' one-time' : yearly ? '/mo' : '/mo'}</span>
                  </div>
                  {yearly && plan.monthly > 0 && plan.name !== 'Lifetime' && (
                    <div className="text-xs text-slate-600 mb-1 line-through">${plan.monthly}/mo</div>
                  )}
                  <p className="text-slate-500 text-sm mb-6">{plan.desc}</p>

                  <ul className="flex flex-col gap-2.5 flex-1 mb-7">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-center gap-2.5 text-sm text-slate-300">
                        <CheckCircle size={14} className="text-emerald-400 flex-shrink-0" />{f}
                      </li>
                    ))}
                    {plan.missing.map(f => (
                      <li key={f} className="flex items-center gap-2.5 text-sm text-slate-700">
                        <span className="w-3.5 flex-shrink-0 text-center text-slate-700">×</span>
                        <span className="line-through">{f}</span>
                      </li>
                    ))}
                  </ul>

                  {plan.key === null ? (
                    <Link to="/login"
                          className={`py-3.5 text-center rounded-xl font-semibold text-sm transition-all ${plan.featured ? 'btn-primary' : 'btn-secondary'}`}>
                      {plan.cta}
                    </Link>
                  ) : isCurrentPlan ? (
                    <button disabled
                            className="py-3.5 text-center rounded-xl font-semibold text-sm btn-secondary opacity-60 cursor-not-allowed">
                      Current Plan
                    </button>
                  ) : (
                    <button onClick={() => handlePayment(planKey)}
                            disabled={!!loadingPlan}
                            className={`py-3.5 text-center rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${plan.featured ? 'btn-primary' : 'btn-secondary'}`}>
                      {loadingPlan === planKey ? (
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

          <p className="text-center text-slate-600 text-sm mt-8">
            ✓ No credit card for free plan &nbsp;·&nbsp; ✓ Cancel anytime &nbsp;·&nbsp; ✓ 14-day money-back guarantee on Pro
          </p>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-20" style={{ background: '#0D0F2E' }}>
        <div className="max-w-[900px] mx-auto px-6">
          <h2 className="font-heading font-bold text-2xl text-center mb-10">
            Full <span className="gradient-text">feature comparison</span>
          </h2>
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(124,58,237,.2)' }}>
            <table className="w-full">
              <thead>
                <tr style={{ background: '#111338', borderBottom: '1px solid rgba(124,58,237,.2)' }}>
                  <th className="text-left px-5 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500 w-1/2">Feature</th>
                  {['Free','Pro','Lifetime'].map(n => (
                    <th key={n} className="px-5 py-4 text-center">
                      <span className={`text-sm font-bold ${n === 'Pro' ? 'gradient-text' : 'text-slate-300'}`}>{n}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableFeatures.map((f, i) => (
                  <tr key={f.label} style={{ borderBottom: '1px solid rgba(124,58,237,.1)', background: i % 2 === 0 ? '#111338' : 'transparent' }}>
                    <td className="px-5 py-3.5 text-sm text-slate-300">{f.label}</td>
                    <td className="px-5 py-3.5"><Cell value={f.free} /></td>
                    <td className="px-5 py-3.5"><Cell value={f.pro} /></td>
                    <td className="px-5 py-3.5"><Cell value={f.life} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Mini testimonials */}
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

      {/* CTA */}
      <section className="py-20 pb-28">
        <div className="max-w-[700px] mx-auto px-6 text-center">
          <div className="p-12 rounded-3xl relative overflow-hidden"
               style={{ background: 'linear-gradient(135deg,rgba(124,58,237,.3),rgba(6,182,212,.15))', border: '1px solid rgba(124,58,237,.35)' }}>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-64 h-32 rounded-full opacity-30" style={{ background: 'rgba(124,58,237,.5)', filter: 'blur(60px)' }} />
            </div>
            <div className="relative">
              <Zap size={32} className="text-purple-400 mx-auto mb-4" />
              <h2 className="font-heading font-extrabold text-2xl mb-3">Start building for free</h2>
              <p className="text-slate-400 text-sm mb-6">No credit card required. Upgrade when you're ready.</p>
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
