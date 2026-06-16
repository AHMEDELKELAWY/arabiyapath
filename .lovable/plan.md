# Flash Cards (MSA / Fusha) — Phase 1 Architecture

Building the **complete platform** for the new Modern Standard Arabic Flash Cards product. **No lesson/card content** will be generated in this phase — the system will be ready for the prepared Unit 1 to be imported afterward.

## 1. Memory / policy change
- Remove core rule: *"Flash cards feature is removed, do not re-add."*
- Add core rule: *"Flash Cards is a core premium MSA (Fusha) product line, separate from Gulf. Fully vowelized Arabic, realistic photos, CSS watermark `arabiyapath.com`, SRS, PayPal (provider-abstracted)."*
- Save a feature memory `mem://features/flashcards-msa` with the full spec from this turn.

## 2. Database schema (new migration)
All tables in `public`, with GRANTs + RLS + policies. New tables:

- `flashcard_units` — id, slug (unique), title_en, title_ar, description, order_index, is_free (bool, default false), cover_image_url, published (bool), seo_title, seo_description, timestamps.
- `flashcards` — id, unit_id (fk), order_index, arabic_text (tashkeel), english_translation, transliteration, example_arabic, example_english, image_url, image_alt, audio_url, audio_example_url, notes, published, timestamps.
- `flashcard_packs` — id, slug (unique), title, description, price_cents (default 1900), currency (default 'USD'), access_type ('lifetime'), cover_image_url, seo_title, seo_description, published, timestamps.
- `flashcard_pack_units` — pack_id, unit_id (composite pk) — many-to-many.
- `flashcard_progress` — id, user_id, flashcard_id, status ('new'|'learning'|'review'|'mastered'), ease_factor (float, default 2.5), interval_days (int, default 0), repetitions (int, default 0), due_at (timestamptz), last_reviewed_at, lapses (int, default 0), correct_count, incorrect_count, timestamps. Unique (user_id, flashcard_id).
- `flashcard_review_log` — id, user_id, flashcard_id, rating ('again'|'hard'|'good'|'easy'), prev_interval, new_interval, reviewed_at. Append-only history for analytics.
- `flashcard_streaks` — user_id (pk), current_streak, longest_streak, last_active_date, timestamps.
- `payment_providers` — id, code ('paypal'|'stripe'|…), display_name, is_active, config (jsonb). Seed `paypal` active.
- `flashcard_purchases` — id, user_id, pack_id, provider_code (fk → payment_providers.code), provider_order_id, provider_capture_id, amount_cents, currency, coupon_id (nullable), discount_cents, status ('pending'|'active'|'refunded'|'failed'), purchased_at, timestamps.
- Extend existing `coupons` table use: reuse it; add optional `scope` value `'flashcards'` (no schema change required — existing scope column accepts string).

**Policies summary**
- Units / cards / packs: `SELECT` public when `published = true` (anon + authenticated). Admin full CRUD via `has_role(uid,'admin')`.
- Progress / review_log / streaks / purchases: user can read/write own rows; admin can read all.
- `payment_providers`: public read of active; admin write.
- All public-readable tables get `GRANT SELECT ... TO anon, authenticated`; user-owned get `GRANT … TO authenticated` + `GRANT ALL TO service_role`.

**Triggers / functions**
- `updated_at` trigger on all mutable tables.
- `fc_apply_review(user_id, card_id, rating)` SECURITY DEFINER — runs SM-2 update server-side, writes progress + log atomically.
- `fc_user_has_pack_access(user_id, pack_id)` SECURITY DEFINER — true if any active `flashcard_purchases` row, OR any unit in pack has `is_free`.
- `fc_user_can_view_card(user_id, card_id)` SECURITY DEFINER — used by RLS on richer card fields if we later gate them.

