## Storage Path Improvement for Flash Card Images

Switch all newly uploaded flash card images from `content/flashcards/images/<unit-id>/...` to `content/flashcards/images/<unit-slug>/...`. No DB changes, no migrations, no edits to existing image URLs.

### Scope
Only two upload paths write to the `content` bucket today:
- `BulkImageUploadDialog.tsx` (Bulk Image Upload)
- `CardRow.tsx` → "Replace Image" (per-card)

The "Generate Image" edge function (`generate-flashcard-image`) writes to a different bucket (`lesson-images`, path `flashcards/<cardId>.png`) and is out of scope per the request (no DB/edge changes).

### Current state
- `AdminFlashcardCards.tsx` already resolves the unit slug from the loaded units list and passes it as `unitSlug` to `BulkImageUploadDialog` and as `unitFolder` to `CardRow`.
- `BulkImageUploadDialog` uses `folder = unitSlug || unitId` — it can still silently fall back to the UUID if slug is missing.
- `AdminFlashcardCards.tsx` resolves `unitSlug` with a UUID fallback: `find(...)?.slug || unitId`.

### Changes

1. `src/pages/admin/AdminFlashcardCards.tsx`
   - Compute `unitSlug` as the unit's `slug` only (no UUID fallback).
   - Gate the "Bulk Image Upload" button and the per-card "Replace Image" UI behavior so they only operate when `unitSlug` is present. If slug is missing, disable the action and show a toast: "This unit has no slug — set one before uploading images." (Pure UI guard, no schema change.)

2. `src/components/admin/flashcards/BulkImageUploadDialog.tsx`
   - Require `unitSlug` (drop `unitId` fallback for the upload folder).
   - Build path strictly as: `flashcards/images/${unitSlug}/${file.name}`.

3. `src/components/admin/flashcards/CardRow.tsx`
   - Keep accepting `unitFolder` but treat it as the slug. Path stays: `flashcards/images/${unitFolder}/${file.name}`.
   - No behavior change beyond the parent passing the slug only.

### Out of scope (explicitly unchanged)
- `flashcards` table, all `flashcard_*` tables, RLS, RPCs, edge functions, PayPal, products, packs, sales.
- Existing `image_url` values in the DB — left as-is. Old Unit 1 images keep loading from their current UUID-folder paths.
- `generate-flashcard-image` edge function (different bucket, not part of this request).

### Verification
- Upload a new image to a unit whose slug is `in-the-classroom` → object lands at `content/flashcards/images/in-the-classroom/<filename>`.
- Old Unit 1 images still render (URLs in DB unchanged).
- A unit without a slug cannot upload — button disabled with a clear message.
