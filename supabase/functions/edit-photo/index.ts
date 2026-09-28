import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VALID_MODES = ["background", "clothing", "object", "action", "headshot", "faceswap", "custom"];
const VALID_QUALITIES = ["fast", "high", "ultra"];
const MAX_BASE64_SIZE = 5_000_000;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_ADDITIONAL_FACES = 3;

function getTokenCost(mode: string, quality: string): number {
  if (mode === "faceswap") return 5;
  switch (quality) {
    case "fast": return 1;
    case "high": return 2;
    case "ultra": return 3;
    default: return 2;
  }
}

const REALISM_REQUIREMENTS = `

CRITICAL PHOTOREALISM REQUIREMENTS:
- Create a highly realistic professional photograph that looks like it was taken with a professional DSLR camera
- Maintain the person's true facial structure, skin texture, skin tone, and identity exactly - DO NOT change their identity
- Ultra-photorealistic natural skin texture with real visible pores, realistic lighting, accurate shadows, natural facial proportions
- Shot on 85mm lens style, shallow depth of field, high dynamic range, professional studio lighting, sharp focus, 8K resolution quality
- Natural skin with visible pores, realistic subsurface scattering, proper highlights and shadows, accurate facial anatomy
- Preserve all natural skin details: veins, freckles, moles, wrinkles, skin imperfections exactly as they appear
- Body proportions must remain anatomically correct and consistent with the original
- Hands, fingers, and all body parts must look completely natural and human

STRICTLY FORBIDDEN - DO NOT CREATE:
- NO cartoon style, NO illustration, NO anime, NO 3D render, NO CGI
- NO doll-like skin, NO plastic texture, NO avatar style, NO artificial smoothing
- NO wax appearance, NO uncanny valley effects, NO facial distortion
- NO painting style, NO digital art look

The output MUST be indistinguishable from a real photograph taken by a professional photographer.`;

function buildPrompt(mode: string, description: string, hasReferenceImage: boolean): string {
  switch (mode) {
    case "background":
      return `Change ONLY the background of this photo to: ${description}. 
Keep the person/subject EXACTLY as they are — same pose, same appearance, same clothing, same realistic human skin with all natural details. 
Only replace the background environment. Match lighting naturally to the new scene while maintaining the photorealistic quality of the person.${REALISM_REQUIREMENTS}`;
    case "clothing":
      return `Change ONLY the clothing/outfit of the person in this photo to: ${description}. 
Keep the person's face, hair, skin texture, body shape, pose, and background EXACTLY the same. 
The exposed skin must retain its exact natural appearance with realistic texture, pores, and tone. 
Only change what they are wearing. The new outfit must fit naturally on their real body with realistic fabric texture and proper shadows.${REALISM_REQUIREMENTS}`;
    case "object":
      return `Object removal/replacement task for this photo: ${description}.
Keep the person's face, identity, and overall composition intact unless specifically asked to change them.
Seamlessly fill removed areas with natural background that matches the scene's perspective, lighting, and texture.
If replacing an object, integrate the new element naturally with correct shadows, reflections, and scale.${REALISM_REQUIREMENTS}`;
    case "action":
      return `Modify this photo so that the person is: ${description}. 
Keep the person's face, identity, and natural human skin EXACTLY the same. 
Adjust their pose, hands, and body naturally to match the action while maintaining completely realistic human anatomy and skin appearance. 
Keep the background consistent. All body parts must look anatomically correct and photorealistic.${REALISM_REQUIREMENTS}`;
    case "headshot":
      return `Transform this photo into a professional corporate headshot: ${description}.
Create a hyper-realistic corporate headshot of this person that looks EXACTLY like a real studio photograph taken by a professional photographer.
Maintain the person's EXACT facial features, skin texture, skin tone, and identity - do not change who they are.
Natural skin texture with visible pores, realistic lighting, soft studio shadows, accurate facial anatomy, no facial distortion.
Professional business attire if not specified, clean background, shallow depth of field, shot on 85mm DSLR lens style.
Ultra-detailed, high-resolution, photorealistic result.${REALISM_REQUIREMENTS}`;
    case "faceswap":
      return `FACE SWAP TASK: Take the face from the second reference image and place it onto the person in the first/main image.
${description ? `Additional instructions: ${description}` : ""}

CRITICAL FACE SWAP REQUIREMENTS:
- Extract the face (facial features, skin tone, facial structure) from the REFERENCE image (second image)
- Place that face onto the person in the MAIN image (first image)
- Keep the MAIN image's body, pose, clothing, hair style, and background EXACTLY the same
- Blend the swapped face seamlessly: match lighting, shadows, skin tone transition at the jawline and hairline
- Maintain natural proportions — the face must fit the head size of the person in the main image
- The result must look like a real, unedited photograph — no visible seams, no artifacts
${REALISM_REQUIREMENTS}`;
    case "custom":
    default: {
      const refNote = hasReferenceImage
        ? " Use the reference image provided as visual guidance for the edit."
        : "";
      return `Edit this photo with the following instruction: ${description}.${refNote}
Keep the person's identity, face, and natural human skin appearance fully intact and photorealistic. 
Any body parts shown must look completely real with natural skin texture, pores, and proper lighting.${REALISM_REQUIREMENTS}`;
    }
  }
}

