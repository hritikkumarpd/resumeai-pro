import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Eye, EyeOff, ArrowRight, Mail, AlertCircle, CheckCircle2, ArrowLeft, RefreshCw } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [tab,           setTab]           = useState('login') // 'login' | 'register'
  const [showPass,      setShowPass]      = useState(false)
  const [apiError,      setApiError]      = useState('')
  const [loading,       setLoading]       = useState(false)
  const [forgotMode,    setForgotMode]    = useState(false)
  const [forgotEmail,   setForgotEmail]   = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotMsg,     setForgotMsg]     = useState('')
  const [forgotError,   setForgotError]   = useState('')

  const { signIn, signUp, signInWithGoogle, forgotPassword } = useAuth()
  const navigate = useNavigate()
  const { register, handleSubmit, formState: { errors }, reset } = useForm()

  const switchTab = (t) => {
    setTab(t)
    setApiError('')
    setForgotMode(false)
    setForgotMsg('')
    setForgotError('')
    reset()
  }

  const onSubmit = async (data) => {
    setLoading(true)
    setApiError('')
    try {
      if (tab === 'login') {
        await signIn({ email: data.email, password: data.password })
      } else {
        await signUp({ email: data.email, password: data.password, full_name: data.name })
      }
      navigate('/dashboard')
    } catch (err) {
      setApiError(err.message || 'Authentication failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    try {
      await signInWithGoogle()
    } catch (err) {
      setApiError(err.message || 'Google sign-in failed.')
    }
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    if (!forgotEmail || !/^\S+@\S+\.\S+$/.test(forgotEmail)) {
      setForgotError('Please enter a valid email address.')
      return
    }
    setForgotLoading(true)
    setForgotError('')
    setForgotMsg('')
    try {
      await forgotPassword(forgotEmail)
      setForgotMsg('Password reset link has been dispatched. Please check your inbox.')
    } catch (err) {
      setForgotError(err.message || 'Failed to request password reset.')
    } finally {
      setForgotLoading(false)
    }
  }

  return (
    <div className="min-h-screen pt-28 pb-16 flex items-center justify-center px-4">
      <div className="w-full max-w-[440px]">
        {/* Card */}
        <div className="glass-card p-8 shadow-2xl relative overflow-hidden">
          {/* Subtle gradient banner */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 via-cyan-500 to-purple-600" />

          {/* ── Forgot Password View ─────────────────────────────────── */}
          {forgotMode ? (
            <div>
              <button
                type="button"
                onClick={() => setForgotMode(false)}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors mb-6 cursor-pointer"
              >
                <ArrowLeft size={14} /> Back to Sign In
              </button>

              <div className="text-center mb-6">
                <h1 className="font-heading font-extrabold text-2xl text-white mb-2">
                  Reset Password
                </h1>
                <p className="text-slate-400 text-sm">
                  Enter your email address and we will send you a link to reset your password.
                </p>
              </div>

              {forgotMsg && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-xl mb-4 text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                  <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>{forgotMsg}</span>
                </div>
              )}

              {forgotError && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-xl mb-4 text-xs bg-red-500/10 border border-red-500/30 text-red-300">
                  <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <span>{forgotError}</span>
                </div>
              )}

              <form onSubmit={handleForgotPassword} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-slate-400">Email Address</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="form-input pl-10 text-sm"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="btn-primary w-full py-3.5 rounded-xl mt-2 gap-2 justify-center disabled:opacity-60 cursor-pointer text-sm font-semibold flex items-center"
                >
                  {forgotLoading ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Sending Link...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Reset Link</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            /* ── Sign In / Sign Up View ───────────────────────────────── */
            <>
              <div className="text-center mb-8">
                <h1 className="font-heading font-extrabold text-2xl text-white mb-2">
                  {tab === 'login' ? 'Welcome Back' : 'Create Your Account'}
                </h1>
                <p className="text-slate-400 text-sm">
                  {tab === 'login'
                    ? 'Sign in to access your resumes and ATS scores'
                    : 'Build FAANG-ready resumes with real-time AI scoring'}
                </p>
              </div>

              {/* Tab switcher */}
              <div className="flex p-1 rounded-xl mb-6 bg-white/[0.04] border border-purple-500/20">
                <button
                  type="button"
                  onClick={() => switchTab('login')}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                    tab === 'login'
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => switchTab('register')}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                    tab === 'register'
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Sign Up Free
                </button>
              </div>

              {/* Social button */}
              <div className="flex flex-col gap-3 mb-6">
                <button
                  type="button"
                  onClick={handleGoogle}
                  className="btn-secondary w-full py-3 rounded-xl gap-3 text-sm justify-center cursor-pointer"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </button>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 mb-6">
                <div className="flex-1 h-px bg-purple-500/20" />
                <span className="text-slate-500 text-xs">or continue with email</span>
                <div className="flex-1 h-px bg-purple-500/20" />
              </div>

              {/* Error banner */}
              {apiError && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-xl mb-4 text-xs bg-red-500/10 border border-red-500/30 text-red-300">
                  <AlertCircle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <span className="leading-snug">{apiError}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
                {tab === 'register' && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-slate-400">Full Name</label>
                    <input
                      {...register('name', { required: 'Full name is required' })}
                      placeholder="Enter your full name"
                      className={`form-input ${errors.name ? 'border-red-500' : ''}`}
                    />
                    {errors.name && <span className="text-red-400 text-xs">{errors.name.message}</span>}
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-slate-400">Email Address</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      {...register('email', {
                        required: 'Email is required',
                        pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email address' }
                      })}
                      type="email"
                      placeholder="you@example.com"
                      className={`form-input pl-10 ${errors.email ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {errors.email && <span className="text-red-400 text-xs">{errors.email.message}</span>}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-slate-400">Password</label>
                  <div className="relative">
                    <input
                      {...register('password', {
                        required: 'Password is required',
                        minLength: { value: 6, message: 'Minimum 6 characters' }
                      })}
                      type={showPass ? 'text' : 'password'}
                      placeholder="••••••••"
                      className={`form-input pr-10 ${errors.password ? 'border-red-500' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(v => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {errors.password && <span className="text-red-400 text-xs">{errors.password.message}</span>}
                </div>

                {tab === 'login' && (
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => {
                        const formEmail = document.querySelector('input[type="email"]')?.value || ''
                        setForgotEmail(formEmail)
                        setForgotMode(true)
                      }}
                      className="text-purple-400 text-xs hover:text-purple-300 transition-colors cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-3.5 rounded-xl mt-2 gap-2 justify-center disabled:opacity-60 cursor-pointer text-sm font-semibold flex items-center"
                >
                  {loading ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>{tab === 'login' ? 'Logging in...' : 'Creating account...'}</span>
                    </>
                  ) : (
                    <>
                      <span>{tab === 'login' ? 'Log In' : 'Create Free Account'}</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>

              <p className="text-center text-slate-500 text-xs mt-5">
                {tab === 'login' ? "Don't have an account? " : 'Already have an account? '}
                <button
                  type="button"
                  onClick={() => switchTab(tab === 'login' ? 'register' : 'login')}
                  className="text-purple-400 hover:text-purple-300 font-medium transition-colors cursor-pointer"
                >
                  {tab === 'login' ? 'Sign up free' : 'Log in'}
                </button>
              </p>
            </>
          )}
        </div>

        <p className="text-center text-slate-600 text-xs mt-5">
          By continuing, you agree to our{' '}
          <Link to="/pricing" className="text-purple-400 hover:text-purple-300">Terms</Link>{' '}and{' '}
          <Link to="/pricing" className="text-purple-400 hover:text-purple-300">Privacy Policy</Link>
        </p>
      </div>
    </div>
  )
}
