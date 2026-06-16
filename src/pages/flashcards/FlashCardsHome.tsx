import { Layout } from "@/components/layout/Layout";
import { SEOHead } from "@/components/seo/SEOHead";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, Sparkles, BookOpen } from "lucide-react";

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
}

export default function FlashCardsHome() {
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
        .select("id,slug,title,description,price_cents,currency")
        .eq("published", true);
      if (error) throw error;
      return (data ?? []) as PackRow[];
    },
  });

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
              <Link to="/flashcards/unit/unit-1">
                <Sparkles className="w-4 h-4 mr-2" /> Try Unit 1 Free
              </Link>
            </Button>
            {packs?.[0] && (
              <Button size="lg" variant="outline" asChild>
                <Link to={`/flashcards/pack/${packs[0].slug}`}>
                  Get Full Pack — ${(packs[0].price_cents / 100).toFixed(2)}
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
              {units.map((u) => (
                <Card key={u.id} className="hover:shadow-lg transition">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between text-lg">
                      <span>{u.title_en}</span>
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
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/flashcards/unit/${u.slug}`}>
                        <BookOpen className="w-4 h-4 mr-2" /> Open Unit
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
