import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Sparkles, Copy, Download, RefreshCw, Mail, CheckCircle } from 'lucide-react'
import { generateCoverLetterWithAI } from '../lib/aiService'
import { useAuth } from '../context/AuthContext'

const TEMPLATES = [
  'Standard Professional',
  'Creative & Bold',
  'Concise & Direct',
  'Story-Driven',
]

const TONES = ['Professional', 'Enthusiastic', 'Confident', 'Humble']

function generateLetter({ name, role, company, skills, experience, tone }) {
  const openings = {
    Professional:   `I am writing to express my strong interest in the ${role} position at ${company}.`,
    Enthusiastic:   `I was thrilled to discover the ${role} opening at ${company} and am excited to apply!`,
    Confident:      `With ${experience || 'several'} years of proven experience, I am the ideal candidate for the ${role} role at ${company}.`,
    Humble:         `I am honored to apply for the ${role} position at ${company} and believe I can make a meaningful contribution.`,
  }
  const skillList = skills ? skills.split(',').map(s => s.trim()).join(', ') : 'relevant technical and interpersonal skills'

  return `${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}

Hiring Manager
${company}

Dear Hiring Manager,

${openings[tone] || openings['Professional']}

Throughout my career${experience ? ` spanning ${experience}` : ''}, I have developed a strong foundation in ${skillList}. My background has equipped me with the skills to deliver exceptional results and contribute meaningfully to ${company}'s mission and goals.

In my previous roles, I consistently demonstrated the ability to solve complex problems, collaborate with cross-functional teams, and drive measurable outcomes. I am particularly drawn to ${company} because of your reputation for innovation and commitment to excellence — values that deeply align with my own professional philosophy.

I am confident that my expertise in ${skillList} would make me a valuable addition to your team. I am excited about the opportunity to bring my unique perspective and skills to the ${role} position, and I look forward to contributing to ${company}'s continued success.

Thank you for considering my application. I would welcome the opportunity to discuss how my background and enthusiasm align with your needs. Please feel free to reach out at your earliest convenience.

Warm regards,

${name || 'Your Name'}
${role} Applicant`
}

