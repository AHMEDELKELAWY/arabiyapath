import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEOHead } from "@/components/seo/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useZohoOptin } from "@/hooks/useZohoOptin";
import { ArrowRight, CheckCircle2, Headphones, BookOpen, MapPin, Mail } from "lucide-react";

const ZOHO_FORM_ID = "sf3z4b1816f6eb42103f403359b04252f0327243f826727a9947f460a68187c4c64d";
const ZOHO_SCRIPT_SRC = "https://zgnp-zngp.maillist-manage.com/js/optin.min.js";
const REDIRECT_URL = "/learn/lesson/d4e5f6a7-0101-0101-0101-000000000001";

export default function FreeGulfLesson() {
  const formRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  useZohoOptin({ formId: ZOHO_FORM_ID, scriptSrc: ZOHO_SCRIPT_SRC });

  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !email.includes("@") || !email.includes(".")) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);

    // Set hidden Zoho input value
    const zohoInput = document.getElementById("EMBED_FORM_EMAIL_LABEL") as HTMLInputElement;
    if (zohoInput) {
      zohoInput.value = email;
    }

    // Click hidden Zoho submit button
    const zohoBtn = document.getElementById("zcWebOptin") as HTMLInputElement;
    if (zohoBtn) {
      zohoBtn.click();
    }

    // Redirect after a short delay (Zoho submits via iframe, so we can't detect completion reliably)
    setTimeout(() => {
      navigate(REDIRECT_URL);
    }, 2500);
  };

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <SEOHead
        canonicalPath="/free-gulf-lesson"
        title="Free Gulf Arabic Lesson for Expats | ArabiyaPath"
        description="Start speaking Gulf Arabic today with a free lesson. Learn the Arabic people actually speak in the Gulf — no grammar, no pressure, just real conversation."
      />
      <Layout>
        {/* Hero Section */}
        <section className="relative overflow-hidden py-16 md:py-24">
          <div className="absolute inset-0 bg-hero-gradient opacity-[0.03] pointer-events-none z-0" />
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 animate-slide-up">
                Start Speaking Gulf Arabic Today
                <span className="text-gradient block mt-2">Free Lesson for Expats</span>
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 animate-slide-up" style={{ animationDelay: "0.1s" }}>
                Learn the Arabic people actually speak in the Gulf. No grammar. No pressure. Just real conversation.
              </p>
              <div className="animate-slide-up" style={{ animationDelay: "0.2s" }}>
                <Button size="xl" variant="hero" onClick={scrollToForm}>
                  Start Free Lesson
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />
        </section>

        {/* Why This Lesson Works */}
        <section className="py-16 bg-cream">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-10">
                Why This Lesson Works
              </h2>
              <div className="space-y-6">
                {[
                  "Textbook Arabic doesn't help in daily life",
                  "Grammar-heavy courses slow you down",
                  "This lesson focuses on speaking from day one",
                ].map((point, index) => (
                  <div key={index} className="flex items-start gap-4 bg-card rounded-xl p-5 border border-border">
                    <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
                    <p className="text-foreground text-lg">{point}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* What You'll Learn */}
        <section className="py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-10">
                What You'll Learn
              </h2>
              <div className="grid sm:grid-cols-2 gap-6">
                {[
                  { icon: Headphones, text: "How Gulf Arabic actually sounds" },
                  { icon: BookOpen, text: "Basic greetings you can use today" },
                  { icon: Headphones, text: "Pronunciation with native audio" },
                  { icon: MapPin, text: "How the full learning path works" },
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-4 bg-card rounded-xl p-5 border border-border">
                    <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-6 h-6 text-primary" />
                    </div>
                    <p className="text-foreground font-medium">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Who This Is For */}
        <section className="py-16 bg-cream">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-10">
                Who This Is For
              </h2>
              <div className="space-y-4">
                {[
                  "Expats living in the Gulf (UAE, Saudi, Qatar, etc.)",
                  "Complete beginners",
                  "Learners who want to speak, not study grammar",
                ].map((qualifier, index) => (
                  <div key={index} className="flex items-center gap-4 bg-card rounded-xl p-5 border border-border">
                    <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0" />
                    <p className="text-foreground text-lg">{qualifier}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Zoho Campaigns Email Form Section */}
        <section className="py-20" id="signup-form">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-xl mx-auto">
               <div 
                ref={formRef} 
                className="bg-card rounded-3xl p-8 md:p-10 border border-border shadow-xl"
              >
                <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-4">
                  Get Your Free Lesson
                </h2>
                <p className="text-muted-foreground text-center mb-8">
                  Enter your email to start learning Gulf Arabic today.
                </p>

                {/* Custom visible form */}
                <form onSubmit={handleSubmit} className="space-y-4 max-w-sm mx-auto">
                  <div className="space-y-2">
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="email"
                        placeholder="Email Address"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setError(""); }}
                        className="pl-10 h-12"
                        required
                      />
                    </div>
                    {error && (
                      <p className="text-xs text-destructive">{error}</p>
                    )}
                  </div>
                  <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? "Submitting..." : "Get My Free Lesson"}
                    {!isSubmitting && <ArrowRight className="w-4 h-4" />}
                  </Button>
                </form>

                <p className="text-sm text-muted-foreground text-center mt-6">
                  No spam. Unsubscribe anytime.
                </p>
              </div>

              {/* Hidden Zoho form — kept in DOM for script compatibility */}
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
                        <input type="button" name="SIGNUP_SUBMIT_BUTTON" id="zcWebOptin" value="Get My Free Lesson" />
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
                <img src="https://zgnp-zngp.maillist-manage.com/images/spacer.gif" id="refImage" style={{ display: "none" }} alt="" />
              </div>
            </div>
          </div>
        </section>
      </Layout>
    </>
  );
}
