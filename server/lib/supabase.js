const { createClient } = require('@supabase/supabase-js')

const fallbackUrl = 'https://placeholder.supabase.co'
const fallbackKey = 'placeholder-anon-key'

const supabaseUrl = process.env.SUPABASE_URL || fallbackUrl
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || fallbackKey
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY !== 'your-service-role-key')
  ? process.env.SUPABASE_SERVICE_ROLE_KEY
  : supabaseAnonKey

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.warn('⚠️ SUPABASE_URL or SUPABASE_ANON_KEY is missing in server/.env — configure .env for live database operations')
}

// Service-role client (bypasses RLS if service key is provided, falls back to anon key)
const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

// Anon client (respects RLS — matches what frontend uses)
const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
)

module.exports = { supabase, supabaseAdmin }
