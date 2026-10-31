-- Seeded #1: optional mobile number captured at signup. Nullable; never required. PII — the Privacy
-- Policy is updated in the same change to reflect optional phone collection (legal review pending).
-- NOTE: drafted to match repo conventions; verify with `prisma migrate` before merge.
ALTER TABLE "users" ADD COLUMN "phone" TEXT;
