import { AffiliateLayout } from "@/components/affiliate/AffiliateLayout";
import {
  useAffiliateStats,
  useAffiliateCoupon,
  useAffiliateCommissions,
} from "@/hooks/useAffiliateData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DollarSign,
  Users,
  TrendingUp,
  Copy,
  Share2,
  Clock,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export default function AffiliateDashboard() {
  const { data: stats, isLoading: statsLoading } = useAffiliateStats();
  const { data: couponData } = useAffiliateCoupon();
  const { data: commissions, isLoading: commissionsLoading } = useAffiliateCommissions();

  const recentCommissions = commissions?.slice(0, 5) || [];

  const copyLink = () => {
    const link = `${window.location.origin}/pricing?coupon=${couponData?.coupon?.code || couponData?.affiliateCode}`;
    navigator.clipboard.writeText(link);
    toast.success("Referral link copied!");
  };

  const shareOnWhatsApp = () => {
    const link = `${window.location.origin}/pricing?coupon=${couponData?.coupon?.code || couponData?.affiliateCode}`;
    const text = `Learn Arabic with ArabiyaPath! Use my code ${couponData?.coupon?.code} for ${couponData?.coupon?.percent_off}% off: ${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const shareOnTwitter = () => {
    const link = `${window.location.origin}/pricing?coupon=${couponData?.coupon?.code || couponData?.affiliateCode}`;
    const text = `Learn Arabic with ArabiyaPath! Use my code ${couponData?.coupon?.code} for ${couponData?.coupon?.percent_off}% off`;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`,
      "_blank"
    );
  };

  return (
    <AffiliateLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's your affiliate performance overview.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Earnings
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <p className="text-2xl font-bold">${stats?.totalEarnings?.toFixed(2) || "0.00"}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <p className="text-2xl font-bold text-amber-600">
                  ${stats?.pendingAmount?.toFixed(2) || "0.00"}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Referrals
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <p className="text-2xl font-bold">{stats?.totalReferrals || 0}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                This Month
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <p className="text-2xl font-bold text-green-600">
                  ${stats?.monthlyEarnings?.toFixed(2) || "0.00"}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Share Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Share Your Referral Link
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {couponData?.coupon ? (
              <>
                <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground mb-1">Your Coupon Code</p>
                    <p className="font-mono text-2xl font-bold text-primary">
                      {couponData.coupon.code}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {couponData.coupon.percent_off}% discount for your referrals
                    </p>
                  </div>
                  <Button onClick={copyLink} variant="outline" className="gap-2">
                    <Copy className="h-4 w-4" />
                    Copy Link
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button onClick={shareOnWhatsApp} variant="outline" className="gap-2 flex-1">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    WhatsApp
                  </Button>
                  <Button onClick={shareOnTwitter} variant="outline" className="gap-2 flex-1">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                    Twitter
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">
                No coupon assigned yet. Contact admin to set up your affiliate coupon.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Commissions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Commissions</CardTitle>
          </CardHeader>
          <CardContent>
            {commissionsLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : recentCommissions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentCommissions.map((commission: any) => (
                    <TableRow key={commission.id}>
                      <TableCell className="font-medium">
                        {commission.purchases?.product_name || "N/A"}
                      </TableCell>
                      <TableCell>${commission.purchases?.amount?.toFixed(2) || "0.00"}</TableCell>
                      <TableCell className="text-green-600 font-medium">
                        ${Number(commission.commission_amount).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            commission.status === "paid"
                              ? "default"
                              : commission.status === "approved"
                              ? "secondary"
                              : "outline"
                          }
                          className="gap-1"
                        >
                          {commission.status === "paid" && <CheckCircle className="h-3 w-3" />}
                          {commission.status === "pending" && <Clock className="h-3 w-3" />}
                          {commission.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDistanceToNow(new Date(commission.created_at), { addSuffix: true })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No commissions yet. Share your referral link to start earning!
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </AffiliateLayout>
  );
}
