import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Authoritative plan amount → tokens map (matches paystack-checkout PLANS)
const AMOUNT_TO_TOKENS: Record<number, number> = {
  5000: 50,
  10000: 100,
  20000: 200,
  50000: 500,
};

function resolveTokens(metadata: any, amount: number): number {
  if (metadata?.tokens && typeof metadata.tokens === "number" && metadata.tokens > 0) {
    return metadata.tokens;
  }
  return AMOUNT_TO_TOKENS[amount] || 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!PAYSTACK_SECRET_KEY) throw new Error("PAYSTACK_SECRET_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Rate limit
    const { data: rlOk } = await adminClient.rpc("check_rate_limit", {
      p_user_id: userId,
      p_endpoint: "verify-charge",
      p_max_requests: 30,
      p_window_seconds: 60,
    });
    if (!rlOk) {
      return new Response(JSON.stringify({ error: "Too many requests" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { reference } = await req.json();
    if (!reference || typeof reference !== "string" || reference.length > 100 || !/^[a-zA-Z0-9_.-]+$/.test(reference)) {
      return new Response(JSON.stringify({ error: "Missing or invalid reference" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify with Paystack
    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
    });
    const data = await res.json();
    const txStatus = data?.data?.status;
    const gatewayResponse = data?.data?.gateway_response;

    // If still pending/failed/abandoned, just report status — no crediting
    if (txStatus !== "success") {
      return new Response(JSON.stringify({
        status: txStatus, // success | failed | abandoned | pending
        gateway_response: gatewayResponse,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // SUCCESS → credit idempotently (don't depend on webhook)
    const metadata = data.data.metadata || {};
    const metaUserId = metadata.user_id;

    // Owner check — caller must be the buyer
    if (metaUserId && metaUserId !== userId) {
      console.error(`verify-charge user mismatch: meta=${metaUserId} auth=${userId}`);
      return new Response(JSON.stringify({ status: "failed", gateway_response: "User mismatch" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const amount = data.data.amount || 0;
    const tokens = resolveTokens(metadata, amount);
    if (tokens <= 0) {
      console.error(`verify-charge unknown plan: amount=${amount}`, metadata);
      return new Response(JSON.stringify({ status: "failed", gateway_response: "Unknown plan amount" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isOneTime = metadata.billing_type === "one_time" || metadata.payment_method === "mobile_money";

    // Idempotency: insert (reference, "verify-charge"). Unique index prevents double credit.
    const { error: insertError } = await adminClient
      .from("processed_payments")
      .insert({
        reference,
        user_id: userId,
        event_type: "verify-charge",
        amount,
        currency: data.data.currency,
      });

    if (insertError) {
      if (insertError.code === "23505") {
        // Already credited via this path — safe success
        return new Response(JSON.stringify({ status: "success", already_processed: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("verify-charge insert error:", insertError);
      throw insertError;
    }

    // Credit tokens
    if (isOneTime) {
      const { data: existingCredits } = await adminClient
        .from("user_credits")
        .select("tokens")
        .eq("user_id", userId)
        .maybeSingle();
      const newTotal = (existingCredits?.tokens || 0) + tokens;
      const { error: upErr } = await adminClient
        .from("user_credits")
        .update({ tokens: newTotal, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
      if (upErr) throw upErr;
      console.log(`verify-charge one-time: +${tokens} → ${newTotal} for ${userId}`);
    } else {
      const { error: upErr } = await adminClient
        .from("user_credits")
        .update({
          tokens,
          is_premium: true,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
      if (upErr) throw upErr;
      console.log(`verify-charge subscription: ${tokens} + premium for ${userId}`);
    }

    return new Response(JSON.stringify({
      status: "success",
      gateway_response: gatewayResponse,
      tokens_added: tokens,
      billing_type: isOneTime ? "one_time" : "subscription",
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("verify-charge error:", error);
    return new Response(JSON.stringify({ error: "Verification failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
