-- ================================================================
-- Migration 005: Monthly Export Usage Tracking & Atomic Quota RPC
-- Run this in Supabase SQL Editor AFTER all existing migrations.
-- ================================================================

-- ── 1. Monthly usage table ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.monthly_usage (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  month_key     TEXT NOT NULL,  -- 'YYYY-MM' format (UTC-based)
  export_count  INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, month_key)
);

CREATE INDEX IF NOT EXISTS idx_monthly_usage_user_month
  ON public.monthly_usage(user_id, month_key);

-- RLS: server-only access (service_role), no direct client access
ALTER TABLE public.monthly_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.monthly_usage FROM anon, authenticated;
GRANT ALL ON public.monthly_usage TO service_role;

-- ── 2. Atomic increment-and-check RPC ─────────────────────────────
-- Increments export_count for current UTC month and checks against limit.
-- If over limit, rolls back the increment and returns allowed=false.
-- Uses UPSERT so no separate "create row" step is needed.
CREATE OR REPLACE FUNCTION public.increment_export_usage(
  p_user_id UUID,
  p_limit   INT DEFAULT 3
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_month TEXT;
  v_count INT;
BEGIN
  v_month := TO_CHAR(NOW() AT TIME ZONE 'UTC', 'YYYY-MM');

  INSERT INTO public.monthly_usage (user_id, month_key, export_count)
  VALUES (p_user_id, v_month, 1)
  ON CONFLICT (user_id, month_key)
  DO UPDATE SET
    export_count = public.monthly_usage.export_count + 1,
    updated_at = NOW()
  RETURNING export_count INTO v_count;

  IF v_count > p_limit THEN
    -- Undo the increment — user is over quota
    UPDATE public.monthly_usage
    SET export_count = export_count - 1, updated_at = NOW()
    WHERE user_id = p_user_id AND month_key = v_month;

    RETURN json_build_object(
      'allowed', false,
      'used', v_count - 1,
      'limit', p_limit,
      'month', v_month
    );
  END IF;

  RETURN json_build_object(
    'allowed', true,
    'used', v_count,
    'limit', p_limit,
    'month', v_month
  );
END;
$$;

-- ── 3. Read-only usage query (no increment) ───────────────────────
CREATE OR REPLACE FUNCTION public.get_export_usage(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_month TEXT;
  v_count INT;
BEGIN
  v_month := TO_CHAR(NOW() AT TIME ZONE 'UTC', 'YYYY-MM');

  SELECT COALESCE(export_count, 0) INTO v_count
  FROM public.monthly_usage
  WHERE user_id = p_user_id AND month_key = v_month;

  IF v_count IS NULL THEN v_count := 0; END IF;

  RETURN json_build_object(
    'used', v_count,
    'limit', 3,
    'month', v_month
  );
END;
$$;

-- ── 4. Grants ─────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.increment_export_usage(UUID, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_export_usage(UUID) TO service_role;
