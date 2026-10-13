import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Download, Eye, ChevronDown, ChevronUp, Plus, Trash2,
  Zap, Palette, Type, LayoutTemplate, Brain, Target,
  ZoomIn, ZoomOut, Columns, Edit3, Sparkles,
  ArrowUp, ArrowDown, Camera, X, Check, Sun, Moon,
  Sliders, RotateCcw, RotateCw, SunDim, Contrast, Save, FileText, Edit2,
  AlertCircle, Loader2, RefreshCw, Shield, BookOpen, Search, Upload, Copy,
  CheckCheck
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import {
  streamEnhanceSummaryWithAI,
  streamEnhanceBulletsWithAI,
  streamEnhanceSectionWithAI,
} from '../lib/aiService'
import { pdfApi } from '../lib/api'
import { isPaidPlan } from '../config/plans'
import { resumeStorage } from '../lib/resumeStorage'
import { useScreenshotProtection } from '../hooks/useScreenshotProtection'
import { ROLE_PRESETS } from '../data/rolePresets'
import { ACTION_VERBS } from '../data/actionVerbs'
import { auditResumeATS } from '../lib/atsScorer'
import { analyzeJobDescriptionMatch } from '../lib/jobMatcher'
import { exportResumeToJson, parseResumeFromJsonFile, formatResumeToPlainText } from '../lib/resumeExporter'
import AtsAuditModal from '../components/builder/AtsAuditModal'
import RolePresetsModal from '../components/builder/RolePresetsModal'
import JobMatcherModal from '../components/builder/JobMatcherModal'
import ActionVerbsModal from '../components/builder/ActionVerbsModal'

/* ── Blank, honest starter data for new resumes ── */
const defaultData = {
  personal: { name: '', title: '', email: '', phone: '', location: '', linkedin: '', website: '', photo: '' },
  summary: '',
  experience: [],
  education: [],
  skills: [],
  projects: [],
  certifications: [],
}

