

# Fix: PayPal Payment Bug — End-to-End

## Problem Analysis

After tracing the full payment flow, I found **three root causes**:

### Root Cause 1: Duplicate Orders Created
When a user clicks "Pay with PayPal" multiple times (common on slow mobile), `paypal-create-order` creates a **new** pending_order and PayPal order each time. Each PayPal order can be independently approved and captured, causing duplicate charges.

### Root Cause 2: "Order data not found" on Mobile
The return URL from PayPal is `/payment/success?token=ORDER_ID`. The `PaymentSuccess` page calls `paypal-capture-order`, which captures the PayPal order, then reads `custom_id` from PayPal's response to find the `pending_orders` row. On mobile Safari, session/auth can be lost during the PayPal redirect. The capture function requires authentication — if the session is gone, it fails with a confusing error.

### Root Cause 3: No Fallback if Client-Side Capture Fails
The webhook handler (`paypal-webhook`) only **updates** existing purchases — it never **creates** them. So if the client-side capture flow fails (mobile kills session, user closes browser), no purchase record is ever created, even though PayPal captured the money.

---

## Implementation Plan

### 1. Prevent Duplicate Orders (`paypal-create-order`)
- Before creating a new pending_order, check if the user already has a **non-expired** pending_order for the **same product_id**. If so, reuse it and create a new PayPal order pointing to the same pending_order (old PayPal order becomes stale).
- This prevents multiple captures for the same checkout intent.

### 2. Include pending_order_id in Return URL (`paypal-create-order`)
- Change `return_url` from `/payment/success` to `/payment/success?pending_order_id={id}`.
- This removes dependency on PayPal's `custom_id` field in the capture response and makes the flow resilient to mobile redirects.

### 3. Make Capture Resilient (`paypal-capture-order`)
- **Remove auth requirement** — instead, verify the user via the pending_order's `user_id`. The PayPal order ID + pending_order_id together are enough to authenticate the request (only the user who created the order has these IDs).
- **Handle "already captured" gracefully**: If PayPal returns `COMPLETED` status (already captured), look up or create the purchase record and return success.
- **Add DB-level uniqueness**: Add a unique index on `purchases.paypal_order_id` to prevent race-condition duplicates.
- **Better logging**: Log orderId, captureId, userId, productId, and status transitions.

### 4. Upgrade Webhook to Create Purchases (`paypal-webhook`)
- For `CHECKOUT.ORDER.APPROVED` and `PAYMENT.CAPTURE.COMPLETED` events: if no purchase exists for the capture ID, look up the pending_order via `custom_id` and create the purchase. This is the **backup path** if the user closes their browser after PayPal approval.

### 5. Improve PaymentSuccess Page (`PaymentSuccess.tsx`)
- Accept `pending_order_id` from URL params and pass it to the capture call.
- If auth session is missing, still attempt capture (since the edge function won't require it for PayPal redirect flow).
- Add **retry logic** (3 attempts with delay) instead of immediate failure.
- If all retries fail, show: *"We received your payment and are confirming it. Your access will appear on your dashboard shortly. If not, contact support."* — never say "Payment Failed" if we can't confirm.
- On success, redirect to `/thank-you-purchase` (fires Meta Pixel).

### 6. Add Unique Constraint (Database Migration)
- Add a unique index on `purchases.paypal_order_id` (where not null) to enforce idempotency at the DB level.

---

## Files to Change

| File | Change |
|------|--------|
| `supabase/functions/paypal-create-order/index.ts` | Dedup pending_orders; include pending_order_id in return_url |
| `supabase/functions/paypal-capture-order/index.ts` | Accept pending_order_id param; remove strict auth requirement for redirect flow; handle already-captured; add unique constraint error handling |
| `supabase/functions/paypal-webhook/index.ts` | Create purchase records as backup path for `PAYMENT.CAPTURE.COMPLETED` |
| `src/pages/PaymentSuccess.tsx` | Pass pending_order_id; retry logic; never show "Payment Failed" if payment went through; redirect to thank-you |
| **DB Migration** | Add unique index on `purchases.paypal_order_id` |

