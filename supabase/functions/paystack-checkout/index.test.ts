import { assertEquals, assertRejects, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildPaystackTransactionBody,
  resolveCallbackBase,
  ALLOWED_CALLBACK_ORIGINS,
  DEFAULT_CALLBACK_BASE,
} from "../payment-core.ts";

Deno.test("mobile money checkout uses Paystack hosted MoMo channel with one-time metadata", () => {
  const body = buildPaystackTransactionBody({
    userEmail: "buyer@example.com",
    userId: "user-123",
    planId: "standard",
    paymentMethod: "mobile_money",
    callbackBase: "https://renderme.site",
  });

  assertEquals(body.channels, ["mobile_money"]);
  assertEquals(body.amount, 10000);
  assertEquals(body.currency, "GHS");
  assertEquals(body.callback_url, "https://renderme.site/app?payment=success");
  assertEquals(body.metadata, {
    user_id: "user-123",
    plan: "standard",
    plan_id: "standard",
    tokens: 100,
    payment_method: "mobile_money",
    billing_type: "one_time",
  });
  assertEquals("plan" in body, false);
});

Deno.test("card checkout includes plan code and subscription metadata", () => {
  const body = buildPaystackTransactionBody({
    userEmail: "buyer@example.com",
    userId: "user-123",
    planId: "pro",
    paymentMethod: "card",
    callbackBase: "https://renderme.site",
    planCode: "PLN_test123",
  });

  assertEquals(body.channels, ["card"]);
  assertEquals(body.plan, "PLN_test123");
  assertEquals(body.amount, 20000);
  assertEquals((body.metadata as Record<string, unknown>).billing_type, "subscription");
  assertEquals((body.metadata as Record<string, unknown>).tokens, 200);
});

Deno.test("card checkout rejects missing Paystack plan code", async () => {
  await assertRejects(
    async () => {
      buildPaystackTransactionBody({
        userEmail: "buyer@example.com",
        userId: "user-123",
        planId: "pro",
        paymentMethod: "card",
        callbackBase: "https://renderme.site",
      });
    },
    Error,
    "Card checkout requires a Paystack plan code",
  );
});
// ---------------------------------------------------------------------------
// SECURITY REGRESSION TESTS — callback URL origin spoofing
// Issue: paystack-checkout previously trusted the Origin header for the
// Paystack callback_url, allowing a non-browser caller to redirect victims
// to attacker-controlled sites after they paid on the legitimate Paystack
// page. resolveCallbackBase() must only ever return an allowlisted origin
// or the safe default fallback.
// ---------------------------------------------------------------------------

Deno.test("SECURITY: spoofed Origin header falls back to default callback base", () => {
  const evilOrigins = [
    "https://evil.com",
    "https://renderme.site.evil.com",
    "https://renderme-site.com",
    "http://renderme.site",                  // wrong scheme
    "https://renderme.site/",                // trailing slash mismatch
    "javascript:alert(1)",
    "//renderme.site",
    "",
  ];
  for (const origin of evilOrigins) {
    const base = resolveCallbackBase(origin, null);
    assertEquals(base, DEFAULT_CALLBACK_BASE, `must reject spoofed origin: ${origin}`);
  }
});

Deno.test("SECURITY: missing Origin header falls back to default callback base", () => {
  assertEquals(resolveCallbackBase(null, null), DEFAULT_CALLBACK_BASE);
  assertEquals(resolveCallbackBase(undefined, null), DEFAULT_CALLBACK_BASE);
});

Deno.test("SECURITY: allowlisted origins are accepted as-is", () => {
  for (const allowed of ALLOWED_CALLBACK_ORIGINS) {
    assertEquals(resolveCallbackBase(allowed, null), allowed);
  }
});

Deno.test("SECURITY: APP_BASE_URL env override is used when origin is not allowed", () => {
  assertEquals(
    resolveCallbackBase("https://evil.com", "https://staging.renderme.site"),
    "https://staging.renderme.site",
  );
});

Deno.test("SECURITY: built transaction body never embeds a spoofed origin in callback_url", () => {
  const base = resolveCallbackBase("https://evil.com", null);
  const body = buildPaystackTransactionBody({
    userEmail: "buyer@example.com",
    userId: "user-123",
    planId: "standard",
    paymentMethod: "mobile_money",
    callbackBase: base,
  });
  const callback = body.callback_url as string;
  assert(
    ALLOWED_CALLBACK_ORIGINS.some((o) => callback.startsWith(o + "/")),
    `callback_url must start with an allowlisted origin, got: ${callback}`,
  );
  assert(!callback.includes("evil.com"), "callback_url must never contain spoofed origin");
});
