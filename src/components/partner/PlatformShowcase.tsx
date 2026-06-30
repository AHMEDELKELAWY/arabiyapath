import { CheckCircle2, Headphones, Image as ImageIcon, Languages, Mic, Sparkles } from "lucide-react";
import type { PartnerFeatureItem } from "@/lib/partnerConfig";

const learnImageUrl = "/partner/learn.png";
const listeningImageUrl = "/partner/listening.png";
const speakingImageUrl = "/partner/speaking.png";
const quizImageUrl = "/partner/quiz.png";

interface ShowcaseRowProps {
  id: string;
  badge: string;
  title: React.ReactNode;
  description: string;
  imageUrl: string;
  imageAlt: string;
  features: PartnerFeatureItem[];
  reverse?: boolean;
  dark?: boolean;
}

const ICONS = [ImageIcon, Headphones, Languages, Sparkles, Mic, CheckCircle2];

function ShowcaseRow({ id, badge, title, description, imageUrl, imageAlt, features, reverse, dark }: ShowcaseRowProps) {
  return (
    <section
      id={id}
      className={`px-4 py-14 sm:px-6 lg:px-8 lg:py-18 ${
        dark
          ? "bg-[radial-gradient(circle_at_top_right,hsl(var(--secondary)/0.14),transparent_18%),linear-gradient(135deg,hsl(165_84%_10%)_0%,hsl(164_76%_12%)_50%,hsl(160_66%_10%)_100%)]"
          : ""
      }`}
    >
      <div className="container mx-auto max-w-7xl" data-reveal>
        <div
          className={`grid items-center gap-8 lg:grid-cols-2 lg:gap-12 ${reverse ? "lg:[&>*:first-child]:order-2" : ""}`}
        >
          <div className="overflow-hidden rounded-[2rem] border border-border/60 bg-card/90 p-3 shadow-[0_28px_80px_hsl(var(--foreground)/0.08)] backdrop-blur-md">
            <img src={imageUrl} alt={imageAlt} className="w-full rounded-[1.5rem] object-cover" loading="lazy" />
          </div>

          <div className={dark ? "text-primary-foreground" : "text-foreground"}>
            <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${dark ? "bg-background/10 text-secondary border border-primary-foreground/10" : "bg-accent text-primary"}`}>
              {badge}
            </div>
            <h2 className="mt-5 text-4xl font-semibold leading-[1.02] tracking-tight sm:text-5xl">{title}</h2>
            <p className={`mt-5 max-w-xl text-lg leading-8 ${dark ? "text-primary-foreground/75" : "text-muted-foreground"}`}>
              {description}
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {features.map((feature, index) => {
                const Icon = ICONS[index] ?? Sparkles;
                return (
                  <article
                    key={feature.title}
                    className={`rounded-[1.5rem] border p-5 shadow-[0_16px_40px_hsl(var(--foreground)/0.05)] backdrop-blur-md transition-transform duration-300 hover:-translate-y-1 ${
                      dark
                        ? "border-primary-foreground/12 bg-background/8"
                        : "border-border/60 bg-card/90"
                    }`}
                  >
                    <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${dark ? "bg-background/14 text-secondary" : "bg-accent text-primary"}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
                    <p className={`mt-2 text-sm leading-7 ${dark ? "text-primary-foreground/72" : "text-muted-foreground"}`}>
                      {feature.description}
                    </p>
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
        badge="01 · Learn Mode"
        title={<>Learn Arabic Vocabulary with <span className="text-primary">Real Images</span></>}
        description="Build vocabulary naturally using high-quality visuals, clear Arabic, native pronunciation, and interactive flashcards that feel premium on every device."
        imageUrl={learnImageUrl}
        imageAlt="Learn mode screenshot showing real-image flashcards with native audio"
        features={learnFeatures}
      />
      <ShowcaseRow
        id="listening-mode"
        badge="04 · Listening Mode"
        title={<>Train Your Ear. Understand <span className="text-primary">Real Arabic.</span></>}
        description="Audio-first practice helps you connect real Arabic sounds to meaning quickly, with image choices, instant feedback, and natural ear training."
        imageUrl={listeningImageUrl}
        imageAlt="Listening mode screenshot showing audio-based multiple choice practice"
        features={listeningFeatures}
        reverse
      />
      <ShowcaseRow
        id="speaking-mode"
        badge="05 · Speaking Mode"
        title={<>Speak Arabic with <span className="text-secondary">Confidence.</span></>}
        description="Practice pronunciation with native models, record your voice, compare clearly, and build momentum through short daily speaking sessions."
        imageUrl={speakingImageUrl}
        imageAlt="Speaking mode screenshot showing pronunciation and voice recording"
        features={speakingFeatures}
        dark
      />
      <ShowcaseRow
        id="quiz-mode"
        badge="06 · Quiz Mode"
        title={<>Test Your Knowledge. <span className="text-primary">Track Your Progress.</span></>}
        description="Smart quizzes reinforce what you learned, explain correct answers instantly, and turn review into visible progress instead of passive scrolling."
        imageUrl={quizImageUrl}
        imageAlt="Quiz mode screenshot showing instant feedback and score tracking"
        features={quizFeatures}
        reverse
      />
    </>
  );
}
