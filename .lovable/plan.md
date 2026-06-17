## Goal

Clicking a course card on the Overview should open the **existing course dashboard** (the one with Beginner / Intermediate / Advanced cards showing progress bars, lesson counts, unit counts, and Continue buttons), then drill down: Level → Units → Lessons.

Today, the Overview ProductCard already routes to `/learn/dialect/:dialectId` (DialectOverview), so the route is correct. But that page currently renders **simplified** level cards (icon + name + chevron) instead of the rich "old dashboard" cards. The fix is to swap the level-list rendering on DialectOverview to use the existing `LevelProgressCard` component (which already shows progress %, completed/total lessons, completed/total units, and a Continue button to `/learn/level/:levelId`).

No new pages. No new routes. No backend/progress/purchase logic changes.

## Changes

### 1. `src/pages/learn/DialectOverview.tsx`
- Replace the current inline `<Card>` per level (lines ~140–175) with the existing `LevelProgressCard` from `src/components/dashboard/LevelProgressCard.tsx`.
- Source per-level progress from the existing `useDashboardData()` hook (`levelsByDialect`), filtered to the current `dialectId`. This is the same data already powering the Dashboard, so no new queries.
- Access for each level uses the existing `hasLevelAccess(levelId, dialectId)` from `useDashboardData` (matches what the dashboard does today). Locked levels keep the existing lock overlay built into `LevelProgressCard`.
- Keep the existing hero, SEO, PageNav breadcrumb, and Gulf redirect logic untouched.
- Keep the "Choose Your Level" heading.

### 2. `src/components/dashboard/ProductCard.tsx`
- Make the entire card clickable (not just the title and the Continue button).
- Wrap the card body in a single `<Link to={continueHref}>` so any click on the card navigates to the course dashboard. Keep the inner Continue button for clarity (use a nested `<span>`/`<div>` styled as a button instead of a nested `<Link>` to avoid invalid nested anchors), or keep the button as a visual element with `pointer-events-none` since the wrapper link handles navigation.
- Preserve current visuals (emoji, name, units label, progress bar, last activity, Continue affordance).

## Resulting navigation

```
Dashboard (Overview)
  └── click course card  ─────►  /learn/dialect/:dialectId   (existing course dashboard, old design)
                                   ├── Beginner card    ──► /learn/level/:id
                                   ├── Intermediate card──► /learn/level/:id
                                   └── Advanced card    ──► /learn/level/:id
                                                              └── Unit  ──► Lessons
```

## What is NOT touched

- Routes, route params, and route structure.
- Database schema, RLS, purchases, enrollments, progress calculations, flashcard logic, lesson logic, quizzes, payments.
- Hero, SEO, breadcrumbs, Gulf sales-page redirect on DialectOverview.
- LevelOverview, UnitOverview, LessonPlayer.
- The "Resume Learning" hero on Dashboard (it still deep-links to the last lesson, which is the expected resume behavior).
