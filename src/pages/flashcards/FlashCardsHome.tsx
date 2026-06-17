import { Layout } from "@/components/layout/Layout";
import { SEOHead } from "@/components/seo/SEOHead";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, Sparkles, BookOpen } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";


interface UnitRow {
  id: string;
  slug: string;
  title_en: string;
  description: string | null;
  is_free: boolean;
  order_index: number;
  cover_image_url: string | null;
}

interface PackRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  price_cents: number;
  currency: string;
  product_id: string | null;
}

interface PackUnitRow {
  pack_id: string;
  unit_id: string;
}

export default function FlashCardsHome() {
  const { user } = useAuth();

  const { data: units } = useQuery({
    queryKey: ["fc-units-public"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("flashcard_units")
        .select("id,slug,title_en,description,is_free,order_index,cover_image_url")
        .eq("published", true)
        .order("order_index");
      if (error) throw error;
      return (data ?? []) as UnitRow[];
    },
  });

  const { data: packs } = useQuery({
    queryKey: ["fc-packs-public"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("flashcard_packs")
        .select("id,slug,title,description,price_cents,currency,product_id")
        .eq("published", true);
      if (error) throw error;
      return (data ?? []) as PackRow[];
    },
  });

  const { data: packUnits } = useQuery({
    queryKey: ["fc-pack-units-public"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("flashcard_pack_units")
        .select("pack_id,unit_id");
      if (error) throw error;
      return (data ?? []) as PackUnitRow[];
    },
  });

  // Per-pack ownership via server RPC — single source of truth used everywhere.
  const { data: ownedPackIds } = useQuery({
    queryKey: ["fc-owned-packs", user?.id, packs?.map((p) => p.id).join(",") ?? ""],
    enabled: !!user && !!packs?.length,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const results = await Promise.all(
        (packs ?? []).map(async (p) => {
          const { data, error } = await (supabase.rpc as any)("fc_user_has_pack_access", {
            _user_id: user!.id,
            _pack_id: p.id,
          });
          if (error) {
            console.error("[FlashCardsHome] fc_user_has_pack_access", p.slug, error);
            return null;
          }
          return data ? p.id : null;
        })
      );
      return new Set(results.filter(Boolean) as string[]);
    },
  });

  // Compute access per unit: free OR user owns a pack containing this unit.
  function unitUnlocked(unitId: string, isFree: boolean): boolean {
    if (isFree) return true;
    if (!user || !ownedPackIds || !packUnits) return false;
    const packsForUnit = packUnits.filter((pu) => pu.unit_id === unitId).map((pu) => pu.pack_id);
    return packsForUnit.some((pid) => ownedPackIds.has(pid));
  }

  const firstFreeUnit = units?.find((u) => u.is_free) ?? null;
  const firstPack = packs?.[0] ?? null;

  // Diagnostic log requested for verification.
  useEffect(() => {
    if (!units) return;
    console.log("[FlashCardsHome] access state", {
      userId: user?.id ?? null,
      ownedPackIds: ownedPackIds ? Array.from(ownedPackIds) : null,
      units: units.map((u) => ({
        slug: u.slug,
        is_free: u.is_free,
        unlocked: unitUnlocked(u.id, u.is_free),
      })),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [units, ownedPackIds, user?.id, packUnits]);


  function studyHrefForUnit(slug: string): string {
    const target = `/flashcards/study/${slug}?from=home`;
    return user ? target : `/signup?redirect=${encodeURIComponent(target)}`;
  }

  const heroFreeHref = firstFreeUnit
    ? studyHrefForUnit(firstFreeUnit.slug)
    : "/flashcards";

  const heroPackHref =
    firstPack?.product_id
      ? (user
          ? `/checkout?productId=${firstPack.product_id}`
          : `/signup?redirect=${encodeURIComponent(`/checkout?productId=${firstPack.product_id}`)}`)
      : null;

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: (units ?? []).map((u, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `https://arabiyapath.com/flashcards/unit/${u.slug}`,
      name: u.title_en,
    })),
  };

  return (
    <Layout>
      <SEOHead
        title="MSA Arabic Flash Cards — Learn Vocabulary with SRS"
        description="Master Modern Standard Arabic vocabulary with realistic photo flash cards, native audio, and spaced repetition. Unit 1 free."
        canonicalPath="/flashcards"
        jsonLd={itemList}
      />
      <section className="py-16 px-4 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto max-w-5xl text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            MSA Arabic Flash Cards
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Learn fully vowelized Modern Standard Arabic through realistic images, native
            audio, and a proven spaced repetition system.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Button size="lg" asChild>
              <Link to={heroFreeHref}>
                <Sparkles className="w-4 h-4 mr-2" />
                {firstFreeUnit ? `Try ${firstFreeUnit.title_en} Free` : "Start Free"}
              </Link>
            </Button>
            {firstPack && heroPackHref && (
              <Button size="lg" variant="outline" asChild>
                <Link to={heroPackHref}>
                  Get Full Pack — ${(firstPack.price_cents / 100).toFixed(2)}
                </Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      <section className="py-12 px-4">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-2xl font-bold mb-6">Units</h2>
          {!units?.length ? (
            <p className="text-muted-foreground">
              Content is being prepared. Check back soon.
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {units.map((u) => {
                const href = u.is_free
                  ? studyHrefForUnit(u.slug)
                  : checkoutHrefForUnit(u.id) ?? "/flashcards";
                return (
                  <Link
                    key={u.id}
                    to={href}
                    className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
                  >
                    <Card className="h-full hover:shadow-lg hover:border-primary/40 transition-all">
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between text-lg">
                          <span className="group-hover:text-primary transition-colors">
                            {u.title_en}
                          </span>
                          {u.is_free ? (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">
                              Free
                            </span>
                          ) : (
                            <Lock className="w-4 h-4 text-muted-foreground" />
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                          {u.description}
                        </p>
                        <div className="inline-flex items-center text-sm font-medium text-primary">
                          <BookOpen className="w-4 h-4 mr-2" />
                          {u.is_free ? "Start studying" : "Unlock pack"}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
