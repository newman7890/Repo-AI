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

## Edge function security patterns
- All edge functions use `getClaims()` for JWT validation
- No fallback to anon key in auth-headers (throws error if not authenticated)
- Rate limiting via `check_rate_limit` DB function on all endpoints
- Payment webhook signature verification via HMAC-SHA512
- Idempotent payment processing via `processed_payments` table
- Payment amount verification against expected plan amount
