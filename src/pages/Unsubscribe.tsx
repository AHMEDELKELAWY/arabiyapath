import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [state, setState] = useState<"validating" | "confirm" | "already" | "invalid" | "done" | "error">("validating");
  const [email, setEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!token) { setState("invalid"); return; }
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_ANON_KEY } }
        );
        const data = await res.json().catch(() => ({}));
        if (!alive) return;
        if (res.ok && data?.valid) {
          setEmail(data.email || null);
          setState(data.alreadyUsed ? "already" : "confirm");
        } else {
          setState("invalid");
        }
      } catch {
        if (alive) setState("error");
      }
    })();
    return () => { alive = false; };
  }, [token]);

  const confirm = async () => {
    setBusy(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/handle-email-unsubscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
        body: JSON.stringify({ token }),
      });
      setState(res.ok ? "done" : "error");
    } catch { setState("error"); }
    setBusy(false);
  };

  return (
    <Layout>
      <section className="py-20 min-h-[60vh]">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto bg-card border border-border rounded-2xl p-8 text-center">
            <h1 className="text-2xl font-bold mb-2">Unsubscribe</h1>
            {state === "validating" && (
              <div className="flex items-center justify-center py-6"><Loader2 className="w-6 h-6 animate-spin" /></div>
            )}
            {state === "confirm" && (
              <>
                <p className="text-muted-foreground mb-6">
                  Unsubscribe {email ? <strong>{email}</strong> : "this address"} from ArabiyaPath emails?
                </p>
                <Button onClick={confirm} disabled={busy} className="w-full">
                  {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirm unsubscribe"}
                </Button>
              </>
            )}
            {state === "already" && <p className="text-muted-foreground">This address is already unsubscribed.</p>}
            {state === "done" && <p className="text-muted-foreground">You've been unsubscribed. Sorry to see you go.</p>}
            {state === "invalid" && <p className="text-muted-foreground">This unsubscribe link is invalid or expired.</p>}
            {state === "error" && <p className="text-destructive">Something went wrong. Please try again later.</p>}
          </div>
        </div>
      </section>
    </Layout>
  );
}
