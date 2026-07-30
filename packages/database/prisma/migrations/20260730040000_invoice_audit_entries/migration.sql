-- Durable, organization-scoped invoice lifecycle audit evidence.

CREATE TABLE "invoice_audit_entries" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "invoice_id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "sequence" INTEGER NOT NULL,
  "action" TEXT NOT NULL,
  "actor_reference" TEXT NOT NULL,
  "actor_role" TEXT NOT NULL,
  "prior_status" "InvoiceStatus",
  "new_status" "InvoiceStatus" NOT NULL,
  "reason" TEXT,
  "occurred_at" TIMESTAMPTZ(3) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "invoice_audit_entries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "invoice_audit_entries_sequence_check" CHECK ("sequence" >= 1),
  CONSTRAINT "invoice_audit_entries_actor_check" CHECK (
    length("actor_reference") BETWEEN 1 AND 200
    AND "actor_role" IN ('employer_member', 'finance_reviewer', 'platform_admin', 'system')
  )
);

CREATE UNIQUE INDEX "invoice_audit_entries_invoice_sequence_key"
  ON "invoice_audit_entries"("invoice_id", "sequence");
CREATE INDEX "invoice_audit_entries_organization_occurred_idx"
  ON "invoice_audit_entries"("organization_id", "occurred_at");

ALTER TABLE "invoice_audit_entries"
  ADD CONSTRAINT "invoice_audit_entries_invoice_scope_fkey"
  FOREIGN KEY ("invoice_id", "organization_id")
  REFERENCES "invoices"("id", "organization_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
