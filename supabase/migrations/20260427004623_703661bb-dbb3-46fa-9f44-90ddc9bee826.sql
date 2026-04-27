-- Remove sensitive tables from realtime publication that don't need realtime broadcasts.
-- Only admin_notifications is actively used for realtime (in the admin notifications panel,
-- already gated by admin-only RLS). The others were inadvertently published and broadcast
-- row changes to subscribed clients (filtered by RLS, but still an unnecessary attack surface).

ALTER PUBLICATION supabase_realtime DROP TABLE public.ai_usage_logs;
ALTER PUBLICATION supabase_realtime DROP TABLE public.user_credits;
ALTER PUBLICATION supabase_realtime DROP TABLE public.processed_payments;
ALTER PUBLICATION supabase_realtime DROP TABLE public.profiles;