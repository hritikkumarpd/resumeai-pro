import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, Zap, LogOut, User, Sun, Moon } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'

const publicLinks = [
  { label: 'Templates',    href: '/templates' },
  { label: 'ATS Checker',  href: '/ats-checker' },
  { label: 'Cover Letter', href: '/cover-letter' },
  { label: 'Pricing',      href: '/pricing' },
]

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, profile, isAuthenticated, signOut } = useAuth()
  const { theme, toggleTheme, isDark } = useTheme()

  useEffect(() => { setMenuOpen(false) }, [pathname])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const isLight = theme === 'light'

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 h-[72px] flex items-center transition-all duration-300 ${
        isLight
          ? 'bg-white/95 backdrop-blur-xl border-b border-slate-200 shadow-sm'
          : 'bg-[#080920]/95 backdrop-blur-xl border-b border-white/10 shadow-[0_4px_32px_rgba(0,0,0,0.5)]'
      }`}>
        <div className="max-w-[1200px] mx-auto px-6 w-full flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[10px] flex items-center justify-center text-white shadow-[0_0_16px_rgba(124,58,237,0.5)]"
                 style={{ background: 'linear-gradient(135deg,#7C3AED,#06B6D4)' }}>
              <Zap size={18} fill="white" />
            </div>
            <span className="font-heading font-extrabold text-xl gradient-text">
              ResumeAI Pro
            </span>
          </Link>

          {/* Desktop nav */}
          {/* Desktop nav */}
          <ul className="hidden md:flex items-center gap-0.5 lg:gap-1">
            {isAuthenticated && (
              <li>
                <Link
                  to="/dashboard"
                  className={`px-2.5 lg:px-3.5 py-2 rounded-lg text-xs lg:text-sm font-medium transition-all duration-150 ${
                    pathname === '/dashboard'
                      ? isLight ? 'text-purple-700 bg-purple-50 font-semibold' : 'text-white bg-[#7C3AED]/20'
                      : isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-[#7C3AED]/10'
                  }`}
                >
                  Dashboard
                </Link>
              </li>
            )}
            <li>
              <Link
                to="/builder"
                className={`px-2.5 lg:px-3.5 py-2 rounded-lg text-xs lg:text-sm font-medium transition-all duration-150 ${
                  pathname.startsWith('/builder')
                    ? isLight ? 'text-purple-700 bg-purple-50 font-semibold' : 'text-white bg-[#7C3AED]/20'
                    : isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-[#7C3AED]/10'
                }`}
              >
                Resume Builder
              </Link>
            </li>
            {publicLinks.map(l => (
              <li key={l.href}>
                <Link
                  to={l.href}
                  className={`px-2.5 lg:px-3.5 py-2 rounded-lg text-xs lg:text-sm font-medium transition-all duration-150 ${
                    pathname === l.href
                      ? isLight ? 'text-purple-700 bg-purple-50 font-semibold' : 'text-white bg-[#7C3AED]/20'
                      : isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-[#7C3AED]/10'
                  }`}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* CTA, Theme Toggle & Auth */}
          <div className="hidden md:flex items-center gap-2.5">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className={`p-2 rounded-xl transition-all duration-200 flex items-center justify-center ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 text-amber-500 border border-slate-200'
                  : 'bg-[#141740] hover:bg-[#1e235e] text-amber-400 border border-purple-500/20 shadow-inner'
              }`}
            >
              {isDark ? <Sun size={17} className="text-amber-400" /> : <Moon size={17} className="text-indigo-600" />}
            </button>

            {isAuthenticated ? (
              <div className="flex items-center gap-2.5">
                <Link to="/dashboard" className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors ${
                  isLight ? 'bg-slate-50 border-slate-200 hover:bg-slate-100' : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}>
                  <div className="w-6 h-6 rounded-full bg-purple-600 text-white text-[11px] font-bold flex items-center justify-center">
                    {(profile?.full_name || user?.email || 'U')[0].toUpperCase()}
                  </div>
                  <span className={`text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    {profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'User'}
                  </span>
                </Link>
                <button
                  onClick={handleSignOut}
                  title="Sign out"
                  className={`flex items-center gap-1.5 text-xs px-2 py-1.5 transition-colors ${
                    isLight ? 'text-slate-500 hover:text-red-500' : 'text-slate-400 hover:text-red-400'
                  }`}
                >
                  <LogOut size={14} />
                  <span>Log out</span>
                </button>
              </div>
            ) : (
              <>
                <Link to="/login" className="btn-secondary text-sm px-4 py-2">
                  Log in
                </Link>
                <Link to="/login" className="btn-primary text-sm px-4 py-2">
                  Get Started Free
                </Link>
              </>
            )}
          </div>

          {/* Hamburger & Mobile Theme Toggle */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={toggleTheme}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className={`p-1.5 rounded-lg transition-colors ${
                isLight ? 'bg-slate-100 text-amber-500' : 'bg-[#141740] text-amber-400'
              }`}
            >
              {isDark ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <button
              className={`p-2 transition-colors ${isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'}`}
              onClick={() => setMenuOpen(v => !v)}
              aria-label="Toggle menu"
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className={`fixed top-[72px] left-0 right-0 z-40 px-6 py-4 flex flex-col gap-1 animate-slide-down md:hidden border-b ${
          isLight
            ? 'bg-white/98 backdrop-blur-xl border-slate-200 shadow-xl'
            : 'bg-[#080920]/98 backdrop-blur-xl border-white/10'
        }`}>
          {isAuthenticated && (
            <Link
              to="/dashboard"
              className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                isLight ? 'text-slate-800 hover:bg-slate-100' : 'text-slate-300 hover:text-white hover:bg-[#7C3AED]/10'
              }`}
            >
              Dashboard
            </Link>
          )}
          <Link
            to="/builder"
            className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              isLight ? 'text-slate-800 hover:bg-slate-100' : 'text-slate-300 hover:text-white hover:bg-[#7C3AED]/10'
            }`}
          >
            Resume Builder
          </Link>
          {publicLinks.map(link => (
            <Link
              key={link.href}
              to={link.href}
              className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                isLight ? 'text-slate-800 hover:bg-slate-100' : 'text-slate-300 hover:text-white hover:bg-[#7C3AED]/10'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-slate-200 dark:border-white/10">
            {isAuthenticated ? (
              <button onClick={handleSignOut} className="btn-secondary text-sm py-2.5 text-center text-red-500">
                Log out
              </button>
            ) : (
              <>
                <Link to="/login" className="btn-secondary text-sm py-2.5 text-center">Log in</Link>
                <Link to="/login" className="btn-primary text-sm py-2.5 text-center">Get Started Free</Link>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
