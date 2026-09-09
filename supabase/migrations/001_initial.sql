-- ================================================================
-- ResumeAI Pro — Supabase Database Schema
-- Run this in Supabase SQL Editor (supabase.com → SQL Editor)
-- ================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Profiles (extends Supabase auth.users) ─────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name     TEXT,
  avatar_url    TEXT,
  plan          TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free','pro','lifetime')),
  stripe_customer_id     TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  subscription_status    TEXT DEFAULT 'inactive',
  subscription_end       TIMESTAMPTZ,
  resume_count  INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own profile"   ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Prevent regular users from tampering with plan, subscription, or resume count
CREATE OR REPLACE FUNCTION public.protect_profile_system_columns()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF (auth.role() = 'authenticated') THEN
    IF (NEW.plan IS DISTINCT FROM OLD.plan) THEN
      RAISE EXCEPTION 'Modifying subscription plan directly is prohibited. Please purchase via checkout.';
    END IF;
    IF (NEW.subscription_status IS DISTINCT FROM OLD.subscription_status) THEN
      NEW.subscription_status := OLD.subscription_status;
    END IF;
    IF (NEW.subscription_end IS DISTINCT FROM OLD.subscription_end) THEN
      NEW.subscription_end := OLD.subscription_end;
    END IF;
    IF (NEW.resume_count IS DISTINCT FROM OLD.resume_count) THEN
      NEW.resume_count := OLD.resume_count;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_system_columns ON public.profiles;
CREATE TRIGGER trg_protect_profile_system_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_system_columns();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', NEW.raw_user_meta_data ->> 'picture')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── Resumes ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.resumes (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title         TEXT NOT NULL DEFAULT 'My Resume',
  data          JSONB NOT NULL DEFAULT '{}',
  template      TEXT NOT NULL DEFAULT 'Modern Dark',
  accent_color  TEXT NOT NULL DEFAULT '#7C3AED',
  font          TEXT NOT NULL DEFAULT 'Inter',
  ats_score     INT CHECK (ats_score >= 0 AND ats_score <= 100),
  pdf_url       TEXT,
  is_public     BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own resumes" ON public.resumes
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;
CREATE TRIGGER resumes_updated_at BEFORE UPDATE ON public.resumes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── ATS Score History ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ats_history (
  id                UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id           UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  resume_id         UUID REFERENCES public.resumes(id) ON DELETE SET NULL,
  job_title         TEXT,
  company           TEXT,
  job_description   TEXT NOT NULL,
  resume_text       TEXT NOT NULL,
  score             INT NOT NULL CHECK (score >= 0 AND score <= 100),
  matched_keywords  TEXT[] DEFAULT '{}',
  missing_keywords  TEXT[] DEFAULT '{}',
  total_keywords    INT DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ats_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own ATS history" ON public.ats_history
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── Cover Letters ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cover_letters (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title       TEXT NOT NULL DEFAULT 'Cover Letter',
  content     TEXT NOT NULL,
  job_role    TEXT,
  company     TEXT,
  tone        TEXT DEFAULT 'Professional',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.cover_letters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own cover letters" ON public.cover_letters
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER cover_letters_updated_at BEFORE UPDATE ON public.cover_letters
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Subscriptions ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                     UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id                UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id     TEXT,
  plan                   TEXT NOT NULL CHECK (plan IN ('free','pro','lifetime')),
  status                 TEXT NOT NULL DEFAULT 'active',
  current_period_start   TIMESTAMPTZ,
  current_period_end     TIMESTAMPTZ,
  cancel_at_period_end   BOOLEAN DEFAULT FALSE,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own subscription" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- ── Admin Stats View ─────────────────────────────────────────────
DROP VIEW IF EXISTS public.admin_stats;

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

-- Restrict view access so auth data is not exposed to public/anon API
REVOKE ALL ON public.admin_stats FROM anon, authenticated;
GRANT SELECT ON public.admin_stats TO service_role;


-- ── Storage Buckets ──────────────────────────────────────────────
-- Run these in Supabase Dashboard > Storage > Create Bucket:
-- 1. "resumes"   — private, max 10MB, PDF files
-- 2. "avatars"   — public,  max 5MB,  image files

-- ── Indexes ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON public.resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_resumes_updated ON public.resumes(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ats_history_user ON public.ats_history(user_id);
CREATE INDEX IF NOT EXISTS idx_cover_letters_user ON public.cover_letters(user_id);

-- ── Payments (Razorpay Ledger) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payments (
  id                  UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  order_id            TEXT NOT NULL,
  payment_id          TEXT NOT NULL UNIQUE,
  plan                TEXT NOT NULL,
  amount              INT NOT NULL,
  currency            TEXT DEFAULT 'INR',
  status              TEXT DEFAULT 'success',
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own payments" ON public.payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_id ON public.payments(payment_id);

-- ── RPC Functions ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.increment_resume_count(user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.profiles
  SET resume_count = COALESCE(resume_count, 0) + 1,
      updated_at = NOW()
  WHERE id = user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.decrement_resume_count(user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.profiles
  SET resume_count = GREATEST(COALESCE(resume_count, 0) - 1, 0),
      updated_at = NOW()
  WHERE id = user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.signups_per_day()
RETURNS TABLE(date TEXT, count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT
    TO_CHAR(d.day, 'YYYY-MM-DD') AS date,
    COUNT(p.id) AS count
  FROM GENERATE_SERIES(
    CURRENT_DATE - INTERVAL '6 days',
    CURRENT_DATE,
    INTERVAL '1 day'
  ) AS d(day)
  LEFT JOIN public.profiles p
    ON DATE_TRUNC('day', p.created_at) = d.day
  GROUP BY d.day
  ORDER BY d.day ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_resume_count(UUID) TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_resume_count(UUID) TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.signups_per_day() TO service_role;

