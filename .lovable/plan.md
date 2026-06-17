## Goal
Play the same click/transition sound used in lessons whenever the user taps a flash card to flip it.

## Sound to reuse
`useSoundEffects().playSound('lessonTransition')` — already used in `LessonPlayer.tsx` for between-step taps. File: `/sounds/lesson-transition.mp3`.

## Changes
1. `src/pages/flashcards/FlashCardStudy.tsx` (MSA study screen)
   - Import `useSoundEffects`.
   - On the flip `onClick` (line 277), call `playSound('lessonTransition')` before toggling `flipped`.

2. `src/components/flashcards/FlashCard.tsx` (Gulf trial flash card)
   - Import `useSoundEffects`.
   - In `handleFlip`, call `playSound('lessonTransition')` before `setIsFlipped`.

No new assets needed — reusing the existing `lesson-transition.mp3` keeps audio consistent with the rest of the courses.

## Acceptance
- Tap a flash card on `/flashcards/study/:slug` → hear the same transition sound used in lessons.
- Tap the Gulf free-trial flash cards → same sound.
- No sound on secondary controls (audio replay button, rating buttons) — only the flip tap.
