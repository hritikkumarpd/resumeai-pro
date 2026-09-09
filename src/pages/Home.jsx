import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, CheckCircle, Star, Brain, Target, FileText,
  Sparkles, BarChart2, Shield, Rocket, Award, ChevronDown, Zap
} from 'lucide-react'

/* ── Data ───────────────────────────────────────────────────── */
const features = [
  { icon: Brain, color: 'icon-purple', title: 'AI-Powered Writing', desc: 'Generate professional bullet points and summaries instantly. Our AI knows what hiring managers want to see.' },
  { icon: Target, color: 'icon-cyan', title: 'ATS Optimization', desc: 'Score your resume against any job description. Identify missing keywords before you apply.' },
  { icon: FileText, color: 'icon-pink', title: '50+ Premium Templates', desc: 'Recruiter-approved designs that stand out. Every template is ATS-friendly and professionally crafted.' },
  { icon: Sparkles, color: 'icon-green', title: 'Cover Letter Generator', desc: 'Create tailored cover letters in seconds. AI writes personalized letters matched to each job posting.' },
  { icon: BarChart2, color: 'icon-amber', title: 'Real-time ATS Score', desc: 'See your score update live as you type. Know exactly how well your resume matches the job.' },
  { icon: Shield, color: 'icon-purple', title: 'Privacy First', desc: 'Your data is encrypted and never sold. Download your resume any time — no lock-in.' },
]

const steps = [
  { n: '01', title: 'Choose a Template', desc: 'Pick from 50+ ATS-friendly templates designed by career experts and top recruiters.' },
  { n: '02', title: 'Build with AI', desc: 'Fill in your details. Our AI suggests bullet points, optimizes keywords and fixes formatting.' },
  { n: '03', title: 'Download & Apply', desc: 'Export as PDF instantly. Your resume is ready to land interviews at top companies.' },
]

const testimonials = [
  { name: 'Priya Sharma', role: 'Software Engineer @ Google', text: 'ResumeAI Pro helped me land a $180k role at Google. The ATS checker showed me exactly what was missing. 10/10!', avatar: 'PS', color: '#7C3AED', rating: 5 },
  { name: 'Marcus Johnson', role: 'Product Manager @ Meta', text: 'I applied to 12 jobs and got 9 interviews. The AI-generated bullet points were way better than anything I could write.', avatar: 'MJ', color: '#06B6D4', rating: 5 },
  { name: 'Anika Patel', role: 'Data Scientist @ Amazon', text: 'The ATS score feature is a game changer. Went from 0 callbacks to 3 offers in a month!', avatar: 'AP', color: '#EC4899', rating: 5 },
  { name: 'James Chen', role: 'UX Designer @ Apple', text: 'Beautiful templates, incredible AI, and the cover letter tool saves hours. This is the future of job applications.', avatar: 'JC', color: '#10B981', rating: 5 },
  { name: 'Fatima Al-Rashid', role: 'Finance Analyst @ Goldman Sachs', text: 'Worth every penny. Got my first Wall Street job with the help of ResumeAI Pro\'s AI-optimized resume.', avatar: 'FA', color: '#F59E0B', rating: 5 },
  { name: 'Ryan Torres', role: 'DevOps Engineer @ Netflix', text: 'The keyword match feature is incredible. My resume went from 43% to 91% ATS score in under 10 minutes.', avatar: 'RT', color: '#8B5CF6', rating: 5 },
]