## 3. Payment provider abstraction
- `src/lib/payments/types.ts` — `PaymentProvider` interface: `createOrder`, `captureOrder`, `getDisplayName`, `code`.
- `src/lib/payments/paypal.ts` — wraps existing `paypal-create-order` / `paypal-capture-order` edge functions (reused, parameterized by product type `flashcard_pack`).
- `src/lib/payments/registry.ts` — map of `code → provider`. Default `paypal`. Stripe placeholder export commented for future.
- New edge functions:
  - `flashcards-create-order` — thin wrapper that picks provider from DB `payment_providers`, validates pack, applies coupon, creates pending order via provider module logic. (Initial impl delegates to PayPal; structured so Stripe adds a branch.)
  - `flashcards-capture-order` — captures + writes `flashcard_purchases` row.
- Re-uses existing PayPal secrets and webhook (extend `paypal-webhook` to recognize `flashcard_pack` custom_id prefix and insert into `flashcard_purchases`).

## 4. SRS engine
- `src/lib/srs/sm2.ts` — pure SM-2 implementation (`schedule(prev, rating) → { interval, ease, repetitions, dueAt }`). Used by the DB function and mirrored client-side for instant UI feedback.
- `src/hooks/useFlashcardSession.ts` — fetches due cards, queues new cards (configurable daily new-card limit), submits ratings via `fc_apply_review` RPC.

## 5. Flash Card engine (UI)
- `src/pages/flashcards/FlashCardsHome.tsx` — public landing for the MSA Flash Cards product line. SEO-optimized.
- `src/pages/flashcards/FlashCardUnit.tsx` — `/flashcards/unit/:slug` — unit overview, locked state if not free + not purchased.
- `src/pages/flashcards/FlashCardStudy.tsx` — `/flashcards/study/:unitSlug` — the SRS study session.
  - Front: full-bleed realistic image, **CSS overlay watermark `arabiyapath.com`** bottom-right (semi-transparent, pointer-events-none).
  - On mount: audio auto-plays once. **No loop, no auto-repeat.**
  - "Show answer" reveals back: Arabic with tashkeel, English, example, **replay button** (and replay for example audio).
  - Rating buttons: Again / Hard / Good / Easy → calls `fc_apply_review`.
- `src/pages/flashcards/FlashCardPack.tsx` — `/flashcards/pack/:slug` — pricing + buy CTA via PayPal.
- `src/components/flashcards/Watermark.tsx` — reusable overlay.
- `src/components/flashcards/FlashCardImage.tsx` — image + watermark + lazy load.
- Remove/quarantine the legacy Gulf-era `FlashCard.tsx` / `FlashCardDeck.tsx` (kept code-only, not routed) to avoid confusion; new MSA components live under `src/components/flashcards/msa/`.

## 6. Image generation pipeline
- New edge function `generate-flashcard-image` — uses AI Gateway (`openai/gpt-image-2`, quality `low`, streaming off — server uploads final PNG to `lesson-images` bucket under `flashcards/{cardId}.png`, writes URL to `flashcards.image_url`).
- Prompt template enforces: photorealistic, real-life photography style, no text, no watermark, no captions, no logos.
- Watermark is **never baked into the image** — applied via CSS overlay in `FlashCardImage`.
- Admin UI exposes "Generate image" per card and bulk-generate per unit (background job pattern reusing existing admin bulk pattern).

## 7. Audio generation pipeline
- New edge function `generate-flashcard-audio` — ElevenLabs TTS (`eleven_multilingual_v2`, Daniel voice `onwK4e9ZLuTAKqWW03F9`).
- Input: fully vowelized Arabic. Output: MP3 uploaded to `content` bucket under `flashcards/audio/{cardId}.mp3`. Writes URL to `flashcards.audio_url`.
- Separate function for `audio_example_url`.
- Admin: "Generate audio" + bulk-generate per unit.

