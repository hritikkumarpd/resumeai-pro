import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { authApi } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  /* ── Load session on mount ────────────────────────────────── */
  useEffect(() => {
    // Purge any legacy demo user session
    localStorage.removeItem('demo_user')

    // Get initial Supabase session
    supabase.auth.getSession().then(({ data }) => {
      const session = data?.session
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile()
      else setLoading(false)
    }).catch(err => {
      console.warn('Supabase not configured or unreachable:', err?.message)
      setLoading(false)
    })

    // Listen for auth changes
    try {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (session?.user) {
            setUser(session.user)
            await fetchProfile()
          } else {
            setUser(null)
            setProfile(null)
            setLoading(false)
          }
        }
      )
      return () => subscription?.unsubscribe?.()
    } catch (err) {
      console.warn('Supabase auth state listener skipped:', err?.message)
    }
  }, [])

  /* ── Fetch user profile from our API (with Supabase fallback) ── */
  const fetchProfile = useCallback(async () => {
    try {
      const { data } = await authApi.me()
      if (data) {
        setProfile(data)
        return
      }
    } catch (err) {
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const currentUserId = sessionData?.session?.user?.id
        if (currentUserId) {
          const { data: dbProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUserId)
            .single()
          if (dbProfile) {
            setProfile(dbProfile)
            return
          }
        }
      } catch (_) {}
    } finally {
      setLoading(false)
    }
  }, [])

  /* ── Auth Actions ─────────────────────────────────────────── */
  const signUp = async ({ email, password, full_name }) => {
    try {
      // 1. Try server register API (sends welcome email + auto-confirms if service key exists)
      const { data } = await authApi.register({ email, password, full_name })
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (!error) return data
    } catch (apiErr) {
      console.warn('Backend register failed, falling back to direct Supabase signup:', apiErr?.message)
    }

    // 2. Fallback: Direct Supabase Client Sign Up
    const { data: directData, error: directError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name } },
    })
    if (directError) throw directError

    // Try logging in immediately (succeeds if email confirmation is turned off)
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })
    if (loginError) {
      if (loginError.message?.toLowerCase().includes('email not confirmed')) {
        throw new Error('Please check your email to confirm your account, or disable "Confirm email" in your Supabase Auth settings.')
      }
      throw loginError
    }

    return directData
  }

  const signIn = async ({ email, password }) => {
    const { error, data } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    })
    if (error) throw error
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
    } catch (_) {}
    localStorage.removeItem('demo_user')
    setUser(null)
    setProfile(null)
  }

  const forgotPassword = async (email) => {
    await authApi.forgotPassword({ email })
  }

  const updateProfile = async (updates) => {
    // 1. Try backend API update
    try {
      await authApi.updateProfile(updates)
    } catch (apiErr) {
      console.warn('Backend updateProfile skipped:', apiErr?.message)
    }

    // 2. Update Supabase Auth user_metadata (NEVER pass base64 photos to user_metadata as it balloons JWT into HTTP 431!)
    try {
      const safeMetadata = { ...updates }
      delete safeMetadata.photo
      if (typeof safeMetadata.avatar_url === 'string' && safeMetadata.avatar_url.startsWith('data:')) {
        delete safeMetadata.avatar_url
      }
      if (Object.keys(safeMetadata).length > 0) {
        const { data: updatedUser, error: authErr } = await supabase.auth.updateUser({
          data: safeMetadata,
        })
        if (!authErr && updatedUser?.user) {
          setUser(updatedUser.user)
        }
      }
    } catch (e) {
      console.warn('Supabase updateUser metadata error:', e?.message)
    }

    // 3. Update Supabase profiles table directly
    try {
      if (user?.id) {
        const profileUpdates = {
          updated_at: new Date().toISOString(),
        }
        if (updates.full_name || updates.name) profileUpdates.full_name = updates.full_name || updates.name
        if (updates.avatar_url || updates.photo !== undefined) profileUpdates.avatar_url = updates.photo || updates.avatar_url || ''
        await supabase
          .from('profiles')
          .update(profileUpdates)
          .eq('id', user.id)
      }
    } catch (_) {}

    // 4. Save to localStorage per user ID and global photo key
    if (updates.photo !== undefined) {
      if (updates.photo) {
        localStorage.setItem('resumeai_user_photo', updates.photo)
      } else {
        localStorage.removeItem('resumeai_user_photo')
      }
    }
    if (user?.id) {
      const storageKey = `user_default_resume_${user.id}`
      const existing = JSON.parse(localStorage.getItem(storageKey) || '{}')
      localStorage.setItem(storageKey, JSON.stringify({ ...existing, ...updates }))
    }

    // 5. Update local profile state
    setProfile(prev => ({
      ...(prev || {}),
      ...updates,
      full_name: updates.full_name || updates.name || prev?.full_name,
    }))
  }

  const getUserDefaults = useCallback(() => {
    if (!user?.id) return {}
    const local = JSON.parse(localStorage.getItem(`user_default_resume_${user.id}`) || '{}')
    const fullName = local.name || local.full_name || profile?.full_name || user.user_metadata?.full_name || ''
    const savedPhoto = local.photo || profile?.photo || profile?.avatar_url || user.user_metadata?.photo || user.user_metadata?.avatar_url || localStorage.getItem('resumeai_user_photo') || ''
    return {
      name: fullName || (user.email ? user.email.split('@')[0] : ''),
      email: local.email || user.email || '',
      phone: local.phone || user.user_metadata?.phone || '',
      title: local.title || user.user_metadata?.title || '',
      location: local.location || user.user_metadata?.location || '',
      linkedin: local.linkedin || user.user_metadata?.linkedin || '',
      website: local.website || user.user_metadata?.website || '',
      summary: local.summary || user.user_metadata?.summary || '',
      skills: local.skills || user.user_metadata?.skills || '',
      photo: savedPhoto,
    }
  }, [user, profile])

  const refreshProfile = () => fetchProfile()

  const value = {
    user,
    profile,
    loading,
    isAuthenticated: !!user,
    isPro:           profile?.plan === 'pro' || profile?.plan === 'lifetime',
    isLifetime:      profile?.plan === 'lifetime',
    plan:            profile?.plan || 'free',
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    forgotPassword,
    updateProfile,
    getUserDefaults,
    refreshProfile,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
