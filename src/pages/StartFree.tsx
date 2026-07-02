import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FocusLayout } from "@/components/layout/FocusLayout";
import { SEOHead } from "@/components/seo/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useZohoOptin } from "@/hooks/useZohoOptin";
import { useAuth } from "@/contexts/AuthContext";
import { destinationForPlan } from "@/lib/membershipPlans";
import {
  ArrowRight,
  CheckCircle2,
  Mail,
  Sparkles,
  Headphones,
  BookOpen,
  Mic,
  Brain,
} from "lucide-react";

// Same list as /free-gulf-lesson so all leads land in the same Zoho audience.
const ZOHO_FORM_ID = "sf3z4b1816f6eb42103f403359b04252f0327243f826727a9947f460a68187c4c64d";
const ZOHO_SCRIPT_SRC = "https://zgnp-zngp.maillist-manage.com/js/optin.min.js";

const FREE_BENEFITS: { icon: typeof BookOpen; text: string }[] = [
  { icon: BookOpen, text: "Unit 1 — Learn mode with realistic images" },
  { icon: Headphones, text: "Native audio for every card" },
  { icon: Mic, text: "Speaking practice with feedback" },
  { icon: Brain, text: "Quiz & spaced repetition on Unit 1" },
];

export default function StartFree() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  useZohoOptin({ formId: ZOHO_FORM_ID, scriptSrc: ZOHO_SCRIPT_SRC });

  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  // Already signed in? Skip the funnel — go straight to Unit 1.
  useEffect(() => {
    if (!isLoading && user) {
      navigate(destinationForPlan("free"), { replace: true });
    }
  }, [isLoading, user, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const value = email.trim();
    if (!value || !value.includes("@") || !value.includes(".")) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);

    // Push into hidden Zoho form + trigger their submit button.
    const zohoInput = document.getElementById("EMBED_FORM_EMAIL_LABEL") as HTMLInputElement | null;
    if (zohoInput) zohoInput.value = value;
    const zohoBtn = document.getElementById("zcWebOptin") as HTMLInputElement | null;
    if (zohoBtn) zohoBtn.click();

    // Brief confirmation, then continue to full signup with email prefilled.
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
    }, 900);

    setTimeout(() => {
      navigate(`/signup?plan=free&email=${encodeURIComponent(value)}`);
    }, 1600);
  };

  return (
    <>
      <SEOHead
        title="Start Free — ArabiyaPath Membership"
        description="Get instant free access to Unit 1 of the ArabiyaPath Membership. Native audio, realistic images, listening, speaking and quizzes — no credit card required."
        canonicalPath="/start-free"
        noindex
      />
      <FocusLayout>
        <section className="relative overflow-hidden py-16 md:py-24">
          <div className="absolute inset-0 bg-hero-gradient opacity-[0.04] pointer-events-none z-0" />
          <div className="absolute top-16 left-8 w-72 h-72 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-8 right-8 w-96 h-96 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />

          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="max-w-xl mx-auto">
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 mb-5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Free access · No credit card
                </div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground leading-tight">
                  Unlock Unit 1 of the{" "}
                  <span className="text-gradient">ArabiyaPath Membership</span>
                </h1>
                <p className="text-base sm:text-lg text-muted-foreground mt-4">
                  Enter your email and we'll drop you right into your first lesson.
                </p>
              </div>

              <div className="bg-card rounded-3xl p-6 sm:p-8 border border-border shadow-xl">
                {submitted ? (
                  <div className="text-center py-8">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="w-7 h-7 text-primary" />
                    </div>
                    <p className="text-xl font-bold text-foreground">You're in!</p>
                    <p className="text-muted-foreground mt-2">
                      Taking you to create your account…
                    </p>
                  </div>
                ) : (
                  <>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <label htmlFor="start-free-email" className="text-sm font-medium">
                          Your email
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="start-free-email"
                            type="email"
                            inputMode="email"
                            autoComplete="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => {
                              setEmail(e.target.value);
                              if (error) setError("");
                            }}
                            className="pl-10 h-12"
                            required
                            autoFocus
                          />
                        </div>
                        {error && <p className="text-xs text-destructive">{error}</p>}
                      </div>
                      <Button
                        type="submit"
                        size="lg"
                        variant="hero"
                        className="w-full"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? "Sending…" : "Get instant access"}
                        {!isSubmitting && <ArrowRight className="w-4 h-4 ml-1" />}
                      </Button>
                      <p className="text-xs text-muted-foreground text-center">
                        Free forever. No credit card. Unsubscribe anytime.
                      </p>
                    </form>

                    <div className="mt-6 pt-6 border-t border-border">
                      <ul className="space-y-2.5">
                        {FREE_BENEFITS.map(({ icon: Icon, text }) => (
                          <li key={text} className="flex items-start gap-2.5 text-sm">
                            <Icon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                            <span className="text-foreground">{text}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <p className="text-center text-xs text-muted-foreground mt-6">
                      Already have an account?{" "}
                      <Link
                        to="/login?plan=free"
                        className="text-primary font-medium hover:underline"
                      >
                        Log in
                      </Link>
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Hidden Zoho form — kept in DOM for optin script compatibility. */}
        <div className="sr-only" aria-hidden="true">
          <div id={ZOHO_FORM_ID} data-type="signupform" style={{ opacity: 1 }}>
            <div id="customForm">
              <div>
                <div id="Zc_SignupSuccess" style={{ display: "none" }}>
                  <span id="signupSuccessMsg">Thank you for Signing Up</span>
                </div>
                <form
                  method="POST"
                  id="zcampaignOptinForm"
                  action="https://zgnp-zngp.maillist-manage.com/weboptin.zc"
                  target="_zcSignup"
                >
                  <div id="errorMsgDiv" style={{ display: "none" }}>
                    Please correct the marked field(s) below.
                  </div>
                  <input type="text" name="CONTACT_EMAIL" id="EMBED_FORM_EMAIL_LABEL" placeholder="Email Address" />
                  <input type="button" name="SIGNUP_SUBMIT_BUTTON" id="zcWebOptin" value="Get instant access" />
                  <input type="hidden" id="fieldBorder" value="" />
                  <input type="hidden" id="submitType" name="submitType" value="optinCustomView" />
                  <input type="hidden" id="emailReportId" name="emailReportId" value="" />
                  <input type="hidden" id="formType" name="formType" value="QuickForm" />
                  <input type="hidden" name="zx" id="cmpZuid" value="1365afe0c" />
                  <input type="hidden" name="zcvers" value="3.0" />
                  <input type="hidden" name="oldListIds" id="allCheckedListIds" value="" />
                  <input type="hidden" id="mode" name="mode" value="OptinCreateView" />
                  <input type="hidden" id="zcld" name="zcld" value="11628c54c70982d35" />
                  <input type="hidden" id="zctd" name="zctd" value="11628c54c70982b91" />
                  <input type="hidden" id="document_domain" value="" />
                  <input type="hidden" id="zc_Url" value="zgnp-zngp.maillist-manage.com" />
                  <input type="hidden" id="new_optin_response_in" value="1" />
                  <input type="hidden" id="duplicate_optin_response_in" value="0" />
                  <input type="hidden" name="zc_trackCode" id="zc_trackCode" value="ZCFORMVIEW" />
                  <input type="hidden" id="zc_formIx" name="zc_formIx" value="3z4b1816f6eb42103f403359b04252f0327243f826727a9947f460a68187c4c64d" />
                  <input type="hidden" id="viewFrom" value="URL_ACTION" />
                  <span style={{ display: "none" }} id="dt_CONTACT_EMAIL">1,true,6,Contact Email,2</span>
                  <span style={{ display: "none" }} id="dt_FIRSTNAME">1,false,1,First Name,2</span>
                  <span style={{ display: "none" }} id="dt_LASTNAME">1,false,1,Last Name,2</span>
                </form>
              </div>
            </div>
          </div>
          <input type="hidden" id="signupFormType" value="QuickForm_Vertical" />
          <div id="zcOptinOverLay" style={{ display: "none" }} />
          <div id="zcOptinSuccessPopup" style={{ display: "none" }}>
            <span id="closeSuccess" />
            <div id="zcOptinSuccessPanel"></div>
          </div>
          <img
            src="https://zgnp-zngp.maillist-manage.com/images/spacer.gif"
            id="refImage"
            style={{ display: "none" }}
            alt=""
          />
        </div>
      </FocusLayout>
    </>
  );
}
