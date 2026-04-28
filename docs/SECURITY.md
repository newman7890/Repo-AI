# Renderme AI — Security Threat Model & Checklist

_Last reviewed: 2026-04-28_

## 1. Assets

| Asset | Sensitivity | Where it lives |
|---|---|---|
| User auth identity (email, password hash) | High | `auth.users` (Supabase managed) |
| User profile (email, device, IP) | Medium | `public.profiles` |
| User credits & premium status | High (financial) | `public.user_credits` |
| Payment records | High (financial) | `public.processed_payments` |
| Admin role assignments | Critical | `public.user_roles` |
| Admin notifications (PII of all users) | High | `public.admin_notifications` |
| Edit history & generated images | Medium | `public.edit_history` + storage |
| Paystack secret key, service role key | Critical | Edge function secrets only |

## 2. Trust boundaries

```
  Browser (anon JWT) ─┐
                      ├──► PostgREST ──► RLS ──► Postgres
  Browser (auth JWT) ─┤
                      └──► Edge Functions (service role) ──► Postgres (bypasses RLS)
                                       │
                                       └──► Paystack API
```

- **Client → DB**: every table is RLS-enforced. The service role is **never** shipped to the browser.
- **Client → Edge function**: every function validates the JWT via `getClaims()` and rate-limits via `check_rate_limit`.
- **Edge function → DB**: uses service role; treats all client input as untrusted; validates with Zod.
- **Webhook → Edge function**: HMAC-SHA512 signature verified before processing. Idempotent via `processed_payments`.

## 3. Threats & mitigations (STRIDE)

| # | Threat | Mitigation |
|---|---|---|
| T1 | **Spoofing** an admin via JWT tampering | JWT signature verified by `getClaims()`; role checked server-side via `has_role` (DB function), never trusted from JWT claims |
| T2 | **Tampering** with credits via direct table writes | `user_credits` blocks all client INSERT/UPDATE/DELETE; only `check_and_deduct_credits` (SECURITY DEFINER, asserts `auth.uid() = p_user_id`) and edge functions (service role) can mutate |
| T3 | **Repudiation** of payments | Every payment recorded in `processed_payments` (immutable to clients) with reference, amount, currency, event_type, timestamp |
| T4 | **Information disclosure** of other users' data | RLS scoped to `auth.uid() = user_id` on every user-owned table; admin reads gated by `has_role(auth.uid(),'admin')` |
| T5 | **Information disclosure** via Realtime | `supabase_realtime` publication contains only `admin_notifications`; Realtime respects RLS so non-admins receive zero payloads even when subscribed |
| T6 | **Denial of service** on edge functions | `check_rate_limit` per `(user_id, endpoint)` enforced before work; abort signals supported |
| T7 | **Elevation of privilege** to admin | `user_roles` writes restricted to admins; **RESTRICTIVE** policy prevents self-role assignment (`user_id <> auth.uid()`); no edge function exposes role mutation to clients |
| T8 | **SQL injection** | No raw SQL from client input anywhere; all queries use parameterized `supabase-js` builders or typed RPC. `execute_sql` is forbidden. |
| T9 | **CSRF on payment webhooks** | Paystack signature header verified with HMAC; replay blocked by idempotent reference check |
| T10 | **Leaked passwords** | HIBP password check enabled at signup |
| T11 | **Privilege abuse via SECURITY DEFINER** | All SD functions: pinned `search_path`, no dynamic SQL, no DML on privileged tables outside scoped intent. EXECUTE revoked from anon on every SD function. Trigger-only functions revoked from authenticated too. |

## 4. has_role audit (2026-04-28)

```sql
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE STRICT SECURITY DEFINER
SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role); $$;
```

| Check | Result |
|---|---|
| Side effects (DML)? | None — pure SELECT |
| Dynamic SQL / EXECUTE? | None |
| Reads any other table? | No, only `public.user_roles` |
| `search_path` injection? | Pinned to `public` |
| NULL handling? | `STRICT` — returns NULL (false in policies) on NULL inputs |
| Anon callable? | No — `REVOKE EXECUTE … FROM anon, PUBLIC` |
| Authenticated callable? | Yes — required for RLS policies that call `has_role(auth.uid(),'admin')` |
| Role enumeration risk? | A user can only check `has_role(self, role)` — they cannot enumerate other users' roles because they cannot SELECT `user_roles` (no policy grants it) and the function returns only a boolean for the pair they pass. They could call `has_role(<other_uuid>, 'admin')` to check if a specific UUID is admin — accepted risk: UUIDs are unguessable and the answer leaks only "is X admin". |
| Recursion / privilege loop? | No — does not call other SD functions |

**Verdict**: hardened, no unintended write paths.

## 5. Operational checklist

Run before each release:

- [ ] `supabase--linter` returns zero NEW warnings
- [ ] `security--run_security_scan` returns zero unresolved findings
- [ ] All edge functions validate JWT via `getClaims()`
- [ ] All edge functions Zod-validate request bodies
- [ ] No new tables created without RLS enabled
- [ ] No new SECURITY DEFINER functions without `SET search_path` and explicit `REVOKE … FROM anon`
- [ ] No new tables added to `supabase_realtime` publication unless required
- [ ] Auth: HIBP enabled, anonymous sign-ins disabled, email confirmation required
- [ ] Secrets rotated if any team member offboarded
- [ ] `processed_payments` idempotency check present on every payment write path

## 6. Things intentionally NOT protected (documented)

- `showcase_examples.prompt` is publicly readable — admin-curated marketing content.
- `processed_payments` and `rate_limits` have RLS enabled with zero client policies — service role only.
- `slider_events` accepts anon INSERT (analytics) with strict CHECK constraints on payload shape.
