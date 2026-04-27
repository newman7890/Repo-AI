import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PLANS, PLAN_CURRENCY } from "../payment-core.ts";
import { alertCheckoutPolicyFailure } from "../checkout-alerts.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_PROVIDERS = new Set(["mtn", "vod", "atl"]);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[^\d]/g, "");
  if (digits.length === 10 && digits.startsWith("0")) return `233${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith("233")) return digits;
  if (digits.length === 9) return `233${digits}`;
  return null;
}

function mapChargeStatus(status: string | undefined): "success" | "send_pin" | "send_otp" | "send_phone" | "send_birthday" | "send_address" | "pending" | "failed" {
  switch (status) {
    case "success":
      return "success";
    case "send_pin":
      return "send_pin";
    case "send_otp":
      return "send_otp";
    case "send_phone":
      return "send_phone";
    case "send_birthday":
      return "send_birthday";
    case "send_address":
      return "send_address";
    case "pay_offline":
    case "pending":
    case "open_url":
      return "pending";
    default:
      return "failed";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!PAYSTACK_SECRET_KEY) throw new Error("PAYSTACK_SECRET_KEY missing");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Not authenticated" }, 401);
    }

    const userClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) return jsonResponse({ error: "Invalid token" }, 401);

    const userId = claimsData.claims.sub as string;
    const userEmail = claimsData.claims.email as string;

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: rateLimitOk } = await adminClient.rpc("check_rate_limit", {
      p_user_id: userId,
      p_endpoint: "paystack-charge",
      p_max_requests: 8,
      p_window_seconds: 60,
    });
    if (!rateLimitOk) return jsonResponse({ error: "Too many attempts. Please wait a moment." }, 429);

    const body = await req.json();
    const planId = String(body.plan_id || "standard");
    const provider = String(body.provider || "").toLowerCase();
    const phoneRaw = String(body.phone || "");

    const plan = PLANS[planId];
    if (!plan) return jsonResponse({ error: "Invalid plan." }, 400);
    if (!ALLOWED_PROVIDERS.has(provider)) {
      return jsonResponse({ error: "Choose MTN, Vodafone or AirtelTigo." }, 400);
    }
    const phone = normalizePhone(phoneRaw);
    if (!phone) return jsonResponse({ error: "Enter a valid Ghana mobile number." }, 400);

    const chargeBody = {
      email: userEmail,
      amount: plan.amount,
      currency: PLAN_CURRENCY,
      mobile_money: { phone, provider },
      metadata: {
        user_id: userId,
        plan: planId,
        plan_id: planId,
        tokens: plan.tokens,
        payment_method: "mobile_money",
        billing_type: "one_time",
      },
    };

    const res = await fetch("https://api.paystack.co/charge", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(chargeBody),
    });
    const data = await res.json();

    console.log("paystack-charge response", JSON.stringify({
      ok: data.status,
      message: data.message,
      charge_status: data.data?.status,
      reference: data.data?.reference,
      display_text: data.data?.display_text,
      gateway_response: data.data?.gateway_response,
    }));

    if (!res.ok || !data.status) {
      const friendly = data?.message || "Couldn't start the payment. Please try again.";
      return jsonResponse({ error: friendly }, 400);
    }

    const stage = mapChargeStatus(data.data?.status);
    if (stage === "failed") {
      const reason = data.data?.gateway_response || data.data?.display_text || "Payment was declined.";
      try {
        await alertCheckoutPolicyFailure(adminClient, {
          source: "paystack-charge",
          stage: "charge_failed",
          error: { message: reason, code: data.data?.status },
          userId,
          reference: data.data?.reference || null,
          context: { provider, plan_id: planId },
        });
      } catch (_) { /* swallow */ }
      return jsonResponse({ error: reason, reference: data.data?.reference || null }, 400);
    }

    return jsonResponse({
      stage,
      reference: data.data?.reference,
      display_text: data.data?.display_text || null,
    });
  } catch (error) {
    console.error("paystack-charge fatal", error);
    return jsonResponse({ error: "Payment initialization failed. Please try again." }, 500);
  }
});