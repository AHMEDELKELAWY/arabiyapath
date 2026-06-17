import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useFlashcardsDashboard } from "@/hooks/useFlashcardsDashboard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, BarChart3, BookOpen } from "lucide-react";
import { FREE_LESSON_URL } from "@/lib/gulfAccess";
import { SEOHead } from "@/components/seo/SEOHead";

const dialectEmojis: Record<string, string> = {
  "Gulf Arabic": "🏜️",
  "Egyptian Arabic": "🏛️",
  "Modern Standard Arabic (Fusha)": "📚",
};

function relativeDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const day = 24 * 60 * 60 * 1000;
  const days = Math.floor(diffMs / day);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

interface ProductProgressCardProps {
  name: string;
  emoji: string;
  progressPercent: number;
  totalUnits: number;
  completedUnits: number;
  lastActivityLabel: string;
  continueHref: string;
  viewProgressHref: string;
}

function ProductProgressCard({
  name,
  emoji,
  progressPercent,
  totalUnits,
  completedUnits,
  lastActivityLabel,
  continueHref,
  viewProgressHref,
}: ProductProgressCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-start gap-3">
          <span className="text-3xl" aria-hidden="true">{emoji}</span>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">{name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {completedUnits} / {totalUnits} unit{totalUnits === 1 ? "" : "s"} completed
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} />
        </div>

        <p className="text-xs text-muted-foreground truncate">{lastActivityLabel}</p>

        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <Button asChild className="flex-1 gap-2">
            <Link to={continueHref}>
              Continue
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="flex-1 gap-2">
            <Link to={viewProgressHref}>
              <BarChart3 className="w-4 h-4" />
              View Progress
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardProgress() {
  const { user } = useAuth();
  const { levelsByDialect, recentActivity, hasLevelAccess, isLoading } =
    useDashboardData();
  const { data: fcSummary, isLoading: fcLoading } = useFlashcardsDashboard();

  if (isLoading || fcLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Skeleton className="h-56" />
            <Skeleton className="h-56" />
            <Skeleton className="h-56" />
          </div>
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

  return (
    <DashboardLayout>
      <SEOHead title="Progress" canonicalPath="/dashboard/progress" noindex />
      <div className="space-y-6 sm:space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">
            Progress
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            An overview of your learning products. Pick one to dive into details.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ownedDialects.map((dg) => {
            const totalLessons = dg.levels.reduce((s, l) => s + l.totalLessons, 0);
            const completedLessons = dg.levels.reduce(
              (s, l) => s + l.completedLessons,
              0
            );
            const totalUnits = dg.levels.reduce((s, l) => s + l.totalUnits, 0);
            const completedUnits = dg.levels.reduce(
              (s, l) => s + l.completedUnits,
              0
            );
            const progressPercent =
              totalLessons > 0
                ? Math.round((completedLessons / totalLessons) * 100)
                : 0;
            const last = recentActivity.find((a) => a.dialectId === dg.dialectId);
            const lastLabel = last
              ? `Last: ${last.unitTitle} · ${relativeDate(last.completedAt)}`
              : "Not started yet";

            return (
              <ProductProgressCard
                key={dg.dialectId}
                name={dg.dialectName}
                emoji={dialectEmojis[dg.dialectName] || "📖"}
                progressPercent={progressPercent}
                totalUnits={totalUnits}
                completedUnits={completedUnits}
                lastActivityLabel={lastLabel}
                continueHref={`/learn/dialect/${dg.dialectId}`}
                viewProgressHref={`/learn/dialect/${dg.dialectId}`}
              />
            );
          })}

          {hasFlashcards && fcSummary && (() => {
            const totalCards = fcSummary.units.reduce((s, u) => s + u.total, 0);
            const mastered = fcSummary.total_mastered;
            const progressPercent =
              totalCards > 0 ? Math.round((mastered / totalCards) * 100) : 0;
            const totalUnits = fcSummary.units.length;
            const completedUnits = fcSummary.units.filter(
              (u) => u.total > 0 && u.mastered >= u.total
            ).length;
            const streakCount = fcSummary.streak?.current_streak ?? 0;
            const lastDate = fcSummary.streak?.last_active_date;
            const lastLabel =
              streakCount > 0
                ? `🔥 ${streakCount}-day streak`
                : lastDate
                ? `Last studied ${relativeDate(lastDate)}`
                : "Not started yet";

            return (
              <ProductProgressCard
                key="flashcards"
                name="Flash Cards"
                emoji="🃏"
                progressPercent={progressPercent}
                totalUnits={totalUnits}
                completedUnits={completedUnits}
                lastActivityLabel={lastLabel}
                continueHref="/flashcards"
                viewProgressHref="/flashcards"
              />
            );
          })()}
        </div>
      </div>
    </DashboardLayout>
  );
}
