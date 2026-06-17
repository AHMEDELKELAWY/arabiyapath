## Confirmed root cause

For the current user, a 100% coupon checkout created active rows in `purchases`:

- `product_id`: `f08e7407-21fc-4fc0-81f5-21237888ac4a`
- `product_type`: `flashcard_pack`
- `payment_method`: `free_coupon`
- `amount`: `0.00`
- `status`: `active`
- linked pack: `ddbbcb57-8996-44bb-83d2-d5f476d5724c`

But the same zero-dollar checkout path did **not** create matching `flashcard_purchases` rows. The paid PayPal capture flow already mirrors flashcard pack purchases into `flashcard_purchases`; the 100% coupon branch in `paypal-create-order` creates only `purchases` and returns `freeAccess: true`.

That makes ownership inconsistent across screens because some parts now read canonical `purchases`, while other flashcard/admin/dashboard flows still expect `flashcard_purchases` to exist.

## Fix plan

### 1. Fix the zero-dollar checkout grant path
Edit `supabase/functions/paypal-create-order/index.ts`:

- After the `purchases` insert in the `finalPrice === 0` branch, detect `product.scope === "flashcard_pack"`.
- Look up the matching `flashcard_packs` row by `product_id`.
- Insert an active `flashcard_purchases` row with:
  - `user_id`
  - `pack_id`
  - `provider_code: "paypal"` unless a `free_coupon` provider exists
  - `provider_order_id: purchase.id` or a deterministic `free_coupon:<purchase.id>` marker
  - `amount_cents: 0`
  - `discount_cents: pack.price_cents`
  - `currency`
  - `coupon_id`
  - `status: "active"`
  - `purchased_at: now()`
- Treat duplicate insert errors as success/idempotent so retrying the zero-dollar checkout does not break access.

### 2. Backfill the affected purchases
Create a migration to backfill missing `flashcard_purchases` rows from existing active flashcard-pack rows in `purchases`, including 100% coupon purchases:

- Source: active `purchases` joined to `flashcard_packs` by `product_id`.
- Insert only when no active `flashcard_purchases` exists for the same `user_id + pack_id`.
- Use `amount_cents = round(amount * 100)` and for zero-dollar coupon rows set `discount_cents` to the pack price.

This repairs the current user's already-created coupon purchases and any historical affected users.

### 3. Make ownership checks explicitly accept zero-dollar coupon purchases
Create a small migration updating:

- `fc_user_has_pack_access`
- `fc_user_can_study_unit`
- `fc_dashboard_summary`

Ensure canonical `purchases` access checks accept `status IN ('active', 'completed')`, regardless of `amount`, `payment_method`, or PayPal IDs. This makes 100% coupon ownership first-class and permanent.

### 4. Refresh dashboard/access cache after free coupon success
Edit `src/components/checkout/PayPalCheckout.tsx`:

- In the `freeAccess` success path, invalidate all relevant keys:
  - `['purchases', user.id]`
  - `['user-purchases', user.id]`
  - `['fc-dashboard']`
  - `['fc-resume-slug']`
  - `['fc-unit-access']`
- Then navigate to `/dashboard`.

### 5. Verify manually
After implementation:

- Confirm current user has both:
  - active `purchases` row for the flashcard product
  - active `flashcard_purchases` row for the flashcard pack
- Confirm `fc_user_has_pack_access(user, pack)` returns `true`.
- Confirm `fc_user_can_study_unit(user, premiumUnit)` returns `true`.
- Confirm `fc_dashboard_summary()` returns the flashcard purchase and premium units with `has_access: true`.
- Open Dashboard and Flash Cards catalog: premium units should be unlocked immediately after a 100% coupon checkout, after refresh, and after logout/login.

No UI workaround. The fix is in the ownership/grant flow.