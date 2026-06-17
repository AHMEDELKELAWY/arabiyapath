import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6 space-y-4">
        <Link to={continueHref} className="flex items-start gap-3 group">
          <span className="text-3xl" aria-hidden="true">{emoji}</span>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
              {name}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">{unitsLabel}</p>
          </div>
        </Link>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} />
        </div>

        <p className="text-xs text-muted-foreground truncate">{lastActivityLabel}</p>

        <Button asChild className="w-full gap-2">
          <Link to={continueHref}>
            Continue
            <ArrowRight className="w-4 h-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
