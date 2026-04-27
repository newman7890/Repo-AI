import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

export interface PaystackPlan {
  name: string;
  interval: string;
  amount: number;
  plan_code: string;
}

export const PLANS: Record<string, { name: string; amount: number; tokens: number }> = {
  starter:  { name: "Renderme AI Starter",  amount: 5000,  tokens: 50 },
  standard: { name: "Renderme AI Standard", amount: 10000, tokens: 100 },
  pro:      { name: "Renderme AI Pro",      amount: 20000, tokens: 200 },
  premium:  { name: "Renderme AI Premium",  amount: 50000, tokens: 500 },
};

const PLAN_INTERVAL = "monthly";
const PLAN_CURRENCY = "GHS";
export type PaymentMethod = "card" | "mobile_money";

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
    channels: [args.paymentMethod === "card" ? "card" : "mobile_money"],
  };

  if (args.paymentMethod === "card") {
    if (!args.planCode) throw new Error("Card checkout requires a Paystack plan code");
    txBody.plan = args.planCode;
  }

  return txBody;
}

async function getOrCreatePlan(secretKey: string, planId: string): Promise<string> {
  const plan = PLANS[planId];
  if (!plan) throw new Error(`Unknown plan: ${planId}`);

  const listRes = await fetch("https://api.paystack.co/plan", {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  const listData = await listRes.json();

  if (listData.status && listData.data) {
    const existing = listData.data.find(
      (p: PaystackPlan) => p.name === plan.name && p.interval === PLAN_INTERVAL && p.amount === plan.amount
    );
    if (existing) return existing.plan_code;
  }

  const createRes = await fetch("https://api.paystack.co/plan", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: plan.name,
      amount: plan.amount,
      interval: PLAN_INTERVAL,
      currency: PLAN_CURRENCY,
      description: `${plan.tokens} AI tokens per month`,
    }),
  });
  const createData = await createRes.json();

  if (!createData.status) {
    throw new Error(`Failed to create plan: ${createData.message}`);
  }

  return createData.data.plan_code;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!PAYSTACK_SECRET_KEY) throw new Error("PAYSTACK_SECRET_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;
    const userEmail = claimsData.claims.email as string;

    const body = await req.json();
    const planId = body.plan_id || "standard";
    const paymentMethod = body.payment_method === "mobile_money" ? "mobile_money" : "card";

    if (!PLANS[planId]) {
      return new Response(JSON.stringify({ error: "Invalid plan" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: rateLimitOk } = await adminClient.rpc("check_rate_limit", {
      p_user_id: userId,
      p_endpoint: "paystack-checkout",
      p_max_requests: 5,
      p_window_seconds: 60,
    });

    if (!rateLimitOk) {
      return new Response(JSON.stringify({ error: "Too many requests. Please wait." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ------ Hosted Paystack checkout for BOTH card and mobile money ------
    // Paystack handles network selection, phone entry, PIN push, OTP, etc. on their side.
    const callbackBase = req.headers.get("origin") || "https://renderme.lovable.app";
    const callbackUrl = `${callbackBase}/app?payment=success`;

    const planCode = paymentMethod === "card"
      ? await getOrCreatePlan(PAYSTACK_SECRET_KEY, planId)
      : undefined;
    const txBody = buildPaystackTransactionBody({
      userEmail,
      userId,
      planId,
      paymentMethod,
      callbackBase,
      planCode,
    });

    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(txBody),
    });

    const data = await response.json();

    if (!data.status) {
      throw new Error(data.message || "Paystack initialization failed");
    }

    return new Response(JSON.stringify({
      method: paymentMethod,
      authorization_url: data.data.authorization_url,
      reference: data.data.reference,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Paystack checkout error:", error);
    return new Response(JSON.stringify({ error: "Payment initialization failed. Please try again." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
