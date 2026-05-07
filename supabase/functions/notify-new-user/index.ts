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

    // Verify JWT by passing the token explicitly to getClaims
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const userClient = createClient(supabaseUrl, anonKey);
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) {
      console.error("notify-new-user auth failed:", claimsErr?.message);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claims.claims.sub as string;
    const email = (claims.claims.email as string) || "unknown";

    const body = await req.json().catch(() => ({}));
    const rawDeviceInfo = body?.deviceInfo || {};
    const cap = (s: unknown, max: number) =>
      typeof s === "string" && s.length > 0 ? s.slice(0, max) : null;
    const deviceInfo = {
      deviceModel: cap(rawDeviceInfo.deviceModel, 128),
      screenResolution: cap(rawDeviceInfo.screenResolution, 32),
      platform: cap(rawDeviceInfo.platform, 64),
      userAgent: cap(rawDeviceInfo.userAgent, 512),
      browser: cap(rawDeviceInfo.browser, 64),
    };

    // Capture client IP from forwarding headers
    const ipHeader =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-real-ip") ||
      "";
    const clientIp = ipHeader.split(",")[0]?.trim() || null;

    const admin = createClient(supabaseUrl, serviceKey);

    // Always update profile with latest IP / browser / last_seen, even if registration was already notified
    await admin
      .from("profiles")
      .update({
        ip_address: clientIp,
        browser: deviceInfo.browser || null,
        last_seen_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    // H2 fix: server-side "first sign-in" check using service role.
    // RLS prevents non-admin clients from reading admin_notifications, so the
    // existence check must happen here, not in the browser.
    const { data: existing, error: existingErr } = await admin
      .from("admin_notifications")
      .select("id")
      .eq("user_id", userId)
      .eq("type", "registration")
      .limit(1)
      .maybeSingle();

    if (existingErr) {
      console.error("notify-new-user existence check failed:", existingErr.message);
    }

    if (existing) {
      // Already notified for this user — no-op, no rate-limit row burned
      return new Response(JSON.stringify({ ok: true, skipped: "already_notified" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Light rate limit (defense in depth — prevent abuse if this endpoint gets hit hard)
    const { data: allowed } = await admin.rpc("check_rate_limit", {
      p_user_id: userId,
      p_endpoint: "notify-new-user",
      p_max_requests: 3,
      p_window_seconds: 3600,
    });
    if (allowed === false) {
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
        browser: deviceInfo.browser || null,
        ip_address: clientIp,
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
