import { Briefcase, Handshake, Crown, Check, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import type { FlashCardLevel } from "@/data/flashCardsData";

interface LevelProgressProps {
  levels: FlashCardLevel[];
  currentLevel: 1 | 2 | 3;
  progress: Record<number, number>; // level -> cards reviewed
  onSelectLevel: (level: 1 | 2 | 3) => void;
}

const levelIcons = {
  briefcase: Briefcase,
  handshake: Handshake,
  crown: Crown,
};

export function LevelProgress({
  levels,
  currentLevel,
  progress,
  onSelectLevel,
}: LevelProgressProps) {
  const getProgressPercent = (level: FlashCardLevel) => {
    const reviewed = progress[level.level] || 0;
    return Math.round((reviewed / level.cardCount) * 100);
  };

  const isLevelUnlocked = (level: number) => {
    if (level === 1) return true;
    // Unlock next level when 60% of previous level is reviewed
    const prevProgress = progress[level - 1] || 0;
    const prevLevel = levels.find((l) => l.level === level - 1);
    if (!prevLevel) return false;
    return prevProgress >= Math.ceil(prevLevel.cardCount * 0.6);
  };

  return (
    <div className="w-full space-y-4">
      <h3 className="text-lg font-semibold text-foreground">Your Progress</h3>
      
      <div className="grid gap-3">
        {levels.map((level) => {
          const Icon = levelIcons[level.icon as keyof typeof levelIcons] || Briefcase;
          const progressPercent = getProgressPercent(level);
          const isUnlocked = isLevelUnlocked(level.level);
          const isActive = currentLevel === level.level;
          const isComplete = progressPercent === 100;

          return (
            <button
              key={level.level}
              onClick={() => isUnlocked && onSelectLevel(level.level as 1 | 2 | 3)}
              disabled={!isUnlocked}
              className={cn(
                "relative p-4 rounded-xl text-left transition-all duration-300",
                "border border-border/50",
                isUnlocked
                  ? "hover:border-primary/50 hover:shadow-lg cursor-pointer"
                  : "opacity-60 cursor-not-allowed",
                isActive && "border-primary bg-primary/5 shadow-md",
                isComplete && "border-green-500/50 bg-green-500/5"
              )}
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div
                  className={cn(
                    "p-3 rounded-lg",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : isComplete
                      ? "bg-green-500/20 text-green-600"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {isComplete ? (
                    <Check className="w-5 h-5" />
                  ) : !isUnlocked ? (
                    <Lock className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-muted-foreground">
                      Level {level.level}
                    </span>
                    {isComplete && (
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-500/20 text-green-600">
                        Complete
                      </span>
                    )}
                  </div>
                  <h4 className="font-semibold text-foreground truncate">
                    {level.title}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {level.description}
                  </p>

                  {/* Progress bar */}
                  <div className="mt-3 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">
                        {progress[level.level] || 0} / {level.cardCount} cards
                      </span>
                      <span className="font-medium text-foreground">
                        {progressPercent}%
                      </span>
                    </div>
                    <Progress
                      value={progressPercent}
                      className={cn(
                        "h-2",
                        isComplete && "[&>div]:bg-green-500"
                      )}
                    />
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
