import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Copy, ExternalLink } from "lucide-react";
import { SEOHead } from "@/components/seo/SEOHead";
import { trackEvent } from "@/lib/analytics";

const PROMO_CODE = "PREPLY30";
const REDEEM_URL =
  "https://preply.com/en/?pref=MjQyNDI5ODI=&id=1784694790.765835&ep=w1";

export default function PreplyDealsThankYou() {
  const [copied, setCopied] = useState(true);

  useEffect(() => {
    trackEvent("thank_you_view", { code: PROMO_CODE });
  }, []);

  const copyAgain = async () => {
    trackEvent("copy_code_again", { code: PROMO_CODE });
    try {
      await navigator.clipboard.writeText(PROMO_CODE);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      <SEOHead
        canonicalPath="/preply-deals/thank-you"
        title="Code copied! Redeem your Preply 30% discount"
        description="Your Preply promo code was copied. Head to Preply and paste it at checkout to save 30%."
        noindex
      />
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-accent/40 to-background px-4">
        <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-8 text-center shadow-xl sm:p-10">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg">
            <Check className="h-8 w-8" strokeWidth={3} />
          </div>
          <h1 className="mt-6 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Code copied successfully!
          </h1>
          <p className="mt-3 text-muted-foreground">
            Your 30% discount code is ready. Paste it at Preply checkout to unlock the offer.
          </p>

          <div className="mt-6 rounded-2xl border-2 border-dashed border-primary/50 bg-accent/40 px-4 py-4">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Your promo code
            </div>
            <div className="mt-1 font-mono text-3xl font-black tracking-[0.25em]">
              {PROMO_CODE}
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <a
              href={REDEEM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-base font-bold text-primary-foreground shadow-lg transition-all hover:-translate-y-0.5"
            >
              Go to Preply <ExternalLink className="h-4 w-4" />
            </a>
            <button
              onClick={copyAgain}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy code again"}
            </button>
          </div>

          <div className="mt-8 rounded-xl bg-secondary/60 p-4 text-left text-sm text-secondary-foreground">
            <p className="font-semibold">How to use it:</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
              <li>Choose a tutor and pick a lesson package.</li>
              <li>At checkout, paste the code <span className="font-mono font-bold text-foreground">{PROMO_CODE}</span>.</li>
              <li>Enjoy 30% off your first lesson.</li>
            </ol>
          </div>

          <Link
            to="/preply-deals"
            className="mt-6 inline-block text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            ← Back to offer page
          </Link>
        </div>
      </div>
    </>
  );
}
