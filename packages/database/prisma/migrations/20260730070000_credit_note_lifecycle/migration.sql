ALTER TABLE "invoice_credit_notes"
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'draft',
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "approved_at" TIMESTAMPTZ(3),
ADD COLUMN "rejected_at" TIMESTAMPTZ(3),
ADD COLUMN "rejected_reason" TEXT,
ADD COLUMN "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "invoice_credit_notes"
SET "status" = 'issued'
WHERE "issued_at" IS NOT NULL;

ALTER TABLE "invoice_credit_notes"
ADD CONSTRAINT "invoice_credit_notes_status_check"
CHECK ("status" IN ('draft', 'approved', 'rejected', 'issued'));
