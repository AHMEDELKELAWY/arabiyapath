## Goal

When a visitor clicks **Start Free**, take them to a lightweight email-capture form first, then straight into Unit 1. Full signup still happens (per your answer) — the email step just prefills it so the visitor's email is already in your Zoho list even if they abandon at the password step.

Funnel:

```
Landing / Pricing / Membership
   ↓ click "Start Free"
/start-free           ← focused page, one field (email) + Zoho form (like /free-gulf-lesson)
   ↓ submit email
/signup?plan=free&email=<captured>   ← email prefilled, one-click password step
   ↓ create account + auto-login
/flashcards/unit/<Unit 1 slug>       ← Membership Unit 1 (Learn / Listening / Speaking / Quiz)
```

Logged-in visitors clicking Start Free skip everything and go straight to Unit 1.

## Changes

### 1. New page `src/pages/StartFree.tsx` (route `/start-free`)
- `FocusLayout` (minimal header, no footer distractions) so the user stays focused.
- Copy modeled on the ArabiyaPath Membership brand ("Start Unit 1 free — no credit card").
- One field: email. `useZohoOptin` hook + hidden Zoho form (reuses the same `ZOHO_FORM_ID` / script currently used by `/free-gulf-lesson` so the same list catches the leads).
- On submit → fire the Zoho optin exactly like `FreeGulfLesson.tsx` does → `navigate(`/signup?plan=free&email=<url-encoded email>`)`.
- If the visitor is already signed in → immediate redirect to Unit 1 (no need to re-capture email).
- Small "Continue with Google" shortcut linking to `/signup?plan=free` for people who don't want to type email twice.
- `SEOHead` with `noindex` (funnel page, not a landing to rank).

### 2. `src/pages/Signup.tsx`
- Read `?email=` from URL. If present, seed the `email` state with it and keep the field editable.
- Nothing else changes — password/name flow and plan-preservation logic already built stay identical.

### 3. Free-plan CTA routing
- `src/lib/membershipPlans.ts`: `resolveMembershipHref` for `plan.id === "free"` (logged-out) now returns `/start-free` instead of `/signup?plan=free`. Logged-in path unchanged.
- Free plan post-signup destination changes from `/dashboard/progress#flashcards-section` to the MSA Membership Unit 1 URL. Implementation: dynamically resolve the first `is_free && published` flashcard unit slug (`/flashcards/unit/<slug>`) so it stays correct if the free unit changes. Fallback = `/flashcards` (which itself lands on Unit 1). Done via a tiny helper that reads from the existing `flashcard_units` query — no schema change, no new RPC.
- `src/pages/flashcards/FlashCardsHome.tsx`: hero "Start Free" for logged-out visitors also routes to `/start-free` (instead of `/signup?redirect=...`) so the funnel is consistent everywhere.

### 4. `src/App.tsx`
- Register `/start-free` route (lazy-loaded like other pages).

## What we do NOT touch

- Signup password flow, auth, RLS, Supabase schema
- PayPal, checkout, coupons, affiliates, partners
- Existing `/free-gulf-lesson` funnel (kept as-is for the Gulf audience)
- Paid plan funnel from the previous phase (`/signup?plan=<monthly|six_months|yearly>` → `/membership/continue`)

## Verification

1. Logged-out visitor on `/` or `/pricing` clicks **Start Free** → lands on `/start-free`.
2. Enters email → briefly sees "You're in!" → arrives on `/signup?plan=free&email=<their-email>` with email prefilled.
3. Fills name + password → auto-login → lands directly on `/flashcards/unit/<Unit 1 slug>`.
4. Logged-in visitor clicks **Start Free** → goes straight to Unit 1, skipping `/start-free` and Signup.
5. Zoho list receives the email at step 2 (same list as `/free-gulf-lesson`).
6. `tsgo` typecheck passes.
