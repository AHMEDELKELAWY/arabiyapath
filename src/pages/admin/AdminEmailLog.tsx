import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format, subDays } from "date-fns";
import { Loader2, RefreshCw, Copy, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Row = {
  id: string;
  message_id: string | null;
  template_name: string;
  recipient_email: string;
  status: string;
  error_message: string | null;
  metadata: any;
  created_at: string;
};

const PRESETS = [
  { key: "24h", label: "Last 24h", days: 1 },
  { key: "7d", label: "Last 7 days", days: 7 },
  { key: "30d", label: "Last 30 days", days: 30 },
  { key: "custom", label: "Custom", days: 0 },
];

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  sent: "default",
  pending: "secondary",
  suppressed: "outline",
  failed: "destructive",
  dlq: "destructive",
  bounced: "destructive",
  complained: "destructive",
};

const STATUS_COLOR: Record<string, string> = {
  sent: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  suppressed: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
  failed: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30",
  dlq: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30",
  bounced: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30",
  complained: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30",
};

const PAGE_SIZE = 50;

export default function AdminEmailLog() {
  const [preset, setPreset] = useState<string>("7d");
  const [customFrom, setCustomFrom] = useState<string>(format(subDays(new Date(), 7), "yyyy-MM-dd"));
  const [customTo, setCustomTo] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [template, setTemplate] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [recipient, setRecipient] = useState<string>("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Row | null>(null);

  const range = useMemo(() => {
    const p = PRESETS.find((x) => x.key === preset);
    if (!p || p.key === "custom") {
      return {
        from: new Date(customFrom + "T00:00:00").toISOString(),
        to: new Date(customTo + "T23:59:59").toISOString(),
      };
    }
    return { from: subDays(new Date(), p.days).toISOString(), to: new Date().toISOString() };
  }, [preset, customFrom, customTo]);

  // Templates dropdown source
  const { data: templateOptions } = useQuery({
    queryKey: ["email-log-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_send_log")
        .select("template_name")
        .not("template_name", "is", null)
        .limit(1000);
      if (error) throw error;
      const set = new Set<string>();
      (data || []).forEach((r: any) => r.template_name && set.add(r.template_name));
      return Array.from(set).sort();
    },
  });

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["email-log", range, template, status, recipient],
    queryFn: async () => {
      // Pull up to 2000 recent rows for the filter window, then dedupe client-side by message_id.
      let q = supabase
        .from("email_send_log")
        .select("*")
        .gte("created_at", range.from)
        .lte("created_at", range.to)
        .order("created_at", { ascending: false })
        .limit(2000);
      if (template !== "all") q = q.eq("template_name", template);
      if (recipient.trim()) q = q.ilike("recipient_email", `%${recipient.trim()}%`);
      const { data, error } = await q;
      if (error) throw error;
      // Dedupe by message_id, keeping the latest row. Rows without message_id are kept as-is by id.
      const latest = new Map<string, Row>();
      const noMsg: Row[] = [];
      for (const r of (data || []) as Row[]) {
        if (!r.message_id) { noMsg.push(r); continue; }
        if (!latest.has(r.message_id)) latest.set(r.message_id, r);
      }
      let all: Row[] = [...latest.values(), ...noMsg].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
      if (status !== "all") all = all.filter((r) => r.status === status);
      return all;
    },
  });

  const rows: Row[] = data || [];
  const stats = useMemo(() => {
    const total = rows.length;
    const sent = rows.filter((r) => r.status === "sent").length;
    const pending = rows.filter((r) => r.status === "pending").length;
    const failed = rows.filter((r) => ["failed", "dlq", "bounced", "complained"].includes(r.status)).length;
    const suppressed = rows.filter((r) => r.status === "suppressed").length;
    return { total, sent, pending, failed, suppressed };
  }, [rows]);

  const paged = rows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: text.slice(0, 60) });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Email Log</h1>
            <p className="text-muted-foreground">Delivery status for all auth & app emails.</p>
          </div>
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Total", value: stats.total, color: "text-foreground" },
            { label: "Sent", value: stats.sent, color: "text-emerald-600" },
            { label: "Pending", value: stats.pending, color: "text-amber-600" },
            { label: "Failed", value: stats.failed, color: "text-red-600" },
            { label: "Suppressed", value: stats.suppressed, color: "text-yellow-600" },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{s.label}</p>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Filters</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Time range</Label>
              <Select value={preset} onValueChange={(v) => { setPreset(v); setPage(0); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRESETS.map((p) => <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {preset === "custom" && (
              <>
                <div className="space-y-2">
                  <Label>From</Label>
                  <Input type="date" value={customFrom} onChange={(e) => { setCustomFrom(e.target.value); setPage(0); }} />
                </div>
                <div className="space-y-2">
                  <Label>To</Label>
                  <Input type="date" value={customTo} onChange={(e) => { setCustomTo(e.target.value); setPage(0); }} />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label>Template</Label>
              <Select value={template} onValueChange={(v) => { setTemplate(v); setPage(0); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All templates</SelectItem>
                  {(templateOptions || []).map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => { setStatus(v); setPage(0); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="dlq">DLQ</SelectItem>
                  <SelectItem value="suppressed">Suppressed</SelectItem>
                  <SelectItem value="bounced">Bounced</SelectItem>
                  <SelectItem value="complained">Complained</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Recipient</Label>
              <Input placeholder="user@example.com" value={recipient} onChange={(e) => { setRecipient(e.target.value); setPage(0); }} />
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : rows.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">No emails match these filters.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Template</TableHead>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sent</TableHead>
                      <TableHead>Message ID</TableHead>
                      <TableHead className="text-right">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paged.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.template_name}</TableCell>
                        <TableCell className="text-sm">{r.recipient_email}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[r.status] || "bg-muted"}`}>
                            {r.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">{format(new Date(r.created_at), "MMM d, HH:mm:ss")}</TableCell>
                        <TableCell>
                          {r.message_id ? (
                            <button onClick={() => copy(r.message_id!)} className="text-xs font-mono text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                              {r.message_id.slice(0, 8)}… <Copy className="w-3 h-3" />
                            </button>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => setSelected(r)}>
                            View <ExternalLink className="w-3 h-3 ml-1" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {rows.length > PAGE_SIZE && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, rows.length)} of {rows.length}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Email details</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <Field label="Template" value={selected.template_name} />
              <Field label="Recipient" value={selected.recipient_email} />
              <Field label="Status" value={selected.status} />
              <Field label="Sent at" value={format(new Date(selected.created_at), "PPpp")} />
              <Field label="Message ID" value={selected.message_id || "—"} mono copyable onCopy={copy} />
              <Field label="Row ID" value={selected.id} mono copyable onCopy={copy} />
              {selected.error_message && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Error</p>
                  <pre className="bg-destructive/10 text-destructive text-xs p-3 rounded whitespace-pre-wrap">{selected.error_message}</pre>
                </div>
              )}
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Provider metadata</p>
                <pre className="bg-muted text-xs p-3 rounded overflow-x-auto max-h-80">
                  {selected.metadata ? JSON.stringify(selected.metadata, null, 2) : "—"}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function Field({ label, value, mono, copyable, onCopy }: { label: string; value: string; mono?: boolean; copyable?: boolean; onCopy?: (v: string) => void }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground pt-0.5">{label}</p>
      <div className="flex items-center gap-2 flex-1 justify-end">
        <span className={mono ? "font-mono text-xs break-all" : "text-sm"}>{value}</span>
        {copyable && value && value !== "—" && (
          <button onClick={() => onCopy?.(value)} className="text-muted-foreground hover:text-foreground">
            <Copy className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
