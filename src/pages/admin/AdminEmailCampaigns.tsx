import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, Send, Mail, Users, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface EmailCampaign {
  id: string;
  subject: string;
  content: string;
  sent_at: string | null;
  recipients_count: number;
  created_at: string;
}

export default function AdminEmailCampaigns() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [sendingCampaignId, setSendingCampaignId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["email-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_campaigns")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as EmailCampaign[];
    },
  });

  const { data: subscribersCount } = useQuery({
    queryKey: ["subscribers-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("marketing_consent", true)
        .eq("email_verified", true);
      
      if (error) throw error;
      return count || 0;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("email_campaigns")
        .insert({ subject, content });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-campaigns"] });
      toast({ title: "تم الإنشاء", description: "تم إنشاء الحملة بنجاح" });
      setIsCreateOpen(false);
      setSubject("");
      setContent("");
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      setSendingCampaignId(campaignId);
      const { data, error } = await supabase.functions.invoke("send-marketing-email", {
        body: { campaignId },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["email-campaigns"] });
      toast({ 
        title: "تم الإرسال", 
        description: `تم إرسال ${data.sent} من ${data.total} رسالة بنجاح` 
      });
      setSendingCampaignId(null);
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
      setSendingCampaignId(null);
    },
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">الحملات البريدية</h1>
            <p className="text-muted-foreground">إدارة وإرسال الحملات التسويقية</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button variant="hero">
                <Plus className="w-4 h-4 ml-2" />
                حملة جديدة
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>إنشاء حملة جديدة</DialogTitle>
                <DialogDescription>أنشئ حملة بريدية جديدة لإرسالها للمشتركين</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">عنوان الرسالة</Label>
                  <Input 
                    id="subject" 
                    value={subject} 
                    onChange={(e) => setSubject(e.target.value)} 
                    placeholder="مثال: عرض خاص - خصم 50% على جميع الدورات"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content">محتوى الرسالة (HTML)</Label>
                  <Textarea 
                    id="content" 
                    value={content} 
                    onChange={(e) => setContent(e.target.value)} 
                    placeholder="<p>مرحباً!</p><p>لدينا عرض خاص لك...</p>"
                    rows={10}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>إلغاء</Button>
                <Button 
                  onClick={() => createMutation.mutate()} 
                  disabled={!subject || !content || createMutation.isPending}
                >
                  {createMutation.isPending && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                  إنشاء الحملة
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">المشتركون</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{subscribersCount || 0}</div>
              <p className="text-xs text-muted-foreground">مستخدم مؤكد وموافق على العروض</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي الحملات</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{campaigns?.length || 0}</div>
              <p className="text-xs text-muted-foreground">حملة بريدية</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">آخر إرسال</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {campaigns?.find(c => c.sent_at) 
                  ? format(new Date(campaigns.find(c => c.sent_at)!.sent_at!), "d MMM", { locale: ar })
                  : "-"
                }
              </div>
              <p className="text-xs text-muted-foreground">تاريخ آخر حملة مرسلة</p>
            </CardContent>
          </Card>
        </div>

        {/* Campaigns Table */}
        <Card>
          <CardHeader>
            <CardTitle>الحملات</CardTitle>
            <CardDescription>جميع الحملات البريدية المنشأة</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : campaigns && campaigns.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>العنوان</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>المستلمون</TableHead>
                    <TableHead>تاريخ الإنشاء</TableHead>
                    <TableHead>الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell className="font-medium">{campaign.subject}</TableCell>
                      <TableCell>
                        {campaign.sent_at ? (
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            مرسلة
                          </Badge>
                        ) : (
                          <Badge variant="secondary">مسودة</Badge>
                        )}
                      </TableCell>
                      <TableCell>{campaign.recipients_count || 0}</TableCell>
                      <TableCell>
                        {format(new Date(campaign.created_at), "d MMM yyyy", { locale: ar })}
                      </TableCell>
                      <TableCell>
                        {!campaign.sent_at && (
                          <Button 
                            size="sm" 
                            onClick={() => sendMutation.mutate(campaign.id)}
                            disabled={sendingCampaignId === campaign.id}
                          >
                            {sendingCampaignId === campaign.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Send className="w-4 h-4 ml-1" />
                                إرسال
                              </>
                            )}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                لا توجد حملات بعد. أنشئ حملتك الأولى!
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
