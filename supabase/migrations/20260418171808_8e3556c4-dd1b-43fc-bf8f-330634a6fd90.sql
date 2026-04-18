-- C2: Make rate_limits intentionally service-role-only with an explicit deny policy
-- This table is written only via the check_rate_limit() SECURITY DEFINER function using the service role.
-- Adding an explicit deny-all policy documents this and clears the "RLS enabled but no policies" warning.
CREATE POLICY "Deny all client access to rate_limits"
ON public.rate_limits
FOR ALL
TO authenticated, anon
USING (false)
WITH CHECK (false);

COMMENT ON TABLE public.rate_limits IS 'Service-role only. Written via public.check_rate_limit() SECURITY DEFINER function. No client access permitted.';

-- H4: Ensure payment idempotency at the database level
-- Prevents double-crediting when both the webhook and verify-charge process the same payment concurrently.
-- Uses (reference, event_type) so we still allow distinct event types (charge.success, invoice.payment_succeeded, etc.) per reference.
CREATE UNIQUE INDEX IF NOT EXISTS processed_payments_reference_event_unique
ON public.processed_payments (reference, event_type);