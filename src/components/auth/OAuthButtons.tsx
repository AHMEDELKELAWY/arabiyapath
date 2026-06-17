import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface OAuthButtonsProps {
  redirectUrl?: string;
}

export function OAuthButtons({ redirectUrl = "/dashboard" }: OAuthButtonsProps) {
  const { toast } = useToast();

  const handleOAuth = async (provider: "google" | "apple") => {
    const target = redirectUrl && redirectUrl.startsWith("/") ? redirectUrl : "/dashboard";
    const redirectTo = `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(target)}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });
    if (error) {
      toast({
        title: "Sign-in failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full h-12 gap-3"
        onClick={() => handleOAuth("google")}
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.99 10.99 0 0 0 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.07H2.18A10.99 10.99 0 0 0 1 12c0 1.77.42 3.44 1.18 4.93l3.66-2.83z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A10.99 10.99 0 0 0 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"/>
        </svg>
        Continue with Google
      </Button>
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full h-12 gap-3"
        onClick={() => handleOAuth("apple")}
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M16.365 1.43c0 1.14-.46 2.23-1.21 3.02-.79.86-2.07 1.52-3.12 1.44-.13-1.12.42-2.29 1.16-3.05.83-.86 2.24-1.49 3.17-1.41zM20.5 17.36c-.56 1.29-.83 1.87-1.55 3-.99 1.59-2.39 3.57-4.13 3.59-1.54.01-1.94-1-4.03-.99-2.09.01-2.53 1.01-4.07.99-1.74-.02-3.06-1.81-4.05-3.4-2.77-4.45-3.06-9.66-1.35-12.44 1.21-1.97 3.12-3.13 4.92-3.13 1.83 0 2.98 1 4.49 1 1.46 0 2.36-1 4.48-1 1.6 0 3.31.87 4.52 2.38-3.97 2.17-3.32 7.84.77 9z"/>
        </svg>
        Continue with Apple
      </Button>
      <div className="relative py-2">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
        </div>
      </div>
    </div>
  );
}
