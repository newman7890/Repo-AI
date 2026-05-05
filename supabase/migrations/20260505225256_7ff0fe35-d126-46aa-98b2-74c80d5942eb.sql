CREATE OR REPLACE FUNCTION public.add_pending_reward(p_user_id uuid, p_amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_avail numeric;
BEGIN
  -- Make sure a credits row exists
  INSERT INTO user_credits (user_id, tokens, trial_uses_remaining)
  VALUES (p_user_id, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE user_credits
  SET wallet_pending = wallet_pending + p_amount, updated_at = now()
  WHERE user_id = p_user_id
  RETURNING wallet_available INTO v_avail;

  INSERT INTO wallet_transactions (user_id, type, amount, balance_after, description)
  VALUES (p_user_id, 'referral_pending', p_amount, COALESCE(v_avail, 0), 'Referral reward pending approval');
END;
$$;

-- Service role only (callable from edge functions, not from client)
REVOKE ALL ON FUNCTION public.add_pending_reward(uuid, numeric) FROM PUBLIC, anon, authenticated;

-- user_credits has no UNIQUE on user_id; add it so ON CONFLICT works and to enforce one row per user
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_credits_user_id_unique') THEN
    -- Deduplicate first
    DELETE FROM user_credits a USING user_credits b
    WHERE a.ctid < b.ctid AND a.user_id = b.user_id;
    ALTER TABLE user_credits ADD CONSTRAINT user_credits_user_id_unique UNIQUE (user_id);
  END IF;
END $$;
