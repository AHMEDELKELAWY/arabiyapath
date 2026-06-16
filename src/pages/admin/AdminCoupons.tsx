import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminCoupons, useCouponAnalytics } from "@/hooks/useAdminData";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, Search, BarChart2 } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";

interface CouponForm {
  code: string;
  percent_off: number;
  max_redemptions: number | null;
  max_per_user: number;
  expires_at: string;
  active: boolean;
}

export default function AdminCoupons() {
  const { data: coupons, isLoading } = useAdminCoupons();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteCoupon, setDeleteCoupon] = useState<string | null>(null);
  const [editingCoupon, setEditingCoupon] = useState<any>(null);
  const [analyticsCoupon, setAnalyticsCoupon] = useState<string | null>(null);
  const [form, setForm] = useState<CouponForm>({
    code: "",
    percent_off: 10,
    max_redemptions: null,
    max_per_user: 1,
    expires_at: "",
    active: true,
  });

  const { data: analyticsData } = useCouponAnalytics(analyticsCoupon || "");

  const createMutation = useMutation({
    mutationFn: async (data: CouponForm) => {
      const payload = {
        ...data,
        expires_at: data.expires_at ? new Date(data.expires_at).toISOString() : null,
        max_redemptions: data.max_redemptions || null,
      };
      const { error } = await supabase.from("coupons").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      toast.success("Coupon created successfully");
      closeDialog();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CouponForm }) => {
      const payload = {
        ...data,
        expires_at: data.expires_at ? new Date(data.expires_at).toISOString() : null,
        max_redemptions: data.max_redemptions || null,
      };
      const { error } = await supabase.from("coupons").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      toast.success("Coupon updated successfully");
      closeDialog();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("coupons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      toast.success("Coupon deleted");
      setDeleteCoupon(null);
    },
    onError: (error) => toast.error(error.message),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("coupons").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingCoupon(null);
    setForm({
      code: "",
      percent_off: 10,
      max_redemptions: null,
      max_per_user: 1,
      expires_at: "",
      active: true,
    });
  };

  const openEdit = (coupon: any) => {
    setEditingCoupon(coupon);
    setForm({
      code: coupon.code,
      percent_off: coupon.percent_off,
      max_redemptions: coupon.max_redemptions,
      max_per_user: coupon.max_per_user || 1,
      expires_at: coupon.expires_at ? format(new Date(coupon.expires_at), "yyyy-MM-dd") : "",
      active: coupon.active,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCoupon) {
      updateMutation.mutate({ id: editingCoupon.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const filteredCoupons = coupons?.filter((c) =>
    c.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Coupons</h1>
          <p className="text-muted-foreground">Manage discount coupons</p>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>All Coupons</CardTitle>
            <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Coupon
            </Button>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by code..."
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
                    <TableHead>Code</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Max Uses</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCoupons?.length ? (
                    filteredCoupons.map((coupon) => (
                      <TableRow key={coupon.id}>
                        <TableCell className="font-mono font-medium">
                          {coupon.code}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{coupon.percent_off}% off</Badge>
                        </TableCell>
                        <TableCell>
                          {coupon.max_redemptions ? (
                            `${coupon.max_redemptions} total`
                          ) : (
                            <span className="text-muted-foreground">Unlimited</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {coupon.expires_at ? (
                            formatDistanceToNow(new Date(coupon.expires_at), { addSuffix: true })
                          ) : (
                            <span className="text-muted-foreground">Never</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={coupon.active}
                            onCheckedChange={(checked) =>
                              toggleActiveMutation.mutate({ id: coupon.id, active: checked })
                            }
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setAnalyticsCoupon(coupon.id)}
                          >
                            <BarChart2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(coupon)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteCoupon(coupon.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No coupons found
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
            <DialogTitle>{editingCoupon ? "Edit Coupon" : "Create Coupon"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="code">Coupon Code</Label>
                <Input
                  id="code"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="e.g., WELCOME20"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="percent_off">Discount (%)</Label>
                  <Input
                    id="percent_off"
                    type="number"
                    value={form.percent_off}
                    onChange={(e) => setForm({ ...form, percent_off: parseInt(e.target.value) || 0 })}
                    min={0}
                    max={100}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_per_user">Max Per User</Label>
                  <Input
                    id="max_per_user"
                    type="number"
                    value={form.max_per_user}
                    onChange={(e) => setForm({ ...form, max_per_user: parseInt(e.target.value) || 1 })}
                    min={1}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max_redemptions">Max Total Uses</Label>
                  <Input
                    id="max_redemptions"
                    type="number"
                    value={form.max_redemptions || ""}
                    onChange={(e) =>
                      setForm({ ...form, max_redemptions: e.target.value ? parseInt(e.target.value) : null })
                    }
                    placeholder="Unlimited"
                    min={1}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expires_at">Expires</Label>
                  <Input
                    id="expires_at"
                    type="date"
                    value={form.expires_at}
                    onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="active"
                  checked={form.active}
                  onCheckedChange={(checked) => setForm({ ...form, active: checked })}
                />
                <Label htmlFor="active">Active</Label>
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
                {editingCoupon ? "Save Changes" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Analytics Dialog */}
      <Dialog open={!!analyticsCoupon} onOpenChange={() => setAnalyticsCoupon(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Coupon Analytics</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="mb-4 p-4 bg-muted rounded-lg">
              <p className="text-2xl font-bold">{analyticsData?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Total Redemptions</p>
            </div>
            {analyticsData?.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analyticsData.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        {r.profiles?.first_name} {r.profiles?.last_name}
                      </TableCell>
                      <TableCell>{r.profiles?.email}</TableCell>
                      <TableCell>
                        {format(new Date(r.created_at), "MMM d, yyyy")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No redemptions yet
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteCoupon} onOpenChange={() => setDeleteCoupon(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Coupon</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this coupon? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteCoupon && deleteMutation.mutate(deleteCoupon)}
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
