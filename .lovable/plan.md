## Problem

For user `40e9c254...`, the database shows:

| Unit | reviewed | mastered |
|---|---|---|
| In The Classroom | 11 | 1 |
| On The Road | 10 | 2 |
| Market & Food | 13 | 0 |

But the UI shows `1/11`, `2/10`, `0/13` — exactly the `mastered` values, not `reviewed`. So the dashboard is reading from a stale cache and falling back to `mastered` (or rendering an older bundle).

The RPC `fc_dashboard_summary` already returns `reviewed` correctly, and `FlashCardStudy` already calls `qc.invalidateQueries({ queryKey: ["fc-dashboard"] })` after each review. The display components already use `u.reviewed ?? u.mastered ?? 0`. So the fix needs to guarantee the dashboard always loads fresh data after a study session.

## Plan

1. **Force fresh dashboard data on every mount/focus** — in `src/hooks/useFlashcardsDashboard.ts`:
   - Add `refetchOnMount: 'always'` and `refetchOnWindowFocus: true` to `useFlashcardsDashboard`.
   - Set `staleTime: 0` so navigating back from a study session always pulls fresh counts.

2. **Invalidate on FlashCardStudy unmount too** — in `src/pages/flashcards/FlashCardStudy.tsx`:
   - On component unmount (cleanup of a `useEffect`), call `qc.invalidateQueries({ queryKey: ["fc-dashboard"] })` and `["fc-resume-slug"]`. This guarantees that leaving the study page (Back button, navigating to Dashboard/Progress) busts the cache even if the last review's invalidation hasn't propagated.

3. **Defensive: prefer `reviewed` and never silently fall back to `mastered` when the field is present but `0`** — current code uses `u.reviewed ?? u.mastered ?? 0`, which is correct (`??` keeps `0`). Leave as-is, but add a small runtime guard logging when `u.reviewed === undefined` so we can detect a stale schema-cached client returning the old shape.

4. **Verify** — after the changes:
   - Open Progress → expect Market & Food `13/13`, On The Road `10/10`, In The Classroom `11/11`, header `34/34 cards · 3/3 units`, Mastered stat still `3`.
   - Open `/dashboard` Flash Cards section → expect the same per-unit reviewed counts and `Units completed 3/3`.

## Technical notes

- No DB or RPC changes required — the `reviewed` field is already returned.
- No changes to SRS/mastery logic — Mastered (`3`) stays a separate, SRS-driven counter.
- Files touched: `src/hooks/useFlashcardsDashboard.ts`, `src/pages/flashcards/FlashCardStudy.tsx`.
