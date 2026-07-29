-- CreateEnum
CREATE TYPE "QaResetManifestStatus" AS ENUM ('draft', 'approved', 'active', 'expired', 'revoked', 'retired');

-- CreateEnum
CREATE TYPE "QaResetOwnedRecordStatus" AS ENUM ('declared', 'prepared', 'verified', 'cleaned', 'blocked');

-- CreateEnum
CREATE TYPE "QaResetOperation" AS ENUM ('dry_run', 'prepare', 'cleanup');

-- CreateEnum
CREATE TYPE "QaResetScope" AS ENUM ('browser', 'ios', 'android', 'manual_qa');

-- CreateEnum
CREATE TYPE "QaResetRunStatus" AS ENUM ('planned', 'running', 'succeeded', 'failed', 'unknown', 'blocked', 'cleanup_completed');

-- CreateEnum
CREATE TYPE "SyntheticDeliveryStatus" AS ENUM ('claimed', 'completed', 'retry_pending', 'failed_terminal', 'unknown', 'blocked', 'expired');

-- CreateTable
CREATE TABLE "qa_reset_manifest_ownership" (
    "id" UUID NOT NULL,
    "manifest_reference" VARCHAR(160) NOT NULL,
    "manifest_checksum" CHAR(64) NOT NULL,
    "namespace" VARCHAR(96) NOT NULL,
    "environment" VARCHAR(16) NOT NULL,
    "project_id" VARCHAR(160) NOT NULL,
    "cluster_id" VARCHAR(160) NOT NULL,
    "database_id" VARCHAR(160) NOT NULL,
    "authority_id" VARCHAR(160) NOT NULL,
    "release_sha" CHAR(40) NOT NULL,
    "status" "QaResetManifestStatus" NOT NULL DEFAULT 'draft',
    "approved_at" TIMESTAMPTZ(3),
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "retention_until" TIMESTAMPTZ(3) NOT NULL,
    "approval_reference" VARCHAR(160) NOT NULL,
    "retention_owner_reference" VARCHAR(160) NOT NULL,
    "created_by_caller_alias" VARCHAR(64) NOT NULL,
    "created_by_principal_digest" CHAR(64) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "qa_reset_manifest_ownership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qa_reset_manifest_tenants" (
    "id" UUID NOT NULL,
    "manifest_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "tenant_alias" VARCHAR(16) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qa_reset_manifest_tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qa_reset_owned_records" (
    "id" UUID NOT NULL,
    "manifest_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "namespace" VARCHAR(96) NOT NULL,
    "entity_type" VARCHAR(48) NOT NULL,
    "manifest_record_key" VARCHAR(160) NOT NULL,
    "target_record_id" UUID NOT NULL,
    "lifecycle_status" "QaResetOwnedRecordStatus" NOT NULL DEFAULT 'declared',
    "prepared_at" TIMESTAMPTZ(3),
    "verified_at" TIMESTAMPTZ(3),
    "cleaned_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "qa_reset_owned_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qa_reset_control_runs" (
    "id" UUID NOT NULL,
    "manifest_id" UUID NOT NULL,
    "operation" "QaResetOperation" NOT NULL,
    "scope" "QaResetScope" NOT NULL,
    "idempotency_digest" CHAR(64) NOT NULL,
    "plan_checksum" CHAR(64) NOT NULL,
    "preparation_receipt" CHAR(64),
    "result_receipt" CHAR(64),
    "caller_alias" VARCHAR(64) NOT NULL,
    "caller_principal_digest" CHAR(64) NOT NULL,
    "approval_reference" VARCHAR(160) NOT NULL,
    "correlation_id" VARCHAR(96) NOT NULL,
    "status" "QaResetRunStatus" NOT NULL DEFAULT 'planned',
    "failure_category" VARCHAR(64),
    "expected_record_count" INTEGER NOT NULL,
    "observed_record_count" INTEGER,
    "started_at" TIMESTAMPTZ(3),
    "completed_at" TIMESTAMPTZ(3),
    "retention_until" TIMESTAMPTZ(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "qa_reset_control_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qa_reset_control_events" (
    "id" UUID NOT NULL,
    "control_run_id" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "event_type" VARCHAR(64) NOT NULL,
    "prior_status" "QaResetRunStatus",
    "new_status" "QaResetRunStatus" NOT NULL,
    "caller_alias" VARCHAR(64) NOT NULL,
    "caller_principal_digest" CHAR(64) NOT NULL,
    "safe_count" INTEGER,
    "reason_category" VARCHAR(64),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qa_reset_control_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "synthetic_delivery_idempotency" (
    "id" UUID NOT NULL,
    "environment" VARCHAR(16) NOT NULL,
    "contract_version" VARCHAR(32) NOT NULL,
    "release_sha" CHAR(40) NOT NULL,
    "manifest_checksum" CHAR(64) NOT NULL,
    "tenant_id" UUID NOT NULL,
    "caller_alias" VARCHAR(64) NOT NULL,
    "operation" VARCHAR(64) NOT NULL,
    "idempotency_key_digest" CHAR(64) NOT NULL,
    "request_digest" CHAR(64) NOT NULL,
    "worker_offer_id" UUID NOT NULL,
    "terms_version_id" UUID NOT NULL,
    "worker_identity_id" UUID NOT NULL,
    "status" "SyntheticDeliveryStatus" NOT NULL DEFAULT 'claimed',
    "provider_reference_digest" CHAR(64),
    "retryable" BOOLEAN NOT NULL DEFAULT false,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMPTZ(3),
    "failure_category" VARCHAR(64),
    "terminal_at" TIMESTAMPTZ(3),
    "retention_until" TIMESTAMPTZ(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "synthetic_delivery_idempotency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "synthetic_delivery_attempts" (
    "id" UUID NOT NULL,
    "idempotency_id" UUID NOT NULL,
    "attempt_number" INTEGER NOT NULL,
    "eligible_at" TIMESTAMPTZ(3) NOT NULL,
    "executed_at" TIMESTAMPTZ(3) NOT NULL,
    "simulation_scenario" VARCHAR(64) NOT NULL,
    "response_status" VARCHAR(32) NOT NULL,
    "retryable" BOOLEAN NOT NULL,
    "provider_reference_digest" CHAR(64),
    "result_category" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "synthetic_delivery_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "qa_reset_manifest_ownership_manifest_reference_key" ON "qa_reset_manifest_ownership"("manifest_reference");

-- CreateIndex
CREATE UNIQUE INDEX "qa_reset_manifest_ownership_manifest_checksum_key" ON "qa_reset_manifest_ownership"("manifest_checksum");

-- CreateIndex
CREATE INDEX "qa_reset_manifests_status_expires_idx" ON "qa_reset_manifest_ownership"("status", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "qa_reset_manifests_namespace_checksum_key" ON "qa_reset_manifest_ownership"("namespace", "manifest_checksum");

-- CreateIndex
CREATE UNIQUE INDEX "qa_reset_manifest_tenants_manifest_tenant_key" ON "qa_reset_manifest_tenants"("manifest_id", "tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "qa_reset_manifest_tenants_manifest_alias_key" ON "qa_reset_manifest_tenants"("manifest_id", "tenant_alias");

-- CreateIndex
CREATE INDEX "qa_reset_owned_records_scope_idx" ON "qa_reset_owned_records"("namespace", "tenant_id", "entity_type");

-- CreateIndex
CREATE UNIQUE INDEX "qa_reset_owned_records_manifest_entity_target_key" ON "qa_reset_owned_records"("manifest_id", "entity_type", "target_record_id");

-- CreateIndex
CREATE UNIQUE INDEX "qa_reset_owned_records_manifest_record_key" ON "qa_reset_owned_records"("manifest_id", "manifest_record_key");

-- CreateIndex
CREATE UNIQUE INDEX "qa_reset_control_runs_idempotency_digest_key" ON "qa_reset_control_runs"("idempotency_digest");

-- CreateIndex
CREATE INDEX "qa_reset_control_runs_status_retention_idx" ON "qa_reset_control_runs"("status", "retention_until");

-- CreateIndex
CREATE INDEX "qa_reset_control_events_created_idx" ON "qa_reset_control_events"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "qa_reset_control_events_run_sequence_key" ON "qa_reset_control_events"("control_run_id", "sequence");

-- CreateIndex
CREATE INDEX "synthetic_delivery_idempotency_status_retention_idx" ON "synthetic_delivery_idempotency"("status", "retention_until");

-- CreateIndex
CREATE INDEX "synthetic_delivery_idempotency_tenant_offer_idx" ON "synthetic_delivery_idempotency"("tenant_id", "worker_offer_id");

-- CreateIndex
CREATE UNIQUE INDEX "synthetic_delivery_idempotency_scope_key" ON "synthetic_delivery_idempotency"("environment", "contract_version", "release_sha", "manifest_checksum", "tenant_id", "caller_alias", "operation", "idempotency_key_digest");

-- CreateIndex
CREATE UNIQUE INDEX "synthetic_delivery_attempts_record_number_key" ON "synthetic_delivery_attempts"("idempotency_id", "attempt_number");

-- AddForeignKey
ALTER TABLE "qa_reset_manifest_tenants" ADD CONSTRAINT "qa_reset_manifest_tenants_manifest_id_fkey" FOREIGN KEY ("manifest_id") REFERENCES "qa_reset_manifest_ownership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qa_reset_owned_records" ADD CONSTRAINT "qa_reset_owned_records_manifest_id_fkey" FOREIGN KEY ("manifest_id") REFERENCES "qa_reset_manifest_ownership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qa_reset_owned_records" ADD CONSTRAINT "qa_reset_owned_records_manifest_tenant_fkey" FOREIGN KEY ("manifest_id", "tenant_id") REFERENCES "qa_reset_manifest_tenants"("manifest_id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qa_reset_control_runs" ADD CONSTRAINT "qa_reset_control_runs_manifest_id_fkey" FOREIGN KEY ("manifest_id") REFERENCES "qa_reset_manifest_ownership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qa_reset_control_events" ADD CONSTRAINT "qa_reset_control_events_control_run_id_fkey" FOREIGN KEY ("control_run_id") REFERENCES "qa_reset_control_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "synthetic_delivery_attempts" ADD CONSTRAINT "synthetic_delivery_attempts_idempotency_id_fkey" FOREIGN KEY ("idempotency_id") REFERENCES "synthetic_delivery_idempotency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Staging-only and bounded-value safety checks
ALTER TABLE "qa_reset_manifest_ownership"
  ADD CONSTRAINT "qa_reset_manifests_staging_only_check" CHECK ("environment" = 'staging'),
  ADD CONSTRAINT "qa_reset_manifests_namespace_check" CHECK ("namespace" = 'rwos:qa-reset:staging:v1'),
  ADD CONSTRAINT "qa_reset_manifests_checksum_check" CHECK ("manifest_checksum" ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT "qa_reset_manifests_release_sha_check" CHECK ("release_sha" ~ '^[0-9a-f]{40}$'),
  ADD CONSTRAINT "qa_reset_manifests_principal_digest_check" CHECK ("created_by_principal_digest" ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT "qa_reset_manifests_expiry_check" CHECK ("expires_at" > "created_at"),
  ADD CONSTRAINT "qa_reset_manifests_retention_check" CHECK ("retention_until" >= "expires_at"),
  ADD CONSTRAINT "qa_reset_manifests_version_check" CHECK ("version" > 0);

ALTER TABLE "qa_reset_manifest_tenants"
  ADD CONSTRAINT "qa_reset_manifest_tenants_alias_check" CHECK ("tenant_alias" IN ('tenant-a', 'tenant-b'));

ALTER TABLE "qa_reset_owned_records"
  ADD CONSTRAINT "qa_reset_owned_records_namespace_check" CHECK ("namespace" = 'rwos:qa-reset:staging:v1');

ALTER TABLE "qa_reset_control_runs"
  ADD CONSTRAINT "qa_reset_control_runs_idempotency_digest_check" CHECK ("idempotency_digest" ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT "qa_reset_control_runs_plan_checksum_check" CHECK ("plan_checksum" ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT "qa_reset_control_runs_principal_digest_check" CHECK ("caller_principal_digest" ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT "qa_reset_control_runs_counts_check" CHECK (
    "expected_record_count" >= 0 AND ("observed_record_count" IS NULL OR "observed_record_count" >= 0)
  ),
  ADD CONSTRAINT "qa_reset_control_runs_completion_check" CHECK (
    "completed_at" IS NULL OR "started_at" IS NULL OR "completed_at" >= "started_at"
  ),
  ADD CONSTRAINT "qa_reset_control_runs_retention_check" CHECK ("retention_until" >= "created_at"),
  ADD CONSTRAINT "qa_reset_control_runs_version_check" CHECK ("version" > 0);

ALTER TABLE "qa_reset_control_events"
  ADD CONSTRAINT "qa_reset_control_events_sequence_check" CHECK ("sequence" > 0),
  ADD CONSTRAINT "qa_reset_control_events_principal_digest_check" CHECK ("caller_principal_digest" ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT "qa_reset_control_events_safe_count_check" CHECK ("safe_count" IS NULL OR "safe_count" >= 0);

ALTER TABLE "synthetic_delivery_idempotency"
  ADD CONSTRAINT "synthetic_delivery_staging_only_check" CHECK ("environment" = 'staging'),
  ADD CONSTRAINT "synthetic_delivery_release_sha_check" CHECK ("release_sha" ~ '^[0-9a-f]{40}$'),
  ADD CONSTRAINT "synthetic_delivery_manifest_checksum_check" CHECK ("manifest_checksum" ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT "synthetic_delivery_idempotency_digest_check" CHECK ("idempotency_key_digest" ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT "synthetic_delivery_request_digest_check" CHECK ("request_digest" ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT "synthetic_delivery_attempt_count_check" CHECK ("attempt_count" >= 0),
  ADD CONSTRAINT "synthetic_delivery_retention_check" CHECK (
    "retention_until" >= "created_at" AND ("terminal_at" IS NULL OR "retention_until" >= "terminal_at")
  ),
  ADD CONSTRAINT "synthetic_delivery_version_check" CHECK ("version" > 0);

ALTER TABLE "synthetic_delivery_attempts"
  ADD CONSTRAINT "synthetic_delivery_attempt_number_check" CHECK ("attempt_number" > 0),
  ADD CONSTRAINT "synthetic_delivery_attempt_time_check" CHECK ("executed_at" >= "eligible_at");
