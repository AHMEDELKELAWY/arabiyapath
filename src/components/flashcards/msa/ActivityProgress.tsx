import { Progress } from "@/components/ui/progress";

interface Props {
  current: number; // 1-based
  total: number;
  label?: "Card" | "Question";
}

/**
 * Shared progress header for flash card activities (Learn / Listening / Speaking / Test).
 * Pure presentational — no state, no data fetching.
 */
export function ActivityProgress({ current, total, label = "Card" }: Props) {
  const safeTotal = Math.max(total, 1);
  const safeCurrent = Math.min(Math.max(current, 1), safeTotal);
  const pct = (safeCurrent / safeTotal) * 100;

  return (
    <div className="space-y-1.5">
      <Progress value={pct} className="h-2" />
      <p className="text-xs text-muted-foreground">
        {label} {safeCurrent} of {safeTotal}
      </p>
    </div>
  );
}
