import { Link } from "react-router-dom";
import { Lock, ArrowRight, BookOpen, GraduationCap, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface LevelProgressCardProps {
  levelId: string;
  levelName: string;
  dialectId: string;
  completedLessons: number;
  totalLessons: number;
  completedUnits: number;
  totalUnits: number;
  progressPercent: number;
  hasAccess: boolean;
}

const levelConfig: Record<string, { icon: typeof BookOpen; colorClass: string; bgClass: string }> = {
  "Beginner": { 
    icon: BookOpen, 
    colorClass: "text-emerald-600 dark:text-emerald-400",
    bgClass: "bg-emerald-100 dark:bg-emerald-900/30"
  },
  "Intermediate": { 
    icon: GraduationCap, 
    colorClass: "text-blue-600 dark:text-blue-400",
    bgClass: "bg-blue-100 dark:bg-blue-900/30"
  },
  "Advanced": { 
    icon: Trophy, 
    colorClass: "text-purple-600 dark:text-purple-400",
    bgClass: "bg-purple-100 dark:bg-purple-900/30"
  },
};

export function LevelProgressCard({
  levelId,
  levelName,
  dialectId,
  completedLessons,
  totalLessons,
  completedUnits,
  totalUnits,
  progressPercent,
  hasAccess,
}: LevelProgressCardProps) {
  const config = levelConfig[levelName] || levelConfig["Beginner"];
  const Icon = config.icon;
  const isComingSoon = totalLessons === 0;

  if (isComingSoon) {
    return (
      <Card className="relative overflow-hidden opacity-60">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", config.bgClass)}>
              <Icon className={cn("w-5 h-5", config.colorClass)} />
            </div>
            <CardTitle className="text-base">{levelName}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <span className="text-sm text-muted-foreground">🔜 Coming Soon</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-300 hover:shadow-md",
      !hasAccess && "opacity-75"
    )}>
      {!hasAccess && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center p-4">
          <div className="text-center max-w-[180px]">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-2">
              <Lock className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mb-3">Content Locked</p>
            <Link to="/pricing">
              <Button size="sm" className="w-full text-xs">
                Upgrade
              </Button>
            </Link>
          </div>
        </div>
      )}

      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", config.bgClass)}>
            <Icon className={cn("w-5 h-5", config.colorClass)} />
          </div>
          <CardTitle className="text-base">{levelName}</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Progress Bar */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium text-foreground">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="p-2 bg-accent/50 rounded-lg">
            <p className="text-lg font-bold text-foreground">{completedLessons}</p>
            <p className="text-[10px] text-muted-foreground">of {totalLessons} lessons</p>
          </div>
          <div className="p-2 bg-accent/50 rounded-lg">
            <p className="text-lg font-bold text-foreground">{completedUnits}</p>
            <p className="text-[10px] text-muted-foreground">of {totalUnits} units</p>
          </div>
        </div>

        {/* Continue Button */}
        {hasAccess && (
          <Link to={`/learn/level/${levelId}`}>
            <Button className="w-full" variant="outline" size="sm">
              Continue
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
