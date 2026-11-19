import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { FileText, LogOut, Menu, Moon, Settings, Shield, Sun, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'

const productLinks = [
  ['/builder', 'Resume Builder'], ['/templates', 'Templates'], ['/ats-checker', 'ATS Checker'],
  ['/cover-letter', 'Cover Letter'], ['/pricing', 'Pricing'],
]

export default function Navbar() {
  const { user, isAuthenticated, signOut } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [openAt, setOpenAt] = useState(null)
  const menuOpen = openAt === location.key
  const trigger = useRef(null)
  const nav = useRef(null)
  const links = isAuthenticated ? [['/dashboard', 'Dashboard'], ...productLinks] : productLinks

  useEffect(() => {
    if (!menuOpen) return
    const dismiss = event => {
      if (event.key === 'Escape') {
        setOpenAt(null)
        trigger.current?.focus()
      } else if (event.type === 'pointerdown' && !nav.current?.contains(event.target)) {
        setOpenAt(null)
      }
    }
    document.addEventListener('keydown', dismiss)
    document.addEventListener('pointerdown', dismiss)
    return () => {
      document.removeEventListener('keydown', dismiss)
      document.removeEventListener('pointerdown', dismiss)
    }
  }, [menuOpen])

  return (
    <nav className="site-nav" ref={nav} aria-label="Main navigation">
      <div className="nav-inner">
        <Link className="site-brand" to="/"><FileText size={24} aria-hidden="true" />ResumeAI Pro</Link>
        <button className="nav-icon nav-theme" onClick={toggleTheme} aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
          {isDark ? <Sun size={19} /> : <Moon size={19} />}
        </button>
        <button ref={trigger} className="nav-icon nav-toggle" aria-label="Menu" aria-expanded={menuOpen}
                aria-controls="site-navigation" onClick={() => setOpenAt(menuOpen ? null : location.key)}>
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
        <div id="site-navigation" className={`nav-links ${menuOpen ? 'is-open' : ''}`}>
          {links.map(([to, label]) => <NavLink key={to} to={to} onClick={() => setOpenAt(null)}>{label}</NavLink>)}
          {isAuthenticated ? (
            <div className="nav-account">
              <Link to="/dashboard?tab=settings" className="nav-icon" aria-label="Account settings"><Settings size={18} /></Link>
              <Link to="/admin" className="nav-icon" aria-label="Admin dashboard"><Shield size={18} /></Link>
              <button className="nav-icon" aria-label={`Sign out of ${user?.email || 'account'}`}
                      onClick={async () => { await signOut(); navigate('/login') }}><LogOut size={18} /></button>
            </div>
          ) : (
            <div className="nav-account">
              <Link to="/login">Log in</Link>
              <Link className="btn-primary" to="/login?mode=register">Get started</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
