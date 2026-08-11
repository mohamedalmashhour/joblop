-- Provider-neutral verification trust states + append-only audit. Badges/eligibility are
-- driven ONLY by these records — never inferred from account/contract/payment/postings.

CREATE TYPE "WorkerVerificationType" AS ENUM ('identity', 'background_check');
CREATE TYPE "WorkerVerificationStatus" AS ENUM ('unverified', 'pending', 'verified', 'review', 'expired', 'rejected');
CREATE TYPE "EmployerVerificationStatus" AS ENUM ('unverified', 'pending', 'business_verified', 'review_required', 'suspended', 'expired');

CREATE TABLE "worker_verifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "worker_identity_id" UUID NOT NULL,
    "verification_type" "WorkerVerificationType" NOT NULL,
    "status" "WorkerVerificationStatus" NOT NULL DEFAULT 'unverified',
    "provider" TEXT,
    "provider_reference" TEXT,
    "requested_at" TIMESTAMPTZ(3),
    "completed_at" TIMESTAMPTZ(3),
    "expires_at" TIMESTAMPTZ(3),
    "reviewed_by_user_id" UUID,
    "result_metadata" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "worker_verifications_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "worker_verifications_worker_type_key" ON "worker_verifications" ("worker_identity_id", "verification_type");
CREATE INDEX "worker_verifications_status_idx" ON "worker_verifications" ("status");
CREATE INDEX "worker_verifications_provider_reference_idx" ON "worker_verifications" ("provider_reference");
ALTER TABLE "worker_verifications" ADD CONSTRAINT "worker_verifications_worker_identity_id_fkey"
    FOREIGN KEY ("worker_identity_id") REFERENCES "worker_identities" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "employer_verifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "status" "EmployerVerificationStatus" NOT NULL DEFAULT 'unverified',
    "provider" TEXT,
    "provider_reference" TEXT,
    "requested_at" TIMESTAMPTZ(3),
    "completed_at" TIMESTAMPTZ(3),
    "expires_at" TIMESTAMPTZ(3),
    "reviewed_by_user_id" UUID,
    "result_metadata" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "employer_verifications_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "employer_verifications_organization_id_key" ON "employer_verifications" ("organization_id");
CREATE INDEX "employer_verifications_status_idx" ON "employer_verifications" ("status");
CREATE INDEX "employer_verifications_provider_reference_idx" ON "employer_verifications" ("provider_reference");
ALTER TABLE "employer_verifications" ADD CONSTRAINT "employer_verifications_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "employer_organizations" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "verification_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "subject_type" TEXT NOT NULL,
    "subject_id" UUID NOT NULL,
    "verification_type" TEXT,
    "source" TEXT NOT NULL,
    "prior_status" TEXT,
    "new_status" TEXT NOT NULL,
    "provider" TEXT,
    "provider_reference" TEXT,
    "actor_user_id" UUID,
    "detail" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "verification_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "verification_events_subject_idx" ON "verification_events" ("subject_type", "subject_id", "created_at");
