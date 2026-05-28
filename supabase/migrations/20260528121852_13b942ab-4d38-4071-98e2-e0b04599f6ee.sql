
-- Fix 1: Restrict referrer view of referrals to non-sensitive columns
DROP POLICY IF EXISTS "Users can view their own referrals (as referrer)" ON public.referrals;

CREATE OR REPLACE VIEW public.my_referrals
WITH (security_invoker = true) AS
SELECT id, referrer_id, reward_amount, status, plan_id, approved_at, created_at, updated_at
FROM public.referrals
WHERE referrer_id = auth.uid();

GRANT SELECT ON public.my_referrals TO authenticated;

-- Fix 2: Remove admin_notifications from realtime publication so row changes
-- are not broadcast at the replication level (RESTRICTIVE SELECT policy does
-- not apply to replication stream).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'admin_notifications'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.admin_notifications';
  END IF;
END $$;
