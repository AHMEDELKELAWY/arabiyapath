import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowRight } from "lucide-react";

interface ProductCardProps {
  name: string;
  emoji: string;
  progressPercent: number;
  unitsLabel: string;
  lastActivityLabel: string;
  continueHref: string;
}

export function ProductCard({
  name,
  emoji,
  progressPercent,
  unitsLabel,
  lastActivityLabel,
  continueHref,
}: ProductCardProps) {
  return (
    <Link
      to={continueHref}
      className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
    >
      <Card className="h-full hover:shadow-lg hover:border-primary/40 transition-all">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <span className="text-3xl" aria-hidden="true">{emoji}</span>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                {name}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">{unitsLabel}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progress</span>
              <span>{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} />
          </div>

          <p className="text-xs text-muted-foreground truncate">{lastActivityLabel}</p>

          <div className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground h-10 px-4 text-sm font-medium group-hover:opacity-90 transition-opacity">
            Continue
            <ArrowRight className="w-4 h-4" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
