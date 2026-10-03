-- Rename clinic display names.
-- Safe to run multiple times (idempotent upsert).
-- clinic_id values are permanent and never change.

INSERT INTO clinics (clinic_id, name, is_active, created_at)
VALUES
('clinic_a', 'Kodambakkam', true, NOW()),
('clinic_b', 'Mylapore', true, NOW())
ON CONFLICT (clinic_id) DO UPDATE
SET name = EXCLUDED.name,
is_active = true;

-- Verify
SELECT clinic_id, name FROM clinics ORDER BY clinic_id;
