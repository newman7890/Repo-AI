CREATE POLICY "Users can view their own payments"
ON public.processed_payments
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all payments"
ON public.processed_payments
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));