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