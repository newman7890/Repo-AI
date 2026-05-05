-- ============================================================
-- 1. Extend profiles
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by uuid,
  ADD COLUMN IF NOT EXISTS phone_number text,
  ADD COLUMN IF NOT EXISTS phone_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS flagged_suspicious boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON public.profiles(referred_by);
CREATE INDEX IF NOT EXISTS idx_profiles_phone_number ON public.profiles(phone_number);

-- Allow users to update their own phone fields (existing policy already covers profiles update)

-- ============================================================
-- 2. Extend user_credits with wallet
-- ============================================================
ALTER TABLE public.user_credits
  ADD COLUMN IF NOT EXISTS wallet_available numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wallet_pending numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_earned numeric(10,2) NOT NULL DEFAULT 0;

-- ============================================================
-- 3. Referrals table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referred_user_id uuid NOT NULL UNIQUE,
  payment_reference text,
  plan_id text,
  plan_amount integer NOT NULL,
  reward_amount numeric(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  approved_at timestamptz,
  rejected_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT referrals_status_check CHECK (status IN ('pending','approved','rejected','paid'))
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON public.referrals(status);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own referrals (as referrer)"
  ON public.referrals FOR SELECT TO authenticated
  USING (auth.uid() = referrer_id);

CREATE POLICY "Admins can view all referrals"
  ON public.referrals FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update referrals"
  ON public.referrals FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Block client inserts on referrals"
  ON public.referrals FOR INSERT TO authenticated
  WITH CHECK (false);

CREATE POLICY "Block client deletes on referrals"
  ON public.referrals FOR DELETE TO authenticated
  USING (false);

CREATE TRIGGER update_referrals_updated_at
  BEFORE UPDATE ON public.referrals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 4. Withdrawals table
-- ============================================================
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
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT withdrawals_status_check CHECK (status IN ('pending','approved','paid','failed','rejected')),
  CONSTRAINT withdrawals_network_check CHECK (network IN ('mtn','vodafone','airteltigo')),
  CONSTRAINT withdrawals_min_amount CHECK (amount >= 50)
);

CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON public.withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON public.withdrawals(status);

ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own withdrawals"
  ON public.withdrawals FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all withdrawals"
  ON public.withdrawals FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update withdrawals"
  ON public.withdrawals FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Block client direct inserts on withdrawals"
  ON public.withdrawals FOR INSERT TO authenticated
  WITH CHECK (false);

CREATE POLICY "Block client deletes on withdrawals"
  ON public.withdrawals FOR DELETE TO authenticated
  USING (false);

CREATE TRIGGER update_withdrawals_updated_at
  BEFORE UPDATE ON public.withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 5. Wallet transactions (audit log)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  amount numeric(10,2) NOT NULL,
  balance_after numeric(10,2) NOT NULL,
  reference_id uuid,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wallet_tx_type_check CHECK (type IN ('referral_pending','referral_approved','referral_rejected','withdrawal_request','withdrawal_paid','withdrawal_refund','admin_adjustment'))
);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_user ON public.wallet_transactions(user_id, created_at DESC);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own wallet transactions"
  ON public.wallet_transactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all wallet transactions"
  ON public.wallet_transactions FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Block client writes on wallet_transactions"
  ON public.wallet_transactions FOR INSERT TO authenticated
  WITH CHECK (false);

CREATE POLICY "Block client updates on wallet_transactions"
  ON public.wallet_transactions FOR UPDATE TO authenticated
  USING (false) WITH CHECK (false);

CREATE POLICY "Block client deletes on wallet_transactions"
  ON public.wallet_transactions FOR DELETE TO authenticated
  USING (false);

-- ============================================================
-- 6. Payment history (track first payments)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reference text NOT NULL UNIQUE,
  amount integer NOT NULL,
  plan_id text,
  is_first_payment boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_history_user ON public.payment_history(user_id, created_at);

ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payment history"
  ON public.payment_history FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all payment history"
  ON public.payment_history FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Block client writes on payment_history"
  ON public.payment_history FOR INSERT TO authenticated
  WITH CHECK (false);

CREATE POLICY "Block client updates on payment_history"
  ON public.payment_history FOR UPDATE TO authenticated
  USING (false) WITH CHECK (false);

CREATE POLICY "Block client deletes on payment_history"
  ON public.payment_history FOR DELETE TO authenticated
  USING (false);

-- ============================================================
-- 7. Referral code generator
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_exists boolean;
  v_attempts int := 0;
