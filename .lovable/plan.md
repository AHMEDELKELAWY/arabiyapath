# Flash Cards Admin + Study UX Improvements

UI-only changes. No schema, RLS, RPC, payments, or access-control changes. Only `image_url`, `audio_url`, `published`, and `order_index` fields on `flashcards` are written, using existing update calls.

## Scope

- **Edit** `src/pages/admin/AdminFlashcardCards.tsx` — toolbar + bulk actions + search/sort/jump, wire new row component.
- **Edit** `src/components/admin/flashcards/BulkImageUploadDialog.tsx` — richer preview badges + richer results summary.
- **Edit** `src/pages/flashcards/FlashCardStudy.tsx` — disable audio auto-play.
- **New** `src/components/admin/flashcards/CardRow.tsx` — extracted row component.
- **New** `src/components/admin/flashcards/UnitStatsBar.tsx` — counters + bulk action toolbar.

All admin mutations end with `qc.invalidateQueries(["admin-fc-cards", unitId])`.

## Admin Page (`/admin/flashcards/cards`)

### Toolbar above list

1. **Stats**: `Total · Published · Draft · Images · Audio` (computed from `cards`).
2. **Bulk publish**: `Publish All` / `Unpublish All` (confirm) — `update({ published }).eq("unit_id", unitId)`.
3. **Bulk media generate**: `Generate Missing Images`, `Generate Missing Audio` — sequential loop over cards with empty `image_url` / `audio_url`, calling existing `generate-flashcard-image` / `generate-flashcard-audio` edge functions; progress toast `x / N`, final success/fail counts.
4. **Bulk media remove**: `Remove All Images In Unit`, `Remove All Audio In Unit` (confirm) — `update({ image_url: null })` / `update({ audio_url: null })` scoped to unit.
5. **Recalculate Card Numbers** (confirm) — load cards ordered by current `order_index`, reassign `1..N`, batch `update({ order_index }).eq("id", ...)`. Only `order_index` is touched.
6. **Search** input — client-side filter by Arabic substring, English substring, or numeric `order_index` equality.
7. **Jump to #** input — on Enter, scrolls `#card-<id>` into view and applies a `ring-2 ring-primary` highlight class for ~3 s via timeout (state: `highlightId`).
8. **Sort** select — Card # ↑ (default), Arabic, Published, Has Image, Has Audio. All client-side over fetched array.

### Card row (`CardRow.tsx`) layout

```
[#6]  قَلَمٌ فَوْقَ حَقِيبَةٍ                       [Published ✓ toggle]
      A pen on a bag
      Image: Available · msa-u01-006.jpg
      Audio: Missing
      ⚠ Duplicate Card Number      (only if order_index appears > once)

[thumbnail]   [Generate Image]  [Generate Audio]
              [Replace Image]   [Remove Image]  [Remove Audio]
              [Edit]            [Delete]
```

- Card # = `order_index`, always visible.
- Duplicate badge: parent passes `duplicateOrders: Set<number>` (computed once over `cards`); row shows badge when its `order_index` is in the set.
- Filename = last segment of `image_url` pathname.
- Publish toggle → `update({ published }).eq("id", c.id)`.
- Remove Image / Remove Audio → confirm → null that one column.
- Replace Image → hidden per-row `<input type="file">`; upload to `content/flashcards/images/<unit-slug>/<filename>` with `upsert:true`; then `update({ image_url })`. No other fields touched.
- Generate Image / Audio → existing edge function invokes.
- Edit / Delete → unchanged dialogs.
- Row wrapper `id={`card-${c.id}`}` for the Jump feature, and conditional ring when `highlightId === c.id`.

## Bulk Image Upload Dialog updates

Matching still uses `order_index` (preserves current behavior; the visible Card # in the admin list now lets admins audit numbering before uploading).

### Preview stage badges
- Existing per-row match preview gains a **`Will Replace Existing Image`** badge when the matched card already has a non-null `image_url`.

### Results stage summary
Replace current two-count summary with:

```
Matched:                  X
Updated:                  X
Replaced Existing Images: X
Missing Cards:            X   (cards in unit with no file mapped)
Unmatched Files:          X   (files with no card match)
```

Counters tracked during the upload loop:
- `matched` = files that mapped to a card.
- `updated` = successful `update({ image_url })` calls.
- `replacedExisting` = subset of `updated` where the prior `image_url` was non-null (recorded from preview snapshot).
- `missingCards` = cards in unit with no matched file (computed from preview).
- `unmatchedFiles` = files with no card (computed from preview).

No other behavior of the dialog changes (still client-side, jszip, 8-parallel uploads, `image_url`-only writes).

## Study Mode (`FlashCardStudy.tsx`)

Single change: remove `autoPlay` on the back-side `<FlashCardAudio>` so audio plays **only** when the learner clicks the replay button. Flip animation, image-first front, Arabic/English on back, and two-button assessment (`I Didn't Know It` → `again`, `I Knew It` → `good`) remain unchanged.

## Out of scope (unchanged)

- `flashcards` schema and all `flashcard_*` tables.
- `fc_apply_review`, `fc_user_can_study_unit`, `fc_user_has_pack_access`, `fc_dashboard_summary`, `sm2.ts`.
- PayPal, products, purchases, access control, packs, sales pages.
- No new RLS, migrations, or edge functions.
