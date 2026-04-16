# Security Memory

## Tables with intentionally no RLS policies
- `processed_payments` — service_role only, tracks idempotent payment processing
- `rate_limits` — service_role only, used by edge functions for rate limiting

These tables have RLS enabled with zero policies, which blocks all client access. This is intentional.

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
