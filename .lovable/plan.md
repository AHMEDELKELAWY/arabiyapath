# Dashboard Overview → "My Learning" Hub

Reorganize only the dashboard Overview navigation hierarchy. No backend, schema, route, progress, purchase, or flashcard logic changes.

## New hierarchy

```
Overview (/dashboard)        → list of OWNED products only
   └── Product card click    → existing product page
        ├── Gulf Arabic      → /learn/dialect/<gulfDialectId>   (Level 2: existing level cards)
        │     └── Level      → /learn/level/:levelId            (Level 3: existing unit list)
        │           └── Unit → /learn/unit/:unitId              (existing lessons)
        ├── MSA Fusha        → /learn/dialect/<fushaDialectId>  (same flow)
        └── Flash Cards      → /flashcards                      (existing units hub)
```

All target pages already exist. No new routes, no duplicate pages.

## Scope of changes (frontend only, `src/pages/Dashboard.tsx` + 1 new card component)

### 1. `src/pages/Dashboard.tsx` — Overview rewrite
- Keep header ("Welcome, {firstName}"), `ContinueLearningCard`, `RecentActivityList`, `QuizResultsList`, `CertificatesList`, "Explore Other Dialects", and free-user empty state — unchanged.
- Replace the current "Your Course" section (which renders `LevelProgressCard`s + `LockedLevelCard`s per dialect) with a **single "My Learning" product grid** that lists one card per owned product:
  - **Language course products**: derive from `ownedDialects` (already computed via `useDashboardData` + `hasLevelAccess`). One card per owned dialect.
  - **Flash Cards product**: derive from `useFlashcardsDashboard()` — show the card when `summary.purchases.some(p => p.status === "active")` is true.
- Remove the inline `FlashcardsDashboardSection` from the paid view (its stats + per-unit progress remain available inside the Flash Cards product page at `/flashcards`). Free-user view keeps the existing `FlashcardsDashboardSection` as an upsell (unchanged).
- `LockedLevelCard` and per-level grids are removed from Overview; locked levels are surfaced inside the existing `/learn/dialect/:dialectId` page (no change there).

### 2. New `src/components/dashboard/ProductCard.tsx`
Generic card used by the Overview grid. Props:
```
{ name, icon/emoji, progressPercent, unitsLabel ("12 units"),
  lastActivityLabel ("Last: <unit title> · 2d ago" | "Not started yet"),
  continueHref }
```
Renders: title row, `Progress` bar, meta row, `Continue` button (`asChild` `<Link>`) — and the whole card is also a `<Link>` to `continueHref` (CTA requirements memory: React Router links, no fake buttons).

### 3. Per-product data mapping (computed in `Dashboard.tsx` from existing hooks — no new queries)

**Gulf Arabic / MSA Fusha cards (one per owned dialect in `ownedDialects`):**
- `progressPercent` = weighted avg across that dialect's levels: `sum(completedLessons) / sum(totalLessons)`.
- `unitsLabel` = `sum(totalUnits)` across the dialect's levels → "N units".
- `lastActivityLabel` = most recent `recentActivity` entry whose `dialectId` matches, else "Not started yet".
- `continueHref` = `/learn/dialect/${dialectId}` (existing DialectOverview shows the Beginner/Intermediate/Advanced level cards = Level 2 per spec).

**Flash Cards card (only if active flashcard purchase exists):**
- `progressPercent` = `summary.total_mastered / sum(units.total)` (0 if denominator 0).
- `unitsLabel` = `summary.units.length` → "N units".
- `lastActivityLabel` = `summary.streak?.last_active_date` → "Last studied <relative>", else "Not started yet".
- `continueHref` = `/flashcards`.

### 4. Empty / free-user state
Unchanged: if no owned language dialects AND no active flashcard pack, render the existing "Start Your Arabic Journey" empty card + `FlashcardsDashboardSection` upsell as today.

## Explicitly unchanged
- All routes in `App.tsx`.
- `useDashboardData`, `useFlashcardsDashboard`, `usePurchases`, access-control logic, RLS, RPCs.
- `DashboardLayout` sidebar (Overview / Progress / Account links stay).
- `LessonPlayer`, `UnitOverview`, `LevelOverview`, `DialectOverview`, `/flashcards*` pages.
- Purchases, PayPal, enrollments, flashcard SRS, `fc_*` RPCs.
- Existing components `LevelProgressCard`, `LockedLevelCard`, `FlashcardsDashboardSection` remain in the codebase (still used by free-user view).
