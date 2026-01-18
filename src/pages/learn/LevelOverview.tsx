import { useParams, Link, useNavigate } from "react-router-dom";
import { useLevelUnits } from "@/hooks/useLearning";
import { useAuth } from "@/contexts/AuthContext";
import { usePurchases } from "@/hooks/usePurchases";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  ChevronRight, 
  Lock,
  Trophy,
  BookOpen,
  CheckCircle,
  Gift,
  ShoppingCart
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isFreeTrial } from "@/lib/accessControl";

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

  const { level, units } = data;
  const dialect = level.dialects as any;

  // Check if user has purchased access to this level
  const hasPurchaseAccess = user ? checkLevelAccess(
    level.id,
    dialect?.id || '',
    level.order_index,
    1 // Unit order index doesn't matter for level access check
  ) : false;

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
          <div className="container max-w-4xl py-8">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Link to={`/learn/dialect/${dialect?.id}`} className="hover:text-foreground transition-colors">
                {dialect?.name}
              </Link>
            </div>
            
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-4xl font-bold text-foreground">{level.name}</h1>
                <p className="text-muted-foreground mt-2">
                  {totalUnits} units • Master everyday {dialect?.name} conversations
                </p>
              </div>
              {completedUnits === totalUnits && totalUnits > 0 && (
                <Badge variant="default" className="gap-1 bg-green-600 text-lg py-1 px-3">
                  <Trophy className="h-4 w-4" />
                  Completed
                </Badge>
              )}
            </div>

            {user && (
              <div className="mt-6 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Level Progress</span>
                  <span className="font-medium">{completedUnits}/{totalUnits} units completed</span>
                </div>
                <Progress value={overallProgress} className="h-3" />
              </div>
            )}
          </div>
        </div>

        {/* Units Grid */}
        <div className="container max-w-4xl py-8">
          <div className="grid gap-4">
            {units.map((unit, index) => {
              const progress = progressData?.[unit.id];
              const isCompleted = progress?.quizPassed;
              const lessonProgress = progress 
                ? (progress.completed / progress.total) * 100 
                : 0;
              const isFreeTrialUnit = isFreeTrial(level.order_index, unit.order_index);
              // Unit is locked if: not free trial AND (not logged in OR no purchase access)
              const isLocked = !isFreeTrialUnit && (!user || !hasPurchaseAccess);

              return (
                <Card 
                  key={unit.id}
                  className={cn(
                    "transition-all hover:shadow-md",
                    isCompleted && "border-green-500/50 bg-green-50/50 dark:bg-green-950/20",
                    isFreeTrialUnit && !isCompleted && "border-amber-400/50 bg-amber-50/30 dark:bg-amber-950/20",
                    isLocked && "opacity-50"
                  )}
                >
                  <CardContent className="p-0">
                    <Link
                      to={isLocked ? "#" : `/learn/unit/${unit.id}`}
                      className={cn(
                        "flex items-center gap-4 p-6",
                        isLocked && "pointer-events-none"
                      )}
                    >
                      {/* Unit Number */}
                      <div className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-lg shrink-0",
                        isCompleted
                          ? "bg-green-600 text-white"
                          : isLocked
                          ? "bg-muted text-muted-foreground"
                          : isFreeTrialUnit
                          ? "bg-amber-500 text-white"
                          : "bg-primary/10 text-primary"
                      )}>
                        {isCompleted ? (
                          <CheckCircle className="h-7 w-7" />
                        ) : isLocked ? (
                          <Lock className="h-6 w-6" />
                        ) : isFreeTrialUnit ? (
                          <Gift className="h-6 w-6" />
                        ) : (
                          index + 1
                        )}
                      </div>

                      {/* Unit Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-lg text-foreground">
                            {unit.title}
                          </h3>
                          {isFreeTrialUnit && !isCompleted && (
                            <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                              <Gift className="h-3 w-3 mr-1" />
                              Free Trial
                            </Badge>
                          )}
                          {isCompleted && (
                            <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                              <Trophy className="h-3 w-3 mr-1" />
                              Complete
                            </Badge>
                          )}
                        </div>
                        {unit.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                            {unit.description}
                          </p>
                        )}
                        
                        {/* Progress Bar */}
                        {user && progress && !isLocked && (
                          <div className="mt-3 flex items-center gap-3">
                            <Progress value={lessonProgress} className="flex-1 h-1.5" />
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {progress.completed}/{progress.total}
                            </span>
                          </div>
                        )}
                      </div>

                      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Purchase prompt for logged-in users without access */}
          {user && !hasPurchaseAccess && (
            <Card className="mt-8 border-amber-400/50 bg-amber-50/30 dark:bg-amber-950/20">
              <CardContent className="p-6 text-center">
                <Lock className="h-12 w-12 mx-auto text-amber-600 dark:text-amber-400 mb-4" />
                <h3 className="text-xl font-semibold mb-2">Unlock {level.name}</h3>
                <p className="text-muted-foreground mb-4">
                  Purchase this level to access all units and earn your certificate
                </p>
                <Button asChild className="gap-2">
                  <Link to="/pricing">
                    <ShoppingCart className="h-4 w-4" />
                    View Pricing
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {!user && (
            <Card className="mt-8 border-primary/50 bg-primary/5">
              <CardContent className="p-6 text-center">
                <BookOpen className="h-12 w-12 mx-auto text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">Track Your Progress</h3>
                <p className="text-muted-foreground mb-4">
                  Create a free account to save your progress and earn certificates
                </p>
                <Button asChild>
                  <Link to="/signup">Get Started Free</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}
