/**
 * Admin — Intermediate Test Analytics.
 *
 * Read-only dashboard of every attempt logged in `flashcard_intermediate_test_attempts`,
 * joined with unit title and learner email. Supports filtering by unit and by user.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

interface AttemptRow {
  id: string;
  user_id: string;
  unit_id: string;
  score: number;
  total: number;
  percentage: number;
  passed: boolean;
  started_at: string;
  finished_at: string;
  duration_seconds: number;
}

interface Unit { id: string; title_en: string; }
interface Profile { user_id: string; email: string | null; first_name: string | null; last_name: string | null; }

function fmtDuration(sec: number): string {
  if (!sec || sec < 0) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function fmtDate(iso: string): string {
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

export default function AdminIntermediateAnalytics() {
  const [unitFilter, setUnitFilter] = useState<string>("all");
  const [userSearch, setUserSearch] = useState("");

  const { data: units } = useQuery<Unit[]>({
    queryKey: ["admin-intermediate-analytics-units"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("flashcard_units")
        .select("id,title_en,course_level_id")
        .order("order_index");
      if (error) throw error;
      return (data ?? []) as Unit[];
    },
  });

  const { data: attempts, isLoading } = useQuery<AttemptRow[]>({
    queryKey: ["admin-intermediate-analytics-attempts", unitFilter],
    queryFn: async () => {
      let q = (supabase as any)
        .from("flashcard_intermediate_test_attempts")
        .select("id,user_id,unit_id,score,total,percentage,passed,started_at,finished_at,duration_seconds")
        .order("finished_at", { ascending: false })
        .limit(1000);
      if (unitFilter !== "all") q = q.eq("unit_id", unitFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as AttemptRow[];
    },
  });

  const userIds = useMemo(() => Array.from(new Set((attempts ?? []).map((a) => a.user_id))), [attempts]);

  const { data: profiles } = useQuery<Profile[]>({
    queryKey: ["admin-intermediate-analytics-profiles", userIds.join(",")],
    enabled: userIds.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("user_id,email,first_name,last_name")
        .in("user_id", userIds);
      if (error) throw error;
      return (data ?? []) as Profile[];
    },
  });

  const unitMap = useMemo(() => new Map((units ?? []).map((u) => [u.id, u.title_en])), [units]);
  const profileMap = useMemo(() => new Map((profiles ?? []).map((p) => [p.user_id, p])), [profiles]);

  const rows = useMemo(() => {
    let list = attempts ?? [];
    if (userSearch.trim()) {
      const q = userSearch.trim().toLowerCase();
      list = list.filter((a) => {
        const p = profileMap.get(a.user_id);
        const name = `${p?.first_name ?? ""} ${p?.last_name ?? ""}`.toLowerCase();
        return (p?.email ?? "").toLowerCase().includes(q) || name.includes(q) || a.user_id.includes(q);
      });
    }
    return list;
  }, [attempts, userSearch, profileMap]);

  // Aggregate per user + unit for summary metrics
  const grouped = useMemo(() => {
    const map = new Map<string, {
      user_id: string; unit_id: string;
      attempts: number; highest: number; latest: number; passed: boolean;
      latestAt: string; startedAt: string; durationSum: number;
      timeline: AttemptRow[];
    }>();
    for (const a of rows) {
      const key = `${a.user_id}::${a.unit_id}`;
      const g = map.get(key);
      if (!g) {
        map.set(key, {
          user_id: a.user_id, unit_id: a.unit_id,
          attempts: 1, highest: a.percentage, latest: a.percentage, passed: a.passed,
          latestAt: a.finished_at, startedAt: a.started_at, durationSum: a.duration_seconds,
          timeline: [a],
        });
      } else {
        g.attempts += 1;
        g.highest = Math.max(g.highest, a.percentage);
        g.durationSum += a.duration_seconds;
        g.timeline.push(a);
        if (new Date(a.finished_at) > new Date(g.latestAt)) {
          g.latestAt = a.finished_at;
          g.latest = a.percentage;
          g.passed = a.passed;
        }
        if (new Date(a.started_at) < new Date(g.startedAt)) g.startedAt = a.started_at;
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime()
    );
  }, [rows]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Intermediate Test Analytics</h1>
          <p className="text-sm text-muted-foreground">Read-only monitoring of Intermediate assessment attempts.</p>
        </div>

        <Card>
          <CardContent className="p-4 flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs text-muted-foreground">Unit</label>
              <Select value={unitFilter} onValueChange={setUnitFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All units</SelectItem>
                  {(units ?? []).map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.title_en}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[240px]">
              <label className="text-xs text-muted-foreground">User (email or name)</label>
              <Input
                placeholder="Search learner…"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : grouped.length === 0 ? (
          <p className="text-sm text-muted-foreground">No attempts match this filter.</p>
        ) : (
          <div className="grid gap-3">
            {grouped.map((g) => {
              const p = profileMap.get(g.user_id);
              const name = [p?.first_name, p?.last_name].filter(Boolean).join(" ") || "—";
              return (
                <Card key={`${g.user_id}::${g.unit_id}`}>
                  <CardHeader className="pb-2">
                    <div className="flex flex-wrap justify-between gap-2 items-start">
                      <div>
                        <CardTitle className="text-base">
                          {unitMap.get(g.unit_id) ?? "(unknown unit)"}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {name} · {p?.email ?? g.user_id}
                        </p>
                      </div>
                      <Badge variant={g.passed ? "default" : "destructive"}>
                        {g.passed ? "Passed" : "Fail"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm mb-3">
                      <Stat label="Attempts" value={String(g.attempts)} />
                      <Stat label="Highest" value={`${g.highest}%`} />
                      <Stat label="Latest" value={`${g.latest}%`} />
                      <Stat label="Total time" value={fmtDuration(g.durationSum)} />
                      <Stat label="Started" value={fmtDate(g.startedAt)} />
                      <Stat label="Finished (latest)" value={fmtDate(g.latestAt)} />
                    </div>
                    <details>
                      <summary className="text-xs text-muted-foreground cursor-pointer">
                        Attempt timeline ({g.timeline.length})
                      </summary>
                      <div className="mt-2 space-y-1">
                        {g.timeline
                          .slice()
                          .sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime())
                          .map((a, i) => (
                            <div key={a.id} className="text-xs flex flex-wrap gap-2 items-center border-l-2 pl-2 border-muted">
                              <span className="font-medium">#{i + 1}</span>
                              <span>{fmtDate(a.started_at)} → {fmtDate(a.finished_at)}</span>
                              <span className="text-muted-foreground">({fmtDuration(a.duration_seconds)})</span>
                              <span>{a.score}/{a.total} · {a.percentage}%</span>
                              <Badge variant={a.passed ? "default" : "destructive"} className="text-[10px]">
                                {a.passed ? "Pass" : "Fail"}
                              </Badge>
                            </div>
                          ))}
                      </div>
                    </details>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
