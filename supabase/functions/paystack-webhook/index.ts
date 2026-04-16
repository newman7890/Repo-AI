import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-paystack-signature",
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!PAYSTACK_SECRET_KEY) {
      throw new Error("PAYSTACK_SECRET_KEY is not configured");
    }

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

    // Idempotency: check if this event was already processed using the transaction reference
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

      // Verify the amount matches expected plan
      const expectedAmount = 16000;
      if (event.data?.amount && event.data.amount < expectedAmount) {
        console.error(`Webhook amount mismatch: expected>=${expectedAmount} got=${event.data.amount}`);
        return new Response("OK", { status: 200, headers: corsHeaders });
      }

      // Record as processed
      if (reference) {
        await supabase.from("processed_payments").insert({
          reference,
          user_id: userId,
          event_type: `webhook:${event.event}`,
          amount: event.data?.amount,
          currency: event.data?.currency,
        }).catch(() => {}); // ignore duplicate
      }

      const { error } = await supabase
        .from("user_credits")
        .update({
          tokens: 100,
          is_premium: true,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (error) {
        console.error("Error updating credits:", error);
        throw error;
      }

      console.log(`Premium activated for user ${userId}`);
    }

    if (event.event === "invoice.payment_succeeded") {
      const metadata = event.data?.metadata || {};
      const userId = metadata.user_id;

      if (userId) {
        if (reference) {
          await supabase.from("processed_payments").insert({
            reference,
            user_id: userId,
            event_type: `webhook:${event.event}`,
            amount: event.data?.amount,
            currency: event.data?.currency,
          }).catch(() => {});
        }

        const { error } = await supabase
          .from("user_credits")
          .update({
            tokens: 100,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);

        if (error) console.error("Error refilling tokens:", error);
        else console.log(`Tokens refilled for user ${userId}`);
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
