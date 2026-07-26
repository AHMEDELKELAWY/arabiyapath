import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, BarChart3, Download } from "lucide-react";
import { format } from "date-fns";
import { toCsv, downloadCsv } from "@/lib/email/campaignReport";
import { useToast } from "@/hooks/use-toast";

interface DeliverabilityRow {
  campaign_id: string;
  subject: string;
  audience: string;
  status: string;
  sent_at: string | null;
  recipients: number;
  sent: number;
  failed: number;
  skipped: number;
  bounced: number;
  complained: number;
  unsubscribed: number;
}

interface ReasonRow {
  campaign_id: string;
  subject: string;
  reason: string;
  occurrences: number;
}

const RANGES = [
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
  { label: "1 year", days: 365 },
];

export function DeliverabilityAnalytics() {
  const { toast } = useToast();
  const [days, setDays] = useState(30);

  const range = useMemo(() => {
    const to = new Date();
    const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
    return { from: from.toISOString(), to: to.toISOString() };
  }, [days]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["campaign-deliverability", days],
    queryFn: async () => {
      const [stats, reasons] = await Promise.all([
        supabase.rpc("admin_campaign_deliverability", { _from: range.from, _to: range.to }),
        supabase.rpc("admin_campaign_failure_reasons", { _from: range.from, _to: range.to }),
      ]);
      if (stats.error) throw stats.error;
      if (reasons.error) throw reasons.error;
      return {
        rows: (stats.data ?? []) as unknown as DeliverabilityRow[],
        reasons: (reasons.data ?? []) as unknown as ReasonRow[],
      };
    },
  });

  const rows = data?.rows ?? [];
  const reasons = data?.reasons ?? [];

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => ({
          recipients: acc.recipients + r.recipients,
          sent: acc.sent + r.sent,
          failed: acc.failed + r.failed,
          skipped: acc.skipped + r.skipped,
          bounced: acc.bounced + r.bounced,
          complained: acc.complained + r.complained,
          unsubscribed: acc.unsubscribed + r.unsubscribed,
        }),
        { recipients: 0, sent: 0, failed: 0, skipped: 0, bounced: 0, complained: 0, unsubscribed: 0 },
      ),
    [rows],
  );

  const deliveryRate = totals.recipients > 0 ? Math.round((totals.sent / totals.recipients) * 100) : 0;

  const exportAnalytics = () => {
    const csv = toCsv([
      [`Deliverability — last ${days} days`],
      [],
      ["Campaign", "Audience", "Status", "Sent at", "Recipients", "Sent", "Failed", "Skipped", "Bounced", "Complained", "Unsubscribed"],
      ...rows.map((r) => [
        r.subject, r.audience, r.status, r.sent_at ?? "", r.recipients, r.sent, r.failed, r.skipped, r.bounced, r.complained, r.unsubscribed,
      ]),
      [],
      ["Failure reasons"],
      ["Campaign", "Reason", "Occurrences"],
      ...reasons.map((r) => [r.subject, r.reason, r.occurrences]),
    ]);
    downloadCsv(`deliverability-${days}d-${new Date().toISOString().slice(0, 10)}.csv`, csv);
    toast({ title: "Report downloaded" });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" /> Deliverability
          </CardTitle>
          <CardDescription>Sends, skips, bounces, complaints and unsubscribes per campaign</CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-md border border-border p-0.5">
            {RANGES.map((r) => (
              <Button
                key={r.days}
                type="button"
                size="sm"
                variant={days === r.days ? "secondary" : "ghost"}
                onClick={() => setDays(r.days)}
              >
                {r.label}
              </Button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={exportAnalytics} disabled={rows.length === 0}>
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : error ? (
          <p className="py-6 text-center text-sm text-destructive">{(error as Error).message}</p>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">No campaigns in this period</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
              {[
                { label: "Recipients", value: totals.recipients, tone: "" },
                { label: "Sent", value: totals.sent, tone: "text-primary" },
                { label: "Failed", value: totals.failed, tone: "text-destructive" },
                { label: "Skipped", value: totals.skipped, tone: "text-muted-foreground" },
                { label: "Bounced", value: totals.bounced, tone: "text-destructive" },
                { label: "Complaints", value: totals.complained, tone: "text-destructive" },
              ].map((s) => (
                <div key={s.label} className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className={`text-xl font-bold ${s.tone}`}>{s.value}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Delivery rate {deliveryRate}% · {totals.unsubscribed} unsubscribe(s) recorded in this period
            </p>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Sent at</TableHead>
                    <TableHead className="text-right">Recipients</TableHead>
                    <TableHead className="text-right">Sent</TableHead>
                    <TableHead className="text-right">Failed</TableHead>
                    <TableHead className="text-right">Skipped</TableHead>
                    <TableHead className="text-right">Bounced</TableHead>
                    <TableHead className="text-right">Complaints</TableHead>
                    <TableHead className="text-right">Unsub.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.campaign_id}>
                      <TableCell className="max-w-[240px] truncate font-medium">
                        {r.subject}
                        <Badge variant="secondary" className="ml-2 align-middle">{r.status}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {r.sent_at ? format(new Date(r.sent_at), "MMM d, yyyy") : "—"}
                      </TableCell>
                      <TableCell className="text-right">{r.recipients}</TableCell>
                      <TableCell className="text-right text-primary">{r.sent}</TableCell>
                      <TableCell className="text-right text-destructive">{r.failed}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{r.skipped}</TableCell>
                      <TableCell className="text-right text-destructive">{r.bounced}</TableCell>
                      <TableCell className="text-right text-destructive">{r.complained}</TableCell>
                      <TableCell className="text-right">{r.unsubscribed}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold">Failure reasons</h3>
              {reasons.length === 0 ? (
                <p className="text-sm text-muted-foreground">No failures, bounces or complaints in this period.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campaign</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reasons.map((r, i) => (
                      <TableRow key={`${r.campaign_id}-${i}`}>
                        <TableCell className="max-w-[200px] truncate text-muted-foreground">{r.subject}</TableCell>
                        <TableCell className="max-w-[520px] text-sm break-words">{r.reason}</TableCell>
                        <TableCell className="text-right font-medium">{r.occurrences}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
