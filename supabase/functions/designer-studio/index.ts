import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VALID_CATEGORIES = [
  "flyer", "poster", "instagram_post", "instagram_story", "facebook_cover",
  "twitter_post", "linkedin_banner", "youtube_thumbnail", "google_ad",
  "business_card", "logo",
] as const;
type Category = typeof VALID_CATEGORIES[number];

const VALID_QUALITIES = ["high", "ultra"] as const;
const MAX_BASE64_SIZE = 5_000_000;
const MAX_TEXT = 300;

const ASPECTS: Record<Category, string> = {
  flyer: "portrait A4 (1:1.41)",
  poster: "portrait poster (2:3)",
  instagram_post: "square 1:1",
  instagram_story: "vertical 9:16",
  facebook_cover: "wide 16:6 banner",
  twitter_post: "landscape 16:9",
  linkedin_banner: "wide 4:1 banner",
  youtube_thumbnail: "16:9 thumbnail",
  google_ad: "300x250 medium rectangle (6:5)",
  business_card: "horizontal business card 7:4",
  logo: "square 1:1 centered on clean background",
};

const LABELS: Record<Category, string> = {
  flyer: "promotional flyer",
  poster: "event poster",
  instagram_post: "Instagram post",
  instagram_story: "Instagram story",
  facebook_cover: "Facebook cover banner",
  twitter_post: "Twitter/X post graphic",
  linkedin_banner: "LinkedIn banner",
  youtube_thumbnail: "YouTube thumbnail",
  google_ad: "Google display ad",
  business_card: "business card design",
  logo: "brand logo",
};

interface DesignFields {
  title?: string;
  subtitle?: string;
  bodyText?: string;
  callToAction?: string;
  date?: string;
  location?: string;
  contact?: string;
  brandName?: string;
}

