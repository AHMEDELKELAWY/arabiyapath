import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminCoupons } from "@/hooks/useAdminData";
import { useAdminAffiliates, useAdminAffiliateCommissions } from "@/hooks/useAffiliateData";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, Search, Eye, Users } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface AffiliateForm {
  user_id: string;
  affiliate_code: string;
  commission_rate: number;
  status: string;
}

export default function AdminAffiliates() {
  const { data: affiliates, isLoading } = useAdminAffiliates();
  const { data: coupons } = useAdminCoupons();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteAffiliate, setDeleteAffiliate] = useState<string | null>(null);
  const [editingAffiliate, setEditingAffiliate] = useState<any>(null);
  const [viewingAffiliate, setViewingAffiliate] = useState<string | null>(null);
  const [form, setForm] = useState<AffiliateForm>({
    user_id: "",
    affiliate_code: "",
    commission_rate: 10,
    status: "active",
  });

  const { data: affiliateCommissions } = useAdminAffiliateCommissions(viewingAffiliate || undefined);

  const createMutation = useMutation({
    mutationFn: async (data: AffiliateForm) => {
      // First create the affiliate
      const { data: affiliate, error } = await supabase
        .from("affiliates")
        .insert({
          user_id: data.user_id,
          affiliate_code: data.affiliate_code.toUpperCase(),
          commission_rate: data.commission_rate,
          status: data.status,
        })
        .select()
        .single();

      if (error) throw error;

      // Add affiliate role to user
      await supabase.from("user_roles").insert({
        user_id: data.user_id,
        role: "affiliate",
      });

      return affiliate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-affiliates"] });
      toast.success("Affiliate created successfully");
      closeDialog();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AffiliateForm> }) => {
      const { error } = await supabase
        .from("affiliates")
        .update({
          affiliate_code: data.affiliate_code?.toUpperCase(),
          commission_rate: data.commission_rate,
          status: data.status,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-affiliates"] });
      toast.success("Affiliate updated successfully");
      closeDialog();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("affiliates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-affiliates"] });
      toast.success("Affiliate deleted");
      setDeleteAffiliate(null);
    },
    onError: (error) => toast.error(error.message),
  });

  const linkCouponMutation = useMutation({
    mutationFn: async ({ affiliateId, couponId }: { affiliateId: string; couponId: string }) => {
      const { error } = await supabase
        .from("coupons")
        .update({ affiliate_id: affiliateId })
        .eq("id", couponId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-affiliates"] });
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      toast.success("Coupon linked to affiliate");
    },
    onError: (error) => toast.error(error.message),
  });

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingAffiliate(null);
    setForm({
      user_id: "",
      affiliate_code: "",
      commission_rate: 10,
      status: "active",
    });
  };

  const openEdit = (affiliate: any) => {
    setEditingAffiliate(affiliate);
    setForm({
      user_id: affiliate.user_id,
      affiliate_code: affiliate.affiliate_code,
      commission_rate: affiliate.commission_rate,
      status: affiliate.status,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingAffiliate) {
      updateMutation.mutate({ id: editingAffiliate.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const filteredAffiliates = affiliates?.filter(
    (a: any) =>
      a.affiliate_code.toLowerCase().includes(search.toLowerCase()) ||
      a.profile?.email?.toLowerCase().includes(search.toLowerCase()) ||
      a.profile?.first_name?.toLowerCase().includes(search.toLowerCase())
  );

  const availableCoupons = coupons?.filter((c: any) => !c.affiliate_id);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Affiliates</h1>
          <p className="text-muted-foreground">Manage affiliate partners</p>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>All Affiliates</CardTitle>
            <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Affiliate
            </Button>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by code or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Affiliate</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Earnings</TableHead>
                    <TableHead>Coupon</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAffiliates?.length ? (
                    filteredAffiliates.map((affiliate: any) => (
                      <TableRow key={affiliate.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {affiliate.profile?.first_name} {affiliate.profile?.last_name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {affiliate.profile?.email}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono font-medium">
                          {affiliate.affiliate_code}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{affiliate.commission_rate}%</Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              ${Number(affiliate.total_earnings).toFixed(2)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Paid: ${Number(affiliate.paid_earnings).toFixed(2)}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {affiliate.coupons?.[0] ? (
                            <Badge variant="outline">{affiliate.coupons[0].code}</Badge>
                          ) : (
                            <Select
                              onValueChange={(couponId) =>
                                linkCouponMutation.mutate({
                                  affiliateId: affiliate.id,
                                  couponId,
                                })
                              }
                            >
                              <SelectTrigger className="w-[120px] h-8">
                                <SelectValue placeholder="Link..." />
                              </SelectTrigger>
                              <SelectContent>
                                {availableCoupons?.map((c: any) => (
                                  <SelectItem key={c.id} value={c.id}>
                                    {c.code}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              affiliate.status === "active"
                                ? "default"
                                : affiliate.status === "suspended"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {affiliate.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setViewingAffiliate(affiliate.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(affiliate)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteAffiliate(affiliate.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No affiliates found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAffiliate ? "Edit Affiliate" : "Create Affiliate"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              {!editingAffiliate && (
                <div className="space-y-2">
                  <Label htmlFor="user_id">User ID</Label>
                  <Input
                    id="user_id"
                    value={form.user_id}
                    onChange={(e) => setForm({ ...form, user_id: e.target.value })}
                    placeholder="Enter user UUID"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Get the user ID from the Users page
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="affiliate_code">Affiliate Code</Label>
                <Input
                  id="affiliate_code"
                  value={form.affiliate_code}
                  onChange={(e) =>
                    setForm({ ...form, affiliate_code: e.target.value.toUpperCase() })
                  }
                  placeholder="e.g., AHMED25"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="commission_rate">Commission Rate (%)</Label>
                  <Input
                    id="commission_rate"
                    type="number"
                    value={form.commission_rate}
                    onChange={(e) =>
                      setForm({ ...form, commission_rate: parseFloat(e.target.value) || 10 })
                    }
                    min={0}
                    max={100}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(value) => setForm({ ...form, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingAffiliate ? "Save Changes" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Commissions Dialog */}
      <Dialog open={!!viewingAffiliate} onOpenChange={() => setViewingAffiliate(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Affiliate Commissions</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {affiliateCommissions?.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {affiliateCommissions.map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        {format(new Date(c.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>{c.purchases?.product_name}</TableCell>
                      <TableCell>${c.purchases?.amount?.toFixed(2)}</TableCell>
                      <TableCell className="text-green-600 font-medium">
                        ${Number(c.commission_amount).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={c.status === "paid" ? "default" : "outline"}>
                          {c.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No commissions yet
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteAffiliate} onOpenChange={() => setDeleteAffiliate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Affiliate</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this affiliate? This will also delete all their
              commissions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteAffiliate && deleteMutation.mutate(deleteAffiliate)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
