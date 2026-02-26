import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEOHead } from "@/components/seo/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useZohoOptin } from "@/hooks/useZohoOptin";
import {
  ArrowRight,
  CheckCircle2,
  X,
  Mail,
  Headphones,
  MessageCircle,
  Coffee,
  Repeat,
} from "lucide-react";

const ZOHO_FORM_ID = "sf3z4b1816f6eb42103f403359b04252f0327243f826727a9947f460a68187c4c64d";
const ZOHO_SCRIPT_SRC = "https://zgnp-zngp.maillist-manage.com/js/optin.min.js";
const REDIRECT_URL = "/learn/lesson/d4e5f6a7-0101-0101-0101-000000000001";

export default function FreeGulfLesson() {
  const formRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  useZohoOptin({ formId: ZOHO_FORM_ID, scriptSrc: ZOHO_SCRIPT_SRC });

  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !email.includes("@") || !email.includes(".")) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);

    const zohoInput = document.getElementById("EMBED_FORM_EMAIL_LABEL") as HTMLInputElement;
    if (zohoInput) zohoInput.value = email;

    const zohoBtn = document.getElementById("zcWebOptin") as HTMLInputElement;
    if (zohoBtn) zohoBtn.click();

    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
    }, 1200);

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
        description="Speak Gulf Arabic in 10 minutes. Learn real phrases used in the UAE & GCC — not textbook Arabic. Free lesson, instant access."
      />
      <Layout>
        {/* ─── SECTION 1 — HERO ─── */}
        <section className="relative overflow-hidden py-20 md:py-28">
          <div className="absolute inset-0 bg-hero-gradient opacity-[0.03] pointer-events-none z-0" />
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
                Speak Gulf Arabic in 10 Minutes
                <span className="text-gradient block mt-2">
                  Even If You're a Complete Beginner
                </span>
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
                Learn real phrases people actually use in the UAE &amp; GCC — not textbook Arabic.
              </p>

              <ul className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10 text-foreground font-medium">
                {[
                  "Say your first real sentence today",
                  "Hear native pronunciation",
                  "Understand how locals actually speak",
                ].map((b) => (
                  <li key={b} className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>

              <Button size="xl" variant="hero" onClick={scrollToForm}>
                Get My Free Lesson
                <ArrowRight className="w-5 h-5" />
              </Button>
              <p className="text-sm text-muted-foreground mt-4">
                Free. Instant access. No spam.
              </p>
            </div>
          </div>
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />
        </section>

        {/* ─── SECTION 2 — THE PROBLEM ─── */}
        <section className="py-16 bg-cream">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-10">
                Why Most Arabic Courses Don't Work for Expats
              </h2>
              <div className="space-y-5">
                {[
                  "They teach formal Arabic you'll never use",
                  "Too much grammar, not enough speaking",
                  "You finish lessons but still can't talk",
                ].map((p) => (
                  <div key={p} className="flex items-start gap-4 bg-card rounded-xl p-5 border border-border">
                    <X className="w-6 h-6 text-destructive flex-shrink-0 mt-0.5" />
                    <p className="text-foreground text-lg">{p}</p>
                  </div>
                ))}
              </div>
              <p className="text-center text-xl font-bold text-primary mt-10">
                This lesson fixes that.
              </p>
            </div>
          </div>
        </section>

        {/* ─── SECTION 3 — WHAT YOU'LL EXPERIENCE ─── */}
        <section className="py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-10">
                Inside This Free Lesson
              </h2>
              <div className="grid sm:grid-cols-2 gap-6">
                {[
                  { icon: MessageCircle, text: "Real-life greetings used daily" },
                  { icon: Coffee, text: "Practical phrases for everyday situations" },
                  { icon: Headphones, text: "Native audio so you pronounce correctly" },
                  { icon: Repeat, text: "A simple speaking framework you can reuse" },
                ].map((item) => (
                  <div key={item.text} className="flex items-center gap-4 bg-card rounded-xl p-5 border border-border">
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

        {/* ─── SECTION 4 — FUTURE VISION ─── */}
        <section className="py-16 bg-cream">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8">
                Imagine This...
              </h2>
              <div className="text-lg text-muted-foreground space-y-4 leading-relaxed">
                <p>You greet your neighbor in Arabic.</p>
                <p>You order confidently.</p>
                <p>You understand simple conversations.</p>
                <p>And people smile because you tried.</p>
              </div>
              <p className="text-xl font-bold text-primary mt-8">
                This is your first step.
              </p>
            </div>
          </div>
        </section>

        {/* ─── SECTION 5 — WHO IT'S FOR ─── */}
        <section className="py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-10">
                Who This Is For
              </h2>
              <div className="space-y-4">
                {[
                  "Expats living in the Gulf",
                  "Complete beginners",
                  "Anyone who wants to speak, not study grammar",
                ].map((q) => (
                  <div key={q} className="flex items-center gap-4 bg-card rounded-xl p-5 border border-border">
                    <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0" />
                    <p className="text-foreground text-lg">{q}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ─── SECTION 6 — FINAL CTA ─── */}
        <section className="py-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-xl mx-auto">
              <div
                ref={formRef}
                className="bg-card rounded-3xl p-8 md:p-10 border border-border shadow-xl"
              >
                <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-4">
                  Ready to Say Your First Sentence in Arabic?
                </h2>

                {submitted ? (
                  <div className="text-center py-8">
                    <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-4" />
                    <p className="text-xl font-bold text-foreground">You're in!</p>
                    <p className="text-muted-foreground mt-2">Loading your lesson…</p>
                  </div>
                ) : (
                  <>
                    <p className="text-muted-foreground text-center mb-8">
                      Enter your email and start speaking Gulf Arabic today.
                    </p>
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
                        {error && <p className="text-xs text-destructive">{error}</p>}
                      </div>
                      <Button type="submit" size="lg" variant="hero" className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? "Submitting..." : "Unlock My Free Lesson"}
                        {!isSubmitting && <ArrowRight className="w-4 h-4" />}
                      </Button>
                    </form>
                    <p className="text-sm text-muted-foreground text-center mt-6">
                      Free. Instant access. No spam.
                    </p>
                  </>
                )}
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
