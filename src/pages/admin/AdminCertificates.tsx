import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminCertificates, useDialects } from "@/hooks/useAdminData";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Search, ExternalLink, Trash2, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function AdminCertificates() {
  const { data: certificates, isLoading } = useAdminCertificates();
  const { data: dialects } = useDialects();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterDialect, setFilterDialect] = useState<string>("all");
  const [deleteCertificate, setDeleteCertificate] = useState<string | null>(null);
  const [regenerateCertificate, setRegenerateCertificate] = useState<any>(null);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("certificates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-certificates"] });
      toast.success("Certificate revoked");
      setDeleteCertificate(null);
    },
    onError: (error) => toast.error(error.message),
  });

  const regenerateMutation = useMutation({
    mutationFn: async (cert: any) => {
      // Generate new cert code
      const newCode = `CERT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const { error } = await supabase
        .from("certificates")
        .update({ cert_code: newCode, issued_at: new Date().toISOString() })
        .eq("id", cert.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-certificates"] });
      toast.success("Certificate regenerated with new code");
      setRegenerateCertificate(null);
    },
    onError: (error) => toast.error(error.message),
  });

  const filteredCertificates = certificates?.filter((c) => {
    const searchLower = search.toLowerCase();
    const matchesSearch =
      c.cert_code.toLowerCase().includes(searchLower) ||
      c.profile?.first_name?.toLowerCase().includes(searchLower) ||
      c.profile?.last_name?.toLowerCase().includes(searchLower) ||
      c.profile?.email?.toLowerCase().includes(searchLower);
    const matchesDialect = filterDialect === "all" || c.dialect_id === filterDialect;
    return matchesSearch && matchesDialect;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Certificates</h1>
          <p className="text-muted-foreground">Manage issued certificates</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Certificates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by user or code..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterDialect} onValueChange={setFilterDialect}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by dialect" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dialects</SelectItem>
                  {dialects?.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Dialect</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Certificate Code</TableHead>
                    <TableHead>Issued</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCertificates?.length ? (
                    filteredCertificates.map((cert) => (
                      <TableRow key={cert.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {cert.profile?.first_name} {cert.profile?.last_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {cert.profile?.email}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{cert.dialects?.name}</TableCell>
                        <TableCell>{cert.levels?.name}</TableCell>
                        <TableCell>
                          <code className="text-sm bg-muted px-2 py-1 rounded">
                            {cert.cert_code}
                          </code>
                        </TableCell>
                        <TableCell>
                          {format(new Date(cert.issued_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          {cert.public_url && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => window.open(cert.public_url, "_blank")}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setRegenerateCertificate(cert)}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteCertificate(cert.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No certificates found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Regenerate Confirmation */}
      <AlertDialog open={!!regenerateCertificate} onOpenChange={() => setRegenerateCertificate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate Certificate</AlertDialogTitle>
            <AlertDialogDescription>
              This will generate a new certificate code and update the issue date. The old code will
              no longer be valid for verification.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => regenerateCertificate && regenerateMutation.mutate(regenerateCertificate)}
            >
              Regenerate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteCertificate} onOpenChange={() => setDeleteCertificate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Certificate</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke this certificate? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteCertificate && deleteMutation.mutate(deleteCertificate)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
