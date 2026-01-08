import { Link } from "react-router-dom";
import { Play, BookOpen, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RecentActivity } from "@/hooks/useDashboardData";
import { formatDistanceToNow } from "date-fns";

interface ContinueLearningCardProps {
  lastActivity: RecentActivity | null;
  hasAnyProgress: boolean;
}

export function ContinueLearningCard({ lastActivity, hasAnyProgress }: ContinueLearningCardProps) {
  if (!hasAnyProgress) {
    // Onboarding card for new users
    return (
      <Card className="bg-hero-gradient text-primary-foreground overflow-hidden">
        <CardContent className="p-6 lg:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h2 className="text-2xl lg:text-3xl font-bold mb-2">
                Start Your Arabic Journey 🎯
              </h2>
              <p className="text-primary-foreground/80 mb-4">
                Begin with the most essential phrases - Greetings & Introductions. 
                Master the basics and build your confidence!
              </p>
              <div className="flex items-center gap-4 text-sm text-primary-foreground/70">
                <span className="flex items-center gap-1">
                  <BookOpen className="w-4 h-4" />
                  Choose a dialect
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  10 min/day recommended
                </span>
              </div>
            </div>
            <Link to="/dialects">
              <Button size="lg" variant="secondary" className="whitespace-nowrap">
                <Play className="w-5 h-5 mr-2" />
                Start with a Dialect
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Continue learning card for returning users
  return (
    <Card className="bg-hero-gradient text-primary-foreground overflow-hidden">
      <CardContent className="p-6 lg:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <p className="text-primary-foreground/70 text-sm mb-1">Continue where you left off</p>
            <h2 className="text-2xl lg:text-3xl font-bold mb-2">
              {lastActivity?.lessonTitle || "Your next lesson"}
            </h2>
            <div className="flex items-center gap-4 text-sm text-primary-foreground/80">
              <span className="flex items-center gap-1">
                <BookOpen className="w-4 h-4" />
                {lastActivity?.unitTitle} • {lastActivity?.dialectName}
              </span>
              {lastActivity?.completedAt && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatDistanceToNow(new Date(lastActivity.completedAt), { addSuffix: true })}
                </span>
              )}
            </div>
          </div>
          <Link to={`/lesson/${lastActivity?.lessonId}`}>
            <Button size="lg" variant="secondary" className="whitespace-nowrap">
              <Play className="w-5 h-5 mr-2" />
              Resume Learning
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
