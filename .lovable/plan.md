

## Fix: Inconsistent Product Naming

### Problem
The product names in the `products` table are already correct in English. However, there is **one existing purchase record** in the `purchases` table that still has the old Arabic name `"الفصحى - المستوى المبتدئ"` stored in its `product_name` column. This means any user viewing their purchase history or any admin viewing that purchase will see the Arabic title.

### Root Cause
When the product was purchased, the `product_name` was snapshot into the `purchases` table at that time. The recent rename of products only updated the `products` table, not historical purchase records.

### Plan

**1. Update the historical purchase record (database data fix)**
- Update the `purchases` table: set `product_name = 'Modern Standard Arabic — Beginner Level'` where `product_name = 'الفصحى - المستوى المبتدئ'`
- Also scan for any other Arabic product names in `purchases` and `pending_orders` tables to ensure full consistency

**2. No code changes needed**
- The Pricing page (`src/pages/Pricing.tsx`) pulls product names dynamically from the `products` table, which is already correct
- The checkout modal displays `selectedPlan.name`, which also comes from the database query
- The `src/pages/Dialects.tsx` file uses `arabicName: "العربية الفصحى"` decoratively as a subtitle — this is intentional for the dialect overview page and not a product title

### Scope
- **1 database update** to the `purchases` table
- **0 file changes**

