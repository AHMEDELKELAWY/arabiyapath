import { useState } from "react";
import { AffiliateLayout } from "@/components/affiliate/AffiliateLayout";
import { useAffiliateCommissions, useAffiliateStats } from "@/hooks/useAffiliateData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DollarSign, Clock, CheckCircle, Wallet } from "lucide-react";
import { format } from "date-fns";

export default function AffiliateCommissions() {
  const { data: commissions, isLoading } = useAffiliateCommissions();
  const { data: stats } = useAffiliateStats();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredCommissions = commissions?.filter((c: any) =>
    statusFilter === "all" ? true : c.status === statusFilter
  );

  const pendingTotal =
    commissions
      ?.filter((c: any) => c.status === "pending")
      .reduce((sum: number, c: any) => sum + Number(c.commission_amount), 0) || 0;

  const paidTotal =
    commissions
      ?.filter((c: any) => c.status === "paid")
      .reduce((sum: number, c: any) => sum + Number(c.commission_amount), 0) || 0;

  return (
    <AffiliateLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Commissions</h1>
          <p className="text-muted-foreground">Track your earnings and commission history</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Earned
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">${stats?.totalEarnings?.toFixed(2) || "0.00"}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending
              </CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-amber-600">${pendingTotal.toFixed(2)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Paid Out
              </CardTitle>
              <Wallet className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">${paidTotal.toFixed(2)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Commissions Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Commission History</CardTitle>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredCommissions?.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Sale Amount</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCommissions.map((commission: any) => (
                    <TableRow key={commission.id}>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(commission.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="font-medium">
                        {commission.purchases?.product_name || "N/A"}
                      </TableCell>
                      <TableCell>${commission.purchases?.amount?.toFixed(2) || "0.00"}</TableCell>
                      <TableCell className="text-green-600 font-semibold">
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-12">
                No commissions found. Share your referral link to start earning!
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </AffiliateLayout>
  );
}
