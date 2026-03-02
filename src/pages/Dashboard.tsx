import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useDashboardData } from "@/hooks/useDashboardData";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { ContinueLearningCard } from "@/components/dashboard/ContinueLearningCard";
import { LevelProgressCard } from "@/components/dashboard/LevelProgressCard";
import { RecentActivityList } from "@/components/dashboard/RecentActivityList";
import { QuizResultsList } from "@/components/dashboard/QuizResultsList";
import { CertificatesList } from "@/components/dashboard/CertificatesList";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, ArrowRight, Sparkles, Globe } from "lucide-react";

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

  // Separate dialects into: owned (has at least one unlocked level) vs other
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

  const hasAnyPurchase = ownedDialects.length > 0;

  // ===== FREE USER DASHBOARD (no purchases) =====
  if (!hasAnyPurchase) {
    return (
      <DashboardLayout>
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
                <Link to="/learn/lesson/d4e5f6a7-0101-0101-0101-000000000001">
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
      <div className="space-y-10">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-1">
            Welcome, {firstName} 👋
          </h1>
          <p className="text-muted-foreground">
            Track your progress and continue learning Arabic
          </p>
        </div>

        {/* Continue Learning CTA */}
        <ContinueLearningCard
          lastActivity={lastActivity}
          hasAnyProgress={hasAnyProgress}
        />

        {/* ===== YOUR COURSE SECTION ===== */}
        {ownedDialects.map((dialectGroup) => {
          const emoji = dialectEmojis[dialectGroup.dialectName] || "📖";
          const unlockedLevels = dialectGroup.levels.filter((l) =>
            hasLevelAccess(l.levelId, l.dialectId)
          );
          const lockedLevels = dialectGroup.levels.filter(
            (l) => !hasLevelAccess(l.levelId, l.dialectId)
          );

          return (
            <div key={dialectGroup.dialectId} className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">{emoji}</span>
                  <h2 className="text-xl font-semibold text-foreground">
                    Your Course
                  </h2>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {unlockedLevels.map((level) => (
                    <LevelProgressCard
                      key={level.levelId}
                      levelId={level.levelId}
                      levelName={level.levelName}
                      dialectId={level.dialectId}
                      completedLessons={level.completedLessons}
                      totalLessons={level.totalLessons}
                      completedUnits={level.completedUnits}
                      totalUnits={level.totalUnits}
                      progressPercent={level.progressPercent}
                      hasAccess={true}
                    />
                  ))}
                </div>
              </div>

              {lockedLevels.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    <h2 className="text-xl font-semibold text-foreground">
                      Unlock More Levels
                    </h2>
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {lockedLevels.map((level) => (
                      <LockedLevelCard
                        key={level.levelId}
                        levelName={level.levelName}
                        dialectId={level.dialectId}
                        dialectName={dialectGroup.dialectName}
                        totalLessons={level.totalLessons}
                        totalUnits={level.totalUnits}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Activity & Quiz Results */}
        <div className="grid lg:grid-cols-2 gap-6">
          <RecentActivityList activities={recentActivity} />
          <QuizResultsList results={quizResults} />
        </div>

        {/* Certificates */}
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

/* ──────────── Locked Level Card ──────────── */

function LockedLevelCard({
  levelName,
  dialectId,
  dialectName,
  totalLessons,
  totalUnits,
}: {
  levelName: string;
  dialectId: string;
  dialectName: string;
  totalLessons: number;
  totalUnits: number;
}) {
  const upgradeLink =
    dialectSalesPages[dialectName]
      ? `${dialectSalesPages[dialectName]}#choose-your-plan`
      : `/dialects`;

  const isComingSoon = totalLessons === 0;

  return (
    <Card className="relative overflow-hidden opacity-60 hover:opacity-80 transition-opacity">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
            <Lock className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-foreground">{levelName}</h4>
            {isComingSoon ? (
              <p className="text-xs text-muted-foreground mt-1">🔜 Coming Soon</p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">
                {totalUnits} units · {totalLessons} lessons
              </p>
            )}
            {!isComingSoon && (
              <Link to={upgradeLink} className="mt-3 block">
                <Button size="sm" variant="outline" className="w-full gap-1 text-xs">
                  Upgrade to Unlock
                  <ArrowRight className="w-3 h-3" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
