-- =========================================================================
-- Security hardening migration
-- 1. Lock down EXECUTE on SECURITY DEFINER functions (least privilege)
-- 2. Harden has_role: STRICT, search_path locked, explicit revokes
-- 3. Add explicit anti-self-escalation policies on user_roles
-- 4. Tighten admin_notifications policies (defense in depth)
-- =========================================================================

-- ---- 1. Revoke broad EXECUTE on SECURITY DEFINER functions --------------

-- Trigger-only functions: NO direct callers needed
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_credits() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_profile() FROM PUBLIC, anon, authenticated;

-- Service-role only function (called by edge functions)
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(uuid, text, integer, integer) FROM PUBLIC, anon, authenticated;

-- Functions that must remain callable by signed-in users:
-- has_role: invoked inside RLS policies on behalf of authenticated users
-- check_and_deduct_credits: called as RPC from client
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.check_and_deduct_credits(uuid, integer) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.check_and_deduct_credits(uuid, integer) TO authenticated;

-- ---- 2. Harden has_role -------------------------------------------------
-- - STRICT: returns NULL (=> false in policies) on NULL inputs
-- - search_path pinned to public, pg_temp removed implicitly
-- - SECURITY DEFINER stays (needs to read user_roles regardless of caller RLS)
-- - No write paths: pure SELECT inside, no DML, no dynamic SQL
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
STRICT
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- ---- 3. Anti self-escalation on user_roles ------------------------------
-- Existing policies already require has_role(auth.uid(),'admin') for INSERT/UPDATE/DELETE,
-- but add a belt-and-braces RESTRICTIVE policy that blocks any write where a user
-- would assign themselves a role (even if a future bug allowed admin write paths).
DROP POLICY IF EXISTS "No self role assignment" ON public.user_roles;
CREATE POLICY "No self role assignment"
ON public.user_roles
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (user_id <> auth.uid());

DROP POLICY IF EXISTS "No self role update" ON public.user_roles;
CREATE POLICY "No self role update"
ON public.user_roles
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (user_id <> auth.uid())
WITH CHECK (user_id <> auth.uid());

-- ---- 4. admin_notifications: explicit deny for non-admin selects --------
-- Current state already blocks non-admin reads (only admin SELECT policy exists),
-- but add an explicit RESTRICTIVE policy that documents intent and survives
-- any future careless permissive policy additions.
DROP POLICY IF EXISTS "Only admins can read admin_notifications" ON public.admin_notifications;
CREATE POLICY "Only admins can read admin_notifications"
ON public.admin_notifications
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));
