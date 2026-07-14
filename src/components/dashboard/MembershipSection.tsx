import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useMembership } from "@/hooks/useMembership";
import { manageMembershipSubscription, type ManageAction } from "@/lib/payments/paypalSubscriptions";
import { toast } from "@/hooks/use-toast";
import { Loader2, Pause, Play, Sparkles, X } from "lucide-react";

const PLAN_LABEL: Record<string, string> = {
  monthly: "Monthly",
  six_months: "6 Months",
  yearly: "Yearly",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ACTIVE: "default",
  APPROVAL_PENDING: "secondary",
  CANCELLED: "outline",
  SUSPENDED: "destructive",
  EXPIRED: "destructive",
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }); }
  catch { return iso; }
}

export function MembershipSection() {
  const { loading, subscription } = useMembership();
  const [busy, setBusy] = useState<ManageAction | null>(null);

  async function run(action: ManageAction, opts: { newPlan?: "monthly" | "six_months" | "yearly" } = {}) {
    if (!subscription) return;
    setBusy(action);
    try {
      const res = await manageMembershipSubscription({
        subscriptionRowId: subscription.id,
        action,
        newPlan: opts.newPlan,
      });
      if (action === "revise" && res.approvalUrl) {
        window.location.href = res.approvalUrl;
        return;
      }
      toast({
        title:
          action === "cancel" ? "Membership cancelled" :
          action === "suspend" ? "Membership paused" :
          action === "reactivate" ? "Membership resumed" :
          "Plan updated",
        description:
          action === "cancel" ? "Access remains until the end of your current billing period." :
          undefined,
      });
      // Refresh from server
      window.location.reload();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      toast({ title: "PayPal error", description: msg, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  return (
    <section id="membership" className="scroll-mt-20">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <CardTitle>Membership</CardTitle>
          </div>
          {subscription && (
            <Badge variant={STATUS_VARIANT[subscription.status] ?? "outline"}>
              {subscription.status.replace("_", " ")}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </p>
          ) : !subscription ? (
            <>
              <p className="text-sm text-muted-foreground">
                You don't have an active Membership yet. Unlock all units, audio, and quizzes.
              </p>
              <Button asChild><Link to="/pricing#membership">View Membership plans</Link></Button>
            </>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-muted-foreground">Current plan</div>
                  <div className="font-semibold">{PLAN_LABEL[subscription.plan] ?? subscription.plan}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Next billing date</div>
                  <div className="font-semibold">{formatDate(subscription.next_billing_at)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Started</div>
                  <div className="font-semibold">{formatDate(subscription.started_at)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Subscription ID</div>
                  <div className="font-mono text-xs break-all">{subscription.paypal_subscription_id}</div>
                </div>
              </div>

              {subscription.status === "CANCELLED" && subscription.expires_at && (
                <p className="text-xs text-muted-foreground">
                  Access remains until {formatDate(subscription.expires_at)}.
                </p>
              )}

              {/* Change / upgrade plan */}
              {subscription.status === "ACTIVE" && (
                <div className="rounded-md border p-3 space-y-2">
                  <div className="text-sm font-medium">Change plan</div>
                  <div className="flex flex-wrap gap-2">
                    {(["monthly", "six_months", "yearly"] as const)
                      .filter((p) => p !== subscription.plan)
                      .map((p) => (
                        <Button
                          key={p}
                          size="sm"
                          variant="outline"
                          disabled={busy !== null}
                          onClick={() => run("revise", { newPlan: p })}
                        >
                          {busy === "revise" ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : null}
                          Switch to {PLAN_LABEL[p]}
                        </Button>
                      ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    PayPal may require you to re-approve the new billing amount.
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-2">
                {subscription.status === "ACTIVE" && (
                  <>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" disabled={busy !== null}>
                          <X className="w-4 h-4 mr-2" /> Cancel membership
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Cancel your Membership?</AlertDialogTitle>
                          <AlertDialogDescription>
                            You'll keep access until the end of the current billing period.
                            You will not be charged again after cancellation.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Keep membership</AlertDialogCancel>
                          <AlertDialogAction onClick={() => run("cancel")}>
                            Cancel subscription
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}

                {subscription.status === "SUSPENDED" && (
                  <Button
                    size="sm"
                    disabled={busy !== null}
                    onClick={() => run("reactivate")}
                  >
                    {busy === "reactivate" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                    Resume membership
                  </Button>
                )}

                {(subscription.status === "CANCELLED" || subscription.status === "EXPIRED") && (
                  <Button asChild size="sm">
                    <Link to="/pricing#membership">Start a new Membership</Link>
                  </Button>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                Manage your Membership directly here — no need to leave ArabiyaPath.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
