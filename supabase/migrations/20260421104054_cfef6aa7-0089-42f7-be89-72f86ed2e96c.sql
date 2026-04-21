-- Enable RLS on realtime.messages and add authorization policies
-- to prevent unauthorized channel subscriptions.
-- Topic naming convention enforced by client:
--   "user:<user_id>"  -> only that user (or admin) can subscribe
--   "admin:*"         -> only admins can subscribe
-- Postgres Changes (used by current app) goes through realtime.messages too,
-- so we restrict broadcast/presence channels to the conventions above.

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- Allow admins to subscribe to any realtime channel (admin dashboard needs
-- to listen to admin_notifications, profiles, processed_payments inserts).
CREATE POLICY "Admins can access all realtime channels"
ON realtime.messages
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can send to all realtime channels"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Allow authenticated users to subscribe to channels scoped to their own user_id
-- via the convention "user:<auth.uid()>".
CREATE POLICY "Users can access their own realtime channels"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() = ('user:' || auth.uid()::text)
);

CREATE POLICY "Users can send to their own realtime channels"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  realtime.topic() = ('user:' || auth.uid()::text)
);
