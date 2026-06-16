# Study Mode UX Redesign — Image-First Flow

Scope: UI/UX only. Single file edit: `src/pages/flashcards/FlashCardStudy.tsx`. No DB, RPC, SRS, payments, or access-control changes.

## New Card Flow

**Stage 1 — Discover (before reveal)**
- Progress indicator: `Card 3 of 50`
- Large card image (`FlashCardImage`)
- `Play Audio` button (uses existing `FlashCardAudio` with `autoPlay` so it plays once on open, and the same button serves as replay)
- `Reveal Meaning` button (primary, full width)
- Hidden: Arabic text, transliteration, English, examples, rating buttons

**Stage 2 — Reveal (after clicking Reveal Meaning)**
Card expands in place, in this exact order:
1. Image (stays)
2. Play Audio (stays)
3. Arabic text (RTL, large)
4. Transliteration (italic muted)
5. English translation
6. Example block (Arabic + English + example audio replay if present)
7. Two assessment buttons:
   - `✅ I Knew It` (primary/success styling)
   - `❌ I Didn't Know It` (destructive/outline styling)

## SRS Mapping (internal, hidden from learner)

In the existing `rate()` function call to `fc_apply_review`:
- `I Knew It` → `_rating: "good"`
- `I Didn't Know It` → `_rating: "again"`

No changes to `fc_apply_review`, `sm2.ts`, scheduling, or queue logic. `hard` and `easy` simply aren't exposed in the UI.

## Behavior

- On submitting an assessment: same logic as today — advance to next card, invalidate dashboard, show "Session complete!" toast on last card, fire `flashcard_unit_complete` analytics event.
- `flashcard_study_start` event unchanged.
- Auto-reset on card change: `revealed=false`, audio re-autoplays for the new card (existing `FlashCardAudio` already re-arms on `src` change).
- Sign-in gate, loading states, empty state, exit link — unchanged.
- Replace current "Show answer" + 4-button grid (`Again/Hard/Good/Easy`) with the new two-stage layout.

## Files Changed

- `src/pages/flashcards/FlashCardStudy.tsx` — only file edited.

## Explicitly Untouched

- `flashcards`, `flashcard_units`, `flashcard_progress`, `flashcard_review_log`, `flashcard_streaks` tables
- `fc_apply_review`, `fc_user_can_study_unit`, `fc_user_has_pack_access`, `fc_dashboard_summary` RPCs
- `src/lib/srs/sm2.ts`, payment provider code, PayPal functions, `accessControl.ts`, `flashcardAccess.ts`
- `FlashCardImage`, `FlashCardAudio`, `Watermark` components
- All admin pages and other flashcard public pages (`FlashCardsHome`, `FlashCardUnit`, `FlashCardPack`)
