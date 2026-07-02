## Goal

Never ask the user to pick the same plan twice. The plan they click on the landing page must survive Signup and land them exactly where they intended — with no return trip to /pricing.

Frontend-only. No changes to Supabase, edge functions, PayPal, Checkout logic, product IDs, coupons, affiliates, or access control.

## Target funnels

```
Free       → Landing → Start Free → Signup → Auto-login → /dashboard/progress#flashcards-section
Monthly    → Landing → Monthly    → Signup → Auto-login → Membership pending page (Phase 2 checkout)
6 Months   → Landing → 6 Months   → Signup → Auto-login → Membership pending page (Phase 2 checkout)
Yearly     → Landing → Yearly     → Signup → Auto-login → Membership pending page (Phase 2 checkout)
```

Rule: after signup the user must never be sent back to Home, Pricing, or the Membership section.

## What changes

### 1. `src/lib/membershipPlans.ts`
- Each plan gets a stable `slug` (`free`, `monthly`, `six_months`, `yearly`).
- `resolveMembershipHref(plan, isLoggedIn)` becomes the single source of truth for CTA destinations:
  - `free` → logged-in: `/dashboard/progress#flashcards-section`; logged-out: `/signup?plan=free`
  - `monthly` / `six_months` / `yearly` → logged-in: `/membership/continue?plan=<slug>`; logged-out: `/signup?plan=<slug>`
- Keeps all existing display copy and pricing intact.

### 2. New page `src/pages/MembershipContinue.tsx` (route `/membership/continue`)
- Read `?plan=` from URL.
- If not signed in → redirect to `/signup?plan=<slug>` (preserves intent).
- If signed in → show a clean "Your <Plan name> membership — checkout opens soon" screen with:
  - Selected plan summary (name, price, cadence, savings).
  - Explanation that subscription billing is being finalized and they'll get an email the moment it goes live.
  - Buttons: "Go to Dashboard" and "Change plan" (only Change plan links back to `/pricing`).
- This is the "stop cleanly before payment" landing so no user is ever misrepresented on price/billing. Phase 2 will replace the body of this page with the real subscription checkout — the URL and funnel stay identical.

### 3. `src/pages/Signup.tsx`
- Read `?plan=<slug>` in addition to the existing `?redirect=`.
- Compute post-signup destination:
  - `plan=free` → `/dashboard/progress#flashcards-section`
  - `plan=monthly|six_months|yearly` → `/membership/continue?plan=<slug>`
  - No plan param → keep existing `redirect` behavior (fully backwards compatible for Checkout, partners, coupons, affiliate links).
- Pass the computed destination as `redirectPath` to `signUp()` (email confirmation link) AND to the "already-signed-in" auto-navigate effect AND to `<OAuthButtons redirectUrl={...} />` AND to the "Log in" link at the bottom.
- Selected-plan indicator at the top of the form ("Continuing with the Yearly plan") so the user visually confirms nothing was lost.

### 4. `src/pages/Login.tsx` (light touch)
- Same `?plan=` handling as Signup so users who click a paid plan and choose "Log in" instead still land on `/membership/continue?plan=<slug>`. No auth logic changes.

### 5. `src/pages/AuthCallback.tsx`
- Verify the existing `?redirect=` handling forwards the computed destination unchanged. No new params introduced — Signup already encodes the final destination into `emailRedirectTo`.

### 6. `src/components/pricing/MembershipPricingSection.tsx`
- No structural changes. It already renders CTAs via `resolveMembershipHref`, so updating that helper propagates the new hrefs to every place the section is used (Home, Pricing, Sales page).

### 7. `src/App.tsx`
- Add the new `/membership/continue` route.

## What we do NOT touch

- `src/pages/Checkout.tsx`, `src/components/checkout/*`, `src/lib/payments/*`
- PayPal edge functions, webhooks, product IDs, coupon RPCs, affiliate attribution
- Supabase schema, RLS, or any database function
- Partner coupon auto-apply (`getPartnerCoupon`) — remains active on Checkout for one-time products
- Existing `redirect=` funnels used by partner landing pages and level/bundle CTAs — unchanged

## Preserved query params

Signup already forwards the entire `redirect` URL. When a user lands on Signup via a partner link like `/signup?redirect=/checkout?productId=xxx&coupon=YYY`, that flow keeps working untouched. `plan=` is additive — it's only used when set and only for the four membership CTAs.

## Verification (Playwright, live preview)

1. Logged-out `/pricing` → click **Start Free** → Signup shows "Continuing with Free" → submit → lands on `/dashboard/progress#flashcards-section`.
2. Logged-out `/pricing` → click **Monthly** → Signup shows "Continuing with Monthly" → submit → lands on `/membership/continue?plan=monthly` with the Monthly summary.
3. Repeat for **6 Months** and **Yearly**.
4. Logged-in user clicks **Yearly** on Home → lands directly on `/membership/continue?plan=yearly` (no Signup).
5. Existing partner funnel `/signup?redirect=/checkout?productId=...` still routes to Checkout unchanged.
6. `tsgo` typecheck passes.
