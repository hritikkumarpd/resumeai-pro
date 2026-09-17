import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Upload, Target, CheckCircle, XCircle, AlertCircle, Zap,
  BarChart2, RefreshCw, FileText, Sparkles, ArrowRight, ShieldCheck, Check
} from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { calcAtsScore } from '../lib/utils'
import { useAuth } from '../context/AuthContext'
import { atsApi } from '../lib/api'

// Set up PDF.js worker with Vite asset URL and CDN fallback
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker || `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '6.3.289'}/build/pdf.worker.min.mjs`
}

// Function to extract text from PDF
async function extractTextFromPdf(file) {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
    const pdf = await loadingTask.promise
    if (!pdf || pdf.numPages === 0) {
      throw new Error('PDF has no pages')
    }

    let text = ''
    for (let i = 1; i <= pdf.numPages; i++) {
      try {
        const page = await pdf.getPage(i)
        if (!page) continue
        const textContent = await page.getTextContent()
        if (!textContent || !textContent.items) continue
        const pageText = textContent.items
          .filter(item => item.str)
          .map(item => item.str)
          .join(' ')
        if (pageText) text += pageText + ' '
      } catch (pageErr) {
        console.warn(`Error extracting page ${i}:`, pageErr)
      }
    }

    if (!text.trim()) {
      throw new Error('No text content found in PDF')
    }
    return text.trim()
  } catch (err) {
    console.error('Error extracting PDF text:', err)
    throw new Error(`Failed to extract text from PDF: ${err.message}`)
  }
}

const sampleJob = `We are looking for a Senior Software Engineer with experience in:
- React, TypeScript, Node.js, Python
- AWS, Docker, Kubernetes, CI/CD pipelines
- RESTful APIs and microservices architecture
- Agile/Scrum methodologies
- Strong problem-solving and communication skills
- Bachelor's degree in Computer Science or related field
- 5+ years of professional software development experience`

const sampleResume = `Hritik Kumar - Software Development Engineer
hritikkumarpd@gmail.com | +91 94716 36126 | Gaya, Bihar, India
linkedin.com/in/hritikkumar | github.com/hritikkumar

PROFESSIONAL SUMMARY
Results-driven Software Engineer with 3+ years of experience architecting scalable full-stack web applications, microservices, and AI-powered systems. Proven track record of improving system latency, streamlining CI/CD pipelines, and delivering robust production-ready code in collaborative agile teams.

EXPERIENCE
Software Development Engineer — TechCorp (2022-Present)
- Architected and engineered scalable web applications using React, TypeScript, and Node.js serving 150K+ active users.
- Designed and deployed containerized RESTful microservices with Docker and Kubernetes on AWS.
- Automated CI/CD pipelines using GitHub Actions, reducing deployment turnaround time.
- Mentored junior engineers and led agile sprint ceremonies.

EDUCATION
Bachelor of Technology, Computer Science & Engineering (AI & ML)
Techno Main Salt Lake, Kolkata (2020-2024)

TECHNICAL SKILLS
React, TypeScript, Node.js, Python, JavaScript, AWS, Docker, Kubernetes, CI/CD, REST APIs, Microservices, SQL, PostgreSQL, MongoDB, Git, Agile, Scrum

PROJECTS
ResumeAI Pro — AI-Powered Resume & ATS Intelligence Platform
- Engineered full-stack ATS optimization and resume building platform with React, Vite, and Express.
- Integrated automated ATS scoring engine analyzing keyword coverage and formatting standards.`

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
                  style={{ transition: 'stroke-dasharray 1.2s ease-in-out' }} />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="font-heading font-extrabold text-4xl text-white">{score}</span>
          <span className="text-xs text-slate-400">out of 100</span>
        </div>
      </div>
      <span className="mt-2 text-xs font-semibold px-3 py-1 rounded-full font-heading"
            style={{ color, background: `${color}18`, border: `1px solid ${color}40` }}>
        {label}
      </span>
    </div>
  )
}