function buildPrompt(category: Category, style: string, fields: DesignFields, hasRef: boolean): string {
  const textLines: string[] = [];
  if (fields.title) textLines.push(`HEADLINE TEXT (must appear large and prominent): "${fields.title}"`);
  if (fields.subtitle) textLines.push(`SUBHEADLINE: "${fields.subtitle}"`);
  if (fields.bodyText) textLines.push(`BODY TEXT: "${fields.bodyText}"`);
  if (fields.date) textLines.push(`DATE: "${fields.date}"`);
  if (fields.location) textLines.push(`LOCATION: "${fields.location}"`);
  if (fields.callToAction) textLines.push(`CALL TO ACTION (prominent button/badge): "${fields.callToAction}"`);
  if (fields.contact) textLines.push(`CONTACT INFO: "${fields.contact}"`);
  if (fields.brandName) textLines.push(`BRAND/LOGO NAME: "${fields.brandName}"`);

  const textBlock = textLines.length
    ? `\n\nTEXT TO INCLUDE (spell EVERY word EXACTLY as written, no typos, no extra words):\n${textLines.join("\n")}`
    : "";

  const refNote = hasRef
    ? "\n\nUse the attached reference image as visual/brand inspiration (color, style, mood)."
    : "";

  return `Design a professional, print-ready ${LABELS[category]} in ${ASPECTS[category]} format.

DESIGN STYLE & DIRECTION:
${style || "Modern, clean, eye-catching, professional graphic design."}
${textBlock}${refNote}

CRITICAL DESIGN REQUIREMENTS:
- Output a finished GRAPHIC DESIGN (not a photograph of a flyer) — flat design surface, edge-to-edge composition, no mockup framing.
- Typography must be CRISP, LEGIBLE, and CORRECTLY SPELLED. Use professional font pairings with clear hierarchy.
- Strong visual hierarchy: headline dominates, supporting text is smaller, CTA stands out.
- Balanced layout with intentional negative space, aligned grid, and proper margins/safe zones.
- Cohesive color palette suited to the brand/topic. High contrast between text and background for readability.
- Include tasteful graphic elements: shapes, gradients, icons, photography, or illustrations as appropriate to the style.
- Print-ready quality, sharp edges, ultra high resolution.
- ${category === "logo" ? "Centered logo on a clean solid background, scalable, iconic, memorable." : "Composition fills the entire canvas in the correct aspect ratio."}

STRICTLY FORBIDDEN:
- NO misspelled words, NO gibberish text, NO duplicated/extra words.
- NO mockup frames, NO hands holding the design, NO 3D scene around it.
- NO low-resolution, blurry, or amateurish output.

The result must look like it was crafted by a senior graphic designer in Adobe Illustrator/Photoshop.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
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

    try {
      const { data: rateLimitOk, error: rateLimitError } = await supabaseAdmin.rpc("check_rate_limit", {
        p_user_id: userId,
        p_endpoint: "designer-studio",
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

    const body = await req.json();
    const {
      category,
      style = "",
      fields = {},
      quality = "high",
      referenceImage,
    } = body as {
      category: Category;
      style?: string;
      fields?: DesignFields;
      quality?: "high" | "ultra";
      referenceImage?: string;
    };

    if (!VALID_CATEGORIES.includes(category)) {
      return new Response(JSON.stringify({ error: "Invalid design category" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!VALID_QUALITIES.includes(quality)) {
      return new Response(JSON.stringify({ error: "Invalid quality" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (typeof style !== "string" || style.length > 1000) {
      return new Response(JSON.stringify({ error: "Style description too long" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    for (const [k, v] of Object.entries(fields || {})) {
      if (v != null && (typeof v !== "string" || v.length > MAX_TEXT)) {
        return new Response(JSON.stringify({ error: `Field "${k}" is invalid or too long` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
    if (referenceImage && (typeof referenceImage !== "string" || referenceImage.length > MAX_BASE64_SIZE)) {
      return new Response(JSON.stringify({ error: "Reference image is too large" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Premium gate
    const { data: creditsRow } = await supabaseAdmin
      .from("user_credits")
      .select("is_premium, blocked, tokens, trial_uses_remaining")
      .eq("user_id", userId)
      .maybeSingle();

    if (creditsRow?.blocked) {
      return new Response(JSON.stringify({ error: "account_blocked", blocked: true }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Token-gated: any user with enough tokens (or trial uses) can access.
    const tokenCost = quality === "ultra" ? 4 : 3;
    const hasTrial = (creditsRow?.trial_uses_remaining ?? 0) > 0;
    const hasTokens = (creditsRow?.tokens ?? 0) >= tokenCost;
    if (!creditsRow?.is_premium && !hasTrial && !hasTokens) {
      return new Response(JSON.stringify({
        error: "insufficient_credits",
        message: `You need at least ${tokenCost} tokens to generate this design. Top up to continue.`,
      }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: creditResult, error: creditError } = await supabaseAdmin.rpc("check_and_deduct_credits", {
      p_user_id: userId,
      p_token_cost: tokenCost,
    });
    if (creditError || !creditResult?.allowed) {
      return new Response(JSON.stringify({
        error: "insufficient_credits",
        message: "You need tokens to generate designs.",
      }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
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

    const model = isDirectGemini
      ? "gemini-2.0-flash"
      : (quality === "ultra" ? "google/gemini-3-pro-image-preview" : "google/gemini-3.1-flash-image-preview");

    const prompt = buildPrompt(category, style, fields, !!referenceImage);
    const contentParts: any[] = [{ type: "text", text: prompt }];
    if (referenceImage) contentParts.push({ type: "image_url", image_url: { url: referenceImage } });

    const refundCredits = async () => {
      try {
        if (creditResult.used === "trial") {
          await supabaseAdmin.rpc("refund_credits", { p_user_id: userId, p_kind: "trial", p_amount: 1 });
        } else if (creditResult.used === "tokens") {
          await supabaseAdmin.rpc("refund_credits", { p_user_id: userId, p_kind: "tokens", p_amount: tokenCost });
        }
      } catch (e) { console.error("refund failed:", e); }
    };

    const response = await fetch(aiEndpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: contentParts }],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      await refundCredits();
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Too many requests. Please wait." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Usage limit reached." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText.slice(0, 200));
      return new Response(JSON.stringify({ error: "Failed to generate design. Try again." }), {
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
      await refundCredits();
      return new Response(JSON.stringify({ error: "No design was generated. Try a different prompt." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    try {
      await supabaseAdmin.from("ai_usage_logs").insert({
        user_id: userId,
        function_name: "designer-studio",
        model,
        mode: category,
        quality,
      });
    } catch (e) { console.error("log failed:", e); }

    return new Response(JSON.stringify({
      resultImage: generatedImage,
      remainingTokens: creditResult.tokens,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("designer-studio error:", e);
    return new Response(JSON.stringify({ error: "Internal error. Please try again." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
