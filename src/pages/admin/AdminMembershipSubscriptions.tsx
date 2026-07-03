import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { SEOHead } from "@/components/seo/SEOHead";

interface Row {
  id: string;
  user_id: string;
  plan: string;
  paypal_plan_id: string;
  paypal_subscription_id: string;
  status: string;
  started_at: string | null;
  next_billing_at: string | null;
  cancelled_at: string | null;
  expires_at: string | null;
  created_at: string;
}

const STATUSES = ["ALL", "ACTIVE", "APPROVAL_PENDING", "CANCELLED", "SUSPENDED", "EXPIRED"];

function fmt(iso: string | null) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

export default function AdminMembershipSubscriptions() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("ALL");
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("membership_subscriptions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      setRows((data as Row[] | null) ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (status !== "ALL" && r.status !== status) return false;
      if (q) {
        const s = q.toLowerCase();
        if (
          !r.user_id.toLowerCase().includes(s) &&
          !r.paypal_subscription_id.toLowerCase().includes(s)
        ) return false;
      }
      return true;
    });
  }, [rows, status, q]);

  return (
    <AdminLayout>
      <SEOHead title="Membership Subscriptions" canonicalPath="/admin/memberships" noindex />
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Membership Subscriptions</h1>
          <p className="text-sm text-muted-foreground">PayPal recurring memberships. Course purchases live under Purchases.</p>
        </div>

        <div className="flex gap-3 flex-wrap">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input
            placeholder="Filter by user id or subscription id"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="max-w-md"
          />
        </div>

        {loading ? (
          <Skeleton className="h-64" />
        ) : (
          <Card>
            <CardHeader><CardTitle>{filtered.length} subscription{filtered.length === 1 ? "" : "s"}</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-3">Plan</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">User</th>
                    <th className="py-2 pr-3">Subscription</th>
                    <th className="py-2 pr-3">Started</th>
                    <th className="py-2 pr-3">Next billing</th>
                    <th className="py-2 pr-3">Expires</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-t align-top">
                      <td className="py-2 pr-3 capitalize">{r.plan.replace("_", " ")}</td>
                      <td className="py-2 pr-3"><Badge variant="outline">{r.status}</Badge></td>
                      <td className="py-2 pr-3 font-mono text-xs">{r.user_id}</td>
                      <td className="py-2 pr-3 font-mono text-xs break-all">{r.paypal_subscription_id}</td>
                      <td className="py-2 pr-3">{fmt(r.started_at)}</td>
                      <td className="py-2 pr-3">{fmt(r.next_billing_at)}</td>
                      <td className="py-2 pr-3">{fmt(r.expires_at)}</td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={7} className="py-6 text-center text-muted-foreground">No subscriptions found.</td></tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
