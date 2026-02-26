

## Plan: Add Student Name to Certificate View

### Problem
The certificate page works and PDF downloads correctly, but it doesn't show the student's name. The `certificates_public` view currently only exposes `id`, `cert_code`, `issued_at`, `level_id`, `dialect_id`, and `public_url` — no student name.

### Solution
Two changes:

#### 1. Database Migration: Update `certificates_public` view
Replace the existing view to join `certificates` with `profiles` and include `first_name` and `last_name`:

```sql
CREATE OR REPLACE VIEW certificates_public AS
SELECT
  c.id,
  c.cert_code,
  c.issued_at,
  c.level_id,
  c.dialect_id,
  c.public_url,
  p.first_name,
  p.last_name
FROM certificates c
JOIN profiles p ON p.user_id = c.user_id;
```

This keeps `user_id` hidden (privacy) while exposing just the name fields needed for display.

#### 2. Update `src/pages/CertificateView.tsx`
- Extract `first_name` and `last_name` from the query result
- Display the student's name on the certificate between "This certifies that" and the course name:
  ```
  This certifies that
  Ahmed Fawzy
  has completed
  Gulf Arabic — Beginner Level
  ```

### Files Changed
- **Database migration** — recreate `certificates_public` view with `first_name`, `last_name` from profiles join
- **`src/pages/CertificateView.tsx`** — display student name on the certificate card (appears in both the visual card and the downloaded PDF since the PDF captures the card element)

### Technical Details
- The view uses `JOIN` (not LEFT JOIN) since every certificate must have a corresponding profile
- No RLS changes needed — `certificates_public` is a view without RLS, and the base `profiles` table RLS doesn't apply because the view runs with the invoker's context (but since `certificates_public` doesn't have `security_invoker=on`, it runs as the view owner which has access)
- The student name will automatically appear in the PDF download since `html2canvas` captures the `certRef` div which will contain the name

