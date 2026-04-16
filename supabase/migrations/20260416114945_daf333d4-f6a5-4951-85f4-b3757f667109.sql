
CREATE OR REPLACE FUNCTION public.check_and_deduct_credits(p_user_id uuid, p_token_cost integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_credits user_credits%ROWTYPE;
BEGIN
  IF p_token_cost <= 0 THEN
    RAISE EXCEPTION 'Invalid token cost';
  END IF;

  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO v_credits FROM user_credits WHERE user_id = p_user_id FOR UPDATE;
  
  IF NOT FOUND THEN
    INSERT INTO user_credits (user_id, tokens, trial_uses_remaining)
    VALUES (p_user_id, 0, 3)
    RETURNING * INTO v_credits;
  END IF;

  -- Block check
  IF v_credits.blocked THEN
    RETURN jsonb_build_object('allowed', false, 'used', 'none', 'blocked', true, 'remaining_trials', 0, 'tokens', v_credits.tokens);
  END IF;

  IF v_credits.trial_uses_remaining > 0 THEN
    UPDATE user_credits SET trial_uses_remaining = trial_uses_remaining - 1, updated_at = now()
    WHERE user_id = p_user_id;
    RETURN jsonb_build_object('allowed', true, 'used', 'trial', 'remaining_trials', v_credits.trial_uses_remaining - 1, 'tokens', v_credits.tokens);
  END IF;

  IF v_credits.tokens >= p_token_cost THEN
    UPDATE user_credits SET tokens = tokens - p_token_cost, updated_at = now()
    WHERE user_id = p_user_id;
    RETURN jsonb_build_object('allowed', true, 'used', 'tokens', 'remaining_trials', 0, 'tokens', v_credits.tokens - p_token_cost);
  END IF;

  RETURN jsonb_build_object('allowed', false, 'used', 'none', 'remaining_trials', 0, 'tokens', v_credits.tokens, 'is_premium', v_credits.is_premium);
END;
$$;
