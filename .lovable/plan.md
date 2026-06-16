# Fix: Admin role lookup blocked by missing GRANTs

## Root cause

`public.user_roles` has **no privileges granted** to the `authenticated` Postgres role. PostgREST (the Supabase Data API) refuses the request before RLS runs, so `AuthContext.fetchProfile()` always receives `null` and sets `isAdmin = false`. Every admin — including `elkelawy3@gmail.com`, who is verified as `admin` in the table — is treated as a learner and bounced from `/admin` to `/dashboard`.

The earlier `AdminRoute.tsx` and `Login.tsx` redirect fixes are correct and stay in place — they were never the cause.

## Fix

One small migration that **only adds GRANT statements**. No data, roles, policies, products, lessons, or purchases are modified.

```sql
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL    ON public.user_roles TO service_role;
```

Rationale:
- `authenticated` needs `SELECT` so the existing RLS policy `Users can view their own roles` (and `Admins can view all user_roles`) can be evaluated. No `INSERT/UPDATE/DELETE` granted — admins manage roles via service role / edge functions.
- `service_role` gets full access (standard pattern for tables touched by edge functions / admin code).
- `anon` is intentionally NOT granted — roles are auth-only.

## End-to-end verification (after migration)

I will:

1. Reload `/admin` in the preview as the logged-in admin account.
2. Confirm the AdminLayout sidebar appears (not the Learner sidebar).
3. Visit each of: `/admin`, `/admin/content`, `/admin/products`, `/admin/users`, `/admin/affiliates`, `/admin/affiliate-applications`, `/admin/coupons`, `/admin/purchases`, `/admin/certificates`.
4. For each route, screenshot and confirm: no redirect loop, AdminLayout renders, data loads, no console errors.
5. Verify deep-link case: open `/admin/products` while logged out → redirected to `/login?redirect=%2Fadmin%2Fproducts` → after login, lands back on `/admin/products`.
6. Verify learner case: a learner account still lands on `/dashboard` after login.
7. Confirm via DB snapshot that no rows in `user_roles`, `profiles`, `products`, `purchases`, `lessons`, `units`, or `enrollments` changed.

## Deliverables

- Migration file (GRANTs only).
- Screenshots of all 9 admin routes.
- Files-changed list (just the migration; `AdminRoute.tsx` and `Login.tsx` were fixed previously).
- Confirmation that admin experience matches the pre-Flashcards behavior.

## What is NOT changed

- No code changes to `AdminRoute.tsx`, `Login.tsx`, `AuthContext.tsx`, or any page.
- No changes to roles, RLS policies, or any other table.
- No data writes of any kind.
