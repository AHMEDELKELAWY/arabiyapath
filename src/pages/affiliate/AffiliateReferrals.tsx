import { AffiliateLayout } from "@/components/affiliate/AffiliateLayout";
import { useAffiliateReferrals, useAffiliateStats } from "@/hooks/useAffiliateData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Users, ShoppingCart, DollarSign } from "lucide-react";
import { format } from "date-fns";

type Referral = {
  purchase_id: string;
  created_at: string;
  product_name: string | null;
  amount: number | null;
  student_user_id: string;
  student_first_name: string | null;
  student_last_name: string | null;
  student_email: string | null;
  coupon_code: string | null;
  coupon_percent_off: number | null;
  commission_amount: number | null;
  commission_status: string | null;
};

export default function AffiliateReferrals() {
  const { data: referrals, isLoading } = useAffiliateReferrals();
  const { data: stats } = useAffiliateStats();

  const rows = (referrals || []) as Referral[];
  const totalSales = rows.reduce((sum, r) => sum + Number(r.amount || 0), 0);

  return (
    <AffiliateLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Referrals</h1>
          <p className="text-muted-foreground">
            Students who purchased through your referral link or coupon
          </p>
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
              <p className="text-2xl font-bold">{rows.length}</p>
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
            ) : rows.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Coupon</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead>Commission</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => {
                      const fullName =
                        [r.student_first_name, r.student_last_name]
                          .filter(Boolean)
                          .join(" ") || "—";
                      return (
                        <TableRow key={r.purchase_id}>
                          <TableCell className="text-muted-foreground whitespace-nowrap">
                            {format(new Date(r.created_at), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell className="font-medium">
                            {fullName}
                          </TableCell>
                          <TableCell className="text-sm">
                            {r.student_email || "—"}
                          </TableCell>
                          <TableCell>{r.product_name || "—"}</TableCell>
                          <TableCell>
                            ${Number(r.amount || 0).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {r.coupon_code ? (
                              <Badge variant="secondary" className="font-mono">
                                {r.coupon_code}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {r.coupon_percent_off != null
                              ? `${r.coupon_percent_off}%`
                              : "—"}
                          </TableCell>
                          <TableCell className="font-semibold text-primary">
                            {r.commission_amount != null
                              ? `$${Number(r.commission_amount).toFixed(2)}`
                              : "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-12">
                No referrals yet. Share your referral link or coupon code to
                start earning!
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </AffiliateLayout>
  );
}
