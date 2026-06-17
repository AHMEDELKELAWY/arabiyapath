## Verified live values

Current authenticated user observed in browser/API calls:

- `auth.uid()` / JWT subject: `40e9c254-fa78-4774-9e9d-85e5bbadc748`
- Published pack: `msa-flashcards-pack` / `ddbbcb57-8996-44bb-83d2-d5f476d5724c`
- `fc_user_has_pack_access(user, pack)`: `true`
- `flashcard_pack_units`: `0 rows`
- Unit results:
  - `In-The-Classroom` / `4df9fbde-2bea-475b-91fa-cea4e589ee38`: `is_free=true`, RPC response `fc_user_can_study_unit=true`
  - `on-the-road` / `1e12e126-90f5-4bec-b2c8-26afbe115b0b`: `is_free=false`, RPC response `fc_user_can_study_unit=false`
- `FlashCardsHome.tsx` currently renders:
  - `Start studying` when `unitUnlocked(unit.id, unit.is_free)` is `true`
  - `Unlock pack` when `unitUnlocked(...)` is `false` and `ownedPacksQuery` is no longer loading

## Root causes

1. **Backend entitlement mismatch**
   - Ownership exists and pack access is true.
   - But there are no rows in `flashcard_pack_units`, so `fc_user_can_study_unit()` cannot associate `On The Road` with the purchased pack and returns `false`.
   - The dashboard still shows units because `fc_dashboard_summary()` lists published units, not because `On The Road` has unit-level access.

2. **Home page race/flicker**
   - `FlashCardsHome.tsx` initially logs/renders before pack ownership resolves, so `On The Road` can show `Unlock pack` until `ownedPacksQuery` returns true.
   - The production complaint matches this render condition: `ownedPacksQuery` not ready + premium unit = `Unlock pack`.

3. **Exit source is ignored**
   - `FlashCardStudy.tsx` hardcodes `const exitHref = "/flashcards"`.
   - Even when the URL is `/flashcards/study/In-The-Classroom?from=dashboard`, the `from` query param is never read, so Exit always returns to `/flashcards`.

## Fix plan

1. **Fix the single source of truth for study access**
   - Update `FlashCardsHome.tsx` to use the per-unit RPC result (`fc_user_can_study_unit`) as the primary rendered entitlement once loaded.
   - Keep pack ownership only as secondary context, not the condition that decides each unit’s final lock state.
   - For authenticated users, do not render `Unlock pack` for premium units until both entitlement queries have finished.

2. **Fix the backend unit entitlement logic**
   - Add a database migration to make `fc_user_can_study_unit()` treat an active owned flashcard pack as access when no explicit pack-unit mapping rows exist.
   - This aligns it with the current real data state: the user owns the pack, but `flashcard_pack_units` is empty.
   - No purchase records will be changed.

3. **Fix the Exit return source**
   - Update `FlashCardStudy.tsx` to read `from` via `useSearchParams()`.
   - If `from=dashboard`, set `exitHref` to `/dashboard`.
   - Otherwise keep `/flashcards` for home/sales/default entry paths.
   - Update the completion screen “Back to Flash Cards” button to use the same computed exit target.

4. **Fix dashboard flashcard links consistently**
   - Ensure all dashboard-origin study links include `?from=dashboard`, including:
     - main Dashboard Flash Cards Continue card
     - Dashboard progress Flash Cards Continue button
     - unit links inside dashboard flashcard progress sections

5. **Validate before claiming fixed**
   - Re-open `/flashcards` as the current user and verify both unit cards show `Start studying`.
   - Navigate Dashboard → Flash Cards Continue → Study → Exit and verify the final URL is `/dashboard`.
   - Re-check the RPC/network responses for pack access and unit access after the migration.