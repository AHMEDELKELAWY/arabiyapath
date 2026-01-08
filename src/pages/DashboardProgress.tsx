import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, Circle, ArrowRight, BookOpen } from "lucide-react";
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
}

export default function DashboardProgress() {
  const { user } = useAuth();
  const [selectedDialect, setSelectedDialect] = useState<string>("all");

  // Fetch dialects
  const { data: dialects } = useQuery({
    queryKey: ["dialects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dialects")
        .select("id, name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch full progress data
  const { data: progressData, isLoading } = useQuery({
    queryKey: ["detailed-progress", user?.id, selectedDialect],
    queryFn: async () => {
      if (!user) return [];

      // Fetch all dialects with units and lessons
      let dialectQuery = supabase
        .from("dialects")
        .select(`
          id,
          name,
          levels (
            id,
            name,
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

      if (selectedDialect !== "all") {
        dialectQuery = dialectQuery.eq("id", selectedDialect);
      }

      const { data: dialectsData, error: dialectsError } = await dialectQuery;
      if (dialectsError) throw dialectsError;

      // Fetch user progress
      const { data: userProgress, error: progressError } = await supabase
        .from("user_progress")
        .select("lesson_id, completed_at")
        .eq("user_id", user.id);

      if (progressError) throw progressError;

      const completedLessonIds = new Set(userProgress?.map((p) => p.lesson_id));

      // Build unit progress
      const unitProgressList: (UnitProgress & { dialectName: string; dialectId: string })[] = [];

      dialectsData?.forEach((dialect) => {
        dialect.levels?.forEach((level) => {
          level.units?.forEach((unit) => {
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

            unitProgressList.push({
              dialectId: dialect.id,
              dialectName: dialect.name,
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
            });
          });
        });
      });

      return unitProgressList;
    },
    enabled: !!user,
  });

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

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-1">
              Detailed Progress
            </h1>
            <p className="text-muted-foreground">
              Track your learning progress across all units
            </p>
          </div>

          {/* Dialect Filter */}
          <Select value={selectedDialect} onValueChange={setSelectedDialect}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by dialect" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Dialects</SelectItem>
              {dialects?.map((dialect) => (
                <SelectItem key={dialect.id} value={dialect.id}>
                  {dialect.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Progress List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : progressData && progressData.length > 0 ? (
          <div className="space-y-4">
            {progressData.map((unit) => (
              <Card key={unit.unitId} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4 p-6">
                    {/* Status Icon */}
                    <div className="flex-shrink-0">
                      {getStatusIcon(unit.status)}
                    </div>

                    {/* Unit Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground">
                          {unit.unitTitle}
                        </h3>
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                          {unit.dialectName}
                        </span>
                      </div>
                      {unit.description && (
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-1">
                          {unit.description}
                        </p>
                      )}
                      
                      {/* Progress Bar */}
                      <div className="flex items-center gap-3">
                        <Progress value={unit.progressPercent} className="h-2 flex-1" />
                        <span className="text-sm font-medium text-foreground w-12 text-right">
                          {unit.progressPercent}%
                        </span>
                      </div>
                      
                      <p className="text-xs text-muted-foreground mt-1">
                        {unit.completedLessons} of {unit.totalLessons} lessons completed
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 lg:flex-shrink-0">
                      <span
                        className={cn(
                          "text-xs font-medium px-2 py-1 rounded",
                          unit.status === "completed" && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                          unit.status === "in_progress" && "bg-primary/10 text-primary",
                          unit.status === "not_started" && "bg-muted text-muted-foreground"
                        )}
                      >
                        {getStatusLabel(unit.status)}
                      </span>
                      
                      {unit.status !== "completed" && unit.lastLessonId && (
                        <Link to={`/learn/lesson/${unit.lastLessonId}`}>
                          <Button size="sm" variant="outline" className="gap-1">
                            {unit.status === "not_started" ? "Start" : "Continue"}
                            <ArrowRight className="w-3 h-3" />
                          </Button>
                        </Link>
                      )}
                      
                      <Link to={`/learn/unit/${unit.unitId}`}>
                        <Button size="sm" variant="ghost" className="gap-1">
                          <BookOpen className="w-3 h-3" />
                          View Unit
                        </Button>
                      </Link>
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
      </div>
    </DashboardLayout>
  );
}
