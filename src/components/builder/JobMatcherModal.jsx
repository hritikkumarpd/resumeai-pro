import React from 'react'
import { Target, Search, CheckCircle2, AlertCircle, Plus, X, Sparkles } from 'lucide-react'

export default function JobMatcherModal({ jdText, setJdText, analysis, onAddSkill, onClose, isLight }) {
  const { matchRate, matchedKeywords, missingKeywords, recommendations } = analysis

  const rateColor = matchRate >= 80 ? '#10B981' : matchRate >= 60 ? '#F59E0B' : '#EF4444'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-3xl rounded-2xl p-6 shadow-2xl border flex flex-col max-h-[90vh]"
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
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Search size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base" style={{ color: isLight ? '#0f172a' : '#f8fafc' }}>
                  Target Job Description Matcher & Keyword Gap
                </h3>
                {jdText.trim() && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-bold"
                    style={{ background: `${rateColor}22`, color: rateColor }}
                  >
                    {matchRate}% Match
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                Paste any job posting from LinkedIn, Indeed, or company careers page to find keyword gaps
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

        {/* Body */}
        <div className="my-4 flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Job description input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Paste Job Description (JD)</span>
              <span className="text-[10px] text-slate-400">
                {jdText.length} characters parsed
              </span>
            </label>
            <textarea
              value={jdText}
              onChange={e => setJdText(e.target.value)}
              placeholder="Paste the job description here... (e.g. 'We are looking for a Senior Software Engineer with expertise in React, TypeScript, Node.js, AWS, and distributed systems...')"
              rows={4}
              className="form-input text-xs py-2 px-3 w-full resize-y font-mono leading-relaxed"
            />
          </div>

          {/* Analysis Results (only if text provided) */}
          {jdText.trim() ? (
            <div className="space-y-4">
              {/* Score header */}
              <div
                className="p-3.5 rounded-xl border flex items-center justify-between"
                style={{
                  background: isLight ? '#f8fafc' : 'rgba(255,255,255,.03)',
                  borderColor: isLight ? '#e2e8f0' : 'rgba(255,255,255,.08)'
                }}
              >
                <div>
                  <div className="text-xs font-bold" style={{ color: isLight ? '#1e293b' : '#f1f5f9' }}>
                    Job Keyword Alignment: <span style={{ color: rateColor }}>{matchRate}%</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {matchedKeywords.length} matched keywords • {missingKeywords.length} missing keywords
                  </div>
                </div>

                <div className="w-24 bg-slate-700/40 h-2.5 rounded-full overflow-hidden border border-white/10">
                  <div
                    className="h-full transition-all duration-500 rounded-full"
                    style={{ width: `${matchRate}%`, background: rateColor }}
                  />
                </div>
              </div>

              {/* Missing keywords with 1-click add */}
              {missingKeywords.length > 0 && (
                <div
                  className="p-3.5 rounded-xl border"
                  style={{
                    background: isLight ? '#fffbeb' : 'rgba(245,158,11,.04)',
                    borderColor: isLight ? '#fde68a' : 'rgba(245,158,11,.2)'
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-amber-500 flex items-center gap-1.5">
                      <AlertCircle size={14} /> Missing High-Priority Keywords ({missingKeywords.length})
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Click + to add directly to your skills
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {missingKeywords.slice(0, 20).map(kw => (
                      <button
                        key={kw}
                        type="button"
                        onClick={() => onAddSkill(kw)}
                        className="text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-all flex items-center gap-1 cursor-pointer hover:scale-105"
                        style={{
                          background: isLight ? '#ffffff' : 'rgba(245,158,11,.15)',
                          borderColor: isLight ? '#fbbf24' : 'rgba(245,158,11,.35)',
                          color: isLight ? '#b45309' : '#fde68a'
                        }}
                        title={`Add "${kw}" to resume skills`}
                      >
                        <Plus size={11} />
                        <span>{kw}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Matched keywords */}
              {matchedKeywords.length > 0 && (
                <div
                  className="p-3.5 rounded-xl border"
                  style={{
                    background: isLight ? '#f0fdf4' : 'rgba(16,185,129,.04)',
                    borderColor: isLight ? '#bbf7d0' : 'rgba(16,185,129,.2)'
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-emerald-500 flex items-center gap-1.5">
                      <CheckCircle2 size={14} /> Already in Your Resume ({matchedKeywords.length})
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {matchedKeywords.map(kw => (
                      <span
                        key={kw}
                        className="text-[11px] px-2.5 py-1 rounded-lg border font-medium inline-flex items-center gap-1"
                        style={{
                          background: isLight ? '#ffffff' : 'rgba(16,185,129,.15)',
                          borderColor: isLight ? '#86efac' : 'rgba(16,185,129,.3)',
                          color: isLight ? '#15803d' : '#86efac'
                        }}
                      >
                        <CheckCircle2 size={10} />
                        <span>{kw}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">
              <Search size={32} className="mx-auto text-slate-600 mb-2" />
              <p className="text-xs font-semibold text-slate-300">No Job Description Pasted Yet</p>
              <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
                Paste any job posting above to instantly compare required qualifications against your resume text.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="pt-4 border-t flex items-center justify-between flex-shrink-0"
          style={{ borderColor: isLight ? '#e2e8f0' : 'rgba(255,255,255,.1)' }}
        >
          <button
            type="button"
            onClick={() => setJdText('')}
            disabled={!jdText.trim()}
            className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer disabled:opacity-40"
          >
            Clear Text
          </button>

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
