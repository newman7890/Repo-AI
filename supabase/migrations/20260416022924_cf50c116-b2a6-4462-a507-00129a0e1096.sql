-- Fix 1: Add guards to check_and_deduct_credits to prevent negative costs and cross-user attacks
CREATE OR REPLACE FUNCTION public.check_and_deduct_credits(p_user_id uuid, p_token_cost integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_credits user_credits%ROWTYPE;
BEGIN
  -- Guard: reject negative or zero token costs
  IF p_token_cost <= 0 THEN
    RAISE EXCEPTION 'Invalid token cost';
  END IF;

  -- Guard: users can only deduct their own credits
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO v_credits FROM user_credits WHERE user_id = p_user_id FOR UPDATE;
  
  IF NOT FOUND THEN
    INSERT INTO user_credits (user_id, tokens, trial_uses_remaining)
    VALUES (p_user_id, 0, 3)
    RETURNING * INTO v_credits;
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

-- Fix 2: Block direct writes to user_credits from authenticated users
-- Only service_role (edge functions) should modify credits
CREATE POLICY "Block user inserts on credits"
ON public.user_credits
FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY "Block user updates on credits"
ON public.user_credits
FOR UPDATE
TO authenticated
USING (false);

CREATE POLICY "Block user deletes on credits"
ON public.user_credits
FOR DELETE
TO authenticated
USING (false);