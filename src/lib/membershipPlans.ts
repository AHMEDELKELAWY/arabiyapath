/**
 * ArabiyaPath Membership — public plan catalog (display only).
 *
 * Phase 1: pure UI/copy. No billing, no backend, no subscription wiring.
 * Phase 2 will replace ctaHref values with real subscription checkout links.
 */

export const PRODUCT_NAME = "ArabiyaPath Membership";
export const PRODUCT_TAGLINE = "Learn Arabic every day with a premium membership.";

export const MEMBERSHIP_FEATURES = [
  "All units and levels",
  "Native audio for every card",
  "Realistic image-based learning",
  "Listening practice",
  "Speaking practice with feedback",
  "Smart quizzes and spaced repetition",
  "Progress dashboard and streaks",
  "Completion certificate",
  "Continuous updates — new content added regularly",
] as const;

export interface MembershipPlan {
  id: "free" | "monthly" | "six_months" | "yearly";
  name: string;
  price: number;
  currency: string;
  priceLabel: string;
  cadenceLabel: string;
  badge?: string;
  savingsLabel?: string;
  ctaLabel: string;
  ctaHref: string;
  highlighted?: boolean;
  features: readonly string[];
  footnote?: string;
}

const FREE_UNIT_HREF = "/flashcards";
const PAID_HREF = "/pricing";

export const MEMBERSHIP_PLANS: MembershipPlan[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    currency: "USD",
    priceLabel: "$0",
    cadenceLabel: "forever",
    ctaLabel: "Start Free",
    ctaHref: FREE_UNIT_HREF,
    features: [
      "Unit 1 unlocked",
      "Learn, Listening, Speaking & Quiz modes",
      "Progress tracking for Unit 1",
      "Free account required",
    ],
    footnote: "No credit card required.",
  },
  {
    id: "monthly",
    name: "Monthly",
    price: 30,
    currency: "USD",
    priceLabel: "$30",
    cadenceLabel: "per month",
    ctaLabel: "Join Membership",
    ctaHref: PAID_HREF,
    features: MEMBERSHIP_FEATURES.slice(),
    footnote: "Cancel anytime.",
  },
  {
    id: "six_months",
    name: "6 Months",
    price: 150,
    currency: "USD",
    priceLabel: "$150",
    cadenceLabel: "every 6 months",
    savingsLabel: "Save $30",
    ctaLabel: "Join Membership",
    ctaHref: PAID_HREF,
    features: MEMBERSHIP_FEATURES.slice(),
    footnote: "Billed every 6 months.",
  },
  {
    id: "yearly",
    name: "Yearly",
    price: 270,
    currency: "USD",
    priceLabel: "$270",
    cadenceLabel: "per year",
    badge: "⭐ Best Value",
    savingsLabel: "Save $90",
    ctaLabel: "Join Membership",
    ctaHref: PAID_HREF,
    highlighted: true,
    features: MEMBERSHIP_FEATURES.slice(),
    footnote: "Best value — billed yearly.",
  },
];

/**
 * Wrap paid plan CTAs so logged-out visitors go through signup first.
 * Free plan target is signup itself (with redirect to first free unit).
 */
export function resolveMembershipHref(plan: MembershipPlan, isLoggedIn: boolean): string {
  if (plan.id === "free") {
    return isLoggedIn ? plan.ctaHref : `/signup?redirect=${encodeURIComponent(plan.ctaHref)}`;
  }
  return isLoggedIn ? plan.ctaHref : `/signup?redirect=${encodeURIComponent(plan.ctaHref)}`;
}
