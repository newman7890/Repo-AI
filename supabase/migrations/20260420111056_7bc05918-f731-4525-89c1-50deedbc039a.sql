-- Enable realtime for admin dashboard tables
ALTER TABLE public.admin_notifications REPLICA IDENTITY FULL;
ALTER TABLE public.user_credits REPLICA IDENTITY FULL;
ALTER TABLE public.processed_payments REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.ai_usage_logs REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_credits;
ALTER PUBLICATION supabase_realtime ADD TABLE public.processed_payments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_usage_logs;