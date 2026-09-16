-- ================================================================
-- Migration 004: Update Plans to free/monthly/yearly + Razorpay Webhook Log
-- Run this in Supabase SQL Editor AFTER all existing migrations.
-- ================================================================

-- ── 1. Update profiles plan constraint ────────────────────────────
-- First migrate existing data, then update constraint
UPDATE public.profiles SET plan = 'monthly' WHERE plan = 'pro';
UPDATE public.profiles SET plan = 'yearly'  WHERE plan = 'lifetime';

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_plan_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_plan_check
  CHECK (plan IN ('free', 'monthly', 'yearly'));

-- ── 2. Update subscriptions plan constraint ───────────────────────
UPDATE public.subscriptions SET plan = 'monthly' WHERE plan = 'pro';
UPDATE public.subscriptions SET plan = 'yearly'  WHERE plan = 'lifetime';

ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_check;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_plan_check
  CHECK (plan IN ('free', 'monthly', 'yearly'));

-- ── 3. Add Razorpay-specific columns to subscriptions if missing ──
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'razorpay_order_id') THEN
    ALTER TABLE public.subscriptions ADD COLUMN razorpay_order_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'razorpay_payment_id') THEN
    ALTER TABLE public.subscriptions ADD COLUMN razorpay_payment_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'started_at') THEN
    ALTER TABLE public.subscriptions ADD COLUMN started_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'expires_at') THEN
    ALTER TABLE public.subscriptions ADD COLUMN expires_at TIMESTAMPTZ;
  END IF;
END $$;

-- ── 4. Webhook event log (idempotency) ───────────────────────────
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id    TEXT NOT NULL UNIQUE,        -- Razorpay event ID for idempotency
  event_type  TEXT NOT NULL,               -- e.g. 'payment.captured'
  payload     JSONB NOT NULL DEFAULT '{}',
  processed   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
-- Webhook events are server-only; no client access
REVOKE ALL ON public.webhook_events FROM anon, authenticated;
GRANT ALL ON public.webhook_events TO service_role;

CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON public.webhook_events(event_id);

-- ── 5. Update payments table plan values ──────────────────────────
UPDATE public.payments SET plan = 'monthly' WHERE plan = 'pro';
UPDATE public.payments SET plan = 'yearly'  WHERE plan = 'lifetime';

-- ── 6. Update protect_profile_system_columns to handle new plan names ──
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
