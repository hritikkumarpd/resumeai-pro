import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  LayoutDashboard, FileText, Target, Mail, CreditCard,
  Settings, LogOut, Plus, MoreHorizontal, TrendingUp,
  Zap, Clock, Star, Download, Edit2, Trash2, Eye
} from 'lucide-react'

const sampleResumes = [
  { id: 1, title: 'Software Engineer Resume', template: 'Modern Dark', atsScore: 92, lastEdited: '2 hours ago', status: 'active' },
  { id: 2, title: 'Product Manager Resume',   template: 'Executive',   atsScore: 78, lastEdited: '3 days ago',  status: 'draft'  },
  { id: 3, title: 'Data Scientist Resume',    template: 'Minimal',     atsScore: 85, lastEdited: '1 week ago',  status: 'active' },
]

const stats = [
  { label: 'Resumes Created', value: '3',   change: '+1 this week', up: true,  icon: FileText    },
  { label: 'Avg ATS Score',   value: '85%', change: '+7% vs last',  up: true,  icon: TrendingUp  },
  { label: 'Cover Letters',   value: '2',   change: 'Created',      up: true,  icon: Mail        },
  { label: 'Applications',    value: '14',  change: '3 interviews!', up: true,  icon: Star        },
]

const activities = [
  { action: 'Edited Software Engineer Resume',   time: '2 hours ago',   icon: Edit2,       color: '#7C3AED' },
  { action: 'ATS Score improved to 92%',          time: '2 hours ago',   icon: TrendingUp,  color: '#10B981' },
  { action: 'Downloaded Product Manager Resume', time: '3 days ago',   icon: Download,    color: '#06B6D4' },
  { action: 'Created Data Scientist Resume',     time: '1 week ago',    icon: FileText,    color: '#F59E0B' },
  { action: 'Generated Cover Letter for Meta',   time: '1 week ago',    icon: Mail,        color: '#EC4899' },
]

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard',    href: '/dashboard', active: true  },
  { icon: FileText,        label: 'My Resumes',   href: '/builder',   active: false },
  { icon: Target,          label: 'ATS Checker',  href: '/ats-checker', active: false },
  { icon: Mail,            label: 'Cover Letters',href: '/cover-letter', active: false },
  { icon: Star,            label: 'Templates',    href: '/templates',  active: false },
  { icon: CreditCard,      label: 'Billing',      href: '/pricing',   active: false },
  { icon: Settings,        label: 'Settings',     href: '#',          active: false },
]