export const TEMPLATES = [
  "Overleaf",
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

function getSkillGroups(skills = [], categoryMap = {}) {
  const grouped = new Map()
  skills.filter(Boolean).forEach(skill => {
    const category = (categoryMap?.[skill] || '').trim() || 'Skills'
    if (!grouped.has(category)) grouped.set(category, [])
    grouped.get(category).push(skill)
  })
  return Array.from(grouped, ([label, values]) => ({ label, values }))
}

/* ── ATS Score Calculation (delegates to comprehensive audit engine) ── */
function calcScore(data) {
  return auditResumeATS(data).score
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
  fontSizeScale = 1.0,
  spacingDensity = 'normal'
}) {
  const densityMultiplier = spacingDensity === 'compact' ? 0.88 : spacingDensity === 'relaxed' ? 1.12 : 1.0
  const s = {
    fontFamily: font,
    fontSize: `${Math.round(11.5 * fontSizeScale)}px`,
    lineHeight: (1.38 * densityMultiplier).toFixed(2)
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

  /* ── OVERLEAF: Jake's Resume / classic Overleaf layout ─────── */
  if (template === "Overleaf") {
    // Categories are explicitly assigned by the user in the Skills editor.
    // Legacy resumes without category metadata remain visible as Uncategorized.
    const skills = Array.isArray(data.skills) ? data.skills.filter(Boolean) : []
    const categoryMap = data.skillCategories && typeof data.skillCategories === 'object' ? data.skillCategories : {}
    const grouped = new Map()
    skills.forEach(skill => {
      const category = (categoryMap[skill] || 'Uncategorized').trim() || 'Uncategorized'
      if (!grouped.has(category)) grouped.set(category, [])
      grouped.get(category).push(skill)
    })
    const skillGroups = Array.from(grouped, ([label, values]) => ({ label, values }))
    const sectionHeading = { fontSize: '15px', fontWeight: 700, lineHeight: 1.2, borderBottom: '1px solid #111827', paddingBottom: '2px', marginBottom: '5px', color: '#111827' }
    const smallText = { fontSize: '10.5px', lineHeight: 1.3, color: '#111827' }
    return (
      <div id="printable-resume" className="bg-white text-gray-900" style={{
        ...A4_RESUME_STYLE, padding: '14mm 17mm', boxShadow: 'none',
        fontFamily: 'Times New Roman, serif', fontSize: '10.5px', lineHeight: 1.25
      }}>
        <header style={{ textAlign: 'center', marginBottom: '11px' }}>
          <h1 style={{ fontSize: '22px', lineHeight: 1.15, fontWeight: 700, margin: 0, color: '#111827' }}>
            {data.personal.name || 'Your Name'}
          </h1>
          <div style={{ fontSize: '10.5px', lineHeight: 1.4, marginTop: '3px' }}>
            {[data.personal.phone, data.personal.email, data.personal.linkedin, data.personal.website]
              .filter(Boolean).map((value, i, arr) => (
                <span key={value}>
                  {i > 0 && <span> | </span>}
                  {/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? (
                    <a href={`mailto:${value}`} style={{ color: 'inherit', textDecoration: 'none' }}>{value}</a>
                  ) : /linkedin|github|https?:\/\//i.test(value) ? (
                    <a href={formatUrl(value)} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>{cleanUrlDisplay(value)}</a>
                  ) : <span>{value}</span>}
                </span>
              ))}
          </div>
        </header>

        {data.education?.length > 0 && <section style={{ marginBottom: '10px' }}>
          <h2 style={sectionHeading}>Education</h2>
          {data.education.map(edu => <div key={edu.id} style={{ marginBottom: '5px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'baseline', ...smallText }}>
              <strong>{edu.school}</strong><span style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>{edu.location || ''}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', ...smallText }}>
              <span>{edu.degree}{edu.gpa ? `, ${edu.gpa}` : ''}</span><span style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>{edu.period}</span>
            </div>
          </div>)}
        </section>}

        {data.experience?.length > 0 && <section style={{ marginBottom: '10px' }}>
          <h2 style={sectionHeading}>Experience</h2>
          {data.experience.map(exp => <div key={exp.id} style={{ marginBottom: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'baseline', ...smallText }}>
              <strong>{exp.role}</strong><span style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>{exp.period}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', ...smallText }}>
              <span>{exp.company}</span><span style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>{exp.location}</span>
            </div>
            {exp.bullets?.length > 0 && <ul style={{ margin: '3px 0 0 15px', padding: 0, listStyleType: 'disc', ...smallText }}>
              {exp.bullets.map((bullet, i) => <li key={i} style={{ marginBottom: '2px', paddingLeft: '1px' }}>{bullet}</li>)}
            </ul>}
          </div>)}
        </section>}

        {data.projects?.length > 0 && <section style={{ marginBottom: '10px' }}>
          <h2 style={sectionHeading}>Projects</h2>
          {data.projects.map(project => <div key={project.id} style={{ marginBottom: '5px' }}>
            <div style={{ ...smallText, fontWeight: 700 }}>
              {project.name}{project.link ? <span style={{ fontWeight: 400 }}> | <a href={formatUrl(project.link)} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>{cleanUrlDisplay(project.link)}</a></span> : null}
            </div>
            <div style={{ ...smallText, marginLeft: '10px' }}>{project.desc}</div>
          </div>)}
        </section>}

        {skills.length > 0 && <section style={{ marginBottom: '10px' }}>
          <h2 style={sectionHeading}>Technical Skills</h2>
          <div style={smallText}>
            {skillGroups.filter(group => group.values.length > 0).map(group => <div key={group.label} style={{ marginBottom: '2px' }}>
              <strong>{group.label}:</strong> {group.values.join(', ')}
            </div>)}
          </div>
        </section>}

        {data.summary && <section style={{ marginBottom: '10px' }}>
          <h2 style={sectionHeading}>Summary</h2><p style={{ ...smallText, margin: 0 }}>{data.summary}</p>
        </section>}
        {data.certifications?.length > 0 && <section>
          <h2 style={sectionHeading}>Certifications</h2>
          <ul style={{ ...smallText, margin: '0 0 0 15px', padding: 0 }}>
            {data.certifications.map(cert => <li key={cert.id}>{cert.name}{cert.issuer ? ` — ${cert.issuer}` : ''}{cert.year ? ` (${cert.year})` : ''}</li>)}
          </ul>
        </section>}
      </div>
    )
  }

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
                  {getSkillGroups(data.skills, data.skillCategories).map(group => (
                    <div key={group.label}><span className="font-bold text-black">{group.label}: </span>{group.values.join(', ')}</div>
                  ))}
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
                  <div><span className="font-bold text-black block">Core:</span>{getSkillGroups(data.skills, data.skillCategories).filter(group => group.label === 'Core Concepts').flatMap(group => group.values).join(', ') || '—'}</div>
                  <div><span className="font-bold text-black block">Tools & Libs:</span>{getSkillGroups(data.skills, data.skillCategories).filter(group => group.label !== 'Core Concepts').map(group => `${group.label}: ${group.values.join(', ')}`).join(' • ') || '—'}</div>
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
                  {getSkillGroups(data.skills, data.skillCategories).map(group => (
                    <div key={group.label}><span className="font-bold text-black">{group.label}: </span>{group.values.join(', ')}</div>
                  ))}
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
                {getSkillGroups(data.skills, data.skillCategories).map(group => (
                    <div key={group.label}><span className="font-bold text-black">{group.label}: </span>{group.values.join(', ')}</div>
                  ))}
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
  const [searchParams, setSearchParams] = useSearchParams()
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
  const [viewMode, setViewMode] = useState(() => (typeof window !== 'undefined' && window.innerWidth < 768) ? 'edit' : 'split') // 'edit' | 'split' | 'preview'
  const [zoom, setZoom] = useState(75) // 50% to 125%
  const [fontSizeScale, setFontSizeScale] = useState(1.0) // 0.8 to 1.25
  const [sectionOrder, setSectionOrder] = useState(DEFAULT_SECTION_ORDER)
  
  // Resume Save & Load State
  const [currentResumeId, setCurrentResumeId] = useState(resumeIdFromUrl || null)
  const [resumeTitle, setResumeTitle] = useState('My Resume')
  const [saveStatus, setSaveStatus] = useState('idle') // 'idle' | 'saving' | 'saved' | 'error'
  const saveVersionRef = useRef(0) // race-condition guard
  const autosaveTimerRef = useRef(null)
  const lastSavedDataRef = useRef(null)
  const isInitializingRef = useRef(true) // Suppresses autosave during initial data load
  const lastSavedMetaRef = useRef(null) // Tracks template/accent/font for autosave
  
  // AI State (Preview-based flow — no user API keys)
  const [isEnhancingSummary, setIsEnhancingSummary] = useState(false)
  const [enhancingExpId, setEnhancingExpId] = useState(null)
  const [enhancingProjectId, setEnhancingProjectId] = useState(null)
  const [summaryAiPrompt, setSummaryAiPrompt] = useState('')
  const [expAiPrompts, setExpAiPrompts] = useState({})
  const [projectAiPrompts, setProjectAiPrompts] = useState({})
  const [aiPreview, setAiPreview] = useState(null) // { type, original, enhanced, customPrompt, targetId? }
  const [aiPreviewError, setAiPreviewError] = useState(null)

  // Market-Leading Suite States (ATS Audit, Job Matcher, Presets, Action Verbs, Export)
  const [isAtsModalOpen, setIsAtsModalOpen] = useState(false)
  const [isJdModalOpen, setIsJdModalOpen] = useState(false)
  const [isPresetsModalOpen, setIsPresetsModalOpen] = useState(false)
  const [isActionVerbsModalOpen, setIsActionVerbsModalOpen] = useState(false)
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false)
  const [jdText, setJdText] = useState('')
  const [spacingDensity, setSpacingDensity] = useState('normal') // 'compact' | 'normal' | 'relaxed'
  const [plainTextCopied, setPlainTextCopied] = useState(false)
  const jsonImportInputRef = useRef(null)

  // PDF Export State
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)

  // Export Quota State (free plan: 3/month)
  const [exportQuota, setExportQuota] = useState({ used: 0, limit: 3, unlimited: false })
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

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
  const previewResumeRef = useRef(null) // For screenshot protection targeting
  const fileInputRef = useRef(null)

  // Screenshot protection — disabled during PDF export
  const { overlayVisible, protectionClass } = useScreenshotProtection({
    enabled: !isGeneratingPdf,
    targetRef: previewResumeRef,
  })

  // Fetch export quota on mount (for free-plan users)
  useEffect(() => {
    if (!user) return

    // Fast-path: if frontend context already knows user is Paid, skip API
    if (isPaidPlan(profile?.plan)) {
      setExportQuota({ plan: profile.plan, unlimited: true, used: 0, limit: Infinity })
      return
    }

    pdfApi.quota().then(res => {
      if (res.data) setExportQuota(res.data)
    }).catch(() => {
      // Fail silently — quota display is non-critical
    })
  }, [user, profile])

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
    if (!resumeIdFromUrl) {
      // No resume to load — mark initialization complete after a short delay
      // (allows user defaults effect to run first)
      const timer = setTimeout(() => { isInitializingRef.current = false }, 500)
      return () => clearTimeout(timer)
    }
    let isMounted = true
    const loadResume = async () => {
      try {
        const r = await resumeStorage.get(resumeIdFromUrl, user)
        if (!isMounted || !r) {
          isInitializingRef.current = false
          return
        }
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
          // Snapshot loaded data so autosave diff check works correctly
          lastSavedDataRef.current = JSON.stringify(r.data)
        }
        setCurrentResumeId(r.id)
        // Snapshot meta state
        lastSavedMetaRef.current = JSON.stringify({
          template: r.template, accent: r.accent_color, font: r.font, title: r.title
        })
      } catch (err) {
        console.error('Failed to load resume by ID:', err)
      } finally {
        // Mark initialization complete — autosave can now fire
        setTimeout(() => { isInitializingRef.current = false }, 300)
      }
    }
    loadResume()
    return () => { isMounted = false }
  }, [resumeIdFromUrl, user])

  // Core save function (shared by autosave and manual save)
  const executeSave = useCallback(async (dataToSave, idOverride) => {
    const version = ++saveVersionRef.current
    setSaveStatus('saving')
    try {
      const currentScore = calcScore(dataToSave)
      const payload = {
        id: idOverride || currentResumeId,
        title: resumeTitle || (dataToSave.personal?.name ? `${dataToSave.personal.name}'s Resume` : 'My Resume'),
        data: dataToSave,
        template,
        accent_color: accent,
        font,
        ats_score: currentScore,
      }
      const saved = await resumeStorage.save(payload, user)

      // Guard against stale saves (race condition)
      if (saveVersionRef.current !== version) return

      if (saved?.id) {
        setCurrentResumeId(saved.id)
        // Keep the active resume ID in the URL so a page refresh reloads this draft
        // instead of initializing a new, blank resume.
        if (searchParams.get('id') !== saved.id) {
          setSearchParams(prev => {
            const next = new URLSearchParams(prev)
            next.set('id', saved.id)
            return next
          }, { replace: true })
        }
      }
      lastSavedDataRef.current = JSON.stringify(dataToSave)
      lastSavedMetaRef.current = JSON.stringify({ template, accent, font, title: resumeTitle })
      setSaveStatus(saved?.error ? 'error' : 'saved')
      setTimeout(() => {
        if (saveVersionRef.current === version) setSaveStatus('idle')
      }, 3000)
    } catch (err) {
      if (saveVersionRef.current !== version) return
      console.error('Save failed:', err)
      setSaveStatus('error')
      setTimeout(() => {
        if (saveVersionRef.current === version) setSaveStatus('idle')
      }, 5000)
    }
  }, [currentResumeId, resumeTitle, template, accent, font, user, searchParams, setSearchParams])

  // Debounced autosave: triggers 2s after last edit (data + meta changes)
  useEffect(() => {
    // Skip autosave during initialization phase (loading from URL/Supabase)
    if (isInitializingRef.current) return

    // Skip autosave if neither data nor meta (template/accent/font/title) changed
    const serialized = JSON.stringify(data)
    const metaSerialized = JSON.stringify({ template, accent, font, title: resumeTitle })
    if (serialized === lastSavedDataRef.current && metaSerialized === lastSavedMetaRef.current) return

    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current)
    autosaveTimerRef.current = setTimeout(() => {
      executeSave(data)
    }, 2000)

    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current)
    }
  }, [data, template, accent, font, resumeTitle, executeSave])

  // beforeunload: flush pending save to localStorage to prevent data loss
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Only flush if there are unsaved changes
      const serialized = JSON.stringify(data)
      const metaSerialized = JSON.stringify({ template, accent, font, title: resumeTitle })
      if (serialized !== lastSavedDataRef.current || metaSerialized !== lastSavedMetaRef.current) {
        // Synchronous local-only save (no async cloud calls during unload)
        resumeStorage.saveLocal({
          id: currentResumeId,
          title: resumeTitle,
          data: data,
          template,
          accent_color: accent,
          font,
          ats_score: calcScore(data),
        }, user)
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [data, currentResumeId, resumeTitle, template, accent, font, user])

  // Manual save handler (for the Save button)
  const handleSaveResume = () => {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current)
    executeSave(data)
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

  // Comprehensive Live ATS Audit Engine
  const atsAudit = useMemo(() => auditResumeATS(data), [data])
  const score = atsAudit.score
  const scoreColor = score >= 85 ? '#10B981' : score >= 70 ? '#F59E0B' : '#EF4444'

  // JSON Import & Plain Text Export Handlers
  const handleImportJsonFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const importedData = await parseResumeFromJsonFile(file)
      setData(importedData)
      if (importedData.personal?.title) setResumeTitle(importedData.personal.title)
      setIsExportMenuOpen(false)
    } catch (err) {
      alert(err.message || 'Could not import JSON file')
    } finally {
      if (e.target) e.target.value = ''
    }
  }

  const handleCopyPlainText = () => {
    const text = formatResumeToPlainText(data)
    navigator.clipboard.writeText(text)
    setPlainTextCopied(true)
    setTimeout(() => setPlainTextCopied(false), 2000)
    setIsExportMenuOpen(false)
  }

  const upd = (key, val) => setData(d => ({ ...d, [key]: val }))
  const updPersonal = (key, val) => setData(d => ({ ...d, personal: { ...d.personal, [key]: val } }))
  const updExp = (id, key, val) => setData(d => ({ ...d, experience: d.experience.map(e => e.id === id ? { ...e, [key]: val } : e) }))
  
  const addSkill = () => {
    const sk = skillInput.trim().replace(/\\s+/g, ' ')
    const exists = data.skills.some(value => value.toLocaleLowerCase() === sk.toLocaleLowerCase())
    if (sk && !exists) {
      setData(current => ({
        ...current,
        skills: [...current.skills, sk],
        skillCategories: { ...(current.skillCategories || {}), [sk]: current.skillCategories?.[sk] || '' }
      }))
      setSkillInput('')
    }
  }

  const setSkillCategory = (skill, category) => {
    setData(current => ({
      ...current,
      skillCategories: { ...(current.skillCategories || {}), [skill]: category }
    }))
  }

  const removeSkill = (skill) => {
    setData(current => {
      const skillCategories = { ...(current.skillCategories || {}) }
      delete skillCategories[skill]
      return { ...current, skills: current.skills.filter(value => value !== skill), skillCategories }
    })
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

  // AI Auto-Enhance Summary with Gemini (real-time streaming preview)
  const handleEnhanceSummary = async (promptOverride) => {
    const customPrompt = (promptOverride !== undefined ? promptOverride : summaryAiPrompt || '').trim()
    setIsEnhancingSummary(true)
    setAiPreviewError(null)
    setAiPreview({
      type: 'summary',
      original: data.summary,
      enhanced: '',
      customPrompt,
      isStreaming: true,
    })

    try {
      let accumulated = ''
      await streamEnhanceSummaryWithAI({
        summary: data.summary,
        role: data.personal.title,
        skills: data.skills,
        customPrompt,
      }, {
        onChunk: (chunk, fullText) => {
          accumulated = fullText
          setAiPreview(prev => prev ? { ...prev, enhanced: fullText } : null)
        },
        onDone: (result, fullText) => {
          const finalEnhanced = result?.enhanced || fullText || accumulated
          setAiPreview(prev => prev ? { ...prev, enhanced: finalEnhanced, isStreaming: false } : null)
          setIsEnhancingSummary(false)
        },
        onError: (err) => {
          setAiPreviewError(err?.message || 'AI enhancement failed.')
          setAiPreview(prev => prev ? { ...prev, isStreaming: false } : null)
          setIsEnhancingSummary(false)
        }
      })
    } catch (err) {
      setAiPreviewError(err?.response?.data?.error || err?.message || 'AI enhancement failed. Please try again.')
      setAiPreview(prev => prev ? { ...prev, isStreaming: false } : null)
      setIsEnhancingSummary(false)
    }
  }

  // AI Auto-Enhance Bullets with Gemini (real-time streaming preview)
  const handleEnhanceBullets = async (expId, promptOverride) => {
    const exp = data.experience.find(e => e.id === expId)
    if (!exp) return
    const customPrompt = (promptOverride !== undefined ? promptOverride : expAiPrompts[expId] || '').trim()
    setEnhancingExpId(expId)
    setAiPreviewError(null)
    setAiPreview({
      type: 'bullets',
      targetId: expId,
      original: exp.bullets,
      enhanced: [],
      rawText: '',
      customPrompt,
      isStreaming: true,
    })

    try {
      let accumulated = ''
      await streamEnhanceBulletsWithAI({
        bullets: exp.bullets,
        role: exp.role,
        company: exp.company,
        customPrompt,
      }, {
        onChunk: (chunk, fullText) => {
          accumulated = fullText
          const previewLines = fullText.split('\n')
            .map(l => l.replace(/^[-•*\d.]+\s*/, '').trim())
            .filter(Boolean)
          setAiPreview(prev => prev ? {
            ...prev,
            rawText: fullText,
            enhanced: previewLines.length > 0 ? previewLines : [fullText]
          } : null)
        },
        onDone: (result, fullText) => {
          const finalBullets = result?.bullets || (fullText || accumulated).split('\n')
            .map(l => l.replace(/^[-•*\d.]+\s*/, '').trim())
            .filter(Boolean)
          setAiPreview(prev => prev ? {
            ...prev,
            rawText: fullText || accumulated,
            enhanced: finalBullets,
            isStreaming: false
          } : null)
          setEnhancingExpId(null)
        },
        onError: (err) => {
          setAiPreviewError(err?.message || 'AI enhancement failed.')
          setAiPreview(prev => prev ? { ...prev, isStreaming: false } : null)
          setEnhancingExpId(null)
        }
      })
    } catch (err) {
      setAiPreviewError(err?.response?.data?.error || err?.message || 'AI enhancement failed. Please try again.')
      setAiPreview(prev => prev ? { ...prev, isStreaming: false } : null)
      setEnhancingExpId(null)
    }
  }

  // AI Auto-Enhance Project with Gemini (real-time streaming preview)
  const handleEnhanceProject = async (projectId, promptOverride) => {
    const proj = data.projects.find(p => p.id === projectId)
    if (!proj || (!proj.desc?.trim() && !proj.name?.trim())) return
    const customPrompt = (promptOverride !== undefined ? promptOverride : projectAiPrompts[projectId] || '').trim()
    setEnhancingProjectId(projectId)
    setAiPreviewError(null)
    setAiPreview({
      type: 'project',
      targetId: projectId,
      original: proj.desc || proj.name || '',
      customPrompt,
      enhanced: '',
      isStreaming: true,
    })

    try {
      let accumulated = ''
      await streamEnhanceSectionWithAI({
        section: 'projects',
        content: `Project Name: ${proj.name || 'Project'}\nDescription: ${proj.desc || '(No description yet)'}`,
        context: { role: data.personal.title, skills: data.skills, customPrompt }
      }, {
        onChunk: (chunk, fullText) => {
          accumulated = fullText
          setAiPreview(prev => prev ? { ...prev, enhanced: fullText } : null)
        },
        onDone: (result, fullText) => {
          const finalEnhanced = result?.enhanced || fullText || accumulated
          setAiPreview(prev => prev ? { ...prev, enhanced: finalEnhanced, isStreaming: false } : null)
          setEnhancingProjectId(null)
        },
        onError: (err) => {
          setAiPreviewError(err?.message || 'AI enhancement failed.')
          setAiPreview(prev => prev ? { ...prev, isStreaming: false } : null)
          setEnhancingProjectId(null)
        }
      })
    } catch (err) {
      setAiPreviewError(err?.response?.data?.error || err?.message || 'AI enhancement failed. Please try again.')
      setAiPreview(prev => prev ? { ...prev, isStreaming: false } : null)
      setEnhancingProjectId(null)
    }
  }

  // Apply AI enhancement from preview modal
  const handleApplyAiPreview = () => {
    if (!aiPreview || aiPreview.isStreaming) return
    if (aiPreview.type === 'summary') {
      upd('summary', aiPreview.enhanced)
    } else if (aiPreview.type === 'bullets' && aiPreview.targetId) {
      updExp(aiPreview.targetId, 'bullets', aiPreview.enhanced)
    } else if (aiPreview.type === 'project' && aiPreview.targetId) {
      upd('projects', data.projects.map(p => p.id === aiPreview.targetId ? { ...p, desc: aiPreview.enhanced } : p))
    }
    setAiPreview(null)
  }

  // Regenerate from preview modal with optional prompt override
  const handleRegenerateAiPreview = (promptOverride) => {
    if (!aiPreview || aiPreview.isStreaming) return
    const { type, targetId, customPrompt: existingPrompt } = aiPreview
    const promptToUse = promptOverride !== undefined ? promptOverride : (existingPrompt || '')
    if (type === 'summary') {
      handleEnhanceSummary(promptToUse)
    } else if (type === 'bullets' && targetId) {
      handleEnhanceBullets(targetId, promptToUse)
    } else if (type === 'project' && targetId) {
      handleEnhanceProject(targetId, promptToUse)
    }
  }

  /* ── Direct Vector PDF Export with 100% Selectable Text & Active Hyperlinks ── */
  const handlePrint = async () => {
    const resumeElem = document.getElementById('printable-resume')
    if (!resumeElem) {
      window.print()
      return
    }

    // ── Quota check for free-plan users ──
    if (!exportQuota.unlimited) {
      if (exportQuota.used >= exportQuota.limit) {
        setShowUpgradeModal(true)
        return
      }
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
    /* Remove screenshot protection styles from PDF */
    .resume-capture-protected {
      user-select: auto !important;
      -webkit-user-select: auto !important;
      -webkit-user-drag: auto !important;
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

      // 1. Try Direct Vector PDF via Backend Puppeteer with JWT auth (auto-attached by Axios)
      let backendSuccess = false
      try {
        const response = await pdfApi.renderHtml(
          fullHtml,
          resumeTitle || data.personal.name || 'Resume'
        )

        if (response.data && response.data.size > 2000) {
          const url = window.URL.createObjectURL(response.data)
          const a = document.createElement('a')
          const safeName = (resumeTitle || data.personal.name || 'Resume').replace(/[^a-zA-Z0-9_-]/g, '_')
          a.href = url
          a.download = `${safeName}.pdf`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          window.URL.revokeObjectURL(url)
          backendSuccess = true
        }
      } catch (apiErr) {
        // Handle quota exceeded (429)
        if (apiErr.response?.status === 429) {
          setIsGeneratingPdf(false)
          let errData = apiErr.response.data
          if (errData instanceof Blob) {
            try {
              const text = await errData.text()
              errData = JSON.parse(text)
            } catch {
              errData = {}
            }
          }
          setExportQuota(prev => ({
            ...prev,
            used: (errData && errData.used !== undefined) ? errData.used : prev.used,
            limit: (errData && errData.limit !== undefined) ? errData.limit : prev.limit,
          }))
          setShowUpgradeModal(true)
          return
        }
        console.warn('Backend vector PDF failed, trying browser fallback:', apiErr?.message)
      }

      if (backendSuccess) {
        setIsGeneratingPdf(false)
        // Update quota count after successful export
        if (!exportQuota.unlimited) {
          setExportQuota(prev => ({ ...prev, used: prev.used + 1 }))
        }
        return
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
        // Update quota for browser print fallback too
        if (!exportQuota.unlimited) {
          setExportQuota(prev => ({ ...prev, used: prev.used + 1 }))
        }
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
      <header className="px-2.5 sm:px-4 py-2 border-b flex items-center justify-between gap-2 overflow-x-auto scrollbar-none z-20 flex-shrink-0 transition-colors"
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
              className={`text-xs font-bold bg-transparent outline-none border-none py-0.5 w-[110px] sm:w-[150px] md:w-[195px] truncate ${
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
                    className="text-xs py-1.5 pr-2.5 pl-0.5 font-semibold w-auto max-w-[130px] sm:max-w-[200px] md:max-w-[300px] truncate cursor-pointer outline-none border-none focus:ring-0 appearance-none bg-transparent">
              {TEMPLATES.map(t => (
                <option key={t} value={t} style={{ backgroundColor: isLight ? '#ffffff' : '#141842', color: isLight ? '#0f172a' : '#f8fafc', fontWeight: 500 }}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Font Dropdown with Icon */}
          <div className={`hidden sm:flex items-center gap-1.5 border rounded-lg shadow-sm transition-colors ${
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
          <div className={`hidden md:flex items-center gap-1 border rounded-lg px-2 py-1 transition-colors ${
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
                  className={`hidden sm:flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                    isLight
                      ? 'bg-slate-100 hover:bg-slate-200 text-amber-600 border border-slate-300'
                      : 'bg-[#141740] hover:bg-[#1e235e] text-amber-400 border border-purple-500/20 shadow-inner'
                  }`}>
            {isDark ? <Sun size={13} className="text-amber-400" /> : <Moon size={13} className="text-indigo-600" />}
            <span className="hidden sm:inline">{isDark ? 'Light' : 'Dark'}</span>
          </button>

          {/* AI Active Badge (Server-side — no user configuration needed) */}
          <div
            title="AI Resume Intelligence Active (Powered by server-side AI)"
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg font-medium text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 shadow-sm"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <Sparkles size={12} className="text-emerald-400" />
            <span className="hidden sm:inline font-semibold">AI Active</span>
          </div>

          {/* Zoom controls */}
          <div className={`hidden xl:flex items-center gap-1 border rounded-lg px-2 py-1 transition-colors ${
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

          {/* Autosave / Save Status Indicator & Manual Save Button */}
          <button
            onClick={handleSaveResume}
            disabled={saveStatus === 'saving'}
            className={`flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              saveStatus === 'saved'
                ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/40'
                : saveStatus === 'saving'
                  ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40 animate-pulse'
                  : saveStatus === 'error'
                    ? 'bg-red-600/20 text-red-400 border border-red-500/40'
                    : isLight
                      ? 'bg-white hover:bg-slate-50 text-purple-700 border border-purple-200 shadow-sm'
                      : 'bg-[#141740] hover:bg-purple-600/20 text-purple-300 border border-purple-500/30'
            }`}
            title="Autosave active. Click to save now."
          >
            {saveStatus === 'saving' ? (
              <>
                <Loader2 size={13} className="animate-spin text-purple-300" />
                <span>Saving...</span>
              </>
            ) : saveStatus === 'saved' ? (
              <>
                <Check size={13} className="text-emerald-400" />
                <span>Saved ✓</span>
              </>
            ) : saveStatus === 'error' ? (
              <>
                <AlertCircle size={13} className="text-red-400" />
                <span>Save failed ⚠</span>
              </>
            ) : (
              <>
                <Save size={13} />
                <span>Save</span>
              </>
            )}
          </button>

          {/* 1-Click Role Examples / Presets */}
          <button
            type="button"
            onClick={() => setIsPresetsModalOpen(true)}
            className={`flex items-center gap-1.5 text-xs px-2.5 sm:px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer border ${
              isLight
                ? 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200'
                : 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border-purple-500/30'
            }`}
            title="Load high-converting sample resumes for your role"
          >
            <BookOpen size={13} />
            <span className="hidden sm:inline">Role Examples</span>
            <span className="sm:hidden">Examples</span>
          </button>

          {/* Target Job Description Matcher */}
          <button
            type="button"
            onClick={() => setIsJdModalOpen(true)}
            className={`flex items-center gap-1.5 text-xs px-2.5 sm:px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer border ${
              isLight
                ? 'bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border-cyan-200'
                : 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
            }`}
            title="Match resume against any job description"
          >
            <Search size={13} />
            <span className="hidden sm:inline">Job Matcher</span>
            <span className="sm:hidden">Match</span>
          </button>

          {/* Download & Multi-Export Menu */}
          <div className="relative flex items-center">
            <button
              onClick={handlePrint}
              disabled={isGeneratingPdf}
              className="btn-primary text-xs px-2.5 sm:px-3 py-1.5 rounded-l-lg rounded-r-none gap-1 sm:gap-1.5 shadow-lg shadow-purple-600/20 font-semibold cursor-pointer disabled:opacity-75 whitespace-nowrap"
            >
              {isGeneratingPdf ? (
                <>
                  <Sparkles size={13} className="animate-spin text-purple-200" />
                  <span>Exporting Vector PDF...</span>
                </>
              ) : (
                <>
                  <Download size={13} />
                  <span className="hidden sm:inline">Download PDF</span>
                  <span className="sm:hidden">PDF</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setIsExportMenuOpen(v => !v)}
              className="btn-primary text-xs px-1.5 py-1.5 rounded-r-lg rounded-l-none border-l border-white/20 cursor-pointer"
              title="More export options (JSON backup, Plain Text, Import)"
            >
              <ChevronDown size={14} />
            </button>

            {/* Export Dropdown Menu */}
            {isExportMenuOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-56 rounded-xl border shadow-2xl p-1.5 z-50 animate-fade-in flex flex-col gap-1"
                style={{
                  background: isLight ? '#ffffff' : '#111338',
                  borderColor: isLight ? '#cbd5e1' : 'rgba(124,58,237,.35)'
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    handlePrint()
                    setIsExportMenuOpen(false)
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors ${
                    isLight ? 'hover:bg-purple-50 text-slate-800' : 'hover:bg-white/10 text-slate-200'
                  }`}
                >
                  <Download size={13} className="text-purple-400" />
                  <span>Direct Vector PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    exportResumeToJson(data, resumeTitle)
                    setIsExportMenuOpen(false)
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors ${
                    isLight ? 'hover:bg-purple-50 text-slate-800' : 'hover:bg-white/10 text-slate-200'
                  }`}
                >
                  <FileText size={13} className="text-cyan-400" />
                  <span>Export JSON Backup (.json)</span>
                </button>

                <button
                  type="button"
                  onClick={() => jsonImportInputRef.current?.click()}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors ${
                    isLight ? 'hover:bg-purple-50 text-slate-800' : 'hover:bg-white/10 text-slate-200'
                  }`}
                >
                  <Upload size={13} className="text-amber-400" />
                  <span>Import JSON Backup</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyPlainText}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors ${
                    isLight ? 'hover:bg-purple-50 text-slate-800' : 'hover:bg-white/10 text-slate-200'
                  }`}
                >
                  {plainTextCopied ? (
                    <CheckCheck size={13} className="text-emerald-400" />
                  ) : (
                    <Copy size={13} className="text-emerald-400" />
                  )}
                  <span>{plainTextCopied ? 'Copied to Clipboard!' : 'Copy Plain Text (TXT for ATS)'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Free-plan export quota badge */}
          {user && !exportQuota.unlimited && (
            <span className={`hidden md:inline text-[10px] font-medium px-2 py-0.5 rounded-full select-none whitespace-nowrap ${
              exportQuota.used >= exportQuota.limit
                ? (isLight ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-red-500/15 text-red-400 border border-red-500/25')
                : (isLight ? 'bg-slate-100 text-slate-600 border border-slate-200' : 'bg-slate-700/50 text-slate-400 border border-slate-600/40')
            }`}>
              {exportQuota.used >= exportQuota.limit
                ? `${exportQuota.limit}/${exportQuota.limit} used`
                : `${exportQuota.limit - exportQuota.used} export${exportQuota.limit - exportQuota.used !== 1 ? 's' : ''} left`
              }
            </span>
          )}
        </div>
      </header>

      {/* ── Main Workspace: Editor Panel & Preview Canvas ── */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* ── Left Editor Panel ── */}
        {(viewMode === 'edit' || viewMode === 'split') && (
          <aside className={`flex flex-col border-r overflow-hidden flex-shrink-0 transition-all ${viewMode === 'edit' ? 'w-full max-w-3xl mx-auto border-none' : 'w-full md:w-[400px]'}`}
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

              {/* Interactive ATS Score Meter */}
              <button
                type="button"
                onClick={() => setIsAtsModalOpen(true)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                  isLight
                    ? 'bg-slate-50 hover:bg-slate-100 border-slate-300'
                    : 'bg-white/5 hover:bg-white/10 border-white/10'
                }`}
                title="Click for full ATS scorecard & optimization checklist"
              >
                <Target size={13} style={{ color: scoreColor }} />
                <span className="text-slate-400 text-[11px]">ATS:</span>
                <span style={{ color: scoreColor }}>{score}%</span>
                <span
                  className="text-[10px] px-1.5 py-0.2 rounded font-medium ml-0.5"
                  style={{ background: `${scoreColor}22`, color: scoreColor }}
                >
                  {atsAudit.grade.split(' ')[0]}
                </span>
              </button>
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
                      <div className="flex flex-col gap-1.5 mt-2.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Custom AI Prompt (optional)</label>
                          <span className="text-[10px] text-emerald-400 font-medium">● AI Engine Ready</span>
                        </div>
                        <input
                          type="text"
                          value={summaryAiPrompt}
                          onChange={e => setSummaryAiPrompt(e.target.value)}
                          placeholder="e.g. Focus on cloud architecture and team mentorship. Keep under 3 sentences."
                          className="form-input text-xs py-1.5 px-3 w-full"
                          maxLength={1000}
                        />
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[10px] text-slate-500">Live preview opens before replacing text.</span>
                          <button
                            type="button"
                            onClick={() => handleEnhanceSummary()}
                            disabled={isEnhancingSummary || !data.summary?.trim()}
                            className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Sparkles size={12} className={isEnhancingSummary ? 'animate-pulse' : ''} />
                            <span>{isEnhancingSummary ? 'Enhancing Summary...' : 'AI Enhance Summary'}</span>
                          </button>
                        </div>
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
                              <div className="flex flex-col gap-1.5">
                                <div className="flex items-center justify-between">
                                  <label className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Bullet Points (one per line)</label>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setIsActionVerbsModalOpen(true)}
                                      className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 transition-colors font-semibold cursor-pointer"
                                      title="Browse high-impact action verbs"
                                    >
                                      <Zap size={11} />
                                      <span>Action Verbs</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleEnhanceBullets(exp.id)}
                                      disabled={enhancingExpId === exp.id || !exp.bullets.some(b => b && b.trim())}
                                      className="flex items-center gap-1 text-[11px] text-purple-400 hover:text-purple-300 transition-colors font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      <Sparkles size={11} className={enhancingExpId === exp.id ? 'animate-pulse' : ''} />
                                      <span>{enhancingExpId === exp.id ? 'Enhancing...' : 'AI Enhance Bullets'}</span>
                                    </button>
                                  </div>
                                </div>
                                <textarea value={exp.bullets.join('\n')}
                                          onChange={e => updExp(exp.id, 'bullets', e.target.value.split('\n'))}
                                          className="form-input text-xs py-2 px-3 resize-none" rows={3}
                                          placeholder="Describe your technical achievements..." />
                                <div className="flex items-center gap-2 mt-0.5">
                                  <input
                                    type="text"
                                    value={expAiPrompts[exp.id] || ''}
                                    onChange={e => setExpAiPrompts(prev => ({ ...prev, [exp.id]: e.target.value }))}
                                    placeholder="Custom prompt (optional): e.g. Action verbs, emphasize scale..."
                                    className="form-input text-[11px] py-1 px-2.5 flex-1"
                                    maxLength={1000}
                                  />
                                </div>
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
                      <p className={`text-xs mb-3 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                        Assign each skill to a category. Categories are saved with the resume; no keyword guessing is used.
                      </p>
                      <div className="flex flex-col gap-2 mb-3">
                        {data.skills.map(sk => (
                          <div key={sk} className="grid grid-cols-[minmax(0,1fr)_minmax(130px,0.9fr)_auto] gap-2 items-center">
                            <span className={`text-xs break-words ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{sk}</span>
                            <input
                              aria-label={`Category for ${sk}`}
                              list="resume-skill-category-options"
                              value={data.skillCategories?.[sk] || ''}
                              onChange={e => setSkillCategory(sk, e.target.value)}
                              className="form-input text-xs py-2 px-2 min-w-0"
                              placeholder="Category"
                            />
                            <button aria-label={`Remove ${sk}`} onClick={() => removeSkill(sk)} className="text-purple-400/50 hover:text-red-400 transition-colors px-1">×</button>
                          </div>
                        ))}
                      </div>
                      <datalist id="resume-skill-category-options">
                        {['Languages', 'Frameworks & Runtime', 'Libraries', 'Databases', 'Developer Tools', 'Platforms & Operating Systems', 'Core Concepts', 'Cloud & DevOps', 'Testing & QA', 'Security', 'Data & Analytics'].map(category => <option key={category} value={category} />)}
                      </datalist>
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
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Description</label>
                            </div>
                            <Field value={p.desc} onChange={v => upd('projects', data.projects.map(x => x.id === p.id ? { ...x, desc: v } : x))} placeholder="Key features, technologies, and achievements..." multiline />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Custom AI Prompt (optional)</label>
                            <textarea
                              value={projectAiPrompts[p.id] || ''}
                              onChange={e => setProjectAiPrompts(current => ({ ...current, [p.id]: e.target.value }))}
                              placeholder="e.g. Highlight the architecture, tech stack, and my actual contribution. Do not invent metrics."
                              rows={2}
                              className="form-input text-xs py-2 px-3 w-full resize-y"
                              maxLength={1000}
                            />
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] text-slate-500">AI suggestions are previewed before replacing your description.</span>
                              <button
                                type="button"
                                onClick={() => handleEnhanceProject(p.id)}
                                disabled={enhancingProjectId === p.id || (!p.name?.trim() && !p.desc?.trim())}
                                className="flex items-center gap-1.5 text-[11px] text-purple-300 hover:text-purple-200 transition-colors font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Sparkles size={12} className={enhancingProjectId === p.id ? 'animate-spin' : ''} />
                                <span>{enhancingProjectId === p.id ? 'Generating...' : 'Generate with AI'}</span>
                              </button>
                            </div>
                          </div>
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
                {/* A4 Paper Badge indicator & Spacing Density */}
                <div className="mb-2.5 flex items-center justify-between w-full max-w-[794px] px-1 text-[11px] font-mono select-none flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded font-semibold flex items-center gap-1.5 ${
                      isLight
                        ? 'bg-purple-100 text-purple-800 border border-purple-200'
                        : 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                    }`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      A4 Standard
                    </span>
                    <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>
                      WYSIWYG Print Canvas
                    </span>
                  </div>

                  {/* FlowCV-style Spacing Density Switcher */}
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-400 mr-1 hidden sm:inline">Spacing:</span>
                    {(['compact', 'normal', 'relaxed']).map(mode => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setSpacingDensity(mode)}
                        className={`text-[10px] px-2 py-0.5 rounded capitalize transition-all cursor-pointer ${
                          spacingDensity === mode
                            ? (isLight ? 'bg-purple-600 text-white font-bold' : 'bg-purple-600 text-white font-bold')
                            : (isLight ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-white/5 text-slate-400 hover:bg-white/10')
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{
                  width: Math.round(A4_WIDTH_PX * (zoom / 100)),
                  minHeight: Math.round(A4_HEIGHT_PX * (zoom / 100)),
                  position: 'relative'
                }}>
                  <div
                    ref={previewResumeRef}
                    className={protectionClass}
                    style={{
                      width: `${A4_WIDTH_PX}px`,
                      minHeight: `${A4_HEIGHT_PX}px`,
                      transform: `scale(${zoom / 100})`,
                      transformOrigin: 'top left',
                      boxShadow: isLight
                        ? '0 12px 36px -4px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.08)'
                        : '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.12)',
                      userSelect: protectionClass ? 'none' : 'auto',
                      WebkitUserSelect: protectionClass ? 'none' : 'auto',
                      WebkitUserDrag: protectionClass ? 'none' : 'auto',
                    }}
                  >
                    <ResumeDoc
                      data={data}
                      accent={accent}
                      font={font}
                      template={template}
                      sectionOrder={sectionOrder}
                      fontSizeScale={fontSizeScale}
                      spacingDensity={spacingDensity}
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

      {/* ── AI Preview Error Toast ── */}
      {aiPreviewError && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md p-4 rounded-xl shadow-2xl flex items-start gap-3 bg-red-900/90 text-red-200 border border-red-500/40 backdrop-blur-md animate-fade-in">
          <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <p className="font-semibold text-red-100 mb-0.5">AI Enhancement Notice</p>
            <p>{aiPreviewError}</p>
          </div>
          <button onClick={() => setAiPreviewError(null)} className="text-red-300 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── AI Enhancement Preview Modal (Apply / Cancel / Regenerate / Manual Prompt) ── */}
      {aiPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-3xl rounded-2xl p-6 shadow-2xl border flex flex-col max-h-[92vh]"
               style={{ background: isLight ? '#ffffff' : '#0e1136', borderColor: isLight ? '#cbd5e1' : 'rgba(124,58,237,.35)' }}>
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b flex-shrink-0"
                 style={{ borderColor: isLight ? '#e2e8f0' : 'rgba(255,255,255,.1)' }}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-base" style={{ color: isLight ? '#0f172a' : '#f8fafc' }}>
                    AI Enhancement Preview
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Review suggested changes before applying. Add manual instructions below to customize results.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAiPreview(null)}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isLight ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-100' : 'text-slate-400 hover:text-slate-100 hover:bg-white/10'
                }`}
                title="Cancel"
              >
                <X size={18} />
              </button>
            </div>

            {/* Manual Prompt Input Section (Interactive In-Modal Customization) */}
            <div className="mt-3.5 p-3 rounded-xl flex flex-col gap-2 flex-shrink-0"
                 style={{
                   background: isLight ? '#f8fafc' : 'rgba(124,58,237,.06)',
                   border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(124,58,237,.2)'}`
                 }}>
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5"
                       style={{ color: isLight ? '#6b21a8' : '#c084fc' }}>
                  <Sparkles size={12} />
                  Manual Prompt / AI Instructions
                </label>
                <span className="text-[10px]" style={{ color: isLight ? '#64748b' : '#94a3b8' }}>
                  Press Enter or click Update to re-generate with prompt
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={aiPreview.customPrompt || ''}
                  onChange={(e) => {
                    const val = e.target.value
                    setAiPreview(prev => prev ? { ...prev, customPrompt: val } : null)
                    if (aiPreview.type === 'summary') setSummaryAiPrompt(val)
                    else if (aiPreview.type === 'bullets' && aiPreview.targetId) setExpAiPrompts(prev => ({ ...prev, [aiPreview.targetId]: val }))
                    else if (aiPreview.type === 'project' && aiPreview.targetId) setProjectAiPrompts(prev => ({ ...prev, [aiPreview.targetId]: val }))
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !aiPreview.isStreaming) {
                      e.preventDefault()
                      handleRegenerateAiPreview(aiPreview.customPrompt)
                    }
                  }}
                  placeholder="e.g. Make it concise, highlight leadership & metrics, tailor for Senior role..."
                  className="form-input text-xs py-2 px-3 flex-1"
                  maxLength={1000}
                />
                <button
                  type="button"
                  onClick={() => handleRegenerateAiPreview(aiPreview.customPrompt)}
                  disabled={aiPreview.isStreaming || isEnhancingSummary || !!enhancingExpId || !!enhancingProjectId}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border border-purple-500/40 text-purple-300 bg-purple-500/15 hover:bg-purple-500/25 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  title="Re-run AI with these instructions"
                >
                  <RefreshCw size={12} className={aiPreview.isStreaming || isEnhancingSummary || !!enhancingExpId || !!enhancingProjectId ? 'animate-spin' : ''} />
                  <span>Update</span>
                </button>
              </div>

              {/* Quick suggestion tags */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[10px] text-slate-400 mr-1">Suggestions:</span>
                {[
                  'Make it concise (3-4 sentences)',
                  'Focus on leadership & impact',
                  'Add strong action verbs',
                  'Optimize ATS keywords',
                  'Tailor for Senior role'
                ].map(chip => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => {
                      setAiPreview(prev => prev ? { ...prev, customPrompt: chip } : null)
                      if (aiPreview.type === 'summary') setSummaryAiPrompt(chip)
                      else if (aiPreview.type === 'bullets' && aiPreview.targetId) setExpAiPrompts(prev => ({ ...prev, [aiPreview.targetId]: chip }))
                      else if (aiPreview.type === 'project' && aiPreview.targetId) setProjectAiPrompts(prev => ({ ...prev, [aiPreview.targetId]: chip }))
                      if (!aiPreview.isStreaming) {
                        handleRegenerateAiPreview(chip)
                      }
                    }}
                    className="text-[10px] px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                    style={{
                      background: isLight ? '#ffffff' : 'rgba(255,255,255,.06)',
                      color: isLight ? '#475569' : '#cbd5e1',
                      border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,.12)'}`
                    }}
                  >
                    + {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Error Notification inside modal if regeneration fails */}
            {aiPreviewError && (
              <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center justify-between">
                <span>{aiPreviewError}</span>
                <button
                  type="button"
                  onClick={() => handleRegenerateAiPreview(aiPreview.customPrompt)}
                  className="underline font-semibold text-red-300 hover:text-red-200 cursor-pointer ml-3"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Comparison Body */}
            <div className="py-3.5 space-y-4 overflow-y-auto flex-1 pr-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Original */}
                <div className="rounded-xl p-4 flex flex-col"
                     style={{ background: isLight ? '#f8fafc' : 'rgba(255,255,255,.03)', border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,.08)'}` }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Original</span>
                    <span className="text-[10px] text-slate-500">Current</span>
                  </div>
                  <div className="text-xs leading-relaxed overflow-y-auto flex-1 font-sans"
                       style={{ color: isLight ? '#334155' : '#94a3b8' }}>
                    {aiPreview.type === 'summary' || aiPreview.type === 'project' ? (
                      <p className="whitespace-pre-wrap">{aiPreview.original || '(No content entered)'}</p>
                    ) : (
                      <ul className="list-disc list-inside space-y-1.5">
                        {Array.isArray(aiPreview.original) ? (
                          aiPreview.original.map((b, i) => <li key={i} style={{ color: isLight ? '#334155' : '#94a3b8' }}>{b}</li>)
                        ) : (
                          <li>{String(aiPreview.original)}</li>
                        )}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Enhanced */}
                <div className="rounded-xl p-4 flex flex-col"
                     style={{ background: isLight ? '#f0fdf4' : 'rgba(16,185,129,.05)', border: `1px solid ${isLight ? '#86efac' : 'rgba(16,185,129,.3)'}` }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-500 flex items-center gap-1.5">
                      <Sparkles size={12} className={aiPreview.isStreaming ? 'text-cyan-400 animate-pulse' : 'text-emerald-500'} />
                      {aiPreview.isStreaming ? 'Streaming AI...' : 'AI Enhanced'}
                    </span>
                    {aiPreview.isStreaming ? (
                      <span className="text-[10px] text-cyan-400 font-mono flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        Live Stream
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400/90 font-medium">Ready to Apply</span>
                    )}
                  </div>
                  <div className="text-xs leading-relaxed overflow-y-auto flex-1 font-sans"
                       style={{ color: isLight ? '#14532d' : '#e2e8f0' }}>
                    {aiPreview.type === 'summary' || aiPreview.type === 'project' ? (
                      <p className="whitespace-pre-wrap font-medium">
                        {aiPreview.enhanced || (aiPreview.isStreaming ? 'Connecting to Gemini AI stream...' : '')}
                        {aiPreview.isStreaming && (
                          <span className="inline-block w-1.5 h-3.5 ml-1 bg-cyan-400 animate-pulse align-middle rounded-sm shadow-[0_0_8px_#22d3ee]" />
                        )}
                      </p>
                    ) : (
                      <ul className="list-disc list-inside space-y-1.5">
                        {Array.isArray(aiPreview.enhanced) && aiPreview.enhanced.length > 0 ? (
                          aiPreview.enhanced.map((b, i) => <li key={i} className="font-medium">{b}</li>)
                        ) : (
                          <li className="font-medium">
                            {aiPreview.rawText || (aiPreview.isStreaming ? 'Connecting to Gemini AI stream...' : String(aiPreview.enhanced))}
                            {aiPreview.isStreaming && (
                              <span className="inline-block w-1.5 h-3.5 ml-1 bg-cyan-400 animate-pulse align-middle rounded-sm shadow-[0_0_8px_#22d3ee]" />
                            )}
                          </li>
                        )}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t flex-shrink-0"
                 style={{ borderColor: isLight ? '#e2e8f0' : 'rgba(255,255,255,.1)' }}>
              <button
                type="button"
                onClick={() => setAiPreview(null)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer border ${
                  isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300' : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                }`}
              >
                Cancel / Keep Original
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleRegenerateAiPreview(aiPreview.customPrompt)}
                  disabled={aiPreview.isStreaming || isEnhancingSummary || !!enhancingExpId || !!enhancingProjectId}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 border border-purple-500/30 text-purple-300 hover:bg-purple-500/15 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw size={12} className={aiPreview.isStreaming || isEnhancingSummary || !!enhancingExpId || !!enhancingProjectId ? 'animate-spin' : ''} />
                  <span>Regenerate</span>
                </button>

                <button
                  type="button"
                  onClick={handleApplyAiPreview}
                  disabled={aiPreview.isStreaming}
                  className="btn-primary text-xs px-4 py-2 rounded-xl font-semibold shadow-lg shadow-purple-600/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {aiPreview.isStreaming ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Streaming...</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>Apply Changes</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ATS Score Audit Modal ── */}
      {isAtsModalOpen && (
        <AtsAuditModal
          audit={atsAudit}
          onClose={() => setIsAtsModalOpen(false)}
          onOptimizeSummary={() => {
            setIsAtsModalOpen(false)
            handleEnhanceSummary()
          }}
          isLight={isLight}
        />
      )}

      {/* ── Role Presets & Sample Resumes Modal ── */}
      {isPresetsModalOpen && (
        <RolePresetsModal
          presets={ROLE_PRESETS}
          onSelectPreset={(preset) => {
            setData(preset.data)
            setResumeTitle(preset.title)
            setIsPresetsModalOpen(false)
          }}
          onClose={() => setIsPresetsModalOpen(false)}
          isLight={isLight}
        />
      )}

      {/* ── Target Job Description Matcher Modal ── */}
      {isJdModalOpen && (
        <JobMatcherModal
          jdText={jdText}
          setJdText={setJdText}
          analysis={analyzeJobDescriptionMatch(jdText, data)}
          onAddSkill={(skill) => {
            const trimmed = skill.trim()
            if (trimmed && !data.skills.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
              setData(d => ({ ...d, skills: [...d.skills, trimmed] }))
            }
          }}
          onClose={() => setIsJdModalOpen(false)}
          isLight={isLight}
        />
      )}

      {/* ── Action Verbs Power Bank Modal ── */}
      {isActionVerbsModalOpen && (
        <ActionVerbsModal
          categories={ACTION_VERBS}
          onClose={() => setIsActionVerbsModalOpen(false)}
          isLight={isLight}
        />
      )}

      {/* Hidden JSON file input for importing */}
      <input
        ref={jsonImportInputRef}
        type="file"
        accept=".json"
        onChange={handleImportJsonFile}
        className="hidden"
      />

      {/* ── Screenshot Protection Black Overlay ── */}
      {overlayVisible && (
        <div
          className="fixed inset-0 z-[99999] bg-black flex items-center justify-center"
          style={{ cursor: 'not-allowed' }}
        >
          <div className="text-center">
            <Shield size={48} className="text-white/30 mx-auto mb-3" />
            <p className="text-white/50 text-sm font-medium">Resume content is protected</p>
            <p className="text-white/30 text-xs mt-1">Return to the tab to continue editing</p>
          </div>
        </div>
      )}

      {/* ── Upgrade Modal (Export Quota Exhausted) ── */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
             onClick={() => setShowUpgradeModal(false)}>
          <div className={`w-full max-w-md rounded-2xl p-6 shadow-2xl border ${
            isLight ? 'bg-white border-slate-200' : 'bg-[#0e1136] border-purple-500/30'
          }`}
               onClick={e => e.stopPropagation()}>
            <div className="text-center">
              <div className={`inline-flex items-center justify-center w-14 h-14 rounded-full mb-4 ${
                isLight ? 'bg-orange-100' : 'bg-orange-500/15'
              }`}>
                <AlertCircle size={28} className="text-orange-500" />
              </div>
              <h3 className={`text-lg font-bold mb-2 ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}>Monthly Export Limit Reached</h3>
              <p className={`text-sm mb-1 ${
                isLight ? 'text-slate-600' : 'text-slate-400'
              }`}>
                You've used all <strong>{exportQuota.limit}</strong> free exports this month.
              </p>
              <p className={`text-xs mb-5 ${
                isLight ? 'text-slate-500' : 'text-slate-500'
              }`}>
                Your limit resets at the start of next month (UTC).
              </p>
              <div className="flex flex-col gap-2.5">
                <Link
                  to="/pricing"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-lg shadow-purple-600/25 transition-all"
                >
                  <Zap size={15} />
                  Upgrade to Pro — Unlimited Exports
                </Link>
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className={`w-full px-4 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                    isLight ? 'text-slate-600 hover:bg-slate-100' : 'text-slate-400 hover:bg-white/5'
                  }`}
                >
                  Maybe Later
                </button>
              </div>
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
          .resume-capture-protected {
            user-select: auto !important;
            -webkit-user-select: auto !important;
            -webkit-user-drag: auto !important;
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
