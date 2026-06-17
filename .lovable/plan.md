# Plan

## 1) Add Flash Cards as a third card in "Choose Your Path" (homepage)

**File:** `src/pages/Index.tsx` (Choose Your Path section, lines ~130–181)

- Change the grid from `md:grid-cols-2 max-w-4xl` to `md:grid-cols-2 lg:grid-cols-3 max-w-6xl` so three cards fit on desktop and stay 2-up on tablet / stacked on mobile.
- Add a third card with the same visual style (rounded, hover lift) below/alongside Gulf Arabic and MSA:
  - Icon: 🃏
  - Title: **Flash Cards**
  - Subtitle: "Memorize Arabic vocabulary with spaced repetition"
  - Buttons (same two-button pattern):
    - Primary: **Beginner Pack** → `/flashcards`
    - Secondary (gold/secondary): **Full Pack** with sub-line "Lifetime access to all units" → `/flashcards`
- No copy changes to the existing two cards.

## 2) Fix "completed units not counted" display

The completion math exists but isn't surfaced consistently. Two concrete fixes:

### a) Dashboard Flash Cards card (`src/pages/Dashboard.tsx`)
Currently shows `"{units.length} unit(s)"`. Change it to show **completed / total units**, where a unit is "completed" when `mastered === total && total > 0`:
```ts
const completedUnits = fcSummary.units.filter(u => u.total > 0 && u.mastered >= u.total).length;
const unitsLabel = `${completedUnits}/${fcSummary.units.length} units completed`;
```

### b) Flash Cards section in dashboard (`src/components/dashboard/FlashcardsDashboardSection.tsx`)
Add a 5th stat (or replace "Packs") showing **Units completed**: `{completedUnits}/{totalUnits}`.

### c) Progress page Flash Cards subtitle (`src/pages/DashboardProgress.tsx`, line ~221)
Append units-completed to the accordion subtitle:
```
{progressPercent}% · {mastered}/{totalCards} cards · {completedUnits}/{totalUnits} units
```

### d) Dialect completed-units (verification only)
`useDashboardData.ts` already computes `completedUnits` per level (lines 226–230) and `DashboardProgress.tsx` already displays `{lvl.completedUnits}/{lvl.totalUnits} units` (line 181). No logic change — verify it renders. If a dialect ProductCard on the dashboard should also show completed units, update its `unitsLabel` to `{completedUnits}/{totalUnits} units` (sum across levels in the dialect group).

## Out of scope
- No backend / SQL changes (the `fc_dashboard_summary` RPC already returns per-unit `mastered` and `total`).
- No changes to SRS logic or unit "completion" definition beyond "all cards mastered".
