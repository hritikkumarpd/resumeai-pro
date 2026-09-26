-- ================================================================
-- Migration 006: Tech Debt Cleanup & JSON Validation (Redesign)
-- Run this in Supabase SQL Editor AFTER all existing migrations.
-- ================================================================

-- ── 1. Clean up Legacy Columns (Stripe & Redundancy) ────────────

-- Drop from profiles
ALTER TABLE public.profiles 
  DROP COLUMN IF EXISTS stripe_customer_id,
  DROP COLUMN IF EXISTS stripe_subscription_id,
  DROP COLUMN IF EXISTS subscription_status,
  DROP COLUMN IF EXISTS subscription_end;

-- Drop from subscriptions
ALTER TABLE public.subscriptions 
  DROP COLUMN IF EXISTS stripe_subscription_id,
  DROP COLUMN IF EXISTS stripe_customer_id;

-- ── 2. Update Trigger Function ──────────────────────────────────
-- We need to replace the protect_profile_system_columns function
-- since we removed subscription_status and subscription_end.
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
    IF (NEW.resume_count IS DISTINCT FROM OLD.resume_count) THEN
      NEW.resume_count := OLD.resume_count;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ── 3. Add JSONB Data Validation ────────────────────────────────
-- Ensure the resume data column is a valid JSON object and contains at least 'personal'
ALTER TABLE public.resumes
  ADD CONSTRAINT resumes_data_is_object CHECK (jsonb_typeof(data) = 'object'),
  ADD CONSTRAINT resumes_data_has_personal CHECK (data ? 'personal');

-- ── 4. Optimize Indexes for Dashboard Queries ───────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_plan_created_at 
  ON public.profiles(plan, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status 
  ON public.subscriptions(user_id, status);

-- ── 5. Standardize Subscriptions Table ──────────────────────────
-- Ensure we have generic provider columns, falling back to Razorpay if not present
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'provider') THEN
    ALTER TABLE public.subscriptions ADD COLUMN provider TEXT DEFAULT 'razorpay';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'provider_subscription_id') THEN
    ALTER TABLE public.subscriptions ADD COLUMN provider_subscription_id TEXT UNIQUE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'provider_customer_id') THEN
    ALTER TABLE public.subscriptions ADD COLUMN provider_customer_id TEXT;
  END IF;
END $$;
