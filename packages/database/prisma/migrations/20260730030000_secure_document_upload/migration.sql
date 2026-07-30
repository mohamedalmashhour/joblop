-- Provider-neutral private document metadata. File bytes remain in a private object store.
-- This migration stores no document body and creates no public-access path.

CREATE TYPE "UploadedDocumentState" AS ENUM (
  'quarantined', 'scan_error', 'infected', 'clean', 'approved',
  'rejected', 'replaced', 'expired', 'deleted'
);

CREATE TABLE "uploaded_documents" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "owner_user_id" UUID NOT NULL,
  "document_type" TEXT NOT NULL,
  "original_filename" VARCHAR(120) NOT NULL,
  "object_key" TEXT NOT NULL,
  "content_type" TEXT NOT NULL,
  "size_bytes" INTEGER NOT NULL,
  "content_digest" CHAR(64) NOT NULL,
  "state" "UploadedDocumentState" NOT NULL DEFAULT 'quarantined',
  "version" INTEGER NOT NULL DEFAULT 1,
  "replacement_for_id" UUID,
  "upload_idempotency_key" CHAR(64) NOT NULL,
  "request_digest" CHAR(64) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMPTZ(3),
  CONSTRAINT "uploaded_documents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "uploaded_documents_size_check" CHECK ("size_bytes" BETWEEN 1 AND 10485760),
  CONSTRAINT "uploaded_documents_version_check" CHECK ("version" >= 1),
  CONSTRAINT "uploaded_documents_digest_check" CHECK ("content_digest" ~ '^[a-f0-9]{64}$'),
  CONSTRAINT "uploaded_documents_request_digest_check" CHECK ("request_digest" ~ '^[a-f0-9]{64}$'),
  CONSTRAINT "uploaded_documents_idempotency_check" CHECK ("upload_idempotency_key" ~ '^[a-f0-9]{64}$'),
  CONSTRAINT "uploaded_documents_content_type_check" CHECK (
    "content_type" IN ('application/pdf', 'image/png', 'image/jpeg')
  ),
  CONSTRAINT "uploaded_documents_type_check" CHECK (
    "document_type" IN ('worker_certification', 'employer_contract', 'invoice_support')
  )
);

CREATE TABLE "uploaded_document_audits" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "document_id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "sequence" INTEGER NOT NULL,
  "action" TEXT NOT NULL,
  "actor_user_id" UUID NOT NULL,
  "prior_state" "UploadedDocumentState",
  "new_state" "UploadedDocumentState" NOT NULL,
  "occurred_at" TIMESTAMPTZ(3) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "uploaded_document_audits_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "uploaded_document_audits_sequence_check" CHECK ("sequence" >= 1)
);

CREATE UNIQUE INDEX "uploaded_documents_object_key_key"
  ON "uploaded_documents"("object_key");
CREATE UNIQUE INDEX "uploaded_documents_id_organization_key"
  ON "uploaded_documents"("id", "organization_id");
CREATE UNIQUE INDEX "uploaded_documents_organization_idempotency_key"
  ON "uploaded_documents"("organization_id", "upload_idempotency_key");
CREATE INDEX "uploaded_documents_owner_type_state_idx"
  ON "uploaded_documents"("organization_id", "owner_user_id", "document_type", "state");
CREATE INDEX "uploaded_documents_replacement_for_idx"
  ON "uploaded_documents"("replacement_for_id");
CREATE UNIQUE INDEX "uploaded_document_audits_document_sequence_key"
  ON "uploaded_document_audits"("document_id", "sequence");
CREATE INDEX "uploaded_document_audits_organization_occurred_idx"
  ON "uploaded_document_audits"("organization_id", "occurred_at");

ALTER TABLE "uploaded_documents"
  ADD CONSTRAINT "uploaded_documents_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "employer_organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "uploaded_documents"
  ADD CONSTRAINT "uploaded_documents_owner_user_id_fkey"
  FOREIGN KEY ("owner_user_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "uploaded_documents"
  ADD CONSTRAINT "uploaded_documents_replacement_scope_fkey"
  FOREIGN KEY ("replacement_for_id", "organization_id")
  REFERENCES "uploaded_documents"("id", "organization_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "uploaded_document_audits"
  ADD CONSTRAINT "uploaded_document_audits_document_scope_fkey"
  FOREIGN KEY ("document_id", "organization_id")
  REFERENCES "uploaded_documents"("id", "organization_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
