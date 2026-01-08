import { useAuth } from "@/contexts/AuthContext";
import { useDashboardData } from "@/hooks/useDashboardData";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { ContinueLearningCard } from "@/components/dashboard/ContinueLearningCard";
import { DialectProgressCard } from "@/components/dashboard/DialectProgressCard";
import { RecentActivityList } from "@/components/dashboard/RecentActivityList";
import { QuizResultsList } from "@/components/dashboard/QuizResultsList";
import { CertificatesList } from "@/components/dashboard/CertificatesList";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { profile } = useAuth();
  const { 
    dialectProgress, 
    recentActivity, 
    quizResults, 
    certificates, 
    hasAccess,
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

        {/* Progress by Dialect */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Your Progress
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dialectProgress.map((dialect) => (
              <DialectProgressCard
                key={dialect.dialectId}
                dialectId={dialect.dialectId}
                dialectName={dialect.dialectName}
                completedLessons={dialect.completedLessons}
                totalLessons={dialect.totalLessons}
                completedUnits={dialect.completedUnits}
                totalUnits={dialect.totalUnits}
                progressPercent={dialect.progressPercent}
                hasAccess={hasAccess(dialect.dialectId)}
              />
            ))}
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
