import { useParams, Link, useNavigate } from "react-router-dom";
import { useUnitLessons } from "@/hooks/useLearning";
import { useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ChevronRight, 
  Check, 
  Play, 
  Lock, 
  Trophy,
  BookOpen,
  CheckCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function UnitOverview() {
  const { unitId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, isLoading } = useUnitLessons(unitId);

  if (isLoading) {
    return (
      <Layout>
        <div className="container max-w-4xl py-8 space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32 w-full" />
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
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
          <h1 className="text-2xl font-bold text-foreground">Unit not found</h1>
          <Button asChild className="mt-6">
            <Link to="/dialects">Browse Dialects</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const { unit, lessons, quiz, quizAttempts, completedCount, totalCount } = data;
  const level = unit.levels as any;
  const dialect = level?.dialects as any;
  
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const allLessonsComplete = completedCount === totalCount;
  const hasPassed = quizAttempts?.some((a: any) => a.passed);
  const bestScore = quizAttempts?.length > 0 
    ? Math.max(...quizAttempts.map((a: any) => a.score)) 
    : null;

  // Find first incomplete lesson
  const firstIncompleteLesson = lessons.find(l => !l.completed);
  const continueLesson = firstIncompleteLesson || lessons[0];

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        {/* Header */}
        <div className="border-b bg-background/80 backdrop-blur-sm">
          <div className="container max-w-4xl py-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Link to={`/learn/dialect/${dialect?.id}`} className="hover:text-foreground transition-colors">
                {dialect?.name}
              </Link>
              <span>/</span>
              <Link to={`/learn/level/${level?.id}`} className="hover:text-foreground transition-colors">
                {level?.name}
              </Link>
            </div>
            
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground">{unit.title}</h1>
                {unit.description && (
                  <p className="text-muted-foreground mt-1">{unit.description}</p>
                )}
              </div>
              {hasPassed && (
                <Badge variant="default" className="gap-1 bg-green-600">
                  <Trophy className="h-3 w-3" />
                  Completed
                </Badge>
              )}
            </div>

            {/* Progress */}
            <div className="mt-6 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Lesson Progress</span>
                <span className="font-medium">{completedCount}/{totalCount} lessons</span>
              </div>
              <Progress value={progressPercent} className="h-3" />
            </div>

            {/* Continue Button */}
            {user && continueLesson && !hasPassed && (
              <Button
                size="lg"
                onClick={() => navigate(`/learn/lesson/${continueLesson.id}`)}
                className="mt-6 gap-2"
              >
                <Play className="h-5 w-5" />
                {completedCount === 0 ? "Start Learning" : "Continue Learning"}
              </Button>
            )}
            
            {!user && (
              <Button asChild size="lg" className="mt-6">
                <Link to="/login">Log in to Start Learning</Link>
              </Button>
            )}
          </div>
        </div>

        <div className="container max-w-4xl py-8 space-y-8">
          {/* Lessons List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Lessons
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {lessons.map((lesson, index) => (
                  <Link
                    key={lesson.id}
                    to={user ? `/learn/lesson/${lesson.id}` : "/login"}
                    className={cn(
                      "flex items-center gap-4 p-4 transition-colors hover:bg-muted/50",
                      lesson.completed && "bg-green-50 dark:bg-green-950/20"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center font-medium shrink-0",
                      lesson.completed
                        ? "bg-green-600 text-white"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {lesson.completed ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">{lesson.title}</p>
                      <p className="text-sm text-muted-foreground truncate" dir="rtl">
                        {lesson.arabic_text}
                      </p>
                    </div>

                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quiz Section */}
          {quiz && (
            <Card className={cn(
              "border-2",
              hasPassed 
                ? "border-green-500 bg-green-50 dark:bg-green-950/20" 
                : allLessonsComplete 
                ? "border-primary" 
                : "border-muted"
            )}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center",
                      hasPassed
                        ? "bg-green-600 text-white"
                        : allLessonsComplete
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {hasPassed ? (
                        <Trophy className="h-6 w-6" />
                      ) : allLessonsComplete ? (
                        <Play className="h-6 w-6" />
                      ) : (
                        <Lock className="h-6 w-6" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Unit Quiz</h3>
                      {hasPassed ? (
                        <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                          <CheckCircle className="h-4 w-4" />
                          Passed with {bestScore}% score
                        </p>
                      ) : allLessonsComplete ? (
                        <p className="text-sm text-muted-foreground">
                          Complete all lessons to unlock • Pass with 70%
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Complete all {totalCount} lessons to unlock
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {user && (allLessonsComplete || hasPassed) && (
                    <Button
                      onClick={() => navigate(`/learn/quiz/${quiz.id}`)}
                      variant={hasPassed ? "outline" : "default"}
                    >
                      {hasPassed ? "Retake Quiz" : "Start Quiz"}
                    </Button>
                  )}
                </div>

                {quizAttempts && quizAttempts.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-2">Previous Attempts</p>
                    <div className="flex flex-wrap gap-2">
                      {quizAttempts.slice(0, 5).map((attempt: any, i: number) => (
                        <Badge
                          key={i}
                          variant={attempt.passed ? "default" : "secondary"}
                          className={attempt.passed ? "bg-green-600" : ""}
                        >
                          {attempt.score}%
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}
