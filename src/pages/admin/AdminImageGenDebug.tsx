import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

type DebugRow = {
  id: string;
  created_at: string;
  card_id: string | null;
  kind: string;
  vocabulary: string | null;
  status: number;
  outcome: string;
  reason: string | null;
  issues: unknown;
  image_prompt: string | null;
  validator_prompt: string | null;
  attempts: number | null;
};

export default function AdminImageGenDebug() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [kindFilter, setKindFilter] = useState<string>("all");
  const [selected, setSelected] = useState<DebugRow | null>(null);

  const { data: rows = [], isLoading, refetch } = useQuery({
    queryKey: ["image-gen-debug", statusFilter, kindFilter],
    queryFn: async () => {
      let q = supabase
        .from("image_gen_debug_log" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (statusFilter !== "all") q = q.eq("status", Number(statusFilter));
      if (kindFilter !== "all") q = q.eq("kind", kindFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as DebugRow[];
    },
  });

  const last422 = rows.find((r) => r.status === 422);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Image Generation Debug</h1>
            <p className="text-sm text-muted-foreground">
              Recent flashcard image generation attempts with validator reasons and exact prompts.
            </p>
          </div>
          <Button variant="outline" onClick={() => refetch()}>Refresh</Button>
        </div>

        {last422 && (
          <Card className="border-destructive/40">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                Last 422 rejection
                <Badge variant="outline">{last422.kind}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div><span className="text-muted-foreground">When:</span> {format(new Date(last422.created_at), "PPpp")}</div>
              <div><span className="text-muted-foreground">Vocabulary:</span> <span className="font-medium">{last422.vocabulary}</span></div>
              <div><span className="text-muted-foreground">Outcome:</span> <code>{last422.outcome}</code></div>
              <div><span className="text-muted-foreground">Reason:</span> <span className="text-destructive">{last422.reason ?? "—"}</span></div>
              <Button size="sm" variant="secondary" onClick={() => setSelected(last422)}>View prompts</Button>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="200">200 OK</SelectItem>
              <SelectItem value="422">422 Rejected</SelectItem>
              <SelectItem value="500">500 Error</SelectItem>
            </SelectContent>
          </Select>
          <Select value={kindFilter} onValueChange={setKindFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Kind" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All kinds</SelectItem>
              <SelectItem value="vocab">Vocabulary</SelectItem>
              <SelectItem value="grammar">Grammar</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-left">
                    <th className="p-2">Time</th>
                    <th className="p-2">Kind</th>
                    <th className="p-2">Vocabulary</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">Outcome</th>
                    <th className="p-2">Reason</th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">Loading…</td></tr>
                  ) : rows.length === 0 ? (
                    <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">No log entries.</td></tr>
                  ) : rows.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="p-2 whitespace-nowrap">{format(new Date(r.created_at), "MMM d, HH:mm:ss")}</td>
                      <td className="p-2"><Badge variant="outline">{r.kind}</Badge></td>
                      <td className="p-2 max-w-[220px] truncate">{r.vocabulary}</td>
                      <td className="p-2">
                        <Badge variant={r.status === 200 ? "default" : "destructive"}>{r.status}</Badge>
                      </td>
                      <td className="p-2"><code className="text-xs">{r.outcome}</code></td>
                      <td className="p-2 max-w-[320px] truncate text-muted-foreground">{r.reason}</td>
                      <td className="p-2">
                        <Button size="sm" variant="ghost" onClick={() => setSelected(r)}>Details</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {selected && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Entry details</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => setSelected(null)}>Close</Button>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Kind:</span> {selected.kind}</div>
                <div><span className="text-muted-foreground">Status:</span> {selected.status}</div>
                <div><span className="text-muted-foreground">Outcome:</span> <code>{selected.outcome}</code></div>
                <div><span className="text-muted-foreground">Attempts:</span> {selected.attempts ?? "—"}</div>
                <div className="col-span-2"><span className="text-muted-foreground">Vocabulary:</span> {selected.vocabulary}</div>
                <div className="col-span-2"><span className="text-muted-foreground">Card ID:</span> <code className="text-xs">{selected.card_id}</code></div>
                <div className="col-span-2"><span className="text-muted-foreground">Reason:</span> <span className="text-destructive">{selected.reason ?? "—"}</span></div>
                {Array.isArray(selected.issues) && selected.issues.length > 0 && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Validator issues:</span>
                    <ul className="list-disc ml-6">
                      {(selected.issues as string[]).map((i, idx) => <li key={idx}>{i}</li>)}
                    </ul>
                  </div>
                )}
              </div>

              <div>
                <div className="font-medium mb-1">Image prompt (sent to gpt-image-2)</div>
                <pre className="bg-muted p-3 rounded text-xs whitespace-pre-wrap">{selected.image_prompt ?? "—"}</pre>
              </div>

              <div>
                <div className="font-medium mb-1">Validator prompt (sent to gemini-3-flash-preview)</div>
                <pre className="bg-muted p-3 rounded text-xs whitespace-pre-wrap">{selected.validator_prompt ?? "—"}</pre>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
