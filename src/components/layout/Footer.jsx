import { Link } from 'react-router-dom'

const links = [
  ['/builder', 'Resume Builder'], ['/templates', 'Templates'], ['/ats-checker', 'ATS Checker'],
  ['/cover-letter', 'Cover Letter'], ['/pricing', 'Pricing'],
]

export default function Footer() {
  return (
    <footer className="site-footer">
      <div>
        <Link to="/" className="site-brand">DailyResumeAI</Link>
        <nav aria-label="Footer navigation">
          {links.map(([to, label]) => <Link key={to} to={to}>{label}</Link>)}
        </nav>
        <small>© {new Date().getFullYear()} DailyResumeAI</small>
      </div>
    </footer>
  )
}
