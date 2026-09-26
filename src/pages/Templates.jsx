import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, ArrowRight, Star, Filter, CheckCircle2 } from 'lucide-react'

const FILTERS = ['All', 'ATS-Safe', 'Photo Resume', 'Tech & SDE', 'College & Fresher', 'Corporate & MNC', 'Executive & Lead']

const templates = [
  {
    id: 1,
    name: "Classic ATS (Jake's / Overleaf)",
    category: 'Tech & SDE',
    popular: true,
    rating: 4.99,
    uses: '620k',
    bestFor: 'SDE, Tech, Startups & FAANG',
    badge: '🇮🇳 India SDE #1',
    type: 'jake'
  },
  {
    id: 2,
    name: "Deedy Two-Column (LaTeX)",
    category: 'Tech & SDE',
    popular: true,
    rating: 4.96,
    uses: '480k',
    bestFor: 'High-Information Tech Specialists',
    badge: 'Two-Column LaTeX',
    type: 'deedy'
  },
  {
    id: 3,
    name: "IIT / NIT Placement Standard",
    category: 'College & Fresher',
    popular: true,
    rating: 4.97,
    uses: '540k',
    bestFor: 'Campus TPO Placements & Internships',
    badge: 'Campus Standard',
    type: 'table'
  },
  {
    id: 4,
    name: "Harvard Classic (Ivy League)",
    category: 'Corporate & MNC',
    popular: false,
    rating: 4.93,
    uses: '310k',
    bestFor: 'Consulting, Finance & Management',
    badge: 'Ivy League Serif',
    type: 'harvard'
  },
  {
    id: 5,
    name: "Indian Corporate & MNC (TCS/Infosys)",
    category: 'Corporate & MNC',
    popular: true,
    rating: 4.94,
    uses: '710k',
    bestFor: 'TCS, Infosys, Wipro, Cognizant, Banking',
    badge: 'MNC Verified',
    type: 'corporate'
  },
  {
    id: 6,
    name: "Stanford Technical SDE (FAANG)",
    category: 'Tech & SDE',
    popular: true,
    rating: 4.98,
    uses: '430k',
    bestFor: 'Silicon Valley & Top Product Firms',
    badge: 'FAANG Clean',
    type: 'stanford'
  },
  {
    id: 7,
    name: "Compact 1-Page Fresher",
    category: 'College & Fresher',
    popular: false,
    rating: 4.91,
    uses: '380k',
    bestFor: 'Fresh Graduates with 0-2 Years Exp',
    badge: '1-Page Guaranteed',
    type: 'fresher'
  },
  {
    id: 8,
    name: "Minimalist Single Column (ATS Gold)",
    category: 'ATS-Safe',
    popular: true,
    rating: 4.99,
    uses: '490k',
    bestFor: 'Workday, Taleo & Darwinbox 100% Pass',
    badge: '100% ATS Gold',
    type: 'minimal'
  },
  {
    id: 9,
    name: "Executive / Tech Lead (Accent Bar)",
    category: 'Executive & Lead',
    popular: false,
    rating: 4.95,
    uses: '210k',
    bestFor: 'Staff SDE, Tech Leads & Architects',
    badge: 'Leadership Accent',
    type: 'executive'
  },
  {
    id: 10,
    name: "Modern Split-Header Technical",
    category: 'Tech & SDE',
    popular: false,
    rating: 4.92,
    uses: '260k',
    bestFor: 'Modern Full-Stack & Cloud Engineers',
    badge: 'Split Matrix',
    type: 'split'
  },
  {
    id: 11,
    name: "Modern Photo Executive (with Headshot)",
    category: 'Photo Resume',
    popular: true,
    rating: 4.97,
    uses: '340k',
    bestFor: 'Design, Product, Leadership & Profile Resumes',
    badge: '📸 With Headshot',
    type: 'photo-exec'
  },
  {
    id: 12,
    name: "Two-Column Tech with Photo",
    category: 'Photo Resume',
    popular: true,
    rating: 4.95,
    uses: '290k',
    bestFor: 'Modern Startups & European / Global Applications',
    badge: '📸 2-Column Photo',
    type: 'photo-twocolumn'
  },
]

