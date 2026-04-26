-- Lock down INSERT/DELETE on financially-sensitive tables.
-- Server-side SECURITY DEFINER functions and the service role bypass RLS,
-- so triggers (handle_new_user_credits) and edge functions continue to work.

CREATE POLICY "Block client inserts on user_credits"
ON public.user_credits FOR INSERT TO authenticated
WITH CHECK (false);

CREATE POLICY "Block client deletes on user_credits"
ON public.user_credits FOR DELETE TO authenticated
USING (false);

CREATE POLICY "Block client inserts on admin_notifications"
ON public.admin_notifications FOR INSERT TO authenticated
WITH CHECK (false);

CREATE POLICY "Block client deletes on admin_notifications"
ON public.admin_notifications FOR DELETE TO authenticated
USING (false);

CREATE POLICY "Block client inserts on processed_payments"
ON public.processed_payments FOR INSERT TO authenticated
WITH CHECK (false);

CREATE POLICY "Block client updates on processed_payments"
ON public.processed_payments FOR UPDATE TO authenticated
USING (false) WITH CHECK (false);

CREATE POLICY "Block client deletes on processed_payments"
ON public.processed_payments FOR DELETE TO authenticated
USING (false);