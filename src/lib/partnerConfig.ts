import type { ComponentType } from "react";

export interface PartnerStat {
  value: string;
  label: string;
}

export interface PartnerFeatureItem {
  title: string;
  description: string;
}

export interface PartnerModeCard {
  key: "learn" | "listening" | "speaking" | "quiz";
  title: string;
  description: string;
  icon: "learn" | "listening" | "speaking" | "quiz";
}

export interface PartnerFAQItem {
  q: string;
  a: string;
}

export interface PartnerLandingConfig {
  partnerName: string;
  slug: string;
  badge: string;
  headline: string;
  subheadline: string;
  ctaLabel: string;
  ctaNote: string;
  oldPrice: number;
  newPrice: number;
  discountLabel: string;
  couponCode: string | null;
  videoUrl: string | null;
  stats: PartnerStat[];
  modeCards: PartnerModeCard[];
  learnFeatures: PartnerFeatureItem[];
  listeningFeatures: PartnerFeatureItem[];
  speakingFeatures: PartnerFeatureItem[];
  quizFeatures: PartnerFeatureItem[];
  dashboardHighlights: string[];
  pricingIncludes: string[];
  faq: PartnerFAQItem[];
}

interface PartnerRowLike {
  slug: string;
  display_name: string;
  campaign_title: string | null;
  hero_title: string | null;
  hero_subtitle: string | null;
  cta_text: string | null;
  price_override: number | null;
  old_price: number | null;
  coupons: { code: string; percent_off: number } | null;
}

const DEFAULT_STATS: PartnerStat[] = [
  { value: "3,000+", label: "Vocabulary Words" },
  { value: "60+", label: "Learning Units" },
  { value: "100%", label: "Native Audio" },
  { value: "Lifetime", label: "Access" },
  { value: "Certificate", label: "Included" },
  { value: "30-Day", label: "Guarantee" },
];

const DEFAULT_MODE_CARDS: PartnerModeCard[] = [
  {
    key: "learn",
    title: "Learn",
    description: "Real-image vocabulary cards with clear translations and native audio.",
    icon: "learn",
  },
  {
    key: "listening",
    title: "Listening",
    description: "Hear native pronunciation first and train your ear naturally.",
    icon: "listening",
  },
  {
    key: "speaking",
    title: "Speaking",
    description: "Record yourself, compare, and improve with daily practice.",
    icon: "speaking",
  },
  {
    key: "quiz",
    title: "Quiz",
    description: "Reinforce memory with instant feedback and smart review.",
    icon: "quiz",
  },
];

const DEFAULT_FAQ: PartnerFAQItem[] = [
  {
    q: "How long do I keep access?",
    a: "Lifetime. You pay once and keep access forever, including future updates to the vocabulary pack.",
  },
  {
    q: "Do I need to enter the coupon myself?",
    a: "No. Your partner discount is applied automatically through the existing checkout flow.",
  },
  {
    q: "Can I use it on mobile?",
    a: "Yes. The vocabulary course works beautifully on phone, tablet, and desktop.",
  },
  {
    q: "Is this good for beginners?",
    a: "Yes. It is designed to make vocabulary stick using real images, native audio, speaking practice, and quizzes.",
  },
  {
    q: "What if I change my mind?",
    a: "You’re protected by a 30-day money-back guarantee.",
  },
];

