import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck, AlertCircle } from "lucide-react";

interface ConsentClient {
  name?: string;
  redirect_uri?: string;
}

interface AuthorizationDetails {
  client?: ConsentClient;
  scope?: string;
  scopes?: string[];
  redirect_url?: string;
  redirect_to?: string;
}

// Minimal typed wrapper — the `auth.oauth` namespace is beta and may not
// appear in the current @supabase/supabase-js types.
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
};

function getOAuthApi(): OAuthApi | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const api = (supabase.auth as any)?.oauth;
  return api ?? null;
}

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<AuthorizationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Missing authorization_id in URL.");
        return;
      }
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        // Preserve the FULL consent URL so login/signup returns the user here.
        const next = window.location.pathname + window.location.search;
        window.location.href = `/login?redirect=${encodeURIComponent(next)}`;
        return;
      }
      setEmail(sessionData.session.user.email ?? null);

      const api = getOAuthApi();
      if (!api) {
        setError(
          "This app's OAuth server isn't available yet. Please try again in a moment.",
        );
        return;
      }
      const { data, error: err } = await api.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (err) {
        setError(err.message);
        return;
      }
      // Provider may return an immediate redirect for pre-approved / reused clients.
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    const api = getOAuthApi();
    if (!api) {
      setError("OAuth server unavailable.");
      return;
    }
    setBusy(true);
    const { data, error: err } = approve
      ? await api.approveAuthorization(authorizationId)
      : await api.denyAuthorization(authorizationId);
    if (err) {
      setBusy(false);
      setError(err.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 py-16 bg-background">
        <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Could not load this connection request</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button onClick={() => (window.location.href = "/dashboard")} className="w-full">
            Go to Dashboard
          </Button>
        </div>
      </main>
    );
  }

  if (!details) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 py-16 bg-background">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Preparing the connection…</p>
        </div>
      </main>
    );
  }

  const clientName = details.client?.name ?? "an app";
  const scopes = details.scopes ?? (details.scope ? details.scope.split(/\s+/).filter(Boolean) : []);
  const redirectUri = details.client?.redirect_uri;

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-16 bg-background">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground leading-tight">
              Connect {clientName} to ArabiyaPath
            </h1>
            {email && (
              <p className="text-xs text-muted-foreground mt-0.5">Signed in as {email}</p>
            )}
          </div>
        </div>

        <p className="text-sm text-foreground mb-4">
          This lets <span className="font-semibold">{clientName}</span> use ArabiyaPath as you —
          calling this app's enabled tools while you're signed in.
        </p>

        {redirectUri && (
          <p className="text-xs text-muted-foreground mb-4 break-all">
            Redirect: <span className="font-mono">{redirectUri}</span>
          </p>
        )}

        {scopes.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Requested permissions
            </p>
            <ul className="space-y-1.5 text-sm text-foreground">
              {scopes.map((scope) => (
                <li key={scope} className="flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  <span>{describeScope(scope)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-xs text-muted-foreground mb-6">
          This does not bypass ArabiyaPath's own permissions or row-level security — the
          connected app can only see and do what your account is allowed to.
        </p>

        <div className="space-y-2">
          <Button onClick={() => decide(true)} disabled={busy} className="w-full" size="lg">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : `Approve and connect ${clientName}`}
          </Button>
          <Button
            onClick={() => decide(false)}
            disabled={busy}
            variant="outline"
            className="w-full"
            size="lg"
          >
            Cancel connection
          </Button>
        </div>
      </div>
    </main>
  );
}

function describeScope(scope: string): string {
  switch (scope) {
    case "openid":
      return "Verify your identity";
    case "email":
      return "Share your email address";
    case "profile":
      return "Share your basic profile";
    default:
      return `Additional permission: ${scope}`;
  }
}
