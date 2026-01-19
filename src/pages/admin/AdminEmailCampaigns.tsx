import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Send, Mail, Users, Calendar } from "lucide-react";
import { format } from "date-fns";

interface Campaign {
  id: string;
  subject: string;
  content: string;
  sent_at: string | null;
  recipients_count: number | null;
  created_at: string;
}

export default function AdminEmailCampaigns() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [sendingCampaignId, setSendingCampaignId] = useState<string | null>(null);

  // Fetch campaigns
  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['email-campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_campaigns')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Campaign[];
    },
  });

  // Fetch subscriber count
  const { data: subscriberCount } = useQuery({
    queryKey: ['subscriber-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('marketing_consent', true)
        .eq('email_verified', true);
      
      if (error) throw error;
      return count || 0;
    },
  });

  // Create campaign mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('email_campaigns')
        .insert({ subject, content })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-campaigns'] });
      setIsCreateOpen(false);
      setSubject("");
      setContent("");
      toast({
        title: "Campaign Created",
        description: "Your email campaign has been saved as a draft.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create campaign.",
        variant: "destructive",
      });
    },
  });

  // Send campaign mutation
  const sendMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      setSendingCampaignId(campaignId);
      const { data, error } = await supabase.functions.invoke('send-marketing-email', {
        body: { campaignId },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['email-campaigns'] });
      toast({
        title: "Campaign Sent! ✓",
        description: `Successfully sent to ${data.sentCount} subscribers.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Send Failed",
        description: error.message || "Failed to send campaign.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setSendingCampaignId(null);
    },
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Email Campaigns</h1>
            <p className="text-muted-foreground">
              Create and send marketing emails to your subscribers
            </p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Create Email Campaign</DialogTitle>
                <DialogDescription>
                  Compose your marketing email. Use {"{{first_name}}"} to personalize.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Subject</label>
                  <Input
                    placeholder="Email subject line..."
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Content (HTML)</label>
                  <Textarea
                    placeholder="<h2>Hello {{first_name}}!</h2><p>Your email content here...</p>"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={10}
                    className="font-mono text-sm"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => createMutation.mutate()}
                  disabled={!subject || !content || createMutation.isPending}
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Campaign"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Subscribers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{subscriberCount || 0}</div>
              <p className="text-xs text-muted-foreground">
                Verified users with marketing consent
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{campaigns?.length || 0}</div>
              <p className="text-xs text-muted-foreground">
                All time campaigns
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sent Campaigns</CardTitle>
              <Send className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {campaigns?.filter(c => c.sent_at).length || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Successfully delivered
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Campaigns Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Campaigns</CardTitle>
            <CardDescription>
              Manage your email marketing campaigns
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : campaigns && campaigns.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Recipients</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell className="font-medium max-w-[300px] truncate">
                        {campaign.subject}
                      </TableCell>
                      <TableCell>
                        {campaign.sent_at ? (
                          <Badge variant="default" className="bg-green-500">
                            Sent
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Draft</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {campaign.recipients_count || 0}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(campaign.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        {!campaign.sent_at && (
                          <Button
                            size="sm"
                            onClick={() => sendMutation.mutate(campaign.id)}
                            disabled={sendingCampaignId === campaign.id || subscriberCount === 0}
                          >
                            {sendingCampaignId === campaign.id ? (
                              <>
                                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                Sending...
                              </>
                            ) : (
                              <>
                                <Send className="mr-2 h-3 w-3" />
                                Send
                              </>
                            )}
                          </Button>
                        )}
                        {campaign.sent_at && (
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(campaign.sent_at), "MMM d, h:mm a")}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Mail className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>No campaigns yet</p>
                <p className="text-sm">Create your first email campaign to get started.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
