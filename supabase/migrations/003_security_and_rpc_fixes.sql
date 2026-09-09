-- ================================================================
-- Migration 003: Security & RPC Fixes
-- 1. Protect profiles sensitive columns (plan, resume_count) from client RLS bypass
-- 2. Add missing RPC functions: increment_resume_count, decrement_resume_count, signups_per_day
-- 3. Fix handle_new_user() search_path (Security Definer best practices)
-- 4. Create payments table with unique payment_id to prevent replay attacks
-- ================================================================

-- ── 1. Column-Level Protection Trigger on Profiles ──────────────
-- Prevents regular authenticated users from upgrading their own plan or tampering with resume_count
CREATE OR REPLACE FUNCTION public.protect_profile_system_columns()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- If invoked by an authenticated client user directly through Supabase REST API
  IF (auth.role() = 'authenticated') THEN
    -- Forbid direct modification of plan
    IF (NEW.plan IS DISTINCT FROM OLD.plan) THEN
      RAISE EXCEPTION 'Modifying subscription plan directly is prohibited. Please purchase via checkout.';
    END IF;
    -- Preserve backend-managed subscription fields
    IF (NEW.subscription_status IS DISTINCT FROM OLD.subscription_status) THEN
      NEW.subscription_status := OLD.subscription_status;
    END IF;
    IF (NEW.subscription_end IS DISTINCT FROM OLD.subscription_end) THEN
      NEW.subscription_end := OLD.subscription_end;
    END IF;
    -- Preserve resume_count
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

-- ── 2. Add Missing RPC Functions ─────────────────────────────────

-- Increment resume count
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

-- Decrement resume count
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

-- Signups per day (last 7 days for admin analytics)
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

-- Grant execution to authenticated & service_role
GRANT EXECUTE ON FUNCTION public.increment_resume_count(UUID) TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_resume_count(UUID) TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.signups_per_day() TO service_role;

-- ── 3. Hardened handle_new_user() ─────────────────────────────────
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

-- ── 4. Payments Table & Anti-Replay Ledger ─────────────────────────
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

-- Regular users can only read their own payments
DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
CREATE POLICY "Users can view own payments" ON public.payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_id ON public.payments(payment_id);