export default function AtsChecker() {
  const [jobDesc, setJobDesc] = useState(sampleJob)
  const [resume, setResume]   = useState(sampleResume)
  const [scanning, setScanning] = useState(false)
  const [result, setResult]   = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const fileRef    = useRef(null)
  const jobFileRef = useRef(null)
  const { user, profile, getUserDefaults } = useAuth()

  useEffect(() => {
    if (user) {
      const defs = getUserDefaults()
      if (defs?.name) {
        setResume(prev => {
          if (prev === sampleResume) {
            return `${defs.name} — ${defs.title || 'Software Engineer'}\n${defs.email || ''} | ${defs.phone || ''} | ${defs.location || ''}\n${defs.linkedin || ''} | ${defs.website || ''}\n\nSUMMARY\n${defs.summary || ''}\n\nSKILLS\n${defs.skills || ''}\n\nEXPERIENCE\nSoftware Engineer (2022-Present)\n- Led cross-functional collaboration in fast-paced agile teams\n\nEDUCATION\nBachelor of Science / Technology in Computer Science or related field`
          }
          return prev
        })
      }
    }
  }, [user, profile, getUserDefaults])

  const analyze = async () => {
    if (!resume.trim()) {
      setError('Please provide your resume text or upload a PDF first.')
      return
    }

    setScanning(true)
    setError(null)
    setResult(null)

    try {
      const { data } = await atsApi.analyze({
        resume_text: resume,
        job_description: jobDesc.trim() || undefined,
      })

      if (data && typeof data.score === 'number') {
        setResult(data)
      } else {
        const local = calcAtsScore(resume, jobDesc)
        setResult(local)
      }
    } catch (err) {
      console.warn('Backend ATS engine request failed, falling back to local calculation:', err?.message)
      const local = calcAtsScore(resume, jobDesc)
      setResult(local)
    } finally {
      setScanning(false)
    }
  }

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setUploading(true)
      setError(null)
      let text = ''
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        text = await extractTextFromPdf(file)
      } else {
        text = await file.text()
      }
      setResume(text)
    } catch (err) {
      setError('Error reading file: ' + err.message)
    } finally {
      setUploading(false)
      if (e.target) e.target.value = ''
    }
  }

  const handleJobDescFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setUploading(true)
      setError(null)
      let text = ''
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        text = await extractTextFromPdf(file)
      } else {
        text = await file.text()
      }
      setJobDesc(text)
    } catch (err) {
      setError('Error reading job posting: ' + err.message)
    } finally {
      setUploading(false)
      if (e.target) e.target.value = ''
    }
  }

  // Category labels and max weights
  const categoryLabels = {
    contact:    { label: 'Contact Information',  max: 10 },
    summary:    { label: 'Professional Summary', max: 15 },
    skills:     { label: 'Skills & Keywords',    max: 20 },
    experience: { label: 'Work Experience',      max: 25 },
    education:  { label: 'Education',            max: 10 },
    projects:   { label: 'Projects & Portfolio', max: 10 },
    formatting: { label: 'Formatting & Layout',  max: 10 },
  }

  const matchedKeywords = result?.matched_keywords || result?.matched || []
  const missingKeywords = result?.missing_keywords || result?.missing || []

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
            Analyze keyword density, ATS section structure, and role match with our deterministic scoring engine.
          </p>
        </div>
      </section>

      {/* Tool Inputs */}
      <section className="pb-24">
        <div className="max-w-[1200px] mx-auto px-6">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle size={15} className="text-red-400 flex-shrink-0" />
                <span>{error}</span>
              </div>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-white font-bold ml-2">×</button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Job Description */}
            <div className="rounded-2xl overflow-hidden" style={{ background: '#111338', border: '1px solid rgba(124,58,237,.25)' }}>
              <div className="px-5 py-3.5 border-b flex items-center gap-2" style={{ borderColor: 'rgba(124,58,237,.2)', background: '#0D0F2E' }}>
                <Target size={14} className="text-cyan-400" />
                <span className="font-semibold text-sm">Job Description</span>
                <span className="text-[11px] text-slate-400">(Optional for role matching)</span>
                <button onClick={() => jobFileRef.current?.click()}
                        className="ml-auto flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
                  <Upload size={11} /> Upload PDF
                </button>
                <input ref={jobFileRef} type="file" accept=".pdf,.txt,.md" className="hidden" onChange={handleJobDescFile} disabled={uploading} />
              </div>
              <textarea
                value={jobDesc}
                onChange={e => setJobDesc(e.target.value)}
                placeholder="Paste the target job description here..."
                className="w-full p-5 bg-transparent text-slate-300 text-sm leading-relaxed resize-none outline-none"
                style={{ minHeight: 300 }}
              />
            </div>

            {/* Resume */}
            <div className="rounded-2xl overflow-hidden" style={{ background: '#111338', border: '1px solid rgba(124,58,237,.25)' }}>
              <div className="px-5 py-3.5 border-b flex items-center gap-2" style={{ borderColor: 'rgba(124,58,237,.2)', background: '#0D0F2E' }}>
                <BarChart2 size={14} className="text-purple-400" />
                <span className="font-semibold text-sm">Your Resume</span>
                <span className="text-[11px] text-emerald-400">● Required</span>
                <button onClick={() => fileRef.current?.click()} disabled={uploading}
                        className="ml-auto flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors disabled:opacity-50">
                  {uploading ? <RefreshCw size={11} className="animate-spin" /> : <Upload size={11} />}
                  {uploading ? 'Processing...' : 'Upload PDF / Text'}
                </button>
                <input ref={fileRef} type="file" accept=".pdf,.txt,.md" className="hidden" onChange={handleFile} disabled={uploading} />
              </div>
              <textarea
                value={resume}
                onChange={e => setResume(e.target.value)}
                placeholder="Paste your resume text here or upload a PDF..."
                className="w-full p-5 bg-transparent text-slate-300 text-sm leading-relaxed resize-none outline-none"
                style={{ minHeight: 300 }}
              />
            </div>
          </div>

          {/* Analyze CTA */}
          <div className="flex justify-center mb-10">
            <button
              onClick={analyze}
              disabled={scanning}
              className="btn-primary px-10 py-4 rounded-xl text-base gap-3 disabled:opacity-60 cursor-pointer shadow-xl shadow-purple-600/25"
            >
              {scanning
                ? <><RefreshCw size={18} className="animate-spin" /> Analyzing your resume...</>
                : <><Zap size={18} /> Analyze ATS Score</>
              }
            </button>
          </div>

          {/* Loading Animation */}
          {scanning && (
            <div className="text-center py-12">
              <div className="relative inline-block">
                <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
                     style={{ background: 'rgba(124,58,237,.15)', border: '2px solid rgba(124,58,237,.4)' }}>
                  <RefreshCw size={32} className="animate-spin text-purple-400" />
                </div>
              </div>
              <p className="text-slate-200 text-base font-semibold flex items-center justify-center gap-2">
                <Sparkles size={16} className="text-cyan-400 animate-pulse" />
                Evaluating with Gemini AI & ATS Engine...
              </p>
              <p className="text-slate-400 text-xs mt-1">Analyzing keywords, section weighting, readability, and ATS parsing standards</p>
            </div>
          )}

          {/* Results Dashboard */}
          {result && (
            <div className="space-y-6 animate-fade-in">
              {/* AI Recruiter Feedback Banner (if AI powered) */}
              {result.ai_feedback && (
                <div className="p-6 rounded-2xl relative overflow-hidden"
                     style={{
                       background: 'linear-gradient(135deg, rgba(124,58,237,0.18) 0%, rgba(6,182,212,0.12) 100%)',
                       border: '1px solid rgba(124,58,237,0.4)',
                       boxShadow: '0 8px 32px -8px rgba(124,58,237,0.25)'
                     }}>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-2.5 w-2.5 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
                      </span>
                      <h3 className="font-heading font-bold text-base text-white flex items-center gap-2">
                        <Sparkles size={16} className="text-cyan-400" />
                        AI Recruiter Executive Assessment
                      </h3>
                    </div>
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      ✨ Powered by Google Gemini AI
                    </span>
                  </div>
                  <p className="text-sm text-slate-200 leading-relaxed font-sans">
                    {result.ai_feedback}
                  </p>
                </div>
              )}

              {/* Row 1: Score + Category Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Score Gauge Card */}
                <div className="p-8 rounded-2xl flex flex-col items-center justify-center text-center"
                     style={{ background: '#111338', border: '1px solid rgba(124,58,237,.25)' }}>
                  <h3 className="font-heading font-bold text-lg mb-4 text-white">ATS Overall Score</h3>
                  <ScoreGauge score={result.score} />

                  <div className="mt-6 w-full grid grid-cols-2 gap-3 text-center">
                    <div className="p-3 rounded-xl" style={{ background: 'rgba(16,185,129,.1)', border: '1px solid rgba(16,185,129,.2)' }}>
                      <div className="font-heading font-bold text-xl text-emerald-400">{matchedKeywords.length}</div>
                      <div className="text-xs text-slate-400 mt-0.5">Matched Keywords</div>
                    </div>
                    <div className="p-3 rounded-xl" style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)' }}>
                      <div className="font-heading font-bold text-xl text-red-400">{missingKeywords.length}</div>
                      <div className="text-xs text-slate-400 mt-0.5">Missing Keywords</div>
                    </div>
                  </div>

                  <div className="mt-6 w-full flex flex-col gap-2">
                    <Link
                      to="/builder"
                      className="btn-primary py-2.5 rounded-xl text-xs font-semibold gap-1.5 justify-center flex items-center shadow-md shadow-purple-600/30"
                    >
                      <Sparkles size={13} />
                      <span>Improve in Resume Builder</span>
                    </Link>
                    <button
                      onClick={analyze}
                      className="btn-secondary py-2 rounded-xl text-xs font-medium gap-1.5 justify-center flex items-center"
                    >
                      <RefreshCw size={12} />
                      <span>Recalculate Score</span>
                    </button>
                  </div>
                </div>

                {/* 7-Category Breakdown Card */}
                <div className="lg:col-span-2 p-6 rounded-2xl flex flex-col justify-between"
                     style={{ background: '#111338', border: '1px solid rgba(124,58,237,.25)' }}>
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <BarChart2 size={16} className="text-purple-400" />
                        <h3 className="font-heading font-bold text-base text-white">7-Category ATS Breakdown</h3>
                      </div>
                      <span className="text-xs text-slate-400">Target: 100 Points</span>
                    </div>

                    <div className="space-y-3.5">
                      {result.breakdown ? (
                        Object.entries(result.breakdown).map(([catKey, catVal]) => {
                          const meta = categoryLabels[catKey] || { label: catKey, max: catVal.max || 10 }
                          const score = typeof catVal === 'object' ? catVal.score : catVal
                          const max = typeof catVal === 'object' ? catVal.max : meta.max
                          const pct = Math.round((score / max) * 100)
                          const color = pct >= 80 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#EF4444'

                          return (
                            <div key={catKey} className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-300 font-medium">{meta.label}</span>
                                <span className="font-mono text-slate-400">
                                  <strong style={{ color }}>{score}</strong> / {max} pts ({pct}%)
                                </span>
                              </div>
                              <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-700"
                                  style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }}
                                />
                              </div>
                            </div>
                          )
                        })
                      ) : (
                        <p className="text-xs text-slate-400">Detailed category breakdown available after full scan.</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-purple-500/20 flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-emerald-400" /> Standard ATS Compliant
                    </span>
                    <span className="text-cyan-400 font-medium">
                      {result.is_ai_powered ? '✨ Evaluated with Google Gemini AI' : 'Deterministic Analysis Engine'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Row 2: Strengths & Issues */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Strengths */}
                <div className="p-6 rounded-2xl" style={{ background: '#111338', border: '1px solid rgba(16,185,129,.25)' }}>
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle size={16} className="text-emerald-400" />
                    <h3 className="font-heading font-bold text-base text-white">Identified Strengths</h3>
                    <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
                      {result.strengths?.length || 0} items
                    </span>
                  </div>
                  {result.strengths && result.strengths.length > 0 ? (
                    <ul className="space-y-2.5">
                      {result.strengths.map((str, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-300">
                          <Check size={13} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                          <span>{str}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-400">No major strengths highlighted yet.</p>
                  )}
                </div>

                {/* Issues */}
                <div className="p-6 rounded-2xl" style={{ background: '#111338', border: '1px solid rgba(239,68,68,.25)' }}>
                  <div className="flex items-center gap-2 mb-4">
                    <AlertCircle size={16} className="text-amber-400" />
                    <h3 className="font-heading font-bold text-base text-white">Areas to Improve</h3>
                    <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400">
                      {result.issues?.length || 0} issues
                    </span>
                  </div>
                  {result.issues && result.issues.length > 0 ? (
                    <ul className="space-y-2.5">
                      {result.issues.map((issue, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-300">
                          <AlertCircle size={13} className="text-amber-400 flex-shrink-0 mt-0.5" />
                          <span>{issue}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-emerald-400 flex items-center gap-1.5">
                      <Check size={14} /> Great job! No critical structural issues detected.
                    </p>
                  )}
                </div>
              </div>

              {/* Row 3: Actionable Recommendations */}
              {result.recommendations && result.recommendations.length > 0 && (
                <div className="p-6 rounded-2xl" style={{ background: 'rgba(124,58,237,.1)', border: '1px solid rgba(124,58,237,.3)' }}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-heading font-bold text-base text-white flex items-center gap-2">
                      <Zap size={16} className="text-purple-400" /> Actionable Recommendations
                    </h3>
                    <Link
                      to="/builder"
                      className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1"
                    >
                      <span>Fix in Builder</span>
                      <ArrowRight size={12} />
                    </Link>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {result.recommendations.map((rec, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-slate-200">
                        <ArrowRight size={13} className="text-purple-400 flex-shrink-0 mt-0.5" />
                        <span>{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Row 4: Matched & Missing Keywords */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Matched Keywords */}
                <div className="p-6 rounded-2xl" style={{ background: '#111338', border: '1px solid rgba(124,58,237,.25)' }}>
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle size={16} className="text-emerald-400" />
                    <h3 className="font-heading font-bold text-base text-white">Keywords Found</h3>
                    <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
                      {matchedKeywords.length} matched
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 max-h-56 overflow-y-auto">
                    {matchedKeywords.length > 0 ? (
                      matchedKeywords.map((kw, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          {kw}
                        </span>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400">No keyword matches found yet.</p>
                    )}
                  </div>
                </div>

                {/* Missing Keywords */}
                <div className="p-6 rounded-2xl" style={{ background: '#111338', border: '1px solid rgba(124,58,237,.25)' }}>
                  <div className="flex items-center gap-2 mb-4">
                    <XCircle size={16} className="text-red-400" />
                    <h3 className="font-heading font-bold text-base text-white">Missing Keywords</h3>
                    <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-red-500/15 text-red-400">
                      {missingKeywords.length} missing
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 max-h-56 overflow-y-auto">
                    {missingKeywords.length > 0 ? (
                      missingKeywords.map((kw, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-300 border border-red-500/25">
                          {kw}
                        </span>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400">Add a Job Description to discover missing target keywords.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
