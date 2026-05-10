
CREATE OR REPLACE FUNCTION public.mark_email_verified()
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

  -- Require fresh reauthentication (OTP verified) — prevents direct RPC bypass
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
