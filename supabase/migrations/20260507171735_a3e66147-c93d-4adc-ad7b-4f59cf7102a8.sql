CREATE OR REPLACE FUNCTION public.mark_phone_verified(p_phone text)
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

  -- Normalize by stripping leading '+' and whitespace for comparison
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

REVOKE EXECUTE ON FUNCTION public.mark_phone_verified(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_phone_verified(text) TO authenticated;