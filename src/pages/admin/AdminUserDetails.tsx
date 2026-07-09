import { useParams, Link } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminUserDetails, useDialects } from "@/hooks/useAdminData";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  ArrowLeft, Shield, ShieldOff, CheckCircle, XCircle, Plus,
  Flame, Trophy, BookOpen, GraduationCap, CreditCard, Award as AwardIcon,
  Activity as ActivityIcon,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";
import { useState, useMemo } from "react";

export default function AdminUserDetails() {
  const { userId } = useParams<{ userId: string }>();
  const { data, isLoading } = useAdminUserDetails(userId!);
  const { data: dialects } = useDialects();
  const queryClient = useQueryClient();
  const [roleChangeDialog, setRoleChangeDialog] = useState<"admin" | "user" | null>(null);
  const [grantAccessDialect, setGrantAccessDialect] = useState<string>("");
  const [showGrantDialog, setShowGrantDialog] = useState(false);

  const toggleRoleMutation = useMutation({
    mutationFn: async (makeAdmin: boolean) => {
      if (makeAdmin) {
        const { error } = await supabase.from("user_roles").insert({
          user_id: userId,
          role: "admin",
        });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .eq("role", "admin");
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-user-details", userId] });
      toast.success("Role updated successfully");
      setRoleChangeDialog(null);
    },
    onError: (error) => toast.error(error.message),
  });

  const grantAccessMutation = useMutation({
    mutationFn: async (dialectId: string) => {
      // Find the product for this dialect
      const { data: product } = await supabase
        .from("products")
        .select("id")
        .eq("dialect_id", dialectId)
        .eq("scope", "dialect")
        .single();

      if (!product) throw new Error("Product not found for this dialect");

      const { error } = await supabase.from("purchases").insert({
        user_id: userId,
        product_id: product.id,
        status: "active",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-user-details", userId] });
      toast.success("Access granted successfully");
      setShowGrantDialog(false);
      setGrantAccessDialect("");
    },
    onError: (error) => toast.error(error.message),
  });

  const revokeAccessMutation = useMutation({
    mutationFn: async (purchaseId: string) => {
      const { error } = await supabase
        .from("purchases")
        .update({ status: "revoked" })
        .eq("id", purchaseId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-user-details", userId] });
      toast.success("Access revoked");
    },
    onError: (error) => toast.error(error.message),
  });

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AdminLayout>
    );
  }

  if (!data?.profile) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">User not found</p>
          <Button asChild className="mt-4">
            <Link to="/admin/users">Back to Users</Link>
          </Button>
        </div>
      </AdminLayout>
    );
  }

  const {
    profile, roles, progress, quizAttempts, purchases, certificates,
    flashcardProgress, flashcardStreak, flashcardReviews,
  } = data;
  const isAdmin = roles.some((r) => r.role === "admin");

  const vocabMastered = flashcardProgress.filter((p: any) => p.status === "mastered").length;
  const vocabLearning = flashcardProgress.filter((p: any) => p.status !== "mastered").length;
  const quizzesPassed = quizAttempts.filter((q: any) => q.passed).length;
  const avgScore = quizAttempts.length
    ? Math.round(
        quizAttempts.reduce((a: number, q: any) => a + (q.score || 0), 0) / quizAttempts.length
      )
    : 0;

  const timeline = useMemo(() => {
    const items: { at: string; icon: any; label: string; sub?: string; kind: string }[] = [];
    progress.forEach((p: any) => items.push({
      at: p.completed_at, icon: BookOpen, kind: "lesson",
      label: `Completed lesson: ${p.lessons?.title ?? "—"}`,
      sub: p.lessons?.units?.title,
    }));
    quizAttempts.forEach((q: any) => items.push({
      at: q.created_at, icon: GraduationCap, kind: "quiz",
      label: `${q.passed ? "Passed" : "Attempted"} quiz — ${q.score}%`,
      sub: q.quizzes?.units?.title,
    }));
    purchases.forEach((p: any) => items.push({
      at: p.created_at, icon: CreditCard, kind: "purchase",
      label: `Purchase: ${p.products?.name ?? "—"} (${p.status})`,
    }));
    certificates.forEach((c: any) => items.push({
      at: c.issued_at, icon: AwardIcon, kind: "cert",
      label: `Certificate — ${c.dialects?.name} ${c.levels?.name}`,
    }));
    flashcardReviews.forEach((r: any) => items.push({
      at: r.reviewed_at, icon: ActivityIcon, kind: "vocab",
      label: `Vocab review (${r.rating}) — ${r.flashcards?.arabic_text ?? ""}`,
      sub: r.flashcards?.english_translation,
    }));
    return items
      .filter((i) => i.at)
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 40);
  }, [progress, quizAttempts, purchases, certificates, flashcardReviews]);


  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/admin/users">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {profile.first_name} {profile.last_name}
            </h1>
            <p className="text-muted-foreground">{profile.email}</p>
          </div>
          <Badge variant={isAdmin ? "default" : "secondary"} className="ml-auto">
            {isAdmin ? "Admin" : "User"}
          </Badge>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-4">
            {isAdmin ? (
              <Button
                variant="outline"
                onClick={() => setRoleChangeDialog("user")}
                className="gap-2"
              >
                <ShieldOff className="h-4 w-4" />
                Remove Admin Role
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => setRoleChangeDialog("admin")}
                className="gap-2"
              >
                <Shield className="h-4 w-4" />
                Make Admin
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setShowGrantDialog(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Grant Dialect Access
            </Button>
          </CardContent>
        </Card>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="progress">Progress ({progress.length})</TabsTrigger>
            <TabsTrigger value="quizzes">Quizzes ({quizAttempts.length})</TabsTrigger>
            <TabsTrigger value="purchases">Purchases ({purchases.length})</TabsTrigger>
            <TabsTrigger value="certificates">Certificates ({certificates.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatMini icon={Flame} label="Current Streak" value={`${flashcardStreak?.current_streak ?? 0} days`} sub={`Best: ${flashcardStreak?.longest_streak ?? 0}`} />
              <StatMini icon={Trophy} label="Vocabulary Mastered" value={vocabMastered} sub={`${vocabLearning} in progress`} />
              <StatMini icon={GraduationCap} label="Quizzes Passed" value={quizzesPassed} sub={`Avg ${avgScore}%`} />
              <StatMini icon={BookOpen} label="Lessons Completed" value={progress.length} />
            </div>

            <Card>
              <CardHeader><CardTitle className="text-lg">Activity Timeline</CardTitle></CardHeader>
              <CardContent>
                {timeline.length ? (
                  <ol className="space-y-3">
                    {timeline.map((t, i) => {
                      const Icon = t.icon;
                      return (
                        <li key={i} className="flex items-start gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <Icon className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{t.label}</p>
                            {t.sub && <p className="text-xs text-muted-foreground truncate">{t.sub}</p>}
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(t.at), { addSuffix: true })}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                ) : (
                  <p className="text-center text-muted-foreground py-6">No activity yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>


          <TabsContent value="progress" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                {progress.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Lesson</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Dialect</TableHead>
                        <TableHead>Completed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {progress.map((p: any) => (
                        <TableRow key={p.id}>
                          <TableCell>{p.lessons?.title}</TableCell>
                          <TableCell>{p.lessons?.units?.title}</TableCell>
                          <TableCell>{p.lessons?.units?.levels?.dialects?.name}</TableCell>
                          <TableCell>
                            {formatDistanceToNow(new Date(p.completed_at), { addSuffix: true })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No progress yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quizzes" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                {quizAttempts.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Unit</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Result</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {quizAttempts.map((q: any) => (
                        <TableRow key={q.id}>
                          <TableCell>
                            {q.quizzes?.units?.levels?.dialects?.name} - {q.quizzes?.units?.title}
                          </TableCell>
                          <TableCell>{q.score}%</TableCell>
                          <TableCell>
                            {q.passed ? (
                              <Badge variant="default" className="gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Passed
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="gap-1">
                                <XCircle className="h-3 w-3" />
                                Failed
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {format(new Date(q.created_at), "MMM d, yyyy")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No quiz attempts</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="purchases" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                {purchases.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {purchases.map((p: any) => (
                        <TableRow key={p.id}>
                          <TableCell>{p.products?.name}</TableCell>
                          <TableCell>
                            <Badge variant={p.status === "active" ? "default" : "secondary"}>
                              {p.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {format(new Date(p.created_at), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell className="text-right">
                            {p.status === "active" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => revokeAccessMutation.mutate(p.id)}
                              >
                                Revoke
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No purchases</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="certificates" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                {certificates.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Dialect</TableHead>
                        <TableHead>Level</TableHead>
                        <TableHead>Certificate Code</TableHead>
                        <TableHead>Issued</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {certificates.map((c: any) => (
                        <TableRow key={c.id}>
                          <TableCell>{c.dialects?.name}</TableCell>
                          <TableCell>{c.levels?.name}</TableCell>
                          <TableCell className="font-mono text-sm">{c.cert_code}</TableCell>
                          <TableCell>
                            {format(new Date(c.issued_at), "MMM d, yyyy")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No certificates</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Role Change Dialog */}
      <AlertDialog open={!!roleChangeDialog} onOpenChange={() => setRoleChangeDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {roleChangeDialog === "admin" ? "Make Admin" : "Remove Admin Role"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {roleChangeDialog === "admin"
                ? "This will grant admin privileges to this user, giving them access to the admin panel."
                : "This will remove admin privileges from this user."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => toggleRoleMutation.mutate(roleChangeDialog === "admin")}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Grant Access Dialog */}
      <AlertDialog open={showGrantDialog} onOpenChange={setShowGrantDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Grant Dialect Access</AlertDialogTitle>
            <AlertDialogDescription>
              Select a dialect to grant access to this user.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Select value={grantAccessDialect} onValueChange={setGrantAccessDialect}>
              <SelectTrigger>
                <SelectValue placeholder="Select dialect" />
              </SelectTrigger>
              <SelectContent>
                {dialects?.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => grantAccessMutation.mutate(grantAccessDialect)}
              disabled={!grantAccessDialect}
            >
              Grant Access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
