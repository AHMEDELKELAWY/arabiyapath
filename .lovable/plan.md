
# Flash Cards — Bulk Image Upload

A new admin-only feature inside `/admin/flashcards/cards` that lets admins upload many flash card images at once (ZIP or multi-select) and auto-link them to the current unit's cards by order, without touching any other card data or the database schema.

## Scope

- UI-only addition + client-side ZIP parsing + Supabase Storage uploads.
- No DB migration. Only `flashcards.image_url` is updated (one column, one row per matched card).
- Operates strictly on the **currently selected unit** in the cards admin page.

## User Flow

1. Admin opens `/admin/flashcards/cards`, selects a unit.
2. Clicks new **Bulk Image Upload** button (placed between *Import CSV/JSON* and *New Card*).
3. A dialog opens, allowing either:
   - Drop/select a `.zip`, or
   - Drop/select many image files (`.jpg`, `.jpeg`, `.png`, `.webp`).
4. Client extracts and parses filenames, builds a match preview table:
   ```
   Card #1  "بَيْت"       ← msa-u01-001.jpg     [ok]
   Card #2  "كِتاب"       ← msa-u01-002.jpg     [ok, will overwrite]
   Card #3  "قَلَم"       ← (no image)          [missing]
   --
   Unmatched files: extra-photo.jpg, cover.png
   ```
   Shows three counts: **Matched**, **Unmatched images**, **Cards missing images**.
5. Admin clicks **Confirm Upload**.
6. Files are uploaded in batches to `content/flashcards/images/`, then `flashcards.image_url` is updated for each matched card.
7. Final results screen shows the same three counts plus per-card success/failure.

## Matching Logic

Filename → card order. Service is structured so an `image_key` strategy can be plugged in later without UI changes.

Resolution order (per file):
1. **image_key match** (future): if filename stem equals `flashcards.image_key` (column doesn't exist yet — strategy stubbed, disabled today).
2. **Order match**: extract the **last run of digits** from the filename stem and parse as integer. That integer is matched against the card's `order_index` within the current unit.
   - `msa-u01-001.jpg` → 1
   - `msa-u01-012.png` → 12
   - `7.webp` → 7
   - Leading zeros ignored.
3. Files with no digits, duplicates resolving to the same card, or numbers with no matching card → **Unmatched images**.
4. Cards in the unit with no file mapped → **Cards missing images** (only counted/reported, never modified).

Existing `image_url` values on matched cards **will be overwritten** — preview clearly flags this with a "will overwrite" badge.

## Upload Process (Client)

- ZIP parsing: use `jszip` (small, browser-friendly). If not already installed, add it.
- For each image entry:
  - Skip directories, dotfiles, non-image extensions, and files >10 MB each (configurable constant).
  - Upload to bucket `content` at path `flashcards/images/<unit-slug>/<original-filename>` using `upsert: true` so re-runs replace cleanly.
  - Get public URL via `supabase.storage.from('content').getPublicUrl(path)`.
- Concurrency: upload in batches of 8 in parallel, with a progress bar `(done / total)`.
- After all uploads succeed, run DB updates in batches of 50 using individual `update().eq('id', cardId)` calls (no schema RPC needed). Failures are collected, not thrown.

## Results Screen

Displayed in the same dialog after Confirm:
- **Matched & updated:** N
- **Unmatched images:** list with filenames
- **Cards missing images:** list with card order + Arabic text
- **Failed updates:** list with reason (if any)
- "Close" button; on close, the cards query is invalidated so thumbnails refresh.

## Safety

- Confirm step is mandatory; nothing is written before Confirm.
- Only `image_url` is updated. No edits to `arabic_text`, `english_translation`, `transliteration`, `examples`, `audio_url`, `published`, `order_index`, or SRS/progress tables.
- Scoped to the selected unit only.
- Per-file size cap and image-extension allowlist.
- All work happens in admin UI guarded by existing `AdminRoute`.

## Storage

- Bucket: existing public `content` bucket.
- Prefix: `flashcards/images/`.
- Final path: `flashcards/images/<unit-slug-or-id>/<original-filename>`.
- No bucket changes, no new RLS.

## Files to Add / Modify

- **New:** `src/components/admin/flashcards/BulkImageUploadDialog.tsx`
  - Dialog with dropzone, ZIP/multi-file handling, preview table, progress, results.
- **New:** `src/lib/flashcards/bulkImageMatcher.ts`
  - Pure functions: `extractOrderFromFilename(name)`, `matchFilesToCards(files, cards, strategy)`, returning `{ matches, unmatchedFiles, missingCards }`. Strategy param defaults to `'order'`; `'image_key'` reserved for later.
- **Modified:** `src/pages/admin/AdminFlashcardCards.tsx`
  - Add **Bulk Image Upload** button next to the existing toolbar buttons.
  - Open the new dialog, pass `unitId`, current `cards`, and invalidate query on success.
- **Dependency:** add `jszip` via `bun add jszip` if not already present.

## Out of Scope

- No schema migration; no `image_key` column added now.
- No changes to `AdminProducts`, `AdminFlashcardPacks`, `FlashCardStudy`, or any non-admin page.
- No audio bulk upload (can mirror this pattern later).
- No server-side function — all work runs client-side under the admin's session.

## Verification

- Upload a small ZIP with `1.jpg`, `2.jpg`, `3.jpg` against a unit with ≥3 cards → preview lists three matches, Confirm updates three `image_url` values, others untouched.
- Upload `msa-u01-001..010.jpg` against a 12-card unit → 10 matched, 0 unmatched, 2 missing.
- Add an extra `cover.png` → appears under Unmatched.
- Re-run same ZIP → uploads succeed (upsert), URLs updated, no duplicates in storage.
- Confirm `arabic_text`, `audio_url`, `published`, and `flashcard_progress` rows are unchanged.
