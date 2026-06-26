CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
STRICT
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$function$;

CREATE OR REPLACE FUNCTION private.admin_set_user_blocked(p_target_user_id uuid, p_blocked boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_actor uuid := auth.uid();
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT private.has_role(v_actor, 'admin'::public.app_role) THEN
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
$function$;

CREATE OR REPLACE FUNCTION private.approve_referral_reward(p_referral_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_ref public.referrals%ROWTYPE;
  v_new_avail numeric;
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin'::public.app_role) THEN RAISE EXCEPTION 'Admin only'; END IF;

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

  UPDATE public.referrals SET status = 'approved', approved_at = now() WHERE id = p_referral_id;

  INSERT INTO public.wallet_transactions (user_id, type, amount, balance_after, reference_id, description)
  VALUES (v_ref.referrer_id, 'referral_approved', v_ref.reward_amount, v_new_avail, p_referral_id, 'Referral reward approved');

  INSERT INTO public.admin_notifications (user_id, type, title, message, metadata)
  VALUES (v_ref.referrer_id, 'reward_approved', 'Referral Reward Approved',
    'GHS ' || v_ref.reward_amount || ' added to your wallet',
    jsonb_build_object('referral_id', p_referral_id, 'amount', v_ref.reward_amount));

  RETURN jsonb_build_object('success', true);
END;
$function$;

CREATE OR REPLACE FUNCTION private.check_and_deduct_credits(p_user_id uuid, p_token_cost integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_credits public.user_credits%ROWTYPE;
BEGIN
  IF p_token_cost <= 0 THEN
    RAISE EXCEPTION 'Invalid token cost';
  END IF;

  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO v_credits FROM public.user_credits WHERE user_id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.user_credits (user_id, tokens, trial_uses_remaining)
    VALUES (p_user_id, 3, 0)
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
$function$;

CREATE OR REPLACE FUNCTION private.mark_email_verified()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text;
  v_aal text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_aal := auth.jwt() ->> 'aal';
  IF v_aal IS DISTINCT FROM 'aal2' THEN
    RAISE EXCEPTION 'Reauthentication required';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'No email on account';
  END IF;

  UPDATE public.profiles
    SET phone_verified = true
    WHERE user_id = v_user_id;

  IF NOT FOUND THEN
    INSERT INTO public.profiles (user_id, phone_verified)
    VALUES (v_user_id, true);
  END IF;

  RETURN jsonb_build_object('ok', true, 'email', v_email);
END;
$function$;

CREATE OR REPLACE FUNCTION private.mark_phone_verified(p_phone text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_confirmed timestamptz;
  v_auth_phone text;
  v_norm_input text;
  v_norm_auth text;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_phone IS NULL OR length(p_phone) < 6 OR length(p_phone) > 20 THEN
    RAISE EXCEPTION 'Invalid phone';
  END IF;

  SELECT phone, phone_confirmed_at INTO v_auth_phone, v_confirmed
  FROM auth.users WHERE id = v_user_id;

  IF v_confirmed IS NULL THEN
    RAISE EXCEPTION 'Phone not confirmed in auth';
  END IF;

  v_norm_input := regexp_replace(p_phone, '^\+', '');
  v_norm_input := regexp_replace(v_norm_input, '\s', '', 'g');
  v_norm_auth := regexp_replace(coalesce(v_auth_phone, ''), '^\+', '');
  v_norm_auth := regexp_replace(v_norm_auth, '\s', '', 'g');

  IF v_norm_auth = '' OR v_norm_input <> v_norm_auth THEN
    RAISE EXCEPTION 'Phone does not match verified number';
  END IF;

  UPDATE public.profiles
  SET phone_number = p_phone, phone_verified = true
  WHERE user_id = v_user_id;

  RETURN jsonb_build_object('success', true);
END;
$function$;

CREATE OR REPLACE FUNCTION private.mark_withdrawal_failed(p_withdrawal_id uuid, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_w public.withdrawals%ROWTYPE; v_new_avail numeric;
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin'::public.app_role) THEN RAISE EXCEPTION 'Admin only'; END IF;
  SELECT * INTO v_w FROM public.withdrawals WHERE id = p_withdrawal_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Not found'; END IF;
  IF v_w.status NOT IN ('pending','approved') THEN RAISE EXCEPTION 'Cannot fail'; END IF;

  UPDATE public.user_credits SET wallet_available = wallet_available + v_w.amount, updated_at = now()
  WHERE user_id = v_w.user_id RETURNING wallet_available INTO v_new_avail;

  UPDATE public.withdrawals SET status = 'failed', admin_note = p_reason WHERE id = p_withdrawal_id;

  INSERT INTO public.wallet_transactions (user_id, type, amount, balance_after, reference_id, description)
  VALUES (v_w.user_id, 'withdrawal_refund', v_w.amount, v_new_avail, p_withdrawal_id, COALESCE(p_reason,'Withdrawal failed - refunded'));

  RETURN jsonb_build_object('success', true);
END;
$function$;

CREATE OR REPLACE FUNCTION private.mark_withdrawal_paid(p_withdrawal_id uuid, p_transfer_code text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_w public.withdrawals%ROWTYPE;
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin'::public.app_role) THEN RAISE EXCEPTION 'Admin only'; END IF;
  SELECT * INTO v_w FROM public.withdrawals WHERE id = p_withdrawal_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Not found'; END IF;
  IF v_w.status NOT IN ('pending','approved') THEN RAISE EXCEPTION 'Cannot mark paid'; END IF;

  UPDATE public.withdrawals SET status = 'paid', paid_at = now(), paystack_transfer_code = p_transfer_code WHERE id = p_withdrawal_id;

  INSERT INTO public.wallet_transactions (user_id, type, amount, balance_after, reference_id, description)
  SELECT v_w.user_id, 'withdrawal_paid', 0, wallet_available, p_withdrawal_id, 'Paid via MoMo'
  FROM public.user_credits WHERE user_id = v_w.user_id;

  INSERT INTO public.admin_notifications (user_id, type, title, message, metadata)
  VALUES (v_w.user_id, 'withdrawal_paid', 'Withdrawal Paid',
    'GHS ' || v_w.amount || ' sent to ' || v_w.momo_number,
    jsonb_build_object('withdrawal_id', p_withdrawal_id));

  RETURN jsonb_build_object('success', true);
END;
$function$;

CREATE OR REPLACE FUNCTION private.reject_referral_reward(p_referral_id uuid, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_ref public.referrals%ROWTYPE;
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin'::public.app_role) THEN RAISE EXCEPTION 'Admin only'; END IF;

  SELECT * INTO v_ref FROM public.referrals WHERE id = p_referral_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Referral not found'; END IF;
  IF v_ref.status <> 'pending' THEN RAISE EXCEPTION 'Referral not pending'; END IF;

  UPDATE public.user_credits
  SET wallet_pending = greatest(0, wallet_pending - v_ref.reward_amount), updated_at = now()
  WHERE user_id = v_ref.referrer_id;

  UPDATE public.referrals SET status = 'rejected', rejected_reason = p_reason WHERE id = p_referral_id;

  INSERT INTO public.wallet_transactions (user_id, type, amount, balance_after, reference_id, description)
  SELECT v_ref.referrer_id, 'referral_rejected', -v_ref.reward_amount, wallet_available, p_referral_id, COALESCE(p_reason,'Referral rejected')
  FROM public.user_credits WHERE user_id = v_ref.referrer_id;

  RETURN jsonb_build_object('success', true);
END;
$function$;

CREATE OR REPLACE FUNCTION private.request_withdrawal(p_amount numeric, p_momo_number text, p_network text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_credits public.user_credits%ROWTYPE;
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

  SELECT phone_verified INTO v_phone_verified FROM public.profiles WHERE user_id = v_user_id;
  IF NOT COALESCE(v_phone_verified, false) THEN
    RAISE EXCEPTION 'Phone verification required to withdraw';
  END IF;

  SELECT count(*) INTO v_today_count
  FROM public.withdrawals
  WHERE user_id = v_user_id AND created_at > now() - interval '24 hours';
  IF v_today_count >= 3 THEN RAISE EXCEPTION 'Daily withdrawal limit reached'; END IF;

  SELECT * INTO v_credits FROM public.user_credits WHERE user_id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No wallet found'; END IF;
  IF v_credits.blocked THEN RAISE EXCEPTION 'Account blocked'; END IF;
  IF v_credits.wallet_available < p_amount THEN RAISE EXCEPTION 'Insufficient balance'; END IF;

  UPDATE public.user_credits
  SET wallet_available = wallet_available - p_amount, updated_at = now()
  WHERE user_id = v_user_id;

  INSERT INTO public.withdrawals (user_id, amount, momo_number, network, status)
  VALUES (v_user_id, p_amount, p_momo_number, p_network, 'pending')
  RETURNING id INTO v_withdrawal_id;

  INSERT INTO public.wallet_transactions (user_id, type, amount, balance_after, reference_id, description)
  VALUES (v_user_id, 'withdrawal_request', -p_amount, v_credits.wallet_available - p_amount, v_withdrawal_id, 'Withdrawal request');

  INSERT INTO public.admin_notifications (user_id, type, title, message, metadata)
  VALUES (v_user_id, 'withdrawal', 'New Withdrawal Request',
    'GHS ' || p_amount || ' to ' || p_network || ' ' || p_momo_number,
    jsonb_build_object('withdrawal_id', v_withdrawal_id, 'amount', p_amount, 'network', p_network));

  RETURN jsonb_build_object('success', true, 'withdrawal_id', v_withdrawal_id);
END;
$function$;

CREATE OR REPLACE FUNCTION private.update_own_device_info(p_device_info text, p_user_agent text, p_browser text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF coalesce(length(p_device_info),0) > 512
     OR coalesce(length(p_user_agent),0) > 1024
     OR coalesce(length(p_browser),0) > 64 THEN
    RAISE EXCEPTION 'Input too long';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;

  INSERT INTO public.profiles (user_id, email, device_info, user_agent, browser, last_seen_at)
  VALUES (v_user_id, v_email, p_device_info, p_user_agent, p_browser, now())
  ON CONFLICT (user_id) DO UPDATE
    SET email = EXCLUDED.email,
        device_info = EXCLUDED.device_info,
        user_agent = EXCLUDED.user_agent,
        browser = EXCLUDED.browser,
        last_seen_at = EXCLUDED.last_seen_at;
END;
$function$;

GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.admin_set_user_blocked(uuid, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.approve_referral_reward(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.check_and_deduct_credits(uuid, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.mark_email_verified() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.mark_phone_verified(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.mark_withdrawal_failed(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.mark_withdrawal_paid(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.reject_referral_reward(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.request_withdrawal(numeric, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.update_own_device_info(text, text, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
STRICT
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
  SELECT private.has_role(_user_id, _role);
$function$;

CREATE OR REPLACE FUNCTION public.admin_set_user_blocked(p_target_user_id uuid, p_blocked boolean)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
  SELECT private.admin_set_user_blocked(p_target_user_id, p_blocked);
$function$;

CREATE OR REPLACE FUNCTION public.approve_referral_reward(p_referral_id uuid)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
  SELECT private.approve_referral_reward(p_referral_id);
$function$;

CREATE OR REPLACE FUNCTION public.check_and_deduct_credits(p_user_id uuid, p_token_cost integer)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
  SELECT private.check_and_deduct_credits(p_user_id, p_token_cost);
$function$;

CREATE OR REPLACE FUNCTION public.mark_email_verified()
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
  SELECT private.mark_email_verified();
$function$;

CREATE OR REPLACE FUNCTION public.mark_phone_verified(p_phone text)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
  SELECT private.mark_phone_verified(p_phone);
$function$;

CREATE OR REPLACE FUNCTION public.mark_withdrawal_failed(p_withdrawal_id uuid, p_reason text)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
  SELECT private.mark_withdrawal_failed(p_withdrawal_id, p_reason);
$function$;

CREATE OR REPLACE FUNCTION public.mark_withdrawal_paid(p_withdrawal_id uuid, p_transfer_code text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
  SELECT private.mark_withdrawal_paid(p_withdrawal_id, p_transfer_code);
$function$;

CREATE OR REPLACE FUNCTION public.reject_referral_reward(p_referral_id uuid, p_reason text)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
  SELECT private.reject_referral_reward(p_referral_id, p_reason);
$function$;

CREATE OR REPLACE FUNCTION public.request_withdrawal(p_amount numeric, p_momo_number text, p_network text)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
  SELECT private.request_withdrawal(p_amount, p_momo_number, p_network);
$function$;

CREATE OR REPLACE FUNCTION public.update_own_device_info(p_device_info text, p_user_agent text, p_browser text)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
  SELECT private.update_own_device_info(p_device_info, p_user_agent, p_browser);
$function$;

CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(private.has_role(auth.uid(), 'admin'::public.app_role), false);
$function$;

CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
BEGIN
  IF current_user <> 'authenticated' THEN
    RETURN NEW;
  END IF;

  IF private.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'id cannot be modified';
  END IF;
  IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'created_at cannot be modified';
  END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'user_id cannot be modified';
  END IF;
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'email can only be set from verified auth session';
  END IF;
  IF NEW.phone_verified IS DISTINCT FROM OLD.phone_verified THEN
    RAISE EXCEPTION 'phone_verified can only be set via verified OTP flow';
  END IF;
  IF NEW.phone_number IS DISTINCT FROM OLD.phone_number THEN
    RAISE EXCEPTION 'phone_number can only be set via verified phone flow';
  END IF;
  IF NEW.flagged_suspicious IS DISTINCT FROM OLD.flagged_suspicious THEN
    RAISE EXCEPTION 'flagged_suspicious is admin-managed';
  END IF;
  IF NEW.referred_by IS DISTINCT FROM OLD.referred_by THEN
    RAISE EXCEPTION 'referred_by cannot be modified after signup';
  END IF;
  IF NEW.referral_code IS DISTINCT FROM OLD.referral_code THEN
    RAISE EXCEPTION 'referral_code cannot be modified';
  END IF;
  IF NEW.ip_address IS DISTINCT FROM OLD.ip_address THEN
    RAISE EXCEPTION 'ip_address cannot be set by client';
  END IF;
  IF NEW.device_info IS DISTINCT FROM OLD.device_info
     OR NEW.user_agent IS DISTINCT FROM OLD.user_agent
     OR NEW.browser IS DISTINCT FROM OLD.browser
     OR NEW.last_seen_at IS DISTINCT FROM OLD.last_seen_at THEN
    RAISE EXCEPTION 'device telemetry must be updated via update_own_device_info()';
  END IF;

  RETURN NEW;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_user_blocked(uuid, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.approve_referral_reward(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_and_deduct_credits(uuid, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_email_verified() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_phone_verified(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_withdrawal_failed(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_withdrawal_paid(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reject_referral_reward(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.request_withdrawal(numeric, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_own_device_info(text, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO authenticated, service_role;

REVOKE ALL ON SCHEMA private FROM anon, PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA private FROM anon, PUBLIC;