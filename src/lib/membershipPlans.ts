/**
 * ArabiyaPath Membership — public plan catalog (display only).
 *
 * Phase 1: pure UI/copy. No billing, no backend, no subscription wiring.
 * Phase 2 will replace the /membership/continue landing with the real
 * subscription checkout — the funnel URLs stay identical.
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

export type MembershipPlanId = "free" | "monthly" | "six_months" | "yearly";

export interface MembershipPlan {
  id: MembershipPlanId;
  name: string;
  price: number;
  currency: string;
  priceLabel: string;
  cadenceLabel: string;
  badge?: string;
  savingsLabel?: string;
  ctaLabel: string;
  highlighted?: boolean;
  features: readonly string[];
  footnote?: string;
}

/** Where a user lands after signup/login when this plan was selected. */
export const FREE_DESTINATION = "/flashcards/unit/In-The-Classroom";
export const PAID_DESTINATION_BASE = "/membership/continue";

export const MEMBERSHIP_PLANS: MembershipPlan[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    currency: "USD",
    priceLabel: "$0",
    cadenceLabel: "forever",
    ctaLabel: "Start Free",
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
    highlighted: true,
    features: MEMBERSHIP_FEATURES.slice(),
    footnote: "Best value — billed yearly.",
  },
];

export function getPlanById(id: string | null | undefined): MembershipPlan | undefined {
  if (!id) return undefined;
  return MEMBERSHIP_PLANS.find((p) => p.id === id);
}

/** Final destination for a given plan after auth is complete. */
export function destinationForPlan(planId: MembershipPlanId): string {
  return planId === "free" ? FREE_DESTINATION : `${PAID_DESTINATION_BASE}?plan=${planId}`;
}

/**
 * CTA href for a plan card.
 * - Logged in → jump straight to the final destination.
 * - Logged out, Free → send through the /start-free lead-capture step first.
 * - Logged out, Paid → route through Signup with the plan preserved.
 */
export function resolveMembershipHref(plan: MembershipPlan, isLoggedIn: boolean): string {
  if (isLoggedIn) return destinationForPlan(plan.id);
  if (plan.id === "free") return "/start-free";
  return `/signup?plan=${plan.id}`;
}
