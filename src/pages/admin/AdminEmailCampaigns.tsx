import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Send, Eye, Mail } from "lucide-react";
import { format } from "date-fns";


type Audience = "all_users" | "never_purchased" | "active_members" | "expired_members" | "manual";

const AUDIENCES: { value: Audience; label: string }[] = [
  { value: "all_users", label: "All Users" },
  { value: "never_purchased", label: "Registered Users Who Never Purchased" },
  { value: "active_members", label: "Active Members" },
  { value: "expired_members", label: "Expired Members" },
  { value: "manual", label: "Manual Email List" },
];

const audienceLabel = (v: string) => AUDIENCES.find((a) => a.value === v)?.label ?? v;

/** Strips JavaScript vectors while preserving layout HTML and inline CSS. */
const sanitizeHtmlEmail = (html: string) =>
  html
    .replace(/<script\b[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<script\b[^>]*\/?>/gi, "")
    .replace(/<iframe\b[\s\S]*?<\/iframe\s*>/gi, "")
    .replace(/<object\b[\s\S]*?<\/object\s*>/gi, "")
    .replace(/<embed\b[^>]*\/?>/gi, "")
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "")
    .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, "")
    .replace(/(href|src|action)\s*=\s*"\s*javascript:[^"]*"/gi, '$1="#"')
    .replace(/(href|src|action)\s*=\s*'\s*javascript:[^']*'/gi, "$1='#'");

interface CampaignRow {
  id: string;
  subject: string;
  audience: string;
  recipients_count: number | null;
  sent_success: number | null;
  sent_failed: number | null;
  skipped_count: number | null;
  status: string;
  error_message: string | null;
  sent_at: string | null;
  completed_at: string | null;
  created_at: string;
}

