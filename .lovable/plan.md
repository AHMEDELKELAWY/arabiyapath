

## Plan: Fix Certificate View Page (404)

### Problem
Clicking "View" on a certificate in the dashboard navigates to `/certificate/CERT-MKLKLUCC-BBJJ`, but no route or page exists for that path, resulting in a 404.

### Solution
Create a public certificate verification page and register it in the router.

### New File: `src/pages/CertificateView.tsx`

A public page (no auth required) that:
- Extracts `certCode` from the URL params
- Queries the `certificates_public` view by `cert_code`, joining `dialects(name)` and `levels(name)`
- Also fetches the certificate holder's name from `profiles` by joining through the `certificates` table (or via a separate query using `certificates_public` which excludes `user_id` for privacy -- we need to check if we can get the user's name)

Since `certificates_public` excludes `user_id`, we need to either:
- Query `certificates` directly (but RLS may block unauthenticated users)
- Or add the holder's name to the public view

**Approach**: Query `certificates_public` for cert details (dialect, level, issued date). For the holder's name, we'll create a small edge function or update the view. However, the simplest approach is to query `certificates` with the `cert_code` and join `profiles` -- but this requires the certificate to be publicly readable by cert_code.

**Simplest approach**: Query `certificates_public` for the basic info (dialect name, level name, issued date). The certificate page will show the course/level/date without the student's name (privacy-friendly), or we add profile first/last name to the public view.

Let me check RLS on certificates to decide.

**Decision**: Create the page using `certificates_public` view which is already set up for public access. Show dialect name, level name, issue date, and cert code. No student name needed for public verification (privacy).

### Page Design
```text
┌──────────────────────────────────────────┐
│              ArabiyaPath Logo            │
│                                          │
│         🎓 Certificate of Completion     │
│                                          │
│         This certifies completion of     │
│                                          │
│            Gulf Arabic                   │
│           Beginner Level                 │
│                                          │
│       Issued on January 19, 2026         │
│                                          │
│    Certificate Code: CERT-MKLKLUCC-BBJJ  │
│                                          │
│         ✓ Verified Certificate           │
└──────────────────────────────────────────┘
```

### Files Changed

1. **Create `src/pages/CertificateView.tsx`** -- Public certificate verification page that queries `certificates_public` by cert_code with joined dialect and level names. Uses the standard `Layout` (not FocusLayout) since it's a public-facing verification page. Shows loading/error/not-found states.

2. **Update `src/App.tsx`** -- Add route: `<Route path="/certificate/:certCode" element={<CertificateView />} />`

### Technical Details

- Uses `supabase.from("certificates_public").select("*, dialects(name), levels(name)").eq("cert_code", certCode).maybeSingle()` to fetch data
- No authentication required (public verification)
- Handles: loading spinner, "certificate not found" state, and successful display
- The `certificates_public` view already exists and strips `user_id` for privacy
- No database changes needed

