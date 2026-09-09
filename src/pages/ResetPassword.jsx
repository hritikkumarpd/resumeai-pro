import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { KeyRound, CheckCircle2, AlertCircle, RefreshCw, ArrowRight } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const navigate = useNavigate()

  const handleReset = async (e) => {
    e.preventDefault()
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    setError('')
    try {
      const { error: updateErr } = await supabase.auth.updateUser({ password })
      if (updateErr) throw updateErr

      setSuccess(true)
      setTimeout(() => {
        navigate('/dashboard')
      }, 2000)
    } catch (err) {
      setError(err.message || 'Failed to update password. Your reset link may have expired.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen pt-28 pb-16 flex items-center justify-center px-4">
      <div className="w-full max-w-[440px]">
        <div className="glass-card p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 via-cyan-500 to-purple-600" />

          <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center mx-auto mb-5 text-purple-400">
            <KeyRound size={24} />
          </div>

          <div className="text-center mb-6">
            <h1 className="font-heading font-extrabold text-2xl text-white mb-2">
              Set New Password
            </h1>
            <p className="text-slate-400 text-sm">
              Please enter your new password below.
            </p>
          </div>

          {success ? (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-center">
              <CheckCircle2 size={32} className="mx-auto text-emerald-400 mb-2" />
              <p className="font-semibold text-sm">Password Updated!</p>
              <p className="text-xs text-slate-400 mt-1">Redirecting you to your dashboard...</p>
            </div>
          ) : (
            <form onSubmit={handleReset} className="flex flex-col gap-4">
              {error && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-xl text-xs bg-red-500/10 border border-red-500/30 text-red-300">
                  <AlertCircle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <span className="leading-snug">{error}</span>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-400">New Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="form-input text-sm"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-400">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="form-input text-sm"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3.5 rounded-xl mt-2 gap-2 justify-center disabled:opacity-60 cursor-pointer text-sm font-semibold flex items-center"
              >
                {loading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <span>Save New Password</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <Link to="/login" className="text-xs text-slate-400 hover:text-purple-400 transition-colors">
                  ← Return to Login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
