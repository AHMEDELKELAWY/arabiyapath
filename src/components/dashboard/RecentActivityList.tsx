import { Link } from "react-router-dom";
import { Clock, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RecentActivity } from "@/hooks/useDashboardData";
import { formatDistanceToNow } from "date-fns";

interface RecentActivityListProps {
  activities: RecentActivity[];
}

export function RecentActivityList({ activities }: RecentActivityListProps) {
  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              No activity yet. Start learning to see your progress here!
            </p>
            <Link to="/dialects">
              <Button variant="outline" size="sm">
                Browse Dialects
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
          <Clock className="w-5 h-5 text-primary" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activities.map((activity) => (
            <Link
              key={activity.lessonId}
              to={`/lesson/${activity.lessonId}`}
              className="flex items-center justify-between p-3 rounded-lg bg-accent hover:bg-accent/80 transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">
                  {activity.lessonTitle}
                </p>
                <p className="text-sm text-muted-foreground">
                  {activity.unitTitle} • {activity.dialectName}
                </p>
              </div>
              <div className="flex items-center gap-3 ml-4">
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDistanceToNow(new Date(activity.completedAt), { addSuffix: true })}
                </span>
                <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
