
-- Create user_credits table for SaaS token system
CREATE TABLE public.user_credits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  tokens INTEGER NOT NULL DEFAULT 0,
  trial_uses_remaining INTEGER NOT NULL DEFAULT 3,
  is_premium BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

-- Users can read their own credits
CREATE POLICY "Users can view their own credits"
ON public.user_credits FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Only service role can modify credits (via edge functions)
-- No insert/update/delete policies for authenticated users

-- Auto-create credits row on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user_credits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_credits (user_id, tokens, trial_uses_remaining)
  VALUES (NEW.id, 0, 3);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_credits
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_credits();

-- Function to check and deduct credits (called from edge functions via service role)
CREATE OR REPLACE FUNCTION public.check_and_deduct_credits(
  p_user_id UUID,
  p_token_cost INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_credits user_credits%ROWTYPE;
BEGIN
  SELECT * INTO v_credits FROM user_credits WHERE user_id = p_user_id FOR UPDATE;
  
  IF NOT FOUND THEN
    -- Auto-create for existing users who don't have a row yet
    INSERT INTO user_credits (user_id, tokens, trial_uses_remaining)
    VALUES (p_user_id, 0, 3)
    RETURNING * INTO v_credits;
  END IF;

  -- Check trial uses first
  IF v_credits.trial_uses_remaining > 0 THEN
    UPDATE user_credits SET trial_uses_remaining = trial_uses_remaining - 1, updated_at = now()
    WHERE user_id = p_user_id;
    RETURN jsonb_build_object('allowed', true, 'used', 'trial', 'remaining_trials', v_credits.trial_uses_remaining - 1, 'tokens', v_credits.tokens);
  END IF;

  -- Check tokens
  IF v_credits.tokens >= p_token_cost THEN
    UPDATE user_credits SET tokens = tokens - p_token_cost, updated_at = now()
    WHERE user_id = p_user_id;
    RETURN jsonb_build_object('allowed', true, 'used', 'tokens', 'remaining_trials', 0, 'tokens', v_credits.tokens - p_token_cost);
  END IF;

  -- Not enough credits
  RETURN jsonb_build_object('allowed', false, 'used', 'none', 'remaining_trials', 0, 'tokens', v_credits.tokens, 'is_premium', v_credits.is_premium);
END;
$$;
