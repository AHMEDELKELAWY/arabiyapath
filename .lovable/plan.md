# Study Mode — True Flip Card Redesign

Single-file UI change to `src/pages/flashcards/FlashCardStudy.tsx`. No DB, SRS, access-control, payments, or admin changes.

## Card behavior

**Front (prompt):**
- Only the card image (via existing `FlashCardImage`, watermark preserved).
- Entire image is clickable — flips the card.
- No Arabic, English, transliteration, examples, audio button, or any other control on the front.
- Subtle "Tap to reveal" hint below the card (outside the flipping surface) for discoverability — can be omitted if you prefer zero text.

**Click interaction:**
- Smooth 3D flip animation (~500ms, ease-out) using CSS `transform: rotateY(180deg)` with `transform-style: preserve-3d` and `backface-visibility: hidden`. Same technique used in `src/components/flashcards/FlashCard.tsx`.

**Back (answer), in order:**
1. Arabic text — large, RTL, `lang="ar"`.
2. English translation.
3. Arabic audio auto-plays once on flip (existing `FlashCardAudio` with `autoPlay`).
4. Replay audio button (already provided by `FlashCardAudio`).
- Transliteration, example sentences, and example audio are NOT shown (per spec: back lists only Arabic, English, audio, replay).

## Assessment (below the card, always visible after flip)

- Two buttons only:
  - `❌ I Didn't Know It` → calls existing `rate(false)` → `_rating: "again"`
  - `✅ I Knew It` → calls existing `rate(true)` → `_rating: "good"`
- Disabled until the card has been flipped (prevents rating without seeing the answer).
- No Again / Hard / Good / Easy. No "Reveal Meaning" button.

## State & flow

- `flipped` boolean per card; resets to `false` on `idx` change (same pattern as current `revealed`).
- Advancing to next card, "Session complete!" toast, dashboard query invalidation, and `flashcard_study_start` / `flashcard_unit_complete` analytics — unchanged.
- Sign-in gate, loading state, empty state, header (`Card X of N`, Exit link), and SEO `noindex` — unchanged.

## Explicitly untouched

- `flashcards`, `flashcard_units`, `flashcard_progress`, `flashcard_review_log`, `flashcard_streaks`, and all RPCs (`fc_apply_review`, etc.).
- `src/lib/srs/sm2.ts`, `accessControl.ts`, `flashcardAccess.ts`, payments, PayPal.
- `FlashCardImage`, `FlashCardAudio`, `Watermark` components.
- All admin pages, `FlashCardPack`, `FlashCardUnit`, `FlashCardsHome`.

## Technical notes

- Flip container: fixed aspect ratio matching `FlashCardImage` (`aspect-[4/3]`) so front/back stack cleanly via `absolute inset-0`.
- Front face: `<button>` wrapping `FlashCardImage` for keyboard accessibility (Enter/Space to flip), `aria-label="Reveal answer"`.
- Back face: `rotate-y-180` initial; flip toggles container `rotate-y-180`.
- Audio autoplay key: pass a `key={current.id + (flipped ? "-b" : "-f")}` to `FlashCardAudio` on the back so it remounts and auto-plays each time the card is flipped open.
