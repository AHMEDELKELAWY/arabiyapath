# Phase 1 — Membership Rebrand (Frontend Only)

Goal: present ArabiyaPath as a subscription-based Arabic learning membership. No backend, PayPal, Supabase, auth, coupons, affiliates, webhooks, or checkout wiring changes. Existing purchase records and access logic remain intact.

## Scope Guardrails

Do NOT touch:
- `supabase/**`, edge functions, RLS, DB schema
- `src/integrations/supabase/**`
- `src/components/checkout/**`, `src/lib/payments/**`, `src/pages/Checkout.tsx`, PayPal flows, `paypal-*` functions
- Affiliate/partner logic, `src/lib/partnerConfig.ts`, `PartnerLanding.tsx`, coupon logic
- Auth, `AuthContext`, redirect flows
- Access control (`src/lib/accessControl.ts`, `src/lib/flashcardAccess.ts`, `useFlashcardUnitAccess`) — messaging around locked state only
- All admin pages (`src/pages/admin/**`) — internal naming stays
- Internal routes and technical component names (`/flashcards`, `FlashCardUnit`, `flashcard_packs`, etc.)

## New Pricing Model (display only)

Static data in a new `src/lib/membershipPlans.ts`:

| Plan | Price | Badge | Notes |
|---|---|---|---|
| Free | $0 | — | Unit 1 + all learn modes, requires signup |
| Monthly | $30/mo | — | Full access |
| 6 Months | $150 | Save $30 | Full access |
| Yearly | $270 | ⭐ Best Value (highlighted) | Save $90, recommended |

All paid CTAs point to `/pricing` (or `/signup?redirect=/pricing` if logged out). No new checkout wiring; the existing `/checkout?productId=…` link continues to work for the current product until Phase 2 replaces it. Lifetime language is removed from public surfaces.

## Files to change

### 1. New file
- `src/lib/membershipPlans.ts` — exported `MEMBERSHIP_PLANS` array + copy tokens (`PRODUCT_NAME = "ArabiyaPath Membership"`, feature bullets, CTA labels).

### 2. New component
- `src/components/pricing/MembershipPricingSection.tsx` — responsive 4-card SaaS pricing grid (Free / Monthly / 6mo / Yearly), Yearly highlighted with "Best Value" ribbon, per-card feature list, CTAs: Free → `/signup`; paid → `/signup?redirect=/pricing` or `/pricing` if logged in. Uses existing shadcn `Card`/`Button` + design tokens (teal/gold). No hardcoded colors.

### 3. Rewritten marketing pages
- `src/pages/Index.tsx` — homepage hero, features, pricing teaser, CTA rewritten around Membership. Replace "Buy/Explore" CTAs with "Start Free" + "Join Membership". Feature grid: Native Audio, Real Images, Speaking, Listening, Smart Quizzes, Progress Dashboard, Spaced Repetition, Certificate, Continuous Updates. SEO title/description updated.
- `src/pages/Pricing.tsx` — replace body with `<MembershipPricingSection/>` + FAQ/trust signals. Remove Lifetime option and any "one-time" language from public copy.
- `src/pages/FlashCardsSalesPage.tsx` — rebrand to Membership sales page (or thin wrapper that renders the new pricing section + platform features). Route `/flashcards-pack` keeps working.
- `src/pages/flashcards/FlashCardsHome.tsx` and `FlashCardPack.tsx` — swap "Flashcards Pack" wording → "ArabiyaPath Membership"; replace "Get Lifetime Access" CTAs with "Join Membership" / "Start Free"; keep the underlying links/routes unchanged.

### 4. Navigation & shell
- `src/components/layout/Navbar.tsx` — visible label "Flashcards" → "Membership" (route unchanged). Add/keep "Pricing" link. No other structural changes.
- `src/components/layout/Layout.tsx` — footer/link labels updated in the same way if they reference Flashcards as a product.

### 5. Dashboard user-facing copy
- `src/pages/Dashboard.tsx`, `src/pages/DashboardProgress.tsx`, `src/components/dashboard/FlashcardsDashboardSection.tsx`, `src/components/dashboard/ProductCard.tsx` — label swaps only: "Purchased" → "Membership Active", section titles → "Your Membership", add placeholder chips "Current Plan", "Renewal —", buttons "Upgrade Plan" / "Manage Membership" that link to `/pricing`. No logic changes; still driven by existing `usePurchases`.

### 6. Locked content messaging
- Wherever locked-unit UI is rendered inside the flashcards study flow (`src/pages/flashcards/FlashCardUnit.tsx`, `FlashCardStudy.tsx`, and dashboard locked cards), replace "Unlock Flashcards / Buy Pack" copy with "Upgrade to Access All Units" and "Join Membership" CTAs linking to `/pricing`. Access checks (`useFlashcardUnitAccess`, `hasAccessToLevel`) are untouched.

### 7. Checkout / post-purchase copy (display only)
- `src/pages/PaymentSuccess.tsx`, `src/pages/ThankYouPurchase.tsx`, `src/pages/Checkout.tsx` — rename user-visible strings "Flashcards Pack" → "ArabiyaPath Membership" in headings/confirmations. Do not modify any logic, product IDs, PayPal calls, or query params.

### 8. Free tier framing
- Homepage + Pricing page + Free plan card clearly state: Unit 1 unlocked (Learn, Listening, Speaking, Quiz) + progress; signup required. Links go to `/signup?redirect=/flashcards` (existing free unit route) — no access logic added, since Unit 1 is already free per current `is_free` flag.

## Explicitly out of scope
- Renaming routes, DB tables, product rows, admin pages
- Real subscription billing, plan selection persistence, renewal dates
- Partner landing page (`/partner/:slug`) — untouched
- Any change under `supabase/`, `src/integrations/`, `src/components/checkout/`, `src/lib/payments/`, `src/lib/partner*`

## Verification
- `tsgo` typecheck
- Playwright screenshots (desktop 1280, mobile 390) of `/`, `/pricing`, `/flashcards-pack`, `/dashboard` confirming: Membership branding, 4-card pricing with Yearly highlighted, no "Lifetime" copy, existing checkout link on the current product still resolves.

## Technical notes
- Copy tokens centralized in `src/lib/membershipPlans.ts` so Phase 2 can swap CTAs to real subscription checkout by editing one file.
- All new UI uses semantic tokens from `index.css` (teal primary, gold secondary). No hardcoded colors.
- No new dependencies.
