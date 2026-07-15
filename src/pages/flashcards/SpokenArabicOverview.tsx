import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { PageNav } from "@/components/learn/PageNav";
import { SEOHead } from "@/components/seo/SEOHead";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, BookOpen, GraduationCap, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFlashcardsDashboard, useFlashcardsResumeSlug } from "@/hooks/useFlashcardsDashboard";
import { useFlashcardCourseStructure } from "@/hooks/useFlashcardCourseStructure";

/**
 * Spoken Arabic course overview.
 * Mirrors the language-course overview UX (DialectOverview → LevelProgressCard).
 * Beginner is live and links to the existing /flashcards units page.
 * Intermediate and Advanced show "Coming Soon".
 */

const levelConfig: Record<
  string,
  { icon: typeof BookOpen; colorClass: string; bgClass: string }
> = {
  Beginner: {
    icon: BookOpen,
    colorClass: "text-emerald-600 dark:text-emerald-400",
    bgClass: "bg-emerald-100 dark:bg-emerald-900/30",
  },
  Intermediate: {
    icon: GraduationCap,
    colorClass: "text-blue-600 dark:text-blue-400",
    bgClass: "bg-blue-100 dark:bg-blue-900/30",
  },
  Advanced: {
    icon: Trophy,
    colorClass: "text-purple-600 dark:text-purple-400",
    bgClass: "bg-purple-100 dark:bg-purple-900/30",
  },
};

export default function SpokenArabicOverview() {
  const { data: fcSummary } = useFlashcardsDashboard();
  const { data: fcResumeSlug } = useFlashcardsResumeSlug();
  const { data: fcCourses } = useFlashcardCourseStructure();

  const spokenCourse = fcCourses?.find((c) => c.slug === "spoken-arabic");
  const unitById = new Map((fcSummary?.units ?? []).map((u) => [u.unit_id, u]));

  // Ensure the three canonical levels always render, even if the DB row is missing.
  const canonicalLevels = ["Beginner", "Intermediate", "Advanced"];
  const dbLevels = spokenCourse?.levels ?? [];
  const levels = canonicalLevels.map((name) => {
    const db = dbLevels.find((l) => l.title_en === name);
    const units = (db?.unit_ids ?? [])
      .map((id) => unitById.get(id))
      .filter((u): u is NonNullable<typeof u> => !!u);
    const totalCards = units.reduce((s, u) => s + u.total, 0);
    const reviewedCards = units.reduce(
      (s, u) => s + (u.reviewed ?? u.mastered ?? 0),
      0
    );
    const completedUnits = units.filter(
      (u) => u.total > 0 && (u.reviewed ?? 0) >= u.total
    ).length;
    return {
      name,
      totalUnits: units.length,
      completedUnits,
      totalCards,
      reviewedCards,
      progressPercent:
        totalCards > 0 ? Math.round((reviewedCards / totalCards) * 100) : 0,
      isComingSoon: name === "Advanced",
    };
  });

  // Overall course stats
  const totalCards = levels.reduce((s, l) => s + l.totalCards, 0);
  const reviewedCards = levels.reduce((s, l) => s + l.reviewedCards, 0);
  const totalUnits = levels.reduce((s, l) => s + l.totalUnits, 0);
  const completedUnits = levels.reduce((s, l) => s + l.completedUnits, 0);
  const overallPercent =
    totalCards > 0 ? Math.round((reviewedCards / totalCards) * 100) : 0;

  void fcResumeSlug;
  const levelHref = (name: string) => {
    if (name === "Beginner") return "/flashcards";
    if (name === "Intermediate") return "/flashcards/level/intermediate";
    return "/flashcards";
  };

  return (
    <>
      <SEOHead
        title="Spoken Arabic Course"
        description="Learn Spoken Arabic through vocabulary units, listening, speaking, grammar and quizzes."
        canonicalPath="/flashcards/course/spoken-arabic"
        noindex
      />
      <Layout>
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
          <div className="container max-w-4xl py-6 sm:py-10 px-4 sm:px-6">
            <PageNav
              crumbs={[
                { label: "Dashboard", to: "/dashboard" },
                { label: "Spoken Arabic" },
              ]}
              backTo="/dashboard"
              backLabel="Back to Dashboard"
              className="mb-4 sm:mb-6"
            />
            <Badge variant="secondary" className="mb-3 sm:mb-4 text-xs sm:text-sm">
              Arabic Course
            </Badge>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-3 sm:mb-4">
              Spoken Arabic
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl">
              Build real-world Arabic vocabulary and conversation skills, one
              unit at a time.
            </p>

            {/* Overall Progress card (identical style to language course card) */}
            <Card className="mt-6 sm:mt-8">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🃏</span>
                  <CardTitle className="text-lg">Overall Progress</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">
                      Course progress
                    </span>
                    <span className="font-medium text-foreground">
                      {overallPercent}%
                    </span>
                  </div>
                  <Progress value={overallPercent} className="h-2" />
                </div>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-3 bg-accent rounded-lg">
                    <p className="text-2xl font-bold text-foreground">
                      {reviewedCards}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      of {totalCards} cards
                    </p>
                  </div>
                  <div className="p-3 bg-accent rounded-lg">
                    <p className="text-2xl font-bold text-foreground">
                      {completedUnits}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      of {totalUnits} units
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Level Cards */}
          <div className="container max-w-4xl pb-10 px-4 sm:px-6">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4 sm:mb-6">
              Choose Your Level
            </h2>
            <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
              {levels.map((lvl) => {
                const cfg = levelConfig[lvl.name];
                const Icon = cfg.icon;
                if (lvl.isComingSoon) {
                  return (
                    <Card
                      key={lvl.name}
                      className="relative overflow-hidden opacity-60"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "w-10 h-10 rounded-lg flex items-center justify-center",
                              cfg.bgClass
                            )}
                          >
                            <Icon className={cn("w-5 h-5", cfg.colorClass)} />
                          </div>
                          <CardTitle className="text-base">{lvl.name}</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-center py-4">
                          <span className="text-sm text-muted-foreground">
                            🔜 Coming Soon
                          </span>
                        </div>
                        <Button
                          className="w-full"
                          variant="outline"
                          size="sm"
                          disabled
                        >
                          Continue
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                      </CardContent>
                    </Card>
                  );
                }
                return (
                  <Card
                    key={lvl.name}
                    className="relative overflow-hidden transition-all duration-300 hover:shadow-md"
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center",
                            cfg.bgClass
                          )}
                        >
                          <Icon className={cn("w-5 h-5", cfg.colorClass)} />
                        </div>
                        <CardTitle className="text-base">{lvl.name}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium text-foreground">
                            {lvl.progressPercent}%
                          </span>
                        </div>
                        <Progress
                          value={lvl.progressPercent}
                          className="h-2"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="p-2 bg-accent/50 rounded-lg">
                          <p className="text-lg font-bold text-foreground">
                            {lvl.completedUnits}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            of {lvl.totalUnits} units
                          </p>
                        </div>
                        <div className="p-2 bg-accent/50 rounded-lg">
                          <p className="text-lg font-bold text-foreground">
                            {lvl.reviewedCards}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            of {lvl.totalCards} cards
                          </p>
                        </div>
                      </div>
                      <Button
                        asChild
                        className="w-full"
                        variant="outline"
                        size="sm"
                      >
                        <Link to={beginnerHref}>
                          Continue
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
}