export function buildPartnerConfig(row: PartnerRowLike, fallbackBasePrice: number): PartnerLandingConfig {
  const couponCode = row.coupons?.code ?? null;
  const discount = row.coupons?.percent_off ?? 0;
  const oldPrice = row.old_price ?? fallbackBasePrice ?? 30.00;
  const newPrice =
    row.price_override != null
      ? Number(row.price_override)
      : discount > 0
        ? Math.floor(oldPrice * (100 - discount)) / 100
        : oldPrice;

  return {
    partnerName: row.display_name,
    slug: row.slug,
    badge: discount > 0 ? `${discount}% OFF · Exclusive for ${row.display_name}'s Students` : `Exclusive for ${row.display_name}'s Students`,
    headline: row.hero_title || "Arabic that finally sticks.",
    subheadline:
      row.hero_subtitle ||
      "A premium vocabulary course built around real photos, native voices, and spaced repetition — so vocabulary stays in long-term memory, not in your notes app.",
    ctaLabel: row.cta_text || "Unlock My Discount",
    ctaNote: "No coupon code required. Discount applied automatically.",
    oldPrice,
    newPrice,
    discountLabel: discount > 0 ? `${discount}% OFF` : "Exclusive offer",
    couponCode,
    videoUrl: null,
    stats: DEFAULT_STATS,
    modeCards: DEFAULT_MODE_CARDS,
    learnFeatures: [
      { title: "Real Images", description: "See the word clearly and remember it faster with real product visuals." },
      { title: "Native Audio", description: "Hear authentic pronunciation from native speakers on every card." },
      { title: "Clear Translation", description: "Understand the exact meaning instantly without confusion." },
      { title: "Interactive Vocabulary", description: "Tap, review, listen, and study in a smooth mobile-first flow." },
    ],
    listeningFeatures: [
      { title: "Audio First", description: "Hear real Arabic before you answer so your ear adapts naturally." },
      { title: "Ear Training", description: "Match sound to meaning using image-based listening practice." },
      { title: "Instant Feedback", description: "Know immediately if you understood correctly and keep improving." },
      { title: "Confidence Building", description: "Train comprehension for real-world listening, not memorized guessing." },
    ],
    speakingFeatures: [
      { title: "Voice Recording", description: "Record yourself directly inside the study flow." },
      { title: "Native Pronunciation", description: "Listen closely, repeat, and sharpen your accent with clear models." },
      { title: "Confidence", description: "Build speaking momentum through short practice loops that feel easy to repeat." },
      { title: "Progress Tracking", description: "See improvement over time instead of wondering if you’re getting better." },
    ],
    quizFeatures: [
      { title: "Smart Quizzes", description: "Reinforce memory with focused questions tied to what you studied." },
      { title: "Instant Feedback", description: "See the correct answer immediately and keep the lesson moving." },
      { title: "Memory Reinforcement", description: "Turn passive review into active recall that actually sticks." },
      { title: "Progress", description: "Track results clearly so improvement feels visible and motivating." },
    ],
    dashboardHighlights: ["Progress", "Daily Review", "Mastered Cards", "Learning Analytics", "Streak"],
    pricingIncludes: [
      "Lifetime access",
      "Native audio",
      "All flashcards",
      "Future updates",
      "Certificate",
      "30-day money-back guarantee",
      "Secure checkout",
    ],
    faq: DEFAULT_FAQ,
  };
}

export const formatPrice = (n: number) => `$${(Math.floor(n * 100) / 100).toFixed(2)}`;

export const PARTNER_SECTION_BACKGROUNDS = {
  hero: "bg-[radial-gradient(circle_at_top_left,hsl(var(--secondary)/0.22),transparent_18%),radial-gradient(circle_at_70%_35%,hsl(var(--secondary)/0.2),transparent_15%),linear-gradient(135deg,hsl(165_88%_9%)_0%,hsl(165_80%_11%)_35%,hsl(152_68%_14%)_66%,hsl(150_55%_12%)_100%)]",
  soft: "bg-[radial-gradient(circle_at_top_left,hsl(var(--accent)/0.95),transparent_22%),linear-gradient(180deg,hsl(var(--background))_0%,hsl(152_46%_97%)_100%)]",
  warm: "bg-[radial-gradient(circle_at_top,hsl(var(--secondary)/0.14),transparent_28%),linear-gradient(180deg,hsl(42_55%_98%)_0%,hsl(var(--background))_100%)]",
  muted: "bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--muted)/0.42)_100%)]",
  dark: "bg-[radial-gradient(circle_at_top_right,hsl(var(--secondary)/0.15),transparent_18%),linear-gradient(135deg,hsl(164_72%_11%)_0%,hsl(166_65%_12%)_50%,hsl(168_60%_9%)_100%)]",
};
