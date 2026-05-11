export type PaymentMethod = "card" | "mobile_money";

export const PLAN_CURRENCY = "GHS";

// SECURITY: Hardcoded allowlist of origins that may be used as the Paystack
// callback URL base. The Origin header is attacker-controllable from
// non-browser clients, so we never accept arbitrary values — a spoofed origin
// would let an attacker redirect a victim's post-payment flow to a site they
// control. Anything not in this set falls back to DEFAULT_CALLBACK_BASE.
export const ALLOWED_CALLBACK_ORIGINS: readonly string[] = [
  "https://renderme.site",
  "https://www.renderme.site",
  "https://renderme.lovable.app",
  "https://id-preview--847849db-51d3-46ca-9ff0-0602130807c1.lovable.app",
];

export const DEFAULT_CALLBACK_BASE = "https://renderme.site";

export function resolveCallbackBase(
  requestOrigin: string | null | undefined,
  envBase?: string | null,
): string {
  const fallback = envBase && envBase.length > 0 ? envBase : DEFAULT_CALLBACK_BASE;
  if (!requestOrigin) return fallback;
  return ALLOWED_CALLBACK_ORIGINS.includes(requestOrigin) ? requestOrigin : fallback;
}

export const PLANS: Record<string, { name: string; amount: number; tokens: number }> = {
  starter: { name: "Renderme AI Starter", amount: 5000, tokens: 50 },
  standard: { name: "Renderme AI Standard", amount: 10000, tokens: 100 },
  pro: { name: "Renderme AI Pro", amount: 20000, tokens: 200 },
  premium: { name: "Renderme AI Premium", amount: 50000, tokens: 500 },
};

export const PAYMENT_CHANNELS: Record<PaymentMethod, string[]> = {
  card: ["card"],
  mobile_money: ["mobile_money"],
};

export function buildPaystackTransactionBody(args: {
  userEmail: string;
  userId: string;
  planId: string;
  paymentMethod: PaymentMethod;
  callbackBase: string;
  planCode?: string;
}): Record<string, unknown> {
  const plan = PLANS[args.planId];
  if (!plan) throw new Error(`Unknown plan: ${args.planId}`);

  const txBody: Record<string, unknown> = {
    email: args.userEmail,
    amount: plan.amount,
    currency: PLAN_CURRENCY,
    callback_url: `${args.callbackBase}/app?payment=success`,
    metadata: {
      user_id: args.userId,
      plan: args.planId,
      plan_id: args.planId,
      tokens: plan.tokens,
      payment_method: args.paymentMethod,
      billing_type: args.paymentMethod === "card" ? "subscription" : "one_time",
    },
    channels: PAYMENT_CHANNELS[args.paymentMethod],
  };

  if (args.paymentMethod === "card") {
    if (!args.planCode) throw new Error("Card checkout requires a Paystack plan code");
    txBody.plan = args.planCode;
  }

  return txBody;
}

export function resolveTokens(metadata: { tokens?: number } | null | undefined, amount: number): number {
  if (metadata?.tokens && typeof metadata.tokens === "number" && metadata.tokens > 0) {
    return metadata.tokens;
  }

  return Object.values(PLANS).find((plan) => plan.amount === amount)?.tokens || 0;
}

// ---------------------------------------------------------------------------
// Cross-event idempotency
// ---------------------------------------------------------------------------
// A single Paystack `reference` can be observed by up to three independent
// crediting paths: verify-payment (server-side verify after redirect),
// verify-charge (inline charge polling), and paystack-webhook (async event).
// Each path inserts its own audit row in `processed_payments` with a distinct
// `event_type`, but tokens may only be credited ONCE per reference across
// every path. `evaluateIdempotency` is the pure decision used by every path.
//
// Inputs:
//   existingRows  — any rows already present for this reference (any event_type)
//   currentEventType — the event_type this path is about to insert
//   insertErrorCode  — Postgres error code from the audit-row insert (e.g.
//                      "23505" on unique-constraint conflict for the same
//                      (reference, event_type)) — undefined on success
//
// Output:
//   shouldCredit      — true only when no other path has credited yet AND
//                       this path's audit row was inserted cleanly
//   alreadyProcessed  — true when this exact event has already been recorded
//                       (caller should short-circuit with success)
export type IdempotencyDecision = {
  shouldCredit: boolean;
  alreadyProcessed: boolean;
};

export function evaluateIdempotency(args: {
  existingRows: ReadonlyArray<{ event_type: string }> | null | undefined;
  currentEventType: string;
  insertErrorCode?: string | null;
}): IdempotencyDecision {
  const rows = args.existingRows ?? [];
  const sameEventAlreadyRecorded =
    rows.some((r) => r.event_type === args.currentEventType) ||
    args.insertErrorCode === "23505";

  if (sameEventAlreadyRecorded) {
    return { shouldCredit: false, alreadyProcessed: true };
  }

  // A different path already credited this reference — record audit only.
  if (rows.length > 0) {
    return { shouldCredit: false, alreadyProcessed: false };
  }

  return { shouldCredit: true, alreadyProcessed: false };
}

export function buildProcessedPaymentRecord(args: {
  reference: string;
  userId: string;
  eventType: string;
  amount: number;
  currency?: string | null;
}) {
  return {
    reference: args.reference,
    user_id: args.userId,
    event_type: args.eventType,
    amount: args.amount,
    currency: args.currency || "GHS",
  };
}