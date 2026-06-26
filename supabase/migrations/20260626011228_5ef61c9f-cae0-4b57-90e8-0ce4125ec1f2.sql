-- Allow users to update their own profile row, while protecting sensitive fields.
CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Backend/service operations are allowed to maintain profiles.
  IF current_user <> 'authenticated' THEN
    RETURN NEW;
  END IF;

  -- Admin-managed flows remain allowed.
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'id cannot be modified';
  END IF;
  IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'created_at cannot be modified';
  END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'user_id cannot be modified';
  END IF;
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'email can only be set from verified auth session';
  END IF;
  IF NEW.phone_verified IS DISTINCT FROM OLD.phone_verified THEN
    RAISE EXCEPTION 'phone_verified can only be set via verified OTP flow';
  END IF;
  IF NEW.phone_number IS DISTINCT FROM OLD.phone_number THEN
    RAISE EXCEPTION 'phone_number can only be set via verified phone flow';
  END IF;
  IF NEW.flagged_suspicious IS DISTINCT FROM OLD.flagged_suspicious THEN
    RAISE EXCEPTION 'flagged_suspicious is admin-managed';
  END IF;
  IF NEW.referred_by IS DISTINCT FROM OLD.referred_by THEN
    RAISE EXCEPTION 'referred_by cannot be modified after signup';
  END IF;
  IF NEW.referral_code IS DISTINCT FROM OLD.referral_code THEN
    RAISE EXCEPTION 'referral_code cannot be modified';
  END IF;
  IF NEW.ip_address IS DISTINCT FROM OLD.ip_address THEN
    RAISE EXCEPTION 'ip_address cannot be set by client';
  END IF;
  IF NEW.device_info IS DISTINCT FROM OLD.device_info
     OR NEW.user_agent IS DISTINCT FROM OLD.user_agent
     OR NEW.browser IS DISTINCT FROM OLD.browser
     OR NEW.last_seen_at IS DISTINCT FROM OLD.last_seen_at THEN
    RAISE EXCEPTION 'device telemetry must be updated via update_own_device_info()';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.protect_profile_sensitive_columns() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS protect_profile_sensitive_columns_trigger ON public.profiles;
CREATE TRIGGER protect_profile_sensitive_columns_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_sensitive_columns();

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own non-sensitive profile fields" ON public.profiles;
CREATE POLICY "Users can update own non-sensitive profile fields"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Stop anonymous slider analytics writes. Authenticated writes stay shape-limited.
REVOKE INSERT ON TABLE public.slider_events FROM anon;
GRANT INSERT ON TABLE public.slider_events TO authenticated;
GRANT ALL ON TABLE public.slider_events TO service_role;

DROP POLICY IF EXISTS "Anyone can record valid slider events" ON public.slider_events;
DROP POLICY IF EXISTS "Authenticated users can record valid slider events" ON public.slider_events;
CREATE POLICY "Authenticated users can record valid slider events"
ON public.slider_events
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND event_type = ANY (ARRAY[
    'view'::text,
    'interact'::text,
    'complete'::text,
    'drag_start'::text,
    'drag_end'::text,
    'tap'::text,
    'drag_complete'::text,
    'cta_click'::text
  ])
  AND length(event_type) <= 32
  AND (session_id IS NULL OR length(session_id) <= 128)
  AND (user_agent IS NULL OR length(user_agent) <= 512)
);