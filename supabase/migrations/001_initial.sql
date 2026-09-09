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

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
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
CREATE OR REPLACE VIEW public.admin_stats AS
SELECT
  (SELECT COUNT(*) FROM auth.users) AS total_users,
  (SELECT COUNT(*) FROM public.resumes) AS total_resumes,
  (SELECT COUNT(*) FROM public.cover_letters) AS total_cover_letters,
  (SELECT COUNT(*) FROM public.ats_history) AS total_ats_scans,
  (SELECT COUNT(*) FROM public.profiles WHERE plan = 'pro') AS pro_users,
  (SELECT COUNT(*) FROM public.profiles WHERE plan = 'lifetime') AS lifetime_users,
  (SELECT COUNT(*) FROM auth.users WHERE created_at > NOW() - INTERVAL '7 days') AS new_users_week,
  (SELECT COUNT(*) FROM auth.users WHERE created_at > NOW() - INTERVAL '30 days') AS new_users_month;

-- ── Storage Buckets ──────────────────────────────────────────────
-- Run these in Supabase Dashboard > Storage > Create Bucket:
-- 1. "resumes"   — private, max 10MB, PDF files
-- 2. "avatars"   — public,  max 5MB,  image files

-- ── Indexes ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON public.resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_resumes_updated ON public.resumes(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ats_history_user ON public.ats_history(user_id);
CREATE INDEX IF NOT EXISTS idx_cover_letters_user ON public.cover_letters(user_id);