const faqs = [
  { q: 'Is ResumeAI Pro really free?', a: 'Yes! Our free plan lets you create one resume with access to core features. Upgrade to Pro for unlimited resumes, all templates, and advanced AI features.' },
  { q: 'Will my resume pass ATS systems?', a: 'Absolutely. All our templates are tested against major ATS systems including Workday, Greenhouse, and Lever. Our ATS checker also helps you optimize your content.' },
  { q: 'Can I download my resume as a PDF?', a: 'Yes, PDF download is available on all plans. Pro users get additional formats including DOCX.' },
  { q: 'How does the AI writing assistant work?', a: 'Our AI is trained on millions of successful resumes. It suggests bullet points, skills, and summaries tailored to your target role and industry.' },
  { q: 'Is my data secure?', a: 'Your privacy is our priority. All data is encrypted at rest and in transit. We never sell your personal information to third parties.' },
  { q: 'Can I cancel my subscription anytime?', a: 'Yes, cancel anytime with no questions asked. Your data remains accessible for 30 days after cancellation.' },
]

const plans = [
  {
    name: 'Free', price: '$0', period: '', desc: 'Get started for free', featured: false, cta: 'Get Started',
    features: ['1 Resume', '5 Basic Templates', 'PDF Download', 'ATS Score Checker'],
    missing: ['AI Writing Assistant', 'Unlimited Resumes', 'Cover Letter Generator'],
  },
  {
    name: 'Pro', price: '$19', period: '/mo', desc: 'For serious job seekers', featured: true, cta: 'Start Pro Trial',
    features: ['Unlimited Resumes', '50+ Premium Templates', 'AI Writing Assistant', 'Cover Letter Generator', 'PDF & DOCX Export', 'Advanced ATS Checker', 'Priority Support'],
    missing: [],
  },
  {
    name: 'Lifetime', price: '$99', period: ' once', desc: 'Pay once, own forever', featured: false, cta: 'Get Lifetime Access',
    features: ['Everything in Pro', 'Lifetime Updates', 'White-label Export', 'API Access', 'Dedicated Support'],
    missing: [],
  },
]

/* ── Scroll Reveal ──────────────────────────────────────────── */
function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target) } }),
      { threshold: 0.1 }
    )
    document.querySelectorAll('.reveal, .reveal-left, .reveal-right').forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])
}

