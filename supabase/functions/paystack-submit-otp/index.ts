import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Not authenticated" }, 401);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return jsonResponse({ error: "Invalid token" }, 401);
    }

    const userId = claimsData.claims.sub as string;

    // Rate limit: 5 OTP attempts per minute per user (defense-in-depth against brute force)
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: rateLimitOk } = await adminClient.rpc("check_rate_limit", {
      p_user_id: userId,
      p_endpoint: "paystack-submit-otp",
      p_max_requests: 5,
      p_window_seconds: 60,
    });
    if (!rateLimitOk) {
      return jsonResponse({ error: "Too many attempts. Please wait a moment." }, 429);
    }

    const { otp, reference } = await req.json();

    // Server-side input validation (consistent with other payment edge functions)
    const otpStr = String(otp ?? "").trim();
    if (!/^\d{4,8}$/.test(otpStr)) {
      return jsonResponse({ error: "Invalid OTP format." }, 400);
    }

    if (
      !reference ||
      typeof reference !== "string" ||
      reference.length > 100 ||
      !/^[a-zA-Z0-9_.-]+$/.test(reference)
    ) {
      return jsonResponse({ error: "Invalid reference." }, 400);
    }

    const res = await fetch("https://api.paystack.co/charge/submit_otp", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ otp: otpStr, reference }),
    });
    const data = await res.json();

    console.log("Paystack submit_otp response:", JSON.stringify({
      http_status: res.status,
      ok: data.status,
      message: data.message,
      charge_status: data.data?.status,
      reference: data.data?.reference,
    }));

    if (!res.ok || !data.status) {
      return jsonResponse({
        error: data.message || "Invalid OTP. Please try again.",
      }, 400);
    }

    return jsonResponse({
      status: data.data?.status,
      reference: data.data?.reference,
      display_text: data.data?.display_text,
      message: data.message,
    });
  } catch (error) {
    console.error("submit_otp error:", error);
    return jsonResponse({ error: "OTP submission failed. Please try again." }, 500);
  }
});
