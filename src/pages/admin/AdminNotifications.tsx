import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SEOHead } from "@/components/seo/SEOHead";
import {
  useAdminNotifications,
  useAdminUnreadNotificationsCount,
  useMarkAllNotificationsRead,
} from "@/hooks/useAdminNotifications";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";
import { Bell, CheckCheck, UserPlus, ExternalLink } from "lucide-react";

export default function AdminNotifications() {
  const { data: notifications, isLoading } = useAdminNotifications(200);
  const { data: unread = 0 } = useAdminUnreadNotificationsCount();
  const markAll = useMarkAllNotificationsRead();

  return (
    <AdminLayout>
      <SEOHead title="Notifications" canonicalPath="/admin/notifications" noindex />
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Bell className="h-7 w-7" />
              Notifications
              {unread > 0 && (
                <Badge className="bg-primary text-primary-foreground">{unread} unread</Badge>
              )}
            </h1>
            <p className="text-muted-foreground">
              New registrations and admin events.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => markAll.mutate()}
            disabled={markAll.isPending || unread === 0}
            className="gap-2"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all as read
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : notifications?.length ? (
              <ul className="divide-y divide-border">
                {notifications.map((n) => {
                  const meta = n.meta || {};
                  const isSignup = n.type === "user_signup";
                  return (
                    <li
                      key={n.id}
                      className={`py-3 flex items-start gap-3 ${
                        n.read_at ? "opacity-70" : ""
                      }`}
                    >
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        {isSignup ? (
                          <UserPlus className="h-5 w-5 text-primary" />
                        ) : (
                          <Bell className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm">{n.title}</p>
                          {!n.read_at && (
                            <Badge variant="secondary" className="text-xs">
                              New
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {n.body}
                        </p>
                        <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                          {meta.email && <span>✉ {meta.email}</span>}
                          {meta.country && <span>📍 {meta.country}</span>}
                          {meta.source && <span>🔗 {meta.source}</span>}
                          <span>
                            {formatDistanceToNow(new Date(n.created_at), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                      </div>
                      {n.related_user_id && (
                        <Button
                          asChild
                          size="sm"
                          variant="ghost"
                          className="gap-1 shrink-0"
                        >
                          <Link to={`/admin/users/${n.related_user_id}`}>
                            View <ExternalLink className="h-3 w-3" />
                          </Link>
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No notifications yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
