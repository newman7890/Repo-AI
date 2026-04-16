import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PLAN_NAME = "Renderme AI Premium";
const PLAN_AMOUNT = 10000; // 100 GHS in pesewas
const PLAN_INTERVAL = "monthly";
const PLAN_CURRENCY = "GHS";

async function getOrCreatePlan(secretKey: string): Promise<string> {
  const listRes = await fetch("https://api.paystack.co/plan", {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  const listData = await listRes.json();

  if (listData.status && listData.data) {
    const existing = listData.data.find(
      (p: any) => p.name === PLAN_NAME && p.interval === PLAN_INTERVAL && p.amount === PLAN_AMOUNT
    );
    if (existing) {
      console.log("Found existing plan:", existing.plan_code);
      return existing.plan_code;
    }
  }

  const createRes = await fetch("https://api.paystack.co/plan", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: PLAN_NAME,
      amount: PLAN_AMOUNT,
      interval: PLAN_INTERVAL,
      currency: PLAN_CURRENCY,
      description: "100 AI tokens per month, all edit modes & qualities, priority processing",
    }),
  });
  const createData = await createRes.json();

  if (!createData.status) {
    throw new Error(`Failed to create plan: ${createData.message}`);
  }

  console.log("Created new plan:", createData.data.plan_code);
  return createData.data.plan_code;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!PAYSTACK_SECRET_KEY) {
      throw new Error("PAYSTACK_SECRET_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid user" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body for payment method preference
    let paymentMethod = "card"; // default
    try {
      const body = await req.json();
      if (body.payment_method === "mobile_money") {
        paymentMethod = "mobile_money";
      }
    } catch {
      // No body or invalid JSON, use default
    }

    const planCode = await getOrCreatePlan(PAYSTACK_SECRET_KEY);

    // Only restrict channels if mobile_money is specifically chosen AND active on the account
    // Otherwise let Paystack show all available methods
    const txBody: Record<string, any> = {
      email: user.email,
      amount: PLAN_AMOUNT,
      currency: PLAN_CURRENCY,
      plan: planCode,
      callback_url: `${req.headers.get("origin") || "https://renderme-ai.lovable.app"}/?payment=success`,
      metadata: {
        user_id: user.id,
        plan: "premium",
        payment_method: paymentMethod,
      },
    };

    // Only add channels filter for card (always available); skip for mobile_money to avoid "no active channel" error
    if (paymentMethod === "card") {
      txBody.channels = ["card"];
    }

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
      authorization_url: data.data.authorization_url,
      reference: data.data.reference,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Paystack checkout error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
