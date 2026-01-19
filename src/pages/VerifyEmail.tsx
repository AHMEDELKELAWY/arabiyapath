import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Mail, RefreshCw, CheckCircle2 } from "lucide-react";

export default function VerifyEmail() {
  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect if not logged in
    if (!user) {
      navigate("/login");
      return;
    }

    // Check if already verified
    if (profile?.email_verified) {
      navigate("/dashboard");
    }
  }, [user, profile, navigate]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleVerify = async () => {
    if (code.length !== 6) {
      toast({ title: "خطأ", description: "الرجاء إدخال الكود المكون من 6 أرقام", variant: "destructive" });
      return;
    }

    setIsVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-email-code", {
        body: { email: user?.email, code },
      });

      if (error) throw error;

      if (data.success) {
        toast({ title: "تم التأكيد!", description: "تم تأكيد بريدك الإلكتروني بنجاح" });
        // Refresh the page to update the profile
        window.location.href = "/dashboard";
      } else {
        throw new Error(data.error || "فشل التحقق");
      }
    } catch (error: any) {
      console.error("Verification error:", error);
      toast({ 
        title: "خطأ", 
        description: error.message === "Invalid verification code" 
          ? "الكود غير صحيح" 
          : error.message === "Verification code has expired"
          ? "انتهت صلاحية الكود، الرجاء طلب كود جديد"
          : "حدث خطأ أثناء التحقق", 
        variant: "destructive" 
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;

    setIsResending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-verification-email", {
        body: { 
          email: user?.email, 
          userId: user?.id,
          firstName: profile?.first_name 
        },
      });

      if (error) throw error;

      toast({ title: "تم الإرسال", description: "تم إرسال كود جديد إلى بريدك الإلكتروني" });
      setCountdown(60); // 60 seconds cooldown
      setCode(""); // Clear the current code
    } catch (error: any) {
      console.error("Resend error:", error);
      toast({ title: "خطأ", description: "فشل إرسال الكود الجديد", variant: "destructive" });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Layout>
      <section className="py-20 min-h-[calc(100vh-4rem)]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Mail className="w-10 h-10 text-primary" />
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-2">تأكيد البريد الإلكتروني</h1>
              <p className="text-muted-foreground">
                لقد أرسلنا كود مكون من 6 أرقام إلى
              </p>
              <p className="text-primary font-medium mt-1">{user?.email}</p>
            </div>

            <div className="bg-card rounded-2xl border border-border p-8">
              <div className="space-y-6">
                <div className="flex flex-col items-center space-y-4">
                  <label className="text-sm font-medium text-foreground">أدخل كود التأكيد</label>
                  <InputOTP 
                    maxLength={6} 
                    value={code} 
                    onChange={setCode}
                    className="gap-2"
                  >
                    <InputOTPGroup className="gap-2">
                      <InputOTPSlot index={0} className="w-12 h-14 text-xl" />
                      <InputOTPSlot index={1} className="w-12 h-14 text-xl" />
                      <InputOTPSlot index={2} className="w-12 h-14 text-xl" />
                      <InputOTPSlot index={3} className="w-12 h-14 text-xl" />
                      <InputOTPSlot index={4} className="w-12 h-14 text-xl" />
                      <InputOTPSlot index={5} className="w-12 h-14 text-xl" />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <Button 
                  onClick={handleVerify} 
                  size="lg" 
                  variant="hero" 
                  className="w-full"
                  disabled={isVerifying || code.length !== 6}
                >
                  {isVerifying ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5 ml-2" />
                      تأكيد
                    </>
                  )}
                </Button>

                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">لم تستلم الكود؟</p>
                  <Button
                    variant="ghost"
                    onClick={handleResend}
                    disabled={isResending || countdown > 0}
                    className="text-primary"
                  >
                    {isResending ? (
                      <Loader2 className="w-4 h-4 animate-spin ml-2" />
                    ) : (
                      <RefreshCw className="w-4 h-4 ml-2" />
                    )}
                    {countdown > 0 ? `إعادة الإرسال خلال ${countdown}ث` : "إعادة إرسال الكود"}
                  </Button>
                </div>
              </div>
            </div>

            <p className="text-center text-sm text-muted-foreground mt-6">
              الكود صالح لمدة 15 دقيقة
            </p>
          </div>
        </div>
      </section>
    </Layout>
  );
}
