import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  ChevronRight,
  Lock,
  Trophy,
  CheckCircle,
  Gift,
  Loader2,
  PlayCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type UnitCardStatus =
  | "not-started"
  | "in-progress"
  | "completed"
  | "locked"
  | "loading";

export type UnitCardBadge = "free" | "completed" | "in-progress" | "unlocked" | "locked" | null;

export interface UnitCardProps {
  index: number;
  title: string;
  description?: string | null;
  href: string;
  status: UnitCardStatus;
  badge?: UnitCardBadge;
  progress?: {
    completed: number;
    total: number;
    /** Optional short label shown after the numeric progress (e.g. "cards"). */
    label?: string;
  } | null;
  className?: string;
}

/**
 * Shared Unit Card used across every course (Gulf, Spoken Arabic, MSA, …).
 * Mirrors the Gulf Arabic → Beginner unit list design.
 */
export function UnitCard({
  index,
  title,
  description,
  href,
  status,
  badge = null,
  progress,
  className,
}: UnitCardProps) {
  const isCompleted = status === "completed";
  const isLocked = status === "locked";
  const isInProgress = status === "in-progress";
  const isLoading = status === "loading";
  const isFreeBadge = badge === "free";

  const pct =
    progress && progress.total > 0
      ? Math.min(100, Math.round((progress.completed / progress.total) * 100))
      : 0;

  return (
    <Card
      className={cn(
        "transition-all hover:shadow-md",
        isCompleted && "border-green-500/50 bg-green-50/50 dark:bg-green-950/20",
        isFreeBadge && !isCompleted && "border-amber-400/50 bg-amber-50/30 dark:bg-amber-950/20",
        isLocked && "opacity-60",
        className
      )}
    >
      <CardContent className="p-0">
        <Link
          to={isLocked ? "#" : href}
          aria-disabled={isLocked}
          tabIndex={isLocked ? -1 : 0}
          className={cn(
            "flex items-center gap-3 sm:gap-4 p-4 sm:p-6",
            isLocked && "pointer-events-none"
          )}
        >
          {/* Status Icon */}
          <div
            className={cn(
              "w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center font-bold text-base sm:text-lg shrink-0",
              isCompleted
                ? "bg-green-600 text-white"
                : isLocked
                ? "bg-muted text-muted-foreground"
                : isFreeBadge
                ? "bg-amber-500 text-white"
                : isInProgress
                ? "bg-primary text-primary-foreground"
                : "bg-primary/10 text-primary"
            )}
          >
            {isCompleted ? (
              <CheckCircle className="h-5 w-5 sm:h-7 sm:w-7" />
            ) : isLocked ? (
              <Lock className="h-4 w-4 sm:h-6 sm:w-6" />
            ) : isLoading ? (
              <Loader2 className="h-4 w-4 sm:h-6 sm:w-6 animate-spin" />
            ) : isInProgress ? (
              <PlayCircle className="h-5 w-5 sm:h-7 sm:w-7" />
            ) : isFreeBadge ? (
              <Gift className="h-4 w-4 sm:h-6 sm:w-6" />
            ) : (
              index
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start sm:items-center gap-1.5 sm:gap-2 flex-wrap">
              <h3 className="font-semibold text-base sm:text-lg text-foreground line-clamp-1">
                {title}
              </h3>
              {badge === "free" && !isCompleted && (
                <Badge
                  variant="secondary"
                  className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-2 sm:py-0.5"
                >
                  <Gift className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                  Free
                </Badge>
              )}
              {badge === "completed" && (
                <Badge
                  variant="secondary"
                  className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-2 sm:py-0.5"
                >
                  <Trophy className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                  Done
                </Badge>
              )}
              {badge === "in-progress" && (
                <Badge
                  variant="secondary"
                  className="bg-primary/10 text-primary text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-2 sm:py-0.5"
                >
                  In Progress
                </Badge>
              )}
              {badge === "unlocked" && (
                <Badge
                  variant="secondary"
                  className="bg-primary/10 text-primary text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-2 sm:py-0.5"
                >
                  Unlocked
                </Badge>
              )}
              {badge === "locked" && (
                <Badge
                  variant="secondary"
                  className="text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-2 sm:py-0.5"
                >
                  <Lock className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                  Locked
                </Badge>
              )}
            </div>
            {description && (
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 line-clamp-1">
                {description}
              </p>
            )}

            {/* Progress bar */}
            {progress && progress.total > 0 && !isLocked && (
              <div className="mt-2 sm:mt-3 flex items-center gap-2 sm:gap-3">
                <Progress value={pct} className="flex-1 h-1 sm:h-1.5" />
                <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">
                  {progress.completed}/{progress.total}
                  {progress.label ? ` ${progress.label}` : ""}
                </span>
              </div>
            )}
          </div>

          <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" />
        </Link>
      </CardContent>
    </Card>
  );
}
