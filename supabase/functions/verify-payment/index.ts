import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { alertCheckoutPolicyFailure } from "../checkout-alerts.ts";
import { ALLOWED_CALLBACK_ORIGINS } from "../payment-core.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Authoritative plan amount → tokens map (matches paystack-checkout PLANS)
type PaystackMetadata = {
  user_id?: string;
  tokens?: number;
  plan?: string;
  plan_id?: string;
  billing_type?: string;
  payment_method?: string;
};

const AMOUNT_TO_TOKENS: Record<number, number> = {
  5000: 50,    // starter   - GHS 50
  10000: 100,  // standard  - GHS 100
  20000: 200,  // pro       - GHS 200
  50000: 500,  // premium   - GHS 500
};

function resolveTokens(metadata: PaystackMetadata, amount: number): number {
  if (metadata?.tokens && typeof metadata.tokens === "number" && metadata.tokens > 0) {
    return metadata.tokens;
  }
  return AMOUNT_TO_TOKENS[amount] || 0;
}

async function notifyAdminPayment(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  email: string | null,
  planName: string,
  amount: number,
  currency: string | null,
  tokens: number,
  reference: string,
) {
  const amountMajor = (amount / 100).toFixed(2);

  await supabase.from("admin_notifications").insert({
    user_id: userId,
    type: "payment",
    title: "New Payment Received",
    message: `${email || userId} purchased ${planName} plan (${currency || "GHS"} ${amountMajor}), ${tokens} tokens`,
    metadata: {
      email,
      plan: planName,
      amount,
      currency,
      tokens,
      reference,
    },
  });
}

