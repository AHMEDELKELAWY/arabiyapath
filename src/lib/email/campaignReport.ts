import { supabase } from "@/integrations/supabase/client";

/** RFC-4180 safe CSV cell. */
const cell = (v: unknown): string => {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const toCsv = (rows: (string | number | null | undefined)[][]): string =>
  rows.map((r) => r.map(cell).join(",")).join("\r\n");

export function downloadCsv(filename: string, csv: string) {
  // BOM so Excel opens UTF-8 (Arabic subjects) correctly.
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "campaign";

/**
 * Builds and downloads a CSV containing the campaign summary followed by
 * every per-recipient row from email_sends.
 */
export async function exportCampaignReport(campaignId: string): Promise<{ filename: string; recipients: number }> {
  const { data: campaign, error: cErr } = await supabase
    .from("email_campaigns")
    .select(
      "id, subject, audience, content_mode, exclude_purchasers, recipients_count, sent_success, sent_failed, skipped_count, status, error_message, sent_at, started_at, completed_at, created_at",
    )
    .eq("id", campaignId)
    .maybeSingle();
  if (cErr) throw cErr;
  if (!campaign) throw new Error("Campaign not found.");

  const { data: sends, error: sErr } = await supabase
    .from("email_sends")
    .select("email, user_id, status, error_message, event_detail, event_at, sent_at")
    .eq("campaign_id", campaignId)
    .order("sent_at", { ascending: true });
  if (sErr) throw sErr;

  const c = campaign as any;
  const rows: (string | number | null | undefined)[][] = [
    ["Campaign report"],
    ["Subject", c.subject],
    ["Audience", c.audience],
    ["Exclude purchasers", c.exclude_purchasers ? "yes" : "no"],
    ["Content mode", c.content_mode ?? "visual"],
    ["Status", c.status],
    ["Recipients", c.recipients_count ?? 0],
    ["Sent", c.sent_success ?? 0],
    ["Failed", c.sent_failed ?? 0],
    ["Skipped", c.skipped_count ?? 0],
    ["Started at", c.started_at ?? c.sent_at ?? ""],
    ["Completed at", c.completed_at ?? ""],
    ["Error", c.error_message ?? ""],
    [],
    ["Email", "User ID", "Status", "Failure reason", "Event detail", "Event at", "Sent at"],
  ];

  for (const s of (sends ?? []) as any[]) {
    rows.push([
      s.email ?? "",
      s.user_id ?? "",
      s.status ?? "",
      s.error_message ?? "",
      s.event_detail ?? "",
      s.event_at ?? "",
      s.sent_at ?? "",
    ]);
  }

  const stamp = (c.sent_at ?? c.created_at ?? new Date().toISOString()).slice(0, 10);
  const filename = `campaign-${slug(c.subject)}-${stamp}.csv`;
  downloadCsv(filename, toCsv(rows));
  return { filename, recipients: sends?.length ?? 0 };
}
