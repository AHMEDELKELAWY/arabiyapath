import { useEffect, useRef, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { SEOHead } from "@/components/seo/SEOHead";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Headphones, BookOpen, MapPin, ExternalLink } from "lucide-react";

const ZOHO_FORM_ID = "sf3z4b1816f6eb42103f403359b04252f0327243f826727a9947f460a68187c4c64d";
const ZOHO_SCRIPT_SRC = "https://zgnp-zngp.maillist-manage.com/js/optin.min.js";
const ZOHO_FALLBACK_URL = "https://zgnp-zngp.maillist-manage.com/ua/Optin?od=11628c54c70982b91&zx=1365afe0c&tD=11628c54c70982d35&sD=11628c54c70982b9e";

export default function FreeGulfLesson() {
  const formRef = useRef<HTMLDivElement>(null);
  const [showFallback, setShowFallback] = useState(false);
  const initAttempted = useRef(false);
  const initSucceeded = useRef(false);

  useEffect(() => {
    // Skip on server-side or if already attempted
    if (typeof window === "undefined" || initAttempted.current) return;
    
    initAttempted.current = true;

    const initializeZohoForm = () => {
      // Check if setupSF exists
      if (typeof (window as any).setupSF === "function") {
        try {
          // Verify the target element exists
          const targetElement = document.getElementById(ZOHO_FORM_ID);
          if (targetElement) {
            (window as any).setupSF(
              ZOHO_FORM_ID,
              "ZCFORMVIEW",
              false,
              "light",
              false,
              "0"
            );
            initSucceeded.current = true;
          }
        } catch (error) {
          console.error("Zoho setupSF failed:", error);
        }
      }
    };

    // Define the form submit callback (Zoho expects this)
    (window as any)[`runOnFormSubmit_${ZOHO_FORM_ID}`] = function () {
      // Before submit callback - can add tracking here if needed
    };

    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      // Check if script already exists in DOM
      const existingScript = document.querySelector(`script[src="${ZOHO_SCRIPT_SRC}"]`);
      
      if (existingScript) {
        // Script exists - check if already loaded
        if ((window as any).setupSF) {
          initializeZohoForm();
        } else {
          // Script exists but not loaded yet
          existingScript.addEventListener("load", initializeZohoForm);
        }
      } else {
        // Create and load script
        const script = document.createElement("script");
        script.src = ZOHO_SCRIPT_SRC;
        script.type = "text/javascript";
        script.async = true;
        
        script.onload = () => {
          // Small delay to ensure Zoho script has fully initialized
          setTimeout(initializeZohoForm, 100);
        };
        
        script.onerror = () => {
          console.error("Failed to load Zoho script");
          setShowFallback(true);
        };
        
        document.head.appendChild(script);
      }
      
      // Set a timeout to show fallback only if initialization hasn't succeeded
      setTimeout(() => {
        if (!initSucceeded.current) {
          // Check if the form button exists and is functional
          const submitBtn = document.getElementById("zcWebOptin");
          if (!submitBtn) {
            setShowFallback(true);
          }
        }
      }, 5000);
    });
  }, []);

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
                className="bg-card rounded-3xl p-8 md:p-10 border border-border shadow-xl flex flex-col items-center"
              >
                <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-4">
                  Get Your Free Lesson
                </h2>
                <p className="text-muted-foreground text-center mb-8">
                  Enter your email to start learning Gulf Arabic today.
                </p>
                
                {/* Zoho Campaigns Embedded Form Container */}
                <div id="zoho-signup-form" className="w-full">
                  <div id="sf3z4b1816f6eb42103f403359b04252f0327243f826727a9947f460a68187c4c64d" data-type="signupform" style={{ opacity: 1 }}>
                    <div id="customForm">
                      <div 
                        style={{
                          width: "100%",
                          maxWidth: "379px",
                          height: "auto",
                          minHeight: "280px",
                          position: "relative",
                          fontFamily: "Arial",
                          backgroundColor: "transparent",
                          margin: "auto",
                          overflow: "hidden"
                        }}
                      >
                        <div style={{ width: "100%", position: "relative", fontFamily: "Arial", margin: "auto" }}>
                          <div style={{ position: "relative" }}>
                            <div 
                              id="Zc_SignupSuccess" 
                              style={{
                                display: "none",
                                position: "absolute",
                                marginLeft: "4%",
                                width: "90%",
                                backgroundColor: "white",
                                padding: "3px",
                                border: "3px solid rgb(194, 225, 154)",
                                marginTop: "10px",
                                marginBottom: "10px",
                                wordBreak: "break-all"
                              }}
                            >
                              <table width="100%" cellPadding={0} cellSpacing={0} style={{ border: 0 }}>
                                <tbody>
                                  <tr>
                                    <td width="10%">
                                      <img 
                                        className="successicon" 
                                        src="https://zgnp-zngp.maillist-manage.com/images/challangeiconenable.jpg" 
                                        style={{ verticalAlign: "middle" }}
                                        alt="Success"
                                      />
                                    </td>
                                    <td>
                                      <span 
                                        id="signupSuccessMsg" 
                                        style={{
                                          color: "rgb(73, 140, 132)",
                                          fontFamily: "sans-serif",
                                          fontSize: "14px",
                                          wordBreak: "break-word"
                                        }}
                                      >
                                        &nbsp;&nbsp;Thank you for Signing Up
                                      </span>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                          <form 
                            method="POST" 
                            id="zcampaignOptinForm" 
                            style={{ margin: "0px", width: "100%", color: "rgb(255, 255, 255)" }}
                            action="https://zgnp-zngp.maillist-manage.com/weboptin.zc" 
                            target="_zcSignup"
                          >
                            <div 
                              style={{
                                backgroundColor: "rgb(255, 235, 232)",
                                padding: "10px",
                                color: "rgb(210, 0, 0)",
                                fontSize: "11px",
                                border: "1px solid rgb(255, 217, 211)",
                                opacity: 1,
                                position: "absolute",
                                width: "80%",
                                margin: "20px 10%",
                                boxShadow: "rgb(27, 27, 27) 0px 5px 12px 0px",
                                display: "none"
                              }} 
                              id="errorMsgDiv"
                            >
                              Please correct the marked field(s) below.
                            </div>
                            <div style={{ textAlign: "center", width: "100%", position: "relative", zIndex: 2, paddingTop: "20px" }}>
                              <div style={{ textAlign: "center", width: "100%", maxWidth: "275px", height: "40px", margin: "auto", marginBottom: "20px", display: "inline-block" }}>
                                <input 
                                  type="text"
                                  style={{
                                    borderWidth: "0 0 1px",
                                    borderColor: "hsl(var(--border))",
                                    borderStyle: "solid",
                                    width: "100%",
                                    height: "100%",
                                    zIndex: 4,
                                    outline: "none",
                                    padding: "5px 10px",
                                    boxSizing: "border-box",
                                    color: "hsl(var(--foreground))",
                                    fontFamily: "Arial",
                                    backgroundColor: "transparent",
                                    fontSize: "16px"
                                  }}
                                  placeholder="Email Address"
                                  name="CONTACT_EMAIL"
                                  id="EMBED_FORM_EMAIL_LABEL"
                                />
                              </div>
                              <div style={{ position: "relative", width: "100%", maxWidth: "275px", height: "44px", marginTop: "0px", display: "inline-block" }}>
                                <input 
                                  type="button"
                                  style={{
                                    textAlign: "center",
                                    borderRadius: "8px",
                                    backgroundColor: "hsl(var(--primary))",
                                    width: "100%",
                                    height: "100%",
                                    zIndex: 5,
                                    border: "0",
                                    color: "hsl(var(--primary-foreground))",
                                    cursor: "pointer",
                                    outline: "none",
                                    fontFamily: "Arial",
                                    fontSize: "16px",
                                    fontWeight: "600"
                                  }}
                                  name="SIGNUP_SUBMIT_BUTTON"
                                  id="zcWebOptin"
                                  value="Get My Free Lesson"
                                />
                              </div>
                            </div>
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
                    <img 
                      src="https://zgnp-zngp.maillist-manage.com/images/spacer.gif" 
                      id="refImage" 
                      style={{ display: "none" }}
                      alt=""
                    />
                  </div>
                  <input type="hidden" id="signupFormType" value="QuickForm_Vertical" />
                  <div 
                    id="zcOptinOverLay" 
                    style={{
                      display: "none",
                      textAlign: "center",
                      backgroundColor: "rgb(0, 0, 0)",
                      opacity: 0.5,
                      zIndex: 100,
                      position: "fixed",
                      width: "100%",
                      top: "0px",
                      left: "0px",
                      height: "100vh"
                    }}
                  />
                  <div 
                    id="zcOptinSuccessPopup" 
                    style={{
                      display: "none",
                      zIndex: 9999,
                      width: "90%",
                      maxWidth: "800px",
                      height: "auto",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      position: "fixed",
                      backgroundColor: "#FFFFFF",
                      borderColor: "#E6E6E6",
                      borderStyle: "solid",
                      borderWidth: "1px",
                      boxShadow: "0 1px 10px #424242",
                      padding: "35px"
                    }}
                  >
                    <span 
                      style={{
                        position: "absolute",
                        top: "-16px",
                        right: "-14px",
                        zIndex: 99999,
                        cursor: "pointer"
                      }} 
                      id="closeSuccess"
                    >
                      <img src="https://zgnp-zngp.maillist-manage.com/images/videoclose.png" alt="Close" />
                    </span>
                    <div id="zcOptinSuccessPanel"></div>
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground text-center mt-6">
                  No spam. Unsubscribe anytime.
                </p>
                
                {showFallback && (
                  <a
                    href={ZOHO_FALLBACK_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 text-sm text-primary hover:underline mt-4"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open signup form in new tab
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>
      </Layout>
    </>
  );
}
