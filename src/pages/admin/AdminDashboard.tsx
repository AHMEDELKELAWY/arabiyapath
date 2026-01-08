import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminStats, useRecentActivity } from "@/hooks/useAdminData";
import {
  Users,
  ShoppingCart,
  FileQuestion,
  Award,
  Ticket,
  UserPlus,
  CreditCard,
  Medal,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useAdminStats();
  const { data: activity, isLoading: activityLoading } = useRecentActivity();

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground">Overview of your platform</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Users"
            value={stats?.totalUsers}
            icon={Users}
            loading={statsLoading}
          />
          <StatCard
            title="Active Purchases"
            value={stats?.activePurchases}
            icon={ShoppingCart}
            loading={statsLoading}
          />
          <StatCard
            title="Quiz Attempts (7d)"
            value={stats?.quizAttemptsLast7Days}
            subtitle={`${stats?.quizAttemptsLast30Days || 0} in 30 days`}
            icon={FileQuestion}
            loading={statsLoading}
          />
          <StatCard
            title="Certificates Issued"
            value={stats?.certificatesIssued}
            icon={Award}
            loading={statsLoading}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StatCard
            title="Coupon Redemptions"
            value={stats?.couponRedemptions}
            icon={Ticket}
            loading={statsLoading}
          />
          <StatCard
            title="Total Quiz Attempts"
            value={stats?.totalQuizAttempts}
            icon={FileQuestion}
            loading={statsLoading}
          />
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Signups */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Recent Signups</CardTitle>
            </CardHeader>
            <CardContent>
              {activityLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : activity?.recentSignups?.length ? (
                <div className="space-y-3">
                  {activity.recentSignups.map((user: any) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                    >
                      <div>
                        <p className="font-medium text-sm">
                          {user.first_name} {user.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No recent signups
                </p>
              )}
            </CardContent>
          </Card>

          {/* Recent Purchases */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Recent Purchases</CardTitle>
            </CardHeader>
            <CardContent>
              {activityLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : activity?.recentPurchases?.length ? (
                <div className="space-y-3">
                  {activity.recentPurchases.map((purchase: any) => (
                    <div
                      key={purchase.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                    >
                      <div>
                        <p className="font-medium text-sm">{purchase.products?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {purchase.profiles?.first_name} {purchase.profiles?.last_name}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(purchase.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No recent purchases
                </p>
              )}
            </CardContent>
          </Card>

          {/* Recent Certificates */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <Medal className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Recent Certificates</CardTitle>
            </CardHeader>
            <CardContent>
              {activityLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : activity?.recentCertificates?.length ? (
                <div className="space-y-3">
                  {activity.recentCertificates.map((cert: any) => (
                    <div
                      key={cert.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                    >
                      <div>
                        <p className="font-medium text-sm">
                          {cert.dialects?.name} - {cert.levels?.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {cert.profiles?.first_name} {cert.profiles?.last_name}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(cert.issued_at), { addSuffix: true })}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No certificates issued yet
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  loading,
}: {
  title: string;
  value?: number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {loading ? (
              <Skeleton className="h-8 w-16 mt-1" />
            ) : (
              <>
                <p className="text-3xl font-bold text-foreground">{value ?? 0}</p>
                {subtitle && (
                  <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
                )}
              </>
            )}
          </div>
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
