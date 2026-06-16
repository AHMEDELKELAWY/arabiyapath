---
name: has_role EXECUTE grant required
description: public.has_role(uuid, app_role) must remain EXECUTABLE by authenticated (and anon); revoking it breaks every RLS policy that calls it
type: constraint
---

`public.has_role(uuid, public.app_role)` is referenced by RLS policies across many tables (user_roles, profiles, purchases, certificates, affiliates, etc.). It is SECURITY DEFINER, but PostgREST still requires the caller to hold EXECUTE.

**Never revoke EXECUTE on `has_role` from `authenticated` or `anon`** to "fix" the Supabase linter warning `0028 / 0029 SECURITY DEFINER function executable`. Doing so causes 403 `permission denied for function has_role` on every authenticated query that touches a RLS policy referencing it — including the AuthContext role lookup, which makes every admin appear as a learner.

Required grant (in every fresh project or after rebuilds):
```sql
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon;
```

The linter warnings for `has_role` are expected and must be ignored. If lint compliance is required for other SECURITY DEFINER helpers, only revoke EXECUTE from functions that are NOT referenced by any RLS policy.

**Why:** RLS policies execute as the caller's role, and Postgres checks EXECUTE on functions invoked from within policy expressions.