## 8. Admin panel
New routes under `/admin/flashcards`:
- `AdminFlashcardUnits.tsx` — list/create/edit/reorder units (dnd-kit, same pattern as existing curriculum admin), toggle `is_free`, manage SEO.
- `AdminFlashcardCards.tsx` — list cards in a unit, inline edit Arabic (tashkeel), English, example; per-row Generate Image / Generate Audio; upload image override; reorder.
- `AdminFlashcardPacks.tsx` — packs, pricing, attach units.
- `AdminFlashcardPurchases.tsx` — list purchases, manual refund flag.
- Coupons: extend existing `AdminCoupons.tsx` with optional "Flash Cards" scope filter.

## 9. User dashboard additions
- New tab/section `Flash Cards` on `/dashboard`:
  - Per-unit progress bars (mastered / total).
  - Cards due today (CTA → study).
  - Streak (current + longest).
  - Total learned cards.
  - Purchase history (packs).
- Implemented as `src/components/dashboard/FlashcardsDashboardSection.tsx`, data via `useFlashcardsDashboard` hook (single RPC `fc_dashboard_summary`).

## 10. SEO
- `react-helmet-async` `SEOHead` already exists — reuse on all new pages.
- JSON-LD per page:
  - Pack page: `Product` + `Offer` (price, currency, availability).
  - Unit page: `Course` + `BreadcrumbList`.
  - Home: `ItemList` of units + breadcrumbs.
- Stable URLs: `/flashcards`, `/flashcards/unit/:slug`, `/flashcards/pack/:slug`, `/flashcards/study/:unitSlug`.
- Add public pages to `public/sitemap.xml` generator (static add now; cards/units pulled dynamically once content exists — TODO comment).
- Lazy-load study route via `React.lazy` (matches existing perf pattern).

## 11. Access / permissions
- `src/lib/flashcardAccess.ts`:
  - `useFlashcardAccess(unitId)` → `{ isFree, isPurchased, canAccess, loading }`.
  - Server-side enforced via the SECURITY DEFINER `fc_user_has_pack_access` used inside RLS for any premium-only RPC (e.g. `fc_apply_review` rejects writes when no access and unit not free).
- UI locking: locked units show buy CTA; "Try Unit 1 free" CTA throughout funnels.

## 12. Routing
Add lazy routes in `src/App.tsx`:
- `/flashcards`
- `/flashcards/unit/:slug`
- `/flashcards/pack/:slug`
- `/flashcards/study/:unitSlug` (protected by signup-first redirect for premium units)
- Admin routes wrapped in `AdminRoute`.

## 13. Out of scope (Phase 1)
- No lesson/card/unit content seeded — admin will import Unit 1 later.
- No actual Stripe code path (interface only).
- No new image/audio assets generated.
- Curriculum, Gulf course, existing pages: untouched.

## 14. Technical notes
- Migration order: enums → tables → grants → RLS → policies → triggers → functions → seed `payment_providers('paypal',…)`.
- Tashkeel storage: `arabic_text` is plain UTF-8; admin form must accept/preserve combining marks (no normalization stripping).
- Watermark CSS: `position:absolute; bottom:8px; right:10px; font: 600 12px/1 system-ui; color: rgba(255,255,255,.85); text-shadow: 0 1px 2px rgba(0,0,0,.6); letter-spacing:.02em;`.
- Audio auto-play: `<audio autoPlay>` + `ref.current.play().catch(()=>{})` to handle browser autoplay policy; muted fallback shows "Tap to play" only if blocked.
- PayPal reuse: existing `paypal-create-order` accepts a `productType` UUID from `products`. We will create a `products` row per pack (price $19, scope `flashcard_pack`) so the existing PayPal+webhook+coupon stack works unchanged; `flashcard_purchases` is populated by extending the webhook to mirror the row when `scope = 'flashcard_pack'`. This minimizes duplicated payment code while keeping the new abstraction layer for future providers.

## Approval needed
This is a large multi-migration build. Approve and I will proceed in this order:
1. Memory update.
2. DB migration (schema + grants + RLS + functions + seed).
3. Provider abstraction + edge functions + webhook extension.
4. Admin pages.
5. Public/study pages + SRS + dashboard section.
6. SEO + routing + access layer.
