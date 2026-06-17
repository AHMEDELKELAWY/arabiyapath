## Flash Cards — Final UX, Navigation & Ownership Fixes

UI + navigation work, plus one targeted backend fix for the broken ownership check. No changes to RLS shape, SRS, progress math, payment backend, products table structure, or course logic.

---

### Issue 1 — Purchased pack becomes locked again (ROOT CAUSE)

**Diagnosis (confirmed against the DB):**
- The unified course checkout writes successful orders to `public.purchases` (`product_id`, `status='active'`). For the Flash Cards product (`scope = 'flashcard_pack'`), the PayPal capture/webhook is supposed to **mirror** that row into `public.flashcard_purchases`.
- Two `purchases` rows exist for the flashcard pack product, but `flashcard_purchases` is empty. The mirror only runs when `pending_orders.product_type = 'flashcard_pack'` — older or alternate-path orders skipped it, so access checks (`fc_user_has_pack_access`, `fc_user_can_study_unit`) return `false` forever.
- Secondary bug: `useFlashcardUnitAccess` queryKey is `["fc-unit-access", unitId]` with no `user.id`, so the `false` cached for a logged-out/pre-purchase session sticks across login/purchase.

**Fix (single migration, no schema changes):**

1. Redefine the two SECURITY DEFINER access functions to ALSO accept ownership via the canonical `purchases` table (treating `purchases` as the source of truth and `flashcard_purchases` as the legacy/companion table):

   ```sql
   CREATE OR REPLACE FUNCTION public.fc_user_has_pack_access(_user_id uuid, _pack_id uuid)
   RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
     SELECT EXISTS (
       SELECT 1 FROM public.flashcard_purchases
       WHERE user_id = _user_id AND pack_id = _pack_id AND status = 'active'
     ) OR EXISTS (
       SELECT 1
       FROM public.purchases pu
       JOIN public.flashcard_packs fp ON fp.product_id = pu.product_id
       WHERE fp.id = _pack_id AND pu.user_id = _user_id AND pu.status = 'active'
     );
   $$;
   ```

   And update `fc_user_can_study_unit` to use the same dual check (free OR `flashcard_purchases` OR `purchases` joined through `flashcard_pack_units` → `flashcard_packs.product_id`).

