import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    const { imageBase64, description, mode = "background", quality = "high", referenceImage, additionalFaces } = await req.json();

    if (!imageBase64 || (!description.trim() && mode !== "faceswap")) {
      return new Response(
        JSON.stringify({ error: "Image and description are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (mode === "faceswap" && !referenceImage) {
      return new Response(
        JSON.stringify({ error: "A reference face image is required for face swap" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const hasReferenceImage = !!referenceImage;
    const prompt = buildPrompt(mode, description, hasReferenceImage);
    const model = getModelForQuality(quality);

    console.log(`Processing with model: ${model}, mode: ${mode}, quality: ${quality}, hasRef: ${hasReferenceImage}`);

    const contentParts: any[] = [
      { type: "text", text: prompt },
      { type: "image_url", image_url: { url: imageBase64 } },
    ];

    if (referenceImage) {
      contentParts.push({ type: "image_url", image_url: { url: referenceImage } });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: contentParts,
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
