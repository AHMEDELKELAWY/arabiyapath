import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminPendingPayouts, useAdminAffiliateCommissions } from "@/hooks/useAffiliateData";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DollarSign, Clock, CheckCircle, Wallet, Eye } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function AdminAffiliatePayouts() {
  const { data: pendingPayouts, isLoading } = useAdminPendingPayouts();
  const { data: allCommissions } = useAdminAffiliateCommissions();
  const queryClient = useQueryClient();
  const [viewingAffiliate, setViewingAffiliate] = useState<any>(null);
  const [confirmPayout, setConfirmPayout] = useState<any>(null);

  const markAsPaidMutation = useMutation({
    mutationFn: async (affiliateId: string) => {
      // Get all pending commissions for this affiliate
      const { data: pendingCommissions, error: fetchError } = await supabase
        .from("affiliate_commissions")
        .select("id, commission_amount")
        .eq("affiliate_id", affiliateId)
        .eq("status", "pending");

      if (fetchError) throw fetchError;

      // Mark all as paid
      const { error: updateError } = await supabase
        .from("affiliate_commissions")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("affiliate_id", affiliateId)
        .eq("status", "pending");

      if (updateError) throw updateError;

      // Update affiliate paid_earnings
      const totalPaid = pendingCommissions?.reduce(
        (sum, c) => sum + Number(c.commission_amount),
        0
      ) || 0;

      const { data: affiliate } = await supabase
        .from("affiliates")
        .select("paid_earnings")
        .eq("id", affiliateId)
        .single();

      await supabase
        .from("affiliates")
        .update({
          paid_earnings: Number(affiliate?.paid_earnings || 0) + totalPaid,
        })
        .eq("id", affiliateId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pending-payouts"] });
      queryClient.invalidateQueries({ queryKey: ["admin-affiliate-commissions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-affiliates"] });
      toast.success("Commissions marked as paid");
      setConfirmPayout(null);
    },
    onError: (error) => toast.error(error.message),
  });

  const totalPending =
    pendingPayouts?.reduce((sum: number, p: any) => sum + p.pendingAmount, 0) || 0;

  const paidThisMonth =
    allCommissions
      ?.filter((c: any) => {
        const paidAt = c.paid_at ? new Date(c.paid_at) : null;
        if (!paidAt) return false;
        const now = new Date();
        return (
          paidAt.getMonth() === now.getMonth() && paidAt.getFullYear() === now.getFullYear()
        );
      })
      .reduce((sum: number, c: any) => sum + Number(c.commission_amount), 0) || 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Affiliate Payouts</h1>
          <p className="text-muted-foreground">Manage affiliate commission payments</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Pending
              </CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-amber-600">${totalPending.toFixed(2)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Affiliates Waiting
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{pendingPayouts?.length || 0}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Paid This Month
              </CardTitle>
              <Wallet className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">${paidThisMonth.toFixed(2)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Pending Payouts Table */}
        <Card>
          <CardHeader>
            <CardTitle>Pending Payouts</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : pendingPayouts?.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Affiliate</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Pending Amount</TableHead>
                    <TableHead>Pending Items</TableHead>
                    <TableHead>Total Earned</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingPayouts.map((payout: any) => (
                    <TableRow key={payout.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {payout.profile?.first_name} {payout.profile?.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {payout.profile?.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">{payout.affiliate_code}</TableCell>
                      <TableCell>
                        <span className="text-lg font-bold text-amber-600">
                          ${payout.pendingAmount.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{payout.pendingCount} commissions</Badge>
                      </TableCell>
                      <TableCell>${Number(payout.total_earnings).toFixed(2)}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setViewingAffiliate(payout)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => setConfirmPayout(payout)}
                          className="gap-1"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Mark Paid
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-12">
                No pending payouts at this time
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* View Details Dialog */}
      <Dialog open={!!viewingAffiliate} onOpenChange={() => setViewingAffiliate(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Pending Commissions - {viewingAffiliate?.profile?.first_name}{" "}
              {viewingAffiliate?.profile?.last_name}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="mb-4 p-4 bg-muted rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">Total Pending</p>
                  <p className="text-2xl font-bold text-amber-600">
                    ${viewingAffiliate?.pendingAmount?.toFixed(2)}
                  </p>
                </div>
                <Button onClick={() => setConfirmPayout(viewingAffiliate)} className="gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Mark All as Paid
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Payout Dialog */}
      <AlertDialog open={!!confirmPayout} onOpenChange={() => setConfirmPayout(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Payout</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark ${confirmPayout?.pendingAmount?.toFixed(2)} as paid
              for {confirmPayout?.profile?.first_name} {confirmPayout?.profile?.last_name}?
              <br />
              <br />
              This will mark all {confirmPayout?.pendingCount} pending commissions as paid.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmPayout && markAsPaidMutation.mutate(confirmPayout.id)}
              disabled={markAsPaidMutation.isPending}
            >
              Confirm Payment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
