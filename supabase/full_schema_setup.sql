-- ============================================================
-- 1. ENUMS & ROLES
-- ============================================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'user');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.has_role(auth.uid(), 'admin'::public.app_role), false);
$$;

GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO authenticated, service_role, anon;

-- ============================================================
-- 2. PROFILES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  email text,
  device_info text,
  ip_address text,
  browser text,
  last_seen_at timestamptz DEFAULT now(),
  referral_code text UNIQUE,
  referred_by uuid,
  phone_number text,
  phone_verified boolean NOT NULL DEFAULT false,
  flagged_suspicious boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
CREATE POLICY "Admins can read all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.is_current_user_admin());

-- ============================================================
-- 3. USER CREDITS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  tokens integer NOT NULL DEFAULT 0,
  trial_uses_remaining integer NOT NULL DEFAULT 0,
  is_premium boolean NOT NULL DEFAULT false,
  blocked boolean NOT NULL DEFAULT false,
  wallet_available numeric(10,2) NOT NULL DEFAULT 0,
  wallet_pending numeric(10,2) NOT NULL DEFAULT 0,
  total_earned numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own credits" ON public.user_credits;
CREATE POLICY "Users can read own credits" ON public.user_credits FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can read all credits" ON public.user_credits;
CREATE POLICY "Admins can read all credits" ON public.user_credits FOR SELECT TO authenticated USING (public.is_current_user_admin());

DROP POLICY IF EXISTS "Admins can update credits" ON public.user_credits;
CREATE POLICY "Admins can update credits" ON public.user_credits FOR UPDATE TO authenticated USING (public.is_current_user_admin());

-- ============================================================
-- 4. PROCESSED PAYMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.processed_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reference text UNIQUE NOT NULL,
  amount integer NOT NULL,
  tokens_added integer NOT NULL,
  payment_method text,
  status text NOT NULL DEFAULT 'success',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.processed_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own payments" ON public.processed_payments;
CREATE POLICY "Users can read own payments" ON public.processed_payments FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can read all payments" ON public.processed_payments;
CREATE POLICY "Admins can read all payments" ON public.processed_payments FOR SELECT TO authenticated USING (public.is_current_user_admin());

-- ============================================================
-- 5. AI USAGE LOGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  function_name text NOT NULL,
  model text NOT NULL,
  mode text,
  quality text,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read all usage logs" ON public.ai_usage_logs;
CREATE POLICY "Admins can read all usage logs" ON public.ai_usage_logs FOR SELECT TO authenticated USING (public.is_current_user_admin());

-- ============================================================
-- 6. REFERRALS, WITHDRAWALS & WALLET
-- ============================================================
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referred_user_id uuid NOT NULL UNIQUE,
  payment_reference text,
  plan_id text,
  plan_amount integer NOT NULL DEFAULT 0,
  reward_amount numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  approved_at timestamptz,
  rejected_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own referrals" ON public.referrals;
CREATE POLICY "Users can read own referrals" ON public.referrals FOR SELECT TO authenticated USING (auth.uid() = referrer_id);

DROP POLICY IF EXISTS "Admins can manage referrals" ON public.referrals;
CREATE POLICY "Admins can manage referrals" ON public.referrals FOR ALL TO authenticated USING (public.is_current_user_admin());

CREATE TABLE IF NOT EXISTS public.withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount numeric(10,2) NOT NULL,
  momo_number text NOT NULL,
  network text NOT NULL,
  recipient_code text,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  paystack_transfer_code text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own withdrawals" ON public.withdrawals;
CREATE POLICY "Users can read own withdrawals" ON public.withdrawals FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage withdrawals" ON public.withdrawals;
CREATE POLICY "Admins can manage withdrawals" ON public.withdrawals FOR ALL TO authenticated USING (public.is_current_user_admin());

CREATE TABLE IF NOT EXISTS public.showcase_examples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  before_image text NOT NULL,
  after_image text NOT NULL,
  before_alt text NOT NULL,
  after_alt text NOT NULL,
  prompt text NOT NULL,
  generation_seconds numeric(4,1) NOT NULL DEFAULT 12.5,
  sort_order integer NOT NULL DEFAULT 0,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.showcase_examples ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view published showcase" ON public.showcase_examples;
CREATE POLICY "Anyone can view published showcase" ON public.showcase_examples FOR SELECT TO PUBLIC USING (published = true);