2. One-time backfill of `flashcard_purchases` from any historical `purchases` rows whose product is a `flashcard_pack` and which lack a mirror row (keeps the legacy table consistent, but the access fix above doesn't depend on it).

**Client cache fix:** `src/lib/flashcardAccess.ts` — include `user.id` in the queryKey, drop the `await supabase.auth.getUser()` call inside the queryFn (read it from `useAuth()` instead), and invalidate `["fc-unit-access"]` after a successful return from checkout.

---

### Issue 2 — Dashboard Continue resumes studying

`src/pages/Dashboard.tsx` (Flash Cards `ProductCard`) — `continueHref` already resolves via `useFlashcardsResumeSlug` → falls back to first free unit. Append `?from=dashboard` to the URL. No marketing/pack/catalog fallback.

### Issue 3 — Flash Cards as equal learning product in My Learning

`src/pages/Dashboard.tsx` + `src/components/dashboard/ProductCard.tsx` — render the Flash Cards product card next to Gulf / MSA with: progress % (mastered ÷ total across published units from `fc_dashboard_summary`), current streak, units count, single Continue button (Issue 2 target).

### Issue 4 — `/flashcards` is the catalog

`src/pages/flashcards/FlashCardsHome.tsx` — keep the catalog browse purpose. For signed-in users, decorate each unit card with completion state derived from `fc_dashboard_summary` (`mastered / total`, "Completed" badge when `mastered === total`, lock icon for locked). No "resume" CTA here.

### Issue 5 — Free unit opens study screen directly

`FlashCardsHome.tsx` free unit cards already link straight to `/flashcards/study/<slug>` — confirm whole card is clickable (it is, via the wrapping `<Link>`) and append `?from=home`. Guests → `/signup?redirect=…`.

### Issue 6 — Locked unit goes directly to checkout

`FlashCardsHome.tsx` — already routes locked unit cards to `/checkout?productId=<pack.product_id>` using `flashcard_pack_units` lookup with a first-published-pack fallback. Confirm card is fully clickable and guest redirect via `/signup`. Remove any lingering link to the pack/unit page from this grid.

### Issue 7 — Pack page Free Unit CTA, above the fold

`src/pages/flashcards/FlashCardPack.tsx`:

- Query first free published unit (`flashcard_units` where `is_free=true, published=true`, ordered by `order_index`, limit 1).
- Inside the existing pricing card, reorder to:
  ```text
  Price
  [ Get Lifetime Access ]    ← rename from "Go to Checkout", primary, full-width
  [ Try Free Unit ]          ← outline, full-width, hidden if no free unit
  — features list —
  — secure-checkout note —
  ```
- Try Free Unit href: `/flashcards/study/<slug>?from=home` (signed-in) or `/signup?redirect=…` (guest).
- Both CTAs stacked directly under price so they sit above the fold on desktop.

### Issue 8 + 9 — Study Exit destination, persisted for the whole session

`src/pages/flashcards/FlashCardStudy.tsx`:

- On first mount only, resolve `source` from `location.state?.from` → `?from=` query param → `document.referrer` heuristic (contains `/dashboard` → `"dashboard"`, else `"home"`).
- Store it in a `useRef` initialized lazily. Never reassign. Card-to-card state changes are internal `setIdx` calls only — no `navigate()` between cards — so the ref is naturally stable, and the Exit `<Link>` reads only from the ref.
- Exit target: `"dashboard"` → `/dashboard`, else `/flashcards`. Label stays "Exit".

### Issue 10 — Dashboard passes source

`src/pages/Dashboard.tsx` and `src/components/dashboard/ContinueLearningCard.tsx` — any `/flashcards/study/:slug` href appends `?from=dashboard`.

### Issue 11 — Home passes source

`src/pages/flashcards/FlashCardsHome.tsx` — hero "Try … Free" and unit-grid free links append `?from=home`.

### Issue 12 — Conversion screen after completing the free unit

`FlashCardStudy.tsx` — when the last card of a **free** unit is rated and the user has no pack access (`access !== true`), replace the toast-only end state with an inline conversion panel:

```text
Congratulations! You completed the free flashcard unit.

Unlock the complete Flash Cards Pack and get:
✅ 500+ Arabic flashcards
✅ Native Arabic audio pronunciation
✅ Realistic image-based learning
✅ Full Arabic vowelization (Tashkeel)
✅ Smart spaced repetition reviews
✅ Vocabulary from real conversations
✅ Progress tracking and learning streaks

[ Unlock Full Pack ]   → /checkout?productId=<pack.product_id>
[ Back to Flash Cards ] → /flashcards
```

Reuses the same `unlockProductId` query already in the file.

### Issue 13 — Unified checkout

Already in place: `FlashCardsHome`, `FlashCardPack`, `FlashCardUnit`, and `FlashCardStudy` all redirect to `/checkout?productId=…`. Final audit pass to confirm no remaining custom payment UI or PayPal buttons remain in flashcard pages (sweep `FlashCardsSalesPage.tsx` too — replace any direct `createOrder` call with the unified checkout link).

---

### Technical summary

**Migration (new):**
- Recreate `fc_user_has_pack_access` and `fc_user_can_study_unit` to additionally honor `public.purchases` rows joined through `flashcard_packs.product_id`.
- Backfill `flashcard_purchases` from existing matching `purchases` rows.

**Files edited (frontend):**
- `src/lib/flashcardAccess.ts` — queryKey includes `user.id`; read user from `useAuth`.
- `src/pages/flashcards/FlashCardStudy.tsx` — `useRef` source persistence, Exit target, free-unit completion conversion panel.
- `src/pages/flashcards/FlashCardPack.tsx` — add Try Free Unit CTA above features, rename primary CTA.
- `src/pages/flashcards/FlashCardsHome.tsx` — append `?from=home` to all study links, decorate cards with progress/completed state.
- `src/pages/Dashboard.tsx` + `src/components/dashboard/ProductCard.tsx` + `src/components/dashboard/ContinueLearningCard.tsx` — append `?from=dashboard`, ensure Flash Cards card shows streak/units/progress.
- Audit `src/pages/FlashCardsSalesPage.tsx` for any non-unified payment UI and route it through `/checkout?productId=…`.

**Not touched:** RLS, schema, products/purchases columns, SRS, progress tables, edge functions (no behavior change required — mirror still runs for new orders, and access now also reads from `purchases`), course logic, study-screen rendering, FlashCardsHome catalog structure.
