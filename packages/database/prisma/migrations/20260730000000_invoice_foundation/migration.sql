-- Invoice foundation authorized by ACR-0001.
-- Payment collection, worker payout, tax filing, real email and production issuer activation remain excluded.

CREATE TYPE "InvoiceStatus" AS ENUM (
  'draft', 'approved', 'issued', 'sent', 'viewed', 'partially_paid',
  'paid', 'overdue', 'disputed', 'voided', 'refunded'
);
CREATE TYPE "InvoiceIssuerModel" AS ENUM (
  'platform_principal', 'worker_supplier', 'self_billing_agent'
);
CREATE TYPE "InvoiceTaxTreatment" AS ENUM (
  'taxable', 'zero_rated', 'exempt', 'tax_not_enabled'
);

CREATE TABLE "invoices" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "timesheet_id" UUID NOT NULL,
  "timesheet_version" INTEGER NOT NULL,
  "invoice_number" TEXT,
  "number_scope_year" INTEGER,
  "status" "InvoiceStatus" NOT NULL DEFAULT 'draft',
  "currency" CHAR(3) NOT NULL DEFAULT 'CAD',
  "issuer_model" "InvoiceIssuerModel" NOT NULL,
  "issuer_snapshot" JSONB NOT NULL,
  "recipient_snapshot" JSONB NOT NULL,
  "tax_snapshot" JSONB NOT NULL,
  "configuration_snapshot" JSONB NOT NULL,
  "calculation_snapshot" JSONB NOT NULL,
  "subtotal_minor" BIGINT NOT NULL,
  "tax_minor" BIGINT NOT NULL,
  "credit_minor" BIGINT NOT NULL DEFAULT 0,
  "total_minor" BIGINT NOT NULL,
  "idempotency_key_digest" CHAR(64) NOT NULL,
  "request_digest" CHAR(64) NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "approved_at" TIMESTAMPTZ(3),
  "issued_at" TIMESTAMPTZ(3),
  "sent_at" TIMESTAMPTZ(3),
  "viewed_at" TIMESTAMPTZ(3),
  "due_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "invoices_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "invoices_timesheet_version_check" CHECK ("timesheet_version" >= 1),
  CONSTRAINT "invoices_version_check" CHECK ("version" >= 1),
  CONSTRAINT "invoices_currency_check" CHECK ("currency" = 'CAD'),
  CONSTRAINT "invoices_amounts_check" CHECK (
    "subtotal_minor" >= 0 AND "tax_minor" >= 0 AND "credit_minor" >= 0
    AND "total_minor" >= 0 AND "credit_minor" <= "subtotal_minor" + "tax_minor"
    AND "total_minor" = "subtotal_minor" + "tax_minor" - "credit_minor"
  ),
  CONSTRAINT "invoices_issued_number_check" CHECK (
    "status" IN ('draft', 'approved') OR ("invoice_number" IS NOT NULL AND "issued_at" IS NOT NULL)
  )
);

CREATE TABLE "invoice_credit_notes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "invoice_id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "credit_note_number" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "calculation_snapshot" JSONB NOT NULL,
  "amount_minor" BIGINT NOT NULL,
  "currency" CHAR(3) NOT NULL DEFAULT 'CAD',
  "idempotency_key_digest" CHAR(64) NOT NULL,
  "issued_at" TIMESTAMPTZ(3) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "invoice_credit_notes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "invoice_credit_notes_amount_check" CHECK ("amount_minor" > 0),
  CONSTRAINT "invoice_credit_notes_currency_check" CHECK ("currency" = 'CAD')
);

CREATE TABLE "invoice_delivery_receipts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "invoice_id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "provider_boundary" TEXT NOT NULL DEFAULT 'local_fake',
  "recipient_alias" TEXT NOT NULL,
  "document_digest" CHAR(64) NOT NULL,
  "idempotency_key_digest" CHAR(64) NOT NULL,
  "status" TEXT NOT NULL,
  "accepted_at" TIMESTAMPTZ(3) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "invoice_delivery_receipts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "invoice_delivery_provider_check" CHECK ("provider_boundary" = 'local_fake')
);

