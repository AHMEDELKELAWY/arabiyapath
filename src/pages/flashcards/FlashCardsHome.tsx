import { Layout } from "@/components/layout/Layout";
import { SEOHead } from "@/components/seo/SEOHead";
import { PageNav } from "@/components/learn/PageNav";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Trophy } from "lucide-react";
import { UnitCard, type UnitCardBadge, type UnitCardStatus } from "@/components/units/UnitCard";
import { useAuth } from "@/contexts/AuthContext";
import { useFlashcardsResumeSlug, useFlashcardsDashboard } from "@/hooks/useFlashcardsDashboard";
import { useEffect, useMemo } from "react";
import {
  loadSpokenArabicResume,
  fetchSpokenArabicResume,
  buildUnitResumeHref,
  type SpokenArabicTab,
} from "@/lib/spokenArabicResume";

const TAB_LABEL: Record<SpokenArabicTab, string> = {
  learn: "Learn",
  listening: "Listening",
  speaking: "Speaking",
  grammar: "Grammar",
  test: "Test Yourself",
};

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
  const { data: resumeSlug } = useFlashcardsResumeSlug();
  const { data: fcSummary } = useFlashcardsDashboard();

  // Beginner level (Spoken Arabic → Beginner). Filter units so newer levels
  // (Intermediate, Advanced) don't leak into this page.
  const BEGINNER_LEVEL_ID = "9ff5712d-1746-4bf5-a1bc-03a92bead252";

  const unitsQuery = useQuery({
    queryKey: ["fc-units-public", "beginner"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("flashcard_units")
        .select("id,slug,title_en,description,is_free,order_index,cover_image_url,course_level_id")
        .eq("published", true)
        .eq("course_level_id", BEGINNER_LEVEL_ID)
        .order("order_index");
      if (error) throw error;
      return (data ?? []) as UnitRow[];
    },
    staleTime: 0,
    refetchOnMount: "always",
  });
  const units = unitsQuery.data;

  const packsQuery = useQuery({
    queryKey: ["fc-packs-public"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("flashcard_packs")
        .select("id,slug,title,description,price_cents,currency,product_id")
        .eq("published", true);
      if (error) throw error;
      return (data ?? []) as PackRow[];
    },
    staleTime: 0,
    refetchOnMount: "always",
  });
  const packs = packsQuery.data;

  const packUnitsQuery = useQuery({
    queryKey: ["fc-pack-units-public"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("flashcard_pack_units")
        .select("pack_id,unit_id");
      if (error) throw error;
      return (data ?? []) as PackUnitRow[];
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
  const packUnits = packUnitsQuery.data;

  const ownedPacksQuery = useQuery({
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
  const ownedPackIds = ownedPacksQuery.data;

  const unitAccessQuery = useQuery({
    queryKey: ["fc-home-unit-access", user?.id ?? "anon", units?.map((u) => u.id).join(",") ?? ""],
    enabled: !!user && !!units?.length,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const entries = await Promise.all(
        (units ?? []).map(async (u) => {
          const { data, error } = await (supabase.rpc as any)("fc_user_can_study_unit", {
            _user_id: user!.id,
            _unit_id: u.id,
          });
          if (error) {
            console.error("[FlashCardsHome] fc_user_can_study_unit", u.slug, error);
            return [u.id, false] as const;
          }
          return [u.id, !!data] as const;
        })
      );
      return new Map(entries);
    },
  });

  function unitUnlocked(unitId: string, isFree: boolean): boolean {
    if (isFree) return true;
    if (!user) return false;
    const rpcAccess = unitAccessQuery.data?.get(unitId);
    if (typeof rpcAccess === "boolean") return rpcAccess;
    if (!ownedPackIds || !packUnits) return false;
    const packsForUnit = packUnits.filter((pu) => pu.unit_id === unitId).map((pu) => pu.pack_id);
    if (packsForUnit.some((pid) => ownedPackIds.has(pid))) return true;
    return ownedPackIds.size > 0 && packUnits.length === 0;
  }

  function unitEntitlementLoading(unitId: string, isFree: boolean): boolean {
    if (!user || isFree) return false;
    return !unitAccessQuery.data?.has(unitId) || unitAccessQuery.isFetching || ownedPacksQuery.isLoading;
  }

  function lessonHrefForUnit(slug: string): string {
    const target = `/flashcards/unit/${slug}?from=home`;
    return user ? target : "/start-free";
  }

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

  // Resume Learning — DB is source of truth; localStorage cache for instant hydration.
  const dbPositionQuery = useQuery({
    queryKey: ["fc-resume-db", user?.id],
    enabled: !!user,
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: () => fetchSpokenArabicResume(user!.id),
  });

  const resumeTarget = useMemo(() => {
    if (!user || !units?.length) return null;
    const summaryUnits = fcSummary?.units ?? [];
    const bySlug = new Map(summaryUnits.map((u) => [u.slug, u]));
    const unitBySlug = new Map(units.map((u) => [u.slug, u]));

    const isUnitComplete = (slug: string) => {
      const s = bySlug.get(slug);
      return !!s && s.total > 0 && (s.reviewed ?? 0) >= s.total;
    };

    const makeTarget = (slug: string, tab?: SpokenArabicTab) => {
      const u = unitBySlug.get(slug);
      return {
        href: buildUnitResumeHref(slug, tab),
        done: false as const,
        unitTitle: u?.title_en ?? slug,
        tabLabel: tab ? TAB_LABEL[tab] : "Learn",
      };
    };

    const saved = dbPositionQuery.data ?? loadSpokenArabicResume();
    if (saved) {
      const exists = unitBySlug.has(saved.unitSlug);
      if (exists && !isUnitComplete(saved.unitSlug)) {
        return makeTarget(saved.unitSlug, saved.tab);
      }
    }

    const ordered = [...units].sort((a, b) => a.order_index - b.order_index);
    const nextIncomplete = ordered.find((u) => !isUnitComplete(u.slug));
    if (nextIncomplete) return makeTarget(nextIncomplete.slug);

    if (resumeSlug && unitBySlug.has(resumeSlug)) return makeTarget(resumeSlug);

    const knownCount = summaryUnits.filter((u) => u.total > 0).length;
    if (knownCount > 0 && ordered.every((u) => isUnitComplete(u.slug))) {
      return { href: null, done: true as const, unitTitle: "", tabLabel: "" };
    }

    return makeTarget(ordered[0]!.slug);
  }, [user, units, fcSummary, resumeSlug, dbPositionQuery.data]);

  // Level progress aggregates (mirrors Gulf: units complete / total).
  const totalUnits = units?.length ?? 0;
  const completedUnits = useMemo(() => {
    if (!units || !fcSummary?.units) return 0;
    const bySlug = new Map(fcSummary.units.map((u) => [u.slug, u]));
    return units.filter((u) => {
      const s = bySlug.get(u.slug);
      return !!s && s.total > 0 && (s.reviewed ?? 0) >= s.total;
    }).length;
  }, [units, fcSummary]);
  const overallProgress = totalUnits > 0 ? (completedUnits / totalUnits) * 100 : 0;

  const totalWords = useMemo(() => {
    if (!fcSummary?.units) return 0;
    return fcSummary.units.reduce((sum, u) => sum + (u.total ?? 0), 0);
  }, [fcSummary]);

  useEffect(() => {
    if (!units) return;
    // Diagnostic entitlement log preserved from previous version.
    console.log("[FlashCardsHome] entitlement debug", {
      userId: user?.id ?? null,
      ownedPackIds: ownedPackIds ? Array.from(ownedPackIds) : null,
      packUnitsCount: packUnits?.length ?? null,
    });
  }, [units, packs, ownedPackIds, user?.id, packUnits, unitAccessQuery.data]);

  return (
    <Layout>
      <SEOHead
        title="Spoken Arabic — Beginner | ArabiyaPath"
        description="Beginner Spoken Arabic units: vowelized vocabulary, native audio, listening, speaking, grammar and test-yourself for every unit."
        canonicalPath="/flashcards"
        jsonLd={itemList}
      />

      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        {/* Header — mirrors Gulf LevelOverview */}
        <div className="border-b bg-background/80 backdrop-blur-sm">
          <div className="container max-w-4xl py-6 sm:py-8 px-4 sm:px-6">
            <PageNav
              crumbs={[
                { label: "Dashboard", to: "/dashboard" },
                { label: "Spoken Arabic", to: "/flashcards/course/spoken-arabic" },
                { label: "Beginner" },
              ]}
              backTo="/flashcards/course/spoken-arabic"
              backLabel="Back to Spoken Arabic"
              className="mb-3 sm:mb-4"
            />

            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">
                  Beginner
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">
                  {totalUnits} Units{totalWords > 0 ? ` • ${totalWords} Words` : ""}
                </p>
              </div>
              {totalUnits > 0 && completedUnits === totalUnits && (
                <Badge
                  variant="default"
                  className="gap-1 bg-green-600 text-sm sm:text-lg py-1 px-2 sm:px-3 w-fit"
                >
                  <Trophy className="h-3 w-3 sm:h-4 sm:w-4" />
                  Completed
                </Badge>
              )}
            </div>

            {user && (
              <div className="mt-4 sm:mt-6 space-y-2">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-muted-foreground">Level Progress</span>
                  <span className="font-medium">
                    {completedUnits}/{totalUnits} units
                  </span>
                </div>
                <Progress value={overallProgress} className="h-2 sm:h-3" />
              </div>
            )}
          </div>
        </div>

        {/* Units + Resume */}
        <div className="container max-w-4xl py-6 sm:py-8 px-4 sm:px-6">
          {user && resumeTarget && (
            <div className="mb-4 sm:mb-6">
              {resumeTarget.done ? (
                <Card className="border-emerald-500/40 bg-emerald-500/5">
                  <CardContent className="py-6 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
                      <Trophy className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-lg">Beginner Completed 🎉</p>
                      <p className="text-sm text-muted-foreground">
                        You've finished every Beginner unit. Review any unit below to keep it sharp.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Button
                  asChild
                  size="lg"
                  className="h-auto py-3 px-5 gap-3 w-full sm:w-auto"
                >
                  <Link to={resumeTarget.href!}>
                    <ArrowRight className="w-5 h-5 shrink-0" />
                    <span className="flex flex-col items-start leading-tight text-left">
                      <span className="text-xs font-medium opacity-90">Resume Learning</span>
                      <span className="text-base font-semibold">{resumeTarget.unitTitle}</span>
                      <span className="text-xs opacity-80">{resumeTarget.tabLabel}</span>
                    </span>
                  </Link>
                </Button>
              )}
            </div>
          )}

          {!units?.length ? (
            <p className="text-muted-foreground">
              Content is being prepared. Check back soon.
            </p>
          ) : (
            <div className="grid gap-3 sm:gap-4">
              {units.map((u, idx) => {
                const unlocked = unitUnlocked(u.id, u.is_free);
                const entitlementLoading = unitEntitlementLoading(u.id, u.is_free);
                const summaryUnit = fcSummary?.units?.find((x) => x.slug === u.slug);
                const reviewed = summaryUnit?.reviewed ?? summaryUnit?.mastered ?? 0;
                const total = summaryUnit?.total ?? 0;
                const isComplete = total > 0 && reviewed >= total;
                const isInProgress = reviewed > 0 && !isComplete;

                let href: string;
                if (entitlementLoading) {
                  href = "/flashcards";
                } else if (unlocked) {
                  href = lessonHrefForUnit(u.slug);
                } else {
                  const target = "/pricing";
                  href = user ? target : `/signup?redirect=${encodeURIComponent(target)}`;
                }

                let status: UnitCardStatus;
                let badge: UnitCardBadge;
                if (entitlementLoading) {
                  status = "loading";
                  badge = null;
                } else if (!unlocked) {
                  status = "locked";
                  badge = "locked";
                } else if (isComplete) {
                  status = "completed";
                  badge = "completed";
                } else if (isInProgress) {
                  status = "in-progress";
                  badge = u.is_free ? "free" : "in-progress";
                } else {
                  status = "not-started";
                  badge = u.is_free ? "free" : null;
                }

                return (
                  <UnitCard
                    key={u.id}
                    index={idx + 1}
                    title={u.title_en}
                    description={u.description}
                    href={href}
                    status={status}
                    badge={badge}
                    progress={
                      user && total > 0 && unlocked
                        ? { completed: reviewed, total, label: "words" }
                        : null
                    }
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