function TemplateMock({ type }) {
  // Deedy 2-column layout mock
  if (type === 'deedy') {
    return (
      <div className="w-full h-full bg-white flex flex-col p-3 select-none overflow-hidden font-sans border-b border-slate-200">
        <div className="border-b border-black pb-1 mb-1">
          <div className="font-bold text-black text-[10px]">RAHUL SHARMA</div>
          <div className="text-[6.5px] text-gray-700">Software Development Engineer</div>
        </div>
        <div className="flex gap-2 flex-1">
          <div className="w-[35%] border-r border-gray-300 pr-1.5 flex flex-col gap-1 text-[6px]">
            <div className="font-bold text-black border-b border-black pb-0.5">LINKS</div>
            <div className="text-gray-600">rahul@email.com<br/>+91 9876543210</div>
            <div className="font-bold text-black border-b border-black pb-0.5 mt-0.5">EDUCATION</div>
            <div className="text-gray-800"><b>NIT</b><br/>B.Tech (CSE)<br/>8.8 CGPA</div>
            <div className="font-bold text-black border-b border-black pb-0.5 mt-0.5">SKILLS</div>
            <div className="text-gray-800">Java, Python, React, Node, Docker</div>
          </div>
          <div className="w-[65%] flex flex-col gap-1 text-[6.5px]">
            <div className="font-bold text-black border-b border-black pb-0.5">EXPERIENCE</div>
            <div className="font-semibold text-black">SDE-1 @ TechCorp</div>
            <div className="text-[5.5px] text-gray-700 leading-tight">• Built microservices handling 500k+ API reqs<br/>• Optimized latency by 40% using Redis</div>
            <div className="font-bold text-black border-b border-black pb-0.5 mt-0.5">PROJECTS</div>
            <div className="font-semibold text-black">Microservices Platform</div>
            <div className="text-[5.5px] text-gray-700 leading-tight">• Distributed backend with Docker & PostgreSQL</div>
          </div>
        </div>
      </div>
    )
  }

  // Academic Table layout mock (IIT / NIT)
  if (type === 'table') {
    return (
      <div className="w-full h-full bg-white flex flex-col p-3 select-none overflow-hidden font-sans border-b border-slate-200">
        <div className="flex justify-between items-start border-b-2 border-black pb-1 mb-1.5">
          <div>
            <div className="font-bold text-black text-[10px]">RAHUL SHARMA</div>
            <div className="text-[6.5px] text-gray-700">B.Tech Computer Science</div>
          </div>
          <div className="text-right text-[6px] text-gray-600">rahul@email.com<br/>+91 98765 43210</div>
        </div>
        <div className="text-[7px] font-bold bg-gray-100 border border-gray-400 px-1 py-0.5 mb-1 text-black">
          ACADEMIC QUALIFICATIONS
        </div>
        <div className="border border-gray-400 text-[5.5px] flex flex-col mb-1.5">
          <div className="flex bg-gray-100 font-bold border-b border-gray-400 px-1 py-0.5">
            <span className="flex-1">Degree</span>
            <span className="flex-1">Institute</span>
            <span className="w-6 text-center">Score</span>
            <span className="w-6 text-center">Year</span>
          </div>
          <div className="flex px-1 py-0.5 border-b border-gray-200 text-gray-800">
            <span className="flex-1 font-semibold">B.Tech (CSE)</span>
            <span className="flex-1">NIT</span>
            <span className="w-6 text-center font-bold">8.8</span>
            <span className="w-6 text-center">2023</span>
          </div>
        </div>
        <div className="text-[7px] font-bold bg-gray-100 border border-gray-400 px-1 py-0.5 mb-1 text-black">
          WORK EXPERIENCE
        </div>
        <div className="text-[6px] pl-1 text-gray-800">
          <span className="font-bold text-black">SDE-1 | TechCorp</span> (2023–Present)
          <div className="text-[5.5px] text-gray-600">• Deployed REST APIs handling 500k+ daily calls</div>
        </div>
      </div>
    )
  }

  // Harvard Classic Serif layout mock
  if (type === 'harvard') {
    return (
      <div className="w-full h-full bg-white flex flex-col p-3 select-none overflow-hidden font-serif border-b border-slate-200">
        <div className="text-center mb-1">
          <div className="font-bold text-black text-[11px] uppercase tracking-wider">RAHUL SHARMA</div>
          <div className="text-[6px] text-gray-700 border-t border-b border-black py-0.5 my-0.5">
            Bengaluru, India • rahul@email.com • +91 98765 43210
          </div>
        </div>
        <div className="text-center text-[7px] font-bold uppercase tracking-widest text-black border-b border-gray-400 pb-0.5 mb-1">
          EDUCATION
        </div>
        <div className="text-[6.5px] flex justify-between text-gray-800 mb-1">
          <span className="font-bold text-black">National Institute of Technology</span>
          <span className="italic">2019 – 2023</span>
        </div>
        <div className="text-center text-[7px] font-bold uppercase tracking-widest text-black border-b border-gray-400 pb-0.5 mb-1">
          EXPERIENCE
        </div>
        <div className="text-[6.5px] flex justify-between text-gray-800">
          <span className="font-bold text-black">TechCorp India</span>
          <span className="italic">Jul 2023 – Present</span>
        </div>
        <div className="text-[5.5px] text-gray-700 pl-2 leading-tight">• Engineered scalable RESTful services with Node.js & PostgreSQL</div>
      </div>
    )
  }

  // Executive Accent Bar mock
  if (type === 'executive') {
    return (
      <div className="w-full h-full bg-white flex flex-col p-3 select-none overflow-hidden font-sans border-b border-slate-200">
        <div className="border-b-2 border-black pb-1 mb-1.5 flex justify-between items-baseline">
          <div className="font-bold text-black text-[11px]">RAHUL SHARMA</div>
          <div className="text-[6px] text-gray-600">rahul@email.com</div>
        </div>
        <div className="text-[7px] font-bold uppercase text-black border-l-2 border-black pl-1.5 mb-1">
          EXECUTIVE SUMMARY
        </div>
        <div className="text-[5.5px] text-gray-800 leading-snug mb-1.5">
          Engineering leader with proven track record scaling high-throughput distributed architectures.
        </div>
        <div className="text-[7px] font-bold uppercase text-black border-l-2 border-black pl-1.5 mb-1">
          LEADERSHIP & EXPERIENCE
        </div>
        <div className="text-[6.5px] font-bold text-black">SDE-1 — TechCorp India</div>
        <div className="text-[5.5px] text-gray-700 pl-2 leading-tight">• Led architecture migration reducing p99 latency by 40%</div>
      </div>
    )
  }

  // Modern Split Header mock
  if (type === 'split') {
    return (
      <div className="w-full h-full bg-white flex flex-col p-3 select-none overflow-hidden font-sans border-b border-slate-200">
        <div className="border border-gray-300 bg-gray-50 p-1.5 mb-1.5 flex justify-between items-center rounded-sm">
          <div>
            <div className="font-bold text-black text-[10px]">RAHUL SHARMA</div>
            <div className="text-[6px] text-gray-700">Full-Stack SDE</div>
          </div>
          <div className="text-right text-[5.5px] text-gray-600 border-l border-gray-300 pl-1.5">
            rahul@email.com<br/>Bengaluru, India
          </div>
        </div>
        <div className="text-[7px] font-bold uppercase text-black border-b border-black pb-0.5 mb-1">
          SKILLS MATRIX
        </div>
        <div className="flex flex-wrap gap-1 mb-1.5">
          {['Java', 'React', 'Node.js', 'PostgreSQL', 'Docker'].map((s, i) => (
            <span key={i} className="text-[5.5px] border border-gray-300 px-1 py-0.2 bg-gray-50 text-black">
              {s}
            </span>
          ))}
        </div>
        <div className="text-[7px] font-bold uppercase text-black border-b border-black pb-0.5 mb-1">
          EXPERIENCE
        </div>
        <div className="text-[6.5px] font-bold text-black">TechCorp India</div>
        <div className="text-[5.5px] text-gray-700 pl-1">• Handled 500k+ daily API requests with Node.js</div>
      </div>
    )
  }

  // Photo Executive mock
  if (type === 'photo-exec') {
    return (
      <div className="w-full h-full bg-white flex flex-col p-3 select-none overflow-hidden font-sans border-b border-slate-200">
        <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-1.5">
          <div>
            <div className="font-bold text-black text-[10px]">HRITIK KUMAR</div>
            <div className="text-[6.5px] text-gray-700">SDE (AI & ML)</div>
            <div className="text-[5.5px] text-gray-500 mt-0.5">+91 94716 36126 | TMSL Kolkata</div>
          </div>
          <div className="w-7 h-7 rounded-full bg-slate-200 border-2 border-black flex items-center justify-center text-[10px]">
            👤
          </div>
        </div>
        <div className="flex flex-col gap-1 text-[6px]">
          <div className="font-bold border-b border-gray-300 pb-0.5">EXPERIENCE</div>
          <div className="font-semibold text-black">AI & ML Engineer Intern</div>
          <div className="text-[5.5px] text-gray-600">• Trained NLP models with 93.4% accuracy</div>
        </div>
      </div>
    )
  }

  // Photo Two-Column mock
  if (type === 'photo-twocolumn') {
    return (
      <div className="w-full h-full bg-white flex flex-col select-none overflow-hidden font-sans border-b border-slate-200">
        <div className="flex flex-1">
          <div className="w-[35%] bg-slate-100 p-2 border-r border-slate-200 flex flex-col items-center text-center gap-1">
            <div className="w-7 h-7 rounded-full bg-white border border-slate-300 flex items-center justify-center text-[9px] shadow-sm">
              👤
            </div>
            <div className="font-bold text-[7.5px] text-black">HRITIK KUMAR</div>
            <div className="text-[5px] text-gray-600">Gaya, Bihar</div>
            <div className="w-full border-t border-slate-300 mt-1 pt-1 text-[5px] text-gray-700 text-left">
              <b>SKILLS:</b><br/>Python, React, ML
            </div>
          </div>
          <div className="w-[65%] p-2 flex flex-col gap-1 text-[6px]">
            <div className="font-bold border-b border-black pb-0.5">WORK EXPERIENCE</div>
            <div className="text-[5.5px] text-gray-700 leading-tight">• Engineered NLP microservices with Docker</div>
          </div>
        </div>
      </div>
    )
  }

  // Default Classic Centered (Jake's / Overleaf / Standard)
  return (
    <div className="w-full h-full bg-white flex flex-col p-3 select-none overflow-hidden font-sans border-b border-slate-200">
      <div className="text-center pb-1 mb-1 border-b border-black">
        <div className="font-bold text-black text-[11px] uppercase tracking-wider">RAHUL SHARMA</div>
        <div className="text-[6.5px] text-gray-700 mt-0.5">
          +91 98765 43210 | rahul@email.com | Bengaluru | GitHub
        </div>
      </div>
      <div className="flex-1 flex flex-col gap-1">
        <div>
          <div className="text-[7px] font-bold uppercase text-black border-b border-black pb-0.5 mb-0.5">
            EDUCATION
          </div>
          <div className="flex justify-between text-[6.5px] text-gray-800">
            <span className="font-bold text-black">National Institute of Technology</span>
            <span className="text-gray-600">2019 – 2023</span>
          </div>
        </div>
        <div>
          <div className="text-[7px] font-bold uppercase text-black border-b border-black pb-0.5 mb-0.5">
            EXPERIENCE
          </div>
          <div className="flex justify-between text-[6.5px] mb-0.5">
            <span className="font-bold text-black">SDE-1 | TechCorp</span>
            <span className="text-gray-600">2023 – Present</span>
          </div>
          <div className="text-[5.5px] text-gray-700 pl-2 space-y-0.5 leading-tight">
            <div>• Architected microservices handling 500k+ daily requests</div>
            <div>• Implemented Redis caching, dropping latency by 40%</div>
          </div>
        </div>
        <div>
          <div className="text-[7px] font-bold uppercase text-black border-b border-black pb-0.5 mb-0.5">
            TECHNICAL SKILLS
          </div>
          <div className="text-[6px] text-gray-800 leading-tight">
            <span className="font-bold text-black">Languages:</span> Java, Python, C++, TypeScript, SQL
          </div>
        </div>
      </div>
    </div>
  )
}

