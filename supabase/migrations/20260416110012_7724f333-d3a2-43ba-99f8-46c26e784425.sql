-- Track processed payment references to prevent replay/double-grant attacks
CREATE TABLE public.processed_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  amount integer,
  currency text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.processed_payments ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_processed_payments_reference ON public.processed_payments(reference);
CREATE INDEX idx_processed_payments_user_id ON public.processed_payments(user_id);

-- Rate limiting table for edge functions
CREATE TABLE public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  window_start timestamptz NOT NULL DEFAULT now(),
  request_count integer NOT NULL DEFAULT 1
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_rate_limits_lookup ON public.rate_limits(user_id, endpoint, window_start);

-- Function to check rate limit (returns true if allowed)
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id uuid,
  p_endpoint text,
  p_max_requests integer DEFAULT 10,
  p_window_seconds integer DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_window_start timestamptz;
  v_count integer;
BEGIN
  v_window_start := now() - (p_window_seconds || ' seconds')::interval;
  
  DELETE FROM rate_limits 
  WHERE user_id = p_user_id 
    AND endpoint = p_endpoint 
    AND window_start < v_window_start;
  
  SELECT COALESCE(SUM(request_count), 0) INTO v_count
  FROM rate_limits
  WHERE user_id = p_user_id
    AND endpoint = p_endpoint
    AND window_start >= v_window_start;
  
  IF v_count >= p_max_requests THEN
    RETURN false;
  END IF;
  
  INSERT INTO rate_limits (user_id, endpoint, window_start)
  VALUES (p_user_id, p_endpoint, now());
  
  RETURN true;
END;
$$;