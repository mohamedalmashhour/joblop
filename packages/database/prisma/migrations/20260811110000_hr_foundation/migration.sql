-- HR-1 domain foundation. Governed HR domain: profile, credentials (expiry first-class),
-- cases (append-only governed), + append-only HR audit. Plus a distinct HR_ADMINISTRATOR
-- platform authority (HR decisions are not the same authority as generic platform admin).

CREATE TYPE "HrStanding" AS ENUM ('active', 'review_required', 'restricted', 'suspended', 'inactive');
CREATE TYPE "HrCredentialStatus" AS ENUM ('valid', 'expiring', 'expired', 'renewed', 'replaced', 'revoked');
CREATE TYPE "HrCaseStatus" AS ENUM ('opened', 'under_review', 'action_required', 'resolved', 'closed');

CREATE TABLE "hr_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "worker_identity_id" UUID NOT NULL,
    "standing" "HrStanding" NOT NULL DEFAULT 'active',
    "standing_reason" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "hr_profiles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "hr_profiles_worker_identity_id_key" ON "hr_profiles" ("worker_identity_id");
CREATE INDEX "hr_profiles_standing_updated_at_idx" ON "hr_profiles" ("standing", "updated_at");
ALTER TABLE "hr_profiles" ADD CONSTRAINT "hr_profiles_worker_identity_id_fkey"
    FOREIGN KEY ("worker_identity_id") REFERENCES "worker_identities" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "hr_credentials" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "worker_identity_id" UUID NOT NULL,
    "credential_type" TEXT NOT NULL,
    "issuer" TEXT,
    "issued_at" TIMESTAMPTZ(3),
    "expires_at" TIMESTAMPTZ(3),
    "status" "HrCredentialStatus" NOT NULL DEFAULT 'valid',
    "verification_reference" TEXT,
    "safe_metadata" JSONB,
    "superseded_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "hr_credentials_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "hr_credentials_superseded_by_id_key" ON "hr_credentials" ("superseded_by_id");
CREATE INDEX "hr_credentials_worker_type_idx" ON "hr_credentials" ("worker_identity_id", "credential_type");
CREATE INDEX "hr_credentials_status_expires_at_idx" ON "hr_credentials" ("status", "expires_at");
ALTER TABLE "hr_credentials" ADD CONSTRAINT "hr_credentials_worker_identity_id_fkey"
    FOREIGN KEY ("worker_identity_id") REFERENCES "worker_identities" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "hr_credentials" ADD CONSTRAINT "hr_credentials_superseded_by_id_fkey"
    FOREIGN KEY ("superseded_by_id") REFERENCES "hr_credentials" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "hr_cases" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "worker_identity_id" UUID NOT NULL,
    "case_type" TEXT NOT NULL,
    "status" "HrCaseStatus" NOT NULL DEFAULT 'opened',
    "reason" TEXT,
    "opened_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "hr_cases_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "hr_cases_worker_created_at_idx" ON "hr_cases" ("worker_identity_id", "created_at");
CREATE INDEX "hr_cases_status_updated_at_idx" ON "hr_cases" ("status", "updated_at");
ALTER TABLE "hr_cases" ADD CONSTRAINT "hr_cases_worker_identity_id_fkey"
    FOREIGN KEY ("worker_identity_id") REFERENCES "worker_identities" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "hr_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "subject_type" TEXT NOT NULL,
    "subject_id" UUID NOT NULL,
    "worker_identity_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "prior_state" TEXT,
    "new_state" TEXT NOT NULL,
    "reason" TEXT,
    "source" TEXT NOT NULL,
    "actor_user_id" UUID,
    "correlation_id" TEXT,
    "detail" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "hr_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "hr_events_worker_created_at_idx" ON "hr_events" ("worker_identity_id", "created_at");
CREATE INDEX "hr_events_subject_idx" ON "hr_events" ("subject_type", "subject_id", "created_at");

-- A distinct HR authority (platform-scoped) so HR decisions are not the same authority as
-- generic platform administration.
INSERT INTO "access_role_definitions" ("id", "key", "scope", "status", "description", "is_system", "created_at", "updated_at")
VALUES (gen_random_uuid(), 'HR_ADMINISTRATOR', 'platform', 'active', 'Governed HR domain administration.', true, now(), now())
ON CONFLICT DO NOTHING;