function TemplateCard({ tpl }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div className="rounded-2xl overflow-hidden cursor-pointer group transition-all duration-300 hover:-translate-y-1.5"
         style={{
           border: hovered ? '2px solid #10B981' : '1px solid rgba(124,58,237,.25)',
           boxShadow: hovered ? '0 12px 30px rgba(16,185,129,.2)' : 'none',
           background: '#111338'
         }}
         onMouseEnter={() => setHovered(true)}
         onMouseLeave={() => setHovered(false)}>
      
      {/* Preview */}
      <div className="relative" style={{ height: 260 }}>
        <TemplateMock type={tpl.type} />

        {/* Top badge */}
        <div className="absolute top-2.5 left-2.5 text-[9.5px] font-bold px-2 py-0.5 rounded-full text-emerald-950 flex items-center gap-1 shadow-sm"
             style={{ background: '#34D399' }}>
          {tpl.badge}
        </div>

        {/* Hover overlay */}
        <div className={`absolute inset-0 flex flex-col items-center justify-center gap-2.5 transition-all duration-200 ${hovered ? 'opacity-100' : 'opacity-0'}`}
             style={{ background: 'rgba(9, 10, 32, 0.9)', backdropFilter: 'blur(4px)' }}>
          <div className="text-center px-4 mb-1">
            <div className="text-xs font-bold text-white mb-0.5">{tpl.name}</div>
            <div className="text-[11px] text-emerald-400">100% Black & White ATS Standard</div>
          </div>
          <Link to={`/builder?template=${encodeURIComponent(tpl.name)}`}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs text-white btn-primary">
            <ArrowRight size={13} /> Use This Template
          </Link>
        </div>
      </div>

      {/* Info */}
      <div className="p-3.5 border-t border-white/5" style={{ background: '#0D0F2E' }}>
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="font-bold text-sm text-slate-200">{tpl.name}</div>
          <div className="flex items-center gap-1 text-xs flex-shrink-0">
            <Star size={11} className="fill-yellow-400 text-yellow-400" />
            <span className="text-slate-300 font-semibold">{tpl.rating}</span>
          </div>
        </div>
        <div className="text-[11px] text-slate-400 flex items-center justify-between">
          <span className="truncate max-w-[200px]">{tpl.bestFor}</span>
          <span className="text-slate-500 flex-shrink-0">{tpl.uses} uses</span>
        </div>
      </div>
    </div>
  )
}

