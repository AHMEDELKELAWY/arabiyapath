## Goal

Reorganize "In the Classroom" on `/flashcards/unit/:slug` into a 4-tab structure — **Learn / Listening / Speaking / Test Yourself** — using only the cards already in the database. No schema, RLS, access, payments, dashboard, progress, or SRS changes.

## Card classification (shared helper)

`src/lib/cardClassify.ts`

```ts
export const stripTashkeel = (s: string) =>
  s.replace(/[\u064B-\u065F\u0670]/g, "");

export const isWord = (s: string) =>
  stripTashkeel(s ?? "").trim().split(/\s+/).filter(Boolean).length === 1;

export const isVocab = (c: { arabic_text: string; example_arabic: string | null }) =>
  !c.example_arabic && isWord(c.arabic_text);

export const isSentence = (c: { arabic_text: string; example_arabic: string | null }) =>
  !isVocab(c);

export function splitCards<T extends { arabic_text: string; example_arabic: string | null }>(cards: T[]) {
  return {
    vocab: cards.filter(isVocab),
    sentences: cards.filter(isSentence),
  };
}
```

Sentence cards expose `sentenceText = example_arabic ?? arabic_text` and `sentenceAudio = audio_example_url ?? audio_url` (so we always reach for the sentence variant when present, while gracefully falling back).

## Tab 1 — Learn (`LearnVocabBrowser.tsx`)

- Fetch all published cards for `unitId`, order by `order_index`, keep only `isVocab` cards.
- Render a Prev/Next browser. For every consecutive pair `[A, B]` insert a synthetic third slide `A + B` after them:
  - Sequence becomes `A`, `B`, `A+B`, `C`, `D`, `C+D`, …
  - Odd trailing card: shown alone, no combined slide.
- Slide content:
  - Single card: image + fully-vowelized Arabic word + native audio button (reuse `FlashCardAudio`).
  - Combined slide: shows only image (use card A's image as placeholder) + `${A.arabic_text} وَ${B.arabic_text}`, **no audio** (per spec: do not auto-merge audio). Note: image and audio for the combined slide are intentionally minimal — you'll author proper assets later via admin.
- No quiz, no score, no rating buttons.

## Tab 2 — Listening (`ListeningQuiz.tsx`)

- Fetch unit cards, keep `isSentence` ones with a usable `sentenceAudio` AND `image_url`.
- For each prompt: shuffle and pick 1 correct + 2 random distractors (by `image_url`) from the **same unit's sentence pool**. Never cross units.
- UI: big Play button for sentence audio → 3 image tiles → click to answer.
  - Correct → green ring + ✓ + auto-advance after 800ms, `score++`.
  - Wrong → red ring + ✗, "Try again" button re-enables choices (no score increment on retry).
- Header shows "Question X of N • Score: S".
- At end: summary card with `score/total` and "Restart" button. Score is local state only — not persisted.
- Empty/insufficient pool (<3 sentence cards with images): friendly placeholder card.

## Tab 3 — Speaking (no behavior change)

- Keep `<SpeakingPractice unitId={unit.id} />` exactly as-is — it already renders image + sentence + native audio + record + replay + transcription scoring.
- Keep the "Or run a spaced-repetition session" ghost button untouched.
- Keep current locked-state card untouched.
- (No file changes here beyond what `FlashCardUnit.tsx` already does.)

## Tab 4 — Test Yourself (`TestYourselfQuiz.tsx`)

- Fetch unit cards once; precompute `vocab`, `sentences`, image pool.
- Generate exactly **10 questions**, randomly drawn from these generators (skip a generator if its prerequisites aren't met, then fill from the others; if total still < 10, use as many as possible and show a notice):
  1. **Listen → image** (sentence): play sentence audio, pick 1 of 3 images.
  2. **Sentence → image**: show Arabic sentence, pick 1 of 3 images.
  3. **Choose correct word** (vocab): show image, pick 1 of 3 Arabic words.
  4. **Arrange words into sentence**: take a sentence ≥3 words, shuffle word chips, user taps chips in order; check on Submit.
  5. **MCQ comprehension**: show Arabic sentence, pick 1 of 3 English translations (using `english_translation` / `example_english`).
- All distractors come from the **same unit** only.
- Per-question feedback: ✓/✗ inline; user clicks "Next".
- Progress bar `i/10`, running score hidden until end.
- Final screen: `Score: X / 10`, `Percentage: P%`, `Passed` (≥70%) or `Try again` badge, plus a "Restart quiz" button. Result is local state only — not persisted.
- Empty/insufficient unit: placeholder card.

## `FlashCardUnit.tsx` edits

- Import `LearnVocabBrowser`, `ListeningQuiz`, `TestYourselfQuiz`. Drop `LearningBrowser` and `ListeningPlayer` imports (files remain in repo, not deleted).
- `<Tabs defaultValue="learn">` (was `speaking`).
- Rename first trigger: `value="learn"`, label **"Learn"**.
- Tab content wiring (only when `canStudy`):
  - `learn` → `<LearnVocabBrowser unitId={unit.id} />`
  - `listening` → `<ListeningQuiz unitId={unit.id} />`
  - `speaking` → unchanged (`<SpeakingPractice>` + SRS button)
  - `test` → `<TestYourselfQuiz unitId={unit.id} />`
- All four locked-state cards (`Unlock Full Pack`) kept verbatim, only the Learn one's heading reads "Learn".

## Files

**Create**
- `src/lib/cardClassify.ts`
- `src/components/flashcards/msa/LearnVocabBrowser.tsx`
- `src/components/flashcards/msa/ListeningQuiz.tsx`
- `src/components/flashcards/msa/TestYourselfQuiz.tsx`

**Edit**
- `src/pages/flashcards/FlashCardUnit.tsx`

**Untouched**
- `LearningBrowser.tsx`, `ListeningPlayer.tsx`, `SpeakingPractice.tsx`, `FlashCardStudy.tsx`, `transcribe-speech` edge function, all DB/RLS/payments/progress code, dashboard routing.

## Out of scope

- DB schema, RLS, grants, migrations.
- Persisting Listening/Test scores.
- New admin UI for authoring quiz items (auto-generated from cards as you confirmed).
- Auto-merging audio for combined Learn slides — you'll upload combined assets manually later.
