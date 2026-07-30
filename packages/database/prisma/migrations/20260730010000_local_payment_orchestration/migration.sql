-- Local fake-provider payment orchestration authorized by ACR-0002.
-- Live providers, raw card data, real merchant identities and external payment execution remain prohibited.

CREATE TYPE "EmployerPaymentState" AS ENUM (
  'pending', 'authorized', 'processing', 'succeeded', 'failed', 'cancelled',
  'partially_refunded', 'refunded', 'disputed'
);
CREATE TYPE "PaymentPolicyMode" AS ENUM (
  'invoice_only', 'authorize_before_assignment_capture_after_invoice',
  'collect_after_invoice', 'manual_collection'
);

CREATE TABLE "payment_policy_versions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID,
  "version" TEXT NOT NULL,
  "mode" "PaymentPolicyMode" NOT NULL,
  "provider" TEXT,
  "merchant_identity_reference" TEXT,
  "production_approval_reference" TEXT,
  "employer_contract_version" TEXT NOT NULL,
  "marketplace_fee_fixed_minor" BIGINT NOT NULL DEFAULT 0,
  "marketplace_fee_rate_ppm" INTEGER NOT NULL DEFAULT 0,
  "jurisdiction" TEXT NOT NULL DEFAULT 'CA-QC',
  "method_surcharge_enabled" BOOLEAN NOT NULL DEFAULT false,
  "surcharge_rate_ppm" INTEGER NOT NULL DEFAULT 0,
  "surcharge_legal_approval" TEXT,
  "surcharge_processor_approval" TEXT,
  "effective_from" TIMESTAMPTZ(3) NOT NULL,
  "effective_until" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payment_policy_versions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payment_policy_versions_period_check" CHECK (
    "effective_until" IS NULL OR "effective_until" > "effective_from"
  ),
  CONSTRAINT "payment_policy_versions_local_provider_check" CHECK (
    "provider" IS NULL OR "provider" = 'local_fake'
  ),
  CONSTRAINT "payment_policy_versions_fee_check" CHECK (
    "marketplace_fee_fixed_minor" >= 0 AND "marketplace_fee_rate_ppm" BETWEEN 0 AND 1000000
    AND "surcharge_rate_ppm" BETWEEN 0 AND 1000000
  ),
  CONSTRAINT "payment_policy_versions_quebec_surcharge_check" CHECK (
    "jurisdiction" <> 'CA-QC' OR "method_surcharge_enabled" = false
  ),
  CONSTRAINT "payment_policy_versions_surcharge_approval_check" CHECK (
    "method_surcharge_enabled" = false OR (
      "surcharge_legal_approval" IS NOT NULL
      AND "surcharge_processor_approval" IS NOT NULL
    )
  )
);

CREATE TABLE "employer_payment_methods" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "provider" TEXT NOT NULL,
  "provider_customer_reference" TEXT NOT NULL,
  "provider_method_reference" TEXT NOT NULL,
  "display_alias" TEXT NOT NULL,
  "reusable" BOOLEAN NOT NULL DEFAULT false,
  "status" TEXT NOT NULL DEFAULT 'active',
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "employer_payment_methods_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "employer_payment_methods_local_provider_check" CHECK ("provider" = 'local_fake')
);

CREATE TABLE "employer_payment_attempts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "assignment_id" UUID NOT NULL,
  "timesheet_id" UUID NOT NULL,
  "invoice_id" UUID NOT NULL,
  "payment_method_id" UUID,
  "policy_version" TEXT NOT NULL,
  "state" "EmployerPaymentState" NOT NULL DEFAULT 'pending',
  "amount_minor" BIGINT NOT NULL,
  "allocated_minor" BIGINT NOT NULL DEFAULT 0,
  "refunded_minor" BIGINT NOT NULL DEFAULT 0,
  "currency" CHAR(3) NOT NULL DEFAULT 'CAD',
  "authorization_reference" TEXT,
  "idempotency_key_digest" CHAR(64) NOT NULL,
  "request_digest" CHAR(64) NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "employer_payment_attempts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "employer_payment_attempts_amount_check" CHECK (
    "amount_minor" > 0 AND "allocated_minor" >= 0 AND "refunded_minor" >= 0
    AND "allocated_minor" <= "amount_minor" AND "refunded_minor" <= "allocated_minor"
  ),
  CONSTRAINT "employer_payment_attempts_currency_check" CHECK ("currency" = 'CAD'),
  CONSTRAINT "employer_payment_attempts_version_check" CHECK ("version" >= 1)
);