function ScoreRing({ score, size = 64 }) {
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
  const [activeNav, setActiveNav] = useState(0)

  return (
    <div className="flex min-h-screen pt-[72px]" style={{ background: '#080920' }}>
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 border-r flex flex-col gap-1 px-3 py-6 sticky top-[72px] h-[calc(100vh-72px)] overflow-y-auto"
             style={{ background: '#0D0F2E', borderColor: 'rgba(124,58,237,.15)' }}>
        <div className="px-3 mb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-600">Workspace</p>
        </div>
        {navItems.map((item, i) => (
          <Link key={item.label} to={item.href}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  i === activeNav
                    ? 'text-purple-300'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                }`}
                style={i === activeNav ? { background: 'rgba(124,58,237,.2)', border: '1px solid rgba(124,58,237,.25)' } : {}}
                onClick={() => setActiveNav(i)}>
            <item.icon size={16} />
            {item.label}
          </Link>
        ))}

        <div className="mt-auto pt-4 border-t" style={{ borderColor: 'rgba(124,58,237,.15)' }}>
          {/* User */}
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl mb-1"
               style={{ background: 'rgba(255,255,255,.03)' }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm text-white flex-shrink-0"
                 style={{ background: 'linear-gradient(135deg,#7C3AED,#06B6D4)' }}>
              A
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-300 truncate">Alex Johnson</div>
              <div className="text-[10px] text-slate-600 truncate">Free Plan</div>
            </div>
          </div>
          <Link to="/login" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-slate-600 hover:text-red-400 transition-colors">
            <LogOut size={15} />
            Log Out
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 px-8 py-8 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-heading font-bold text-2xl mb-1">Welcome back, Alex 👋</h1>
            <p className="text-slate-500 text-sm">Here's what's happening with your job search.</p>
          </div>
          <Link to="/builder" className="btn-primary gap-2 text-sm px-5 py-2.5 rounded-xl">
            <Plus size={16} /> New Resume
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map(s => (
            <div key={s.label} className="p-5 rounded-2xl"
                 style={{ background: '#111338', border: '1px solid rgba(124,58,237,.2)' }}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center icon-purple">
                  <s.icon size={16} className="text-white opacity-80" />
                </div>
              </div>
              <div className="font-heading font-extrabold text-3xl gradient-text mb-0.5">{s.value}</div>
              <div className="text-slate-500 text-xs">{s.label}</div>
              <div className={`text-xs mt-1.5 ${s.up ? 'text-emerald-400' : 'text-red-400'}`}>{s.change}</div>
            </div>
          ))}
        </div>

        {/* Resumes + Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Resumes */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading font-bold text-lg">My Resumes</h2>
              <Link to="/builder" className="btn-ghost text-xs text-purple-400 hover:text-purple-300 transition-colors">View all →</Link>
            </div>
            <div className="flex flex-col gap-4">
              {sampleResumes.map(r => (
                <div key={r.id} className="p-5 rounded-2xl flex items-center gap-4 group transition-all duration-200 hover:-translate-y-0.5"
                     style={{ background: '#111338', border: '1px solid rgba(124,58,237,.2)' }}>
                  {/* Mini resume preview */}
                  <div className="w-12 h-16 rounded-md overflow-hidden flex-shrink-0 bg-white flex flex-col">
                    <div className="h-4 w-full" style={{ background: 'linear-gradient(135deg,#1a1040,#2d1b69)' }} />
                    <div className="flex-1 p-1 flex flex-col gap-0.5">
                      {[80,100,60,80,70].map((w,i) => (
                        <div key={i} className="rounded-sm bg-slate-200" style={{ height: 2, width: `${w}%` }} />
                      ))}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm truncate">{r.title}</h3>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        r.status === 'active' ? 'bg-emerald-400/15 text-emerald-400' : 'bg-slate-700/50 text-slate-500'
                      }`}>{r.status}</span>
                    </div>
                    <div className="text-slate-500 text-xs mb-2">{r.template} · Edited {r.lastEdited}</div>
                    <div className="flex items-center gap-2">
                      <ScoreRing score={r.atsScore} size={36} />
                      <div>
                        <div className="text-xs font-semibold">{r.atsScore}% ATS</div>
                        <div className="text-slate-600 text-[10px]">Score</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link to="/builder" className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-purple-400 hover:bg-purple-400/10 transition-all">
                      <Edit2 size={13} />
                    </Link>
                    <button className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-cyan-400 hover:bg-cyan-400/10 transition-all">
                      <Download size={13} />
                    </button>
                    <button className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-all">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}

              <Link to="/builder"
                    className="p-5 rounded-2xl flex items-center justify-center gap-2.5 text-slate-500 hover:text-purple-400 transition-all duration-200 hover:-translate-y-0.5 border-dashed"
                    style={{ background: 'rgba(124,58,237,.04)', border: '2px dashed rgba(124,58,237,.2)' }}>
                <Plus size={18} />
                <span className="text-sm font-medium">Create new resume</span>
              </Link>
            </div>
          </div>

          {/* Activity */}
          <div>
            <h2 className="font-heading font-bold text-lg mb-4">Recent Activity</h2>
            <div className="p-5 rounded-2xl" style={{ background: '#111338', border: '1px solid rgba(124,58,237,.2)' }}>
              <div className="flex flex-col gap-4">
                {activities.map((a, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                         style={{ background: `${a.color}20`, border: `1px solid ${a.color}40` }}>
                      <a.icon size={12} style={{ color: a.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-300 leading-relaxed">{a.action}</p>
                      <p className="text-[10px] text-slate-600 mt-0.5 flex items-center gap-1">
                        <Clock size={9} /> {a.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Upgrade CTA */}
            <div className="mt-4 p-5 rounded-2xl relative overflow-hidden"
                 style={{ background: 'linear-gradient(135deg,rgba(124,58,237,.25),rgba(6,182,212,.12))', border: '1px solid rgba(124,58,237,.35)' }}>
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-20"
                   style={{ background: 'rgba(124,58,237,.6)', filter: 'blur(32px)', transform: 'translate(20%,-20%)' }} />
              <Zap size={20} className="text-purple-400 mb-2" />
              <h3 className="font-heading font-bold text-sm mb-1">Upgrade to Pro</h3>
              <p className="text-slate-400 text-xs mb-3 leading-relaxed">Unlock AI writing, unlimited resumes & 50+ templates.</p>
              <Link to="/pricing" className="btn-primary text-xs px-4 py-2 rounded-lg gap-1.5">
                Upgrade Now <Zap size={12} />
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