export default function Templates() {
  const [activeFilter, setActiveFilter] = useState('All')

  const filtered = activeFilter === 'All' ? templates : templates.filter(t => t.category === activeFilter)

  return (
    <main className="min-h-screen pt-[72px]">
      {/* Header */}
      <section className="py-14 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-grid pointer-events-none opacity-50" />
        <div className="absolute inset-0 pointer-events-none"
             style={{ background: 'radial-gradient(ellipse at 50% 0%,rgba(124,58,237,.25) 0%,transparent 60%)' }} />
        <div className="max-w-[1200px] mx-auto px-6 relative">
          <div className="section-tag mb-4 mx-auto w-fit"><CheckCircle2 size={12} /> Top 10 ATS Templates</div>
          <h1 className="font-heading font-extrabold mb-3" style={{ fontSize: 'clamp(2rem,4vw,3.5rem)' }}>
            Top 10 Most Used <span className="gradient-text">ATS Templates</span>
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-sm md:text-base">
            Widely recognized across Indian campus placements (IIT/NIT), IT Services (TCS/Infosys), and global tech firms (FAANG). 100% black & white, non-colorful, and ATS-optimized.
          </p>
        </div>
      </section>

      {/* Filters */}
      <section className="pb-4 sticky top-[72px] z-30" style={{ background: '#080920', borderBottom: '1px solid rgba(124,58,237,.15)' }}>
        <div className="max-w-[1200px] mx-auto px-6 py-3 flex gap-2 overflow-x-auto scrollbar-none">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setActiveFilter(f)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-all duration-200"
                    style={activeFilter === f
                      ? { background: 'linear-gradient(135deg,#7C3AED,#A855F7)', color: '#fff', boxShadow: '0 0 15px rgba(124,58,237,.4)' }
                      : { background: 'rgba(255,255,255,.05)', color: '#94A3B8', border: '1px solid rgba(255,255,255,.07)' }}>
              {f}
            </button>
          ))}
        </div>
      </section>

      {/* Grid */}
      <section className="py-10 max-w-[1200px] mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(tpl => (
            <TemplateCard key={tpl.id} tpl={tpl} />
          ))}
        </div>
      </section>
    </main>
  )
}
