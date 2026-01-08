import { Link } from "react-router-dom";
import { ClipboardCheck, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QuizResult } from "@/hooks/useDashboardData";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface QuizResultsListProps {
  results: QuizResult[];
}

export function QuizResultsList({ results }: QuizResultsListProps) {
  if (results.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-primary" />
            Quiz Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              Complete a unit to take your first quiz!
            </p>
            <Link to="/dialects">
              <Button variant="outline" size="sm">
                Start Learning
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-primary" />
          Quiz Results
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {results.map((result) => (
            <div
              key={result.id}
              className="flex items-center justify-between p-3 rounded-lg bg-accent"
            >
              <div className="flex items-center gap-3">
                {result.passed ? (
                  <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                  </div>
                )}
                <div>
                  <p className="font-medium text-foreground">{result.unitTitle}</p>
                  <p className="text-sm text-muted-foreground">{result.dialectName}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge
                  variant="secondary"
                  className={cn(
                    result.passed
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  )}
                >
                  {result.score}%
                </Badge>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDistanceToNow(new Date(result.createdAt), { addSuffix: true })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
