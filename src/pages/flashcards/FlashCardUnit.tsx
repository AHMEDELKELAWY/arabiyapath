import { useParams, Link, useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEOHead } from "@/components/seo/SEOHead";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Lock, PlayCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useFlashcardUnitAccess } from "@/lib/flashcardAccess";

export default function FlashCardUnit() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: unit, isLoading } = useQuery({
    queryKey: ["fc-unit", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("flashcard_units")
        .select("id,slug,title_en,title_ar,description,is_free,cover_image_url,seo_title,seo_description")
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: cardCount } = useQuery({
    queryKey: ["fc-unit-card-count", unit?.id],
    enabled: !!unit?.id,
    queryFn: async () => {
      const { count } = await (supabase as any)
        .from("flashcards")
        .select("id", { count: "exact", head: true })
        .eq("unit_id", unit!.id)
        .eq("published", true);
      return count ?? 0;
    },
  });

  const { data: hasAccess } = useFlashcardUnitAccess(unit?.id);

  // Look up a pack that contains this unit (or first published pack as fallback)
  // to power the unified-checkout redirect for locked units.
  const { data: unlockProductId } = useQuery({
    queryKey: ["fc-unit-unlock-product", unit?.id],
    enabled: !!unit?.id,
    queryFn: async () => {
      const { data: pu } = await (supabase as any)
        .from("flashcard_pack_units")
        .select("pack_id")
        .eq("unit_id", unit!.id)
        .limit(1);
      let packId = pu?.[0]?.pack_id ?? null;
      if (!packId) {
        const { data: anyPack } = await (supabase as any)
          .from("flashcard_packs")
          .select("id")
          .eq("published", true)
          .limit(1);
        packId = anyPack?.[0]?.id ?? null;
      }
      if (!packId) return null;
      const { data: pack } = await (supabase as any)
        .from("flashcard_packs")
        .select("product_id")
        .eq("id", packId)
        .maybeSingle();
      return pack?.product_id ?? null;
    },
  });

  if (isLoading) return <Layout><div className="container py-16">Loading…</div></Layout>;
  if (!unit) return <Layout><div className="container py-16">Unit not found.</div></Layout>;

  const canStudy = unit.is_free || hasAccess;
  const handleStudy = () => {
    if (!user) {
      navigate(`/signup?redirect=/flashcards/study/${unit.slug}`);
      return;
    }
    navigate(`/flashcards/study/${unit.slug}`);
  };

  const unlockTarget = unlockProductId ? `/checkout?productId=${unlockProductId}` : "/flashcards";
  const unlockHref = user ? unlockTarget : `/signup?redirect=${encodeURIComponent(unlockTarget)}`;

  return (
    <Layout>
      <SEOHead
        title={unit.seo_title || `${unit.title_en} — Flash Cards`}
        description={unit.seo_description || unit.description || "MSA Arabic flash cards."}
        canonicalPath={`/flashcards/unit/${unit.slug}`}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Course",
          name: unit.title_en,
          description: unit.description,
          provider: { "@type": "Organization", name: "ArabiyaPath" },
          inLanguage: "ar",
        }}
      />
      <section className="container max-w-3xl py-12 px-4">
        <h1 className="text-3xl md:text-4xl font-bold mb-3">{unit.title_en}</h1>
        {unit.title_ar && (
          <p className="text-2xl text-muted-foreground mb-4" dir="rtl">{unit.title_ar}</p>
        )}
        <p className="text-muted-foreground mb-6">{unit.description}</p>

        <Card className="mb-6">
          <CardContent className="p-6 flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="font-medium">{cardCount ?? "—"} cards</p>
              <p className="text-sm text-muted-foreground">
                {unit.is_free ? "Free unit — no purchase required." : "Premium unit."}
              </p>
            </div>
            {canStudy ? (
              <Button size="lg" onClick={handleStudy}>
                <PlayCircle className="w-4 h-4 mr-2" /> Start Studying
              </Button>
            ) : (
              <Button size="lg" asChild>
                <Link to={unlockHref}>
                  <Lock className="w-4 h-4 mr-2" /> Unlock Full Pack
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </section>
    </Layout>
  );
}
