import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [done, setDone] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase's recovery link creates a session automatically when it lands here.
    // Confirm we have one before letting the user set a new password.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast({ title: "Password too short", description: "Use at least 8 characters.", variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast({ title: "Couldn't update password", description: error.message, variant: "destructive" });
      return;
    }
    setDone(true);
    toast({ title: "Password updated", description: "You're all set." });
    setTimeout(() => navigate("/dashboard", { replace: true }), 1200);
  };

  return (
    <Layout>
      <section className="py-20 min-h-[calc(100vh-4rem)]">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto bg-card border border-border rounded-2xl p-8">
            <h1 className="text-2xl font-bold mb-2">Set a new password</h1>
            <p className="text-muted-foreground mb-6">Choose a strong password to secure your account.</p>
            {!ready && !done ? (
              <p className="text-sm text-muted-foreground">
                This page must be opened from the password reset email link. If you got here another way,{" "}
                <button className="text-primary underline" onClick={() => navigate("/login")}>go back to login</button>.
              </p>
            ) : done ? (
              <p className="text-sm">Redirecting you to your dashboard…</p>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pw">New password</Label>
                  <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pw2">Confirm password</Label>
                  <Input id="pw2" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Update password"}
                </Button>
              </form>
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
}
