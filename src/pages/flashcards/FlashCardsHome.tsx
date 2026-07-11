import { Layout } from "@/components/layout/Layout";
import { SEOHead } from "@/components/seo/SEOHead";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, Sparkles, BookOpen, Loader2, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useFlashcardsResumeSlug, useFlashcardsDashboard } from "@/hooks/useFlashcardsDashboard";
import { useEffect, useMemo } from "react";
import { loadSpokenArabicResume, buildUnitResumeHref } from "@/lib/spokenArabicResume";
import { Trophy } from "lucide-react";


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

  const unitsQuery = useQuery({
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

  // Per-pack ownership via server RPC — single source of truth used everywhere.
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

  // Compute access per unit from the server-side unit entitlement RPC.
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

  const firstFreeUnit = units?.find((u) => u.is_free) ?? null;
  const firstPack = packs?.[0] ?? null;
  const hasAnyPackAccess = (ownedPackIds?.size ?? 0) > 0;

  // Diagnostic log requested for verification.
  useEffect(() => {
    if (!units) return;
    const packAccess = (packs ?? []).map((p) => ({
      packId: p.id,
      packSlug: p.slug,
      hasPackAccess: ownedPackIds?.has(p.id) ?? false,
    }));
    console.log("[FlashCardsHome] entitlement debug", {
      userId: user?.id ?? null,
      authUid: user?.id ?? null,
      packOwnershipResult: packAccess,
      hasPackAccess: (ownedPackIds?.size ?? 0) > 0,
      ownedPackIds: ownedPackIds ? Array.from(ownedPackIds) : null,
      packUnitsCount: packUnits?.length ?? null,
      packUnits: packUnits ?? null,
      reactQueryCache: {
        unitsUpdatedAt: unitsQuery.dataUpdatedAt,
        packsUpdatedAt: packsQuery.dataUpdatedAt,
        packUnitsUpdatedAt: packUnitsQuery.dataUpdatedAt,
        ownedPacksUpdatedAt: ownedPacksQuery.dataUpdatedAt,
        unitAccessUpdatedAt: unitAccessQuery.dataUpdatedAt,
        packUnitsFetching: packUnitsQuery.isFetching,
        ownedPacksFetching: ownedPacksQuery.isFetching,
        unitAccessFetching: unitAccessQuery.isFetching,
      },
      units: units.map((u) => {
        const entitlementLoading = unitEntitlementLoading(u.id, u.is_free);
        const unlocked = unitUnlocked(u.id, u.is_free);
        return {
          slug: u.slug,
          is_free: u.is_free,
          currentUserId: user?.id ?? null,
          hasPackAccess: (ownedPackIds?.size ?? 0) > 0,
          canStudy: unitAccessQuery.data?.get(u.id) ?? null,
          uiUnlocked: unlocked,
          lockStateShownInUI: entitlementLoading ? "Checking access…" : unlocked ? "Start studying" : "Unlock pack",
        };
      }),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [units, packs, ownedPackIds, user?.id, packUnits, unitAccessQuery.data]);


  function lessonHrefForUnit(slug: string): string {
    const target = `/flashcards/unit/${slug}?from=home`;
    // Logged-out visitors go through the /start-free lead-capture funnel
    // (email → full signup → straight into Unit 1) instead of jumping to Signup.
    return user ? target : "/start-free";
  }

  const heroFreeHref = firstFreeUnit
    ? lessonHrefForUnit(firstFreeUnit.slug)
    : (user ? "/flashcards" : "/start-free");

  const heroPackHref =
    firstPack?.product_id && !hasAnyPackAccess
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

  // ── Resume Learning ──────────────────────────────────────────────────────
  // Compute the exact place to drop the student back into:
  //   1. saved (unit + tab) from localStorage — if that unit is not fully done
  //   2. next incomplete Beginner unit (by order_index)
  //   3. fallback: most-recently studied unit (from useFlashcardsResumeSlug)
  //   4. all units completed → success state
  const resumeTarget = useMemo(() => {
    if (!user || !units?.length) return null;
    const summaryUnits = fcSummary?.units ?? [];
    const byId = new Map(summaryUnits.map((u) => [u.unit_id, u]));
    const bySlug = new Map(summaryUnits.map((u) => [u.slug, u]));

    const isUnitComplete = (slug: string) => {
      const s = bySlug.get(slug);
      return !!s && s.total > 0 && (s.reviewed ?? 0) >= s.total;
    };

    // Saved position
    const saved = loadSpokenArabicResume();
    if (saved) {
      const stillExists = units.some((u) => u.slug === saved.unitSlug);
      if (stillExists && !isUnitComplete(saved.unitSlug)) {
        return {
          href: buildUnitResumeHref(saved.unitSlug, saved.tab),
          done: false,
        };
      }
    }

    // First incomplete unit in order
    const ordered = [...units].sort((a, b) => a.order_index - b.order_index);
    const nextIncomplete = ordered.find((u) => !isUnitComplete(u.slug));
    if (nextIncomplete) {
      return { href: buildUnitResumeHref(nextIncomplete.slug), done: false };
    }

    // Fallback: recently studied
    if (resumeSlug) {
      return { href: buildUnitResumeHref(resumeSlug), done: false };
    }

    // Everything done — but only claim completion if the summary knows about
    // at least one unit AND every known unit is complete.
    const knownCount = summaryUnits.filter((u) => u.total > 0).length;
    if (knownCount > 0 && ordered.every((u) => isUnitComplete(u.slug))) {
      return { href: null, done: true };
    }

    // Nothing studied yet — start with the first unit
    return { href: buildUnitResumeHref(ordered[0]!.slug), done: false };
  }, [user, units, fcSummary, resumeSlug]);

  return (
    <Layout>
      <SEOHead
        title="ArabiyaPath Membership — Learn Arabic Every Day"
        description="Join the premium ArabiyaPath Membership. Fully vowelized Modern Standard Arabic with native audio, real images, speaking, listening, and quizzes. Unit 1 free."
        canonicalPath="/flashcards"
        jsonLd={itemList}
      />
      <section className="py-16 px-4 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto max-w-5xl text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            ArabiyaPath Membership
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Learn fully vowelized Modern Standard Arabic with native audio, real images, speaking practice, listening drills, and smart quizzes — all included.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Button size="lg" asChild>
              <Link to={heroFreeHref}>
                <Sparkles className="w-4 h-4 mr-2" />
                {firstFreeUnit ? `Start Free — ${firstFreeUnit.title_en}` : "Start Free"}
              </Link>
            </Button>
            {!hasAnyPackAccess && (
              <Button size="lg" variant="outline" asChild>
                <Link to="/pricing">Join Membership</Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      <section className="py-12 px-4">
        <div className="container mx-auto max-w-5xl">
          {/* Resume Learning — primary CTA above the units list. */}
          {user && resumeTarget && (
            <div className="mb-6">
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
                <Button asChild size="lg" className="gap-2 w-full sm:w-auto">
                  <Link to={resumeTarget.href!}>
                    <ArrowRight className="w-4 h-4" />
                    Resume Learning
                  </Link>
                </Button>
              )}
            </div>
          )}
          <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
            <h2 className="text-2xl font-bold">Units</h2>
          </div>
          {!units?.length ? (
            <p className="text-muted-foreground">
              Content is being prepared. Check back soon.
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {units.map((u) => {
                const unlocked = unitUnlocked(u.id, u.is_free);
                const entitlementLoading = unitEntitlementLoading(u.id, u.is_free);
                let href: string;
                if (entitlementLoading) {
                  href = "/flashcards";
                } else if (unlocked) {
                  href = lessonHrefForUnit(u.slug);
                } else {
                  const target = "/pricing";
                  href = user ? target : `/signup?redirect=${encodeURIComponent(target)}`;
                }
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
                          ) : unlocked ? (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                              Unlocked
                            </span>
                          ) : entitlementLoading ? (
                            <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
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
                          {entitlementLoading ? "Checking access…" : unlocked ? "Start studying" : "Upgrade to Access"}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
          {user && resumeSlug && units && units.length > 0 && (
            <div className="mt-8 flex justify-center">
              <Button asChild size="lg" className="gap-2">
                <Link to={`/flashcards/unit/${resumeSlug}?from=home`}>
                  Continue where you left off
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