BEGIN
  LOOP
    v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    SELECT EXISTS(SELECT 1 FROM profiles WHERE referral_code = v_code) INTO v_exists;
    IF NOT v_exists THEN RETURN v_code; END IF;
    v_attempts := v_attempts + 1;
    IF v_attempts > 10 THEN RAISE EXCEPTION 'Could not generate unique referral code'; END IF;
  END LOOP;
END;
$$;

-- Backfill existing profiles
UPDATE public.profiles SET referral_code = public.generate_referral_code() WHERE referral_code IS NULL;

-- Update profile creation trigger to include referral code
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref_code text;
  v_referrer_id uuid;
BEGIN
  -- Look up referrer if a referral code was provided in user metadata
  IF NEW.raw_user_meta_data ? 'ref_code' THEN
    SELECT user_id INTO v_referrer_id
    FROM public.profiles
    WHERE referral_code = upper(NEW.raw_user_meta_data->>'ref_code')
    LIMIT 1;
  END IF;

  v_ref_code := public.generate_referral_code();

  INSERT INTO public.profiles (user_id, email, referral_code, referred_by)
  VALUES (NEW.id, NEW.email, v_ref_code, v_referrer_id);

  RETURN NEW;
END;
$$;

-- ============================================================
-- 8. Atomic withdrawal request
-- ============================================================
CREATE OR REPLACE FUNCTION public.request_withdrawal(
  p_amount numeric,
  p_momo_number text,
  p_network text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_credits user_credits%ROWTYPE;
  v_phone_verified boolean;
  v_withdrawal_id uuid;
  v_today_count int;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_amount < 50 THEN RAISE EXCEPTION 'Minimum withdrawal is GHS 50'; END IF;
  IF p_network NOT IN ('mtn','vodafone','airteltigo') THEN RAISE EXCEPTION 'Invalid network'; END IF;
  IF p_momo_number IS NULL OR length(p_momo_number) < 9 OR length(p_momo_number) > 15 THEN
    RAISE EXCEPTION 'Invalid mobile money number';
  END IF;

  -- Require verified phone for withdrawals
  SELECT phone_verified INTO v_phone_verified FROM profiles WHERE user_id = v_user_id;
  IF NOT COALESCE(v_phone_verified, false) THEN
    RAISE EXCEPTION 'Phone verification required to withdraw';
  END IF;

  -- Daily withdrawal request limit (max 3/day)
  SELECT count(*) INTO v_today_count
  FROM withdrawals
  WHERE user_id = v_user_id AND created_at > now() - interval '24 hours';
  IF v_today_count >= 3 THEN RAISE EXCEPTION 'Daily withdrawal limit reached'; END IF;

  SELECT * INTO v_credits FROM user_credits WHERE user_id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No wallet found'; END IF;
  IF v_credits.blocked THEN RAISE EXCEPTION 'Account blocked'; END IF;
  IF v_credits.wallet_available < p_amount THEN RAISE EXCEPTION 'Insufficient balance'; END IF;

  -- Deduct from available, create withdrawal
  UPDATE user_credits
  SET wallet_available = wallet_available - p_amount, updated_at = now()
  WHERE user_id = v_user_id;

  INSERT INTO withdrawals (user_id, amount, momo_number, network, status)
  VALUES (v_user_id, p_amount, p_momo_number, p_network, 'pending')
  RETURNING id INTO v_withdrawal_id;

  INSERT INTO wallet_transactions (user_id, type, amount, balance_after, reference_id, description)
  VALUES (v_user_id, 'withdrawal_request', -p_amount, v_credits.wallet_available - p_amount, v_withdrawal_id, 'Withdrawal request');

  -- Notify admin
  INSERT INTO admin_notifications (user_id, type, title, message, metadata)
  VALUES (v_user_id, 'withdrawal', 'New Withdrawal Request',
    'GHS ' || p_amount || ' to ' || p_network || ' ' || p_momo_number,
    jsonb_build_object('withdrawal_id', v_withdrawal_id, 'amount', p_amount, 'network', p_network));

  RETURN jsonb_build_object('success', true, 'withdrawal_id', v_withdrawal_id);
END;
$$;

-- ============================================================
-- 9. Admin: approve / reject referral
-- ============================================================
CREATE OR REPLACE FUNCTION public.approve_referral_reward(p_referral_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref referrals%ROWTYPE;
  v_new_avail numeric;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'Admin only'; END IF;

  SELECT * INTO v_ref FROM referrals WHERE id = p_referral_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Referral not found'; END IF;
  IF v_ref.status <> 'pending' THEN RAISE EXCEPTION 'Referral not pending'; END IF;

  UPDATE user_credits
  SET wallet_pending = greatest(0, wallet_pending - v_ref.reward_amount),
      wallet_available = wallet_available + v_ref.reward_amount,
      total_earned = total_earned + v_ref.reward_amount,
      updated_at = now()
  WHERE user_id = v_ref.referrer_id
  RETURNING wallet_available INTO v_new_avail;

  UPDATE referrals SET status = 'approved', approved_at = now() WHERE id = p_referral_id;

  INSERT INTO wallet_transactions (user_id, type, amount, balance_after, reference_id, description)
  VALUES (v_ref.referrer_id, 'referral_approved', v_ref.reward_amount, v_new_avail, p_referral_id, 'Referral reward approved');

  INSERT INTO admin_notifications (user_id, type, title, message, metadata)
  VALUES (v_ref.referrer_id, 'reward_approved', 'Referral Reward Approved',
    'GHS ' || v_ref.reward_amount || ' added to your wallet',
    jsonb_build_object('referral_id', p_referral_id, 'amount', v_ref.reward_amount));

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_referral_reward(p_referral_id uuid, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref referrals%ROWTYPE;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'Admin only'; END IF;

  SELECT * INTO v_ref FROM referrals WHERE id = p_referral_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Referral not found'; END IF;
  IF v_ref.status <> 'pending' THEN RAISE EXCEPTION 'Referral not pending'; END IF;

  UPDATE user_credits
  SET wallet_pending = greatest(0, wallet_pending - v_ref.reward_amount), updated_at = now()
  WHERE user_id = v_ref.referrer_id;

  UPDATE referrals SET status = 'rejected', rejected_reason = p_reason WHERE id = p_referral_id;

  INSERT INTO wallet_transactions (user_id, type, amount, balance_after, reference_id, description)
  SELECT v_ref.referrer_id, 'referral_rejected', -v_ref.reward_amount, wallet_available, p_referral_id, COALESCE(p_reason,'Referral rejected')
  FROM user_credits WHERE user_id = v_ref.referrer_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================
-- 10. Admin: mark withdrawal paid / failed
-- ============================================================
CREATE OR REPLACE FUNCTION public.mark_withdrawal_paid(p_withdrawal_id uuid, p_transfer_code text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_w withdrawals%ROWTYPE;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'Admin only'; END IF;
  SELECT * INTO v_w FROM withdrawals WHERE id = p_withdrawal_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Not found'; END IF;
  IF v_w.status NOT IN ('pending','approved') THEN RAISE EXCEPTION 'Cannot mark paid'; END IF;

  UPDATE withdrawals SET status = 'paid', paid_at = now(), paystack_transfer_code = p_transfer_code WHERE id = p_withdrawal_id;

  INSERT INTO wallet_transactions (user_id, type, amount, balance_after, reference_id, description)
  SELECT v_w.user_id, 'withdrawal_paid', 0, wallet_available, p_withdrawal_id, 'Paid via MoMo'
  FROM user_credits WHERE user_id = v_w.user_id;

  INSERT INTO admin_notifications (user_id, type, title, message, metadata)
  VALUES (v_w.user_id, 'withdrawal_paid', 'Withdrawal Paid',
    'GHS ' || v_w.amount || ' sent to ' || v_w.momo_number,
    jsonb_build_object('withdrawal_id', p_withdrawal_id));

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_withdrawal_failed(p_withdrawal_id uuid, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_w withdrawals%ROWTYPE; v_new_avail numeric;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'Admin only'; END IF;
  SELECT * INTO v_w FROM withdrawals WHERE id = p_withdrawal_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Not found'; END IF;
  IF v_w.status NOT IN ('pending','approved') THEN RAISE EXCEPTION 'Cannot fail'; END IF;

  -- Refund balance
  UPDATE user_credits SET wallet_available = wallet_available + v_w.amount, updated_at = now()
  WHERE user_id = v_w.user_id RETURNING wallet_available INTO v_new_avail;

  UPDATE withdrawals SET status = 'failed', admin_note = p_reason WHERE id = p_withdrawal_id;

  INSERT INTO wallet_transactions (user_id, type, amount, balance_after, reference_id, description)
  VALUES (v_w.user_id, 'withdrawal_refund', v_w.amount, v_new_avail, p_withdrawal_id, COALESCE(p_reason,'Withdrawal failed - refunded'));

  RETURN jsonb_build_object('success', true);
END;
$$;
