import React, { useState } from 'react'
import { BookOpen, Check, X, Sparkles, ArrowRight, UserCheck, Briefcase } from 'lucide-react'

export default function RolePresetsModal({ presets, onSelectPreset, onClose, isLight }) {
  const [selectedId, setSelectedId] = useState(presets[0]?.id || '')

  const currentPreset = presets.find(p => p.id === selectedId) || presets[0]

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
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <BookOpen size={18} />
            </div>
            <div>
              <h3 className="font-bold text-base" style={{ color: isLight ? '#0f172a' : '#f8fafc' }}>
                Load Role Examples & Sample Resumes
              </h3>
              <p className="text-[11px] text-slate-400">
                1-click populate realistic industry-standard achievements, quantifiable metrics & skills
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

        {/* Content: Left List / Right Preview */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 my-4 flex-1 overflow-hidden">
          {/* Preset Selection List */}
          <div className="md:col-span-2 overflow-y-auto space-y-2 pr-1">
            {presets.map(p => {
              const isSelected = p.id === selectedId
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedId(p.id)}
                  className="w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-1"
                  style={{
                    background: isSelected
                      ? (isLight ? '#f5f3ff' : 'rgba(124,58,237,.15)')
                      : (isLight ? '#f8fafc' : 'rgba(255,255,255,.03)'),
                    borderColor: isSelected
                      ? '#8b5cf6'
                      : (isLight ? '#e2e8f0' : 'rgba(255,255,255,.08)')
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                      {p.roleCategory}
                    </span>
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded font-medium"
                      style={{
                        background: isLight ? '#ede9fe' : 'rgba(124,58,237,.25)',
                        color: isLight ? '#6d28d9' : '#c4b5fd'
                      }}
                    >
                      {p.tag}
                    </span>
                  </div>
                  <span
                    className="text-xs font-semibold leading-tight line-clamp-1"
                    style={{ color: isLight ? '#1e293b' : '#f8fafc' }}
                  >
                    {p.data.personal.title}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {p.data.experience.length} experiences • {p.data.skills.length} skills
                  </span>
                </button>
              )
            })}
          </div>

          {/* Preset Detail Preview */}
          <div
            className="md:col-span-3 rounded-xl p-4 border flex flex-col overflow-y-auto"
            style={{
              background: isLight ? '#f8fafc' : 'rgba(255,255,255,.02)',
              borderColor: isLight ? '#e2e8f0' : 'rgba(255,255,255,.08)'
            }}
          >
            <div className="flex items-center justify-between pb-2 border-b mb-3"
                 style={{ borderColor: isLight ? '#e2e8f0' : 'rgba(255,255,255,.08)' }}>
              <div>
                <h4 className="font-bold text-sm" style={{ color: isLight ? '#0f172a' : '#f8fafc' }}>
                  {currentPreset.data.personal.name}
                </h4>
                <p className="text-xs text-purple-400 font-medium">
                  {currentPreset.data.personal.title}
                </p>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                {currentPreset.data.personal.location}
              </span>
            </div>

            {/* Summary preview */}
            <div className="mb-3">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Professional Summary</span>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                {currentPreset.data.summary}
              </p>
            </div>

            {/* Top Skills */}
            <div className="mb-3">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Featured Skills</span>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {currentPreset.data.skills.slice(0, 10).map(s => (
                  <span
                    key={s}
                    className="text-[10px] px-2 py-0.5 rounded"
                    style={{
                      background: isLight ? '#ede9fe' : 'rgba(124,58,237,.15)',
                      color: isLight ? '#5b21b6' : '#c4b5fd'
                    }}
                  >
                    {s}
                  </span>
                ))}
                {currentPreset.data.skills.length > 10 && (
                  <span className="text-[10px] text-slate-500 self-center">
                    +{currentPreset.data.skills.length - 10} more
                  </span>
                )}
              </div>
            </div>

            {/* Experience snippet */}
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Experience Highlight</span>
              {currentPreset.data.experience.slice(0, 1).map(exp => (
                <div key={exp.id} className="mt-1.5 text-xs text-slate-300">
                  <div className="font-semibold text-slate-200">{exp.role} @ {exp.company}</div>
                  <ul className="list-disc list-inside text-[11px] text-slate-400 mt-1 space-y-1">
                    {exp.bullets.slice(0, 2).map((b, i) => <li key={i}>{b}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          className="pt-4 border-t flex items-center justify-between flex-shrink-0"
          style={{ borderColor: isLight ? '#e2e8f0' : 'rgba(255,255,255,.1)' }}
        >
          <span className="text-[11px] text-slate-400">
            ⚠ Loading will overwrite current form fields with this sample template data.
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer border ${
                isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300' : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
              }`}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() => onSelectPreset(currentPreset)}
              className="btn-primary text-xs px-4 py-2 rounded-xl font-semibold shadow-lg shadow-purple-600/30 flex items-center gap-1.5 cursor-pointer"
            >
              <UserCheck size={14} />
              <span>Load "{currentPreset.data.personal.title}"</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
