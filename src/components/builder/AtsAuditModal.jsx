import React from 'react'
import { Target, CheckCircle2, AlertCircle, X, Sparkles, Zap, Award } from 'lucide-react'

export default function AtsAuditModal({ audit, onClose, onOptimizeSummary, isLight }) {
  if (!audit) return null

  const { score, grade, passedCount, totalChecks, checks, metricsCount, actionVerbsCount } = audit
  const scoreColor = score >= 85 ? '#10B981' : score >= 70 ? '#F59E0B' : '#EF4444'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-2xl rounded-2xl p-6 shadow-2xl border flex flex-col max-h-[90vh]"
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
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <Target size={18} style={{ color: scoreColor }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base" style={{ color: isLight ? '#0f172a' : '#f8fafc' }}>
                  ATS Score & Optimization Audit
                </h3>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-bold"
                  style={{ background: `${scoreColor}22`, color: scoreColor }}
                >
                  {grade}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Live compliance score matching Workday, Taleo, Greenhouse & Lever algorithms
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

        {/* Score Summary Banner */}
        <div className="grid grid-cols-3 gap-3 my-4 flex-shrink-0">
          <div
            className="p-3.5 rounded-xl border flex flex-col items-center justify-center text-center"
            style={{
              background: isLight ? '#f8fafc' : 'rgba(255,255,255,.03)',
              borderColor: isLight ? '#e2e8f0' : 'rgba(255,255,255,.08)'
            }}
          >
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
              Overall ATS Score
            </span>
            <div className="text-2xl font-black" style={{ color: scoreColor }}>
              {score}<span className="text-xs text-slate-400">/100</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5">{passedCount} of {totalChecks} checks passed</span>
          </div>

          <div
            className="p-3.5 rounded-xl border flex flex-col items-center justify-center text-center"
            style={{
              background: isLight ? '#f8fafc' : 'rgba(255,255,255,.03)',
              borderColor: isLight ? '#e2e8f0' : 'rgba(255,255,255,.08)'
            }}
          >
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
              Metrics Detected
            </span>
            <div className="text-2xl font-black text-cyan-400">
              {metricsCount}
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5">%, $, numbers in bullets</span>
          </div>

          <div
            className="p-3.5 rounded-xl border flex flex-col items-center justify-center text-center"
            style={{
              background: isLight ? '#f8fafc' : 'rgba(255,255,255,.03)',
              borderColor: isLight ? '#e2e8f0' : 'rgba(255,255,255,.08)'
            }}
          >
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
              Action Verbs
            </span>
            <div className="text-2xl font-black text-purple-400">
              {actionVerbsCount}
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5">High-impact power verbs</span>
          </div>
        </div>

        {/* Detailed Checks Checklist */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Detailed Audit Checklist
            </span>
            <span className="text-[11px] text-slate-500">
              Fix amber items to increase your match rate
            </span>
          </div>

          {checks.map(check => (
            <div
              key={check.id}
              className="p-3 rounded-xl border flex items-start gap-3 transition-colors"
              style={{
                background: check.passed
                  ? (isLight ? '#f0fdf4' : 'rgba(16,185,129,.04)')
                  : (isLight ? '#fffbeb' : 'rgba(245,158,11,.04)'),
                borderColor: check.passed
                  ? (isLight ? '#bbf7d0' : 'rgba(16,185,129,.2)')
                  : (isLight ? '#fde68a' : 'rgba(245,158,11,.25)')
              }}
            >
              <div className="mt-0.5 flex-shrink-0">
                {check.passed ? (
                  <CheckCircle2 size={16} className="text-emerald-500" />
                ) : (
                  <AlertCircle size={16} className="text-amber-400" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="text-xs font-semibold"
                    style={{ color: isLight ? '#1e293b' : '#f1f5f9' }}
                  >
                    {check.label}
                  </span>
                  <span
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                    style={{
                      background: check.passed ? 'rgba(16,185,129,.15)' : 'rgba(245,158,11,.15)',
                      color: check.passed ? '#10b981' : '#f59e0b'
                    }}
                  >
                    +{check.points}/{check.maxPoints} pts
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                  {check.tip}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div
          className="pt-4 border-t mt-4 flex items-center justify-between flex-shrink-0"
          style={{ borderColor: isLight ? '#e2e8f0' : 'rgba(255,255,255,.1)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer border ${
              isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300' : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
            }`}
          >
            Close Audit
          </button>

          <button
            type="button"
            onClick={onOptimizeSummary}
            className="btn-primary text-xs px-4 py-2 rounded-xl font-semibold shadow-lg shadow-purple-600/30 flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles size={13} />
            <span>AI Optimize Summary</span>
          </button>
        </div>
      </div>
    </div>
  )
}
