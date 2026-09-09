import { useState, useRef, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Download, Eye, ChevronDown, ChevronUp, Plus, Trash2,
  Zap, Palette, Type, LayoutTemplate, Brain, Target, GripVertical,
  ZoomIn, ZoomOut, Maximize2, Columns, Edit3, CheckCircle2, Sparkles,
  ArrowUp, ArrowDown, Camera, X, Settings2, Key, Check, Sun, Moon,
  Sliders, RotateCcw, RotateCw, SunDim, Contrast, Save, FileText, Edit2
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import {
  enhanceSummaryWithAI,
  enhanceBulletsWithAI,
  getStoredGeminiKey,
  setStoredGeminiKey
} from '../lib/aiService'
import { resumeApi } from '../lib/api'
import { resumeStorage } from '../lib/resumeStorage'

/* ── Default resume data (Hritik Kumar — TMSL Kolkata, CSE AI & ML) ── */
const defaultData = {
  personal: {
    name: 'Hritik Kumar',
    title: 'Software Development Engineer (AI & ML)',
    email: 'hritikkumarpd@gmail.com',
    phone: '+91 94716 36126',
    location: 'Gaya, Bihar, India',
    linkedin: 'linkedin.com/in/hritikkumar',
    website: 'github.com/hritikkumar',
    photo: '' // Base64 data URL
  },
  summary: 'Results-driven Computer Science Engineering undergraduate specializing in Artificial Intelligence and Machine Learning at Techno Main Salt Lake (TMSL), Kolkata. Passionate about architecting scalable full-stack web applications, machine learning pipelines, and high-performance microservices. Proficient in Python, Java, React.js, Node.js, and SQL, with a strong foundation in Data Structures, Algorithms, and System Design.',
  experience: [
    {
      id: 1,
      company: 'TechCorp India Pvt. Ltd.',
      role: 'Software Development Engineer Intern',
      period: 'Jun 2024 – Aug 2024',
      location: 'Kolkata, India',
      bullets: [
        'Architected and deployed RESTful microservices with Node.js & PostgreSQL, handling 250k+ daily API requests.',
        'Engineered responsive frontend modules using React.js and TypeScript, increasing user engagement by 28%.',
        'Implemented Redis caching layer, decreasing p99 database response latency from 340ms to 75ms.',
        'Automated CI/CD deployment pipelines using GitHub Actions and Docker, reducing release cycle time by 40%.'
      ]
    },
    {
      id: 2,
      company: 'InnoTech AI Labs',
      role: 'Machine Learning Research Intern',
      period: 'Jan 2024 – Apr 2024',
      location: 'Remote',
      bullets: [
        'Developed end-to-end NLP data processing pipelines and text embeddings using Python and PyTorch.',
        'Trained and evaluated classification models achieving 93.4% accuracy across real-world test benchmarks.',
        'Deployed lightweight model inference microservices via FastAPI and Docker with sub-50ms latency.'
      ]
    },
  ],
  education: [
    {
      id: 1,
      school: 'Techno Main Salt Lake (TMSL), Kolkata',
      degree: 'B.Tech in Computer Science and Engineering (AI & ML)',
      period: '2022 – 2026',
      gpa: '6.99 / 10.0 CGPA'
    },
    {
      id: 2,
      school: 'Senior Secondary School, Gaya (CBSE / State)',
      degree: 'Class XII (Senior Secondary - Science PCM)',
      period: '2020 – 2022',
      gpa: '84.2%'
    }
  ],
  skills: [
    'Python', 'Java', 'C++', 'JavaScript', 'React.js', 'Node.js',
    'Machine Learning (AI & ML)', 'SQL', 'PostgreSQL', 'Docker',
    'Git & GitHub', 'Data Structures & Algorithms'
  ],
  projects: [
    {
      id: 1,
      name: 'AI Resume & ATS Intelligence Matcher',
      desc: 'Full-stack AI platform analyzing resumes against job descriptions with real-time keyword scoring, instant AI enhancement, and exportable ATS-tested PDFs. Built with React, Node.js, and Machine Learning algorithms.',
      link: 'github.com/hritikkumar/ai-resume-matcher'
    },
    {
      id: 2,
      name: 'E-Commerce Microservices Platform',
      desc: 'Distributed microservices backend with secure payment gateway, order tracking, and real-time inventory management. Built with Node.js, Redis, Docker, and PostgreSQL.',
      link: 'github.com/hritikkumar/ecommerce-platform'
    },
    {
      id: 3,
      name: 'ML Predictive Classifier & API',
      desc: 'End-to-end machine learning pipeline built with Scikit-Learn, Pandas, and FastAPI, providing real-time data predictions with automated validation checks.',
      link: 'github.com/hritikkumar/ml-classifier'
    }
  ],
  certifications: [
    { id: 1, name: 'Machine Learning & AI Specialization', issuer: 'DeepLearning.AI / Coursera', year: '2024', link: 'https://coursera.org/verify/ML-SPECIALIZATION' },
    { id: 2, name: 'Solved 350+ DSA Problems (LeetCode & GFG)', issuer: 'LeetCode', year: '2024', link: 'https://leetcode.com/u/hritikkumar/' },
  ],
}

export const TEMPLATES = [
  "Classic ATS (Jake's / Overleaf)",
  "Modern Photo Executive (with Headshot)",
  "Two-Column Tech with Photo",
  "Deedy Two-Column (LaTeX)",
  "IIT / NIT Placement Standard",
  "Harvard Classic (Ivy League)",
  "Indian Corporate & MNC (TCS/Infosys)",
  "Stanford Technical SDE (FAANG)",
  "Compact 1-Page Fresher",
  "Minimalist Single Column (ATS Gold)",
  "Executive / Tech Lead (Accent Bar)",
  "Modern Split-Header Technical"
]

const ACCENT_COLORS = ['#000000', '#1E293B', '#0F2B48', '#334155', '#1B4332']
const FONTS = ['Times New Roman', 'Arial', 'Inter', 'Georgia', 'Roboto']

const DEFAULT_SECTION_ORDER = [
  'summary',
  'experience',
  'education',
  'skills',
  'projects',
  'certifications'
]

const SECTION_LABELS = {
  summary: 'Professional Summary',
  experience: 'Work Experience',
  education: 'Education',
  skills: 'Technical Skills',
  projects: 'Projects',
  certifications: 'Certifications & Achievements'
}

/* ── ATS Score Calculation ─────────────────────────────────── */
function calcScore(data) {
  let s = 40
  if (data.personal.name && data.personal.name.length > 2) s += 5
  if (data.personal.email && data.personal.email.includes('@')) s += 5
  if (data.personal.phone && data.personal.phone.length > 8) s += 5
  if (data.summary && data.summary.length > 50) s += 10
  s += Math.min(data.experience.length * 8, 20)
  s += Math.min(data.skills.length * 1.5, 10)
  if (data.education.length > 0) s += 5
  return Math.min(Math.round(s), 100)
}

/* ── Section toggle with Reorder Controls (Up / Down) ──────── */
function EditorSection({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
  canMoveUp = false,
  canMoveDown = false,
  onMoveUp,
  onMoveDown,
  isLight = false
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ borderBottom: '1px solid rgba(124,58,237,.15)' }}>
      <div className={`flex items-center justify-between px-4 py-3 transition-colors ${isLight ? 'hover:bg-slate-50' : 'hover:bg-white/[.02]'}`}>
        <button className="flex items-center gap-2.5 text-left flex-1"
                onClick={() => setOpen(v => !v)}>
          <Icon size={15} className="text-purple-400 flex-shrink-0" />
          <span className={`font-semibold text-xs md:text-sm ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{title}</span>
          {open ? <ChevronUp size={14} className="text-slate-500 ml-1" /> : <ChevronDown size={14} className="text-slate-500 ml-1" />}
        </button>

        {/* Reorder Buttons (▲ / ▼) */}
        {(onMoveUp || onMoveDown) && (
          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={(e) => { e.stopPropagation(); onMoveUp && onMoveUp() }}
              disabled={!canMoveUp}
              title="Move Section Up"
              className={`p-1 rounded transition-colors ${canMoveUp ? (isLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-white/10') : 'text-slate-600 opacity-40 cursor-not-allowed'}`}
            >
              <ArrowUp size={13} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onMoveDown && onMoveDown() }}
              disabled={!canMoveDown}
              title="Move Section Down"
              className={`p-1 rounded transition-colors ${canMoveDown ? (isLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-white/10') : 'text-slate-600 opacity-40 cursor-not-allowed'}`}
            >
              <ArrowDown size={13} />
            </button>
          </div>
        )}
      </div>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  )
}

