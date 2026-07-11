import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useDashboardData } from "@/hooks/useDashboardData";
import {
  useFlashcardsDashboard,
  useFlashcardsResumeSlug,
} from "@/hooks/useFlashcardsDashboard";
import { useFlashcardCourseStructure } from "@/hooks/useFlashcardCourseStructure";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ArrowRight, BookOpen, Flame, Sparkles, Layers } from "lucide-react";
import { FREE_LESSON_URL } from "@/lib/gulfAccess";
import { SEOHead } from "@/components/seo/SEOHead";
import { MembershipSection } from "@/components/dashboard/MembershipSection";

const dialectEmojis: Record<string, string> = {
  "Gulf Arabic": "🏜️",
  "Egyptian Arabic": "🏛️",
  "Modern Standard Arabic (Fusha)": "📚",
};

export default function DashboardProgress() {
  const { user } = useAuth();
  const { levelsByDialect, hasLevelAccess, isLoading } = useDashboardData();
  const { data: fcSummary, isLoading: fcLoading } = useFlashcardsDashboard();
  const { data: fcResumeSlug } = useFlashcardsResumeSlug();
  const { data: fcCourses } = useFlashcardCourseStructure();

  // NOTE: All hooks must run unconditionally on every render. Do NOT add early
  // returns above this line — doing so causes React error #310 (hook order
  // mismatch) and the page renders blank white.
  useEffect(() => {
    if (window.location.hash === "#flashcards-section") {
      document
        .getElementById("flashcards-section")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  if (isLoading || fcLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </DashboardLayout>
    );
  }

  const ownedDialects = levelsByDialect.filter((dg) =>
    dg.levels.some((l) => hasLevelAccess(l.levelId, l.dialectId))
  );

  const hasFlashcards =
    !!fcSummary &&
    (fcSummary.purchases.some((p) => p.status === "active") ||
      fcSummary.units.length > 0 ||
      fcSummary.total_mastered > 0 ||
      (fcSummary.streak?.current_streak ?? 0) > 0);

  const hasAnyProduct = ownedDialects.length > 0 || hasFlashcards;

  if (!user || !hasAnyProduct) {
    return (
      <DashboardLayout>
        <SEOHead title="Progress" canonicalPath="/dashboard/progress" noindex />
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">
              Progress
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Purchase a course to start tracking your progress
            </p>
          </div>
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No active products
              </h3>
              <p className="text-muted-foreground mb-4">
                Get started with a free lesson or explore our courses.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link to={FREE_LESSON_URL}>
                  <Button className="gap-2">
                    <ArrowRight className="w-4 h-4" />
                    Start Free Lesson
                  </Button>
                </Link>
                <Link to="/gulf-arabic-course#choose-plan">
                  <Button variant="outline">View Gulf Course</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const firstFreeOrAnyUnit = fcSummary?.units[0]?.slug ?? null;
  const fcContinueHref = fcResumeSlug
    ? `/flashcards/unit/${fcResumeSlug}?from=dashboard`
    : firstFreeOrAnyUnit
    ? `/flashcards/unit/${firstFreeOrAnyUnit}?from=dashboard`
    : "/flashcards";

  // Default open: every product
  const defaultOpen = [
    ...ownedDialects.map((dg) => `dialect-${dg.dialectId}`),
    ...(hasFlashcards ? ["flashcards"] : []),
  ];

  return (
    <DashboardLayout>
      <SEOHead title="Progress" canonicalPath="/dashboard/progress" noindex />
      <div className="space-y-6 sm:space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">
            Progress
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Your progress, grouped by product.
          </p>
        </div>
        <MembershipSection />

        <Accordion type="multiple" defaultValue={defaultOpen} className="space-y-3">
          {ownedDialects.map((dg) => {
            const totalLessons = dg.levels.reduce((s, l) => s + l.totalLessons, 0);
            const completedLessons = dg.levels.reduce(
              (s, l) => s + l.completedLessons,
              0
            );
            const progressPercent =
              totalLessons > 0
                ? Math.round((completedLessons / totalLessons) * 100)
                : 0;
            const emoji = dialectEmojis[dg.dialectName] || "📖";
            return (
              <AccordionItem
                key={dg.dialectId}
                value={`dialect-${dg.dialectId}`}
                className="border rounded-lg bg-card"
              >
                <AccordionTrigger className="px-4 hover:no-underline">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-2xl" aria-hidden="true">{emoji}</span>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="font-semibold truncate">{dg.dialectName}</p>
                      <p className="text-xs text-muted-foreground">
                        {progressPercent}% · {completedLessons}/{totalLessons} lessons
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="mb-4">
                    <Progress value={progressPercent} />
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[...dg.levels]
                      .sort((a, b) => a.orderIndex - b.orderIndex)
                      .map((lvl) => {
                        const locked = !hasLevelAccess(lvl.levelId, lvl.dialectId);
                        const lvlPct =
                          lvl.totalLessons > 0
                            ? Math.round(
                                (lvl.completedLessons / lvl.totalLessons) * 100
                              )
                            : 0;
                        return (
                          <Card key={lvl.levelId} className="hover:shadow transition-shadow">
                            <CardContent className="p-4 space-y-2">
                              <div className="flex items-center justify-between">
                                <p className="font-medium text-sm">{lvl.levelName}</p>
                                <span className="text-xs text-muted-foreground">
                                  {lvlPct}%
                                </span>
                              </div>
                              <Progress value={lvlPct} />
                              <p className="text-xs text-muted-foreground">
                                {lvl.completedUnits}/{lvl.totalUnits} units ·{" "}
                                {lvl.completedLessons}/{lvl.totalLessons} lessons
                              </p>
                              <Button
                                asChild
                                size="sm"
                                variant={locked ? "outline" : "default"}
                                className="w-full gap-2 mt-2"
                              >
                                <Link to={`/learn/level/${lvl.levelId}`}>
                                  {locked ? "View Level" : "Continue"}
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </Link>
                              </Button>
                            </CardContent>
                          </Card>
                        );
                      })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}

          {hasFlashcards && fcSummary && (() => {
            const totalCards = fcSummary.units.reduce((s, u) => s + u.total, 0);
            const reviewedCards = fcSummary.units.reduce(
              (s, u) => s + (u.reviewed ?? u.mastered ?? 0),
              0
            );
            const mastered = fcSummary.total_mastered;
            const progressPercent =
              totalCards > 0 ? Math.round((reviewedCards / totalCards) * 100) : 0;
            const streak = fcSummary.streak?.current_streak ?? 0;
            const completedUnits = fcSummary.units.filter(
              (u) => u.total > 0 && (u.reviewed ?? 0) >= u.total
            ).length;
            const totalUnits = fcSummary.units.length;

            // Group summary units by course level using the courses hook.
            // Falls back to a single "Beginner" bucket if courses haven't loaded.
            const spokenCourse = fcCourses?.find((c) => c.slug === "spoken-arabic");
            const unitById = new Map(fcSummary.units.map((u) => [u.unit_id, u]));
            const levelGroups =
              spokenCourse?.levels.map((lvl) => ({
                id: lvl.id,
                title: lvl.title_en,
                units: lvl.unit_ids
                  .map((id) => unitById.get(id))
                  .filter((u): u is NonNullable<typeof u> => !!u),
              })) ?? [
                { id: "beginner-fallback", title: "Beginner", units: fcSummary.units },
              ];

            return (
              <AccordionItem
                id="flashcards-section"
                value="flashcards"
                className="border rounded-lg bg-card"
              >
                <AccordionTrigger className="px-4 hover:no-underline">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-2xl" aria-hidden="true">🃏</span>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="font-semibold truncate">Spoken Arabic</p>
                      <p className="text-xs text-muted-foreground">
                        {progressPercent}% · {reviewedCards}/{totalCards} cards · {completedUnits}/{totalUnits} units
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>

                <AccordionContent className="px-4 pb-4 space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <Stat
                      icon={<Sparkles className="w-4 h-4 text-primary" />}
                      label="Mastered"
                      value={mastered}
                    />
                    <Stat
                      icon={<Layers className="w-4 h-4 text-emerald-500" />}
                      label="Due today"
                      value={fcSummary.due_today}
                    />
                    <Stat
                      icon={<Flame className="w-4 h-4 text-orange-500" />}
                      label="Streak"
                      value={`${streak}d`}
                    />
                  </div>

                  {levelGroups.map((group) => (
                    <div key={group.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-foreground">
                          {group.title}
                        </h4>
                        <span className="text-xs text-muted-foreground">
                          {group.units.length} unit{group.units.length === 1 ? "" : "s"}
                        </span>
                      </div>
                      {group.units.length === 0 ? (
                        <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
                          Coming Soon
                        </div>
                      ) : (
                        group.units.map((u) => {
                          const reviewed = u.reviewed ?? u.mastered ?? 0;
                          const pct = u.total
                            ? Math.round((reviewed / u.total) * 100)
                            : 0;
                          return (
                            <Link
                              key={u.unit_id}
                              to={`/flashcards/unit/${u.slug}?from=dashboard`}
                              className="block rounded-md border p-3 hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex justify-between text-sm mb-1">
                                <span className="font-medium truncate">{u.title}</span>
                                <span className="text-muted-foreground">
                                  {reviewed}/{u.total}
                                </span>
                              </div>
                              <Progress value={pct} />
                            </Link>
                          );
                        })
                      )}
                    </div>
                  ))}

                  <Button asChild className="w-full gap-2">
                    <Link to={fcContinueHref}>
                      Continue
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </Button>
                </AccordionContent>
              </AccordionItem>
            );
          })()}
        </Accordion>
      </div>
    </DashboardLayout>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-md border p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="text-xl font-bold mt-1">{value}</div>
    </div>
  );
}
