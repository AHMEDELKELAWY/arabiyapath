## Problem
"Log Out" / "Sign Out" buttons in the Dashboard, Admin, Affiliate sidebars and Navbar do not log the user out reliably. Root causes:

1. `AuthContext.signOut()` calls `supabase.auth.signOut()` with no `try/catch`. If the session is already missing/expired (`AuthSessionMissingError`), it throws and local state (`user`, `session`, `profile`, `isAdmin`) is never cleared, so the UI keeps showing the user as logged in.
2. After sign-out, most call sites (`DashboardLayout`, `AdminLayout`, `AffiliateLayout`, `Navbar`) do not navigate. The user stays on a protected page and only `ProtectedRoute` would redirect — but only if state actually flipped (see #1).
3. `signOut` only clears `profile`, not `user`/`session`/`isAdmin`, leaving stale auth state if the listener doesn't fire.

## Fix

### `src/contexts/AuthContext.tsx`
Make `signOut` bulletproof:
- Wrap `supabase.auth.signOut({ scope: 'local' })` in `try/catch` (ignore `AuthSessionMissingError`).
- Always clear `user`, `session`, `profile`, `isAdmin` after the call.
- Clear any stale Supabase tokens from `localStorage` (`sb-*-auth-token`) as a safety net.

### Sign-out call sites — navigate to `/` after sign-out
- `src/components/dashboard/DashboardLayout.tsx` — `handleSignOut` should `await signOut()` then `navigate("/")`.
- `src/components/admin/AdminLayout.tsx` — wrap `signOut` in a handler that navigates to `/`.
- `src/components/affiliate/AffiliateLayout.tsx` — same.
- `src/components/layout/Navbar.tsx` — same for the mobile menu Sign Out button.

`DashboardAccount.tsx` already navigates and will keep working.

## Acceptance
- Clicking "Log Out" from the Dashboard sidebar (desktop & mobile), Admin sidebar, Affiliate sidebar, Navbar, or Account page signs the user out and redirects to `/`.
- Works even when the Supabase session is already expired (no silent failure).
- Re-visiting any protected route afterwards redirects to `/login`.