/* ── Small input ────────────────────────────────────────────── */
function Field({ label, value, onChange, placeholder, multiline }) {
  const cls = "form-input text-xs py-2 px-3 w-full"
  return (
    <div className="flex flex-col gap-1 w-full">
      {label && <label className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{label}</label>}
      {multiline
        ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
                    className={`${cls} resize-none`} rows={3} />
        : <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={cls} />
      }
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   TRUE A4 WYSIWYG DIMENSIONS & RESUME PREVIEW COMPONENT
   Standard ISO 216 A4 = 210mm x 297mm (794px x 1123px at 96 DPI)
   ═══════════════════════════════════════════════════════════════ */
export const A4_WIDTH_PX = 794
export const A4_HEIGHT_PX = 1123

const A4_RESUME_STYLE = {
  width: '210mm',
  minHeight: '297mm',
  boxSizing: 'border-box',
  padding: '16mm 18mm',
  backgroundColor: '#ffffff',
  color: '#111827',
  position: 'relative'
}

/* ── URL & Contact Formatting Helpers for Clickable Hyperlinks ── */
function formatUrl(url) {
  if (!url) return ''
  const trimmed = url.trim()
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

function cleanUrlDisplay(url) {
  if (!url) return ''
  return url.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '')
}

function ResumeDoc({
  data,
  accent = '#000000',
  font = 'Times New Roman',
  template = "Classic ATS (Jake's / Overleaf)",
  sectionOrder = DEFAULT_SECTION_ORDER,
  fontSizeScale = 1.0
}) {
  const s = {
    fontFamily: font,
    fontSize: `${Math.round(11.5 * fontSizeScale)}px`,
    lineHeight: 1.38
  }

  const contactItems = [
    data.personal.phone ? {
      type: 'phone',
      label: data.personal.phone,
      href: `tel:${data.personal.phone.replace(/[^0-9+]/g, '')}`,
      isLink: true
    } : null,
    data.personal.email ? {
      type: 'email',
      label: data.personal.email,
      href: `mailto:${data.personal.email.trim()}`,
      isLink: true
    } : null,
    data.personal.linkedin ? {
      type: 'linkedin',
      label: cleanUrlDisplay(data.personal.linkedin),
      href: formatUrl(data.personal.linkedin),
      isLink: true,
      target: '_blank'
    } : null,
    data.personal.website ? {
      type: 'website',
      label: cleanUrlDisplay(data.personal.website),
      href: formatUrl(data.personal.website),
      isLink: true,
      target: '_blank'
    } : null,
    data.personal.location ? {
      type: 'location',
      label: data.personal.location,
      isLink: false
    } : null
  ].filter(Boolean)

  const hasPhoto = Boolean(data.personal.photo)

  /* ── 1. MODERN PHOTO EXECUTIVE (WITH HEADSHOT) ─────────────── */
  if (template === "Modern Photo Executive (with Headshot)") {
    return (
      <div id="printable-resume" className="bg-white text-gray-900 shadow-2xl" style={{ ...A4_RESUME_STYLE, ...s }}>
        {/* Header with circular/rounded photo */}
        <div className="border-b-2 pb-3 mb-3 flex items-center justify-between gap-4" style={{ borderColor: accent }}>
          <div className="flex-1">
            <h1 className="font-bold tracking-tight text-black" style={{ fontSize: `${Math.round(26 * fontSizeScale)}px` }}>
              {data.personal.name || 'YOUR NAME'}
            </h1>
            <div className="font-semibold text-gray-700 mt-0.5" style={{ fontSize: `${Math.round(13.5 * fontSizeScale)}px` }}>
              {data.personal.title}
            </div>
            {/* Clickable contacts row */}
            <div className="text-gray-600 mt-1 flex flex-wrap items-center gap-x-2.5 leading-normal" style={{ fontSize: `${Math.round(11 * fontSizeScale)}px` }}>
              {contactItems.map((c, i) => (
                <span key={i} className="inline-flex items-center">
                  {c.isLink ? (
                    <a
                      href={c.href}
                      target={c.target || '_self'}
                      rel={c.target ? 'noopener noreferrer' : undefined}
                      className="text-gray-700 hover:text-purple-600 hover:underline transition-colors cursor-pointer"
                      title={`Open ${c.type}: ${c.label}`}
                    >
                      {c.label}
                    </a>
                  ) : (
                    <span>{c.label}</span>
                  )}
                  {i < contactItems.length - 1 && <span className="ml-2.5 text-gray-400 select-none">|</span>}
                </span>
              ))}
            </div>
          </div>
          {hasPhoto ? (
            <img src={data.personal.photo} alt={data.personal.name}
                 className="w-20 h-20 rounded-full object-cover border-2 flex-shrink-0 shadow-sm" style={{ borderColor: accent }} />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gray-100 border border-gray-300 flex items-center justify-center text-gray-400 text-xs flex-shrink-0">
              Photo
            </div>
          )}
        </div>

        {/* Dynamic Reorderable Sections */}
        {sectionOrder.map(key => {
          if (key === 'summary' && data.summary) {
            return (
              <div key="summary" className="mb-3">
                <div className="font-bold uppercase tracking-wider text-black border-b pb-0.5 mb-1.5"
                     style={{ borderColor: accent, fontSize: `${Math.round(13.5 * fontSizeScale)}px` }}>
                  Professional Summary
                </div>
                <p className="text-gray-800 text-justify leading-relaxed" style={{ fontSize: `${Math.round(11.5 * fontSizeScale)}px` }}>{data.summary}</p>
              </div>
            )
          }
          if (key === 'experience' && data.experience.length > 0) {
            return (
              <div key="experience" className="mb-3">
                <div className="font-bold uppercase tracking-wider text-black border-b pb-0.5 mb-1.5"
                     style={{ borderColor: accent, fontSize: `${Math.round(13.5 * fontSizeScale)}px` }}>
                  Work Experience
                </div>
                <div className="space-y-2.5">
                  {data.experience.map(exp => (
                    <div key={exp.id}>
                      <div className="flex justify-between items-baseline" style={{ fontSize: `${Math.round(12.5 * fontSizeScale)}px` }}>
                        <span className="font-bold text-black">{exp.role} <span className="font-normal text-gray-700">| {exp.company}</span></span>
                        <span className="text-gray-600" style={{ fontSize: `${Math.round(11 * fontSizeScale)}px` }}>{exp.period}</span>
                      </div>
                      <div className="text-gray-600 italic" style={{ fontSize: `${Math.round(11 * fontSizeScale)}px` }}>{exp.location}</div>
                      <ul className="list-disc pl-4 space-y-0.5 text-gray-900 leading-normal mt-0.5" style={{ fontSize: `${Math.round(11.5 * fontSizeScale)}px` }}>
                        {exp.bullets.map((b, i) => <li key={i}>{b}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )
          }
          if (key === 'education' && data.education.length > 0) {
            return (
              <div key="education" className="mb-3">
                <div className="font-bold uppercase tracking-wider text-black border-b pb-0.5 mb-1.5"
                     style={{ borderColor: accent, fontSize: `${Math.round(13.5 * fontSizeScale)}px` }}>
                  Education
                </div>
                <div className="space-y-1.5">
                  {data.education.map(edu => (
                    <div key={edu.id}>
                      <div className="flex justify-between items-baseline" style={{ fontSize: `${Math.round(12.5 * fontSizeScale)}px` }}>
                        <span className="font-bold text-black">{edu.school}</span>
                        <span className="text-gray-600" style={{ fontSize: `${Math.round(11 * fontSizeScale)}px` }}>{edu.period}</span>
                      </div>
                      <div className="flex justify-between items-baseline text-gray-800" style={{ fontSize: `${Math.round(11.5 * fontSizeScale)}px` }}>
                        <span>{edu.degree}</span>
                        {edu.gpa && <span className="font-semibold text-black">{edu.gpa}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          }
          if (key === 'skills' && data.skills.length > 0) {
            return (
              <div key="skills" className="mb-3">
                <div className="font-bold uppercase tracking-wider text-black border-b pb-0.5 mb-1.5"
                     style={{ borderColor: accent, fontSize: `${Math.round(13.5 * fontSizeScale)}px` }}>
                  Technical Skills
                </div>
                <div className="text-gray-800 leading-relaxed" style={{ fontSize: `${Math.round(11.5 * fontSizeScale)}px` }}>
                  <span className="font-bold text-black">Skills: </span>{data.skills.join(' • ')}
                </div>
              </div>
            )
          }
          if (key === 'projects' && data.projects.length > 0) {
            return (
              <div key="projects" className="mb-3">
                <div className="font-bold uppercase tracking-wider text-black border-b pb-0.5 mb-1.5"
                     style={{ borderColor: accent, fontSize: `${Math.round(13.5 * fontSizeScale)}px` }}>
                  Key Projects
                </div>
                <div className="space-y-2">
                  {data.projects.map(p => (
                    <div key={p.id}>
                      <div className="font-bold text-black flex items-baseline flex-wrap gap-x-2" style={{ fontSize: `${Math.round(12.5 * fontSizeScale)}px` }}>
                        <span>{p.name}</span>
                        {p.link && (
                          <a
                            href={formatUrl(p.link)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-normal text-purple-700 hover:text-purple-900 hover:underline text-[10.5px] inline-flex items-center gap-0.5 cursor-pointer"
                            title={`Open project: ${p.link}`}
                          >
                            <span>| {cleanUrlDisplay(p.link)}</span>
                            <span className="text-[9px]">↗</span>
                          </a>
                        )}
                      </div>
                      <div className="text-gray-800 leading-normal pl-2.5 border-l-2 border-gray-300 ml-0.5 mt-0.5" style={{ fontSize: `${Math.round(11.5 * fontSizeScale)}px` }}>
                        {p.desc}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          }
          if (key === 'certifications' && data.certifications.length > 0) {
            return (
              <div key="certifications">
                <div className="font-bold uppercase tracking-wider text-black border-b pb-0.5 mb-1.5"
                     style={{ borderColor: accent, fontSize: `${Math.round(13.5 * fontSizeScale)}px` }}>
                  Certifications & Honors
                </div>
                <ul className="list-disc pl-4 text-gray-900 space-y-0.5 leading-normal" style={{ fontSize: `${Math.round(11.5 * fontSizeScale)}px` }}>
                  {data.certifications.map(c => (
                    <li key={c.id}>
                      <span className="font-bold text-black">{c.name}</span>
                      {c.issuer ? ` — ${c.issuer}` : ''} {c.year ? `(${c.year})` : ''}
                      {c.link && (
                        <a
                          href={formatUrl(c.link)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-[10.5px] text-purple-700 hover:text-purple-900 hover:underline font-normal inline-flex items-center gap-0.5 cursor-pointer"
                          title={`Verify credential: ${c.name}`}
                        >
                          <span>[Verify Credential ↗]</span>
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )
          }
          return null
        })}
      </div>
    )
  }

  /* ── 2. TWO-COLUMN TECH WITH PHOTO ─────────────────────────── */
  if (template === "Two-Column Tech with Photo") {
    return (
      <div id="printable-resume" className="bg-white text-gray-900 shadow-2xl" style={{ ...A4_RESUME_STYLE, ...s }}>
        {/* Top Header */}
        <div className="border-b-2 pb-2.5 mb-3.5 flex items-center justify-between" style={{ borderColor: accent }}>
          <div>
            <h1 className="font-bold tracking-tight text-black" style={{ fontSize: `${Math.round(26 * fontSizeScale)}px` }}>
              {data.personal.name || 'YOUR NAME'}
            </h1>
            <div className="font-semibold text-gray-700 mt-0.5" style={{ fontSize: `${Math.round(13.5 * fontSizeScale)}px` }}>
              {data.personal.title}
            </div>
          </div>
          {hasPhoto && (
            <img src={data.personal.photo} alt={data.personal.name}
                 className="w-16 h-16 rounded-xl object-cover border shadow-sm" style={{ borderColor: accent }} />
          )}
        </div>

        {/* 2-Column Body */}
        <div className="flex gap-5">
          {/* Left Column (32%) */}
          <div className="w-[32%] border-r border-gray-300 pr-3.5 flex flex-col gap-3.5">
            <div>
              <div className="font-bold uppercase tracking-wider text-black border-b pb-0.5 mb-1.5"
                   style={{ borderColor: accent, fontSize: `${Math.round(12.5 * fontSizeScale)}px` }}>
                Contact & Links
              </div>
              <div className="text-gray-800 space-y-1.5 break-words leading-normal" style={{ fontSize: `${Math.round(11 * fontSizeScale)}px` }}>
                {data.personal.phone && (
                  <div>
                    <a href={`tel:${data.personal.phone.replace(/[^0-9+]/g, '')}`} className="text-gray-800 hover:text-purple-700 hover:underline cursor-pointer block truncate" title="Call">
                      📞 {data.personal.phone}
                    </a>
                  </div>
                )}
                {data.personal.email && (
                  <div>
                    <a href={`mailto:${data.personal.email.trim()}`} className="text-gray-800 hover:text-purple-700 hover:underline cursor-pointer block truncate" title="Email">
                      ✉️ {data.personal.email}
                    </a>
                  </div>
                )}
                {data.personal.location && <div className="truncate">📍 {data.personal.location}</div>}
                {data.personal.linkedin && (
                  <div>
                    <a href={formatUrl(data.personal.linkedin)} target="_blank" rel="noopener noreferrer" className="text-purple-700 hover:text-purple-900 hover:underline cursor-pointer block truncate" title="LinkedIn">
                      💼 {cleanUrlDisplay(data.personal.linkedin)} ↗
                    </a>
                  </div>
                )}
                {data.personal.website && (
                  <div>
                    <a href={formatUrl(data.personal.website)} target="_blank" rel="noopener noreferrer" className="text-purple-700 hover:text-purple-900 hover:underline cursor-pointer block truncate" title="Portfolio / GitHub">
                      🌐 {cleanUrlDisplay(data.personal.website)} ↗
                    </a>
                  </div>
                )}
              </div>
            </div>

            {data.education.length > 0 && (
              <div>
                <div className="font-bold uppercase tracking-wider text-black border-b pb-0.5 mb-1.5"
                     style={{ borderColor: accent, fontSize: `${Math.round(12.5 * fontSizeScale)}px` }}>
                  Education
                </div>
                <div className="space-y-2">
                  {data.education.map(edu => (
                    <div key={edu.id} style={{ fontSize: `${Math.round(11 * fontSizeScale)}px` }}>
                      <div className="font-bold text-black">{edu.school}</div>
                      <div className="text-gray-800 italic">{edu.degree}</div>
                      <div className="text-gray-600">{edu.period}</div>
                      {edu.gpa && <div className="font-semibold text-black mt-0.5">Score: {edu.gpa}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.skills.length > 0 && (
              <div>
                <div className="font-bold uppercase tracking-wider text-black border-b pb-0.5 mb-1.5"
                     style={{ borderColor: accent, fontSize: `${Math.round(12.5 * fontSizeScale)}px` }}>
                  Technical Stack
                </div>
                <div className="text-gray-800 space-y-1 leading-normal" style={{ fontSize: `${Math.round(11 * fontSizeScale)}px` }}>
                  <div><span className="font-bold text-black block">Core:</span>{data.skills.slice(0, 5).join(', ')}</div>
                  <div><span className="font-bold text-black block">Tools & Libs:</span>{data.skills.slice(5).join(', ')}</div>
                </div>
              </div>
            )}

            {data.certifications.length > 0 && (
              <div>
                <div className="font-bold uppercase tracking-wider text-black border-b pb-0.5 mb-1.5"
                     style={{ borderColor: accent, fontSize: `${Math.round(12.5 * fontSizeScale)}px` }}>
                  Certifications
                </div>
                <div className="space-y-1.5 text-gray-800" style={{ fontSize: `${Math.round(10.5 * fontSizeScale)}px` }}>
                  {data.certifications.map(c => (
                    <div key={c.id}>
                      <div className="font-semibold text-black leading-tight">{c.name}</div>
                      <div className="text-gray-600 text-[10px]">{c.issuer} {c.year ? `(${c.year})` : ''}</div>
                      {c.link && (
                        <a href={formatUrl(c.link)} target="_blank" rel="noopener noreferrer" className="text-[10px] text-purple-700 hover:underline block truncate mt-0.5 font-medium">
                          Verify Credential ↗
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column (68%) */}
          <div className="w-[68%] flex flex-col gap-3.5">
            {data.summary && (
              <div>
                <div className="font-bold uppercase tracking-wider text-black border-b pb-0.5 mb-1.5"
                     style={{ borderColor: accent, fontSize: `${Math.round(13.5 * fontSizeScale)}px` }}>
                  Profile Summary
                </div>
                <p className="text-gray-800 text-justify leading-relaxed" style={{ fontSize: `${Math.round(11.5 * fontSizeScale)}px` }}>{data.summary}</p>
              </div>
            )}

            {data.experience.length > 0 && (
              <div>
                <div className="font-bold uppercase tracking-wider text-black border-b pb-0.5 mb-1.5"
                     style={{ borderColor: accent, fontSize: `${Math.round(13.5 * fontSizeScale)}px` }}>
                  Work Experience
                </div>
                <div className="space-y-2.5">
                  {data.experience.map(exp => (
                    <div key={exp.id}>
                      <div className="flex justify-between items-baseline" style={{ fontSize: `${Math.round(12.5 * fontSizeScale)}px` }}>
                        <span className="font-bold text-black">{exp.role}</span>
                        <span className="text-gray-600" style={{ fontSize: `${Math.round(11 * fontSizeScale)}px` }}>{exp.period}</span>
                      </div>
                      <div className="text-gray-700 italic" style={{ fontSize: `${Math.round(11 * fontSizeScale)}px` }}>{exp.company} {exp.location ? `| ${exp.location}` : ''}</div>
                      <ul className="list-disc pl-4 space-y-0.5 text-gray-900 leading-normal mt-0.5" style={{ fontSize: `${Math.round(11.5 * fontSizeScale)}px` }}>
                        {exp.bullets.map((b, i) => <li key={i}>{b}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.projects.length > 0 && (
              <div>
                <div className="font-bold uppercase tracking-wider text-black border-b pb-0.5 mb-1.5"
                     style={{ borderColor: accent, fontSize: `${Math.round(13.5 * fontSizeScale)}px` }}>
                  Key Projects
                </div>
                <div className="space-y-2">
                  {data.projects.map(p => (
                    <div key={p.id}>
                      <div className="font-bold text-black flex items-baseline flex-wrap gap-x-1.5" style={{ fontSize: `${Math.round(12.5 * fontSizeScale)}px` }}>
                        <span>{p.name}</span>
                        {p.link && (
                          <a
                            href={formatUrl(p.link)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-normal text-purple-700 hover:text-purple-900 hover:underline text-[10px] inline-flex items-center gap-0.5 cursor-pointer"
                            title={`Open project: ${p.link}`}
                          >
                            <span>| {cleanUrlDisplay(p.link)}</span>
                            <span>↗</span>
                          </a>
                        )}
                      </div>
                      <div className="text-gray-800 leading-normal pl-2 border-l-2 border-gray-300 ml-0.5 mt-0.5" style={{ fontSize: `${Math.round(11.5 * fontSizeScale)}px` }}>
                        {p.desc}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  /* ── 3. IIT / NIT PLACEMENT STANDARD ───────────────────────── */
  if (template === "IIT / NIT Placement Standard") {
    return (
      <div id="printable-resume" className="bg-white text-gray-900 shadow-2xl" style={{ ...A4_RESUME_STYLE, ...s }}>
        {/* Header */}
        <div className="border-b-2 pb-2.5 mb-3 flex justify-between items-start" style={{ borderColor: accent }}>
          <div className="flex items-center gap-3.5">
            {hasPhoto && (
              <img src={data.personal.photo} alt={data.personal.name}
                   className="w-16 h-16 rounded object-cover border shadow-sm" style={{ borderColor: accent }} />
            )}
            <div>
              <h1 className="font-bold uppercase tracking-wider text-black" style={{ fontSize: `${Math.round(24 * fontSizeScale)}px` }}>
                {data.personal.name || 'YOUR NAME'}
              </h1>
              <div className="font-semibold text-gray-800 mt-0.5" style={{ fontSize: `${Math.round(13.5 * fontSizeScale)}px` }}>
                {data.personal.title}
              </div>
            </div>
          </div>
          {/* Clickable Header Contacts */}
          <div className="text-right text-gray-800 leading-normal space-y-0.5" style={{ fontSize: `${Math.round(11 * fontSizeScale)}px` }}>
            {data.personal.email && (
              <div>
                <a href={`mailto:${data.personal.email.trim()}`} className="text-gray-800 hover:text-blue-700 hover:underline cursor-pointer" title="Email">
                  {data.personal.email}
                </a>
              </div>
            )}
            {data.personal.phone && (
              <div>
                <a href={`tel:${data.personal.phone.replace(/[^0-9+]/g, '')}`} className="text-gray-800 hover:text-blue-700 hover:underline cursor-pointer" title="Call">
                  {data.personal.phone}
                </a>
              </div>
            )}
            {data.personal.location && <div>{data.personal.location}</div>}
            {data.personal.linkedin && (
              <div>
                <a href={formatUrl(data.personal.linkedin)} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:text-blue-900 hover:underline cursor-pointer" title="LinkedIn Profile">
                  {cleanUrlDisplay(data.personal.linkedin)} ↗
                </a>
              </div>
            )}
            {data.personal.website && (
              <div>
                <a href={formatUrl(data.personal.website)} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:text-blue-900 hover:underline cursor-pointer" title="GitHub / Portfolio">
                  {cleanUrlDisplay(data.personal.website)} ↗
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Section Ordering */}
        {sectionOrder.map(key => {
          if (key === 'education' && data.education.length > 0) {
            return (
              <div key="education" className="mb-3">
                <div className="font-bold uppercase tracking-wider text-black bg-gray-100 border border-gray-400 px-2.5 py-0.5 mb-1.5" style={{ fontSize: `${Math.round(12.5 * fontSizeScale)}px` }}>
                  Academic Qualifications
                </div>
                <table className="w-full border-collapse border border-gray-400" style={{ fontSize: `${Math.round(11 * fontSizeScale)}px` }}>
                  <thead>
                    <tr className="bg-gray-100 font-bold text-black">
                      <th className="border border-gray-400 px-2.5 py-1 text-left">Program / Degree</th>
                      <th className="border border-gray-400 px-2.5 py-1 text-left">Institution / Board</th>
                      <th className="border border-gray-400 px-2.5 py-1 text-center">CGPA / %</th>
                      <th className="border border-gray-400 px-2.5 py-1 text-center">Year</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.education.map(edu => (
                      <tr key={edu.id}>
                        <td className="border border-gray-400 px-2.5 py-1 font-semibold text-black">{edu.degree}</td>
                        <td className="border border-gray-400 px-2.5 py-1 text-gray-800">{edu.school}</td>
                        <td className="border border-gray-400 px-2.5 py-1 text-center font-bold text-black">{edu.gpa || '—'}</td>
                        <td className="border border-gray-400 px-2.5 py-1 text-center text-gray-700">{edu.period}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
          if (key === 'experience' && data.experience.length > 0) {
            return (
              <div key="experience" className="mb-3">
                <div className="font-bold uppercase tracking-wider text-black bg-gray-100 border border-gray-400 px-2.5 py-0.5 mb-1.5" style={{ fontSize: `${Math.round(12.5 * fontSizeScale)}px` }}>
                  Work Experience & Internships
                </div>
                <div className="space-y-2.5">
                  {data.experience.map(exp => (
                    <div key={exp.id}>
                      <div className="flex justify-between items-baseline" style={{ fontSize: `${Math.round(12 * fontSizeScale)}px` }}>
                        <div>
                          <span className="font-bold text-black">{exp.role}</span>
                          <span className="text-gray-800 font-medium"> | {exp.company}</span>
                        </div>
                        <span className="text-gray-700 text-[11px]">{exp.period}{exp.location ? ` | ${exp.location}` : ''}</span>
                      </div>
                      <ul className="list-disc pl-4 mt-0.5 space-y-0.5 text-gray-900 leading-normal" style={{ fontSize: `${Math.round(11.5 * fontSizeScale)}px` }}>
                        {exp.bullets.map((b, i) => <li key={i}>{b}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )
          }
          if (key === 'summary' && data.summary) {
            return (
              <div key="summary" className="mb-3">
                <div className="font-bold uppercase tracking-wider text-black bg-gray-100 border border-gray-400 px-2.5 py-0.5 mb-1" style={{ fontSize: `${Math.round(12.5 * fontSizeScale)}px` }}>
                  Executive Summary
                </div>
                <p className="text-gray-800 text-justify leading-relaxed" style={{ fontSize: `${Math.round(11.5 * fontSizeScale)}px` }}>{data.summary}</p>
              </div>
            )
          }
          if (key === 'projects' && data.projects.length > 0) {
            return (
              <div key="projects" className="mb-3">
                <div className="font-bold uppercase tracking-wider text-black bg-gray-100 border border-gray-400 px-2.5 py-0.5 mb-1.5" style={{ fontSize: `${Math.round(12.5 * fontSizeScale)}px` }}>
                  Projects
                </div>
                <div className="space-y-2">
                  {data.projects.map(p => (
                    <div key={p.id}>
                      <div className="font-bold text-black flex justify-between items-baseline" style={{ fontSize: `${Math.round(12 * fontSizeScale)}px` }}>
                        <span>{p.name}</span>
                        {p.link && (
                          <a
                            href={formatUrl(p.link)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-normal text-blue-700 hover:underline text-[10.5px] cursor-pointer"
                            title={`Open project: ${p.link}`}
                          >
                            {cleanUrlDisplay(p.link)} ↗
                          </a>
                        )}
                      </div>
                      <div className="text-gray-800 leading-normal mt-0.5" style={{ fontSize: `${Math.round(11.5 * fontSizeScale)}px` }}>
                        {p.desc}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          }
          if (key === 'skills' && data.skills.length > 0) {
            return (
              <div key="skills" className="mb-3">
                <div className="font-bold uppercase tracking-wider text-black bg-gray-100 border border-gray-400 px-2.5 py-0.5 mb-1" style={{ fontSize: `${Math.round(12.5 * fontSizeScale)}px` }}>
                  Technical Skills
                </div>
                <div className="text-gray-800 leading-relaxed" style={{ fontSize: `${Math.round(11.5 * fontSizeScale)}px` }}>
                  {data.skills.join(' • ')}
                </div>
              </div>
            )
          }
          if (key === 'certifications' && data.certifications.length > 0) {
            return (
              <div key="certifications">
                <div className="font-bold uppercase tracking-wider text-black bg-gray-100 border border-gray-400 px-2.5 py-0.5 mb-1" style={{ fontSize: `${Math.round(12.5 * fontSizeScale)}px` }}>
                  Achievements & Extracurricular
                </div>
                <ul className="list-disc pl-4 text-gray-900 space-y-0.5 leading-normal" style={{ fontSize: `${Math.round(11.5 * fontSizeScale)}px` }}>
                  {data.certifications.map(c => (
                    <li key={c.id}>
                      <span className="font-semibold text-black">{c.name}</span>
                      {c.issuer ? ` (${c.issuer})` : ''} {c.year ? `[${c.year}]` : ''}
                      {c.link && (
                        <a
                          href={formatUrl(c.link)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-[10.5px] text-blue-700 hover:underline font-normal cursor-pointer"
                          title={`Verify credential: ${c.name}`}
                        >
                          [Link ↗]
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )
          }
          return null
        })}
      </div>
    )
  }

  /* ── 4. (STANDARD ATS DEFAULT & REORDERABLE SINGLE-COLUMN) ──── */
  return (
    <div id="printable-resume" className="bg-white text-gray-900 shadow-2xl" style={{ ...A4_RESUME_STYLE, ...s }}>
      {/* Centered Name & Contact */}
      <div className="text-center pb-2.5 mb-3">
        {hasPhoto && (
          <div className="flex justify-center mb-2">
            <img src={data.personal.photo} alt={data.personal.name}
                 className="w-16 h-16 rounded-full object-cover border shadow-sm" style={{ borderColor: accent }} />
          </div>
        )}
        <h1 className="font-bold uppercase tracking-wider text-black mb-1"
            style={{ fontSize: `${Math.round(26 * fontSizeScale)}px`, letterSpacing: '0.8px' }}>
          {data.personal.name || 'YOUR NAME'}
        </h1>
        {/* Clickable Centered Contacts */}
        <div className="text-gray-800 flex justify-center flex-wrap items-center gap-x-2.5 leading-normal"
             style={{ fontSize: `${Math.round(11 * fontSizeScale)}px` }}>
          {contactItems.map((c, i) => (
            <span key={i} className="inline-flex items-center">
              {c.isLink ? (
                <a
                  href={c.href}
                  target={c.target || '_self'}
                  rel={c.target ? 'noopener noreferrer' : undefined}
                  className="text-gray-800 hover:text-blue-700 hover:underline transition-colors cursor-pointer"
                  title={`Open ${c.type}: ${c.label}`}
                >
                  {c.label}
                </a>
              ) : (
                <span>{c.label}</span>
              )}
              {i < contactItems.length - 1 && <span className="ml-2.5 text-gray-400 select-none">|</span>}
            </span>
          ))}
        </div>
      </div>

      {/* Dynamic Section Ordering */}
      {sectionOrder.map(key => {
        if (key === 'summary' && data.summary) {
          return (
            <div key="summary" className="mb-3">
              <div className="font-bold uppercase tracking-wider text-black border-b pb-0.5 mb-1.5"
                   style={{ borderColor: accent, fontSize: `${Math.round(13.5 * fontSizeScale)}px` }}>
                Summary
              </div>
              <p className="leading-relaxed text-gray-850 text-justify"
                 style={{ fontSize: `${Math.round(11.5 * fontSizeScale)}px` }}>
                {data.summary}
              </p>
            </div>
          )
        }

        if (key === 'education' && data.education.length > 0) {
          return (
            <div key="education" className="mb-3">
              <div className="font-bold uppercase tracking-wider text-black border-b pb-0.5 mb-1.5"
                   style={{ borderColor: accent, fontSize: `${Math.round(13.5 * fontSizeScale)}px` }}>
                Education
              </div>
              <div className="space-y-1.5">
                {data.education.map(edu => (
                  <div key={edu.id}>
                    <div className="flex justify-between items-baseline" style={{ fontSize: `${Math.round(12.5 * fontSizeScale)}px` }}>
                      <span className="font-bold text-black">{edu.school}</span>
                      <span className="text-gray-700" style={{ fontSize: `${Math.round(11 * fontSizeScale)}px` }}>{edu.period}</span>
                    </div>
                    <div className="flex justify-between items-baseline italic text-gray-800" style={{ fontSize: `${Math.round(11.5 * fontSizeScale)}px` }}>
                      <span>{edu.degree}</span>
                      {edu.gpa && <span className="font-semibold text-black not-italic">{edu.gpa}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        }

        if (key === 'experience' && data.experience.length > 0) {
          return (
            <div key="experience" className="mb-3">
              <div className="font-bold uppercase tracking-wider text-black border-b pb-0.5 mb-1.5"
                   style={{ borderColor: accent, fontSize: `${Math.round(13.5 * fontSizeScale)}px` }}>
                Experience
              </div>
              <div className="space-y-2.5">
                {data.experience.map(exp => (
                  <div key={exp.id}>
                    <div className="flex justify-between items-baseline" style={{ fontSize: `${Math.round(12.5 * fontSizeScale)}px` }}>
                      <div className="font-bold text-black">{exp.role}</div>
                      <div className="text-gray-700" style={{ fontSize: `${Math.round(11 * fontSizeScale)}px` }}>{exp.period}</div>
                    </div>
                    <div className="flex justify-between items-baseline italic text-gray-850 mb-0.5" style={{ fontSize: `${Math.round(11.5 * fontSizeScale)}px` }}>
                      <div>{exp.company}</div>
                      <div>{exp.location}</div>
                    </div>
                    <ul className="list-disc pl-4 space-y-0.5 text-gray-900 leading-normal" style={{ fontSize: `${Math.round(11.5 * fontSizeScale)}px` }}>
                      {exp.bullets.map((b, i) => <li key={i}>{b}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )
        }

        if (key === 'skills' && data.skills.length > 0) {
          return (
            <div key="skills" className="mb-3">
              <div className="font-bold uppercase tracking-wider text-black border-b pb-0.5 mb-1.5"
                   style={{ borderColor: accent, fontSize: `${Math.round(13.5 * fontSizeScale)}px` }}>
                Technical Skills
              </div>
              <div className="text-gray-850 leading-relaxed" style={{ fontSize: `${Math.round(11.5 * fontSizeScale)}px` }}>
                <span className="font-bold text-black">Core & Tools: </span>
                {data.skills.join(' • ')}
              </div>
            </div>
          )
        }

        if (key === 'projects' && data.projects.length > 0) {
          return (
            <div key="projects" className="mb-3">
              <div className="font-bold uppercase tracking-wider text-black border-b pb-0.5 mb-1.5"
                   style={{ borderColor: accent, fontSize: `${Math.round(13.5 * fontSizeScale)}px` }}>
                Projects
              </div>
              <div className="space-y-2">
                {data.projects.map(p => (
                  <div key={p.id}>
                    <div className="flex justify-between items-baseline font-bold text-black"
                         style={{ fontSize: `${Math.round(12.5 * fontSizeScale)}px` }}>
                      <span>{p.name}</span>
                      {p.link && (
                        <a
                          href={formatUrl(p.link)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-normal text-blue-700 hover:text-blue-900 hover:underline text-[10.5px] cursor-pointer"
                          title={`Open project: ${p.link}`}
                        >
                          {cleanUrlDisplay(p.link)} ↗
                        </a>
                      )}
                    </div>
                    <p className="text-gray-850 leading-normal pl-2 border-l-2 border-gray-400 mt-0.5"
                       style={{ fontSize: `${Math.round(11.5 * fontSizeScale)}px` }}>
                      {p.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )
        }

        if (key === 'certifications' && data.certifications.length > 0) {
          return (
            <div key="certifications">
              <div className="font-bold uppercase tracking-wider text-black border-b pb-0.5 mb-1.5"
                   style={{ borderColor: accent, fontSize: `${Math.round(13.5 * fontSizeScale)}px` }}>
                Achievements & Certifications
              </div>
              <ul className="list-disc pl-4 text-gray-900 space-y-0.5 leading-normal" style={{ fontSize: `${Math.round(11.5 * fontSizeScale)}px` }}>
                {data.certifications.map(c => (
                  <li key={c.id}>
                    <span className="font-bold text-black">{c.name}</span>
                    {c.issuer ? ` — ${c.issuer}` : ''} {c.year ? `(${c.year})` : ''}
                    {c.link && (
                      <a
                        href={formatUrl(c.link)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 text-[10.5px] text-blue-700 hover:text-blue-900 hover:underline font-normal not-italic cursor-pointer"
                        title={`Verify credential: ${c.name}`}
                      >
                        [Verify ↗]
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )
        }

        return null
      })}
    </div>
  )
}

/* ── Main Builder Component ─────────────────────────────────── */
export default function Builder() {
  const [searchParams] = useSearchParams()
  const templateFromUrl = searchParams.get('template')
  const resumeIdFromUrl = searchParams.get('id')

  const { theme, toggleTheme, isDark } = useTheme()
  const isLight = theme === 'light'

  const { user, profile, getUserDefaults, updateProfile } = useAuth()
  const [data, setData] = useState(defaultData)
  const [accent, setAccent] = useState('#000000')
  const [font, setFont] = useState('Times New Roman')
  const [template, setTemplate] = useState(templateFromUrl && TEMPLATES.includes(templateFromUrl) ? templateFromUrl : TEMPLATES[0])
  const [skillInput, setSkillInput] = useState('')
  const [viewMode, setViewMode] = useState('split') // 'edit' | 'split' | 'preview'
  const [zoom, setZoom] = useState(75) // 50% to 125%
  const [fontSizeScale, setFontSizeScale] = useState(1.0) // 0.8 to 1.25
  const [sectionOrder, setSectionOrder] = useState(DEFAULT_SECTION_ORDER)
  
  // Resume Save & Load State
  const [currentResumeId, setCurrentResumeId] = useState(resumeIdFromUrl || null)
  const [resumeTitle, setResumeTitle] = useState('My Resume')
  const [isSavingResume, setIsSavingResume] = useState(false)
  const [saveResumeSuccess, setSaveResumeSuccess] = useState(false)
  
  // AI State & Custom Key Configuration
  const [isEnhancingSummary, setIsEnhancingSummary] = useState(false)
  const [enhancingExpId, setEnhancingExpId] = useState(null)
  const [isAiConfigOpen, setIsAiConfigOpen] = useState(false)
  const [aiApiKeyInput, setAiApiKeyInput] = useState(getStoredGeminiKey() || '')
  const [aiKeySavedFeedback, setAiKeySavedFeedback] = useState(false)

  // PDF Export State
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)

  // Photo Adjustment & Account Saving State
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false)
  const [tempPhoto, setTempPhoto] = useState('')
  const [cropZoom, setCropZoom] = useState(1.0)
  const [cropX, setCropX] = useState(0)
  const [cropY, setCropY] = useState(0)
  const [cropShape, setCropShape] = useState('circle') // 'circle' | 'square'
  const [photoBrightness, setPhotoBrightness] = useState(100) // 50-150
  const [photoContrast, setPhotoContrast] = useState(100) // 50-150
  const [photoRotation, setPhotoRotation] = useState(0) // 0, 90, 180, 270
  const [photoSavedToast, setPhotoSavedToast] = useState(false)

  const previewContainerRef = useRef(null)
  const fileInputRef = useRef(null)

  // Auto-populate logged in user defaults & saved photo into resume builder
  useEffect(() => {
    const defaults = getUserDefaults ? getUserDefaults() : {}
    const savedPhoto = defaults.photo || localStorage.getItem('resumeai_user_photo') || ''

    if (savedPhoto) {
      setData(prev => {
        if (!prev.personal.photo) {
          return {
            ...prev,
            personal: {
              ...prev.personal,
              photo: savedPhoto
            }
          }
        }
        return prev
      })
    }

    if (!user) return
    const userFullName = defaults.name || profile?.full_name || user?.user_metadata?.full_name || ''
    const userEmail = defaults.email || user?.email || ''

    setData(prev => {
      const isDefaultAuthor = prev.personal.name === 'Hritik Kumar' || prev.personal.name === 'Alex Johnson' || !prev.personal.name
      if (isDefaultAuthor && (userFullName || userEmail)) {
        return {
          ...prev,
          personal: {
            ...prev.personal,
            name: userFullName || (userEmail ? userEmail.split('@')[0] : prev.personal.name),
            email: userEmail || prev.personal.email,
            phone: defaults.phone || prev.personal.phone,
            title: defaults.title || prev.personal.title,
            location: defaults.location || prev.personal.location,
            linkedin: defaults.linkedin || prev.personal.linkedin,
            website: defaults.website || prev.personal.website,
            photo: prev.personal.photo || savedPhoto,
          },
          summary: defaults.summary || prev.summary,
          skills: (defaults.skills && typeof defaults.skills === 'string')
            ? defaults.skills.split(',').map(s => s.trim()).filter(Boolean)
            : prev.skills,
        }
      }
      return prev
    })
  }, [user, profile, getUserDefaults])

  // Handle URL query parameter template changes
  useEffect(() => {
    if (templateFromUrl && TEMPLATES.includes(templateFromUrl)) {
      setTemplate(templateFromUrl)
    }
  }, [templateFromUrl])

  // Handle loading resume from resumeStorage when ?id=... is present in URL
  useEffect(() => {
    if (!resumeIdFromUrl) return
    let isMounted = true
    const loadResume = async () => {
      try {
        const r = await resumeStorage.get(resumeIdFromUrl, user)
        if (!isMounted || !r) return
        if (r.title) setResumeTitle(r.title)
        if (r.template && TEMPLATES.includes(r.template)) setTemplate(r.template)
        if (r.accent_color) setAccent(r.accent_color)
        if (r.font && FONTS.includes(r.font)) setFont(r.font)
        if (r.data && typeof r.data === 'object' && Object.keys(r.data).length > 0) {
          setData(prev => ({
            ...prev,
            ...r.data,
            personal: {
              ...prev.personal,
              ...(r.data.personal || {})
            }
          }))
        }
        setCurrentResumeId(r.id)
      } catch (err) {
        console.error('Failed to load resume by ID:', err)
      }
    }
    loadResume()
    return () => { isMounted = false }
  }, [resumeIdFromUrl, user])

  // Save or update resume (stored persistently in user account storage + cloud sync)
  const handleSaveResume = async () => {
    setIsSavingResume(true)
    try {
      const currentScore = calcScore(data)
      const payload = {
        id: currentResumeId,
        title: resumeTitle || (data.personal?.name ? `${data.personal.name}'s Resume` : 'My Resume'),
        data,
        template,
        accent_color: accent,
        font,
        ats_score: currentScore
      }
      const saved = await resumeStorage.save(payload, user)
      if (saved?.id) {
        setCurrentResumeId(saved.id)
      }
      setSaveResumeSuccess(true)
      setTimeout(() => setSaveResumeSuccess(false), 3000)
    } catch (err) {
      console.error('Failed to save resume:', err)
      alert('Failed to save resume. Please try again.')
    } finally {
      setIsSavingResume(false)
    }
  }

  // Automatically adjust view mode on small screens (< 1024px)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024 && viewMode === 'split') {
        setViewMode('edit')
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [viewMode])

  const score = calcScore(data)
  const scoreColor = score >= 80 ? '#10B981' : score >= 60 ? '#F59E0B' : '#EF4444'

  const upd = (key, val) => setData(d => ({ ...d, [key]: val }))
  const updPersonal = (key, val) => setData(d => ({ ...d, personal: { ...d.personal, [key]: val } }))
  const updExp = (id, key, val) => setData(d => ({ ...d, experience: d.experience.map(e => e.id === id ? { ...e, [key]: val } : e) }))
  
  const addSkill = () => {
    const sk = skillInput.trim()
    if (sk && !data.skills.includes(sk)) {
      upd('skills', [...data.skills, sk])
      setSkillInput('')
    }
  }

  // Save photo in user account & localStorage
  const savePhotoToAccount = async (photoUrl) => {
    try {
      if (photoUrl) {
        localStorage.setItem('resumeai_user_photo', photoUrl)
      } else {
        localStorage.removeItem('resumeai_user_photo')
      }
      if (updateProfile) {
        await updateProfile({
          photo: photoUrl,
          avatar_url: photoUrl
        })
      }
      setPhotoSavedToast(true)
      setTimeout(() => setPhotoSavedToast(false), 2500)
    } catch (err) {
      console.warn('Could not save photo to account:', err)
    }
  }

  // Photo upload handler: loads file and directly opens adjustment modal
  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const raw = event.target.result
      setTempPhoto(raw)
      setCropZoom(1.0)
      setCropX(0)
      setCropY(0)
      setPhotoBrightness(100)
      setPhotoContrast(100)
      setPhotoRotation(0)
      setIsAdjustModalOpen(true)
    }
    reader.readAsDataURL(file)
  }

  // Open adjust modal for current photo
  const handleOpenAdjustModal = () => {
    if (!data.personal.photo) return
    setTempPhoto(data.personal.photo)
    setCropZoom(1.0)
    setCropX(0)
    setCropY(0)
    setPhotoBrightness(100)
    setPhotoContrast(100)
    setPhotoRotation(0)
    setIsAdjustModalOpen(true)
  }

  // Remove photo
  const removePhoto = () => {
    updPersonal('photo', '')
    savePhotoToAccount('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Bake adjusted photo onto canvas and save
  const handleApplyPhotoAdjustment = () => {
    if (!tempPhoto) return
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 400
      canvas.height = 400
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, 400, 400)

      const scale = Math.max(400 / img.width, 400 / img.height)
      const w = img.width * scale
      const h = img.height * scale

      // Apply brightness and contrast
      ctx.filter = `brightness(${photoBrightness}%) contrast(${photoContrast}%)`

      ctx.save()
      ctx.translate(200, 200)
      // Apply rotation
      ctx.rotate((photoRotation * Math.PI) / 180)
      ctx.scale(cropZoom, cropZoom)
      ctx.translate((cropX / 100) * 400, (cropY / 100) * 400)
      ctx.drawImage(img, -w / 2, -h / 2, w, h)
      ctx.restore()

      // Reset filter
      ctx.filter = 'none'

      const baked = canvas.toDataURL('image/jpeg', 0.90)
      updPersonal('photo', baked)
      savePhotoToAccount(baked)
      setIsAdjustModalOpen(false)
    }
    img.src = tempPhoto
  }

  // Move sections up/down
  const moveSection = (key, direction) => {
    const idx = sectionOrder.indexOf(key)
    if (idx === -1) return
    const targetIdx = idx + direction
    if (targetIdx < 0 || targetIdx >= sectionOrder.length) return
    const newOrder = [...sectionOrder]
    const temp = newOrder[idx]
    newOrder[idx] = newOrder[targetIdx]
    newOrder[targetIdx] = temp
    setSectionOrder(newOrder)
  }

  // AI Auto-Enhance Summary with Gemini
  const handleEnhanceSummary = async () => {
    setIsEnhancingSummary(true)
    try {
      const enhanced = await enhanceSummaryWithAI({
        summary: data.summary,
        role: data.personal.title,
        skills: data.skills
      })
      if (enhanced) upd('summary', enhanced)
    } finally {
      setIsEnhancingSummary(false)
    }
  }

  // AI Auto-Enhance Bullets with Gemini
  const handleEnhanceBullets = async (expId) => {
    const exp = data.experience.find(e => e.id === expId)
    if (!exp) return
    setEnhancingExpId(expId)
    try {
      const enhanced = await enhanceBulletsWithAI({
        bullets: exp.bullets,
        role: exp.role,
        company: exp.company
      })
      if (enhanced) updExp(expId, 'bullets', enhanced)
    } finally {
      setEnhancingExpId(null)
    }
  }

  /* ── Direct Vector PDF Export with 100% Selectable Text & Active Hyperlinks ── */
  const handlePrint = async () => {
    const resumeElem = document.getElementById('printable-resume')
    if (!resumeElem) {
      window.print()
      return
    }

    setIsGeneratingPdf(true)

    try {
      // Extract all compiled CSS from current page
      const extractedCSS = extractPageCSS()

      // Build Google Fonts URL
      const fontFamilies = [font, 'Inter', 'Roboto', 'Times New Roman'].filter(Boolean)
      const googleFonts = fontFamilies
        .filter(f => !['Times New Roman', 'Georgia', 'Arial', 'Helvetica', 'serif', 'sans-serif'].includes(f))
        .map(f => `family=${encodeURIComponent(f)}:wght@400;500;600;700`)
        .join('&')

      const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <title>${(data.personal.name || 'Resume') + ' - ATS Resume'}</title>
  <meta charset="utf-8" />
  ${googleFonts ? `<link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?${googleFonts}&display=swap" rel="stylesheet">` : ''}
  <style>
    ${extractedCSS}
  </style>
  <style>
    @page {
      size: A4 portrait;
      margin: 0;
    }
    *, *::before, *::after {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      box-sizing: border-box !important;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      font-family: "${font}", "Times New Roman", serif;
      width: 210mm !important;
      min-height: 297mm !important;
      overflow: visible !important;
    }
    .print-page {
      width: 210mm !important;
      min-height: 297mm !important;
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
    }
    #printable-resume {
      width: 210mm !important;
      min-height: 297mm !important;
      box-shadow: none !important;
      border: none !important;
      margin: 0 !important;
      background: #ffffff !important;
      transform: none !important;
      box-sizing: border-box !important;
    }
    a {
      color: inherit;
      text-decoration: none;
      cursor: pointer;
    }
    img { max-width: 100%; height: auto; }
    h1, h2, h3, h4 { page-break-after: avoid; }
    li, tr { page-break-inside: avoid; }
  </style>
</head>
<body>
  <div class="print-page">
    ${resumeElem.outerHTML}
  </div>
</body>
</html>`

      // 1. Try Direct Vector PDF via Backend Puppeteer (100% Selectable Text & Active Clickable Links)
      const endpoints = [
        '/api/pdf/render-html',
        'http://localhost:4000/api/pdf/render-html',
      ]
      if (import.meta.env.VITE_API_URL) {
        endpoints.unshift(`${import.meta.env.VITE_API_URL}/api/pdf/render-html`)
      }

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              html: fullHtml,
              name: resumeTitle || data.personal.name || 'Resume'
            })
          })

          const contentType = response.headers.get('content-type') || ''
          if (response.ok && (contentType.includes('application/pdf') || response.status === 200)) {
            const blob = await response.blob()
            if (blob.size > 2000) {
              const url = window.URL.createObjectURL(blob)
              const a = document.createElement('a')
              const safeName = (resumeTitle || data.personal.name || 'Resume').replace(/[^a-zA-Z0-9_-]/g, '_')
              a.href = url
              a.download = `${safeName}.pdf`
              document.body.appendChild(a)
              a.click()
              document.body.removeChild(a)
              window.URL.revokeObjectURL(url)
              setIsGeneratingPdf(false)
              return
            }
          }
        } catch (apiErr) {
          console.warn(`Backend vector PDF download error via ${endpoint}, trying fallback:`, apiErr?.message)
        }
      }

      // 2. Fallback: In-Viewport Vector Browser Print
      // Inset at (0, 0) inside viewport so Chromium preserves vector fonts and PDF /Link annotations
      let iframe = document.getElementById('print-resume-iframe')
      if (!iframe) {
        iframe = document.createElement('iframe')
        iframe.id = 'print-resume-iframe'
        iframe.style.position = 'fixed'
        iframe.style.left = '0'
        iframe.style.top = '0'
        iframe.style.width = '210mm'
        iframe.style.height = '297mm'
        iframe.style.border = '0'
        iframe.style.opacity = '0.001'
        iframe.style.pointerEvents = 'none'
        iframe.style.zIndex = '-9999'
        document.body.appendChild(iframe)
      }

      const doc = iframe.contentWindow.document
      doc.open()
      doc.write(fullHtml)
      doc.close()

      const triggerPrint = () => {
        setIsGeneratingPdf(false)
        iframe.contentWindow.focus()
        iframe.contentWindow.print()
      }

      if (iframe.contentDocument?.fonts?.ready) {
        iframe.contentDocument.fonts.ready.then(() => {
          setTimeout(triggerPrint, 350)
        }).catch(() => setTimeout(triggerPrint, 800))
      } else {
        setTimeout(triggerPrint, 800)
      }
    } catch (err) {
      console.error('PDF generation error:', err)
      setIsGeneratingPdf(false)
      window.print()
    }
  }

  /**
   * Extract all CSS rules from current document stylesheets.
   * Vite compiles Tailwind to real CSS, so these rules contain
   * all the utility classes the resume uses.
   */
  function extractPageCSS() {
    let css = ''
    try {
      for (const sheet of document.styleSheets) {
        try {
          const rules = sheet.cssRules || sheet.rules
          if (!rules) continue
          for (const rule of rules) {
            css += rule.cssText + '\n'
          }
        } catch (e) {
          // Cross-origin stylesheet — skip (Google Fonts handles itself via <link>)
        }
      }
    } catch (e) {
      console.warn('Could not extract stylesheets:', e)
    }
    return css
  }

  // Auto-fit zoom to available preview width
  const handleFitZoom = () => {
    if (previewContainerRef.current) {
      const containerWidth = previewContainerRef.current.clientWidth - 48
      const calculatedZoom = Math.min(Math.max(Math.round((containerWidth / A4_WIDTH_PX) * 95), 45), 100)
      setZoom(calculatedZoom)
    }
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ paddingTop: 72, background: isLight ? '#f8fafc' : '#080920' }}>
      {/* ── Global Sub-Header Bar (Template Selector, Font Size, View Mode, Zoom, Theme, Download) ── */}
      <header className="px-4 py-2 border-b flex flex-wrap items-center justify-between gap-2.5 z-20 flex-shrink-0 transition-colors"
              style={{ background: isLight ? '#ffffff' : '#0c0e29', borderColor: isLight ? '#e2e8f0' : 'rgba(124,58,237,.2)' }}>
        
        {/* Left: Resume Title / Name & Template / Font Selector */}
        <div className="flex items-center gap-2 flex-nowrap">
          {/* Resume Name / Title input (e.g. Data Science Resume, AIML Resume) */}
          <div
            className={`flex items-center gap-1.5 border rounded-lg px-2.5 py-1 shadow-sm transition-all ${
              isLight
                ? 'bg-white border-purple-200 focus-within:border-purple-600 focus-within:ring-2 focus-within:ring-purple-500/20'
                : 'bg-[#141842] border-purple-500/30 focus-within:border-purple-400 focus-within:ring-2 focus-within:ring-purple-500/30'
            }`}
            title="Rename your resume (e.g., Data Science Resume, AIML Resume)"
          >
            <FileText size={13} className={`flex-shrink-0 ${isLight ? 'text-purple-600' : 'text-purple-400'}`} />
            <input
              type="text"
              value={resumeTitle}
              onChange={e => setResumeTitle(e.target.value)}
              placeholder="e.g. Data Science Resume"
              aria-label="Resume Name"
              className={`text-xs font-bold bg-transparent outline-none border-none py-0.5 w-[140px] sm:w-[170px] md:w-[195px] truncate ${
                isLight ? 'text-slate-900 placeholder:text-slate-400' : 'text-white placeholder:text-slate-500'
              }`}
            />
            <Edit2 size={11} className={`${isLight ? 'text-slate-400' : 'text-slate-500'} pointer-events-none opacity-60 flex-shrink-0`} />
          </div>

          {/* Template Dropdown with Icon */}
          <div className={`flex items-center gap-1.5 border rounded-lg shadow-sm transition-colors ${
            isLight ? 'bg-white border-slate-300' : 'bg-[#141842] border-purple-500/30'
          }`}>
            <LayoutTemplate size={13} className={`ml-2.5 flex-shrink-0 ${
              isLight ? 'text-slate-500' : 'text-purple-400'
            }`} />
            <select value={template} onChange={e => setTemplate(e.target.value)}
                    aria-label="Select Resume Template"
                    style={{
                      backgroundColor: 'transparent',
                      color: isLight ? '#0f172a' : '#f8fafc',
                    }}
                    className="text-xs py-1.5 pr-2.5 pl-0.5 font-semibold w-auto max-w-[260px] md:max-w-[300px] truncate cursor-pointer outline-none border-none focus:ring-0 appearance-none bg-transparent">
              {TEMPLATES.map(t => (
                <option key={t} value={t} style={{ backgroundColor: isLight ? '#ffffff' : '#141842', color: isLight ? '#0f172a' : '#f8fafc', fontWeight: 500 }}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Font Dropdown with Icon */}
          <div className={`flex items-center gap-1.5 border rounded-lg shadow-sm transition-colors ${
            isLight ? 'bg-white border-slate-300' : 'bg-[#141842] border-purple-500/30'
          }`}>
            <Type size={13} className={`ml-2.5 flex-shrink-0 ${
              isLight ? 'text-slate-500' : 'text-cyan-400'
            }`} />
            <select value={font} onChange={e => setFont(e.target.value)}
                    aria-label="Select Font"
                    style={{
                      backgroundColor: 'transparent',
                      color: isLight ? '#0f172a' : '#f8fafc',
                    }}
                    className="text-xs py-1.5 pr-2.5 pl-0.5 font-semibold w-auto min-w-[100px] cursor-pointer outline-none border-none focus:ring-0 appearance-none bg-transparent">
              {FONTS.map(f => (
                <option key={f} value={f} style={{ backgroundColor: isLight ? '#ffffff' : '#141842', color: isLight ? '#0f172a' : '#f8fafc', fontWeight: 500 }}>
                  {f}
                </option>
              ))}
            </select>
          </div>

          {/* Font Size Scaling Controls (A- / A+) */}
          <div className={`flex items-center gap-1 border rounded-lg px-2 py-1 transition-colors ${
            isLight ? 'bg-slate-100 border-slate-300' : 'bg-[#141740] border-purple-500/20'
          }`}
               title="Resume Font Size: Decrease (A-) or Increase (A+)">
            <button onClick={() => setFontSizeScale(s => Math.max(0.80, +(s - 0.05).toFixed(2)))}
                    title="Smaller Font (Fit to 1 Page)"
                    className={`text-xs font-bold px-1 transition-colors ${
                      isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-300 hover:text-white'
                    }`}>
              A-
            </button>
            <span className={`text-[11px] font-mono font-semibold px-1 ${
              isLight ? 'text-purple-700' : 'text-purple-300'
            }`}>
              {Math.round(fontSizeScale * 100)}%
            </span>
            <button onClick={() => setFontSizeScale(s => Math.min(1.25, +(s + 0.05).toFixed(2)))}
                    title="Larger Font (Fill Space)"
                    className={`text-xs font-bold px-1 transition-colors ${
                      isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-300 hover:text-white'
                    }`}>
              A+
            </button>
          </div>
        </div>

        {/* Center: View Switcher Tabs ([📝 Edit] [👁️ Split] [📄 Preview]) */}
        <div className={`flex items-center rounded-lg p-0.5 border transition-colors ${
          isLight ? 'bg-slate-100 border-slate-300' : 'bg-[#141740] border-purple-500/20'
        }`}>
          <button onClick={() => setViewMode('edit')}
                  className={`flex items-center gap-1 px-3 py-1 text-xs rounded-md font-medium transition-all ${
                    viewMode === 'edit'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'
                  }`}>
            <Edit3 size={12} />
            <span>Editor</span>
          </button>
          <button onClick={() => setViewMode('split')}
                  className={`hidden md:flex items-center gap-1 px-3 py-1 text-xs rounded-md font-medium transition-all ${
                    viewMode === 'split'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'
                  }`}>
            <Columns size={12} />
            <span>Split View</span>
          </button>
          <button onClick={() => setViewMode('preview')}
                  className={`flex items-center gap-1 px-3 py-1 text-xs rounded-md font-medium transition-all ${
                    viewMode === 'preview'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'
                  }`}>
            <Eye size={12} />
            <span>Preview</span>
          </button>
        </div>

        {/* Right: AI Active Badge, Theme toggle, Zoom controls & Print PDF Button */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle Button */}
          <button onClick={toggleTheme}
                  title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                  className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                    isLight
                      ? 'bg-slate-100 hover:bg-slate-200 text-amber-600 border border-slate-300'
                      : 'bg-[#141740] hover:bg-[#1e235e] text-amber-400 border border-purple-500/20 shadow-inner'
                  }`}>
            {isDark ? <Sun size={13} className="text-amber-400" /> : <Moon size={13} className="text-indigo-600" />}
            <span className="hidden sm:inline">{isDark ? 'Light' : 'Dark'}</span>
          </button>

          {/* AI Active Badge (Configurable) */}
          <div
            onClick={() => setIsAiConfigOpen(true)}
            title="AI Resume Intelligence Active (Click to configure API Key)"
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg font-medium text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 cursor-pointer shadow-sm hover:bg-emerald-500/25 transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <Sparkles size={12} className="text-emerald-400" />
            <span className="hidden sm:inline font-semibold">AI Active</span>
            <Settings2 size={11} className="text-emerald-400/70 hover:text-emerald-300 ml-0.5" />
          </div>

          {/* Zoom controls */}
          <div className={`flex items-center gap-1 border rounded-lg px-2 py-1 transition-colors ${
            isLight ? 'bg-slate-100 border-slate-300' : 'bg-[#141740] border-purple-500/20'
          }`}>
            <button onClick={() => setZoom(z => Math.max(50, z - 10))} title="Zoom Out"
                    className={`p-0.5 rounded transition-colors ${
                      isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
                    }`}>
              <ZoomOut size={13} />
            </button>
            <span className={`text-[11px] font-mono w-8 text-center ${
              isLight ? 'text-slate-800' : 'text-slate-300'
            }`}>{zoom}%</span>
            <button onClick={() => setZoom(z => Math.min(125, z + 10))} title="Zoom In"
                    className={`p-0.5 rounded transition-colors ${
                      isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
                    }`}>
              <ZoomIn size={13} />
            </button>
            <button onClick={handleFitZoom} title="Fit to screen"
                    className="ml-1 text-[10px] text-purple-700 dark:text-purple-300 hover:text-purple-900 dark:hover:text-purple-100 font-semibold px-1 rounded bg-purple-500/20">
              Fit
            </button>
          </div>

          {/* Save to Account button (Always accessible) */}
          <button
            onClick={handleSaveResume}
            disabled={isSavingResume}
            className={`flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              saveResumeSuccess
                ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/40'
                : isLight
                  ? 'bg-white hover:bg-slate-50 text-purple-700 border border-purple-200 shadow-sm'
                  : 'bg-[#141740] hover:bg-purple-600/20 text-purple-300 border border-purple-500/30'
            }`}
            title="Save resume to My Resumes & Dashboard"
          >
            {saveResumeSuccess ? (
              <>
                <Check size={13} className="text-emerald-400" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Save size={13} />
                <span>{isSavingResume ? 'Saving...' : 'Save'}</span>
              </>
            )}
          </button>

          {/* Download PDF button */}
          <button onClick={handlePrint}
                  disabled={isGeneratingPdf}
                  className="btn-primary text-xs px-3.5 py-1.5 rounded-lg gap-1.5 shadow-lg shadow-purple-600/20 font-semibold cursor-pointer disabled:opacity-75">
            {isGeneratingPdf ? (
              <>
                <Sparkles size={13} className="animate-spin text-purple-200" />
                <span>Exporting Vector PDF...</span>
              </>
            ) : (
              <>
                <Download size={13} />
                <span>Download PDF</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* ── Main Workspace: Editor Panel & Preview Canvas ── */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* ── Left Editor Panel ── */}
        {(viewMode === 'edit' || viewMode === 'split') && (
          <aside className={`flex flex-col border-r overflow-hidden flex-shrink-0 transition-all ${viewMode === 'edit' ? 'w-full max-w-3xl mx-auto border-none' : 'w-[400px]'}`}
                 style={{
                   background: isLight ? '#f8fafc' : '#0D0F2E',
                   borderColor: isLight ? '#e2e8f0' : 'rgba(124,58,237,.2)'
                 }}>
            
            {/* Color style bar & ATS meter */}
            <div className="px-4 py-2.5 border-b flex items-center justify-between flex-wrap gap-2 transition-colors"
                 style={{
                   background: isLight ? '#ffffff' : '#111338',
                   borderColor: isLight ? '#e2e8f0' : 'rgba(124,58,237,.15)'
                 }}>
              <div className="flex items-center gap-2">
                <Palette size={13} className={isLight ? 'text-slate-500' : 'text-slate-400'} />
                <span className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>Ink Tone:</span>
                <div className="flex items-center gap-1.5 ml-1">
                  {ACCENT_COLORS.map(c => (
                    <button key={c} onClick={() => setAccent(c)}
                            title={c === '#000000' ? '100% Pure Black (Standard ATS)' : c}
                            className={`w-4 h-4 rounded-full transition-transform hover:scale-125 border ${isLight ? 'border-slate-300' : 'border-white/30'}`}
                            style={{ background: c, boxShadow: accent === c ? `0 0 0 2px ${isLight ? '#fff' : '#fff'}, 0 0 0 3px #10B981` : 'none' }} />
                  ))}
                  <span className="text-[10px] text-emerald-400 font-semibold ml-1">
                    {accent === '#000000' ? 'Pure B&W' : 'Slate'}
                  </span>
                </div>
              </div>

              {/* ATS Score */}
              <div className="flex items-center gap-2">
                <Target size={13} style={{ color: scoreColor }} />
                <span className="text-xs text-slate-400">ATS:</span>
                <span className="text-xs font-bold" style={{ color: scoreColor }}>{score}%</span>
              </div>
            </div>

            {/* Sections Scrollable Area */}
            <div className="flex-1 overflow-y-auto">
              {/* Personal Info (Fixed at top with photo upload) */}
              <div style={{ borderBottom: '1px solid rgba(124,58,237,.15)' }}>
                <div className="px-4 py-3 bg-[#111338]/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Brain size={15} className="text-purple-400" />
                    <span className="font-semibold text-xs md:text-sm text-slate-200">Personal Info & Photo</span>
                  </div>
                </div>
                <div className="px-4 py-3 flex flex-col gap-2.5">
                  {/* Photo upload row */}
                  <div className="p-2.5 rounded-xl bg-purple-500/5 border border-purple-500/15 space-y-2">
                    <div className="flex items-center gap-3">
                      {data.personal.photo ? (
                        <div className="relative group flex-shrink-0">
                          <img src={data.personal.photo} alt="Headshot" className="w-12 h-12 rounded-full object-cover border-2 border-purple-400 shadow-md" />
                          <button onClick={removePhoto} title="Remove Photo"
                                  className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-0.5 shadow transition-colors">
                            <X size={10} />
                          </button>
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-[#181a42] border border-dashed border-purple-400/50 flex items-center justify-center text-purple-300 flex-shrink-0 shadow-inner">
                          <Camera size={18} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-semibold text-slate-200">Profile Photo</span>
                          {data.personal.photo && (
                            <span className="text-[10px] text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded font-medium inline-flex items-center gap-0.5">
                              <Check size={9} /> Saved in Account
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">Professional headshot for photo templates</div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {data.personal.photo && (
                          <button
                            type="button"
                            onClick={handleOpenAdjustModal}
                            className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-indigo-600/30 text-indigo-200 hover:bg-indigo-600/50 border border-indigo-500/30 transition-all inline-flex items-center gap-1 cursor-pointer"
                            title="Crop and reposition photo"
                          >
                            <Sliders size={11} />
                            <span>Adjust</span>
                          </button>
                        )}
                        <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" id="photo-upload" />
                        <label htmlFor="photo-upload" className="cursor-pointer text-xs font-medium px-2.5 py-1.5 rounded-lg bg-purple-600/30 text-purple-200 hover:bg-purple-600/50 border border-purple-500/30 transition-all inline-flex items-center gap-1">
                          <Camera size={11} />
                          <span>{data.personal.photo ? 'Change' : 'Upload'}</span>
                        </label>
                      </div>
                    </div>
                    {photoSavedToast && (
                      <div className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded flex items-center gap-1 animate-fade-in">
                        <Check size={10} />
                        <span>Photo automatically saved to your account!</span>
                      </div>
                    )}
                  </div>

                  {/* Resume Name / Target Role Customizer */}
                  <div className={`p-3 rounded-xl border mb-1 transition-colors ${
                    isLight ? 'bg-purple-50/60 border-purple-200' : 'bg-purple-500/10 border-purple-500/25'
                  }`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                        <FileText size={13} /> Resume Name / Role
                      </label>
                      <span className="text-[10px] text-slate-400">Dashboard Title</span>
                    </div>
                    <input
                      type="text"
                      value={resumeTitle}
                      onChange={e => setResumeTitle(e.target.value)}
                      placeholder="e.g. Data Science Resume, AIML Resume..."
                      className="form-input text-xs w-full font-semibold"
                    />
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {['Data Science Resume', 'AIML Resume', 'Full Stack Developer', 'Software Engineer'].map(tag => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setResumeTitle(tag)}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-purple-500/15 hover:bg-purple-500/30 text-purple-300 hover:text-white border border-purple-500/30 transition-colors cursor-pointer"
                        >
                          + {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Full Name" value={data.personal.name} onChange={v => updPersonal('name', v)} placeholder="Hritik Kumar" />
                    <Field label="Job Title" value={data.personal.title} onChange={v => updPersonal('title', v)} placeholder="Software Development Engineer" />
                  </div>
                  <Field label="Email" value={data.personal.email} onChange={v => updPersonal('email', v)} placeholder="hritikkumarpd@gmail.com" />
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Phone" value={data.personal.phone} onChange={v => updPersonal('phone', v)} placeholder="+91 94716 36126" />
                    <Field label="Location" value={data.personal.location} onChange={v => updPersonal('location', v)} placeholder="Gaya, Bihar, India" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="LinkedIn" value={data.personal.linkedin} onChange={v => updPersonal('linkedin', v)} placeholder="linkedin.com/in/hritikkumar" />
                    <Field label="GitHub / Portfolio" value={data.personal.website} onChange={v => updPersonal('website', v)} placeholder="github.com/hritikkumar" />
                  </div>
                </div>
              </div>

              {/* Dynamic Reorderable Sections */}
              {sectionOrder.map((sectionKey, index) => {
                const canMoveUp = index > 0
                const canMoveDown = index < sectionOrder.length - 1

                // 1. Professional Summary
                if (sectionKey === 'summary') {
                  return (
                    <EditorSection
                      key="summary"
                      title="Professional Summary"
                      icon={Brain}
                      canMoveUp={canMoveUp}
                      canMoveDown={canMoveDown}
                      onMoveUp={() => moveSection('summary', -1)}
                      onMoveDown={() => moveSection('summary', 1)}
                      isLight={isLight}
                    >
                      <Field value={data.summary} onChange={v => upd('summary', v)}
                             placeholder="Write a concise 2-3 sentence summary..." multiline />
                      <div className="mt-2 flex items-center justify-between">
                        <button
                          onClick={handleEnhanceSummary}
                          disabled={isEnhancingSummary}
                          className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors font-medium"
                        >
                          <Sparkles size={12} className={isEnhancingSummary ? 'animate-spin' : ''} />
                          <span>{isEnhancingSummary ? 'AI Enhancing Summary...' : 'Auto-Enhance with AI'}</span>
                        </button>
                        <span className="text-[10px] text-emerald-400 font-medium">● AI Engine Ready</span>
                      </div>
                    </EditorSection>
                  )
                }

                // 2. Work Experience
                if (sectionKey === 'experience') {
                  return (
                    <EditorSection
                      key="experience"
                      title="Work Experience"
                      icon={Brain}
                      canMoveUp={canMoveUp}
                      canMoveDown={canMoveDown}
                      onMoveUp={() => moveSection('experience', -1)}
                      onMoveDown={() => moveSection('experience', 1)}
                      isLight={isLight}
                    >
                      <div className="flex flex-col gap-3.5">
                        {data.experience.map((exp, idx) => (
                          <div key={exp.id} className="rounded-xl p-3 flex flex-col gap-2"
                               style={{ background: 'rgba(124,58,237,.06)', border: '1px solid rgba(124,58,237,.15)' }}>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-purple-300">Experience #{idx + 1}</span>
                              <button onClick={() => upd('experience', data.experience.filter(e => e.id !== exp.id))}
                                      className="text-red-400/60 hover:text-red-400 transition-colors">
                                <Trash2 size={12} />
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <Field label="Company" value={exp.company} onChange={v => updExp(exp.id, 'company', v)} placeholder="Company" />
                              <Field label="Role" value={exp.role} onChange={v => updExp(exp.id, 'role', v)} placeholder="SDE Intern" />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <Field label="Period" value={exp.period} onChange={v => updExp(exp.id, 'period', v)} placeholder="Jun 2024 – Aug 2024" />
                              <Field label="Location" value={exp.location} onChange={v => updExp(exp.id, 'location', v)} placeholder="Kolkata, India" />
                            </div>
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center justify-between">
                                <label className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Bullet Points (one per line)</label>
                                <button
                                  onClick={() => handleEnhanceBullets(exp.id)}
                                  disabled={enhancingExpId === exp.id}
                                  className="flex items-center gap-1 text-[11px] text-purple-400 hover:text-purple-300 transition-colors font-medium"
                                >
                                  <Sparkles size={11} className={enhancingExpId === exp.id ? 'animate-spin' : ''} />
                                  <span>{enhancingExpId === exp.id ? 'Enhancing...' : 'AI Enhance Bullets'}</span>
                                </button>
                              </div>
                              <textarea value={exp.bullets.join('\n')}
                                        onChange={e => updExp(exp.id, 'bullets', e.target.value.split('\n'))}
                                        className="form-input text-xs py-2 px-3 resize-none" rows={3}
                                        placeholder="Describe your technical achievements..." />
                            </div>
                          </div>
                        ))}
                        <button onClick={() => upd('experience', [...data.experience, { id: Date.now(), company: '', role: '', period: '', location: '', bullets: [''] }])}
                                className="flex items-center gap-2 text-xs text-purple-400 hover:text-purple-300 transition-colors py-1.5 font-medium">
                          <Plus size={13} /> Add Experience
                        </button>
                      </div>
                    </EditorSection>
                  )
                }

                // 3. Education
                if (sectionKey === 'education') {
                  return (
                    <EditorSection
                      key="education"
                      title="Education"
                      icon={Brain}
                      canMoveUp={canMoveUp}
                      canMoveDown={canMoveDown}
                      onMoveUp={() => moveSection('education', -1)}
                      onMoveDown={() => moveSection('education', 1)}
                      isLight={isLight}
                    >
                      {data.education.map(edu => (
                        <div key={edu.id} className="rounded-xl p-3 flex flex-col gap-2 mb-3"
                             style={{ background: 'rgba(124,58,237,.06)', border: '1px solid rgba(124,58,237,.15)' }}>
                          <div className="flex justify-end">
                            <button onClick={() => upd('education', data.education.filter(e => e.id !== edu.id))} className="text-red-400/60 hover:text-red-400 transition-colors">
                              <Trash2 size={12} />
                            </button>
                          </div>
                          <Field label="School / College" value={edu.school} onChange={v => upd('education', data.education.map(e => e.id === edu.id ? { ...e, school: v } : e))} placeholder="Techno Main Salt Lake (TMSL), Kolkata" />
                          <div className="grid grid-cols-2 gap-2">
                            <Field label="Degree / Branch" value={edu.degree} onChange={v => upd('education', data.education.map(e => e.id === edu.id ? { ...e, degree: v } : e))} placeholder="B.Tech in CSE (AI & ML)" />
                            <Field label="Period" value={edu.period} onChange={v => upd('education', data.education.map(e => e.id === edu.id ? { ...e, period: v } : e))} placeholder="2022 – 2026" />
                          </div>
                          <Field label="CGPA / Percentage" value={edu.gpa} onChange={v => upd('education', data.education.map(e => e.id === edu.id ? { ...e, gpa: v } : e))} placeholder="6.99 / 10.0 CGPA" />
                        </div>
                      ))}
                      <button onClick={() => upd('education', [...data.education, { id: Date.now(), school: '', degree: '', period: '', gpa: '' }])}
                              className="flex items-center gap-2 text-xs text-purple-400 hover:text-purple-300 transition-colors py-1.5 font-medium">
                        <Plus size={13} /> Add Education
                      </button>
                    </EditorSection>
                  )
                }

                // 4. Skills
                if (sectionKey === 'skills') {
                  return (
                    <EditorSection
                      key="skills"
                      title="Technical Skills"
                      icon={Brain}
                      canMoveUp={canMoveUp}
                      canMoveDown={canMoveDown}
                      onMoveUp={() => moveSection('skills', -1)}
                      onMoveDown={() => moveSection('skills', 1)}
                      isLight={isLight}
                    >
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {data.skills.map(sk => (
                          <span key={sk} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                                style={{ background: 'rgba(124,58,237,.2)', border: '1px solid rgba(124,58,237,.3)', color: '#A78BFA' }}>
                            {sk}
                            <button onClick={() => upd('skills', data.skills.filter(s => s !== sk))} className="text-purple-400/50 hover:text-red-400 transition-colors">×</button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input value={skillInput} onChange={e => setSkillInput(e.target.value)}
                               onKeyDown={e => e.key === 'Enter' && addSkill()}
                               placeholder="Add skill (e.g. PyTorch, Spring Boot)"
                               className="form-input text-xs py-2 px-3 flex-1" />
                        <button onClick={addSkill} className="btn-primary text-xs px-3 py-2 rounded-lg">
                          <Plus size={13} />
                        </button>
                      </div>
                    </EditorSection>
                  )
                }

                // 5. Projects
                if (sectionKey === 'projects') {
                  return (
                    <EditorSection
                      key="projects"
                      title="Key Projects"
                      icon={Brain}
                      canMoveUp={canMoveUp}
                      canMoveDown={canMoveDown}
                      onMoveUp={() => moveSection('projects', -1)}
                      onMoveDown={() => moveSection('projects', 1)}
                      isLight={isLight}
                    >
                      {data.projects.map(p => (
                        <div key={p.id} className="rounded-xl p-3 flex flex-col gap-2 mb-3"
                             style={{ background: 'rgba(124,58,237,.06)', border: '1px solid rgba(124,58,237,.15)' }}>
                          <div className="flex justify-end">
                            <button onClick={() => upd('projects', data.projects.filter(x => x.id !== p.id))} className="text-red-400/60 hover:text-red-400 transition-colors">
                              <Trash2 size={12} />
                            </button>
                          </div>
                          <Field label="Project Name" value={p.name} onChange={v => upd('projects', data.projects.map(x => x.id === p.id ? { ...x, name: v } : x))} placeholder="AI Resume & ATS Matcher" />
                          <Field label="Description" value={p.desc} onChange={v => upd('projects', data.projects.map(x => x.id === p.id ? { ...x, desc: v } : x))} placeholder="Key features, technologies, and achievements..." multiline />
                          <Field label="GitHub / Demo URL" value={p.link} onChange={v => upd('projects', data.projects.map(x => x.id === p.id ? { ...x, link: v } : x))} placeholder="github.com/hritikkumar/project" />
                        </div>
                      ))}
                      <button onClick={() => upd('projects', [...data.projects, { id: Date.now(), name: '', desc: '', link: '' }])}
                              className="flex items-center gap-2 text-xs text-purple-400 hover:text-purple-300 transition-colors py-1.5 font-medium">
                        <Plus size={13} /> Add Project
                      </button>
                    </EditorSection>
                  )
                }

                // 6. Certifications
                if (sectionKey === 'certifications') {
                  return (
                    <EditorSection
                      key="certifications"
                      title="Certifications & Honors"
                      icon={Brain}
                      canMoveUp={canMoveUp}
                      canMoveDown={canMoveDown}
                      onMoveUp={() => moveSection('certifications', -1)}
                      onMoveDown={() => moveSection('certifications', 1)}
                      isLight={isLight}
                    >
                      {data.certifications.map(c => (
                        <div key={c.id} className="rounded-xl p-3 flex flex-col gap-2 mb-3"
                             style={{ background: 'rgba(124,58,237,.06)', border: '1px solid rgba(124,58,237,.15)' }}>
                          <div className="flex justify-end">
                            <button onClick={() => upd('certifications', data.certifications.filter(x => x.id !== c.id))} className="text-red-400/60 hover:text-red-400 transition-colors">
                              <Trash2 size={12} />
                            </button>
                          </div>
                          <Field label="Certification Name" value={c.name} onChange={v => upd('certifications', data.certifications.map(x => x.id === c.id ? { ...x, name: v } : x))} placeholder="Machine Learning Specialization" />
                          <div className="grid grid-cols-2 gap-2">
                            <Field label="Issuer" value={c.issuer} onChange={v => upd('certifications', data.certifications.map(x => x.id === c.id ? { ...x, issuer: v } : x))} placeholder="DeepLearning.AI" />
                            <Field label="Year" value={c.year} onChange={v => upd('certifications', data.certifications.map(x => x.id === c.id ? { ...x, year: v } : x))} placeholder="2024" />
                          </div>
                          <Field label="Credential / Certificate URL (Optional)" value={c.link || ''} onChange={v => upd('certifications', data.certifications.map(x => x.id === c.id ? { ...x, link: v } : x))} placeholder="https://coursera.org/verify/... or certificate link" />
                        </div>
                      ))}
                      <button onClick={() => upd('certifications', [...data.certifications, { id: Date.now(), name: '', issuer: '', year: '', link: '' }])}
                              className="flex items-center gap-2 text-xs text-purple-400 hover:text-purple-300 transition-colors py-1.5 font-medium">
                        <Plus size={13} /> Add Certification
                      </button>
                    </EditorSection>
                  )
                }

                return null
              })}
            </div>
          </aside>
        )}

        {/* ── Right Canvas: Scaled & Non-Clipping Preview Area ── */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <main className="flex-1 flex flex-col overflow-hidden" ref={previewContainerRef}>
            <div className={`flex-1 overflow-auto p-4 md:p-8 transition-colors ${
              isLight ? 'bg-slate-200/70' : 'bg-[#0e1026]'
            }`}>
              
              {/* Scaled bounding wrapper with m-auto so left margin is NEVER clipped off */}
              <div className="min-w-fit m-auto flex flex-col items-center justify-start pb-16">
                {/* A4 Paper Badge indicator */}
                <div className="mb-2.5 flex items-center gap-2 text-[11px] font-mono select-none">
                  <span className={`px-2 py-0.5 rounded font-semibold flex items-center gap-1.5 ${
                    isLight
                      ? 'bg-purple-100 text-purple-800 border border-purple-200'
                      : 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                  }`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    A4 Page (210 × 297 mm)
                  </span>
                  <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>
                    100% WYSIWYG Print Ready
                  </span>
                </div>

                <div style={{
                  width: Math.round(A4_WIDTH_PX * (zoom / 100)),
                  minHeight: Math.round(A4_HEIGHT_PX * (zoom / 100)),
                  position: 'relative'
                }}>
                  <div style={{
                    width: `${A4_WIDTH_PX}px`,
                    minHeight: `${A4_HEIGHT_PX}px`,
                    transform: `scale(${zoom / 100})`,
                    transformOrigin: 'top left',
                    boxShadow: isLight
                      ? '0 12px 36px -4px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.08)'
                      : '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.12)'
                  }}>
                    <ResumeDoc
                      data={data}
                      accent={accent}
                      font={font}
                      template={template}
                      sectionOrder={sectionOrder}
                      fontSizeScale={fontSizeScale}
                    />
                  </div>
                </div>
              </div>

            </div>
          </main>
        )}

      </div>

      {/* ── Interactive Photo Adjuster & Crop Modal ── */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md rounded-2xl p-6 shadow-2xl border"
               style={{ background: isLight ? '#ffffff' : '#0e1136', borderColor: isLight ? '#cbd5e1' : 'rgba(124,58,237,.35)' }}>
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b"
                 style={{ borderColor: isLight ? '#e2e8f0' : 'rgba(255,255,255,.1)' }}>
              <div className="flex items-center gap-2">
                <Sliders size={18} className="text-purple-400" />
                <h3 className="font-bold text-base" style={{ color: isLight ? '#0f172a' : '#f8fafc' }}>
                  Adjust & Reposition Photo
                </h3>
              </div>
              <button onClick={() => setIsAdjustModalOpen(false)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/10 transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {/* Live Interactive Preview Box */}
            <div className="py-4 flex flex-col items-center">
              <div className="relative w-52 h-52 rounded-2xl flex items-center justify-center overflow-hidden border shadow-inner"
                   style={{
                     background: isLight ? '#f1f5f9' : '#070818',
                     borderColor: isLight ? '#cbd5e1' : 'rgba(124,58,237,.25)'
                   }}>
                {/* Visual guideline overlay crosshair */}
                <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-20 border border-purple-400/30">
                  <div className="border-r border-b border-purple-400/40"></div>
                  <div className="border-r border-b border-purple-400/40"></div>
                  <div className="border-b border-purple-400/40"></div>
                  <div className="border-r border-b border-purple-400/40"></div>
                  <div className="border-r border-b border-purple-400/40"></div>
                  <div className="border-b border-purple-400/40"></div>
                  <div className="border-r border-purple-400/40"></div>
                  <div className="border-r border-purple-400/40"></div>
                  <div></div>
                </div>

                {/* Mask Frame (Circle or Square) */}
                <div className={`w-40 h-40 overflow-hidden border-2 shadow-2xl relative transition-all duration-200 ${
                  cropShape === 'circle' ? 'rounded-full border-purple-500' : 'rounded-2xl border-purple-500'
                }`}>
                  {tempPhoto ? (
                    <img
                      src={tempPhoto}
                      alt="Adjust Preview"
                      className="w-full h-full object-cover select-none pointer-events-none"
                      style={{
                        transform: `rotate(${photoRotation}deg) scale(${cropZoom}) translate(${cropX}%, ${cropY}%)`,
                        transformOrigin: 'center center',
                        filter: `brightness(${photoBrightness}%) contrast(${photoContrast}%)`,
                        transition: 'none'
                      }}
                    />
                  ) : null}
                </div>
              </div>

              {/* Shape Switcher (Circle vs Square) */}
              <div className="flex items-center gap-2 mt-3 text-xs">
                <span className="text-slate-400 text-[11px]">Preview Frame:</span>
                <button
                  type="button"
                  onClick={() => setCropShape('circle')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                    cropShape === 'circle'
                      ? 'bg-purple-600 text-white shadow'
                      : isLight ? 'bg-slate-200 text-slate-700' : 'bg-white/10 text-slate-300'
                  }`}
                >
                  Circle (Standard)
                </button>
                <button
                  type="button"
                  onClick={() => setCropShape('square')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                    cropShape === 'square'
                      ? 'bg-purple-600 text-white shadow'
                      : isLight ? 'bg-slate-200 text-slate-700' : 'bg-white/10 text-slate-300'
                  }`}
                >
                  Square (Modern)
                </button>
              </div>
            </div>

            {/* Slider Controls */}
            <div className="space-y-3 pt-1 pb-4">
              {/* Zoom Slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium flex items-center gap-1.5" style={{ color: isLight ? '#334155' : '#cbd5e1' }}>
                    <ZoomIn size={13} className="text-purple-400" />
                    <span>Zoom / Scale</span>
                  </span>
                  <span className="font-mono text-[11px] font-semibold text-purple-400">
                    {Math.round(cropZoom * 100)}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCropZoom(z => Math.max(1.0, +(z - 0.1).toFixed(2)))}
                    className={`px-2 py-0.5 rounded text-xs font-bold cursor-pointer ${
                      isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-700' : 'bg-white/10 hover:bg-white/20 text-slate-200'
                    }`}
                  >
                    -
                  </button>
                  <input
                    type="range"
                    min="1.0"
                    max="2.5"
                    step="0.05"
                    value={cropZoom}
                    onChange={e => setCropZoom(parseFloat(e.target.value))}
                    className="flex-1 accent-purple-600 cursor-pointer h-1.5 rounded-lg bg-slate-700"
                  />
                  <button
                    type="button"
                    onClick={() => setCropZoom(z => Math.min(2.5, +(z + 0.1).toFixed(2)))}
                    className={`px-2 py-0.5 rounded text-xs font-bold cursor-pointer ${
                      isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-700' : 'bg-white/10 hover:bg-white/20 text-slate-200'
                    }`}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Vertical Position (Y) */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium flex items-center gap-1.5" style={{ color: isLight ? '#334155' : '#cbd5e1' }}>
                    <ArrowUp size={13} className="text-cyan-400" />
                    <span>Vertical Position (Up / Down)</span>
                  </span>
                  <span className="font-mono text-[11px] font-semibold text-cyan-400">
                    {cropY > 0 ? `+${cropY}%` : `${cropY}%`}
                  </span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  step="1"
                  value={cropY}
                  onChange={e => setCropY(parseInt(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer h-1.5 rounded-lg bg-slate-700"
                />
              </div>

              {/* Horizontal Position (X) */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium flex items-center gap-1.5" style={{ color: isLight ? '#334155' : '#cbd5e1' }}>
                    <ArrowDown size={13} className="text-emerald-400 rotate-90" />
                    <span>Horizontal Position (Left / Right)</span>
                  </span>
                  <span className="font-mono text-[11px] font-semibold text-emerald-400">
                    {cropX > 0 ? `+${cropX}%` : `${cropX}%`}
                  </span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  step="1"
                  value={cropX}
                  onChange={e => setCropX(parseInt(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer h-1.5 rounded-lg bg-slate-700"
                />
              </div>

              {/* Brightness Slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium flex items-center gap-1.5" style={{ color: isLight ? '#334155' : '#cbd5e1' }}>
                    <SunDim size={13} className="text-amber-400" />
                    <span>Brightness</span>
                  </span>
                  <span className="font-mono text-[11px] font-semibold text-amber-400">
                    {photoBrightness}%
                  </span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="150"
                  step="2"
                  value={photoBrightness}
                  onChange={e => setPhotoBrightness(parseInt(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer h-1.5 rounded-lg bg-slate-700"
                />
              </div>

              {/* Contrast Slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium flex items-center gap-1.5" style={{ color: isLight ? '#334155' : '#cbd5e1' }}>
                    <Contrast size={13} className="text-indigo-400" />
                    <span>Contrast</span>
                  </span>
                  <span className="font-mono text-[11px] font-semibold text-indigo-400">
                    {photoContrast}%
                  </span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="150"
                  step="2"
                  value={photoContrast}
                  onChange={e => setPhotoContrast(parseInt(e.target.value))}
                  className="w-full accent-indigo-400 cursor-pointer h-1.5 rounded-lg bg-slate-700"
                />
              </div>

              {/* Rotation & Reset Row */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium flex items-center gap-1" style={{ color: isLight ? '#334155' : '#cbd5e1' }}>
                    <RotateCw size={13} className="text-pink-400" />
                    <span>Rotate:</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setPhotoRotation(r => (r + 90) % 360)}
                    className={`px-2 py-0.5 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                      isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-700' : 'bg-white/10 hover:bg-white/20 text-slate-200'
                    }`}
                  >
                    <span>+90° ({photoRotation}°)</span>
                  </button>
                </div>

                {/* Reset All Button */}
                <button
                  type="button"
                  onClick={() => {
                    setCropZoom(1.0);
                    setCropX(0);
                    setCropY(0);
                    setPhotoBrightness(100);
                    setPhotoContrast(100);
                    setPhotoRotation(0);
                  }}
                  className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1 font-medium transition-colors cursor-pointer"
                >
                  <RotateCcw size={11} />
                  <span>Reset All</span>
                </button>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t"
                 style={{ borderColor: isLight ? '#e2e8f0' : 'rgba(255,255,255,.1)' }}>
              <button
                type="button"
                onClick={() => setIsAdjustModalOpen(false)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyPhotoAdjustment}
                className="btn-primary text-xs px-4 py-2 rounded-xl font-semibold shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Check size={14} />
                <span>Save & Apply to Account</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── AI Engine Configuration Modal ── */}
      {isAiConfigOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md rounded-2xl p-6 shadow-2xl border"
               style={{ background: isLight ? '#ffffff' : '#0e1136', borderColor: isLight ? '#cbd5e1' : 'rgba(124,58,237,.35)' }}>
            
            <div className="flex items-center justify-between pb-3 border-b"
                 style={{ borderColor: isLight ? '#e2e8f0' : 'rgba(255,255,255,.1)' }}>
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-purple-400" />
                <h3 className="font-bold text-base" style={{ color: isLight ? '#0f172a' : '#f8fafc' }}>
                  AI Engine Settings
                </h3>
              </div>
              <button onClick={() => setIsAiConfigOpen(false)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/10 transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="py-4 space-y-3">
              <p className="text-xs text-slate-400 leading-relaxed">
                ResumeAI Pro includes an intelligent dynamic resume engine. For unlimited real-time completions powered by Google's latest free model, enter your free API key below:
              </p>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-300">
                  Google AI Studio Free API Key
                </label>
                <input
                  type="password"
                  value={aiApiKeyInput}
                  onChange={(e) => setAiApiKeyInput(e.target.value)}
                  placeholder="AIzaSy..."
                  className="form-input text-xs py-2 px-3 bg-[#141842] border-purple-500/30 text-slate-100 rounded-lg w-full font-mono focus:border-purple-400"
                />
              </div>

              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs space-y-1.5 text-slate-300">
                <p className="font-semibold text-purple-300">How to get a 100% Free API Key (30 Seconds):</p>
                <ol className="list-decimal list-inside text-[11px] text-slate-400 space-y-1">
                  <li>Visit <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="text-purple-400 hover:underline font-medium">aistudio.google.com/apikey</a></li>
                  <li>Sign in with your Google Account</li>
                  <li>Click <span className="text-white font-medium">"Create API Key"</span> and copy it</li>
                  <li>Paste it above and click Save (Free 1,500 requests/day, no credit card)</li>
                </ol>
              </div>

              {aiKeySavedFeedback && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                  <Check size={14} />
                  <span>API Key saved successfully! Live AI completions active.</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t"
                 style={{ borderColor: isLight ? '#e2e8f0' : 'rgba(255,255,255,.1)' }}>
              <button
                type="button"
                onClick={() => setIsAiConfigOpen(false)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
                }`}
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setStoredGeminiKey(aiApiKeyInput)
                  setAiKeySavedFeedback(true)
                  setTimeout(() => setAiKeySavedFeedback(false), 3000)
                }}
                className="btn-primary text-xs px-4 py-2 rounded-xl font-semibold shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Check size={14} />
                <span>Save API Key</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Native Fallback Print Stylesheet ── */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          *, *::before, *::after {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-sizing: border-box !important;
          }
          html, body {
            width: 210mm !important;
            min-height: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            overflow: visible !important;
          }
          /* Clear transforms on ancestors so position: absolute isn't trapped in scaled preview containers */
          main, div, aside, header, nav {
            transform: none !important;
          }
          body * {
            visibility: hidden !important;
          }
          #printable-resume, #printable-resume * {
            visibility: visible !important;
          }
          #printable-resume {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            min-height: 297mm !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            z-index: 9999999 !important;
            background: #ffffff !important;
            box-sizing: border-box !important;
            /* Exact padding & typography scale are 100% preserved from preview */
          }
        }
      `}</style>
    </div>
  )
}
