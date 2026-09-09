import { useState, useEffect, useCallback } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, FileText, Target, Mail, CreditCard,
  Settings, LogOut, Plus, TrendingUp,
  Zap, Clock, Star, Download, Edit2, Trash2,
  User, Briefcase, Phone, MapPin, Globe, Check, AlertCircle,
  Save, Key, ShieldCheck, Sparkles, ExternalLink, ArrowRight,
  Loader2, LayoutTemplate, RefreshCw
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { supabase } from '../lib/supabase'
import { resumeApi, coverLetterApi } from '../lib/api'
import { resumeStorage } from '../lib/resumeStorage'

const navItems = [
  { id: 'dashboard',   icon: LayoutDashboard, label: 'Dashboard',    isTab: true },
  { id: 'resumes',     icon: FileText,        label: 'My Resumes',   isTab: true },
  { id: 'ats',         icon: Target,          label: 'ATS Checker',  href: '/ats-checker' },
  { id: 'cover-letter',icon: Mail,            label: 'Cover Letters',href: '/cover-letter' },
  { id: 'templates',   icon: Star,            label: 'Templates',    href: '/templates' },
  { id: 'billing',     icon: CreditCard,      label: 'Billing',      href: '/pricing' },
  { id: 'settings',    icon: Settings,        label: 'Settings',     isTab: true },
]

