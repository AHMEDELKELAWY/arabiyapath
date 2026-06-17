## Goal
When the user clicks "Continue" on the Flash Cards card in the Dashboard, send them to the Flash Cards overview page (`/flashcards`) that lists all units, instead of dropping them straight into a single unit's study screen.

## Change
File: `src/pages/Dashboard.tsx` (lines ~244–257)

Replace the resume-into-study logic for the flashcards `ProductCard` with a fixed link to the units overview:

```ts
const continueHref = "/flashcards";
```

Remove the now-unused `accessibleIncomplete` / `resumeUnit` / `targetUnit` computation and the `useFlashcardsResumeSlug` import + call if nothing else uses them (a quick grep confirms it's only used here).

## Result
Dashboard → Flash Cards card → **Continue** → `/flashcards` (units overview showing all unlocked + locked units). The user then picks the unit they want to study.

## Acceptance
- Click Continue on Flash Cards card → lands on `/flashcards` showing the full unit list (In The Classroom, On The Road, …).
- No automatic redirect to `/flashcards/study/...`.
- Other dashboard behavior (progress %, streak, stats) unchanged.
