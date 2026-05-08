-- Allow email-based identity verification to unlock payouts.
-- Reuses the existing phone_verified flag as the "identity verified" gate.
CREATE OR REPLACE FUNCTION public.mark_email_verified()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
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
$$;

REVOKE EXECUTE ON FUNCTION public.mark_email_verified() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_email_verified() TO authenticated;