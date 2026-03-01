

## Plan: Remove Flash Cards Page

Remove the Flash Cards page and all references to it from navigation and routing.

### Changes

1. **`src/App.tsx`** — Remove the `FlashCards` lazy import and the `/flash-cards` route

2. **`src/components/layout/Navbar.tsx`** — Remove "Flash Cards" from `mainNavLinks` array and remove both the desktop and mobile Flash Cards nav links

3. **Files to leave in place** (no harm, reduces risk):
   - `src/pages/FlashCards.tsx`
   - `src/components/flashcards/*`
   - `src/data/flashCardsData.ts`
   
   These become dead code but won't be bundled since nothing imports them after the route is removed.

### Result
The Flash Cards page will no longer be accessible from any navigation or URL. The route will hit the `NotFound` catch-all.