CREATE TABLE "invoice_configuration_versions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID,
  "version" TEXT NOT NULL,
  "issuer_model" "InvoiceIssuerModel" NOT NULL,
  "tax_treatment" "InvoiceTaxTreatment" NOT NULL,
  "issuer_registered_for_gst" BOOLEAN NOT NULL DEFAULT false,
  "issuer_registered_for_qst" BOOLEAN NOT NULL DEFAULT false,
  "gst_rate_parts_per_million" INTEGER NOT NULL DEFAULT 0,
  "qst_rate_parts_per_million" INTEGER NOT NULL DEFAULT 0,
  "supply_classification" TEXT NOT NULL,
  "place_of_supply_policy_version" TEXT NOT NULL,
  "payment_terms_version" TEXT NOT NULL,
  "numbering_policy_version" TEXT NOT NULL,
  "production_approval_reference" TEXT,
  "effective_from" TIMESTAMPTZ(3) NOT NULL,
  "effective_until" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "invoice_configuration_versions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "invoice_configurations_rates_check" CHECK (
    "gst_rate_parts_per_million" BETWEEN 0 AND 1000000
    AND "qst_rate_parts_per_million" BETWEEN 0 AND 1000000
  ),
  CONSTRAINT "invoice_configurations_period_check" CHECK (
    "effective_until" IS NULL OR "effective_until" > "effective_from"
  )
);

CREATE TABLE "invoice_number_sequences" (
  "organization_id" UUID NOT NULL,
  "scope_year" INTEGER NOT NULL,
  "prefix" TEXT NOT NULL,
  "last_value" INTEGER NOT NULL DEFAULT 0,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "invoice_number_sequences_pkey" PRIMARY KEY ("organization_id", "scope_year", "prefix"),
  CONSTRAINT "invoice_number_sequences_value_check" CHECK ("last_value" >= 0),
  CONSTRAINT "invoice_number_sequences_year_check" CHECK ("scope_year" BETWEEN 2000 AND 9999)
);

CREATE UNIQUE INDEX "invoices_organization_number_key"
  ON "invoices"("organization_id", "invoice_number");
CREATE UNIQUE INDEX "invoices_organization_timesheet_key"
  ON "invoices"("organization_id", "timesheet_id");
CREATE UNIQUE INDEX "invoices_organization_idempotency_key"
  ON "invoices"("organization_id", "idempotency_key_digest");
CREATE UNIQUE INDEX "invoices_id_organization_key"
  ON "invoices"("id", "organization_id");
CREATE INDEX "invoices_organization_status_updated_idx"
  ON "invoices"("organization_id", "status", "updated_at");

CREATE UNIQUE INDEX "invoice_credit_notes_organization_number_key"
  ON "invoice_credit_notes"("organization_id", "credit_note_number");
CREATE UNIQUE INDEX "invoice_credit_notes_organization_idempotency_key"
  ON "invoice_credit_notes"("organization_id", "idempotency_key_digest");
CREATE INDEX "invoice_credit_notes_invoice_created_idx"
  ON "invoice_credit_notes"("invoice_id", "created_at");

CREATE UNIQUE INDEX "invoice_deliveries_organization_idempotency_key"
  ON "invoice_delivery_receipts"("organization_id", "idempotency_key_digest");
CREATE INDEX "invoice_deliveries_invoice_created_idx"
  ON "invoice_delivery_receipts"("invoice_id", "created_at");

CREATE UNIQUE INDEX "invoice_configurations_organization_version_key"
  ON "invoice_configuration_versions"("organization_id", "version");
CREATE INDEX "invoice_configurations_effective_idx"
  ON "invoice_configuration_versions"("organization_id", "effective_from", "effective_until");

ALTER TABLE "invoices"
  ADD CONSTRAINT "invoices_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "employer_organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "invoices"
  ADD CONSTRAINT "invoices_timesheet_id_fkey"
  FOREIGN KEY ("timesheet_id") REFERENCES "timesheets"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "invoice_credit_notes"
  ADD CONSTRAINT "invoice_credit_notes_invoice_scope_fkey"
  FOREIGN KEY ("invoice_id", "organization_id") REFERENCES "invoices"("id", "organization_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "invoice_delivery_receipts"
  ADD CONSTRAINT "invoice_delivery_receipts_invoice_scope_fkey"
  FOREIGN KEY ("invoice_id", "organization_id") REFERENCES "invoices"("id", "organization_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
