import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, RefreshCw, CheckCircle } from "lucide-react";
import { Layout } from "@/components/layout/Layout";

export default function VerifyEmail() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Redirect if already verified
  useEffect(() => {
    if (profile?.email_verified) {
      navigate("/dashboard");
    }
  }, [profile, navigate]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleVerify = async () => {
    if (code.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter the 6-digit verification code.",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-email-code', {
        body: { email: user?.email, code },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Email Verified! ✓",
          description: "Welcome to ArabiyaPath! Redirecting...",
        });
        
        // Force profile refresh and redirect
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 1500);
      } else {
        throw new Error(data.error || 'Verification failed');
      }
    } catch (error: any) {
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid or expired code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    if (countdown > 0) return;
    
    setIsResending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-verification-email', {
        body: { 
          email: user?.email, 
          firstName: profile?.first_name 
        },
      });

      if (error) throw error;

      toast({
        title: "Code Sent!",
        description: "A new verification code has been sent to your email.",
      });
      
      setCountdown(60); // 60 second cooldown
      setCode(""); // Clear current code
    } catch (error: any) {
      toast({
        title: "Failed to Resend",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  if (!user) {
    navigate("/login");
    return null;
  }

  return (
    <Layout>
      <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-2xl shadow-xl border p-8 text-center">
            {/* Icon */}
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
              <Mail className="w-8 h-8 text-primary" />
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Verify Your Email
            </h1>
            <p className="text-muted-foreground mb-2">
              We've sent a 6-digit code to
            </p>
            <p className="text-foreground font-medium mb-8">
              {user?.email}
            </p>

            {/* OTP Input */}
            <div className="flex justify-center mb-6">
              <InputOTP
                maxLength={6}
                value={code}
                onChange={(value) => setCode(value)}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} className="w-12 h-14 text-xl" />
                  <InputOTPSlot index={1} className="w-12 h-14 text-xl" />
                  <InputOTPSlot index={2} className="w-12 h-14 text-xl" />
                  <InputOTPSlot index={3} className="w-12 h-14 text-xl" />
                  <InputOTPSlot index={4} className="w-12 h-14 text-xl" />
                  <InputOTPSlot index={5} className="w-12 h-14 text-xl" />
                </InputOTPGroup>
              </InputOTP>
            </div>

            {/* Verify Button */}
            <Button
              onClick={handleVerify}
              disabled={isVerifying || code.length !== 6}
              className="w-full h-12 text-base font-medium mb-4"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Verify Email
                </>
              )}
            </Button>

            {/* Resend Code */}
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-3">
                Didn't receive the code?
              </p>
              <Button
                variant="ghost"
                onClick={handleResendCode}
                disabled={isResending || countdown > 0}
                className="text-primary hover:text-primary/90"
              >
                {isResending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : countdown > 0 ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Resend in {countdown}s
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Resend Code
                  </>
                )}
              </Button>
            </div>

            {/* Help Text */}
            <p className="text-xs text-muted-foreground mt-6">
              Check your spam folder if you don't see the email.
              <br />
              The code expires in 15 minutes.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
