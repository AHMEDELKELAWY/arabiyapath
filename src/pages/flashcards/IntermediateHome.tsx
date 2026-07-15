import { Layout } from "@/components/layout/Layout";
import { SEOHead } from "@/components/seo/SEOHead";
import { PageNav } from "@/components/learn/PageNav";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { UnitCard, type UnitCardBadge, type UnitCardStatus } from "@/components/units/UnitCard";
import { useAuth } from "@/contexts/AuthContext";

const INTERMEDIATE_LEVEL_ID = "01d4e9e7-b0c5-4599-867c-f4c2bfac542f";

interface UnitRow {
  id: string;
  slug: string;
  title_en: string;
  title_ar: string | null;
  description: string | null;
  is_free: boolean;
  order_index: number;
}

export default function IntermediateHome() {
  const { user } = useAuth();

  const { data: units } = useQuery({
    queryKey: ["fc-units-intermediate"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("flashcard_units")
        .select("id,slug,title_en,title_ar,description,is_free,order_index")
        .eq("published", true)
        .eq("course_level_id", INTERMEDIATE_LEVEL_ID)
        .order("order_index");
      if (error) throw error;
      return (data ?? []) as UnitRow[];
    },
  });

  const accessQuery = useQuery({
    queryKey: ["fc-intermediate-access", user?.id ?? "anon", units?.map((u) => u.id).join(",") ?? ""],
    enabled: !!user && !!units?.length,
    queryFn: async () => {
      const entries = await Promise.all(
        (units ?? []).map(async (u) => {
          const { data } = await (supabase.rpc as any)("fc_user_can_study_unit", {
            _user_id: user!.id,
            _unit_id: u.id,
          });
          return [u.id, !!data] as const;
        })
      );
      return new Map(entries);
    },
  });

  function unlocked(u: UnitRow): boolean {
    if (u.is_free) return true;
    if (!user) return false;
    return !!accessQuery.data?.get(u.id);
  }

  return (
    <Layout>
      <SEOHead
        title="Spoken Arabic — Intermediate | ArabiyaPath"
        description="Intermediate Spoken Arabic units: everyday conversations, listening comprehension, vocabulary, grammar, and tests."
        canonicalPath="/flashcards/level/intermediate"
        noindex
      />
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        <div className="border-b bg-background/80 backdrop-blur-sm">
          <div className="container max-w-4xl py-6 sm:py-8 px-4 sm:px-6">
            <PageNav
              crumbs={[
                { label: "Dashboard", to: "/dashboard" },
                { label: "Spoken Arabic", to: "/flashcards/course/spoken-arabic" },
                { label: "Intermediate" },
              ]}
              backTo="/flashcards/course/spoken-arabic"
              backLabel="Back to Spoken Arabic"
              className="mb-3 sm:mb-4"
            />
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">
              Intermediate
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">
              {units?.length ?? 0} Units
            </p>
          </div>
        </div>

        <div className="container max-w-4xl py-6 sm:py-8 px-4 sm:px-6">
          {!units?.length ? (
            <p className="text-muted-foreground">
              Intermediate units are being prepared. Check back soon.
            </p>
          ) : (
            <div className="grid gap-3 sm:gap-4">
              {units.map((u, idx) => {
                const open = unlocked(u);
                let status: UnitCardStatus;
                let badge: UnitCardBadge;
                if (!open) {
                  status = "locked";
                  badge = "locked";
                } else {
                  status = "not-started";
                  badge = u.is_free ? "free" : null;
                }
                const href = open
                  ? (user ? `/flashcards/intermediate/unit/${u.slug}` : "/start-free")
                  : (user ? "/pricing" : `/signup?redirect=${encodeURIComponent("/pricing")}`);
                return (
                  <UnitCard
                    key={u.id}
                    index={idx + 1}
                    title={u.title_en}
                    description={u.description}
                    href={href}
                    status={status}
                    badge={badge}
                    progress={null}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