DROP POLICY IF EXISTS "Admins can manage showcase" ON public.showcase_examples;
CREATE POLICY "Admins can manage showcase" ON public.showcase_examples FOR ALL TO authenticated USING (public.is_current_user_admin());

-- ============================================================
-- 7. AUTO USER PROVISIONING TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. Create profile
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (user_id) DO NOTHING;

  -- 2. Create user credits
  INSERT INTO public.user_credits (user_id, tokens, trial_uses_remaining, is_premium)
  VALUES (NEW.id, 0, 0, false)
  ON CONFLICT (user_id) DO NOTHING;

  -- 3. Auto-assign admin if newm5811@gmail.com
  IF LOWER(NEW.email) = 'newm5811@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Backfill existing users in auth.users if any
INSERT INTO public.profiles (user_id, email)
SELECT id, email FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.user_credits (user_id, tokens, trial_uses_remaining, is_premium)
SELECT id, 0, 0, false FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users
WHERE LOWER(email) = 'newm5811@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- ============================================================
-- 10. RATE LIMITS & CREDIT DEDUCTION FUNCTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  window_start timestamptz NOT NULL DEFAULT now(),
  request_count integer NOT NULL DEFAULT 1
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup ON public.rate_limits(user_id, endpoint, window_start);

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id uuid,
  p_endpoint text,
  p_max_requests integer DEFAULT 60,
  p_window_seconds integer DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_window_start timestamptz;
  v_count integer;