/** Pulls the real message out of a Supabase Edge Function error response. */
async function edgeErrorMessage(err: unknown, fallback: string): Promise<string> {
  if (err instanceof FunctionsHttpError) {
    try {
      const body = await err.context.json();
      if (body?.error) return String(body.error);
      return JSON.stringify(body);
    } catch {
      try {
        const text = await err.context.text();
        if (text) return text;
      } catch { /* ignore */ }
    }
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}


export default function AdminEmailCampaigns() {
  const { toast } = useToast();
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();

  const [audience, setAudience] = useState<Audience>("all_users");
  const [excludePurchasers, setExcludePurchasers] = useState(false);
  const [manualList, setManualList] = useState("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [contentMode, setContentMode] = useState<"visual" | "html">("visual");

  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmCount, setConfirmCount] = useState(0);
  const [confirmSkipped, setConfirmSkipped] = useState(0);
  const [busy, setBusy] = useState<null | "count" | "test" | "send">(null);
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);

  const manualEmails = useMemo(
    () => manualList.split(/[\n,;]/).map((s) => s.trim()).filter(Boolean),
    [manualList],
  );

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["email-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_campaigns")
        .select("id, subject, audience, recipients_count, sent_success, sent_failed, skipped_count, status, error_message, sent_at, completed_at, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CampaignRow[];
    },
    // Poll while any campaign is still processing in the background.
    refetchInterval: (query) =>
      (query.state.data as CampaignRow[] | undefined)?.some((c) => c.status === "sending") ? 5000 : false,
  });

  const activeCampaign = campaigns?.find((c) => c.id === activeCampaignId) ?? null;

  useEffect(() => {
    if (!activeCampaign || activeCampaign.status === "sending") return;
    setActiveCampaignId(null);
    toast({
      title: activeCampaign.status === "failed" ? "Campaign failed" : "Campaign finished",
      description: activeCampaign.error_message
        ? activeCampaign.error_message
        : `${activeCampaign.sent_success ?? 0} sent, ${activeCampaign.sent_failed ?? 0} failed.`,
      variant: activeCampaign.status === "failed" ? "destructive" : undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCampaign?.status]);

  const payload = () => ({
    subject,
    content,
    contentMode,
    audience,
    excludePurchasers: audience === "all_users" ? excludePurchasers : false,
    manualEmails,
  });

  const canSend =
    subject.trim().length > 0 &&
    (contentMode === "html" ? content.trim().length > 0 : content.replace(/<[^>]*>/g, "").trim().length > 0);

  const invoke = async (mode: "count" | "test" | "send") => {
    const { data, error } = await supabase.functions.invoke("send-marketing-email", {
      body: { ...payload(), mode },
    });
    if (error) throw new Error(await edgeErrorMessage(error, "The email service could not be reached."));
    if ((data as any)?.error) throw new Error((data as any).error);
    return data as any;
  };

  const previewHtml = useMemo(() => {
    const name = profile?.first_name || "there";
    const email = profile?.email || user?.email || "student@example.com";
    const base = contentMode === "html" ? sanitizeHtmlEmail(content) : content;
    return base
      .replace(/\{\{\s*first_name\s*\}\}/g, name)
      .replace(/\{\{\s*email\s*\}\}/g, email)
      .replace(/\{\{\s*login_url\s*\}\}/g, "https://arabiyapath.com/login")
      .replace(/\{\{\s*unsubscribe_url\s*\}\}/g, "https://arabiyapath.com/unsubscribe");
  }, [content, contentMode, profile, user]);

  const handleOpenConfirm = async () => {
    setBusy("count");
    try {
      const data = await invoke("count");
      setConfirmCount(data.count ?? 0);
      setConfirmSkipped(data.skipped ?? 0);
      setConfirmOpen(true);
    } catch (e: any) {
      toast({ title: "Could not count recipients", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const handleTest = async () => {
    setBusy("test");
    try {
      const data = await invoke("test");
      toast({
        title: "Test email sent",
        description: `Delivered to ${data.recipient ?? profile?.email ?? user?.email}`,
      });
    } catch (e: any) {
      toast({ title: "Test email failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const handleSend = async () => {
    setBusy("send");
    try {
      const data = await invoke("send");
      setActiveCampaignId(data.campaignId ?? null);
      setConfirmOpen(false);
      queryClient.invalidateQueries({ queryKey: ["email-campaigns"] });
      toast({
        title: "Campaign started",
        description: `Sending to ${data.total} recipient(s) in the background. Progress updates below.`,
      });
    } catch (e: any) {
      toast({ title: "Send failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };


  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Email Campaigns</h1>
          <p className="text-muted-foreground">Send a one-off email to a selected audience.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Audience</CardTitle>
              <CardDescription>Choose who receives this campaign</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup value={audience} onValueChange={(v) => setAudience(v as Audience)} className="space-y-2">
                {AUDIENCES.map((a) => (
                  <div key={a.value} className="flex items-start gap-2">
                    <RadioGroupItem value={a.value} id={`aud-${a.value}`} className="mt-1" />
                    <Label htmlFor={`aud-${a.value}`} className="font-normal leading-snug">{a.label}</Label>
                  </div>
                ))}
              </RadioGroup>

              {audience === "all_users" && (
                <div className="flex items-start gap-2 rounded-md border border-border p-3">
                  <Checkbox
                    id="exclude-purchasers"
                    checked={excludePurchasers}
                    onCheckedChange={(c) => setExcludePurchasers(c === true)}
                    className="mt-0.5"
                  />
                  <Label htmlFor="exclude-purchasers" className="font-normal leading-snug">
                    Exclude users who already purchased
                  </Label>
                </div>
              )}

              {audience === "manual" && (
                <div className="space-y-2">
                  <Label htmlFor="manual-list">Email list (one per line)</Label>
                  <Textarea
                    id="manual-list"
                    rows={8}
                    value={manualList}
                    onChange={(e) => setManualList(e.target.value)}
                    placeholder={"student1@example.com\nstudent2@example.com"}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">{manualEmails.length} address(es)</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Message</CardTitle>
              <CardDescription>
                Variables: {"{{first_name}}"}, {"{{email}}"}, {"{{login_url}}"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Email subject line..." />
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label>Message</Label>
                  <div className="inline-flex rounded-md border border-border p-0.5">
                    <Button
                      type="button"
                      size="sm"
                      variant={contentMode === "visual" ? "secondary" : "ghost"}
                      onClick={() => setContentMode("visual")}
                    >
                      Visual
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={contentMode === "html" ? "secondary" : "ghost"}
                      onClick={() => setContentMode("html")}
                    >
                      HTML
                    </Button>
                  </div>
                </div>
                {contentMode === "visual" ? (
                  <RichTextEditor value={content} onChange={setContent} placeholder="Hi {{first_name}}, ..." />
                ) : (
                  <>
                    <Textarea
                      rows={18}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      spellCheck={false}
                      placeholder={"<!DOCTYPE html>\n<html>...paste your full HTML email template here...</html>"}
                      className="font-mono text-xs"
                    />
                    <p className="text-xs text-muted-foreground">
                      Pasted HTML is sent exactly as entered (inline CSS, tables and images preserved). Scripts and JavaScript are stripped.
                    </p>
                  </>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => setPreviewOpen(true)} disabled={!canSend}>
                  <Eye className="mr-2 h-4 w-4" /> Preview
                </Button>
                <Button variant="outline" onClick={handleTest} disabled={!canSend || busy !== null}>
                  {busy === "test" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                  Send Test Email
                </Button>
                <Button onClick={handleOpenConfirm} disabled={!canSend || busy !== null || (audience === "manual" && manualEmails.length === 0)}>
                  {busy === "count" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Send Campaign
                </Button>
              </div>

              {activeCampaign && (
                <div className="space-y-3 rounded-lg border border-border p-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Total Recipients</p>
                      <p className="text-xl font-bold">{activeCampaign.recipients_count ?? 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Successfully Sent</p>
                      <p className="text-xl font-bold text-primary">{activeCampaign.sent_success ?? 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Failed</p>
                      <p className="text-xl font-bold text-destructive">{activeCampaign.sent_failed ?? 0}</p>
                    </div>
                  </div>
                  {activeCampaign.status === "sending" && (
                    <p className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Sending in the background — you can leave this page, progress is saved.
                    </p>
                  )}
                  {activeCampaign.error_message && (
                    <p className="text-xs text-destructive break-words">{activeCampaign.error_message}</p>
                  )}
                </div>
              )}

            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Campaign Log</CardTitle>
            <CardDescription>Every campaign sent from this page</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : campaigns && campaigns.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>Audience</TableHead>
                    <TableHead>Recipients</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead>Failed</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium max-w-[280px] truncate">{c.subject}</TableCell>
                      <TableCell className="text-muted-foreground">{audienceLabel(c.audience)}</TableCell>
                      <TableCell>{c.recipients_count ?? 0}</TableCell>
                      <TableCell>{c.sent_success ?? 0}</TableCell>
                      <TableCell>{c.sent_failed ?? 0}</TableCell>
                      <TableCell>
                        <Badge variant={c.status === "sent" ? "default" : c.status === "failed" ? "destructive" : "secondary"}>
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {c.sent_at ? format(new Date(c.sent_at), "MMM d, yyyy h:mm a") : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <Mail className="mx-auto mb-4 h-12 w-12 opacity-50" />
                <p>No campaigns sent yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Preview */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Preview</DialogTitle>
            <DialogDescription>Subject: {subject}</DialogDescription>
          </DialogHeader>
          {contentMode === "html" ? (
            <div className="max-h-[60vh] overflow-auto rounded-lg bg-muted p-2">
              <iframe
                title="Email preview"
                sandbox=""
                srcDoc={previewHtml}
                className="h-[55vh] w-full rounded-lg border-0 bg-white"
              />
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-auto rounded-lg bg-muted p-4">
              <div className="mx-auto max-w-[600px] overflow-hidden rounded-2xl bg-background shadow">
                <div className="bg-primary p-6 text-center">
                  <span className="text-xl font-bold text-primary-foreground">ArabiyaPath</span>
                </div>
                <div
                  className="p-6 text-sm leading-relaxed [&_a]:text-primary [&_a]:underline [&_ul]:list-disc [&_ul]:pl-6"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
                <div className="bg-muted p-4 text-center text-xs text-muted-foreground">
                  © {new Date().getFullYear()} ArabiyaPath. All rights reserved.
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm send */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send campaign</DialogTitle>
            <DialogDescription>
              You are about to send this campaign to {confirmCount} recipients.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={busy === "send"}>Cancel</Button>
            <Button onClick={handleSend} disabled={busy === "send" || confirmCount === 0}>
              {busy === "send" ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</> : "Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
