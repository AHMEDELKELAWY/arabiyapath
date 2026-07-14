# Implementation Plan

This is a large, multi-part request. I'll implement it in the order below. All work is additive and reuses the existing `enqueue_email` → `transactional_emails` → `process-email-queue` infrastructure and the same branded style as the auth templates (teal `#1a7a5c`, gold accent, logo, Reply-To `admin@arabiyapath.com`, From `ArabiyaPath <no-reply@notify.arabiyapath.com>`).

---

## PART 1 — Forgot Password (frontend only)

- Edit the existing Login page (`src/pages/Login.tsx` or equivalent):
  - Add "Forgot password?" link under the Password field → opens a small dialog / route (`/forgot-password`) already scaffolded if present, otherwise inline dialog.
  - Calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: <origin>/reset-password })`.
  - Success toast, error handling (rate limit → friendly message), no custom reset system.
- Verify `/reset-password` page exists (it does — auth-email-hook already sends recovery).

## PART 2 — Transactional email plumbing

Scaffold the transactional pipeline (one-time):
1. `email_domain--scaffold_transactional_email` — creates `send-transactional-email`, `handle-email-unsubscribe`, `handle-email-suppression`, template registry.
2. Add all new templates under `supabase/functions/_shared/transactional-email-templates/` and register them.
3. Deploy the functions.

All membership + payment webhooks will call `send-transactional-email` (which enqueues to `transactional_emails` and logs to `email_send_log` automatically).

No PayPal business logic changes — only add email invocations after DB writes already happen.

## PART 3 — Membership templates + wiring

Create 7 branded templates:
- `membership-activated`
- `membership-renewed`
- `membership-cancelled`
- `membership-resumed`
- `membership-plan-changed`
- `payment-failed`
- `payment-action-required`

Wire them in these existing edge functions (add invocations only, no logic changes):
- `paypal-webhook`: `BILLING.SUBSCRIPTION.ACTIVATED`, `PAYMENT.SALE.COMPLETED` (renewal), `BILLING.SUBSCRIPTION.CANCELLED`, `BILLING.SUBSCRIPTION.PAYMENT.FAILED`, `BILLING.SUBSCRIPTION.UPDATED` (plan changed), `BILLING.SUBSCRIPTION.RE-ACTIVATED` (resumed).
- `paypal-manage-subscription`: cancel handler → send cancelled email; FREE coupon activation path → send activated email.

De-dupe first-payment vs activation using `purchases.paypal_capture_id`.

## PART 4 — Purchase receipt

- Template `purchase-receipt`.
- Wire into `paypal-capture-order` and `record_membership_purchase` flow (after insertion into `purchases`).

## PART 5 — Branding

Reuse the same header/footer/style constants from existing auth templates in `supabase/functions/_shared/email-templates/`. Extract a small shared layout helper (`_shared/transactional-email-templates/_layout.tsx`) that mirrors the auth branding.

## PART 6 — Logging

Nothing extra. The existing `send-transactional-email` already writes to `email_send_log` (pending → sent/failed). Confirm during verification.

## PART 7 — Google OAuth branding (documentation only, no code)

Report will be provided in chat, not committed:
- Current setup uses Lovable Cloud's managed Google OAuth client → this is why the consent screen shows "Lovable".
- Migration steps: create own Google Cloud project → OAuth consent screen branded "ArabiyaPath" with logo, support email `admin@arabiyapath.com`, homepage `https://arabiyapath.com` → create OAuth 2.0 Web Client → authorized redirect URI = the callback URL shown in Cloud → Users → Auth Settings → Google provider → paste Client ID + Secret into that same panel → save. No code changes; sessions remain valid.

## PART 8 — Verification

- Deploy all functions.
- Read `email_send_log` after triggering signup + password reset from the running app.
- For membership/payment flows: cannot fire real PayPal webhooks from the agent — will instead:
  - Statically verify each invocation site compiles + is on the correct event branch.
  - Query `email_send_log` for any historical rows.
  - Provide the user a checklist to trigger each flow, then re-inspect on request.

---

## Technical details

Files created:
- `supabase/functions/_shared/transactional-email-templates/_layout.tsx` (shared branding)
- `supabase/functions/_shared/transactional-email-templates/membership-activated.tsx`
- `.../membership-renewed.tsx`
- `.../membership-cancelled.tsx`
- `.../membership-resumed.tsx`
- `.../membership-plan-changed.tsx`
- `.../payment-failed.tsx`
- `.../payment-action-required.tsx`
- `.../purchase-receipt.tsx`
- registry.ts updated

Files modified (invocations only):
- `supabase/functions/paypal-webhook/index.ts`
- `supabase/functions/paypal-manage-subscription/index.ts`
- `supabase/functions/paypal-capture-order/index.ts`
- `src/pages/Login.tsx` (Forgot Password link)

No DB migrations. No changes to pricing, products, purchases, users, RLS, or auth config.

Approve to proceed.
