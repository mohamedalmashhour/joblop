-- HR-3: Documents & Compliance. File contents live behind a provider-neutral storage seam;
-- the DB stores metadata + a storageReference only. Compliance requirements are jurisdiction/
-- role/effective-date DATA (adapter mechanism), never hard-coded law.

CREATE TYPE "HrDocumentStatus" AS ENUM ('required', 'submitted', 'under_review', 'accepted', 'rejected', 'expiring', 'expired', 'superseded', 'revoked');

CREATE TABLE "hr_documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "worker_identity_id" UUID NOT NULL,
    "document_type" TEXT NOT NULL,
    "issuing_authority" TEXT,
    "jurisdiction" TEXT,
    "issued_at" TIMESTAMPTZ(3),
    "expires_at" TIMESTAMPTZ(3),
    "status" "HrDocumentStatus" NOT NULL DEFAULT 'submitted',
    "storage_reference" TEXT,
    "checksum" TEXT,
    "verification_reference" TEXT,
    "source" TEXT NOT NULL DEFAULT 'worker',
    "reviewed_by_user_id" UUID,
    "reviewed_at" TIMESTAMPTZ(3),
    "review_reason" TEXT,
    "superseded_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "hr_documents_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "hr_documents_superseded_by_id_key" ON "hr_documents" ("superseded_by_id");
CREATE INDEX "hr_documents_worker_type_idx" ON "hr_documents" ("worker_identity_id", "document_type");
CREATE INDEX "hr_documents_status_updated_at_idx" ON "hr_documents" ("status", "updated_at");
CREATE INDEX "hr_documents_status_expires_at_idx" ON "hr_documents" ("status", "expires_at");
ALTER TABLE "hr_documents" ADD CONSTRAINT "hr_documents_worker_identity_id_fkey"
    FOREIGN KEY ("worker_identity_id") REFERENCES "worker_identities" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "hr_documents" ADD CONSTRAINT "hr_documents_superseded_by_id_fkey"
    FOREIGN KEY ("superseded_by_id") REFERENCES "hr_documents" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "compliance_requirements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" TEXT NOT NULL,
    "description" TEXT,
    "jurisdiction" TEXT NOT NULL,
    "role_category" TEXT,
    "employer_policy_ref" TEXT,
    "worksite_ref" TEXT,
    "required_document_type" TEXT,
    "required_credential_type" TEXT,
    "effective_from" TIMESTAMPTZ(3) NOT NULL,
    "effective_to" TIMESTAMPTZ(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "compliance_requirements_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "compliance_requirements_key_key" ON "compliance_requirements" ("key");
CREATE INDEX "compliance_requirements_jurisdiction_role_idx" ON "compliance_requirements" ("jurisdiction", "role_category", "active");

CREATE TABLE "hr_document_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "document_id" UUID NOT NULL,
    "worker_identity_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "prior_state" TEXT,
    "new_state" TEXT NOT NULL,
    "reason" TEXT,
    "source" TEXT NOT NULL,
    "actor_user_id" UUID,
    "document_reference" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "hr_document_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "hr_document_events_worker_created_at_idx" ON "hr_document_events" ("worker_identity_id", "created_at");
CREATE INDEX "hr_document_events_document_idx" ON "hr_document_events" ("document_id", "created_at");
