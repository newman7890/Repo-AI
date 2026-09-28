import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TOKEN_COST = 2;
const MAX_DESCRIPTION_LENGTH = 2000;
const VALID_MODES = ["background", "clothing", "object", "action", "headshot", "faceswap", "custom"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Rate limit: 15 enhancements per minute
    const { data: rateLimitOk } = await supabaseAdmin.rpc("check_rate_limit", {
      p_user_id: userId,
      p_endpoint: "enhance-prompt",
      p_max_requests: 15,
      p_window_seconds: 60,
    });

    if (!rateLimitOk) {
      return new Response(JSON.stringify({ error: "Too many requests. Please wait a moment." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { description, mode = "custom" } = body;

    if (!description || typeof description !== "string" || !description.trim()) {
      return new Response(JSON.stringify({ error: "Description is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (description.length > MAX_DESCRIPTION_LENGTH) {
      return new Response(JSON.stringify({ error: `Description too long (max ${MAX_DESCRIPTION_LENGTH} chars)` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!VALID_MODES.includes(mode)) {
      return new Response(JSON.stringify({ error: "Invalid mode" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const API_KEY = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("LOVABLE_API_KEY");
    if (!API_KEY) {
      return new Response(JSON.stringify({ error: "Service configuration error: API key not set." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isDirectGemini = !!Deno.env.get("GEMINI_API_KEY");
    const aiEndpoint = isDirectGemini
      ? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
      : "https://ai.gateway.lovable.dev/v1/chat/completions";
    const aiModel = isDirectGemini ? "gemini-2.0-flash" : "google/gemini-2.5-flash";

    // Deduct 2 tokens
    const { data: creditResult, error: creditError } = await supabaseAdmin.rpc("check_and_deduct_credits", {
      p_user_id: userId,
      p_token_cost: TOKEN_COST,
    });

    if (creditError) {
      return new Response(JSON.stringify({ error: "Failed to check credits." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!creditResult?.allowed) {
      if (creditResult?.blocked) {
        return new Response(JSON.stringify({ error: "account_blocked", blocked: true }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({
        error: "insufficient_credits",
        message: "You need 2 tokens to enhance a prompt.",
        tokens: creditResult?.tokens || 0,
      }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are an expert prompt engineer for a photorealistic AI image editor (Repo AI).
Your job is to take a user's short or vague edit instruction and rewrite it into a detailed, vivid, photorealistic prompt.

Rules:
- Keep the user's original intent — do NOT change what they want.
- Add specific details: lighting (natural/studio/golden hour), camera (85mm lens, shallow depth of field), mood, textures, colors, environment.
- Always reinforce hyper-realism: natural skin, real pores, professional photography.
- NEVER add NSFW, adult, violent, or inappropriate content.
- Output ONLY the enhanced prompt as plain text. No quotes, no labels, no explanation, no markdown.
- Keep it under 100 words. Focused and concrete.
- The current edit mode is: ${mode} — tailor the enhancement to that mode.`;

    const aiResponse = await fetch(aiEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: aiModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Enhance this edit instruction: "${description.trim()}"` },
        ],
      }),
    });

    if (!aiResponse.ok) {
      // Refund
      try {
        if (creditResult.used === "trial") {
          await supabaseAdmin.rpc("refund_credits", { p_user_id: userId, p_kind: "trial", p_amount: 1 });
        } else if (creditResult.used === "tokens") {
          await supabaseAdmin.rpc("refund_credits", { p_user_id: userId, p_kind: "tokens", p_amount: TOKEN_COST });
        }
      } catch (e) { console.error("Refund failed:", e); }

      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "AI is busy. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText.slice(0, 200));
      return new Response(JSON.stringify({ error: "Failed to enhance prompt." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResponse.json();
    const enhanced = data.choices?.[0]?.message?.content?.trim();

    if (!enhanced) {
      // Refund
      try {
        if (creditResult.used === "trial") {
          await supabaseAdmin.rpc("refund_credits", { p_user_id: userId, p_kind: "trial", p_amount: 1 });
        } else if (creditResult.used === "tokens") {
          await supabaseAdmin.rpc("refund_credits", { p_user_id: userId, p_kind: "tokens", p_amount: TOKEN_COST });
        }
      } catch (e) { console.error("Refund failed:", e); }

      return new Response(JSON.stringify({ error: "No enhanced prompt generated." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Strip surrounding quotes if AI added them
    const cleaned = enhanced.replace(/^["']|["']$/g, "").trim();

    try {
      await supabaseAdmin.from("ai_usage_logs").insert({
        user_id: userId,
        function_name: "enhance-prompt",
        model: "google/gemini-2.5-flash",
        mode,
      });
    } catch (e) { console.error("Log failed:", e); }

    return new Response(JSON.stringify({
      enhancedPrompt: cleaned,
      creditsUsed: creditResult.used,
      remainingTrials: creditResult.remaining_trials,
      remainingTokens: creditResult.tokens,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("enhance-prompt error:", e);
    return new Response(JSON.stringify({ error: "An internal error occurred." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
