export type PaymentMethod = "card" | "mobile_money";

export const PLAN_CURRENCY = "GHS";

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