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