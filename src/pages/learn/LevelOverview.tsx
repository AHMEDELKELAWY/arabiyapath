import { useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { PageNav } from "@/components/learn/PageNav";
import { useLevelUnits } from "@/hooks/useLearning";
import { useAuth } from "@/contexts/AuthContext";
import { usePurchases } from "@/hooks/usePurchases";
import { isGulfArabic, GULF_SALES_URL } from "@/lib/gulfAccess";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Lock,
  Trophy,
  BookOpen,
  ShoppingCart,
} from "lucide-react";
import { isFreeTrial } from "@/lib/accessControl";
import { UnitCard, type UnitCardBadge, type UnitCardStatus } from "@/components/units/UnitCard";

export default function LevelOverview() {
  const { levelId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, isLoading } = useLevelUnits(levelId);
  const { checkLevelAccess, isLoading: purchasesLoading } = usePurchases();

  // Get progress for all units
  const { data: progressData } = useQuery({
    queryKey: ["level-progress", levelId, user?.id],
    queryFn: async () => {
      if (!user || !data?.units) return null;

      const unitProgress: Record<string, { completed: number; total: number; quizPassed: boolean }> = {};

      for (const unit of data.units) {
        const { data: lessons } = await supabase
          .from("lessons")
          .select("id")
          .eq("unit_id", unit.id);

        const lessonIds = lessons?.map(l => l.id) || [];
        
        const { data: progress } = await supabase
          .from("user_progress")
          .select("lesson_id")
          .eq("user_id", user.id)
          .in("lesson_id", lessonIds);

        const { data: quiz } = await supabase
          .from("quizzes")
          .select("id")
          .eq("unit_id", unit.id)
          .maybeSingle();

        let quizPassed = false;
        if (quiz) {
          const { data: attempts } = await supabase
            .from("quiz_attempts")
            .select("passed")
            .eq("user_id", user.id)
            .eq("quiz_id", quiz.id)
            .eq("passed", true)
            .limit(1);
          
          quizPassed = (attempts?.length || 0) > 0;
        }

        unitProgress[unit.id] = {
          completed: progress?.length || 0,
          total: lessonIds.length,
          quizPassed,
        };
      }

      return unitProgress;
    },
    enabled: !!user && !!data?.units,
  });

  // Compute access info before any early returns (hooks can't be after returns)
  const level = data?.level;
  const dialect = (level as any)?.dialects as any;
  const hasPurchaseAccess = user && level ? checkLevelAccess(
    level.id,
    dialect?.id || '',
    level.order_index,
    1
  ) : false;

  // Hard redirect: Gulf Arabic without purchase → sales page
  useEffect(() => {
    if (isLoading || purchasesLoading || !data) return;
    if (isGulfArabic(dialect?.id) && !hasPurchaseAccess) {
      navigate(GULF_SALES_URL, { replace: true });
    }
  }, [isLoading, purchasesLoading, data, dialect?.id, hasPurchaseAccess, navigate]);

  if (isLoading || purchasesLoading) {
    return (
      <Layout>
        <div className="container max-w-4xl py-8 space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-6 w-96" />
          <div className="grid gap-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (!data) {
    return (
      <Layout>
        <div className="container py-16 text-center">
          <h1 className="text-2xl font-bold text-foreground">Level not found</h1>
          <Button asChild className="mt-6">
            <Link to="/dialects">Browse Dialects</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const { units } = data;

  // Calculate overall progress
  const totalUnits = units.length;
  const completedUnits = progressData 
    ? Object.values(progressData).filter(p => p.quizPassed).length 
    : 0;
  const overallProgress = totalUnits > 0 ? (completedUnits / totalUnits) * 100 : 0;

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        {/* Header */}
        <div className="border-b bg-background/80 backdrop-blur-sm">
          <div className="container max-w-4xl py-6 sm:py-8 px-4 sm:px-6">
            <PageNav
              crumbs={[
                { label: "Dashboard", to: "/dashboard" },
                { label: dialect?.name || "Course", to: dialect?.id ? `/learn/dialect/${dialect.id}` : "/dashboard" },
                { label: level.name },
              ]}
              backTo={dialect?.id ? `/learn/dialect/${dialect.id}` : "/dashboard"}
              backLabel={`Back to ${dialect?.name || "Course"}`}
              className="mb-3 sm:mb-4"
            />
            
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">{level.name}</h1>
                <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">
                  {totalUnits} units • Master everyday {dialect?.name} conversations
                </p>
              </div>
              {completedUnits === totalUnits && totalUnits > 0 && (
                <Badge variant="default" className="gap-1 bg-green-600 text-sm sm:text-lg py-1 px-2 sm:px-3 w-fit">
                  <Trophy className="h-3 w-3 sm:h-4 sm:w-4" />
                  Completed
                </Badge>
              )}
            </div>

            {user && (
              <div className="mt-4 sm:mt-6 space-y-2">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-muted-foreground">Level Progress</span>
                  <span className="font-medium">{completedUnits}/{totalUnits} units</span>
                </div>
                <Progress value={overallProgress} className="h-2 sm:h-3" />
              </div>
            )}
          </div>
        </div>

        {/* Units Grid */}
        <div className="container max-w-4xl py-6 sm:py-8 px-4 sm:px-6">
          <div className="grid gap-3 sm:gap-4">
            {units.map((unit, index) => {
              const progress = progressData?.[unit.id];
              const isCompleted = !!progress?.quizPassed;
              const isFreeTrialUnit = isFreeTrial(level.order_index, unit.order_index);
              const isLocked = !isFreeTrialUnit && (!user || !hasPurchaseAccess);
              const isInProgress =
                !!progress && progress.completed > 0 && !isCompleted;

              let status: UnitCardStatus;
              let badge: UnitCardBadge;
              if (isLocked) {
                status = "locked";
                badge = "locked";
              } else if (isCompleted) {
                status = "completed";
                badge = "completed";
              } else if (isInProgress) {
                status = "in-progress";
                badge = isFreeTrialUnit ? "free" : "in-progress";
              } else {
                status = "not-started";
                badge = isFreeTrialUnit ? "free" : null;
              }

              return (
                <UnitCard
                  key={unit.id}
                  index={index + 1}
                  title={unit.title}
                  description={unit.description}
                  href={`/learn/unit/${unit.id}`}
                  status={status}
                  badge={badge}
                  progress={
                    user && progress && !isLocked
                      ? { completed: progress.completed, total: progress.total }
                      : null
                  }
                />
              );
            })}
          </div>


          {/* Purchase prompt for logged-in users without access */}
          {user && !hasPurchaseAccess && (
            <Card className="mt-6 sm:mt-8 border-amber-400/50 bg-amber-50/30 dark:bg-amber-950/20">
              <CardContent className="p-4 sm:p-6 text-center">
                <Lock className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-amber-600 dark:text-amber-400 mb-3 sm:mb-4" />
                <h3 className="text-lg sm:text-xl font-semibold mb-2">Unlock {level.name}</h3>
                <p className="text-sm sm:text-base text-muted-foreground mb-4">
                  Purchase this level to access all units and earn your certificate
                </p>
                <Button asChild className="gap-2 w-full sm:w-auto">
                  <Link to={`/choose-plan/${dialect?.id}`}>
                    <ShoppingCart className="h-4 w-4" />
                    View Plans
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {!user && (
            <Card className="mt-6 sm:mt-8 border-primary/50 bg-primary/5">
              <CardContent className="p-4 sm:p-6 text-center">
                <BookOpen className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-primary mb-3 sm:mb-4" />
                <h3 className="text-lg sm:text-xl font-semibold mb-2">Track Your Progress</h3>
                <p className="text-sm sm:text-base text-muted-foreground mb-4">
                  Create a free account to save your progress and earn certificates
                </p>
                <Button asChild className="w-full sm:w-auto">
                  <Link
                    to={`/signup?redirect=${encodeURIComponent(
                      data?.units?.[0]?.id
                        ? `/learn/unit/${data.units[0].id}`
                        : `/choose-plan/${dialect?.id}`
                    )}`}
                  >
                    Get Started Free
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}
