import { useAuth } from "@/contexts/AuthContext";
import { useDashboardData } from "@/hooks/useDashboardData";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { ContinueLearningCard } from "@/components/dashboard/ContinueLearningCard";
import { LevelProgressCard } from "@/components/dashboard/LevelProgressCard";
import { RecentActivityList } from "@/components/dashboard/RecentActivityList";
import { QuizResultsList } from "@/components/dashboard/QuizResultsList";
import { CertificatesList } from "@/components/dashboard/CertificatesList";
import { Skeleton } from "@/components/ui/skeleton";

const dialectEmojis: Record<string, string> = {
  "Gulf Arabic": "🏜️",
  "Egyptian Arabic": "🏛️",
  "Modern Standard Arabic (Fusha)": "📚",
};

export default function Dashboard() {
  const { profile } = useAuth();
  const { 
    levelsByDialect,
    recentActivity, 
    quizResults, 
    certificates, 
    hasLevelAccess,
    isLoading 
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

  return (
    <DashboardLayout>
      <div className="space-y-8">
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

        {/* Progress by Dialect & Level */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Your Progress
          </h2>
          <div className="space-y-6">
            {levelsByDialect.map((dialectGroup) => {
              const emoji = dialectEmojis[dialectGroup.dialectName] || "📖";
              return (
                <div key={dialectGroup.dialectId} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{emoji}</span>
                    <h3 className="text-lg font-medium text-foreground">
                      {dialectGroup.dialectName}
                    </h3>
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {dialectGroup.levels.map((level) => (
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
                        hasAccess={hasLevelAccess(level.levelId, level.dialectId)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Activity & Quiz Results */}
        <div className="grid lg:grid-cols-2 gap-6">
          <RecentActivityList activities={recentActivity} />
          <QuizResultsList results={quizResults} />
        </div>

        {/* Certificates */}
        <CertificatesList certificates={certificates} />
      </div>
    </DashboardLayout>
  );
}
