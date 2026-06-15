import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, AlertCircle } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const redirect = searchParams.get("redirect") || "/dashboard";

  useEffect(() => {
    // Supabase parses the URL fragment automatically via detectSessionInUrl.
    // Check for an error returned by the verify endpoint.
    const hash = window.location.hash || "";
    const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
    const errDesc = params.get("error_description") || searchParams.get("error_description");
    if (errDesc) {
      setError(decodeURIComponent(errDesc));
      return;
    }

    if (!isLoading && user) {
      navigate(redirect, { replace: true });
    }
  }, [isLoading, user, navigate, redirect, searchParams]);

  return (
    <Layout>
      <section className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center">
          {error ? (
            <>
              <div className="mx-auto w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <AlertCircle className="w-7 h-7 text-destructive" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Verification link invalid</h1>
              <p className="text-muted-foreground mb-6">{error}</p>
              <Button onClick={() => navigate("/signup")} className="w-full">
                Back to Sign Up
              </Button>
            </>
          ) : (
            <>
              <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-2">Verifying your email…</h1>
              <p className="text-muted-foreground">You'll be redirected automatically.</p>
            </>
          )}
        </div>
      </section>
    </Layout>
  );
}
