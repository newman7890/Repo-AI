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

    const body = await req.json();
    const { phone, provider } = body;

    if (!phone || !provider) {
      return new Response(JSON.stringify({ error: "Phone number and provider are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate phone format (Ghana numbers)
    const cleanPhone = phone.replace(/\s+/g, "").replace(/^0/, "+233");
    const phoneRegex = /^\+233\d{9}$/;
    if (!phoneRegex.test(cleanPhone)) {
      return new Response(JSON.stringify({ error: "Enter a valid Ghana phone number (e.g. 024XXXXXXX)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validProviders = ["mtn", "vod", "tgo"];
    if (!validProviders.includes(provider)) {
      return new Response(JSON.stringify({ error: "Invalid mobile money provider" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use Paystack Charge API to send USSD push
    const chargePayload = {
      email: user.email,
      amount: 10000, // GHS 100 in pesewas
      currency: "GHS",
      mobile_money: {
        phone: cleanPhone,
        provider: provider,
      },
      metadata: {
        user_id: user.id,
        plan: "premium",
        payment_method: "mobile_money",
      },
    };

    const chargeRes = await fetch("https://api.paystack.co/charge", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(chargePayload),
    });

    const chargeData = await chargeRes.json();
    console.log("Paystack charge response:", JSON.stringify(chargeData));

    if (!chargeData.status) {
      throw new Error(chargeData.message || "Failed to initiate mobile money charge");
    }

    // Return reference for polling
    return new Response(JSON.stringify({
      status: chargeData.data.status,
      reference: chargeData.data.reference,
      display_text: chargeData.data.display_text || "A prompt has been sent to your phone. Enter your PIN to complete payment.",
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("MoMo charge error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
