import { Link } from "react-router-dom";
import { Lock, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface DialectProgressCardProps {
  dialectId: string;
  dialectName: string;
  completedLessons: number;
  totalLessons: number;
  completedUnits: number;
  totalUnits: number;
  progressPercent: number;
  hasAccess: boolean;
}

const dialectEmojis: Record<string, string> = {
  "Gulf Arabic": "🏜️",
  "Egyptian Arabic": "🏛️",
  "Modern Standard Arabic (Fusha)": "📚",
};

export function DialectProgressCard({
  dialectId,
  dialectName,
  completedLessons,
  totalLessons,
  completedUnits,
  totalUnits,
  progressPercent,
  hasAccess,
}: DialectProgressCardProps) {
  const emoji = dialectEmojis[dialectName] || "📖";

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-300 hover:shadow-lg",
      !hasAccess && "opacity-75"
    )}>
      {!hasAccess && (
        <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] z-10 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <Lock className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-3">Content Locked</p>
            <Link to="/pricing">
              <Button size="sm" variant="secondary">
                Upgrade to Access
              </Button>
            </Link>
          </div>
        </div>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{emoji}</span>
          <CardTitle className="text-lg">{dialectName}</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Beginner Level</span>
            <span className="font-medium text-foreground">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="p-3 bg-accent rounded-lg">
            <p className="text-2xl font-bold text-foreground">{completedLessons}</p>
            <p className="text-xs text-muted-foreground">of {totalLessons} lessons</p>
          </div>
          <div className="p-3 bg-accent rounded-lg">
            <p className="text-2xl font-bold text-foreground">{completedUnits}</p>
            <p className="text-xs text-muted-foreground">of {totalUnits} units</p>
          </div>
        </div>

        {/* Continue Button */}
        {hasAccess && (
          <Link to={`/learn/${dialectId}`}>
            <Button className="w-full" variant="outline">
              Continue Learning
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