/* ── Hero ───────────────────────────────────────────────────── */
function Hero() {
  return (
    <section className="relative min-h-screen flex items-center pt-[72px] overflow-hidden">
      <div className="absolute inset-0 bg-grid pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 65% 0%,rgba(124,58,237,.35) 0%,transparent 60%),radial-gradient(ellipse at 10% 80%,rgba(6,182,212,.2) 0%,transparent 50%)' }} />
      <div className="absolute top-20 right-1/4 w-96 h-96 rounded-full opacity-20 pointer-events-none"
        style={{ background: 'rgba(124,58,237,.4)', filter: 'blur(100px)' }} />
      <div className="absolute bottom-20 left-1/4 w-72 h-72 rounded-full opacity-15 pointer-events-none"
        style={{ background: 'rgba(34,211,238,.3)', filter: 'blur(80px)' }} />

      <div className="max-w-[1200px] mx-auto px-6 w-full py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <div className="flex flex-col gap-7">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full w-fit text-xs font-semibold animate-fade-up"
              style={{ background: 'rgba(124,58,237,.15)', border: '1px solid rgba(124,58,237,.4)', color: '#A78BFA' }}>
              <span className="pulse-dot" />
              Trusted by 4.3M+ job seekers worldwide
            </div>

            <h1 className="font-heading font-extrabold leading-[1.08] tracking-tight animate-fade-up"
              style={{ fontSize: 'clamp(2.8rem,5.5vw,4.5rem)', animationDelay: '0.1s' }}>
              Build Resumes That{' '}
              <span className="gradient-text">Get You Hired</span>
            </h1>

            <p className="text-slate-400 leading-relaxed max-w-[500px] animate-fade-up"
              style={{ fontSize: 'clamp(1rem,1.5vw,1.125rem)', animationDelay: '0.2s' }}>
              The world's #1 AI resume builder. Create ATS-optimized resumes in minutes. Used by candidates landing roles at Google, Amazon, Meta and 10,000+ top companies.
            </p>

            <div className="flex gap-3 flex-wrap animate-fade-up" style={{ animationDelay: '0.3s' }}>
              <Link to="/builder" className="btn-primary text-base px-7 py-3.5 rounded-xl gap-2">
                Build My Resume Free <ArrowRight size={18} />
              </Link>
              <Link to="/templates" className="btn-secondary text-base px-7 py-3.5 rounded-xl">
                View Templates
              </Link>
            </div>

            <div className="flex items-center gap-8 flex-wrap animate-fade-up" style={{ animationDelay: '0.4s' }}>
              {[{ v: '4.3M+', l: 'Users' }, { v: '93%', l: 'Interview Rate' }, { v: '50+', l: 'Templates' }, { v: '4.9★', l: 'Rating' }].map(s => (
                <div key={s.l}>
                  <div className="font-heading font-extrabold text-2xl gradient-text">{s.v}</div>
                  <div className="text-slate-500 text-xs mt-0.5">{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right – floating resume card */}
          <div className="relative flex justify-center items-center animate-fade-up" style={{ animationDelay: '0.2s' }}>
            <div className="relative w-[330px] h-[420px]">
              {/* Resume mock - 100% Clean Black & White Indian ATS */}
              <div className="w-full h-full bg-white rounded-2xl overflow-hidden cursor-pointer transition-transform duration-500 p-5 flex flex-col font-sans"
                style={{
                  boxShadow: '0 32px 80px rgba(0,0,0,.7), 0 0 40px rgba(16,185,129,.15)',
                  transform: 'perspective(1000px) rotateY(-6deg) rotateX(3deg)',
                  border: '1px solid rgba(255,255,255,0.2)'
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'perspective(1000px) rotateY(0) rotateX(0)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'perspective(1000px) rotateY(-6deg) rotateX(3deg)' }}>
                {/* Header */}
                <div className="text-center pb-2 mb-2 border-b border-black">
                  <div className="font-bold text-black text-sm uppercase tracking-wider" style={{ letterSpacing: '1px' }}>
                    HRITIK KUMAR
                  </div>
                  <div className="text-[8px] text-gray-750 mt-0.5">
                    +91 9471636126 | hritikkumarpd@gmail.com | LinkedIn | Bengaluru, India
                  </div>
                </div>

                {/* Simulated Sections */}
                <div className="flex-1 flex flex-col gap-2">
                  {/* Education */}
                  <div>
                    <div className="text-[8.5px] font-bold uppercase tracking-wider text-black border-b border-black pb-0.5 mb-1">
                      Education
                    </div>
                    <div className="flex justify-between text-[8px]">
                      <span className="font-bold text-black">TECHNO MAIN SALTLAKE, KOLKATA</span>
                      <span className="text-gray-600">2022 – 2026</span>
                    </div>
                    <div className="flex justify-between text-[7.5px] text-gray-700 italic">
                      <span>B.Tech in Computer Science and Engineering</span>
                      <span className="font-semibold text-black not-italic">CGPA: 6.99/ 10.0</span>
                    </div>
                  </div>

                  {/* Experience */}
                  <div>
                    <div className="text-[8.5px] font-bold uppercase tracking-wider text-black border-b border-black pb-0.5 mb-1">
                      Experience
                    </div>
                    <div className="flex justify-between text-[8px] mb-0.5">
                      <span className="font-bold text-black">Software Development Engineer | TechCorp</span>
                      <span className="text-gray-600">2023 – Present</span>
                    </div>
                    <div className="flex flex-col gap-1 pl-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[7px] text-black">•</span>
                        <div className="h-[4px] bg-gray-800 rounded-none w-11/12" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[7px] text-black">•</span>
                        <div className="h-[4px] bg-gray-800 rounded-none w-4/5" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[7px] text-black">•</span>
                        <div className="h-[4px] bg-gray-800 rounded-none w-5/6" />
                      </div>
                    </div>
                  </div>

                  {/* Skills */}
                  <div>
                    <div className="text-[8.5px] font-bold uppercase tracking-wider text-black border-b border-black pb-0.5 mb-1">
                      Technical Skills
                    </div>
                    <div className="text-[7.5px] text-gray-900 leading-snug space-y-0.5">
                      <div><span className="font-bold text-black">Languages:</span> Java, Python, C++, JavaScript, SQL</div>
                      <div><span className="font-bold text-black">Frameworks:</span> React.js, Node.js, Express, Docker, AWS</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ATS badge */}
              <div className="absolute -right-8 top-6 animate-float-1 rounded-xl px-3 py-2 shadow-glow"
                style={{ background: '#111338', border: '1px solid rgba(16,185,129,.4)' }}>
                <div className="text-[10px] uppercase font-bold text-emerald-400">ATS Score</div>
                <div className="font-heading font-extrabold text-2xl text-emerald-400">98%</div>
                <div className="text-[9px] text-slate-400">100% Parse Rate</div>
              </div>

              {/* Indian Approved badge */}
              <div className="absolute -left-12 bottom-16 animate-float-2 rounded-xl px-3 py-2 shadow-glow"
                style={{ background: '#111338', border: '1px solid rgba(124,58,237,.4)', whiteSpace: 'nowrap' }}>
                <div className="flex items-center gap-1.5">
                  <CheckCircle size={13} className="text-emerald-400" />
                  <span className="text-xs font-semibold text-slate-200">🇮🇳 Indian Standard ATS</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">No colors · Clean Overleaf Style</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll hint */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 opacity-40">
        <span className="text-slate-500 text-xs">Scroll</span>
        <ChevronDown size={16} className="text-slate-500 animate-bounce" />
      </div>
    </section>
  )
}

/* ── Trust Bar ──────────────────────────────────────────────── */
function TrustBar() {
  const cos = ['Google', 'Amazon', 'Meta', 'Apple', 'Netflix', 'Microsoft', 'Stripe', 'Airbnb', 'Uber', 'Spotify']
  return (
    <div className="py-6 border-y" style={{ borderColor: 'rgba(255,255,255,.05)', background: 'rgba(255,255,255,.02)' }}>
      <div className="max-w-[1200px] mx-auto px-6">
        <p className="text-center text-slate-600 text-[11px] font-medium tracking-widest uppercase mb-4">
          Candidates from these companies trust ResumeAI Pro
        </p>
        <div className="flex items-center justify-center gap-8 flex-wrap">
          {cos.map(c => (
            <span key={c} className="text-slate-600 font-heading font-bold text-sm hover:text-slate-400 transition-colors cursor-default select-none">{c}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Features ───────────────────────────────────────────────── */
function Features() {
  return (
    <section id="features" className="py-24">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="text-center max-w-xl mx-auto mb-16 reveal">
          <div className="section-tag mb-4 mx-auto w-fit"><Sparkles size={12} /> Features</div>
          <h2 className="font-heading font-bold gradient-text mb-3" style={{ fontSize: 'clamp(2rem,4vw,3rem)' }}>
            Everything you need to land your dream job
          </h2>
          <p className="text-slate-400 text-base">Powerful AI tools that take your resume from good to exceptional.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 stagger">
          {features.map((f, i) => (
            <div key={f.title} className="resume-card-hover p-7 reveal group cursor-default"
              style={{ transitionDelay: `${i * 80}ms` }}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${f.color}`}>
                <f.icon size={22} className="text-white opacity-90" />
              </div>
              <h3 className="font-heading font-bold text-lg mb-2">{f.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── How It Works ───────────────────────────────────────────── */
function HowItWorks() {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 50%,rgba(124,58,237,.1) 0%,transparent 70%)' }} />
      <div className="max-w-[1200px] mx-auto px-6 relative">
        <div className="text-center max-w-xl mx-auto mb-16 reveal">
          <div className="section-tag mb-4 mx-auto w-fit"><Rocket size={12} /> How It Works</div>
          <h2 className="font-heading font-bold mb-3" style={{ fontSize: 'clamp(2rem,4vw,3rem)' }}>
            From blank page to{' '}<span className="gradient-text">hired in 3 steps</span>
          </h2>
          <p className="text-slate-400 text-base">No design skills needed. Just fill in your details and let AI do the heavy lifting.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative">
          <div className="hidden md:block absolute top-8 left-1/3 right-1/3 h-px"
            style={{ background: 'linear-gradient(90deg,#7C3AED,#22D3EE)', opacity: .5 }} />
          {steps.map((s, i) => (
            <div key={s.n} className="flex flex-col items-center text-center reveal" style={{ transitionDelay: `${i * 120}ms` }}>
              <div className="w-16 h-16 rounded-full flex items-center justify-center font-heading font-extrabold text-xl text-white mb-5 z-10"
                style={{ background: 'linear-gradient(135deg,#7C3AED,#06B6D4)', boxShadow: '0 0 30px rgba(124,58,237,.5)' }}>
                {s.n}
              </div>
              <h3 className="font-heading font-bold text-lg mb-2">{s.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed max-w-xs">{s.desc}</p>
            </div>
          ))}
        </div>
        <div className="text-center mt-14 reveal">
          <Link to="/builder" className="btn-primary text-base px-8 py-4 rounded-xl gap-2">
            Start Building Now <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </section>
  )
}

/* ── Testimonials ───────────────────────────────────────────── */
function Testimonials() {
  return (
    <section className="py-24">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="text-center max-w-xl mx-auto mb-16 reveal">
          <div className="section-tag mb-4 mx-auto w-fit"><Star size={12} /> Success Stories</div>
          <h2 className="font-heading font-bold mb-3" style={{ fontSize: 'clamp(2rem,4vw,3rem)' }}>
            Join <span className="gradient-text">4.3 million</span> people who got hired
          </h2>
          <p className="text-slate-400">Real results from real job seekers. Their success could be yours.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 stagger">
          {testimonials.map((t, i) => (
            <div key={t.name} className="resume-card-hover p-6 reveal" style={{ transitionDelay: `${i * 80}ms` }}>
              <div className="flex mb-3">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} size={13} className="fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <blockquote className="text-slate-300 text-sm leading-relaxed mb-5 italic">"{t.text}"</blockquote>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white flex-shrink-0"
                  style={{ background: t.color }}>
                  {t.avatar}
                </div>
                <div>
                  <div className="font-semibold text-sm">{t.name}</div>
                  <div className="text-slate-500 text-xs">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── Pricing Snapshot ───────────────────────────────────────── */
function PricingSnapshot() {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 100%,rgba(124,58,237,.12) 0%,transparent 60%)' }} />
      <div className="max-w-[1200px] mx-auto px-6 relative">
        <div className="text-center max-w-xl mx-auto mb-16 reveal">
          <div className="section-tag mb-4 mx-auto w-fit"><Award size={12} /> Pricing</div>
          <h2 className="font-heading font-bold mb-3" style={{ fontSize: 'clamp(2rem,4vw,3rem)' }}>
            Simple, <span className="gradient-text">transparent pricing</span>
          </h2>
          <p className="text-slate-400">Start free. Upgrade when you need more. Cancel anytime.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 stagger">
          {plans.map(plan => (
            <div key={plan.name}
              className="relative p-8 rounded-2xl flex flex-col reveal transition-all duration-300 hover:-translate-y-1.5"
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
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">{plan.name}</div>
              <div className="flex items-end gap-1 mb-1">
                <span className="font-heading font-extrabold text-4xl">{plan.price}</span>
                <span className="text-slate-400 text-sm pb-2">{plan.period}</span>
              </div>
              <p className="text-slate-500 text-sm mb-6">{plan.desc}</p>
              <ul className="flex flex-col gap-2.5 mb-8 flex-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-slate-300">
                    <CheckCircle size={14} className="text-emerald-400 flex-shrink-0" />{f}
                  </li>
                ))}
                {plan.missing.map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-slate-600 line-through opacity-50">
                    <span className="w-3.5 h-3.5 flex-shrink-0 text-center">×</span>{f}
                  </li>
                ))}
              </ul>
              <Link to="/login"
                className={`py-3 text-center rounded-xl font-semibold text-sm transition-all duration-200 ${plan.featured ? 'btn-primary' : 'btn-secondary'}`}>
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
        <p className="text-center text-slate-600 text-sm mt-8">
          ✓ No credit card required &nbsp;·&nbsp; ✓ Cancel anytime &nbsp;·&nbsp; ✓ 14-day money-back guarantee
        </p>
      </div>
    </section>
  )
}

/* ── FAQ ────────────────────────────────────────────────────── */
function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-xl overflow-hidden transition-all duration-200"
      style={{ border: `1px solid ${open ? 'rgba(124,58,237,.5)' : 'rgba(124,58,237,.2)'}`, background: '#111338' }}>
      <button className="w-full flex items-center justify-between px-5 py-4 text-left"
        onClick={() => setOpen(v => !v)}>
        <span className="font-semibold text-sm pr-4">{q}</span>
        <ChevronDown size={16} className="text-purple-400 flex-shrink-0 transition-transform duration-200"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)' }} />
      </button>
      {open && (
        <div className="px-5 pb-4" style={{ background: '#0D0F2E' }}>
          <p className="text-slate-400 text-sm leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  )
}

function FAQSection() {
  return (
    <section className="py-24">
      <div className="max-w-[800px] mx-auto px-6">
        <div className="text-center mb-16 reveal">
          <div className="section-tag mb-4 mx-auto w-fit">FAQ</div>
          <h2 className="font-heading font-bold mb-3" style={{ fontSize: 'clamp(2rem,4vw,3rem)' }}>
            Frequently asked <span className="gradient-text">questions</span>
          </h2>
        </div>
        <div className="flex flex-col gap-3">
          {faqs.map((f, i) => <FaqItem key={i} q={f.q} a={f.a} />)}
        </div>
      </div>
    </section>
  )
}

/* ── CTA Banner ─────────────────────────────────────────────── */
function CTABanner() {
  return (
    <section className="py-24">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="relative rounded-3xl p-14 text-center overflow-hidden reveal"
          style={{ background: 'linear-gradient(135deg,rgba(124,58,237,.3),rgba(6,182,212,.15))', border: '1px solid rgba(124,58,237,.35)' }}>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-52 rounded-full pointer-events-none opacity-30"
            style={{ background: 'rgba(124,58,237,.5)', filter: 'blur(80px)' }} />
          <div className="relative">
            <div className="section-tag mb-6 mx-auto w-fit"><Rocket size={12} /> Get Started</div>
            <h2 className="font-heading font-extrabold mb-4" style={{ fontSize: 'clamp(2rem,4vw,3.5rem)' }}>
              Ready to land your <span className="gradient-text">dream job?</span>
            </h2>
            <p className="text-slate-300 mb-8 text-lg max-w-xl mx-auto">
              Join millions of job seekers who've already upgraded their careers with ResumeAI Pro.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link to="/builder" className="btn-primary text-base px-8 py-4 rounded-xl gap-2">
                Build Your Resume Free <ArrowRight size={18} />
              </Link>
              <Link to="/pricing" className="btn-secondary text-base px-8 py-4 rounded-xl">
                View Pricing
              </Link>
            </div>
            <p className="text-slate-500 text-sm mt-5">No credit card required · Free forever plan available</p>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── Page Export ────────────────────────────────────────────── */
export default function Home() {
  useScrollReveal()
  return (
    <main>
      <Hero />
      <TrustBar />
      <Features />
      <HowItWorks />
      <Testimonials />
      <PricingSnapshot />
      <FAQSection />
      <CTABanner />
    </main>
  )
}
