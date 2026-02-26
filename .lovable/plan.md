
## Objective
Resolve the remaining product-name inconsistency so all English UI surfaces use consistent naming in this format:

- `[Dialect Name] — [Level Name]`
- `[Dialect Name] — Full Bundle`

and ensure no Arabic product title appears in English purchase flows.

## What I investigated
1. Session replay confirms the issue existed in the purchase modal (`Complete Your Purchase`) for MSA Beginner with Arabic text.
2. Current product catalog values are now English and correctly formatted (including:
   - `Modern Standard Arabic — Beginner Level`
   - `Modern Standard Arabic — Full Bundle`
   - `Gulf Arabic — Beginner Level`, etc.).
3. Pricing page code uses `selectedPlan.name` from `products.name`, so it should display canonical names.
4. I found historical naming drift in `purchases.product_name`:
   - 17 rows mismatch `products.name`
   - mostly Gulf legacy values (`Gulf Arabic - Beginner`, etc.) using hyphen format.
5. `pending_orders` currently has no mismatches.
6. Several pages still render `purchases.product_name` directly (affiliate and payment success views), which can surface old/non-canonical names.

## Root cause
The UI mostly reads canonical `products.name`, but historical purchase snapshots (`purchases.product_name`) may still contain old naming. Any screen rendering snapshot fields directly can show outdated names.

## Implementation plan

### 1) Normalize existing transactional data (data fix)
Run a data update to align snapshot names with canonical catalog names:

- Update `purchases.product_name` from joined `products.name` where mismatched.
- Update `pending_orders.product_name` similarly (defensive, even if currently 0 mismatches).

This removes old Arabic/legacy naming from confirmation/history views immediately.

### 2) Make display logic resilient in UI
For pages that currently read `purchases.product_name`, update queries to also fetch joined `products.name`, then render:

- `products.name ?? purchases.product_name`

Apply this in:
- `src/pages/PaymentSuccess.tsx`
- Affiliate-related list views backed by `src/hooks/useAffiliateData.ts`:
  - referrals
  - commissions tables (dashboard + commissions pages + admin affiliate commissions surfaces)

This prevents future stale snapshot labels from appearing after catalog renames.

### 3) Prevent future inconsistent naming at product creation/edit
In admin product editor (`src/pages/admin/AdminProducts.tsx`):
- Update naming hint to canonical style using em dash.
- Add lightweight validation/guidance for expected format by scope:
  - level: `[Dialect] — [Level] Level`
  - bundle: `[Dialect] — Full Bundle`
- Optional enhancement: autofill suggested name from selected dialect + level/scope.

This reduces future manual drift.

### 4) Verification checklist (end-to-end)
1. `/pricing`: open MSA Beginner modal → must show `Modern Standard Arabic — Beginner Level`.
2. Complete purchase flow (or simulate existing purchased user):
   - payment success page summary shows canonical English title.
3. Affiliate dashboard/referrals/commissions:
   - product titles use canonical English naming.
4. Data verification query:
   - mismatches between `purchases.product_name` and `products.name` = 0
   - Arabic-script search in product title fields on transactional tables = 0

## Technical details
```text
Display path today:
products.name (canonical) ──> pricing cards/modal ✅
purchases.product_name (snapshot) ──> affiliate/payment success ⚠️

Target:
products.name (canonical) ──> primary display
fallback to snapshot only if needed
+ historical snapshot backfill to match canonical
```

- No schema migration needed.
- No RLS policy changes needed.
- This is a data + query/render consistency fix.

## Files to update (planned)
- `src/pages/PaymentSuccess.tsx`
- `src/hooks/useAffiliateData.ts`
- `src/pages/admin/AdminProducts.tsx`
- (No change expected in `src/pages/Pricing.tsx` unless optional defensive fallback is requested)

## SQL data operations planned
- `UPDATE purchases ... FROM products ... WHERE product_name differs`
- `UPDATE pending_orders ... FROM products ... WHERE product_name differs`

I will keep the update idempotent so it is safe to run multiple times.

<lov-actions>
<lov-suggestion message="Test this naming fix end-to-end: open the Pricing modal, complete checkout, verify Payment Success, and verify affiliate tables all show canonical English product titles.">Verify end-to-end naming</lov-suggestion>
<lov-suggestion message="Add an admin-side auto-generated product title helper so product names are always created in the format '[Dialect] — [Level]' or '[Dialect] — Full Bundle'.">Auto-generate product titles in admin</lov-suggestion>
<lov-suggestion message="Add a small backend consistency job that periodically syncs purchases.product_name from products.name to prevent future drift.">Add automatic naming sync job</lov-suggestion>
</lov-actions>
