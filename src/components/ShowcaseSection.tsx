import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ShowcaseSlider, { type ShowcaseExample } from "./ShowcaseSlider";

const ShowcaseSection = () => {
  const [examples, setExamples] = useState<ShowcaseExample[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("showcase_examples")
        .select("id, before_image, after_image, before_alt, after_alt, prompt, generation_seconds")
        .eq("published", true)
        .order("sort_order", { ascending: true })
        .limit(6);
      if (cancelled) return;
      if (!error && data) setExamples(data as ShowcaseExample[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || examples.length === 0) return null;

  // JSON-LD structured data: each example as ImageObject + ItemList
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Renderme AI before and after photo edit examples",
    itemListElement: examples.map((ex, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      item: {
        "@type": "ImageObject",
        contentUrl: ex.after_image,
        thumbnailUrl: ex.after_image,
        caption: ex.after_alt,
        description: `AI photo edit. Prompt: ${ex.prompt}. Generated in ${ex.generation_seconds} seconds.`,
        creator: { "@type": "Organization", name: "Renderme AI", url: "https://renderme.site" },
        copyrightNotice: "© Renderme AI",
        creditText: "Renderme AI",
        license: "https://renderme.site/terms",
        acquireLicensePage: "https://renderme.site/terms",
      },
    })),
  };

  return (
    <section className="px-4 md:px-8 py-16 md:py-24 border-t border-border/40">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026') }}
      />
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10 md:mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs md:text-sm mb-4">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-primary-glow font-medium">Real results</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">From plain photo to scene-stealer</h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
            Drag any slider to reveal the transformation. Hover to see the exact prompt and how long it took.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 items-start">
          {examples.map((ex) => (
            <ShowcaseSlider key={ex.id} example={ex} />
          ))}
        </div>

        {examples.length === 1 && (
          <p className="text-center text-xs md:text-sm text-muted-foreground mt-8 italic">
            More examples coming soon. Every image is a real edit, never a stock photo.
          </p>
        )}
      </div>
    </section>
  );
};

export default ShowcaseSection;
