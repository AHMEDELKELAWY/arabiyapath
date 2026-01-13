import { AffiliateLayout } from "@/components/affiliate/AffiliateLayout";
import { useAffiliateReferrals, useAffiliateStats } from "@/hooks/useAffiliateData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, ShoppingCart, DollarSign } from "lucide-react";
import { format } from "date-fns";

export default function AffiliateReferrals() {
  const { data: referrals, isLoading } = useAffiliateReferrals();
  const { data: stats } = useAffiliateStats();

  const totalSales = referrals?.reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0) || 0;

  return (
    <AffiliateLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Referrals</h1>
          <p className="text-muted-foreground">Users who signed up using your referral link</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Referrals
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats?.totalReferrals || 0}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Purchases
              </CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{referrals?.length || 0}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Sales Value
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">${totalSales.toFixed(2)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Referrals Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Referral Purchases</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : referrals?.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>User ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referrals.map((referral: any) => (
                    <TableRow key={referral.id}>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(referral.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="font-medium">{referral.product_name}</TableCell>
                      <TableCell>${Number(referral.amount).toFixed(2)}</TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {referral.user_id.slice(0, 8)}...
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-12">
                No referrals yet. Share your referral link to start earning!
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </AffiliateLayout>
  );
}
