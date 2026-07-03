# Phase 2 — PayPal Membership Subscriptions

Build a real recurring-subscription system for **ArabiyaPath Membership** using LIVE PayPal Plan IDs, **completely separate** from the existing one-time course checkout, products, purchases, and course affiliate flow.

## Scope guarantee (untouched)

- `paypal-create-order`, `paypal-capture-order`, `paypal-webhook` order paths
- `purchases`, `pending_orders`, `products`, `coupons` (existing behavior)
- Course checkout, Gulf sales page, flashcard packs
- Course affiliate attribution and commissions
- Auth, RLS on existing tables

Everything below is **additive**.

## Live PayPal Plan IDs

| Plan     | PayPal Plan ID                     |
|----------|-------------------------------------|
| Monthly  | `P-4TD79441C9251073ENJEEFAA`        |
| 6 Months | `P-7273220749612745YNJEEKGQ`        |
| Yearly   | `P-6PH57317JM699332JNJEEMVI`        |

Stored server-side only. `PAYPAL_API_BASE` already points to live (`https://api-m.paypal.com`). No sandbox references anywhere.

## New database (single migration)

New table `public.membership_subscriptions`:

- `user_id` → `auth.users`
- `plan` enum-like text: `monthly | six_months | yearly`
- `paypal_plan_id` text
- `paypal_subscription_id` text unique
- `status` text: `APPROVAL_PENDING | ACTIVE | CANCELLED | SUSPENDED | EXPIRED`
- `started_at`, `next_billing_at`, `cancelled_at`, `expires_at` timestamptz
- `affiliate_id` uuid (nullable), `coupon_id` uuid (nullable)
- `created_at`, `updated_at`

RLS + GRANTs:

- `authenticated` → SELECT own rows; INSERT/UPDATE done from edge functions with service role
- `service_role` → ALL
- Admin (`has_role(auth.uid(),'admin')`) → SELECT all
- No `anon` grant

Helper (SECURITY DEFINER):

```sql
public.user_has_active_membership(_uid uuid) returns boolean
-- ACTIVE, OR CANCELLED but expires_at > now()
```

## Edge functions (new)

1. **`paypal-create-subscription`** (`verify_jwt = true`)
   - Input: `{ plan: 'monthly'|'six_months'|'yearly', couponCode?, affiliateCode? }`
   - Maps plan → live `paypal_plan_id`
   - Calls `POST /v1/billing/subscriptions` with `application_context.return_url = <origin>/membership/activate` and `cancel_url = <origin>/membership/continue?cancelled=1`
   - Insert `membership_subscriptions` row (`status='APPROVAL_PENDING'`, subscription id, affiliate/coupon resolved)
   - Return `{ approvalUrl, subscriptionId }`

2. **`paypal-activate-subscription`** (`verify_jwt = true`)
   - Input: `{ subscriptionId }`
   - Fetch `/v1/billing/subscriptions/{id}` — confirm it belongs to `auth.uid()`, update row (`status`, `started_at`, `next_billing_at`)
   - Return `{ status }`

3. **Extend `paypal-webhook`** — add cases (existing order cases untouched):
   - `BILLING.SUBSCRIPTION.CREATED / ACTIVATED / CANCELLED / SUSPENDED / EXPIRED` → update `membership_subscriptions` (`status`, `next_billing_at`, `cancelled_at`, `expires_at`)
   - `PAYMENT.SALE.COMPLETED` → look up subscription by `billing_agreement_id`; refresh `next_billing_at`; **on first sale only**, create affiliate commission (see below)
   - `PAYMENT.SALE.DENIED` / `PAYMENT.SALE.REFUNDED` → status update, no commission

All three functions registered in `supabase/config.toml` with `verify_jwt = false` for the webhook (existing pattern), `verify_jwt = true` for the two subscription endpoints.

Reuses existing `getPayPalAccessToken()` and `PAYPAL_CLIENT_ID` / `PAYPAL_SECRET` / `PAYPAL_WEBHOOK_ID` secrets.

## Affiliate + coupon rules (subscriptions only)

