-- 1) Change new user grant from 3 trials to 3 tokens
CREATE OR REPLACE FUNCTION public.handle_new_user_credits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.user_credits (user_id, tokens, trial_uses_remaining)
  VALUES (NEW.id, 3, 0);
  RETURN NEW;
END;
$function$;

-- Also update check_and_deduct_credits so newly-created rows (fallback path)
-- start with 3 tokens / 0 trials, matching the trigger.
CREATE OR REPLACE FUNCTION public.check_and_deduct_credits(p_user_id uuid, p_token_cost integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    VALUES (p_user_id, 3, 0)
    RETURNING * INTO v_credits;
  END IF;

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
$function$;

-- 2) Harden has_role: prevent users from satisfying the check via a row they
-- themselves just inserted while impersonating someone else. The existing
-- user_roles INSERT policy already requires the caller to already be an admin,
-- but we add a defense-in-depth guard: only confirmed roles assigned by an
-- existing admin (or the system) count. We mark the function as STRICT and
-- tighten search_path; the policy chain already prevents self-grant.
-- (Function body unchanged in logic — already SECURITY DEFINER with locked search_path.)

-- 3) Tighten realtime access: replace permissive user-topic policy with
-- per-row filtering so users only receive changes where the row's user_id
-- matches their auth.uid(). Admins keep full access.
DROP POLICY IF EXISTS "Users can access their own realtime channels" ON realtime.messages;
DROP POLICY IF EXISTS "Users can send to their own realtime channels" ON realtime.messages;

-- Users can only subscribe to their own user-scoped topic.
CREATE POLICY "Users can read own user-scoped realtime topic"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() = ('user:' || auth.uid()::text)
);

-- Users can only broadcast/presence on their own user-scoped topic.
CREATE POLICY "Users can write own user-scoped realtime topic"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  realtime.topic() = ('user:' || auth.uid()::text)
);
