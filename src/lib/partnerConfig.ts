// Maps a partners DB row -> typed landing config with sensible defaults.
// Adding new fields here keeps the page driven entirely by the partner record
// without requiring a migration on day one.

export interface PartnerStat {
  value: string;
  label: string;
}

export interface PartnerBenefit {
  icon:
    | "speak"
    | "memory"
    | "audio"
    | "image"
    | "progress"
    | "srs"
    | "quiz"
    | "mobile";
  title: string;
  description: string;
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
  benefits: PartnerBenefit[];
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
  { value: "3,000+", label: "Vocabulary cards" },
  { value: "100%", label: "Native audio" },
  { value: "60+", label: "Learning units" },
  { value: "∞", label: "Lifetime access" },
];

const DEFAULT_BENEFITS: PartnerBenefit[] = [
  { icon: "speak", title: "Speak with confidence", description: "Practice phrases you'll actually use." },
  { icon: "memory", title: "Remember faster", description: "Smart spaced repetition cements every word." },
  { icon: "audio", title: "Native pronunciation", description: "Hear real native speakers on every card." },
  { icon: "image", title: "Realistic imagery", description: "Beautiful photos make meanings stick." },
  { icon: "progress", title: "Daily progress tracking", description: "See your streak and growth, one card a day." },
  { icon: "srs", title: "Smart spaced repetition", description: "Reviews surface exactly when you need them." },
  { icon: "quiz", title: "Interactive quizzes", description: "Test what you've learned without effort." },
  { icon: "mobile", title: "Study anywhere", description: "Phone, tablet, or desktop — your progress follows." },
];

const DEFAULT_FAQ: PartnerFAQItem[] = [
  { q: "How long do I have access?", a: "Lifetime. Pay once, study forever — including all future updates to the pack." },
  { q: "Do I need to enter the coupon?", a: "No. Your exclusive discount is reserved the moment you land on this page and is applied automatically at checkout." },
  { q: "Can I study on mobile?", a: "Yes. The course works on phone, tablet and desktop. Your progress follows you everywhere." },
  { q: "Is this suitable for beginners?", a: "Absolutely. Cards are organised by difficulty with native audio and images so you can start from zero and progress at your own pace." },
  { q: "Is there a refund policy?", a: "Yes — 30-day money-back guarantee. Not satisfied? Get a full refund, no questions asked." },
];

export function buildPartnerConfig(
  row: PartnerRowLike,
  fallbackBasePrice: number
): PartnerLandingConfig {
  const couponCode = row.coupons?.code ?? null;
  const discount = row.coupons?.percent_off ?? 0;
  const oldPrice = row.old_price ?? fallbackBasePrice ?? 29.99;
  const newPrice =
    row.price_override != null
      ? Number(row.price_override)
      : discount > 0
      ? // Floor to 2 decimals so 29.99 * 0.5 = 14.995 displays as $14.99 (never $15.00).
        Math.floor(oldPrice * (100 - discount)) / 100
      : oldPrice;

  return {
    partnerName: row.display_name,
    slug: row.slug,
    badge: discount > 0 ? `${discount}% OFF · Exclusive` : "Exclusive",
    headline:
      row.hero_title ||
      row.campaign_title ||
      `Exclusive Offer for ${row.display_name}'s Students`,
    subheadline:
      row.hero_subtitle ||
      `A private invitation to continue your Arabic journey. Your discount is already reserved — no coupon code required.`,
    ctaLabel: row.cta_text || "Claim My 50% Discount",
    ctaNote: "No coupon code required. Your exclusive discount will be applied automatically.",
    oldPrice,
    newPrice,
    discountLabel: discount > 0 ? `${discount}% OFF` : "",
    couponCode,
    videoUrl: null,
    stats: DEFAULT_STATS,
    benefits: DEFAULT_BENEFITS,
    faq: DEFAULT_FAQ,
  };
}

export const formatPrice = (n: number) => `$${(Math.floor(n * 100) / 100).toFixed(2)}`;
