# Admin Flow Regression — Root Cause Report

Per your instruction, **nothing has been changed**. This is investigation only. The data layer (DB, roles, purchases) is intact — the regression is entirely in the **client routing / auth-redirect layer**.

## 1. What actually happens today

When you visit `/admin`:

1. `AdminRoute` renders.
2. While `AuthContext` is hydrating (`loading=true` or `user && isAdmin===null`), it shows a skeleton.
3. The moment hydration finishes:
   - If `!user` → `<Navigate to="/login" replace />` **with no `from` state and no `?redirect=/admin`**.
   - If `isAdmin===false` → redirect to `/dashboard`.

When you then submit the login form:

- `Login.tsx` reads only `searchParams.get("redirect") || "/dashboard"`.
- It does **not** read `location.state.from` (the React Router convention `ProtectedRoute` uses).
- So even if `AdminRoute` had passed `state={{ from: location }}`, `Login` would ignore it.
- After a successful sign-in, `navigate(redirectUrl)` → `/dashboard`.

Net effect: every direct visit to `/admin` while the session isn't already attached in the React tree gets bounced to `/login`, and the original `/admin` intent is lost. After login the user lands on the learner dashboard — exactly the symptom you reported.

## 2. Why this is a regression vs. June 15

The Flash Cards work on Jun 16 changed three things relevant to this flow:

### a. `src/contexts/AuthContext.tsx` — admin gating became stricter
Now exposes a tri-state `isAdmin: boolean | null` and only sets it inside an async `fetchProfile` that is deferred via `setTimeout(..., 0)` after `onAuthStateChange`. Before the Flash Cards refactor, admin status was resolved synchronously alongside the profile fetch and `AdminRoute` did not have the `isAdmin === null` "still determining" branch.

The new code itself is correct (it matches the stack-overflow guidance), but it depends on `AdminRoute` correctly preserving redirect intent — which it does not.

### b. `src/components/admin/AdminRoute.tsx` — redirect loses target
```tsx
if (!user) {
  return <Navigate to="/login" replace />;   // ← no state, no ?redirect
}
```
Compare with `src/components/auth/ProtectedRoute.tsx` (unchanged, still correct):
```tsx
return <Navigate to="/login" state={{ from: location }} replace />;
```
`AdminRoute` was edited during the Flash Cards pass and the redirect-preservation was dropped.

### c. `src/pages/Login.tsx` — only reads `?redirect=`, never `location.state.from`
```tsx
const redirectUrl = searchParams.get("redirect") || "/dashboard";
```
So even `ProtectedRoute`'s `state={{ from }}` is not honored — but `ProtectedRoute` was already covered because protected pages are typically reached via in-app links where `user` is already set, masking the bug. Admin users, however, often deep-link to `/admin`, which exposes it.

### d. `Dashboard.tsx` now mounts `<FlashcardsDashboardSection />`
That section calls `supabase.rpc("fc_dashboard_summary")`. This is **not** the cause of the redirect, but it does run a heavy query on every dashboard load. If `fc_dashboard_summary` errors for an account, React Query throws — does not affect routing, but worth knowing during the fix pass.

## 3. Files changed by the Jun 16 work that touch this flow

Routing / auth / admin / dashboard layout files modified on Jun 16:

```text
src/App.tsx                                   (added flashcard routes; admin route wiring unchanged)
src/contexts/AuthContext.tsx                  (tri-state isAdmin, deferred fetchProfile)
src/components/admin/AdminRoute.tsx           (new "isAdmin===null" gate; LOST redirect-preservation)
src/components/admin/AdminLayout.tsx          (added 4 flashcard sidebar entries; no auth logic change)
src/components/dashboard/DashboardLayout.tsx  (unchanged routing logic; still links to /admin for admins)
src/pages/Dashboard.tsx                       (mounted FlashcardsDashboardSection; no auth change)
src/pages/Login.tsx                           (unchanged — but already only honored ?redirect=, never state.from)
```

DB migrations on Jun 16 (`20260616123555_*.sql`, `20260616124955_*.sql`) do **not** touch `user_roles`, `profiles`, `has_role()`, or any RLS that would gate admin status. They only add flashcard tables and a `coupons.applies_to` column. So this is purely a frontend regression.

## 4. Root cause (one sentence)

`AdminRoute` was updated for the new tri-state `isAdmin` but its unauthenticated-redirect branch was changed to a bare `<Navigate to="/login" />` that drops the intended `/admin` target, and `Login.tsx` only honors `?redirect=`, never React Router state — so admins who deep-link to `/admin` are sent to the learner dashboard with no way back to their original destination.

## 5. Contributing (secondary) issues observed, not fixed

- `ProtectedRoute` passes `state.from` that `Login` never reads. Same class of bug, just less visible.
- There is no "admin defaults to /admin" behavior in `Login` post-sign-in — never has been, but combined with #4 it makes the regression more painful.
- `useFlashcardsDashboard` runs unconditionally on every dashboard mount; if the RPC fails the query just retries silently. Unrelated to the redirect but worth tightening.

## 6. Recommended fix (for your approval — NOT applied)

Smallest viable change, three files, no DB work:

1. **`src/components/admin/AdminRoute.tsx`** — when `!user`, redirect with the target preserved:
   ```tsx
   return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
   ```
   (and add `useLocation`).
2. **`src/pages/Login.tsx`** — also honor `location.state.from` as a fallback after `?redirect=`:
   ```tsx
   const fromState = (location.state as any)?.from?.pathname;
   const redirectUrl = searchParams.get("redirect") || fromState || "/dashboard";
   ```
3. **Optional, behavioral improvement** — in `Login`, after a successful sign-in, if `isAdmin === true` and no explicit redirect was requested, send the user to `/admin`. This restores the "admin lands on admin" default workflow you described.

No database changes, no migration, no role logic touched. Roughly 10 lines of code total.

## 7. What I need from you

Tell me which of these you want and I'll implement in build mode:

- **A.** Fix #1 + #2 only (preserve redirect intent — minimum to restore /admin deep links).
- **B.** A + #3 (also restore "admin lands on /admin by default after login").
- **C.** Hold — investigate further before any change.
