-- ================================================================
-- Fix Supabase Security Advisor Issues:
-- 1. "Exposed Auth Users" in public.admin_stats
-- 2. "Security Definer View" in public.admin_stats
-- ================================================================

-- Drop the old view that referenced auth.users
DROP VIEW IF EXISTS public.admin_stats;

-- Recreate using public.profiles and security_invoker = true
CREATE OR REPLACE VIEW public.admin_stats
WITH (security_invoker = true) AS
SELECT
  (SELECT COUNT(*) FROM public.profiles) AS total_users,
  (SELECT COUNT(*) FROM public.resumes) AS total_resumes,
  (SELECT COUNT(*) FROM public.cover_letters) AS total_cover_letters,
  (SELECT COUNT(*) FROM public.ats_history) AS total_ats_scans,
  (SELECT COUNT(*) FROM public.profiles WHERE plan = 'pro') AS pro_users,
  (SELECT COUNT(*) FROM public.profiles WHERE plan = 'lifetime') AS lifetime_users,
  (SELECT COUNT(*) FROM public.profiles WHERE created_at > NOW() - INTERVAL '7 days') AS new_users_week,
  (SELECT COUNT(*) FROM public.profiles WHERE created_at > NOW() - INTERVAL '30 days') AS new_users_month;

-- Revoke public API access (prevents anon/authenticated roles from querying it)
REVOKE ALL ON public.admin_stats FROM anon, authenticated;
GRANT SELECT ON public.admin_stats TO service_role;
