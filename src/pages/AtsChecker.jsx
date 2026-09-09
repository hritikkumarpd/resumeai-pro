import { useState, useRef, useEffect } from 'react'
import { Upload, Target, CheckCircle, XCircle, AlertCircle, Zap, BarChart2, RefreshCw } from 'lucide-react'
import { calcAtsScore } from '../lib/utils'
import { useAuth } from '../context/AuthContext'
import { atsApi } from '../lib/api'

const sampleJob = `We are looking for a Senior Software Engineer with experience in:
- React, TypeScript, Node.js, Python
- AWS, Docker, Kubernetes, CI/CD pipelines
- RESTful APIs and microservices architecture
- Agile/Scrum methodologies
- Strong problem-solving and communication skills
- Bachelor's degree in Computer Science or related field
- 5+ years of professional software development experience`

const sampleResume = `Professional Candidate - Senior Software Engineer
candidate@email.com | San Francisco, CA | LinkedIn

EXPERIENCE
Senior Software Engineer - TechCorp (2021-Present)
- Built scalable React and TypeScript applications serving 2M+ users
- Designed RESTful APIs and microservices using Node.js and Python
- Deployed and managed AWS infrastructure with Docker and Kubernetes
- Led Agile/Scrum ceremonies and mentored junior engineers
- Improved CI/CD pipeline efficiency by 40%

Software Engineer - StartupXYZ (2019-2021)
- Developed full-stack features using React and Node.js
- Collaborated with cross-functional teams in agile environment

EDUCATION
Bachelor of Science, Computer Science - UC Berkeley (2019)

SKILLS
React, TypeScript, Node.js, Python, AWS, Docker, Kubernetes, CI/CD, REST APIs, Microservices, Agile, Scrum, Git, PostgreSQL, Redis`

function ScoreGauge({ score }) {
  const color = score >= 80 ? '#10B981' : score >= 60 ? '#F59E0B' : '#EF4444'
  const label = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : 'Needs Work'
  const r = 70, circ = 2 * Math.PI * r
  const dash = (score / 100) * circ

  return (
    <div className="flex flex-col items-center">
      <div className="relative inline-flex items-center justify-center">
        <svg width="180" height="180" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="90" cy="90" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
          <circle cx="90" cy="90" r={r} fill="none" stroke={color} strokeWidth="10"
                  strokeLinecap="round" strokeDasharray={`${dash} ${circ}`}
                  style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)', filter: `drop-shadow(0 0 10px ${color})` }} />
        </svg>
        <div className="absolute text-center">
          <div className="font-heading font-extrabold text-4xl" style={{ color }}>{score}</div>
          <div className="text-slate-400 text-xs mt-0.5">/ 100</div>
        </div>
      </div>
      <div className="mt-3 px-4 py-1.5 rounded-full text-sm font-bold" style={{ background: `${color}20`, color }}>{label}</div>
    </div>
  )
}