async function ensureUserCreditsRow(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data: existing } = await supabase
    .from("user_credits")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (existing?.id) return;

  const { error } = await supabase.from("user_credits").insert({
    user_id: userId,
    tokens: 0,
    trial_uses_remaining: 0,
    is_premium: false,
    blocked: false,
  });

  if (error) throw error;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // SECURITY: Reject requests whose Origin (when present) is not in our
  // allowlist. This blocks spoofed origins from triggering payment-success
  // crediting flows even if they hold a valid token.
  const origin = req.headers.get("origin");
  if (origin && !ALLOWED_CALLBACK_ORIGINS.includes(origin)) {
    return new Response(JSON.stringify({ error: "Origin not allowed" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!PAYSTACK_SECRET_KEY) throw new Error("PAYSTACK_SECRET_KEY is not configured");

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

    // Rate limit
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

    // Cross-event idempotency: if ANY row exists for this reference, credit was
    // already applied by another path (webhook or verify-charge). Skip credit.
    const { data: existingPayment } = await adminClient
      .from("processed_payments")
      .select("id")
      .eq("reference", reference)
      .limit(1)
      .maybeSingle();

    if (existingPayment) {
      return new Response(JSON.stringify({ payment_status: "success", already_processed: true }), {
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
      const metadata = (verifyData.data.metadata || {}) as PaystackMetadata;
      const metaUserId = metadata.user_id;
      if (metaUserId !== userId) {
        console.error(`Payment user mismatch: meta=${metaUserId} auth=${userId}`);
        return new Response(JSON.stringify({ payment_status: "failed", message: "User mismatch" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const amount = verifyData.data.amount || 0;
      const tokens = resolveTokens(metadata, amount);
      const planName = metadata.plan_id || metadata.plan || "unknown";
      const currency = verifyData.data.currency || "GHS";

      if (tokens <= 0) {
        console.error(`Unknown plan amount: ${amount}, metadata:`, metadata);
        return new Response(JSON.stringify({ payment_status: "failed", message: "Unknown plan" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const isOneTime = metadata.billing_type === "one_time" || metadata.payment_method === "mobile_money";

      // Record processed payment FIRST (idempotency key) — unique on (reference, event_type)
      const { error: insertError } = await adminClient
        .from("processed_payments")
        .insert({
          reference,
          user_id: userId,
          event_type: "verify-payment",
          amount,
          currency,
        });

      if (insertError) {
        if (insertError.code === "23505") {
          // Race with webhook or concurrent verify — already credited
          return new Response(JSON.stringify({ payment_status: "success", already_processed: true }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        console.error("Error recording payment:", insertError);
        await alertCheckoutPolicyFailure(adminClient, {
          source: "verify-payment",
          stage: "record_processed_payment",
          error: insertError,
          userId,
          reference,
        });
        throw insertError;
      }

      const { data: profile } = await adminClient
        .from("profiles")
        .select("email")
        .eq("user_id", userId)
        .maybeSingle();

      await ensureUserCreditsRow(adminClient, userId);

      // Credit tokens correctly based on plan & billing type
      if (isOneTime) {
        // One-time MoMo: ADD tokens to existing balance, do NOT mark recurring premium
        const { data: existingCredits } = await adminClient
          .from("user_credits")
          .select("tokens")
          .eq("user_id", userId)
          .maybeSingle();

        const newTotal = (existingCredits?.tokens || 0) + tokens;
        const { error: updateErr } = await adminClient
          .from("user_credits")
          .update({ tokens: newTotal, updated_at: new Date().toISOString() })
          .eq("user_id", userId);

        if (updateErr) {
          console.error("Error adding one-time tokens:", updateErr);
          await alertCheckoutPolicyFailure(adminClient, {
            source: "verify-payment",
            stage: "credit_one_time_tokens",
            error: updateErr,
            userId,
            reference,
          });
          throw updateErr;
        }
        console.log(`verify-payment one-time: +${tokens} tokens for ${userId} (total ${newTotal})`);
      } else {
        // Subscription (card): SET tokens to plan amount and mark premium
        const { error: updateErr } = await adminClient
          .from("user_credits")
          .update({
            tokens,
            is_premium: true,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);

        if (updateErr) {
          console.error("Error granting premium:", updateErr);
          await alertCheckoutPolicyFailure(adminClient, {
            source: "verify-payment",
            stage: "grant_subscription_tokens",
            error: updateErr,
            userId,
            reference,
          });
          throw updateErr;
        }
        console.log(`verify-payment subscription: ${tokens} tokens + premium for ${userId}`);
      }

      try {
        await notifyAdminPayment(adminClient, userId, profile?.email || null, planName, amount, currency, tokens, reference);
      } catch (notifyError) {
        console.error("Failed to create admin notification from verify-payment:", notifyError);
      }

      // ===== Referral reward (only on user's FIRST successful payment) =====
      try {
        const { count: priorCount } = await adminClient
          .from("payment_history")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId);

        const isFirstPayment = (priorCount ?? 0) === 0;

        await adminClient.from("payment_history").insert({
          user_id: userId,
          reference,
          amount,
          plan_id: planName,
          is_first_payment: isFirstPayment,
        });

        if (isFirstPayment) {
          // Look up referrer
          const { data: refProfile } = await adminClient
            .from("profiles")
            .select("referred_by, phone_number, flagged_suspicious")
            .eq("user_id", userId)
            .maybeSingle();

          if (refProfile?.referred_by && !refProfile.flagged_suspicious) {
            // Anti-fraud: same phone number on referrer?
            let allow = true;
            if (refProfile.phone_number) {
              const { data: referrerProfile } = await adminClient
                .from("profiles")
                .select("phone_number")
                .eq("user_id", refProfile.referred_by)
                .maybeSingle();
              if (referrerProfile?.phone_number && referrerProfile.phone_number === refProfile.phone_number) {
                allow = false;
                console.log("Blocked referral reward: same phone number");
              }
            }

            if (allow) {
              // Flat 10% reward (in cedis), amount is in pesewas
              const rewardAmount = Math.round(amount / 10) / 100; // amount/1000 cedis
              const { error: refErr } = await adminClient.from("referrals").insert({
                referrer_id: refProfile.referred_by,
                referred_user_id: userId,
                payment_reference: reference,
                plan_id: planName,
                plan_amount: amount,
                reward_amount: rewardAmount,
                status: "pending",
              });

              if (!refErr) {
                // Add to pending wallet balance
                await adminClient.rpc("add_pending_reward" as never, {
                  p_user_id: refProfile.referred_by,
                  p_amount: rewardAmount,
                });
                // Notify referrer
                await adminClient.from("admin_notifications").insert({
                  user_id: refProfile.referred_by,
                  type: "referral_pending",
                  title: "Referral Reward Pending",
                  message: `You earned GHS ${rewardAmount} (pending approval)`,
                  metadata: { reward_amount: rewardAmount },
                });
              } else if (refErr.code !== "23505") {
                console.error("Referral insert error:", refErr);
              }
            }
          }
        }
      } catch (refError) {
        console.error("Referral processing error (non-fatal):", refError);
      }

      return new Response(JSON.stringify({
        payment_status: "success",
        tokens_added: tokens,
        billing_type: isOneTime ? "one_time" : "subscription",
      }), {
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
