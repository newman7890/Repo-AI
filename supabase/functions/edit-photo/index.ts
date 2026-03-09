import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const REALISM_SUFFIX = `
CRITICAL REQUIREMENTS FOR PHOTOREALISM:
- Maintain absolutely realistic human skin texture with natural pores, subtle imperfections, and proper subsurface scattering
- Preserve exact skin tone, undertones, and natural color variations across the body
- Ensure realistic lighting on skin with proper highlights, shadows, and ambient occlusion
- Keep natural skin details: veins, freckles, moles, wrinkles exactly as they appear
- Body proportions must remain anatomically correct and consistent
- Hands, fingers, and all body parts must look completely natural and human
- No artificial smoothing, no plastic/wax appearance, no uncanny valley effects
- Match the original photo's lighting, color grading, and atmosphere perfectly
- Output must be indistinguishable from a real photograph`;

function buildPrompt(mode: string, description: string): string {
  switch (mode) {
    case "background":
      return `Change the background of this photo to: ${description}. Keep the person/subject exactly as they are — same pose, same appearance, same clothing, same realistic human skin with all natural details. Only replace the background. Match lighting naturally to the new scene.${REALISM_SUFFIX}`;
    case "clothing":
      return `Change the clothing/outfit of the person in this photo to: ${description}. Keep the person's face, hair, skin texture, body, pose, and background exactly the same. The exposed skin must retain its exact natural appearance with realistic texture and tone. Only change what they are wearing. The new outfit must fit naturally on their real body.${REALISM_SUFFIX}`;
    case "action":
      return `Modify this photo so that the person is: ${description}. Keep the person's face, identity, and natural human skin exactly the same. Adjust their pose, hands, and body naturally to match the action while maintaining completely realistic human anatomy and skin appearance. Keep the background consistent.${REALISM_SUFFIX}`;
    case "custom":
    default:
      return `Edit this photo with the following instruction: ${description}. Keep the person's identity, face, and natural human skin appearance fully intact and photorealistic. Any body parts shown must look completely real with natural skin texture.${REALISM_SUFFIX}`;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, description, mode = "background" } = await req.json();

    if (!imageBase64 || !description) {
      return new Response(
        JSON.stringify({ error: "Image and description are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const prompt = buildPrompt(mode, description);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: imageBase64 } },
            ],
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Too many requests. Please wait a moment and try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Usage limit reached. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to process image" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const generatedImage = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!generatedImage) {
      return new Response(
        JSON.stringify({ error: "No image was generated. Try a different description." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ resultImage: generatedImage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("edit-photo error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
