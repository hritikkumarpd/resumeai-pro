import React, { useState } from 'react'
import { Zap, Copy, Check, X } from 'lucide-react'

export default function ActionVerbsModal({ categories, onClose, isLight }) {
  const [copiedVerb, setCopiedVerb] = useState('')
  const [activeTab, setActiveTab] = useState(categories[0]?.category || '')

  const handleCopy = (verb) => {
    navigator.clipboard.writeText(verb)
    setCopiedVerb(verb)
    setTimeout(() => setCopiedVerb(''), 1500)
  }

  const currentCategory = categories.find(c => c.category === activeTab) || categories[0]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-2xl rounded-2xl p-6 shadow-2xl border flex flex-col max-h-[85vh]"
        style={{
          background: isLight ? '#ffffff' : '#0e1136',
          borderColor: isLight ? '#cbd5e1' : 'rgba(124,58,237,.35)'
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between pb-4 border-b flex-shrink-0"
          style={{ borderColor: isLight ? '#e2e8f0' : 'rgba(255,255,255,.1)' }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Zap size={18} />
            </div>
            <div>
              <h3 className="font-bold text-base" style={{ color: isLight ? '#0f172a' : '#f8fafc' }}>
                Action Verbs Power Bank
              </h3>
              <p className="text-[11px] text-slate-400">
                Click any power verb to copy and begin your bullet points with high impact
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isLight ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-100' : 'text-slate-400 hover:text-slate-100 hover:bg-white/10'
            }`}
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-3 border-b flex-shrink-0"
             style={{ borderColor: isLight ? '#e2e8f0' : 'rgba(255,255,255,.08)' }}>
          {categories.map(cat => {
            const isActive = cat.category === activeTab
            return (
              <button
                key={cat.category}
                type="button"
                onClick={() => setActiveTab(cat.category)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer"
                style={{
                  background: isActive
                    ? 'linear-gradient(135deg, #7c3aed, #06b6d4)'
                    : (isLight ? '#f1f5f9' : 'rgba(255,255,255,.04)'),
                  color: isActive ? '#ffffff' : (isLight ? '#475569' : '#94a3b8'),
                  border: `1px solid ${isActive ? 'transparent' : (isLight ? '#cbd5e1' : 'rgba(255,255,255,.08)')}`
                }}
              >
                {cat.category}
              </button>
            )
          })}
        </div>

        {/* Verbs Grid */}
        <div className="py-4 flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {currentCategory?.verbs.map(verb => {
              const isCopied = copiedVerb === verb
              return (
                <button
                  key={verb}
                  type="button"
                  onClick={() => handleCopy(verb)}
                  className="p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all cursor-pointer hover:scale-[1.02]"
                  style={{
                    background: isCopied
                      ? (isLight ? '#dcfce7' : 'rgba(16,185,129,.2)')
                      : (isLight ? '#f8fafc' : 'rgba(255,255,255,.03)'),
                    borderColor: isCopied
                      ? '#22c55e'
                      : (isLight ? '#e2e8f0' : 'rgba(255,255,255,.08)'),
                    color: isCopied
                      ? (isLight ? '#15803d' : '#86efac')
                      : (isLight ? '#1e293b' : '#f1f5f9')
                  }}
                  title="Click to copy"
                >
                  <span>{verb}</span>
                  {isCopied ? (
                    <Check size={13} className="text-emerald-500" />
                  ) : (
                    <Copy size={12} className="text-slate-400 opacity-60" />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div
          className="pt-4 border-t flex items-center justify-between flex-shrink-0"
          style={{ borderColor: isLight ? '#e2e8f0' : 'rgba(255,255,255,.1)' }}
        >
          <span className="text-[11px] text-slate-400">
            Tip: Combine action verbs with metrics: e.g. "<strong>{currentCategory?.verbs[0] || 'Architected'}</strong> [system] resulting in [25% speedup]".
          </span>

          <button
            type="button"
            onClick={onClose}
            className="btn-primary text-xs px-4 py-2 rounded-xl font-semibold cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