CREATE TABLE "employer_payment_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "payment_attempt_id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "provider_event_reference" TEXT,
  "provider_operation_reference" TEXT,
  "event_type" TEXT NOT NULL,
  "prior_state" "EmployerPaymentState",
  "new_state" "EmployerPaymentState" NOT NULL,
  "actor_type" TEXT NOT NULL,
  "safe_reason_code" TEXT,
  "payload_digest" CHAR(64),
  "occurred_at" TIMESTAMPTZ(3) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "employer_payment_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "employer_payment_allocations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "payment_attempt_id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "invoice_id" UUID NOT NULL,
  "amount_minor" BIGINT NOT NULL,
  "currency" CHAR(3) NOT NULL DEFAULT 'CAD',
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "employer_payment_allocations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "employer_payment_allocations_amount_check" CHECK ("amount_minor" > 0),
  CONSTRAINT "employer_payment_allocations_currency_check" CHECK ("currency" = 'CAD')
);

CREATE TABLE "employer_payment_refunds" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "payment_attempt_id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "amount_minor" BIGINT NOT NULL,
  "currency" CHAR(3) NOT NULL DEFAULT 'CAD',
  "provider_operation_reference" TEXT NOT NULL,
  "idempotency_key_digest" CHAR(64) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "employer_payment_refunds_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "employer_payment_refunds_amount_check" CHECK ("amount_minor" > 0),
  CONSTRAINT "employer_payment_refunds_currency_check" CHECK ("currency" = 'CAD')
);

CREATE UNIQUE INDEX "payment_policy_versions_organization_version_key"
  ON "payment_policy_versions"("organization_id", "version");
CREATE INDEX "payment_policy_versions_effective_idx"
  ON "payment_policy_versions"("organization_id", "effective_from", "effective_until");
CREATE UNIQUE INDEX "employer_payment_methods_id_organization_key"
  ON "employer_payment_methods"("id", "organization_id");
CREATE UNIQUE INDEX "employer_payment_methods_provider_reference_key"
  ON "employer_payment_methods"("organization_id", "provider", "provider_method_reference");
CREATE INDEX "employer_payment_methods_organization_status_idx"
  ON "employer_payment_methods"("organization_id", "status", "updated_at");
CREATE UNIQUE INDEX "employer_payment_attempts_id_organization_key"
  ON "employer_payment_attempts"("id", "organization_id");
CREATE UNIQUE INDEX "employer_payment_attempts_organization_idempotency_key"
  ON "employer_payment_attempts"("organization_id", "idempotency_key_digest");
CREATE INDEX "employer_payment_attempts_organization_state_idx"
  ON "employer_payment_attempts"("organization_id", "state", "updated_at");
CREATE INDEX "employer_payment_attempts_invoice_created_idx"
  ON "employer_payment_attempts"("invoice_id", "created_at");
CREATE UNIQUE INDEX "employer_payment_events_provider_event_key"
  ON "employer_payment_events"("organization_id", "provider_event_reference");
CREATE INDEX "employer_payment_events_attempt_created_idx"
  ON "employer_payment_events"("payment_attempt_id", "created_at");
CREATE INDEX "employer_payment_allocations_invoice_created_idx"
  ON "employer_payment_allocations"("invoice_id", "created_at");
CREATE UNIQUE INDEX "employer_payment_refunds_organization_idempotency_key"
  ON "employer_payment_refunds"("organization_id", "idempotency_key_digest");
CREATE INDEX "employer_payment_refunds_attempt_created_idx"
  ON "employer_payment_refunds"("payment_attempt_id", "created_at");

ALTER TABLE "payment_policy_versions" ADD CONSTRAINT "payment_policy_versions_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "employer_organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "employer_payment_methods" ADD CONSTRAINT "employer_payment_methods_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "employer_organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "employer_payment_attempts" ADD CONSTRAINT "employer_payment_attempts_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "employer_organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "employer_payment_attempts" ADD CONSTRAINT "employer_payment_attempts_invoice_scope_fkey"
  FOREIGN KEY ("invoice_id", "organization_id") REFERENCES "invoices"("id", "organization_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "employer_payment_attempts" ADD CONSTRAINT "employer_payment_attempts_method_scope_fkey"
  FOREIGN KEY ("payment_method_id", "organization_id")
  REFERENCES "employer_payment_methods"("id", "organization_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "employer_payment_events" ADD CONSTRAINT "employer_payment_events_attempt_scope_fkey"
  FOREIGN KEY ("payment_attempt_id", "organization_id")
  REFERENCES "employer_payment_attempts"("id", "organization_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "employer_payment_allocations" ADD CONSTRAINT "employer_payment_allocations_attempt_scope_fkey"
  FOREIGN KEY ("payment_attempt_id", "organization_id")
  REFERENCES "employer_payment_attempts"("id", "organization_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "employer_payment_refunds" ADD CONSTRAINT "employer_payment_refunds_attempt_scope_fkey"
  FOREIGN KEY ("payment_attempt_id", "organization_id")
  REFERENCES "employer_payment_attempts"("id", "organization_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
