CREATE OR REPLACE FUNCTION public.refund_credits(p_user_id uuid, p_kind text, p_amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'user_id required'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RETURN; END IF;
  IF p_kind NOT IN ('trial','tokens') THEN
    RAISE EXCEPTION 'Invalid refund kind';
  END IF;

  -- Lock the row to serialize against concurrent deductions
  PERFORM 1 FROM public.user_credits WHERE user_id = p_user_id FOR UPDATE;

  IF p_kind = 'trial' THEN
    UPDATE public.user_credits
      SET trial_uses_remaining = trial_uses_remaining + p_amount,
          updated_at = now()
      WHERE user_id = p_user_id;
  ELSE
    UPDATE public.user_credits
      SET tokens = tokens + p_amount,
          updated_at = now()
      WHERE user_id = p_user_id;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.refund_credits(uuid, text, integer) FROM PUBLIC, anon, authenticated;
