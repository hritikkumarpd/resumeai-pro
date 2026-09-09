import { Link } from 'react-router-dom'
import { Zap, Globe, Share2, Mail, ExternalLink } from 'lucide-react'

const footerLinks = {
  Product: [
    { label: 'Resume Builder', href: '/builder' },
    { label: 'ATS Checker',   href: '/ats-checker' },
    { label: 'Templates',     href: '/templates' },
    { label: 'Cover Letter',  href: '/cover-letter' },
    { label: 'Pricing',       href: '/pricing' },
  ],
  Company: [
    { label: 'About',    href: '#' },
    { label: 'Blog',     href: '#' },
    { label: 'Careers',  href: '#' },
    { label: 'Press',    href: '#' },
    { label: 'Contact',  href: '#' },
  ],
  Legal: [
    { label: 'Privacy Policy', href: '#' },
    { label: 'Terms of Use',   href: '#' },
    { label: 'Cookie Policy',  href: '#' },
    { label: 'GDPR',           href: '#' },
  ],
}

const socials = [
  { icon: Share2,      href: '#', label: 'Twitter'  },
  { icon: Globe,       href: '#', label: 'LinkedIn'  },
  { icon: ExternalLink,href: '#', label: 'GitHub'   },
  { icon: Mail,        href: '#', label: 'Newsletter'},
]

export default function Footer() {
  return (
    <footer className="bg-[#0D0F2E] border-t border-[#7C3AED]/20 pt-16 pb-8">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-[10px] flex items-center justify-center shadow-[0_0_16px_rgba(124,58,237,0.5)]"
                   style={{ background: 'linear-gradient(135deg,#7C3AED,#06B6D4)' }}>
                <Zap size={18} className="text-white" fill="white" />
              </div>
              <span className="font-heading font-extrabold text-xl gradient-text">ResumeAI Pro</span>
            </Link>
            <p className="text-slate-500 text-sm leading-relaxed max-w-[260px] mb-5">
              The world's most intelligent AI resume builder. Land your dream job with resumes that get past ATS and impress recruiters.
            </p>
            <div className="flex gap-2.5">
              {socials.map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 transition-all duration-150 hover:-translate-y-0.5"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(124,58,237,0.2)' }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(124,58,237,0.2)'
                    e.currentTarget.style.borderColor = 'rgba(124,58,237,0.5)'
                    e.currentTarget.style.color = '#A78BFA'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                    e.currentTarget.style.borderColor = 'rgba(124,58,237,0.2)'
                    e.currentTarget.style.color = ''
                  }}
                >
                  <Icon size={15} />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-xs font-semibold text-white uppercase tracking-widest mb-4">{category}</h4>
              <ul className="flex flex-col gap-2.5">
                {links.map(link => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      className="text-slate-500 text-sm hover:text-purple-light transition-colors duration-150"
                      style={{ '--tw-text-opacity': 1 }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-[#7C3AED]/15 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-slate-600 text-sm">
            © {new Date().getFullYear()} ResumeAI Pro. All rights reserved.
          </p>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-600 text-sm">Made with</span>
            <span className="text-pink-500 text-sm">♥</span>
            <span className="text-slate-600 text-sm">for job seekers worldwide</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#10B981]" />
            <span className="text-slate-500 text-xs">All systems operational</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
