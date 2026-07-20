import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useFlashcardsDashboard } from "@/hooks/useFlashcardsDashboard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { ContinueLearningCard } from "@/components/dashboard/ContinueLearningCard";
import { ProductCard } from "@/components/dashboard/ProductCard";
import { RecentActivityList } from "@/components/dashboard/RecentActivityList";
import { QuizResultsList } from "@/components/dashboard/QuizResultsList";
import { CertificatesList } from "@/components/dashboard/CertificatesList";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Globe } from "lucide-react";
import { FREE_LESSON_URL } from "@/lib/gulfAccess";
import { FlashcardsDashboardSection } from "@/components/dashboard/FlashcardsDashboardSection";
import { MembershipUpsellHero } from "@/components/dashboard/MembershipUpsellHero";
import { useMembership } from "@/hooks/useMembership";
import { SEOHead } from "@/components/seo/SEOHead";

const dialectEmojis: Record<string, string> = {
  "Gulf Arabic": "🏜️",
  "Egyptian Arabic": "🏛️",
  "Modern Standard Arabic (Fusha)": "📚",
};

const dialectSalesPages: Record<string, string> = {
  "Gulf Arabic": "/gulf-arabic-course",
  "Egyptian Arabic": "/dialects",
  "Modern Standard Arabic (Fusha)": "/learn/fusha-arabic",
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

export default function Dashboard() {
  const { profile } = useAuth();
  const {
    levelsByDialect,
    recentActivity,
    quizResults,
    certificates,
    hasLevelAccess,
    isLoading,
  } = useDashboardData();
  const { data: fcSummary } = useFlashcardsDashboard();
  const { subscription } = useMembership();
  const isFreeMembership = !!subscription?.paypal_subscription_id?.startsWith("FREE-");
  const isPaidActive =
    !!subscription &&
    !isFreeMembership &&
    (subscription.status === "ACTIVE" ||
      (subscription.status === "CANCELLED" &&
        !!subscription.expires_at &&
        new Date(subscription.expires_at) > new Date()));
  const firstName = profile?.first_name || "Learner";
  const hasAnyProgress = recentActivity.length > 0;
  const lastActivity = recentActivity[0] || null;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-8">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 w-full" />
          <div className="grid md:grid-cols-3 gap-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Separate dialects into owned vs other
  const ownedDialects: typeof levelsByDialect = [];
  const otherDialects: typeof levelsByDialect = [];

  levelsByDialect.forEach((dialectGroup) => {
    const hasAnyAccess = dialectGroup.levels.some((level) =>
      hasLevelAccess(level.levelId, level.dialectId)
    );
    if (hasAnyAccess) {
      ownedDialects.push(dialectGroup);
    } else {
      otherDialects.push(dialectGroup);
    }
  });

  // Flash Cards access: purchase OR free units exist OR has any progress/streak.
  // Free units are accessible to everyone (fc_user_can_study_unit), so any
  // published unit returned by fc_dashboard_summary means the user has access.
  const hasFlashcards =
    !!fcSummary &&
    (fcSummary.purchases.some((p) => p.status === "active") ||
      fcSummary.units.length > 0 ||
      fcSummary.total_mastered > 0 ||
      (fcSummary.streak?.current_streak ?? 0) > 0);
  const hasAnyProduct = ownedDialects.length > 0 || hasFlashcards;

  // ===== FREE USER DASHBOARD =====
  if (!hasAnyProduct) {
    return (
      <DashboardLayout>
        <SEOHead title="Dashboard" canonicalPath="/dashboard" noindex />
        <div className="space-y-10">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-1">
              Welcome, {firstName} 👋
            </h1>
            <p className="text-muted-foreground">
              You don't have any active courses yet.
            </p>
          </div>

          <Card className="border-2 border-dashed">
            <CardContent className="py-12 text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  Start Your Arabic Journey
                </h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Try a free lesson to experience our interactive learning method, or explore our full Gulf Arabic course.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link to={FREE_LESSON_URL}>
                  <Button size="lg" className="gap-2">
                    <ArrowRight className="w-4 h-4" />
                    Start Free Lesson
                  </Button>
                </Link>
                <Link to="/gulf-arabic-course#choose-your-plan">
                  <Button size="lg" variant="outline" className="gap-2">
                    View Gulf Course
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
            <CardContent className="py-8 px-6 sm:px-8 flex flex-col sm:flex-row items-start sm:items-center gap-6 justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                    Membership
                  </span>
                </div>
                <h3 className="text-xl font-bold text-foreground mb-1">
                  Unlock every dialect and level
                </h3>
                <p className="text-sm text-muted-foreground max-w-xl">
                  One membership unlocks Gulf, Fusha, and MSA vocabulary — all units,
                  audio, quizzes, and grammar. Cancel anytime.
                </p>
              </div>
              <Link to="/pricing#membership" className="w-full sm:w-auto">
                <Button size="lg" className="gap-2 w-full sm:w-auto">
                  View Membership plans
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <FlashcardsDashboardSection />


          <p className="text-xs text-center text-muted-foreground">
            Already purchased?{" "}
            <button
              onClick={() => window.location.reload()}
              className="underline hover:text-foreground transition-colors"
            >
              Refresh access
            </button>
          </p>
        </div>
      </DashboardLayout>
    );
  }

  // ===== PAID USER DASHBOARD =====
  return (
    <DashboardLayout>
      <SEOHead title="Dashboard" canonicalPath="/dashboard" noindex />
      <div className="space-y-10">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-1">
            Welcome, {firstName} 👋
          </h1>
          <p className="text-muted-foreground">
            Track your progress and continue learning Arabic
          </p>
        </div>

        {(isPaidActive || hasAnyProduct) ? (
          <ContinueLearningCard
            lastActivity={lastActivity}
            hasAnyProgress={hasAnyProgress}
          />
        ) : (
          <MembershipUpsellHero mode={isFreeMembership ? "free" : "none"} />
        )}

        {/* ===== MY LEARNING ===== */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">
            My Learning
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ownedDialects.map((dialectGroup) => {
              const emoji = dialectEmojis[dialectGroup.dialectName] || "📖";
              const totalLessons = dialectGroup.levels.reduce(
                (s, l) => s + l.totalLessons,
                0
              );
              const completedLessons = dialectGroup.levels.reduce(
                (s, l) => s + l.completedLessons,
                0
              );
              const totalUnits = dialectGroup.levels.reduce(
                (s, l) => s + l.totalUnits,
                0
              );
              const progressPercent =
                totalLessons > 0
                  ? Math.round((completedLessons / totalLessons) * 100)
                  : 0;
              const last = recentActivity.find(
                (a) => a.dialectId === dialectGroup.dialectId
              );
              const lastLabel = last
                ? `Last: ${last.unitTitle} · ${relativeDate(last.completedAt)}`
                : "Not started yet";

              return (
                <ProductCard
                  key={dialectGroup.dialectId}
                  name={dialectGroup.dialectName}
                  emoji={emoji}
                  progressPercent={progressPercent}
                  unitsLabel={`${totalUnits} unit${totalUnits === 1 ? "" : "s"}`}
                  lastActivityLabel={lastLabel}
                  continueHref={`/learn/dialect/${dialectGroup.dialectId}`}
                />
              );
            })}

            {hasFlashcards && fcSummary && (() => {
              const totalCards = fcSummary.units.reduce(
                (s, u) => s + u.total,
                0
              );
              const reviewed = fcSummary.units.reduce(
                (sum, unit) => sum + (unit.reviewed ?? unit.mastered ?? 0),
                0
              );
              const progressPercent =
                totalCards > 0
                  ? Math.round((reviewed / totalCards) * 100)
                  : 0;
              const completedUnits = fcSummary.units.filter(
                (u) => u.total > 0 && (u.reviewed ?? 0) >= u.total
              ).length;
              const totalUnits = fcSummary.units.length;
              const streakCount = fcSummary.streak?.current_streak ?? 0;
              const lastDate = fcSummary.streak?.last_active_date;
              const lastLabel =
                streakCount > 0
                  ? `🔥 ${streakCount}-day streak`
                  : lastDate
                  ? `Last studied ${relativeDate(lastDate)}`
                  : "Not started yet";
              const continueHref = "/flashcards/course/spoken-arabic";
              return (
                <ProductCard
                  key="flashcards"
                  name="Spoken Arabic"
                  emoji="🃏"
                  progressPercent={progressPercent}
                  unitsLabel={`Beginner · ${completedUnits}/${totalUnits} units completed`}
                  lastActivityLabel={lastLabel}
                  continueHref={continueHref}
                />
              );
            })()}

          </div>
        </section>

        <div className="grid lg:grid-cols-2 gap-6">
          <RecentActivityList activities={recentActivity} />
          <QuizResultsList results={quizResults} />
        </div>

        <CertificatesList certificates={certificates} />

        {/* ===== EXPLORE OTHER DIALECTS ===== */}
        {otherDialects.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Globe className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">
                Explore Other Dialects
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {otherDialects.map((dialectGroup) => {
                const emoji = dialectEmojis[dialectGroup.dialectName] || "📖";
                const salesPage =
                  dialectSalesPages[dialectGroup.dialectName] || "/dialects";
                return (
                  <Card
                    key={dialectGroup.dialectId}
                    className="border-dashed opacity-80 hover:opacity-100 transition-opacity"
                  >
                    <CardContent className="p-5 flex items-center gap-4">
                      <span className="text-3xl">{emoji}</span>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate">
                          {dialectGroup.dialectName}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {dialectGroup.levels.length} level
                          {dialectGroup.levels.length !== 1 ? "s" : ""} available
                        </p>
                      </div>
                      <Link to={salesPage}>
                        <Button variant="outline" size="sm">
                          View Course
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}
