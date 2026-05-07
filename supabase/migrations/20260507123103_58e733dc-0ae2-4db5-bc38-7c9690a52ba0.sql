
-- Enforce restriction only when called via the public API role (authenticated)
CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only enforce for direct authenticated client updates; allow service role / SECURITY DEFINER funcs / admins
  IF current_user <> 'authenticated' THEN
    RETURN NEW;
  END IF;

  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  IF NEW.phone_verified IS DISTINCT FROM OLD.phone_verified THEN
    RAISE EXCEPTION 'phone_verified can only be set via verified OTP flow';
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
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'user_id cannot be modified';
  END IF;
  RETURN NEW;
END;
$$;

-- Function the client calls AFTER supabase.auth.verifyOtp succeeded.
-- verifyOtp updates auth.users.phone + phone_confirmed_at; we mirror that into profiles.
CREATE OR REPLACE FUNCTION public.mark_phone_verified(p_phone text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_confirmed timestamptz;
  v_auth_phone text;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_phone IS NULL OR length(p_phone) < 6 OR length(p_phone) > 20 THEN
    RAISE EXCEPTION 'Invalid phone';
  END IF;

  -- Verify the user has actually confirmed this phone via Supabase Auth
  SELECT phone, phone_confirmed_at INTO v_auth_phone, v_confirmed
  FROM auth.users WHERE id = v_user_id;

  IF v_confirmed IS NULL THEN
    RAISE EXCEPTION 'Phone not confirmed in auth';
  END IF;

  UPDATE public.profiles
  SET phone_number = p_phone, phone_verified = true
  WHERE user_id = v_user_id;

  RETURN jsonb_build_object('success', true);
END;
$$;
