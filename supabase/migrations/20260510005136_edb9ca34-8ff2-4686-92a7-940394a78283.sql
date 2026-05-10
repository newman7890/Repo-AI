-- Extend the sensitive-column protection trigger to also cover identity/telemetry columns
CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF current_user <> 'authenticated' THEN
    RETURN NEW;
  END IF;

  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
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
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'user_id cannot be modified';
  END IF;
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'email can only be set from verified auth session';
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

-- Ensure the trigger is attached
DROP TRIGGER IF EXISTS protect_profile_sensitive_columns_trg ON public.profiles;
CREATE TRIGGER protect_profile_sensitive_columns_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_sensitive_columns();

-- Secure helper so the client can record its own device telemetry without spoofing identity
CREATE OR REPLACE FUNCTION public.update_own_device_info(
  p_device_info text,
  p_user_agent text,
  p_browser text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF coalesce(length(p_device_info),0) > 512
     OR coalesce(length(p_user_agent),0) > 1024
     OR coalesce(length(p_browser),0) > 64 THEN
    RAISE EXCEPTION 'Input too long';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;

  INSERT INTO public.profiles (user_id, email, device_info, user_agent, browser, last_seen_at)
  VALUES (v_user_id, v_email, p_device_info, p_user_agent, p_browser, now())
  ON CONFLICT (user_id) DO UPDATE
    SET email = EXCLUDED.email,
        device_info = EXCLUDED.device_info,
        user_agent = EXCLUDED.user_agent,
        browser = EXCLUDED.browser,
        last_seen_at = EXCLUDED.last_seen_at;
END;
$function$;

-- profiles.user_id needs to be unique for the upsert above
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_user_id_key'
  ) THEN
    BEGIN
      ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);
    EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL;
    END;
  END IF;
END $$;

REVOKE EXECUTE ON FUNCTION public.update_own_device_info(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_own_device_info(text, text, text) TO authenticated;