export default function CoverLetter() {
  const { user, profile, getUserDefaults } = useAuth()
  const [letter, setLetter] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [copied, setCopied] = useState(false)
  const [template, setTemplate] = useState(TEMPLATES[0])
  const [tone, setTone] = useState(TONES[0])
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  // Pre-fill logged in user details
  useEffect(() => {
    if (user) {
      const defaults = getUserDefaults ? getUserDefaults() : {}
      const savedName = defaults.name || profile?.full_name || user?.user_metadata?.full_name || (user?.email ? user.email.split('@')[0] : '')
      const savedRole = defaults.title || user?.user_metadata?.title || ''
      const savedSkills = defaults.skills || user?.user_metadata?.skills || ''
      reset({
        name: savedName,
        role: savedRole,
        skills: savedSkills,
      })
    }
  }, [user, profile, getUserDefaults, reset])

  const generate = async (data) => {
    setGenerating(true)
    setGenerated(false)
    setLetter('')
    
    let full = await generateCoverLetterWithAI({ ...data, tone })
    if (!full) {
      full = generateLetter({ ...data, tone })
    }

    // Typewriter effect
    for (let i = 0; i <= full.length; i += 6) {
      await new Promise(r => setTimeout(r, 8))
      setLetter(full.slice(0, i))
    }
    setLetter(full)
    setGenerating(false)
    setGenerated(true)
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(letter)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadTxt = () => {
    const blob = new Blob([letter], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'cover-letter.txt'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <main className="min-h-screen pt-[72px]">
      {/* Header */}
      <section className="py-16 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-grid pointer-events-none opacity-50" />
        <div className="absolute inset-0 pointer-events-none"
             style={{ background: 'radial-gradient(ellipse at 50% 0%,rgba(236,72,153,.2) 0%,transparent 60%)' }} />
        <div className="max-w-[1200px] mx-auto px-6 relative">
          <div className="section-tag mb-4 mx-auto w-fit" style={{ borderColor: 'rgba(236,72,153,.3)', background: 'rgba(236,72,153,.1)', color: '#F472B6' }}>
            <Sparkles size={12} /> AI Cover Letter
          </div>
          <h1 className="font-heading font-extrabold mb-3" style={{ fontSize: 'clamp(2rem,4vw,3.5rem)' }}>
            Generate a <span className="gradient-text">winning cover letter</span> in seconds
          </h1>
          <p className="text-slate-400 max-w-lg mx-auto">Fill in the details, choose your tone, and our AI writes a personalized cover letter instantly.</p>
        </div>
      </section>

      {/* Tool */}
      <section className="pb-24">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Form */}
            <div className="lg:col-span-2">
              <form onSubmit={handleSubmit(generate)}
                    className="p-6 rounded-2xl flex flex-col gap-4 sticky top-24"
                    style={{ background: '#111338', border: '1px solid rgba(124,58,237,.25)' }}>
                <h2 className="font-heading font-bold text-lg flex items-center gap-2">
                  <Mail size={18} className="text-purple-400" /> Your Details
                </h2>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-slate-400">Your Full Name *</label>
                  <input {...register('name', { required: true })} placeholder="e.g. Rahul Sharma" className="form-input" />
                  {errors.name && <span className="text-red-400 text-xs">Required</span>}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-slate-400">Job Title Applying For *</label>
                  <input {...register('role', { required: true })} placeholder="Senior Software Engineer" className="form-input" />
                  {errors.role && <span className="text-red-400 text-xs">Required</span>}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-slate-400">Company Name *</label>
                  <input {...register('company', { required: true })} placeholder="Google" className="form-input" />
                  {errors.company && <span className="text-red-400 text-xs">Required</span>}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-slate-400">Key Skills (comma-separated)</label>
                  <input {...register('skills')} placeholder="React, Python, Leadership, AWS" className="form-input" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-slate-400">Years of Experience</label>
                  <input {...register('experience')} placeholder="5 years" className="form-input" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-slate-400">Tone</label>
                  <div className="grid grid-cols-2 gap-2">
                    {TONES.map(t => (
                      <button key={t} type="button" onClick={() => setTone(t)}
                              className="py-2 rounded-xl text-xs font-semibold transition-all duration-150"
                              style={tone === t
                                ? { background: 'linear-gradient(135deg,#7C3AED,#06B6D4)', color: '#fff' }
                                : { background: 'rgba(255,255,255,.05)', color: '#64748B', border: '1px solid rgba(124,58,237,.2)' }}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <button type="submit" disabled={generating}
                        className="btn-primary py-3.5 rounded-xl gap-2 justify-center mt-1 disabled:opacity-60">
                  {generating
                    ? <><span className="spinner" /> Generating...</>
                    : <><Sparkles size={16} /> Generate Cover Letter</>
                  }
                </button>
              </form>
            </div>

            {/* Output */}
            <div className="lg:col-span-3">
              {/* Toolbar */}
              {generated && (
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs text-slate-500 flex items-center gap-1.5 mr-auto">
                    <CheckCircle size={12} className="text-emerald-400" /> Cover letter generated
                  </span>
                  <button onClick={copyToClipboard}
                          className="btn-secondary text-xs px-4 py-2 rounded-lg gap-1.5">
                    {copied ? <><CheckCircle size={12} className="text-emerald-400" /> Copied!</> : <><Copy size={12} /> Copy</>}
                  </button>
                  <button onClick={downloadTxt}
                          className="btn-secondary text-xs px-4 py-2 rounded-lg gap-1.5">
                    <Download size={12} /> Download
                  </button>
                  <button onClick={() => { setLetter(''); setGenerated(false) }}
                          className="btn-secondary text-xs px-4 py-2 rounded-lg gap-1.5">
                    <RefreshCw size={12} /> Reset
                  </button>
                </div>
              )}

              {/* Letter output */}
              <div className="rounded-2xl overflow-hidden" style={{ background: '#111338', border: '1px solid rgba(124,58,237,.25)', minHeight: 500 }}>
                {!letter && !generating ? (
                  <div className="flex flex-col items-center justify-center h-96 text-center px-8">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                         style={{ background: 'rgba(236,72,153,.15)', border: '1px solid rgba(236,72,153,.3)' }}>
                      <Sparkles size={28} className="text-pink-400" />
                    </div>
                    <h3 className="font-heading font-bold text-lg mb-2">Your cover letter will appear here</h3>
                    <p className="text-slate-500 text-sm">Fill in the form and click "Generate Cover Letter" to get started.</p>
                  </div>
                ) : (
                  <div className="p-8 relative">
                    {generating && (
                      <div className="absolute top-0 left-0 right-0 h-0.5"
                           style={{ background: 'linear-gradient(90deg,#7C3AED,#06B6D4)', animation: 'shimmer 1s linear infinite', backgroundSize: '200%' }} />
                    )}
                    <pre className={`font-sans text-slate-200 text-sm leading-relaxed whitespace-pre-wrap ${generating ? 'blink-cursor' : ''}`}>
                      {letter}
                    </pre>
                  </div>
                )}
              </div>

              {/* Tips */}
              {generated && (
                <div className="mt-4 p-4 rounded-xl flex gap-3 text-sm"
                     style={{ background: 'rgba(124,58,237,.08)', border: '1px solid rgba(124,58,237,.2)' }}>
                  <Sparkles size={14} className="text-purple-400 flex-shrink-0 mt-0.5" />
                  <p className="text-slate-400 text-xs leading-relaxed">
                    <strong className="text-slate-300">Pro tip:</strong> Personalize this letter by adding specific details about the company, mentioning a recent product or news, and tailoring the skills section to match the exact job requirements.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
