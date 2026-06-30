import { CheckCircle2, Headphones, Image as ImageIcon, Languages, Mic, Sparkles, Volume2, Repeat, BarChart3 } from "lucide-react";
import type { PartnerFeatureItem } from "@/lib/partnerConfig";

const learnImageUrl = "/partner/learn.png";
const listeningImageUrl = "/partner/listening.png";
const speakingImageUrl = "/partner/speaking.png";
const quizImageUrl = "/partner/quiz.png";

type Bg = "white" | "mint" | "cream" | "dark";

interface ShowcaseRowProps {
  id: string;
  step: string;
  badge: string;
  title: React.ReactNode;
  description: string;
  imageUrl: string;
  imageAlt: string;
  features: PartnerFeatureItem[];
  reverse?: boolean;
  bg: Bg;
  floatingChip?: { label: string; value: string; icon: React.ComponentType<{ className?: string }> };
}

const ICONS = [ImageIcon, Headphones, Languages, Sparkles, Mic, CheckCircle2];

const BG_CLASS: Record<Bg, string> = {
  white: "bg-background",
  mint: "bg-[linear-gradient(180deg,hsl(152_46%_98%)_0%,hsl(152_38%_94%)_100%)]",
  cream: "bg-[linear-gradient(180deg,hsl(42_55%_98%)_0%,hsl(38_44%_94%)_100%)]",
  dark: "bg-[radial-gradient(circle_at_top_right,hsl(var(--secondary)/0.14),transparent_22%),linear-gradient(135deg,hsl(165_84%_10%)_0%,hsl(164_76%_12%)_50%,hsl(160_66%_10%)_100%)]",
};

function ShowcaseRow({ id, step, badge, title, description, imageUrl, imageAlt, features, reverse, bg, floatingChip }: ShowcaseRowProps) {
  const dark = bg === "dark";
  return (
    <section id={id} className={`relative px-4 py-14 sm:px-6 lg:px-8 lg:py-20 ${BG_CLASS[bg]}`}>
      <div className="container mx-auto max-w-6xl" data-reveal>
        <div className={`grid items-center gap-10 lg:grid-cols-2 lg:gap-14 ${reverse ? "lg:[&>*:first-child]:order-2" : ""}`}>
          {/* Illustration */}
          <div className="relative">
            <div className={`absolute -inset-6 -z-10 rounded-[2.5rem] blur-3xl ${dark ? "bg-[radial-gradient(circle_at_center,hsl(var(--secondary)/0.22),transparent_60%)]" : "bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.14),transparent_60%)]"}`} />
            <div className={`relative overflow-hidden rounded-[1.75rem] border ${dark ? "border-primary-foreground/15 bg-background/5" : "border-border/60 bg-card/95"} p-2 shadow-[0_30px_80px_hsl(var(--foreground)/0.1)] backdrop-blur-md`}>
              <img src={imageUrl} alt={imageAlt} className="w-full rounded-[1.4rem] object-cover" loading="lazy" />
            </div>
            {floatingChip && (
              <div className="absolute -bottom-5 -right-3 z-10 hidden items-center gap-3 rounded-2xl border border-border/60 bg-background/95 px-4 py-3 shadow-[0_18px_46px_hsl(var(--foreground)/0.14)] backdrop-blur-md sm:flex">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-primary">
                  <floatingChip.icon className="h-4 w-4" />
                </span>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {floatingChip.label}
                  </div>
                  <div className="text-sm font-semibold text-foreground">{floatingChip.value}</div>
                </div>
              </div>
            )}
          </div>

          {/* Copy */}
          <div className={dark ? "text-primary-foreground" : "text-foreground"}>
            <div className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] ${dark ? "border border-primary-foreground/15 bg-background/10 text-secondary" : "bg-accent text-primary"}`}>
              <span>{step}</span>
              <span className="opacity-60">·</span>
              <span>{badge}</span>
            </div>
            <h2 className="mt-5 text-3xl font-semibold leading-[1.05] tracking-tight sm:text-4xl lg:text-[2.6rem]">{title}</h2>
            <p className={`mt-5 max-w-xl text-base leading-7 sm:text-lg ${dark ? "text-primary-foreground/75" : "text-muted-foreground"}`}>
              {description}
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {features.map((feature, index) => {
                const Icon = ICONS[index] ?? Sparkles;
                return (
                  <article
                    key={feature.title}
                    className={`rounded-xl border p-4 transition-all duration-300 hover:-translate-y-0.5 ${
                      dark
                        ? "border-primary-foreground/10 bg-background/8 hover:bg-background/12"
                        : "border-border/60 bg-card/95 hover:border-primary/30 hover:shadow-[0_14px_36px_hsl(var(--foreground)/0.06)]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${dark ? "bg-background/14 text-secondary" : "bg-accent text-primary"}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <div>
                        <h3 className="text-sm font-semibold">{feature.title}</h3>
                        <p className={`mt-1 text-xs leading-5 ${dark ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

interface Props {
  learnFeatures: PartnerFeatureItem[];
  listeningFeatures: PartnerFeatureItem[];
  speakingFeatures: PartnerFeatureItem[];
  quizFeatures: PartnerFeatureItem[];
}

export function PlatformShowcase({ learnFeatures, listeningFeatures, speakingFeatures, quizFeatures }: Props) {
  return (
    <>
      <ShowcaseRow
        id="learn-mode"
        step="01"
        badge="Learn"
        bg="white"
        title={<>See it. Hear it. <span className="text-primary">Never forget it.</span></>}
        description="Real photographs do what translation lists never could — they connect Arabic words to the actual things they describe, so meaning sticks the first time."
        imageUrl={learnImageUrl}
        imageAlt="Learn mode flashcard illustration"
        features={learnFeatures}
        floatingChip={{ label: "Native audio", value: "3,000+ recordings", icon: Volume2 }}
      />
      <ShowcaseRow
        id="listening-mode"
        step="02"
        badge="Listening"
        bg="mint"
        reverse
        title={<>Tune your ear to <span className="text-primary">real Arabic</span> — at real speed.</>}
        description="Audio plays first, image second. Your brain learns to recognize Arabic the way a native does, by sound, not by reading transliteration."
        imageUrl={listeningImageUrl}
        imageAlt="Listening mode illustration"
        features={listeningFeatures}
        floatingChip={{ label: "Accuracy", value: "Instant feedback", icon: CheckCircle2 }}
      />
      <ShowcaseRow
        id="speaking-mode"
        step="03"
        badge="Speaking"
        bg="dark"
        title={<>From silent reader to <span className="text-secondary">confident speaker.</span></>}
        description="Record your voice, play it next to the native model, and feel pronunciation improve session after session — no awkward live partner required."
        imageUrl={speakingImageUrl}
        imageAlt="Speaking mode illustration"
        features={speakingFeatures}
        floatingChip={{ label: "Voice", value: "Record & compare", icon: Mic }}
      />
      <ShowcaseRow
        id="quiz-mode"
        step="04"
        badge="Quiz"
        bg="cream"
        reverse
        title={<>Active recall is where <span className="text-primary">fluency is built.</span></>}
        description="Smart quizzes pull words back out of memory at the moment you're about to forget them — the single most proven way to retain a language long-term."
        imageUrl={quizImageUrl}
        imageAlt="Quiz mode illustration"
        features={quizFeatures}
        floatingChip={{ label: "SRS", value: "Spaced repetition", icon: Repeat }}
      />
    </>
  );
}
