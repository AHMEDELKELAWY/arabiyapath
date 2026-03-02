import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePurchases } from "@/hooks/usePurchases";
import { isFreeTrial } from "@/lib/accessControl";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Circle, ArrowRight, BookOpen, Lock, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";

interface UnitProgress {
  unitId: string;
  unitTitle: string;
  description: string | null;
  totalLessons: number;
  completedLessons: number;
  status: "not_started" | "in_progress" | "completed";
  progressPercent: number;
  lastLessonId?: string;
  lastLessonTitle?: string;
  levelId: string;
  levelOrderIndex: number;
  unitOrderIndex: number;
}

export default function DashboardProgress() {
  const { user } = useAuth();
  const { purchases, isLoading: purchasesLoading, checkLevelAccess } = usePurchases();

  // Fetch full progress data — auto-filtered to purchased content
  const { data: progressData, isLoading } = useQuery({
    queryKey: ["detailed-progress", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: dialectsData, error: dialectsError } = await supabase
        .from("dialects")
        .select(`
          id,
          name,
          levels (
            id,
            name,
            order_index,
            units (
              id,
              title,
              description,
              order_index,
              lessons (
                id,
                title,
                order_index
              )
            )
          )
        `);

      if (dialectsError) throw dialectsError;

      const { data: userProgress, error: progressError } = await supabase
        .from("user_progress")
        .select("lesson_id, completed_at")
        .eq("user_id", user.id);

      if (progressError) throw progressError;

      const completedLessonIds = new Set(userProgress?.map((p) => p.lesson_id));

      const unitProgressList: (UnitProgress & { dialectName: string; dialectId: string; hasAccess: boolean })[] = [];

      dialectsData?.forEach((dialect) => {
        dialect.levels?.forEach((level) => {
          const levelOrderIndex = level.order_index || 1;

          level.units?.forEach((unit) => {
            const unitOrderIndex = unit.order_index || 1;
            const lessons = unit.lessons || [];
            const completedLessons = lessons.filter((l) =>
              completedLessonIds.has(l.id)
            ).length;

            const status: "not_started" | "in_progress" | "completed" =
              completedLessons === 0
                ? "not_started"
                : completedLessons === lessons.length
                  ? "completed"
                  : "in_progress";

            const sortedLessons = [...lessons].sort((a, b) => a.order_index - b.order_index);
            const lastIncompleteLesson = sortedLessons.find(
              (l) => !completedLessonIds.has(l.id)
            );

            const isFree = isFreeTrial(levelOrderIndex, unitOrderIndex);
            const hasAccess = isFree || checkLevelAccess(level.id, dialect.id, levelOrderIndex, unitOrderIndex);

            unitProgressList.push({
              dialectId: dialect.id,
              dialectName: dialect.name,
              levelId: level.id,
              levelOrderIndex,
              unitOrderIndex,
              unitId: unit.id,
              unitTitle: unit.title,
              description: unit.description,
              totalLessons: lessons.length,
              completedLessons,
              status,
              progressPercent: lessons.length > 0
                ? Math.round((completedLessons / lessons.length) * 100)
                : 0,
              lastLessonId: lastIncompleteLesson?.id,
              lastLessonTitle: lastIncompleteLesson?.title,
              hasAccess,
            });
          });
        });
      });

      return unitProgressList;
    },
    enabled: !!user,
  });

  // Split into accessible vs locked
  const accessibleUnits = progressData?.filter((u) => u.hasAccess) || [];
  const lockedUnits = progressData?.filter((u) => !u.hasAccess) || [];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case "in_progress":
        return <Circle className="w-5 h-5 text-primary fill-primary/20" />;
      default:
        return <Circle className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed":
        return "Completed";
      case "in_progress":
        return "In Progress";
      default:
        return "Not Started";
    }
  };

  const hasAnyPurchase = purchases && purchases.length > 0;

  // Free user — no purchases
  if (!purchasesLoading && !hasAnyPurchase) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">
              Detailed Progress
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Purchase a course to start tracking your progress
            </p>
          </div>
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No active courses
              </h3>
              <p className="text-muted-foreground mb-4">
                Get started with a free lesson or explore our courses.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link to="/free-gulf-lesson">
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
      <div className="space-y-6 sm:space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">
            Detailed Progress
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Track your learning progress across your purchased units
          </p>
        </div>

        {/* Progress List — accessible units */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : accessibleUnits.length > 0 ? (
          <div className="space-y-4">
            {accessibleUnits.map((unit) => (
              <Card key={unit.unitId} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex flex-col gap-4 p-4 sm:p-6">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getStatusIcon(unit.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground text-sm sm:text-base">
                            {unit.unitTitle}
                          </h3>
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                            {unit.dialectName}
                          </span>
                        </div>
                        {unit.description && (
                          <p className="text-xs sm:text-sm text-muted-foreground mb-3 line-clamp-2 sm:line-clamp-1">
                            {unit.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3">
                          <Progress value={unit.progressPercent} className="h-2 flex-1" />
                          <span className="text-xs sm:text-sm font-medium text-foreground w-10 sm:w-12 text-right">
                            {unit.progressPercent}%
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {unit.completedLessons} of {unit.totalLessons} lessons completed
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 pt-2 border-t sm:border-0 sm:pt-0">
                      <span
                        className={cn(
                          "text-xs font-medium px-2 py-1 rounded text-center sm:text-left",
                          unit.status === "completed" && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                          unit.status === "in_progress" && "bg-primary/10 text-primary",
                          unit.status === "not_started" && "bg-muted text-muted-foreground"
                        )}
                      >
                        {getStatusLabel(unit.status)}
                      </span>
                      <div className="flex gap-2 sm:ml-auto">
                        {unit.status !== "completed" && unit.lastLessonId && (
                          <Link to={`/learn/lesson/${unit.lastLessonId}`} className="flex-1 sm:flex-initial">
                            <Button size="sm" variant="outline" className="gap-1 w-full sm:w-auto">
                              {unit.status === "not_started" ? "Start" : "Continue"}
                              <ArrowRight className="w-3 h-3" />
                            </Button>
                          </Link>
                        )}
                        <Link to={`/learn/unit/${unit.unitId}`} className="flex-1 sm:flex-initial">
                          <Button size="sm" variant="ghost" className="gap-1 w-full sm:w-auto">
                            <BookOpen className="w-3 h-3" />
                            View
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No units available
              </h3>
              <p className="text-muted-foreground mb-4">
                Start learning to see your progress here
              </p>
              <Link to="/dialects">
                <Button>Browse Dialects</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Locked units — collapsed summary */}
        {lockedUnits.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
              <Lock className="w-4 h-4 text-muted-foreground" />
              Locked Content
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              {lockedUnits.length} unit{lockedUnits.length !== 1 ? "s" : ""} available to unlock. Upgrade your plan to access more content.
            </p>
            <Link to="/gulf-arabic-course#choose-plan">
              <Button variant="outline" size="sm" className="gap-2">
                <ShoppingCart className="w-4 h-4" />
                View Upgrade Options
              </Button>
            </Link>
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}