function getModelForQuality(quality: string): string {
  switch (quality) {
    case "ultra":
      return "google/gemini-3-pro-image-preview";
    case "high":
      return "google/gemini-3-pro-image-preview";
    case "fast":
    default:
      return "google/gemini-2.5-flash-image";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Authentication with getClaims ---
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
    let userId: string | null = null;
    try {
      const { data: userData, error: userError } = await supabaseAuth.auth.getUser(token);
      if (userData?.user?.id && !userError) {
        userId = userData.user.id;
      }
    } catch (_) {}

    if (!userId && typeof (supabaseAuth.auth as any).getClaims === "function") {
      try {
        const { data: claimsData } = await (supabaseAuth.auth as any).getClaims(token);
        if (claimsData?.claims?.sub) {
          userId = claimsData.claims.sub as string;
        }
      } catch (_) {}
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized. Please sign in." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // --- Rate limiting: max 60 edits per minute ---
    try {
      const { data: rateLimitOk, error: rateLimitError } = await supabaseAdmin.rpc("check_rate_limit", {
        p_user_id: userId,
        p_endpoint: "edit-photo",
        p_max_requests: 60,
        p_window_seconds: 60,
      });

      if (!rateLimitError && rateLimitOk === false) {
        return new Response(JSON.stringify({ error: "Too many requests. Please wait a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } catch (rlErr) {
      console.warn("Rate limit check error:", rlErr);
    }

    // --- Parse & Validate Input ---
    const body = await req.json();
    const { imageBase64, description, mode = "background", quality = "high", referenceImage, additionalFaces } = body;

    if (!VALID_MODES.includes(mode)) {
      return new Response(JSON.stringify({ error: "Invalid edit mode" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!VALID_QUALITIES.includes(quality)) {
      return new Response(JSON.stringify({ error: "Invalid quality setting" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!imageBase64 || typeof imageBase64 !== "string") {
      return new Response(JSON.stringify({ error: "Image is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (imageBase64.length > MAX_BASE64_SIZE) {
      return new Response(JSON.stringify({ error: "Image is too large (max ~3.75MB)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (description && typeof description === "string" && description.length > MAX_DESCRIPTION_LENGTH) {
      return new Response(JSON.stringify({ error: `Description too long (max ${MAX_DESCRIPTION_LENGTH} chars)` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!description?.trim() && mode !== "faceswap") {
      return new Response(JSON.stringify({ error: "Description is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (mode === "faceswap" && !referenceImage) {
      return new Response(JSON.stringify({ error: "A reference face image is required for face swap" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (referenceImage && typeof referenceImage === "string" && referenceImage.length > MAX_BASE64_SIZE) {
      return new Response(JSON.stringify({ error: "Reference image is too large" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (additionalFaces && (!Array.isArray(additionalFaces) || additionalFaces.length > MAX_ADDITIONAL_FACES)) {
      return new Response(JSON.stringify({ error: `Max ${MAX_ADDITIONAL_FACES} additional faces allowed` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (additionalFaces) {
      for (const face of additionalFaces) {
        if (typeof face !== "string" || face.length > MAX_BASE64_SIZE) {
          return new Response(JSON.stringify({ error: "Additional face image is too large or invalid" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    const API_KEY = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("LOVABLE_API_KEY");
    if (!API_KEY) {
      console.error("Neither GEMINI_API_KEY nor LOVABLE_API_KEY is configured");
      return new Response(JSON.stringify({ error: "Service configuration error: API key not set." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isDirectGemini = !!Deno.env.get("GEMINI_API_KEY");
    const aiEndpoint = isDirectGemini
      ? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
      : "https://ai.gateway.lovable.dev/v1/chat/completions";

    // --- Check & Deduct Credits ---
    const tokenCost = getTokenCost(mode, quality);
    let creditResult: any = null;

    try {
      const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc("check_and_deduct_credits", {
        p_user_id: userId,
        p_token_cost: tokenCost,
      });
      if (!rpcError && rpcResult) {
        creditResult = rpcResult;
      }
    } catch (e) {
      console.warn("RPC check_and_deduct_credits error:", e);
    }

    if (!creditResult) {
      // Direct table fallback
      const { data: creditsRow } = await supabaseAdmin
        .from("user_credits")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (!creditsRow) {
        // Create initial record
        await supabaseAdmin.from("user_credits").insert({
          user_id: userId,
          tokens: 10,
          trial_uses_remaining: 0,
        });
        creditResult = { allowed: true, used: "tokens", tokens: 10 - tokenCost };
      } else if (creditsRow.blocked) {
        creditResult = { allowed: false, blocked: true, tokens: creditsRow.tokens };
      } else if ((creditsRow.trial_uses_remaining ?? 0) > 0) {
        await supabaseAdmin
          .from("user_credits")
          .update({ trial_uses_remaining: creditsRow.trial_uses_remaining - 1, updated_at: new Date().toISOString() })
          .eq("user_id", userId);
        creditResult = { allowed: true, used: "trial", remaining_trials: creditsRow.trial_uses_remaining - 1, tokens: creditsRow.tokens };
      } else if ((creditsRow.tokens ?? 0) >= tokenCost) {
        await supabaseAdmin
          .from("user_credits")
          .update({ tokens: creditsRow.tokens - tokenCost, updated_at: new Date().toISOString() })
          .eq("user_id", userId);
        creditResult = { allowed: true, used: "tokens", tokens: creditsRow.tokens - tokenCost };
      } else {
        creditResult = { allowed: false, tokens: creditsRow.tokens || 0, is_premium: creditsRow.is_premium };
      }
    }

    if (!creditResult?.allowed) {
      if (creditResult?.blocked) {
        return new Response(JSON.stringify({ 
          error: "account_blocked",
          message: "Your account has been blocked. Please contact support.",
          blocked: true,
        }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ 
        error: "insufficient_credits",
        message: "You need tokens to continue editing. Free tokens and trials are paused for now and will be added back soon.",
        tokens: creditResult?.tokens || 0,
        is_premium: creditResult?.is_premium || false,
      }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const hasReferenceImage = !!referenceImage;
    const prompt = buildPrompt(mode, description || "", hasReferenceImage);
    const model = isDirectGemini ? "gemini-2.0-flash-exp" : getModelForQuality(quality);

    console.log(`Processing: user=${userId.slice(0,8)}… model=${model} mode=${mode} quality=${quality} cost=${tokenCost}`);

    function parseDataUrl(dataUrl: string): { mimeType: string; data: string } {
      const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        return { mimeType: match[1], data: match[2] };
      }
      return { mimeType: "image/jpeg", data: dataUrl };
    }

    let response: Response;
    if (isDirectGemini) {
      const geminiParts: any[] = [{ text: prompt }];
      const mainImg = parseDataUrl(imageBase64);
      geminiParts.push({ inlineData: { mimeType: mainImg.mimeType, data: mainImg.data } });

      if (referenceImage) {
        const refImg = parseDataUrl(referenceImage);
        geminiParts.push({ inlineData: { mimeType: refImg.mimeType, data: refImg.data } });
      }

      if (additionalFaces && Array.isArray(additionalFaces)) {
        for (const face of additionalFaces) {
          const faceImg = parseDataUrl(face);
          geminiParts.push({ inlineData: { mimeType: faceImg.mimeType, data: faceImg.data } });
        }
      }

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${API_KEY}`;
      response = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: geminiParts }],
          generationConfig: {
            responseModalities: ["IMAGE", "TEXT"],
          },
        }),
      });
    } else {
      const contentParts: any[] = [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: imageBase64 } },
      ];

      if (referenceImage) {
        contentParts.push({ type: "image_url", image_url: { url: referenceImage } });
      }

      if (additionalFaces && Array.isArray(additionalFaces)) {
        for (const face of additionalFaces) {
          contentParts.push({ type: "image_url", image_url: { url: face } });
        }
      }

      const requestBody: any = {
        model,
        messages: [{ role: "user", content: contentParts }],
        modalities: ["image", "text"],
      };

      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });
    }

    if (!response.ok) {
      // Refund credits on AI failure
      try {
        if (creditResult.used === "trial") {
          await supabaseAdmin.rpc("refund_credits", { p_user_id: userId, p_kind: "trial", p_amount: 1 });
        } else if (creditResult.used === "tokens") {
          await supabaseAdmin.rpc("refund_credits", { p_user_id: userId, p_kind: "tokens", p_amount: tokenCost });
        }
      } catch (refundErr) {
        console.error("Failed to refund credits:", refundErr);
      }

      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText.slice(0, 300));

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "AI rate limit reached. Please wait a moment and try again." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Usage limit reached. Please add credits to continue." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Failed to process image. Please try again." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    let generatedImage: string | null =
      data.choices?.[0]?.message?.images?.[0]?.image_url?.url ||
      data.choices?.[0]?.message?.image_url?.url ||
      null;

    if (!generatedImage && typeof data.choices?.[0]?.message?.content === "string") {
      const content = data.choices[0].message.content;
      if (content.startsWith("data:image")) {
        generatedImage = content;
      } else {
        const match = content.match(/data:image\/[a-zA-Z]+;base64,[A-Za-z0-9+/=]+/);
        if (match) {
          generatedImage = match[0];
        } else {
          const urlMatch = content.match(/https?:\/\/[^\s'")]+/);
          if (urlMatch) generatedImage = urlMatch[0];
        }
      }
    }

    if (!generatedImage && data.candidates?.[0]?.content?.parts) {
      for (const part of data.candidates[0].content.parts) {
        if (part.inlineData?.data) {
          generatedImage = `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    if (!generatedImage) {
      try {
        if (creditResult.used === "trial") {
          await supabaseAdmin.rpc("refund_credits", { p_user_id: userId, p_kind: "trial", p_amount: 1 });
        } else if (creditResult.used === "tokens") {
          await supabaseAdmin.rpc("refund_credits", { p_user_id: userId, p_kind: "tokens", p_amount: tokenCost });
        }
      } catch (refundErr) {
        console.error("Failed to refund credits:", refundErr);
      }
      return new Response(JSON.stringify({ error: "No image was generated. Try a different description." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log usage (no sensitive data)
    try {
      await supabaseAdmin.from("ai_usage_logs").insert({
        user_id: userId,
        function_name: "edit-photo",
        model,
        mode,
        quality,
      });
    } catch (logErr) {
      console.error("Failed to log usage:", logErr);
    }

    return new Response(JSON.stringify({ 
      resultImage: generatedImage,
      creditsUsed: creditResult.used,
      remainingTrials: creditResult.remaining_trials,
      remainingTokens: creditResult.tokens,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("edit-photo error:", e);
    const msg = e?.message || "An internal error occurred. Please try again.";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
