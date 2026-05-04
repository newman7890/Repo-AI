import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildProcessedPaymentRecord, resolveTokens } from "../payment-core.ts";
import { isPolicyFailure } from "../checkout-alerts.ts";

Deno.test("payment outcome recording uses stable idempotency fields", () => {
  const record = buildProcessedPaymentRecord({
    reference: "ref_123",
    userId: "user-123",
    eventType: "verify-payment",
    amount: 10000,
    currency: "GHS",
  });

  assertEquals(record, {
    reference: "ref_123",
    user_id: "user-123",
    event_type: "verify-payment",
    amount: 10000,
    currency: "GHS",
  });
});

Deno.test("successful payment resolves tokens from metadata or plan amount", () => {
  assertEquals(resolveTokens({ tokens: 500 }, 10000), 500);
  assertEquals(resolveTokens({}, 10000), 100);
  assertEquals(resolveTokens(null, 12345), 0);
});

Deno.test("checkout alert detector catches RLS and policy failures", () => {
  assertEquals(isPolicyFailure({ code: "42501", message: "new row violates row-level security policy" }), true);
  assertEquals(isPolicyFailure({ message: "permission denied for table processed_payments" }), true);
  assertEquals(isPolicyFailure({ message: "duplicate key value violates unique constraint" }), false);
});
import { ALLOWED_CALLBACK_ORIGINS, resolveCallbackBase, DEFAULT_CALLBACK_BASE } from "../payment-core.ts";

// ---------------------------------------------------------------------------
// SECURITY REGRESSION TESTS — verify-payment origin allowlist
// verify-payment credits tokens / grants premium based on a Paystack
// reference. We must reject any request whose Origin header is not in the
// hardcoded allowlist so a spoofed-origin caller cannot be the source of a
// crediting flow. The allowlist itself must not regress.
// ---------------------------------------------------------------------------

Deno.test("SECURITY: verify-payment allowlist contains only HTTPS production/preview origins", () => {
  for (const origin of ALLOWED_CALLBACK_ORIGINS) {
    if (!origin.startsWith("https://")) {
      throw new Error(`Allowlist must be HTTPS-only, got: ${origin}`);
    }
  }
});

Deno.test("SECURITY: verify-payment allowlist excludes wildcards and dangerous values", () => {
  const forbidden = ["*", "null", "http://localhost", "https://evil.com"];
  for (const bad of forbidden) {
    if ((ALLOWED_CALLBACK_ORIGINS as readonly string[]).includes(bad)) {
      throw new Error(`Allowlist must not contain ${bad}`);
    }
  }
});

Deno.test("SECURITY: spoofed origins resolve to safe default for verify-payment context", () => {
  assertEquals(resolveCallbackBase("https://evil.com", null), DEFAULT_CALLBACK_BASE);
});
