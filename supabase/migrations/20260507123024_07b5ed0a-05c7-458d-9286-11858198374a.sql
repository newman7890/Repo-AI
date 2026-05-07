
-- 1) Lock down profile self-updates: prevent users from flipping phone_verified, flagged_suspicious, or referred_by
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile safe columns"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Trigger to block sensitive column changes by non-admins
CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow service role / admins to change anything
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  IF NEW.phone_verified IS DISTINCT FROM OLD.phone_verified THEN
    RAISE EXCEPTION 'phone_verified can only be set via verified OTP flow';
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
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_sensitive_columns_trg ON public.profiles;
CREATE TRIGGER protect_profile_sensitive_columns_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_sensitive_columns();

-- 2) Admin audit log
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  action text NOT NULL,
  target_user_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read audit log"
ON public.admin_audit_log
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Block client inserts on admin_audit_log"
ON public.admin_audit_log
FOR INSERT TO authenticated
WITH CHECK (false);

CREATE POLICY "Block client updates on admin_audit_log"
ON public.admin_audit_log
FOR UPDATE TO authenticated
USING (false) WITH CHECK (false);

CREATE POLICY "Block client deletes on admin_audit_log"
ON public.admin_audit_log
FOR DELETE TO authenticated
USING (false);

-- 3) Secure RPC to toggle block status with audit
CREATE OR REPLACE FUNCTION public.admin_set_user_blocked(p_target_user_id uuid, p_blocked boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.has_role(v_actor, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  IF p_target_user_id IS NULL THEN RAISE EXCEPTION 'Target user required'; END IF;

  UPDATE public.user_credits
  SET blocked = p_blocked, updated_at = now()
  WHERE user_id = p_target_user_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;

  INSERT INTO public.admin_audit_log (actor_id, action, target_user_id, metadata)
  VALUES (v_actor, CASE WHEN p_blocked THEN 'user_block' ELSE 'user_unblock' END,
          p_target_user_id, jsonb_build_object('blocked', p_blocked));

  RETURN jsonb_build_object('success', true, 'blocked', p_blocked);
END;
$$;
