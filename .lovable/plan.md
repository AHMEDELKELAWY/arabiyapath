## Goal

Switch to a single email-confirmation-link flow (Supabase native). Remove the custom 6-digit OTP entirely.

## Current state

- Supabase already sends its native confirmation link (auth logs show `user_confirmation_requested` + `/verify` 303). 
- On top of that, `Signup` and `BecomeAffiliate` invoke `send-verification-email`, which stores a 6-digit code in `profiles.verification_code` and emails it via Zoho SMTP.
- `ProtectedRoute` redirects any user with `profile.email_verified === false` to `/verify-email`, where `VerifyEmail.tsx` collects the OTP and calls `verify-email-code` to flip `email_verified = true`.
- Net effect: users get both a link and a code, and even after clicking the link they're forced into the OTP screen because our profile flag stays false.

## Target flow

Signup → Supabase confirmation email (link only) → user clicks link → Supabase confirms account + creates session → app redirects to intended course/redirect target.

## Changes

### 1. Use Supabase's link as the single source of truth
`src/contexts/AuthContext.tsx` — `signUp`: accept an optional `redirectPath`, pass `emailRedirectTo: ${window.location.origin}/auth/callback?redirect=<path>` so the confirm link lands users in the right place with a session.

Add a lightweight `src/pages/AuthCallback.tsx` that:
- Lets Supabase parse the URL tokens (already automatic via `detectSessionInUrl`).
- Reads `redirect` query param and `navigate(redirect ?? "/dashboard")` once `user` is present.
- Shows a brief "Verifying…" state, plus an error state if the link is invalid/expired with a "Resend email" button calling `supabase.auth.resend({ type: 'signup', email })`.

Register the route in `src/App.tsx`: `/auth/callback`.

### 2. Stop relying on the custom `email_verified` flag
`src/components/auth/ProtectedRoute.tsx` — remove the `/verify-email` redirect. Trust Supabase: if `user` exists, they're confirmed (unconfirmed users can't get a session in the first place because auto-confirm stays off).

`src/contexts/AuthContext.tsx` — drop `email_verified` from the `Profile` interface usage in gating (keep the column for now, just don't read it for access).

### 3. Remove OTP UI and signup wiring
- Delete `src/pages/VerifyEmail.tsx`.
- Remove the `/verify-email` route and the `VerifyEmail` lazy import from `src/App.tsx`.
- `src/pages/Signup.tsx`: remove the `send-verification-email` invocation; after `signUp` succeeds show an inline "Check your inbox to confirm your email" success card (with email shown + a "Resend confirmation" button that calls `supabase.auth.resend`). Do not navigate to `/verify-email`.
- `src/pages/BecomeAffiliate.tsx`: same treatment — remove the `send-verification-email` call and the `/verify-email` navigation; show the same "check your inbox" confirmation.
- Pass the chosen `redirect` target into `signUp` so it ends up in `emailRedirectTo`.

### 4. Remove backend OTP pieces
- Delete edge functions `supabase/functions/send-verification-email/` and `supabase/functions/verify-email-code/`.
- Remove their entries from `supabase/config.toml`.
- Migration: drop `profiles.verification_code` and `profiles.verification_code_expires_at` columns (no longer used). Leave `email_verified` column in place for historical data but stop reading it in gating logic.

### 5. Login UX polish
`src/pages/Login.tsx` (light touch): if `signInWithPassword` returns `email_not_confirmed`, show "Please confirm your email — check your inbox" with a "Resend confirmation email" button (`supabase.auth.resend`). No OTP fallback.

### 6. Supabase auth configuration
Confirm `auto_confirm_email = false` (default) so the native confirmation link remains required. No other auth setting changes.

## Out of scope

- Customizing the Supabase confirmation email template (current default link works). Branded auth-email templates can be added later via the managed auth-email-hook if desired — not needed to fix the duplicate-verification bug.
- Removing the `email_verified` column itself (kept as a nullable historical field).

## Files touched

- Edit: `src/contexts/AuthContext.tsx`, `src/components/auth/ProtectedRoute.tsx`, `src/App.tsx`, `src/pages/Signup.tsx`, `src/pages/BecomeAffiliate.tsx`, `src/pages/Login.tsx`, `supabase/config.toml`
- Create: `src/pages/AuthCallback.tsx`
- Delete: `src/pages/VerifyEmail.tsx`, `supabase/functions/send-verification-email/`, `supabase/functions/verify-email-code/`
- Migration: drop two OTP columns on `profiles`
