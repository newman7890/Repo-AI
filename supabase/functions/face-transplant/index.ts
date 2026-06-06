import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MAX_BASE64_SIZE = 5_000_000;
const MAX_NOTES = 500;

const REALISM = `
CRITICAL PHOTOREALISM REQUIREMENTS:
- Result MUST look like a real unedited photograph taken with a professional DSLR (85mm lens, shallow depth of field).
- Preserve natural skin texture, real visible pores, freckles, moles, subsurface scattering and realistic lighting.
- No cartoon, no CGI, no plastic/wax/doll skin, no anime, no painting, no uncanny valley.
- Anatomy must be correct; no distortion of facial features or body proportions.`;

function buildTransplantPrompt(notes: string): string {
  return `FACE TRANSPLANT TASK:
You are given TWO images.
  - IMAGE 1 (SOURCE FACE): contains the donor face that must be extracted.
  - IMAGE 2 (TARGET BODY): contains the target person/body that will receive the donor face.

INSTRUCTIONS:
1. Automatically detect the primary face in IMAGE 1 (the source face) — its exact facial structure, features, skin tone, eyes, nose, mouth, eyebrows and identity.
2. Automatically detect the primary face in IMAGE 2 (the target body) and REPLACE it entirely with the donor face from IMAGE 1.
3. Re-align and re-scale the donor face so it matches the head pose, head size, gaze direction and perspective of IMAGE 2.
4. Match the donor face's lighting, color temperature, shadows and skin tone blending at the jawline, ears, neck and hairline so the seam is INVISIBLE.
5. Keep IMAGE 2's body, pose, clothing, hair (unless hair is part of the face crop), background and composition EXACTLY the same.
6. The donor IDENTITY must be preserved — the output person must clearly be recognizable as the person from IMAGE 1, on the body from IMAGE 2.
${notes ? `\nADDITIONAL NOTES: ${notes}` : ""}
${REALISM}

Return the final composited photograph only.`;
}

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
      Deno.env.get("SUPABASE_ANON_KEY")!,
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
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // --- Admin gate ---
    const { data: isAdmin, error: roleErr } = await supabaseAdmin.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (roleErr || !isAdmin) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Rate limit ---
    const { data: ok } = await supabaseAdmin.rpc("check_rate_limit", {
      p_user_id: userId,
      p_endpoint: "face-transplant",
      p_max_requests: 15,
      p_window_seconds: 60,
    });
    if (!ok) {
      return new Response(JSON.stringify({ error: "Too many requests. Please wait a moment." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { sourceImage, targetImage, notes } = body;

    if (!sourceImage || typeof sourceImage !== "string" || !sourceImage.startsWith("data:image")) {
      return new Response(JSON.stringify({ error: "Source face image is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!targetImage || typeof targetImage !== "string" || !targetImage.startsWith("data:image")) {
      return new Response(JSON.stringify({ error: "Target body image is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (sourceImage.length > MAX_BASE64_SIZE || targetImage.length > MAX_BASE64_SIZE) {
      return new Response(JSON.stringify({ error: "Image is too large (max ~3.75MB each)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (notes && (typeof notes !== "string" || notes.length > MAX_NOTES)) {
      return new Response(JSON.stringify({ error: `Notes too long (max ${MAX_NOTES} chars)` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "Service configuration error." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = buildTransplantPrompt((notes || "").trim());

    // Try a tiered list of image models; some prompts/images are rejected by one
    // model but accepted by another. First successful image wins.
    const candidateModels = [
      "google/gemini-3-pro-image-preview",
      "google/gemini-3.1-flash-image-preview",
      "google/gemini-2.5-flash-image",
    ];

    let generatedImage: string | null = null;
    let usedModel = candidateModels[0];
    let lastStatus = 0;
    let lastErr = "";

    for (const model of candidateModels) {
      usedModel = model;
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [{
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: sourceImage } },
              { type: "image_url", image_url: { url: targetImage } },
            ],
          }],
          modalities: ["image", "text"],
        }),
      });

      if (!response.ok) {
        lastStatus = response.status;
        lastErr = (await response.text().catch(() => "")).slice(0, 300);
        console.error(`AI gateway error (${model}):`, response.status, lastErr);
        // 402/429 are terminal — bail immediately.
        if (response.status === 402 || response.status === 429) break;
        continue;
      }

      const data = await response.json().catch(() => null) as any;
      // Try several known shapes for the returned image.
      const img =
        data?.choices?.[0]?.message?.images?.[0]?.image_url?.url ??
        data?.choices?.[0]?.message?.images?.[0]?.url ??
        (Array.isArray(data?.choices?.[0]?.message?.content)
          ? data.choices[0].message.content.find((c: any) => c?.type === "image_url")?.image_url?.url
          : null);

      if (img) {
        generatedImage = img;
        break;
      }
      console.warn(`Model ${model} returned no image. Trying next.`);
    }

    if (!generatedImage) {
      if (lastStatus === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Cloud workspace.", fallback: true }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (lastStatus === 429) {
        return new Response(JSON.stringify({ error: "AI service is busy. Please try again shortly.", fallback: true }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({
        error: "No image was generated. The AI may have rejected the inputs (faces not detected, content policy, or unsupported image). Try clearer, front-facing photos.",
        fallback: true,
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const model = usedModel;

    try {
      await supabaseAdmin.from("ai_usage_logs").insert({
        user_id: userId,
        function_name: "face-transplant",
        model,
        mode: "transplant",
        quality: "ultra",
      });
    } catch (_) { /* non-fatal */ }

    return new Response(JSON.stringify({ resultImage: generatedImage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("face-transplant error:", e);
    return new Response(JSON.stringify({ error: "Internal error. Please try again." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