export default function AtsChecker() {
  const { user, profile, getUserDefaults } = useAuth()
  const [jobDesc, setJobDesc] = useState(sampleJob)
  const [resume, setResume] = useState(sampleResume)
  const [result, setResult] = useState(null)
  const [scanning, setScanning] = useState(false)
  const fileRef = useRef()

  useEffect(() => {
    if (user) {
      const defaults = getUserDefaults ? getUserDefaults() : {}
      const name = defaults.name || profile?.full_name || user?.user_metadata?.full_name || (user?.email ? user.email.split('@')[0] : '')
      const email = defaults.email || user.email || 'candidate@email.com'
      const title = defaults.title || 'Senior Software Engineer'
      if (name) {
        setResume(prev => {
          if (prev.startsWith('Alex Johnson') || prev.startsWith('Professional Candidate')) {
            return `${name} - ${title}
${email} | ${defaults.location || 'Remote'} | ${defaults.linkedin || 'LinkedIn'}

EXPERIENCE
${title} - TechCorp (2021-Present)
- Built scalable web applications and high-throughput systems
- Designed RESTful APIs and microservices using clean architecture
- Automated deployment pipelines and optimized database latency
- Led cross-functional collaboration in fast-paced agile teams

EDUCATION
Bachelor of Science / Technology in Computer Science or related field`
          }
          return prev
        })
      }
    }
  }, [user, profile, getUserDefaults])

  const analyze = async () => {
    if (!jobDesc.trim() || !resume.trim()) return
    setScanning(true)
    setResult(null)

    // Calculate instant ATS score client-side
    const localScore = calcAtsScore(resume, jobDesc)

    // If authenticated, persist scan to backend database
    if (user) {
      try {
        await atsApi.analyze({
          resume_text: resume,
          job_description: jobDesc,
        })
      } catch (err) {
        console.warn('Backend ATS history save skipped:', err?.message)
      }
    }

    await new Promise(r => setTimeout(r, 1200))
    setResult(localScore)
    setScanning(false)
  }

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setResume(ev.target.result)
    reader.readAsText(file)
  }

  return (
    <main className="min-h-screen pt-[72px]">
      {/* Header */}
      <section className="py-16 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-grid pointer-events-none opacity-50" />
        <div className="absolute inset-0 pointer-events-none"
             style={{ background: 'radial-gradient(ellipse at 50% 0%,rgba(34,211,238,.2) 0%,transparent 60%)' }} />
        <div className="max-w-[1200px] mx-auto px-6 relative">
          <div className="section-tag mb-4 mx-auto w-fit"><Target size={12} /> ATS Score Checker</div>
          <h1 className="font-heading font-extrabold mb-3" style={{ fontSize: 'clamp(2rem,4vw,3.5rem)' }}>
            How well does your resume <span className="gradient-text">match the job?</span>
          </h1>
          <p className="text-slate-400 max-w-xl mx-auto">
            Paste the job description and your resume below. Our AI analyzes keyword matches, ATS compatibility, and gives you an instant score.
          </p>
        </div>
      </section>

      {/* Tool */}
      <section className="pb-24">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Job Description */}
            <div className="rounded-2xl overflow-hidden" style={{ background: '#111338', border: '1px solid rgba(124,58,237,.25)' }}>
              <div className="px-5 py-3.5 border-b flex items-center gap-2" style={{ borderColor: 'rgba(124,58,237,.2)', background: '#0D0F2E' }}>
                <Target size={14} className="text-cyan-400" />
                <span className="font-semibold text-sm">Job Description</span>
                <span className="ml-auto text-xs text-slate-600">Paste from any job posting</span>
              </div>
              <textarea
                value={jobDesc}
                onChange={e => setJobDesc(e.target.value)}
                placeholder="Paste the job description here..."
                className="w-full p-5 bg-transparent text-slate-300 text-sm leading-relaxed resize-none outline-none"
                style={{ minHeight: 320 }}
              />
            </div>

            {/* Resume */}
            <div className="rounded-2xl overflow-hidden" style={{ background: '#111338', border: '1px solid rgba(124,58,237,.25)' }}>
              <div className="px-5 py-3.5 border-b flex items-center gap-2" style={{ borderColor: 'rgba(124,58,237,.2)', background: '#0D0F2E' }}>
                <BarChart2 size={14} className="text-purple-400" />
                <span className="font-semibold text-sm">Your Resume</span>
                <button onClick={() => fileRef.current.click()}
                        className="ml-auto flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors">
                  <Upload size={11} /> Upload .txt
                </button>
                <input ref={fileRef} type="file" accept=".txt,.md" className="hidden" onChange={handleFile} />
              </div>
              <textarea
                value={resume}
                onChange={e => setResume(e.target.value)}
                placeholder="Paste your resume text here..."
                className="w-full p-5 bg-transparent text-slate-300 text-sm leading-relaxed resize-none outline-none"
                style={{ minHeight: 320 }}
              />
            </div>
          </div>

          {/* Analyze button */}
          <div className="flex justify-center mb-10">
            <button onClick={analyze} disabled={scanning}
                    className="btn-primary px-10 py-4 rounded-xl text-base gap-3 disabled:opacity-60">
              {scanning
                ? <><span className="spinner" /> Analyzing your resume...</>
                : <><Zap size={18} /> Analyze ATS Score</>
              }
            </button>
          </div>

          {/* Results */}
          {scanning && (
            <div className="text-center py-12">
              <div className="relative inline-block">
                <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
                     style={{ background: 'rgba(34,211,238,.1)', border: '2px solid rgba(34,211,238,.3)' }}>
                  <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3, borderTopColor: '#22D3EE', borderColor: 'rgba(34,211,238,.2)' }} />
                </div>
              </div>
              <p className="text-slate-400 text-sm">Scanning for keyword matches, ATS compatibility, and formatting issues...</p>
            </div>
          )}

          {result && (
            <div className="animate-scale-in">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Score */}
                <div className="p-8 rounded-2xl text-center" style={{ background: '#111338', border: '1px solid rgba(124,58,237,.25)' }}>
                  <h3 className="font-heading font-bold text-lg mb-6">ATS Match Score</h3>
                  <ScoreGauge score={result.score} />
                  <div className="mt-6 grid grid-cols-2 gap-3 text-center">
                    <div className="p-3 rounded-xl" style={{ background: 'rgba(16,185,129,.1)', border: '1px solid rgba(16,185,129,.2)' }}>
                      <div className="font-heading font-bold text-xl text-emerald-400">{result.matched.length}</div>
                      <div className="text-xs text-slate-500 mt-0.5">Matched</div>
                    </div>
                    <div className="p-3 rounded-xl" style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)' }}>
                      <div className="font-heading font-bold text-xl text-red-400">{result.missing.length}</div>
                      <div className="text-xs text-slate-500 mt-0.5">Missing</div>
                    </div>
                  </div>
                </div>

                {/* Matched Keywords */}
                <div className="p-6 rounded-2xl" style={{ background: '#111338', border: '1px solid rgba(124,58,237,.25)' }}>
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle size={16} className="text-emerald-400" />
                    <h3 className="font-heading font-bold text-base">Keywords Found</h3>
                    <span className="ml-auto text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,.15)', color: '#10B981' }}>
                      {result.matched.length} matched
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto">
                    {result.matched.slice(0, 30).map(kw => (
                      <span key={kw} className="px-2.5 py-1 rounded-full text-xs font-medium"
                            style={{ background: 'rgba(16,185,129,.15)', color: '#10B981', border: '1px solid rgba(16,185,129,.3)' }}>
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Missing Keywords */}
                <div className="p-6 rounded-2xl" style={{ background: '#111338', border: '1px solid rgba(124,58,237,.25)' }}>
                  <div className="flex items-center gap-2 mb-4">
                    <XCircle size={16} className="text-red-400" />
                    <h3 className="font-heading font-bold text-base">Missing Keywords</h3>
                    <span className="ml-auto text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,.1)', color: '#F87171' }}>
                      {result.missing.length} missing
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto mb-4">
                    {result.missing.map(kw => (
                      <span key={kw} className="px-2.5 py-1 rounded-full text-xs font-medium"
                            style={{ background: 'rgba(239,68,68,.1)', color: '#F87171', border: '1px solid rgba(239,68,68,.25)' }}>
                        {kw}
                      </span>
                    ))}
                  </div>
                  {result.missing.length > 0 && (
                    <div className="p-3 rounded-xl text-xs text-slate-400 leading-relaxed"
                         style={{ background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.2)' }}>
                      <AlertCircle size={12} className="text-amber-400 inline mr-1.5" />
                      Add these keywords naturally to your resume to improve your ATS score.
                    </div>
                  )}

                  <button onClick={() => { setResult(null); }}
                          className="btn-secondary w-full mt-4 py-2.5 rounded-xl text-sm gap-2 justify-center">
                    <RefreshCw size={14} /> Analyze Again
                  </button>
                </div>
              </div>

              {/* Tips */}
              {result.score < 80 && (
                <div className="mt-6 p-6 rounded-2xl" style={{ background: 'rgba(124,58,237,.1)', border: '1px solid rgba(124,58,237,.3)' }}>
                  <h3 className="font-heading font-bold text-base mb-3 flex items-center gap-2">
                    <Zap size={16} className="text-purple-400" /> How to improve your score
                  </h3>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {['Add missing keywords naturally in your bullet points', 'Use the exact job title from the posting in your resume', 'Include skills from the job description in your skills section', 'Mirror the language and terminology used in the job posting', 'Quantify achievements with numbers and percentages', 'Use standard section headings (Experience, Education, Skills)'].map(tip => (
                      <li key={tip} className="flex items-start gap-2 text-sm text-slate-300">
                        <CheckCircle size={13} className="text-purple-400 flex-shrink-0 mt-0.5" />{tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
