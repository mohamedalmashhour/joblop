-- Worker marketplace INTEREST — governed intent, distinct from the offer/assignment
-- state machines. A partial unique index enforces "at most one ACTIVE interest per
-- (worker, job)"; withdrawn/not_selected records are historical and never block a new one.

CREATE TYPE "WorkerJobInterestSource" AS ENUM ('marketplace');

CREATE TYPE "WorkerJobInterestStatus" AS ENUM (
    'submitted',
    'under_review',
    'shortlisted',
    'not_selected',
    'withdrawn',
    'offer_created',
    'offer_accepted'
);

CREATE TABLE "worker_job_interests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "worker_identity_id" UUID NOT NULL,
    "job_request_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "status" "WorkerJobInterestStatus" NOT NULL DEFAULT 'submitted',
    "source" "WorkerJobInterestSource" NOT NULL DEFAULT 'marketplace',
    "distance_km_at_interest" DOUBLE PRECISION,
    "eligibility_snapshot" JSONB,
    "worker_offer_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "worker_job_interests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "worker_job_interests_worker_created_at_idx"
    ON "worker_job_interests" ("worker_identity_id", "created_at");

CREATE INDEX "worker_job_interests_job_status_idx"
    ON "worker_job_interests" ("job_request_id", "status");

-- The governance guarantee: only ONE active interest per (worker, job) can exist at a time.
-- Idempotent Express-Interest relies on this (a concurrent double-submit hits P2002).
CREATE UNIQUE INDEX "worker_job_interests_active_worker_job_key"
    ON "worker_job_interests" ("worker_identity_id", "job_request_id")
    WHERE "status" NOT IN ('withdrawn', 'not_selected');

ALTER TABLE "worker_job_interests"
    ADD CONSTRAINT "worker_job_interests_worker_identity_id_fkey"
    FOREIGN KEY ("worker_identity_id") REFERENCES "worker_identities" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "worker_job_interests"
    ADD CONSTRAINT "worker_job_interests_job_request_id_fkey"
    FOREIGN KEY ("job_request_id") REFERENCES "job_requests" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "worker_job_interests"
    ADD CONSTRAINT "worker_job_interests_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "employer_organizations" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
