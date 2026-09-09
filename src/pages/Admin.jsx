import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ShieldAlert, Users, FileText, TrendingUp, Sparkles,
  Search, Trash2, CheckCircle2, AlertCircle, RefreshCw,
  Key, ArrowRight, ShieldCheck, Crown, ExternalLink,
  Activity, Database, Cpu, Lock, Unlock, ChevronRight,
  Filter, MoreVertical, Check
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { adminApi } from '../lib/api'

export default function Admin() {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const { user } = useAuth()
  const navigate = useNavigate()

  // Secret & Authentication state (session scoped for security)
  const [adminSecret, setAdminSecret] = useState(
    () => sessionStorage.getItem('resumeai_admin_secret') || ''
  )
  const [secretInput, setSecretInput] = useState(adminSecret)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authError, setAuthError] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)

  // Active sub-tab: 'overview' | 'users' | 'resumes' | 'system'
  const [activeTab, setActiveTab] = useState('overview')

  // Data state
  const [stats, setStats] = useState(null)
  const [usersList, setUsersList] = useState([])
  const [resumesList, setResumesList] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [actionFeedback, setActionFeedback] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)

  // Verify secret & load initial stats
  const verifyAndLoad = useCallback(async (secretToTest) => {
    if (!secretToTest) {
      setLoading(false)
      return
    }
    setIsVerifying(true)
    setAuthError('')
    try {
      const res = await adminApi.getStats(secretToTest)
      if (res.data) {
        setStats(res.data)
        setIsAuthenticated(true)
        sessionStorage.setItem('resumeai_admin_secret', secretToTest)
        setAdminSecret(secretToTest)
        return
      }
    } catch (err) {
      setIsAuthenticated(false)
      sessionStorage.removeItem('resumeai_admin_secret')
      const msg = err.response?.data?.error || 'Invalid Admin Secret key. Please enter the master key.'
      setAuthError(msg)
    } finally {
      setIsVerifying(false)
      setLoading(false)
    }
  }, [])

  // Auto-attempt login on mount
  useEffect(() => {
    if (adminSecret) {
      verifyAndLoad(adminSecret)
    } else {
      setLoading(false)
    }
  }, [adminSecret, verifyAndLoad])

  // Fetch Users
  const fetchUsers = useCallback(async () => {
    if (!isAuthenticated) return
    setLoading(true)
    try {
      const res = await adminApi.getUsers(adminSecret, 0, searchQuery)
      if (res.data?.data) {
        setUsersList(res.data.data)
      }
    } catch (err) {
      console.error('Failed to fetch users:', err)
    } finally {
      setLoading(false)
    }
  }, [adminSecret, isAuthenticated, searchQuery])

  // Fetch Resumes
  const fetchResumes = useCallback(async () => {
    if (!isAuthenticated) return
    setLoading(true)
    try {
      const res = await adminApi.getResumes(adminSecret)
      if (res.data?.data) {
        setResumesList(res.data.data)
      }
    } catch (err) {
      console.error('Failed to fetch resumes:', err)
    } finally {
      setLoading(false)
    }
  }, [adminSecret, isAuthenticated])

  useEffect(() => {
    if (isAuthenticated) {
      if (activeTab === 'users') fetchUsers()
      if (activeTab === 'resumes') fetchResumes()
    }
  }, [activeTab, isAuthenticated, fetchUsers, fetchResumes])

  // Update user plan
  const handleUpdatePlan = async (userId, newPlan) => {
    try {
      await adminApi.updateUserPlan(adminSecret, userId, newPlan)
      setUsersList(prev => prev.map(u => u.id === userId ? { ...u, plan: newPlan } : u))
      setActionFeedback(`User plan updated to ${newPlan.toUpperCase()}`)
      setTimeout(() => setActionFeedback(''), 3000)
    } catch (err) {
      alert('Failed to update plan: ' + err.message)
    }
  }

  // Delete user
  const handleDeleteUser = async (userId) => {
    try {
      await adminApi.deleteUser(adminSecret, userId)
      setUsersList(prev => prev.filter(u => u.id !== userId))
      setDeleteConfirmId(null)
      setActionFeedback('User permanently deleted.')
      setTimeout(() => setActionFeedback(''), 3000)
    } catch (err) {
      alert('Failed to delete user: ' + err.message)
    }
  }

  // If verifying on initial load, show clean loading state
  if (loading && !stats) {
    return (
      <div className={`min-h-screen pt-28 pb-16 flex items-center justify-center px-4 ${
        isLight ? 'bg-slate-50 text-slate-900' : 'bg-[#080920] text-white'
      }`}>
        <div className="flex flex-col items-center gap-3">
          <RefreshCw size={28} className="text-purple-400 animate-spin" />
          <p className="text-sm text-slate-400 font-semibold">Loading Admin Dashboard...</p>
        </div>
      </div>
    )
  }

  // If not authenticated, render Admin Login Card
  if (!isAuthenticated) {
    return (
      <div className={`min-h-screen pt-28 pb-16 flex items-center justify-center px-4 ${
        isLight ? 'bg-slate-50 text-slate-900' : 'bg-[#080920] text-white'
      }`}>
        <div className="w-full max-w-md">
          <div className="glass-card p-8 rounded-3xl shadow-2xl relative overflow-hidden border border-purple-500/20">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-cyan-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-purple-500/25">
              <ShieldAlert size={28} className="text-white" />
            </div>

            <div className="text-center mb-6">
              <h1 className="font-heading font-extrabold text-2xl mb-2">Admin Command Center</h1>
              <p className="text-sm text-slate-400">
                Enter your <code className="text-purple-400 font-mono">X-Admin-Secret</code> key to manage platform users, plans, and analytics.
              </p>
            </div>

            {authError && (
              <div className="mb-5 p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); verifyAndLoad(secretInput) }} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Admin Master Key
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={secretInput}
                    onChange={(e) => setSecretInput(e.target.value)}
                    placeholder="Enter admin secret..."
                    className="form-input w-full pl-9 text-sm font-mono"
                    required
                  />
                  <Key size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <button
                type="submit"
                disabled={isVerifying}
                className="btn-primary w-full py-3 rounded-xl font-bold text-sm shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isVerifying ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Verifying Access...</span>
                  </>
                ) : (
                  <>
                    <Unlock size={16} />
                    <span>Unlock Admin Dashboard</span>
                  </>
                )}
              </button>

              <div className="pt-3 text-center">
                <Link to="/dashboard" className="text-xs text-slate-400 hover:text-purple-400 transition-colors">
                  ← Return to User Dashboard
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen pt-24 pb-16 px-4 md:px-8 max-w-7xl mx-auto transition-colors ${
      isLight ? 'bg-slate-50 text-slate-900' : 'bg-[#080920] text-white'
    }`}>
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-purple-500/20">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-purple-400 mb-1 tracking-wider uppercase">
            <ShieldCheck size={16} /> Platform Admin Control
          </div>
          <h1 className="font-heading font-extrabold text-3xl">Admin Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">
            Global management for users, subscriptions, resume metrics, and system services.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => {
              if (activeTab === 'overview') verifyAndLoad(adminSecret)
              else if (activeTab === 'users') fetchUsers()
              else if (activeTab === 'resumes') fetchResumes()
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              isLight ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100' : 'bg-[#12143a] border-purple-500/20 text-slate-300 hover:bg-purple-500/10'
            }`}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin text-purple-400' : ''} />
            <span>Refresh</span>
          </button>

          <Link
            to="/dashboard"
            className="btn-secondary text-xs px-4 py-2 rounded-xl font-semibold flex items-center gap-1.5"
          >
            <ExternalLink size={13} />
            <span>User Portal</span>
          </Link>

          <button
            onClick={() => {
              localStorage.removeItem('resumeai_admin_secret')
              setIsAuthenticated(false)
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent transition-all cursor-pointer"
            title="Lock Admin Session"
          >
            <Lock size={16} />
          </button>
        </div>
      </div>

      {/* Action Toast Feedback */}
      {actionFeedback && (
        <div className="mb-6 p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-fade-in shadow-lg shadow-emerald-500/10">
          <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
          <span className="font-semibold">{actionFeedback}</span>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 mb-8 border-b border-purple-500/15 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
              : isLight ? 'text-slate-600 hover:bg-slate-200' : 'text-slate-400 hover:bg-white/5'
          }`}
        >
          <TrendingUp size={14} /> Platform Metrics
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'users'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
              : isLight ? 'text-slate-600 hover:bg-slate-200' : 'text-slate-400 hover:bg-white/5'
          }`}
        >
          <Users size={14} /> User Accounts
        </button>

        <button
          onClick={() => setActiveTab('resumes')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'resumes'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
              : isLight ? 'text-slate-600 hover:bg-slate-200' : 'text-slate-400 hover:bg-white/5'
          }`}
        >
          <FileText size={14} /> Global Resumes
        </button>

        <button
          onClick={() => setActiveTab('system')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'system'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
              : isLight ? 'text-slate-600 hover:bg-slate-200' : 'text-slate-400 hover:bg-white/5'
          }`}
        >
          <Activity size={14} /> System Health
        </button>
      </div>

      {/* ── Tab 1: Platform Metrics & Overview ─────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-8 animate-fade-in">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className={`p-6 rounded-2xl border transition-all ${
              isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#111338] border-purple-500/20 shadow-xl'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Users</span>
                <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center text-purple-400">
                  <Users size={20} />
                </div>
              </div>
              <div className="text-3xl font-extrabold font-heading gradient-text mb-1">
                {stats?.total_users ?? 0}
              </div>
              <p className="text-[11px] text-slate-400">Registered platform accounts</p>
            </div>

            <div className={`p-6 rounded-2xl border transition-all ${
              isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#111338] border-purple-500/20 shadow-xl'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pro & Lifetime</span>
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-400">
                  <Crown size={20} />
                </div>
              </div>
              <div className="text-3xl font-extrabold font-heading text-amber-400 mb-1">
                {stats?.pro_users ?? 0}
              </div>
              <p className="text-[11px] text-slate-400">Upgraded premium subscriptions</p>
            </div>

            <div className={`p-6 rounded-2xl border transition-all ${
              isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#111338] border-purple-500/20 shadow-xl'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Resumes Created</span>
                <div className="w-10 h-10 rounded-xl bg-cyan-500/15 flex items-center justify-center text-cyan-400">
                  <FileText size={20} />
                </div>
              </div>
              <div className="text-3xl font-extrabold font-heading text-cyan-400 mb-1">
                {stats?.total_resumes ?? 0}
              </div>
              <p className="text-[11px] text-slate-400">Total resumes in database</p>
            </div>

            <div className={`p-6 rounded-2xl border transition-all ${
              isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#111338] border-purple-500/20 shadow-xl'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">AI Engine Ready</span>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400">
                  <Sparkles size={20} />
                </div>
              </div>
              <div className="text-3xl font-extrabold font-heading text-emerald-400 mb-1">
                100%
              </div>
              <p className="text-[11px] text-slate-400">Google Gemini Flash active</p>
            </div>
          </div>

          {/* Recent Signups Feed */}
          <div className={`p-6 rounded-3xl border ${
            isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#111338] border-purple-500/20 shadow-xl'
          }`}>
            <h2 className="font-heading font-bold text-lg mb-4 flex items-center gap-2">
              <Users className="text-purple-400" size={18} /> Recent Registrations
            </h2>

            {(!stats?.recent_users || stats.recent_users.length === 0) ? (
              <p className="text-xs text-slate-400 py-4">No recent users found.</p>
            ) : (
              <div className="divide-y divide-purple-500/10">
                {stats.recent_users.map(u => (
                  <div key={u.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-300 font-bold text-xs flex items-center justify-center">
                        {(u.full_name || 'U')[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="text-xs font-semibold">{u.full_name || 'Anonymous User'}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{u.id}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                        u.plan === 'pro' || u.plan === 'lifetime'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-slate-500/20 text-slate-400 border border-slate-500/20'
                      }`}>
                        {u.plan || 'free'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(u.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab 2: User Management Table ───────────────────────────── */}
      {activeTab === 'users' && (
        <div className={`p-6 rounded-3xl border animate-fade-in ${
          isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#111338] border-purple-500/20 shadow-xl'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="font-heading font-bold text-lg">User Accounts ({usersList.length})</h2>
              <p className="text-xs text-slate-400">Inspect accounts, modify plan tiers, or remove accounts.</p>
            </div>

            <div className="relative w-full sm:w-72">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search user name..."
                className="form-input text-xs w-full pl-8 py-2"
              />
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-purple-500/20 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="pb-3 px-3">User</th>
                  <th className="pb-3 px-3">Email</th>
                  <th className="pb-3 px-3">Plan Tier</th>
                  <th className="pb-3 px-3">Resumes</th>
                  <th className="pb-3 px-3">Registered</th>
                  <th className="pb-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-500/10">
                {usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-3 font-semibold">
                      {u.full_name || 'Unnamed User'}
                    </td>
                    <td className="py-3 px-3 text-slate-300 font-mono">
                      {u.email}
                    </td>
                    <td className="py-3 px-3">
                      <select
                        value={u.plan || 'free'}
                        onChange={(e) => handleUpdatePlan(u.id, e.target.value)}
                        className={`text-[11px] font-bold py-1 px-2 rounded-lg border cursor-pointer outline-none ${
                          u.plan === 'lifetime'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : u.plan === 'pro'
                              ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                              : 'bg-slate-500/15 text-slate-300 border-slate-500/25'
                        }`}
                      >
                        <option value="free" className="bg-[#111338] text-white">Free Plan</option>
                        <option value="pro" className="bg-[#111338] text-white">Pro Plan</option>
                        <option value="lifetime" className="bg-[#111338] text-white">Lifetime Pro</option>
                      </select>
                    </td>
                    <td className="py-3 px-3 text-slate-400">
                      {u.resume_count ?? 0}
                    </td>
                    <td className="py-3 px-3 text-slate-400">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {deleteConfirmId === u.id ? (
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="px-2.5 py-1 text-[10px] rounded bg-red-600 hover:bg-red-700 text-white font-bold transition-all cursor-pointer animate-pulse"
                        >
                          Confirm Delete
                        </button>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(u.id)}
                          className="p-1 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors cursor-pointer"
                          title="Delete User"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Tab 3: Resumes Audit Feed ──────────────────────────────── */}
      {activeTab === 'resumes' && (
        <div className={`p-6 rounded-3xl border animate-fade-in ${
          isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#111338] border-purple-500/20 shadow-xl'
        }`}>
          <h2 className="font-heading font-bold text-lg mb-2">Platform Resumes ({resumesList.length})</h2>
          <p className="text-xs text-slate-400 mb-6">Real-time audit of generated resumes across all users.</p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-purple-500/20 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="pb-3 px-3">Title</th>
                  <th className="pb-3 px-3">Template</th>
                  <th className="pb-3 px-3">ATS Score</th>
                  <th className="pb-3 px-3">Owner ID</th>
                  <th className="pb-3 px-3 text-right">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-500/10">
                {resumesList.map((r) => (
                  <tr key={r.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-3 font-semibold text-white">
                      {r.title || 'Untitled Resume'}
                    </td>
                    <td className="py-3 px-3 text-purple-300">
                      {r.template || 'Classic ATS'}
                    </td>
                    <td className="py-3 px-3">
                      {r.ats_score != null ? (
                        <span className="font-bold text-emerald-400">{r.ats_score}%</span>
                      ) : (
                        <span className="text-slate-500">N/A</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-400 font-mono text-[10px]">
                      {r.user_id}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-400">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Tab 4: System Health ──────────────────────────────────── */}
      {activeTab === 'system' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
          <div className={`p-6 rounded-3xl border ${
            isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#111338] border-purple-500/20 shadow-xl'
          }`}>
            <h3 className="font-heading font-bold text-base mb-4 flex items-center gap-2">
              <Database className="text-cyan-400" size={18} /> Database & Storage
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-purple-500/10">
                <span className="text-slate-400">Supabase Connection:</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 size={13} /> Active
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-purple-500/10">
                <span className="text-slate-400">Database Role:</span>
                <span className="font-mono text-purple-300">service_role (Admin)</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-400">Storage Sync:</span>
                <span className="text-emerald-400 font-semibold">Dual-Layer Local + Cloud</span>
              </div>
            </div>
          </div>

          <div className={`p-6 rounded-3xl border ${
            isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#111338] border-purple-500/20 shadow-xl'
          }`}>
            <h3 className="font-heading font-bold text-base mb-4 flex items-center gap-2">
              <Cpu className="text-purple-400" size={18} /> Microservices & Engines
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-purple-500/10">
                <span className="text-slate-400">PDF Render Engine:</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 size={13} /> Headless Puppeteer Vector PDF
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-purple-500/10">
                <span className="text-slate-400">AI Intelligence:</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 size={13} /> Multi-Model Gemini Flash
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-400">Payment Gateway:</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 size={13} /> Razorpay Test Gateway
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