/* ── Relative time helper ──────────────────────────────────── */
function timeAgo(dateStr) {
  if (!dateStr) return ''
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now - date
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)
  const diffWeek = Math.floor(diffDay / 7)
  const diffMonth = Math.floor(diffDay / 30)

  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin} min${diffMin > 1 ? 's' : ''} ago`
  if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? 's' : ''} ago`
  if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`
  if (diffWeek < 5) return `${diffWeek} week${diffWeek > 1 ? 's' : ''} ago`
  return `${diffMonth} month${diffMonth > 1 ? 's' : ''} ago`
}

function ScoreRing({ score, size = 64 }) {
  if (score == null) return null
  const r = (size - 8) / 2
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  const color = score >= 80 ? '#10B981' : score >= 60 ? '#F59E0B' : '#EF4444'
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="4"
                strokeLinecap="round" strokeDasharray={`${dash} ${circ}`}
                style={{ transition: 'stroke-dasharray 1s ease' }} />
      </svg>
      <div className="absolute text-center">
        <div className="font-heading font-bold text-xs" style={{ color }}>{score}</div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user, profile, signOut, updateProfile, getUserDefaults } = useAuth()
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const activeTab = tabParam === 'settings' ? 'settings' : tabParam === 'resumes' ? 'resumes' : 'dashboard'

  // Dynamic logged in user names
  const fullName = profile?.full_name || user?.user_metadata?.full_name || ''
  const firstName = fullName ? fullName.trim().split(' ')[0] : (user?.email ? user.email.split('@')[0] : 'Professional')
  const displayName = fullName || (user?.email ? user.email.split('@')[0] : 'User')
  const userInitial = (firstName || 'U')[0].toUpperCase()
  const planLabel = (profile?.plan === 'lifetime') ? 'Lifetime Pro' : (profile?.plan === 'pro') ? 'Pro Plan' : 'Free Plan'

  // ── Real Data State ──────────────────────────────────────────
  const [resumes, setResumes] = useState([])
  const [coverLetters, setCoverLetters] = useState([])
  const [loadingData, setLoadingData] = useState(true)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  // Fetch real data from storage + API
  const fetchDashboardData = useCallback(async () => {
    setLoadingData(true)
    try {
      const [resumeList, clRes] = await Promise.allSettled([
        resumeStorage.list(user),
        coverLetterApi.list(),
      ])
      if (resumeList.status === 'fulfilled') setResumes(resumeList.value || [])
      if (clRes.status === 'fulfilled') setCoverLetters(clRes.value.data || [])
    } catch (err) {
      console.warn('Failed to fetch dashboard data:', err)
    } finally {
      setLoadingData(false)
    }
  }, [user])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  // Compute real stats
  const resumeCount = resumes.length
  const avgAts = resumeCount > 0
    ? Math.round(resumes.reduce((sum, r) => sum + (r.ats_score || 0), 0) / resumes.filter(r => r.ats_score != null).length) || 0
    : 0
  const hasAtsScores = resumes.some(r => r.ats_score != null)
  const coverLetterCount = coverLetters.length
  const uniqueTemplates = new Set(resumes.map(r => r.template).filter(Boolean)).size

  const computedStats = [
    { label: 'Resumes Created', value: String(resumeCount), change: resumeCount > 0 ? `${resumeCount} total` : 'Create your first!', up: resumeCount > 0, icon: FileText },
    { label: 'Avg ATS Score', value: hasAtsScores ? `${avgAts}%` : 'N/A', change: hasAtsScores ? 'From your resumes' : 'No scores yet', up: avgAts >= 70, icon: TrendingUp },
    { label: 'Cover Letters', value: String(coverLetterCount), change: coverLetterCount > 0 ? `${coverLetterCount} created` : 'Create one', up: coverLetterCount > 0, icon: Mail },
    { label: 'Templates Used', value: String(uniqueTemplates), change: uniqueTemplates > 0 ? `${uniqueTemplates} different` : 'Try templates!', up: uniqueTemplates > 0, icon: LayoutTemplate },
  ]

  // Generate real activity feed from resume/cover letter data
  const realActivities = [
    ...resumes.map(r => ({
      action: r.updated_at !== r.created_at
        ? `Edited "${r.title}"`
        : `Created "${r.title}"`,
      time: timeAgo(r.updated_at || r.created_at),
      date: new Date(r.updated_at || r.created_at),
      icon: r.updated_at !== r.created_at ? Edit2 : FileText,
      color: r.updated_at !== r.created_at ? '#7C3AED' : '#F59E0B',
    })),
    ...coverLetters.map(cl => ({
      action: `Created cover letter "${cl.title || 'Untitled'}"`,
      time: timeAgo(cl.created_at),
      date: new Date(cl.created_at),
      icon: Mail,
      color: '#EC4899',
    })),
  ].sort((a, b) => b.date - a.date).slice(0, 8)

  // Recently made resumes (within last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const recentResumes = resumes.filter(r => new Date(r.updated_at || r.created_at) >= sevenDaysAgo)

  // Delete resume handler
  const handleDeleteResume = async (id) => {
    try {
      await resumeStorage.delete(id, user)
      setResumes(prev => prev.filter(r => r.id !== id))
      setDeleteConfirm(null)
    } catch (err) {
      console.error('Failed to delete resume:', err)
    }
  }

  // Resume Renaming State (e.g. Data Science Resume, AIML Resume)
  const [renamingId, setRenamingId] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [isRenaming, setIsRenaming] = useState(false)

  const handleStartRename = (resume, e) => {
    if (e) e.stopPropagation()
    setRenamingId(resume.id)
    setRenameValue(resume.title || 'My Resume')
  }

  const handleSaveRename = async (id, overrideValue) => {
    const finalTitle = (overrideValue !== undefined ? overrideValue : renameValue).trim()
    if (!finalTitle) {
      setRenamingId(null)
      return
    }
    setIsRenaming(true)
    try {
      await resumeStorage.rename(id, finalTitle, user)
      setResumes(prev => prev.map(r => r.id === id ? { ...r, title: finalTitle } : r))
      setRenamingId(null)
    } catch (err) {
      console.error('Failed to rename resume:', err)
    } finally {
      setIsRenaming(false)
    }
  }

  // Settings State
  const [settingsTab, setSettingsTab] = useState('resume_profile') // 'resume_profile' | 'account'
  const [settingsForm, setSettingsForm] = useState({
    name: '',
    title: '',
    email: '',
    phone: '',
    location: '',
    linkedin: '',
    website: '',
    summary: '',
    skills: '',
  })
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  // Password State
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordStatus, setPasswordStatus] = useState({ loading: false, msg: '', error: false })

  // Initialize settings from user defaults
  useEffect(() => {
    if (user) {
      const defaults = getUserDefaults ? getUserDefaults() : {}
      setSettingsForm({
        name: defaults.name || fullName || '',
        title: defaults.title || '',
        email: defaults.email || user.email || '',
        phone: defaults.phone || '',
        location: defaults.location || '',
        linkedin: defaults.linkedin || '',
        website: defaults.website || '',
        summary: defaults.summary || '',
        skills: defaults.skills || '',
      })
    }
  }, [user, profile, getUserDefaults])

  const handleSettingsChange = (field, value) => {
    setSettingsForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSettingsSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSaveSuccess(false)
    setSaveError('')
    try {
      await updateProfile({
        full_name: settingsForm.name,
        name: settingsForm.name,
        title: settingsForm.title,
        email: settingsForm.email,
        phone: settingsForm.phone,
        location: settingsForm.location,
        linkedin: settingsForm.linkedin,
        website: settingsForm.website,
        summary: settingsForm.summary,
        skills: settingsForm.skills,
      })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 5000)
    } catch (err) {
      setSaveError(err.message || 'Failed to save settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordUpdate = async (e) => {
    e.preventDefault()
    if (!newPassword || newPassword.length < 6) {
      setPasswordStatus({ loading: false, msg: 'Password must be at least 6 characters.', error: true })
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ loading: false, msg: 'Passwords do not match.', error: true })
      return
    }
    setPasswordStatus({ loading: true, msg: '', error: false })
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setPasswordStatus({ loading: false, msg: 'Password updated successfully!', error: false })
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setPasswordStatus({ loading: false, msg: '', error: false }), 4000)
    } catch (err) {
      setPasswordStatus({ loading: false, msg: err.message || 'Failed to update password.', error: true })
    }
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className={`flex min-h-screen pt-[72px] ${isLight ? 'bg-slate-50 text-slate-900' : 'bg-[#080920] text-white'}`}>
      {/* Sidebar */}
      <aside className={`w-60 flex-shrink-0 border-r flex flex-col gap-1 px-3 py-6 sticky top-[72px] h-[calc(100vh-72px)] overflow-y-auto ${
        isLight ? 'bg-white border-slate-200' : 'bg-[#0D0F2E] border-purple-500/15'
      }`}>
        <div className="px-3 mb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Workspace</p>
        </div>

        {navItems.map((item) => {
          const isActive = item.isTab
            ? activeTab === item.id
            : false

          if (item.isTab) {
            return (
              <button
                key={item.label}
                onClick={() => {
                  if (item.id === 'settings') setSearchParams({ tab: 'settings' })
                  else if (item.id === 'resumes') setSearchParams({ tab: 'resumes' })
                  else setSearchParams({})
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 text-left cursor-pointer ${
                  isActive
                    ? 'text-purple-400 bg-purple-500/20 border border-purple-500/30 font-semibold shadow-sm'
                    : isLight
                      ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <item.icon size={16} />
                {item.label}
              </button>
            )
          }

          return (
            <Link
              key={item.label}
              to={item.href}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                isLight
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <item.icon size={16} />
              {item.label}
            </Link>
          )
        })}

        <div className={`mt-auto pt-4 border-t ${isLight ? 'border-slate-200' : 'border-purple-500/15'}`}>
          {/* User Profile Card */}
          <div
            onClick={() => setSearchParams({ tab: 'settings' })}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl mb-1.5 cursor-pointer transition-colors ${
              isLight ? 'bg-slate-100 hover:bg-slate-200' : 'bg-white/5 hover:bg-white/10'
            }`}
            title="Click to view profile & settings"
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm text-white flex-shrink-0"
                 style={{ background: 'linear-gradient(135deg,#7C3AED,#06B6D4)' }}>
              {userInitial}
            </div>
            <div className="min-w-0 flex-1">
              <div className={`text-xs font-semibold truncate ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                {displayName}
              </div>
              <div className="text-[10px] text-purple-400 font-medium truncate">
                {planLabel}
              </div>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors text-left"
          >
            <LogOut size={15} />
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 px-6 lg:px-10 py-8 overflow-y-auto max-w-7xl mx-auto">
        {activeTab === 'settings' ? (
          /* ═════════════════════════════════════════════════════════════ */
          /* SETTINGS VIEW                                               */
          /* ═════════════════════════════════════════════════════════════ */
          <div className="max-w-4xl">
            {/* Header */}
            <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-purple-400 mb-1">
                  <Settings size={14} /> ACCOUNT SETTINGS
                </div>
                <h1 className="font-heading font-bold text-2xl mb-1">
                  Profile & Default Resume Info
                </h1>
                <p className="text-slate-400 text-sm">
                  Save your personal details here once. New resumes, cover letters, and AI tools will automatically use these defaults.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSearchParams({})}
                  className={`text-xs px-3.5 py-2 rounded-xl border transition-colors ${
                    isLight ? 'border-slate-300 text-slate-700 hover:bg-slate-100' : 'border-white/10 text-slate-300 hover:bg-white/5'
                  }`}
                >
                  Back to Dashboard
                </button>
                <Link
                  to="/builder"
                  className="btn-primary text-xs px-4 py-2 rounded-xl flex items-center gap-1.5"
                >
                  <FileText size={14} /> Open Builder
                </Link>
              </div>
            </div>

            {/* Notification alerts */}
            {saveSuccess && (
              <div className="p-4 mb-6 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center gap-3 animate-fade-in">
                <Check size={18} className="text-emerald-400 flex-shrink-0" />
                <div className="text-sm font-medium">
                  Default details saved successfully! All new resumes and cover letters will automatically use this information.
                </div>
              </div>
            )}

            {saveError && (
              <div className="p-4 mb-6 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-300 flex items-center gap-3 animate-fade-in">
                <AlertCircle size={18} className="text-red-400 flex-shrink-0" />
                <div className="text-sm">{saveError}</div>
              </div>
            )}

            {/* Sub-tabs: Resume Defaults vs Account */}
            <div className="flex items-center gap-2 mb-6 border-b border-purple-500/20 pb-3">
              <button
                type="button"
                onClick={() => setSettingsTab('resume_profile')}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                  settingsTab === 'resume_profile'
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                    : isLight ? 'text-slate-600 hover:bg-slate-100' : 'text-slate-400 hover:bg-white/5'
                }`}
              >
                <User size={15} /> Resume Personal Defaults
              </button>
              <button
                type="button"
                onClick={() => setSettingsTab('account')}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                  settingsTab === 'account'
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                    : isLight ? 'text-slate-600 hover:bg-slate-100' : 'text-slate-400 hover:bg-white/5'
                }`}
              >
                <ShieldCheck size={15} /> Account & Security
              </button>
            </div>

            {settingsTab === 'resume_profile' ? (
              <form onSubmit={handleSettingsSubmit} className="space-y-6">
                {/* Personal Information Card */}
                <div className={`p-6 rounded-2xl border ${
                  isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#111338] border-purple-500/20 shadow-xl'
                }`}>
                  <h2 className="font-heading font-bold text-lg mb-1 flex items-center gap-2">
                    <User size={18} className="text-purple-400" />
                    Personal & Contact Details
                  </h2>
                  <p className="text-xs text-slate-400 mb-6">
                    These contact and identity fields will pre-fill the top header of any resume you create.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Full Name */}
                    <div className="flex flex-col gap-1.5">
                      <label className={`text-xs font-semibold ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                        Full Name <span className="text-purple-400">*</span>
                      </label>
                      <div className="relative">
                        <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          required
                          value={settingsForm.name}
                          onChange={(e) => handleSettingsChange('name', e.target.value)}
                          placeholder="e.g. Rahul Sharma"
                          className="form-input pl-10 w-full"
                        />
                      </div>
                    </div>

                    {/* Professional Title */}
                    <div className="flex flex-col gap-1.5">
                      <label className={`text-xs font-semibold ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                        Target Job Title / Role
                      </label>
                      <div className="relative">
                        <Briefcase size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          value={settingsForm.title}
                          onChange={(e) => handleSettingsChange('title', e.target.value)}
                          placeholder="e.g. Senior Full-Stack Engineer"
                          className="form-input pl-10 w-full"
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div className="flex flex-col gap-1.5">
                      <label className={`text-xs font-semibold ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                        Email Address (for Resumes)
                      </label>
                      <div className="relative">
                        <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="email"
                          value={settingsForm.email}
                          onChange={(e) => handleSettingsChange('email', e.target.value)}
                          placeholder="your.email@example.com"
                          className="form-input pl-10 w-full"
                        />
                      </div>
                    </div>

                    {/* Phone */}
                    <div className="flex flex-col gap-1.5">
                      <label className={`text-xs font-semibold ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                        Phone Number
                      </label>
                      <div className="relative">
                        <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="tel"
                          value={settingsForm.phone}
                          onChange={(e) => handleSettingsChange('phone', e.target.value)}
                          placeholder="e.g. +91 98765 43210"
                          className="form-input pl-10 w-full"
                        />
                      </div>
                    </div>

                    {/* Location */}
                    <div className="flex flex-col gap-1.5">
                      <label className={`text-xs font-semibold ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                        Location / City
                      </label>
                      <div className="relative">
                        <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          value={settingsForm.location}
                          onChange={(e) => handleSettingsChange('location', e.target.value)}
                          placeholder="e.g. Bengaluru, India or Remote"
                          className="form-input pl-10 w-full"
                        />
                      </div>
                    </div>

                    {/* LinkedIn */}
                    <div className="flex flex-col gap-1.5">
                      <label className={`text-xs font-semibold ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                        LinkedIn Profile URL
                      </label>
                      <div className="relative">
                        <Globe size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          value={settingsForm.linkedin}
                          onChange={(e) => handleSettingsChange('linkedin', e.target.value)}
                          placeholder="linkedin.com/in/yourname"
                          className="form-input pl-10 w-full"
                        />
                      </div>
                    </div>

                    {/* Portfolio / Website */}
                    <div className="flex flex-col gap-1.5 md:col-span-2">
                      <label className={`text-xs font-semibold ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                        Portfolio / GitHub / Website
                      </label>
                      <div className="relative">
                        <Globe size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          value={settingsForm.website}
                          onChange={(e) => handleSettingsChange('website', e.target.value)}
                          placeholder="github.com/yourname or portfolio.dev"
                          className="form-input pl-10 w-full"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Professional Summary & Skills */}
                <div className={`p-6 rounded-2xl border ${
                  isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#111338] border-purple-500/20 shadow-xl'
                }`}>
                  <h2 className="font-heading font-bold text-lg mb-1 flex items-center gap-2">
                    <Sparkles size={18} className="text-cyan-400" />
                    Default Summary & Skills
                  </h2>
                  <p className="text-xs text-slate-400 mb-6">
                    Configure your standard elevator pitch and technical stack to seed every new resume.
                  </p>

                  <div className="space-y-4">
                    {/* Summary */}
                    <div className="flex flex-col gap-1.5">
                      <label className={`text-xs font-semibold ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                        Default Professional Summary
                      </label>
                      <textarea
                        rows={4}
                        value={settingsForm.summary}
                        onChange={(e) => handleSettingsChange('summary', e.target.value)}
                        placeholder="Results-driven engineer with expertise in scalable systems, clean architecture, and modern tech stacks..."
                        className="form-input w-full resize-y text-sm leading-relaxed"
                      />
                      <p className="text-[11px] text-slate-500">
                        Tip: 2-3 sentences highlighting your years of experience, core technical specialties, and major impact metrics.
                      </p>
                    </div>

                    {/* Skills */}
                    <div className="flex flex-col gap-1.5">
                      <label className={`text-xs font-semibold ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                        Default Core Skills (Comma-separated)
                      </label>
                      <input
                        type="text"
                        value={settingsForm.skills}
                        onChange={(e) => handleSettingsChange('skills', e.target.value)}
                        placeholder="React.js, Node.js, Python, TypeScript, PostgreSQL, Docker, AWS, Git"
                        className="form-input w-full text-sm"
                      />
                      <p className="text-[11px] text-slate-500">
                        These will be automatically converted into skill pills in the resume builder.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Submit button bar */}
                <div className="flex items-center justify-between pt-2">
                  <div className="text-xs text-slate-400">
                    Changes are synced immediately to your profile and resume defaults.
                  </div>
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-primary px-6 py-3 rounded-xl gap-2 font-semibold shadow-lg shadow-purple-600/25"
                  >
                    {saving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        <span>Save Default Details</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              /* Account & Security Tab */
              <div className="space-y-6">
                {/* Account Details */}
                <div className={`p-6 rounded-2xl border ${
                  isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#111338] border-purple-500/20 shadow-xl'
                }`}>
                  <h2 className="font-heading font-bold text-lg mb-4 flex items-center gap-2">
                    <ShieldCheck size={18} className="text-purple-400" />
                    Account Overview
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className={`p-4 rounded-xl ${isLight ? 'bg-slate-50' : 'bg-white/5'}`}>
                      <div className="text-xs text-slate-500 mb-1">Account Email</div>
                      <div className="font-semibold flex items-center gap-2">
                        {user?.email || 'N/A'}
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">
                          VERIFIED
                        </span>
                      </div>
                    </div>

                    <div className={`p-4 rounded-xl ${isLight ? 'bg-slate-50' : 'bg-white/5'}`}>
                      <div className="text-xs text-slate-500 mb-1">Subscription Plan</div>
                      <div className="font-semibold flex items-center justify-between">
                        <span className="text-purple-400 font-bold">{planLabel}</span>
                        {profile?.plan !== 'pro' && profile?.plan !== 'lifetime' && (
                          <Link to="/pricing" className="text-xs text-cyan-400 hover:underline flex items-center gap-1">
                            Upgrade <ExternalLink size={12} />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Change Password */}
                <div className={`p-6 rounded-2xl border ${
                  isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#111338] border-purple-500/20 shadow-xl'
                }`}>
                  <h2 className="font-heading font-bold text-lg mb-1 flex items-center gap-2">
                    <Key size={18} className="text-cyan-400" />
                    Update Password
                  </h2>
                  <p className="text-xs text-slate-400 mb-6">
                    Enter a secure password with at least 6 characters.
                  </p>

                  <form onSubmit={handlePasswordUpdate} className="space-y-4 max-w-md">
                    {passwordStatus.msg && (
                      <div className={`p-3 rounded-xl text-xs font-medium ${
                        passwordStatus.error ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}>
                        {passwordStatus.msg}
                      </div>
                    )}

                    <div className="flex flex-col gap-1.5">
                      <label className={`text-xs font-semibold ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>New Password</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="form-input w-full text-sm"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className={`text-xs font-semibold ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>Confirm New Password</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="form-input w-full text-sm"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={passwordStatus.loading}
                      className="btn-secondary text-xs px-5 py-2.5 rounded-xl font-semibold"
                    >
                      {passwordStatus.loading ? 'Updating...' : 'Update Password'}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        ) : activeTab === 'resumes' ? (
          /* ═════════════════════════════════════════════════════════════ */
          /* MY RESUMES VIEW (Dedicated Page)                            */
          /* ═════════════════════════════════════════════════════════════ */
          <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="font-heading font-bold text-2xl mb-1 flex items-center gap-2">
                  <FileText className="text-purple-400" /> My Resumes
                </h1>
                <p className={`text-sm ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  Manage, edit, export, and create new ATS-optimized resumes.
                </p>
              </div>
              <Link to="/builder" className="btn-primary gap-2 text-sm px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-purple-600/30 cursor-pointer">
                <Plus size={16} /> Create New Resume
              </Link>
            </div>

            {/* Resumes Grid */}
            {resumes.length === 0 ? (
              <div className={`p-12 rounded-3xl border text-center ${
                isLight ? 'bg-white border-slate-200' : 'bg-[#111338] border-purple-500/20'
              }`}>
                <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-4 text-purple-400">
                  <FileText size={32} />
                </div>
                <h3 className="font-heading font-bold text-lg mb-2">No resumes saved yet</h3>
                <p className={`text-sm max-w-md mx-auto mb-6 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  You haven't created or saved any resumes yet. Start building your ATS-friendly resume now!
                </p>
                <Link to="/builder" className="btn-primary gap-2 text-sm px-6 py-3 rounded-xl font-semibold inline-flex items-center shadow-lg shadow-purple-600/30 cursor-pointer">
                  <Plus size={16} /> Create Your First Resume
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {resumes.map((r) => (
                  <div
                    key={r.id}
                    className={`group relative p-5 rounded-2xl border transition-all duration-200 hover:-translate-y-1 hover:shadow-xl flex flex-col justify-between ${
                      isLight
                        ? 'bg-white border-slate-200 hover:border-purple-300 hover:shadow-purple-500/10'
                        : 'bg-[#111338] border-purple-500/20 hover:border-purple-500/50 hover:shadow-purple-500/20'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                          <FileText size={20} />
                        </div>
                        {r.ats_score != null && (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                            <span>{r.ats_score}% ATS</span>
                          </div>
                        )}
                      </div>
                      {renamingId === r.id ? (
                        <div className="mb-3" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-1.5 mb-2">
                            <input
                              type="text"
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveRename(r.id)
                                if (e.key === 'Escape') setRenamingId(null)
                              }}
                              autoFocus
                              placeholder="e.g. Data Science Resume"
                              className="form-input text-xs py-1.5 px-2.5 flex-1 font-semibold rounded-lg"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveRename(r.id)}
                              disabled={isRenaming}
                              className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors cursor-pointer"
                              title="Save Name"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setRenamingId(null)}
                              className="p-1.5 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors cursor-pointer text-xs"
                              title="Cancel"
                            >
                              ✕
                            </button>
                          </div>
                          {/* Quick Name Presets */}
                          <div className="flex flex-wrap gap-1">
                            {['Data Science Resume', 'AIML Resume', 'Full Stack Resume', 'Software Engineer'].map(preset => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => handleSaveRename(r.id, preset)}
                                className="text-[10px] px-2 py-0.5 rounded-md bg-purple-500/15 hover:bg-purple-500/30 text-purple-300 hover:text-white border border-purple-500/30 transition-colors cursor-pointer"
                              >
                                + {preset}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="mb-2">
                          <div className="flex items-center gap-2 group/title">
                            <h3 className="font-heading font-bold text-base truncate flex-1" title={r.title}>
                              {r.title}
                            </h3>
                            <button
                              type="button"
                              onClick={(e) => handleStartRename(r, e)}
                              className="p-1 text-slate-400 hover:text-purple-400 rounded transition-colors cursor-pointer opacity-70 hover:opacity-100"
                              title="Rename this resume (e.g. Data Science Resume, AIML Resume)"
                            >
                              <Edit2 size={13} />
                            </button>
                          </div>
                          <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                            {r.template || 'Classic ATS'} · Updated {timeAgo(r.updated_at || r.created_at)}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-white/10 mt-2">
                      <Link
                        to={`/builder?id=${r.id}`}
                        className="btn-primary text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 font-semibold cursor-pointer"
                      >
                        <Edit2 size={12} /> Edit Resume
                      </Link>
                      <div className="flex items-center gap-1">
                        <Link
                          to={`/builder?id=${r.id}`}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-cyan-400 hover:bg-cyan-400/10 transition-all cursor-pointer"
                          title="Open & Download PDF"
                        >
                          <Download size={14} />
                        </Link>
                        {deleteConfirm === r.id ? (
                          <button
                            onClick={() => handleDeleteResume(r.id)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white bg-red-500 hover:bg-red-600 transition-all cursor-pointer animate-pulse"
                            title="Confirm Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(r.id)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-all cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Create New Card */}
                <Link
                  to="/builder"
                  className={`p-6 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all duration-200 hover:-translate-y-1 border-dashed cursor-pointer min-h-[170px] ${
                    isLight ? 'text-slate-600 hover:text-purple-600' : 'text-slate-400 hover:text-purple-400'
                  }`}
                  style={{ background: 'rgba(124,58,237,.04)', border: '2px dashed rgba(124,58,237,.25)' }}
                >
                  <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                    <Plus size={20} />
                  </div>
                  <span className="text-sm font-semibold">Create new resume</span>
                </Link>
              </div>
            )}
          </div>
        ) : (
          /* ═════════════════════════════════════════════════════════════ */
          /* DASHBOARD OVERVIEW                                          */
          /* ═════════════════════════════════════════════════════════════ */
          <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="font-heading font-bold text-2xl mb-1">
                  Welcome back, {firstName} 👋
                </h1>
                <p className={`text-sm ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Here's what's happening with your job search.</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSearchParams({ tab: 'settings' })}
                  className={`btn-ghost text-xs px-4 py-2.5 rounded-xl border flex items-center gap-1.5 transition-colors ${
                    isLight ? 'border-slate-300 text-slate-700 hover:bg-slate-100' : 'border-white/10 text-slate-300 hover:bg-white/5'
                  }`}
                >
                  <Settings size={15} /> Settings
                </button>
                <Link to="/builder" className="btn-primary gap-2 text-sm px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-purple-600/30">
                  <Plus size={16} /> New Resume
                </Link>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {computedStats.map(s => (
                <div key={s.label} className={`p-5 rounded-2xl border transition-all hover:-translate-y-0.5 ${
                  isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#111338] border-purple-500/20 shadow-lg'
                }`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center icon-purple">
                      <s.icon size={16} className="text-white opacity-80" />
                    </div>
                    {loadingData && (
                      <Loader2 size={14} className="text-purple-400 animate-spin" />
                    )}
                  </div>
                  <div className="font-heading font-extrabold text-3xl gradient-text mb-0.5">{loadingData ? '...' : s.value}</div>
                  <div className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{s.label}</div>
                  <div className={`text-xs mt-1.5 ${s.up ? 'text-emerald-400' : isLight ? 'text-slate-400' : 'text-slate-500'}`}>{loadingData ? '' : s.change}</div>
                </div>
              ))}
            </div>

            {/* Recently Made Resume Highlight */}
            {recentResumes.length > 0 && !loadingData && (
              <div className={`mb-6 p-4 rounded-2xl border flex items-center gap-4 ${
                isLight ? 'bg-purple-50 border-purple-200' : 'bg-purple-500/10 border-purple-500/25'
              }`}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                     style={{ background: 'linear-gradient(135deg,#7C3AED,#06B6D4)' }}>
                  <Sparkles size={18} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-semibold mb-0.5 ${isLight ? 'text-purple-700' : 'text-purple-300'}`}>Recently Updated</div>
                  <div className={`text-sm font-bold truncate ${isLight ? 'text-slate-800' : 'text-white'}`}>
                    {recentResumes[0].title}
                  </div>
                  <div className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    {recentResumes[0].template || 'No template'} · Updated {timeAgo(recentResumes[0].updated_at)}
                  </div>
                </div>
                <Link
                  to={`/builder?id=${recentResumes[0].id}`}
                  className="btn-primary text-xs px-4 py-2 rounded-xl gap-1.5 font-semibold flex-shrink-0"
                >
                  <Edit2 size={12} /> Continue Editing
                </Link>
              </div>
            )}

            {/* Resumes + Activity Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Resumes */}
              <div className="lg:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-heading font-bold text-lg">My Resumes</h2>
                  <button
                    onClick={fetchDashboardData}
                    className={`text-xs flex items-center gap-1 transition-colors ${isLight ? 'text-slate-500 hover:text-slate-700' : 'text-slate-400 hover:text-slate-200'}`}
                    title="Refresh"
                  >
                    <RefreshCw size={12} className={loadingData ? 'animate-spin' : ''} />
                    <span>Refresh</span>
                  </button>
                </div>

                {loadingData ? (
                  <div className={`p-8 rounded-2xl border flex flex-col items-center justify-center gap-3 ${
                    isLight ? 'bg-white border-slate-200' : 'bg-[#111338] border-purple-500/20'
                  }`}>
                    <Loader2 size={28} className="text-purple-400 animate-spin" />
                    <p className={`text-sm ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Loading your resumes...</p>
                  </div>
                ) : resumes.length === 0 ? (
                  /* Empty State */
                  <div className={`p-8 rounded-2xl border flex flex-col items-center justify-center gap-4 text-center ${
                    isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#111338] border-purple-500/20'
                  }`}>
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                         style={{ background: 'linear-gradient(135deg,rgba(124,58,237,.2),rgba(6,182,212,.15))' }}>
                      <FileText size={28} className="text-purple-400" />
                    </div>
                    <div>
                      <h3 className="font-heading font-bold text-lg mb-1">No resumes yet</h3>
                      <p className={`text-sm max-w-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                        Create your first ATS-optimized resume with our AI-powered builder. It takes less than 5 minutes!
                      </p>
                    </div>
                    <Link to="/builder" className="btn-primary gap-2 text-sm px-6 py-3 rounded-xl font-semibold shadow-lg shadow-purple-600/30">
                      <Plus size={16} /> Create Your First Resume
                    </Link>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {resumes.map(r => (
                      <div key={r.id} className={`p-5 rounded-2xl flex items-center gap-4 group transition-all duration-200 hover:-translate-y-0.5 border ${
                        isLight ? 'bg-white border-slate-200 shadow-sm hover:shadow-md' : 'bg-[#111338] border-purple-500/20 shadow-md'
                      }`}>
                        {/* Mini resume preview */}
                        <div className="w-12 h-16 rounded-md overflow-hidden flex-shrink-0 bg-white flex flex-col border border-slate-200">
                          <div className="h-4 w-full" style={{ background: `linear-gradient(135deg,${r.accent_color || '#1a1040'},${r.accent_color ? r.accent_color + '80' : '#2d1b69'})` }} />
                          <div className="flex-1 p-1 flex flex-col gap-0.5">
                            {[80,100,60,80,70].map((w,i) => (
                              <div key={i} className="rounded-sm bg-slate-200" style={{ height: 2, width: `${w}%` }} />
                            ))}
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          {renamingId === r.id ? (
                            <div className="mb-2">
                              <div className="flex items-center gap-1.5 mb-1">
                                <input
                                  type="text"
                                  value={renameValue}
                                  onChange={(e) => setRenameValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveRename(r.id)
                                    if (e.key === 'Escape') setRenamingId(null)
                                  }}
                                  autoFocus
                                  placeholder="e.g. Data Science Resume"
                                  className="form-input text-xs py-1 px-2 font-semibold rounded-lg w-full max-w-[220px]"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveRename(r.id)}
                                  className="p-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors cursor-pointer"
                                  title="Save"
                                >
                                  <Check size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setRenamingId(null)}
                                  className="p-1 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors cursor-pointer text-xs"
                                  title="Cancel"
                                >
                                  ✕
                                </button>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {['Data Science Resume', 'AIML Resume'].map(preset => (
                                  <button
                                    key={preset}
                                    type="button"
                                    onClick={() => handleSaveRename(r.id, preset)}
                                    className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30 cursor-pointer"
                                  >
                                    + {preset}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-sm truncate">{r.title}</h3>
                              <button
                                type="button"
                                onClick={(e) => handleStartRename(r, e)}
                                className="p-0.5 text-slate-400 hover:text-purple-400 rounded transition-colors cursor-pointer opacity-70 hover:opacity-100"
                                title="Rename resume"
                              >
                                <Edit2 size={12} />
                              </button>
                            </div>
                          )}
                          <div className={`text-xs mb-2 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                            {r.template || 'No template'} · Updated {timeAgo(r.updated_at || r.created_at)}
                          </div>
                          {r.ats_score != null && (
                            <div className="flex items-center gap-2">
                              <ScoreRing score={r.ats_score} size={36} />
                              <div>
                                <div className="text-xs font-semibold">{r.ats_score}% ATS</div>
                                <div className="text-slate-500 text-[10px]">Score</div>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link to={`/builder?id=${r.id}`} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-purple-400 hover:bg-purple-400/10 transition-all cursor-pointer" title="Edit Resume">
                            <Edit2 size={13} />
                          </Link>
                          {deleteConfirm === r.id ? (
                            <button
                              onClick={() => handleDeleteResume(r.id)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-white bg-red-500 hover:bg-red-600 transition-all cursor-pointer animate-pulse"
                              title="Confirm Delete"
                            >
                              <Trash2 size={13} />
                            </button>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(r.id)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-all cursor-pointer"
                              title="Delete Resume"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    <Link to="/builder"
                          className={`p-5 rounded-2xl flex items-center justify-center gap-2.5 transition-all duration-200 hover:-translate-y-0.5 border-dashed cursor-pointer ${
                            isLight ? 'text-slate-500 hover:text-purple-600' : 'text-slate-400 hover:text-purple-400'
                          }`}
                          style={{ background: 'rgba(124,58,237,.04)', border: '2px dashed rgba(124,58,237,.2)' }}>
                      <Plus size={18} />
                      <span className="text-sm font-medium">Create new resume</span>
                    </Link>
                  </div>
                )}
              </div>

              {/* Activity & Upgrade Banner */}
              <div>
                <h2 className="font-heading font-bold text-lg mb-4">Recent Activity</h2>
                <div className={`p-5 rounded-2xl border ${
                  isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#111338] border-purple-500/20'
                }`}>
                  {realActivities.length === 0 ? (
                    <div className={`text-center py-6 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                      <Clock size={24} className="mx-auto mb-2 opacity-50" />
                      <p className="text-xs">No activity yet. Create a resume to get started!</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {realActivities.map((a, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                               style={{ background: `${a.color}20`, border: `1px solid ${a.color}40` }}>
                            <a.icon size={12} style={{ color: a.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{a.action}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                              <Clock size={9} /> {a.time}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Upgrade CTA */}
                {profile?.plan !== 'pro' && profile?.plan !== 'lifetime' && (
                  <div className="mt-4 p-5 rounded-2xl relative overflow-hidden"
                       style={{ background: 'linear-gradient(135deg,rgba(124,58,237,.25),rgba(6,182,212,.12))', border: '1px solid rgba(124,58,237,.35)' }}>
                    <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-20"
                         style={{ background: 'rgba(124,58,237,.6)', filter: 'blur(32px)', transform: 'translate(20%,-20%)' }} />
                    <Zap size={20} className="text-purple-400 mb-2" />
                    <h3 className="font-heading font-bold text-sm mb-1">Upgrade to Pro</h3>
                    <p className="text-slate-400 text-xs mb-3 leading-relaxed">Unlock unlimited AI writing, ATS tailoring & export all templates.</p>
                    <Link to="/pricing" className="btn-primary text-xs px-4 py-2 rounded-lg gap-1.5 inline-flex items-center">
                      Upgrade Now <Zap size={12} />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Delete confirmation overlay */}
      {deleteConfirm && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
          <div className={`px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 ${
            isLight ? 'bg-white border border-red-200' : 'bg-[#111338] border border-red-500/30'
          }`}>
            <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
            <span className={`text-sm ${isLight ? 'text-slate-700' : 'text-slate-200'}`}>Click the red delete button again to confirm, or</span>
            <button onClick={() => setDeleteConfirm(null)} className="text-xs font-semibold text-purple-400 hover:text-purple-300 cursor-pointer">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
