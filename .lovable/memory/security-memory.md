# Security Memory

## Tables with intentionally no RLS policies
- `processed_payments` — service_role only, tracks idempotent payment processing
- `rate_limits` — service_role only, used by edge functions for rate limiting

These tables have RLS enabled with zero policies, which blocks all client access. This is intentional.
Security scanners should ignore "RLS Enabled No Policy" and "no SELECT policy" findings for these tables.

## user_credits RLS pattern
- Only SELECT policy exists (scoped to auth.uid() = user_id)
- No INSERT/UPDATE/DELETE policies — RLS blocks those operations by default
- All credit mutations happen via security-definer functions (check_and_deduct_credits) or service-role in edge functions

## Auth configuration
- Email auto-confirm: disabled (users must verify email)
- Anonymous users: disabled
- HIBP password check: enabled
- Signup: enabled

## Realtime publication
- Only `admin_notifications` is published to `supabase_realtime` (used by AdminNotifications panel, admin-only RLS)
- `ai_usage_logs`, `user_credits`, `processed_payments`, `profiles` are intentionally NOT in the realtime publication — do not re-add unless realtime is actually needed
- Scanners flagging "sensitive tables in realtime" for the removed tables should be ignored if they reappear

## showcase_examples prompt visibility
- `prompt` column is publicly readable by design — admin-curated marketing content, not user-submitted
- Only admins can INSERT/UPDATE via AdminShowcaseManager. Ignore "prompt exposure" findings on this table.

## Edge function security patterns
- All edge functions use `getClaims()` for JWT validation
- No fallback to anon key in auth-headers (throws error if not authenticated)
- Rate limiting via `check_rate_limit` DB function on all endpoints
- Payment webhook signature verification via HMAC-SHA512
- Idempotent payment processing via `processed_payments` table
- Payment amount verification against expected plan amount
