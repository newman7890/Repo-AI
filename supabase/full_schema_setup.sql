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