BEGIN
  v_window_start := now() - (p_window_seconds || ' seconds')::interval;
  
  DELETE FROM public.rate_limits 
  WHERE user_id = p_user_id 
    AND endpoint = p_endpoint 
    AND window_start < v_window_start;
  
  SELECT COALESCE(SUM(request_count), 0) INTO v_count
  FROM public.rate_limits
  WHERE user_id = p_user_id
    AND endpoint = p_endpoint
    AND window_start >= v_window_start;
  
  IF v_count >= p_max_requests THEN
    RETURN false;
  END IF;
  
  INSERT INTO public.rate_limits (user_id, endpoint, window_start, request_count)
  VALUES (p_user_id, p_endpoint, now(), 1);
  
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_and_deduct_credits(
  p_user_id uuid,
  p_token_cost integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_credits public.user_credits%ROWTYPE;
BEGIN
  IF p_token_cost <= 0 THEN
    RAISE EXCEPTION 'Invalid token cost';
  END IF;

  SELECT * INTO v_credits FROM public.user_credits WHERE user_id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.user_credits (user_id, tokens, trial_uses_remaining)
    VALUES (p_user_id, 10, 0)
    RETURNING * INTO v_credits;
  END IF;

  IF v_credits.blocked THEN
    RETURN jsonb_build_object('allowed', false, 'used', 'none', 'blocked', true, 'remaining_trials', 0, 'tokens', v_credits.tokens);
  END IF;

  IF v_credits.trial_uses_remaining > 0 THEN
    UPDATE public.user_credits SET trial_uses_remaining = trial_uses_remaining - 1, updated_at = now()
    WHERE user_id = p_user_id;
    RETURN jsonb_build_object('allowed', true, 'used', 'trial', 'remaining_trials', v_credits.trial_uses_remaining - 1, 'tokens', v_credits.tokens);
  END IF;

  IF v_credits.tokens >= p_token_cost THEN
    UPDATE public.user_credits SET tokens = tokens - p_token_cost, updated_at = now()
    WHERE user_id = p_user_id;
    RETURN jsonb_build_object('allowed', true, 'used', 'tokens', 'remaining_trials', 0, 'tokens', v_credits.tokens - p_token_cost);
  END IF;

  RETURN jsonb_build_object('allowed', false, 'used', 'none', 'remaining_trials', 0, 'tokens', v_credits.tokens, 'is_premium', v_credits.is_premium);
END;
$$;

CREATE OR REPLACE FUNCTION public.refund_credits(
  p_user_id uuid,
  p_kind text,
  p_amount integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF p_kind = 'trial' THEN
    UPDATE public.user_credits
    SET trial_uses_remaining = trial_uses_remaining + p_amount, updated_at = now()
    WHERE user_id = p_user_id;
  ELSIF p_kind = 'tokens' THEN
    UPDATE public.user_credits
    SET tokens = tokens + p_amount, updated_at = now()
    WHERE user_id = p_user_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_rate_limit(uuid, text, integer, integer) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.check_and_deduct_credits(uuid, integer) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.refund_credits(uuid, text, integer) TO authenticated, service_role;

-- ============================================================
-- 11. ADMIN NOTIFICATIONS & AUDIT LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage notifications" ON public.admin_notifications;
CREATE POLICY "Admins can manage notifications" ON public.admin_notifications FOR ALL TO authenticated USING (public.is_current_user_admin());

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  action text NOT NULL,
  target_user_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view audit logs" ON public.admin_audit_log;
CREATE POLICY "Admins can view audit logs" ON public.admin_audit_log FOR SELECT TO authenticated USING (public.is_current_user_admin());

-- ============================================================
-- 12. WALLET TRANSACTIONS & SLIDER EVENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  amount numeric(10,2) NOT NULL,
  balance_after numeric(10,2) NOT NULL,
  reference_id uuid,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own transactions" ON public.wallet_transactions;
CREATE POLICY "Users can view own transactions" ON public.wallet_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all transactions" ON public.wallet_transactions;
CREATE POLICY "Admins can view all transactions" ON public.wallet_transactions FOR SELECT TO authenticated USING (public.is_current_user_admin());

CREATE TABLE IF NOT EXISTS public.slider_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  example_id uuid,
  event_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.slider_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert slider events" ON public.slider_events;
CREATE POLICY "Anyone can insert slider events" ON public.slider_events FOR INSERT TO PUBLIC WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view slider events" ON public.slider_events;
CREATE POLICY "Admins can view slider events" ON public.slider_events FOR SELECT TO authenticated USING (public.is_current_user_admin());

-- ============================================================
-- 13. ADMIN FUNCTIONS & RPCs
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_set_user_blocked(
  p_target_user_id uuid,
  p_blocked boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_actor uuid := auth.uid();
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  IF p_target_user_id IS NULL THEN RAISE EXCEPTION 'Target user required'; END IF;

  UPDATE public.user_credits
  SET blocked = p_blocked, updated_at = now()
  WHERE user_id = p_target_user_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;

  INSERT INTO public.admin_audit_log (actor_id, action, target_user_id, metadata)
  VALUES (v_actor, CASE WHEN p_blocked THEN 'user_block' ELSE 'user_unblock' END,
          p_target_user_id, jsonb_build_object('blocked', p_blocked));

  RETURN jsonb_build_object('success', true, 'blocked', p_blocked);
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_referral_reward(
  p_referral_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_ref public.referrals%ROWTYPE;
  v_new_avail numeric;
BEGIN
  IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'Admin only'; END IF;

  SELECT * INTO v_ref FROM public.referrals WHERE id = p_referral_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Referral not found'; END IF;
  IF v_ref.status <> 'pending' THEN RAISE EXCEPTION 'Referral not pending'; END IF;

  UPDATE public.user_credits
  SET wallet_pending = greatest(0, wallet_pending - v_ref.reward_amount),
      wallet_available = wallet_available + v_ref.reward_amount,
      total_earned = total_earned + v_ref.reward_amount,
      updated_at = now()
  WHERE user_id = v_ref.referrer_id
  RETURNING wallet_available INTO v_new_avail;

  UPDATE public.referrals SET status = 'approved', approved_at = now(), updated_at = now() WHERE id = p_referral_id;

  INSERT INTO public.wallet_transactions (user_id, type, amount, balance_after, reference_id, description)
  VALUES (v_ref.referrer_id, 'referral_approved', v_ref.reward_amount, v_new_avail, p_referral_id, 'Referral reward approved');

  INSERT INTO public.admin_notifications (user_id, type, title, message, metadata)
  VALUES (v_ref.referrer_id, 'reward_approved', 'Referral Reward Approved',
    'GHS ' || v_ref.reward_amount || ' added to your wallet',
    jsonb_build_object('referral_id', p_referral_id, 'amount', v_ref.reward_amount));

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_referral_reward(
  p_referral_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_ref public.referrals%ROWTYPE;
BEGIN
  IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'Admin only'; END IF;

  SELECT * INTO v_ref FROM public.referrals WHERE id = p_referral_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Referral not found'; END IF;
  IF v_ref.status <> 'pending' THEN RAISE EXCEPTION 'Referral not pending'; END IF;

  UPDATE public.user_credits
  SET wallet_pending = greatest(0, wallet_pending - v_ref.reward_amount),
      updated_at = now()
  WHERE user_id = v_ref.referrer_id;

  UPDATE public.referrals 
  SET status = 'rejected', rejected_reason = p_reason, updated_at = now() 
  WHERE id = p_referral_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_withdrawal_paid(
  p_withdrawal_id uuid,
  p_transfer_code text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'Admin only'; END IF;

  UPDATE public.withdrawals
  SET status = 'paid',
      paystack_transfer_code = COALESCE(p_transfer_code, paystack_transfer_code),
      paid_at = now(),
      updated_at = now()
  WHERE id = p_withdrawal_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'Withdrawal not found'; END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_withdrawal_failed(
  p_withdrawal_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_w public.withdrawals%ROWTYPE;
BEGIN
  IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'Admin only'; END IF;

  SELECT * INTO v_w FROM public.withdrawals WHERE id = p_withdrawal_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Withdrawal not found'; END IF;
  IF v_w.status = 'paid' THEN RAISE EXCEPTION 'Cannot fail a paid withdrawal'; END IF;

  -- Refund amount back to available wallet
  UPDATE public.user_credits
  SET wallet_available = wallet_available + v_w.amount,
      updated_at = now()
  WHERE user_id = v_w.user_id;

  UPDATE public.withdrawals
  SET status = 'failed',
      admin_note = p_reason,
      updated_at = now()
  WHERE id = p_withdrawal_id;

  INSERT INTO public.wallet_transactions (user_id, type, amount, balance_after, reference_id, description)
  SELECT v_w.user_id, 'withdrawal_refund', v_w.amount, wallet_available, v_w.id, 'Withdrawal failed: ' || p_reason
  FROM public.user_credits WHERE user_id = v_w.user_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.request_withdrawal(
  p_amount numeric,
  p_momo_number text,
  p_network text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_credits public.user_credits%ROWTYPE;
  v_w_id uuid;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_amount < 10 THEN RAISE EXCEPTION 'Minimum withdrawal is GHS 10.00'; END IF;

  SELECT * INTO v_credits FROM public.user_credits WHERE user_id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Wallet not found'; END IF;
  IF v_credits.wallet_available < p_amount THEN RAISE EXCEPTION 'Insufficient balance'; END IF;

  UPDATE public.user_credits
  SET wallet_available = wallet_available - p_amount,
      updated_at = now()
  WHERE user_id = v_user_id;

  INSERT INTO public.withdrawals (user_id, amount, momo_number, network, status)
  VALUES (v_user_id, p_amount, p_momo_number, p_network, 'pending')
  RETURNING id INTO v_w_id;

  INSERT INTO public.wallet_transactions (user_id, type, amount, balance_after, reference_id, description)
  VALUES (v_user_id, 'withdrawal_requested', -p_amount, v_credits.wallet_available - p_amount, v_w_id, 'Withdrawal request to ' || p_network || ' ' || p_momo_number);

  INSERT INTO public.admin_notifications (user_id, type, title, message, metadata)
  VALUES (v_user_id, 'withdrawal_requested', 'New Withdrawal Request',
    'User requested GHS ' || p_amount || ' via ' || p_network,
    jsonb_build_object('withdrawal_id', v_w_id, 'amount', p_amount));

  RETURN jsonb_build_object('success', true, 'withdrawal_id', v_w_id);
END;
$$;

-- ============================================================
-- 14. STORAGE BUCKET & POLICIES (Showcase)
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('showcase', 'showcase', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public read showcase" ON storage.objects;
CREATE POLICY "Public read showcase" ON storage.objects FOR SELECT TO PUBLIC USING (bucket_id = 'showcase');

DROP POLICY IF EXISTS "Admins manage showcase storage" ON storage.objects;
CREATE POLICY "Admins manage showcase storage" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'showcase' AND public.is_current_user_admin());

GRANT EXECUTE ON FUNCTION public.admin_set_user_blocked(uuid, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.approve_referral_reward(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reject_referral_reward(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_withdrawal_paid(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_withdrawal_failed(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.request_withdrawal(numeric, text, text) TO authenticated, service_role;

