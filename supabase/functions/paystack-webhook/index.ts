import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-paystack-signature",
};

// Map plan amounts (pesewas) to token counts as fallback
const AMOUNT_TO_TOKENS: Record<number, number> = {
  5000: 50,
  10000: 100,
  20000: 200,
  50000: 500,
};

async function verifySignature(body: string, signature: string, secretKey: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secretKey),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["verify"]
  );
  const sigBytes = new Uint8Array(
    signature.match(/.{1,2}/g)!.map((h) => parseInt(h, 16))
  );
  return crypto.subtle.verify(
    "HMAC",
    key,
    sigBytes,
    new TextEncoder().encode(body)
  );
}

function resolveTokens(metadata: any, amount: number): number {
  // Prefer metadata.tokens (set during checkout)
  if (metadata?.tokens && typeof metadata.tokens === "number" && metadata.tokens > 0) {
    return metadata.tokens;
  }
  // Fallback to amount mapping
  return AMOUNT_TO_TOKENS[amount] || 100;
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

  try {
    const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!PAYSTACK_SECRET_KEY) throw new Error("PAYSTACK_SECRET_KEY is not configured");

    const body = await req.text();
    const signature = req.headers.get("x-paystack-signature") || "";

    if (!signature) {
      console.error("Missing Paystack signature header");
      return new Response("Missing signature", { status: 400, headers: corsHeaders });
    }

    const isValid = await verifySignature(body, signature, PAYSTACK_SECRET_KEY);
    if (!isValid) {
      console.error("Invalid Paystack signature");
      return new Response("Invalid signature", { status: 400, headers: corsHeaders });
    }

    const event = JSON.parse(body);
    console.log("Paystack webhook event:", event.event);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const reference = event.data?.reference;
    if (reference) {
      const { data: existing } = await supabase
        .from("processed_payments")
        .select("id")
        .eq("reference", reference)
        .eq("event_type", `webhook:${event.event}`)
        .maybeSingle();

      if (existing) {
        console.log(`Webhook already processed: ${reference} ${event.event}`);
        return new Response("OK", { status: 200, headers: corsHeaders });
      }
    }

    if (event.event === "charge.success" || event.event === "subscription.create") {
      const metadata = event.data?.metadata || {};
      const userId = metadata.user_id;

      if (!userId) {
        console.error("No user_id in metadata");
        return new Response("OK", { status: 200, headers: corsHeaders });
      }

      await ensureUserCreditsRow(supabase, userId);

      const amount = event.data?.amount || 0;
      const tokens = resolveTokens(metadata, amount);
      const isOneTime = metadata.billing_type === "one_time" || metadata.payment_method === "mobile_money";

      if (reference) {
        await supabase.from("processed_payments").insert({
          reference,
          user_id: userId,
          event_type: `webhook:${event.event}`,
          amount,
          currency: event.data?.currency,
        }).catch(() => {});
      }

      if (isOneTime) {
        // One-time MoMo: ADD tokens to existing balance, do NOT mark recurring premium
        const { data: existing } = await supabase
          .from("user_credits")
          .select("tokens")
          .eq("user_id", userId)
          .maybeSingle();

        const newTotal = (existing?.tokens || 0) + tokens;
        const { error } = await supabase
          .from("user_credits")
          .update({ tokens: newTotal, updated_at: new Date().toISOString() })
          .eq("user_id", userId);

        if (error) {
          console.error("Error adding one-time tokens:", error);
          throw error;
        }
        console.log(`One-time MoMo: added ${tokens} tokens to user ${userId} (total ${newTotal})`);
      } else {
        // Subscription (card): set tokens and mark premium
        const { error } = await supabase
          .from("user_credits")
          .update({
            tokens,
            is_premium: true,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);

        if (error) {
          console.error("Error updating credits:", error);
          throw error;
        }
      }

      // Notify admin about payment
      const planName = metadata.plan_id || "unknown";
      const amountCedis = (amount / 100).toFixed(2);
      const currency = event.data?.currency || "GHS";

      // Get user email from profiles
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("user_id", userId)
        .maybeSingle();

      const userEmail = profile?.email || userId;

      await supabase.from("admin_notifications").insert({
        user_id: userId,
        type: "payment",
        title: "New Payment Received",
        message: `${userEmail} purchased ${planName} plan (${currency} ${amountCedis}) — ${tokens} tokens`,
        metadata: {
          email: userEmail,
          plan: planName,
          amount,
          currency,
          tokens,
          reference,
        },
      }).catch((e: any) => console.error("Failed to insert admin notification:", e));

      console.log(`Premium activated for user ${userId} with ${tokens} tokens`);
    }

    if (event.event === "invoice.payment_succeeded") {
      const metadata = event.data?.metadata || {};
      const userId = metadata.user_id;

      if (userId) {
        const amount = event.data?.amount || 0;
        const tokens = resolveTokens(metadata, amount);

        if (reference) {
          await supabase.from("processed_payments").insert({
            reference,
            user_id: userId,
            event_type: `webhook:${event.event}`,
            amount,
            currency: event.data?.currency,
          }).catch(() => {});
        }

        const { error } = await supabase
          .from("user_credits")
          .update({
            tokens,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);

        if (error) console.error("Error refilling tokens:", error);
        else console.log(`Tokens refilled for user ${userId}: ${tokens}`);
      }
    }

    if (event.event === "invoice.payment_failed" || event.event === "subscription.disable") {
      const metadata = event.data?.metadata || {};
      const userId = metadata.user_id;

      if (userId) {
        const { error } = await supabase
          .from("user_credits")
          .update({
            is_premium: false,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);

        if (error) console.error("Error downgrading user:", error);
        else console.log(`Premium disabled for user ${userId}`);
      }
    }

    return new Response("OK", { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
