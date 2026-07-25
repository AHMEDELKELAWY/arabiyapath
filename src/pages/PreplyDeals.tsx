import { useState } from "react";
import { Copy, Check, Star, ShieldCheck, Clock, Globe2, Sparkles, Zap } from "lucide-react";
import { SEOHead } from "@/components/seo/SEOHead";
import { trackEvent } from "@/lib/analytics";

const PROMO_CODE = "PREPLY30";
const REDEEM_URL =
  "https://preply.com/en/?pref=MjQyNDI5ODI=&id=1784694790.765835&ep=w1";

export default function PreplyDeals() {
  const [copied, setCopied] = useState(false);

  const handleClaim = async () => {
    trackEvent("copy_code_click", {
      code: PROMO_CODE,
      location: copied ? "cta_final" : "hero",
      destination: REDEEM_URL,
    });
    try {
      await navigator.clipboard.writeText(PROMO_CODE);
    } catch {
      trackEvent("copy_code_failed", { code: PROMO_CODE });
    }
    setCopied(true);
    window.open(REDEEM_URL, "_blank", "noopener,noreferrer");
    setTimeout(() => {
      window.location.href = "/preply-deals/thank-you";
    }, 250);
  };

  return (
    <>
      <SEOHead
        canonicalPath="/preply-deals"
        title="Preply 30% OFF Promo Code | Exclusive Discount"
        description="Get 30% off your first Preply lesson with promo code PREPLY30. Learn any language with expert 1-on-1 tutors from just $5/hour."
      />
      <div className="min-h-screen bg-background text-foreground">
        {/* Top bar */}
        <header className="border-b border-border/60 bg-background/80 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
                <Sparkles className="h-4 w-4" />
              </div>
              <span className="text-sm font-semibold tracking-tight">Preply Deals</span>
            </div>
            <span className="hidden text-xs text-muted-foreground sm:inline">
              Verified partner offer · Updated 2026
            </span>
          </div>
        </header>

        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-b from-accent/40 to-background">
          <div className="mx-auto max-w-6xl px-4 pb-14 pt-10 sm:pt-16 md:pb-20 md:pt-20">
            <div className="grid items-center gap-10 md:grid-cols-2">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
                  <Zap className="h-3.5 w-3.5" /> Limited-time offer
                </div>
                <h1 className="mt-4 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
                  Get <span className="text-primary">30% OFF</span> your first Preply lesson
                </h1>
                <p className="mt-4 max-w-lg text-base text-muted-foreground sm:text-lg">
                  Learn English, Spanish, French, German and 50+ more languages with expert
                  1-on-1 tutors — from just <strong className="text-foreground">$5/hour</strong>.
                  Apply your exclusive code at checkout.
                </p>

                <div className="mt-7 rounded-2xl border border-primary/30 bg-card p-4 shadow-lg sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="flex-1 rounded-xl border-2 border-dashed border-primary/50 bg-accent/40 px-4 py-3 text-center">
                      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        Promo code
                      </div>
                      <div className="mt-1 font-mono text-2xl font-black tracking-[0.25em] text-foreground sm:text-3xl">
                        {PROMO_CODE}
                      </div>
                    </div>
                    <button
                      onClick={handleClaim}
                      className="group inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-base font-bold text-primary-foreground shadow-lg transition-all hover:-translate-y-0.5 active:translate-y-0"
                    >
                      {copied ? (
                        <>
                          <Check className="h-5 w-5" /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-5 w-5" /> Copy code &amp; redeem
                        </>
                      )}
                    </button>
                  </div>
                  <p className="mt-3 text-center text-xs text-muted-foreground sm:text-left">
                    Clicking above copies the code and opens Preply in a new tab.
                  </p>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-primary" /> Verified code
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-primary" /> Works today
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Star className="h-4 w-4 fill-primary text-primary" /> 4.9 / 5 by 1,200+ learners
                  </span>
                </div>
              </div>

              <div className="relative">
                <div className="relative mx-auto aspect-[4/5] max-w-sm rounded-3xl p-1 shadow-2xl bg-hero-gradient">
                  <div className="flex h-full w-full flex-col justify-between rounded-[22px] bg-card p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-10 w-10 rounded-full bg-accent" />
                        <div>
                          <div className="text-sm font-semibold">Maria G.</div>
                          <div className="text-xs text-muted-foreground">Spanish tutor</div>
                        </div>
                      </div>
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                        ● Online
                      </span>
                    </div>
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-black text-foreground">$8</span>
                        <span className="text-sm text-muted-foreground line-through">$12</span>
                        <span className="ml-2 rounded-md bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                          −30%
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">per hour with code</div>
                      <div className="mt-4 flex items-center gap-1 text-sm">
                        <Star className="h-4 w-4 fill-primary text-primary" />
                        <span className="font-semibold">4.98</span>
                        <span className="text-muted-foreground">· 812 lessons</span>
                      </div>
                      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div className="h-full w-[87%] rounded-full bg-primary" />
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        87% of students reach conversation level in 3 months.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="mx-auto max-w-6xl px-4 py-14 md:py-20">
          <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
            Why 50,000+ learners choose Preply
          </h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Globe2, title: "50+ languages", desc: "From English and Spanish to Japanese, Arabic and Korean — pick any language you want to master." },
              { icon: Star, title: "Handpicked tutors", desc: "Every tutor is vetted. Read reviews, watch intros, and book a trial before committing." },
              { icon: Clock, title: "Learn on your schedule", desc: "Book lessons 24/7 across any timezone. Reschedule any time — no penalties." },
              { icon: ShieldCheck, title: "Money-back guarantee", desc: "Not happy with your first lesson? Get a free replacement or a full refund." },
              { icon: Zap, title: "Fast results", desc: "Personalized lesson plans mean you speak with confidence in weeks, not years." },
              { icon: Sparkles, title: "From $5 / hour", desc: "With your 30% discount, quality lessons become the cheapest way to learn a language online." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent text-accent-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How to redeem */}
        <section className="bg-secondary/40 py-14 md:py-20">
          <div className="mx-auto max-w-4xl px-4">
            <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
              How to redeem your 30% off
            </h2>
            <ol className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                { n: "1", t: "Copy the code", d: "Tap the button to copy PREPLY30 to your clipboard." },
                { n: "2", t: "Pick your tutor", d: "Browse tutors on Preply and book a trial lesson." },
                { n: "3", t: "Apply at checkout", d: "Paste the code at payment to unlock 30% off." },
              ].map((s) => (
                <li key={s.n} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {s.n}
                  </div>
                  <h3 className="mt-3 font-semibold">{s.t}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Testimonials */}
        <section className="mx-auto max-w-6xl px-4 py-14 md:py-20">
          <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
            Real students. Real progress.
          </h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              { n: "Sara, 24", q: "I saved 30% on my first month and I'm already having full conversations in Spanish. Best money I've spent this year." },
              { n: "Ahmed, 31", q: "The code worked instantly at checkout. My tutor is amazing — patient, structured, and fun." },
              { n: "Lena, 19", q: "I compared 4 platforms. Preply + this discount was cheaper AND better than everything else." },
            ].map((t) => (
              <div key={t.n} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <div className="flex gap-0.5 text-primary">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-primary" />
                  ))}
                </div>
                <p className="mt-3 text-sm leading-relaxed text-foreground">"{t.q}"</p>
                <p className="mt-3 text-xs font-semibold text-muted-foreground">— {t.n}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-4 pb-16">
          <div className="mx-auto max-w-4xl rounded-3xl p-8 text-center shadow-2xl bg-hero-gradient sm:p-12">
            <h2 className="text-3xl font-extrabold tracking-tight text-primary-foreground sm:text-4xl">
              Ready to start learning?
            </h2>
            <p className="mt-3 text-primary-foreground/90">
              Claim your 30% discount now — this offer expires soon.
            </p>
            <button
              onClick={handleClaim}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-card px-8 py-4 text-base font-bold text-foreground transition-all hover:-translate-y-0.5"
            >
              {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
              {copied ? "Copied — redirecting…" : `Copy ${PROMO_CODE} & redeem`}
            </button>
            <p className="mt-4 text-xs text-primary-foreground/80">
              No credit card required to browse tutors.
            </p>
          </div>
        </section>

        <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
          <p>
            This page is operated by an independent Preply partner. Preply is a trademark of its
            respective owner.
          </p>
        </footer>
      </div>
    </>
  );
}