- Affiliate: on `PAYMENT.SALE.COMPLETED`, if it's the **first** sale for that subscription and `affiliate_id` present → insert one row into `affiliate_commissions` (reuse existing table; `purchase_id` left null, add `subscription_id` column via same migration). Renewals: skip.
- Coupon: applied only during the initial subscription creation (via PayPal's plan pricing override on `POST /billing/subscriptions`, `plan.billing_cycles[0].pricing_scheme` for a single cycle). If not straightforward, keep coupons out of Phase 2 (log as TODO). Existing coupon behavior for one-time products unchanged.

Add nullable `subscription_id uuid references membership_subscriptions(id)` to `affiliate_commissions` in the same migration.

## Frontend

### `src/lib/payments/paypalSubscriptions.ts` (new)
Small client wrapper calling the two edge functions via `supabase.functions.invoke`.

### `src/pages/MembershipContinue.tsx`
Replace the "opens soon" placeholder with a real **Continue to PayPal** button:

- On click → `paypal-create-subscription` → `window.location.href = approvalUrl`
- Loading + error states
- Keep the plan summary card

### `src/pages/MembershipActivate.tsx` (new, route `/membership/activate`)
- Reads `?subscription_id=` from PayPal return
- Calls `paypal-activate-subscription`
- On `ACTIVE` → redirect to `/dashboard/progress#membership`
- Otherwise → show pending state with retry

### Dashboard — Membership section
New `src/components/dashboard/MembershipSection.tsx` in `DashboardProgress`:

- Current plan, status badge, next billing date, subscription id
- Buttons:
  - **Manage** → link to PayPal customer portal (`https://www.paypal.com/myaccount/autopay/`)
  - **Upgrade** → `/pricing#membership`
  - **Cancel** → placeholder confirm dialog + link to PayPal (real cancel API in Phase 3)

### Access control
New `src/lib/membershipAccess.ts` + `useMembershipAccess()` hook querying `membership_subscriptions` for `auth.uid()`. Used for future Membership-gated content. Does **not** touch existing course access.

### Admin
New page `src/pages/admin/AdminMembershipSubscriptions.tsx` (route `/admin/memberships`), linked from `AdminLayout`. Read-only list with filters: Active / Cancelled / Expired. Uses the admin SELECT policy.

## Files touched

**New**
- `supabase/functions/paypal-create-subscription/index.ts`
- `supabase/functions/paypal-activate-subscription/index.ts`
- `src/pages/MembershipActivate.tsx`
- `src/components/dashboard/MembershipSection.tsx`
- `src/lib/payments/paypalSubscriptions.ts`
- `src/lib/membershipAccess.ts`
- `src/hooks/useMembership.ts`
- `src/pages/admin/AdminMembershipSubscriptions.tsx`

**Edited**
- `supabase/functions/paypal-webhook/index.ts` (add subscription cases only)
- `supabase/config.toml` (register 2 new functions)
- `src/pages/MembershipContinue.tsx` (wire the real button)
- `src/App.tsx` (routes: `/membership/activate`, `/admin/memberships`)
- `src/pages/DashboardProgress.tsx` (mount `MembershipSection`)
- `src/components/admin/AdminLayout.tsx` (nav link)

**Migration**
- `membership_subscriptions` table + grants + RLS + helper function
- `affiliate_commissions.subscription_id` nullable FK

## Flow summary

```text
/pricing → /signup?plan=<x> → auto-login → /membership/continue
  → [Continue to PayPal] → paypal-create-subscription
  → PayPal approval → /membership/activate?subscription_id=...
  → paypal-activate-subscription → /dashboard/progress#membership
Webhook keeps status, next_billing_at, cancelled_at, expires_at fresh.
```

## Verification

1. `tsgo` typecheck passes.
2. Each plan on `/pricing` → correct live plan id sent to PayPal (log check).
3. Existing course checkout (Gulf, flashcard packs) unaffected — smoke test one order path.
4. Webhook `BILLING.SUBSCRIPTION.ACTIVATED` → row moves to ACTIVE.
5. Existing `purchases` rows untouched by any new code path (grep confirms no writes).
6. Admin `/admin/memberships` lists subscriptions; non-admin blocked.

## Not in Phase 2

- Server-side PayPal cancel/upgrade API (buttons are placeholders + PayPal deep link).
- Coupon override on subscriptions if PayPal pricing-scheme override is non-trivial — logged as TODO.
- Migrating existing one-time Membership-like purchases into the new table.

## Note on activation

As you noted, keep the three PayPal plans **OFF** until this ships and one end-to-end test subscription is completed. Nothing here activates the plans on PayPal's side.
