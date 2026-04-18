import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify JWT using anon client
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims();
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claims.claims.sub as string;
    const email = (claims.claims.email as string) || "unknown";

    const body = await req.json().catch(() => ({}));
    const deviceInfo = body?.deviceInfo || {};

    // Rate-limit using service role (1 registration notification per user per hour is plenty)
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: allowed, error: rlErr } = await admin.rpc("check_rate_limit", {
      p_user_id: userId,
      p_endpoint: "notify-new-user",
      p_max_requests: 3,
      p_window_seconds: 3600,
    });
    if (rlErr || allowed === false) {
      return new Response(JSON.stringify({ error: "Rate limited" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: insertErr } = await admin.from("admin_notifications").insert({
      user_id: userId,
      type: "registration",
      title: "New User Registered",
      message: `${email} just signed up`,
      metadata: {
        email,
        device_model: deviceInfo.deviceModel || null,
        screen: deviceInfo.screenResolution || null,
        platform: deviceInfo.platform || null,
        user_agent: deviceInfo.userAgent || null,
      },
    });

    if (insertErr) {
      console.error("notify-new-user insert error:", insertErr.message);
      return new Response(JSON.stringify({ error: "Failed to create notification" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("notify-new-user error:", (e as Error).message);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
