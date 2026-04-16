import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
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

    // Rate limit: max 10 verify requests per minute
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: rateLimitOk } = await adminClient.rpc("check_rate_limit", {
      p_user_id: userId,
      p_endpoint: "verify-payment",
      p_max_requests: 10,
      p_window_seconds: 60,
    });

    if (!rateLimitOk) {
      return new Response(JSON.stringify({ error: "Too many requests. Please wait." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { reference } = body;

    // Strict input validation
    if (!reference || typeof reference !== "string" || reference.length > 100 || !/^[a-zA-Z0-9_-]+$/.test(reference)) {
      return new Response(JSON.stringify({ error: "Valid reference is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if already processed (idempotency)
    const { data: existingPayment } = await adminClient
      .from("processed_payments")
      .select("id")
      .eq("reference", reference)
      .maybeSingle();

    if (existingPayment) {
      return new Response(JSON.stringify({ payment_status: "success" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify transaction with Paystack
    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
    });

    const verifyData = await verifyRes.json();

    if (!verifyData.status) {
      return new Response(JSON.stringify({
        payment_status: "failed",
        message: "Verification failed",
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const txStatus = verifyData.data.status;

    if (txStatus === "success") {
      // Verify the user_id in metadata matches the authenticated user
      const metaUserId = verifyData.data.metadata?.user_id;
      if (metaUserId !== userId) {
        console.error(`Payment user mismatch: meta=${metaUserId} auth=${userId}`);
        return new Response(JSON.stringify({ payment_status: "failed", message: "User mismatch" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify amount matches expected plan amount
      const expectedAmount = 16000; // GHS 160 in pesewas
      if (verifyData.data.amount < expectedAmount) {
        console.error(`Payment amount mismatch: expected=${expectedAmount} got=${verifyData.data.amount}`);
        return new Response(JSON.stringify({ payment_status: "failed", message: "Amount mismatch" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Record processed payment (idempotency key)
      const { error: insertError } = await adminClient
        .from("processed_payments")
        .insert({
          reference,
          user_id: userId,
          event_type: "verify-payment",
          amount: verifyData.data.amount,
          currency: verifyData.data.currency,
        });

      // If insert fails due to unique constraint, payment was already processed
      if (insertError) {
        if (insertError.code === "23505") {
          return new Response(JSON.stringify({ payment_status: "success" }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        console.error("Error recording payment:", insertError);
      }

      // Grant premium
      const { error } = await adminClient
        .from("user_credits")
        .update({
          tokens: 100,
          is_premium: true,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (error) {
        console.error("Error granting premium:", error);
        throw error;
      }

      console.log(`Premium granted to ${userId} via payment verification`);
      return new Response(JSON.stringify({ payment_status: "success" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Still pending or failed
    return new Response(JSON.stringify({
      payment_status: txStatus === "abandoned" ? "failed" : txStatus,
      message: txStatus === "pending" ? "Waiting for payment confirmation..." : `Payment ${txStatus}`,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Verify payment error:", error);
    return new Response(JSON.stringify({ error: "An error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
