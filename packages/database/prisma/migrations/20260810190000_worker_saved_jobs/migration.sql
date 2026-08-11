-- Worker-saved marketplace jobs. User(worker)-scoped bookmarks of open opportunities.
-- Idempotent by construction: unique (worker_identity_id, job_request_id).

CREATE TABLE "worker_saved_jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "worker_identity_id" UUID NOT NULL,
    "job_request_id" UUID NOT NULL,
    "saved_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "worker_saved_jobs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "worker_saved_jobs_worker_job_key"
    ON "worker_saved_jobs" ("worker_identity_id", "job_request_id");

CREATE INDEX "worker_saved_jobs_worker_saved_at_idx"
    ON "worker_saved_jobs" ("worker_identity_id", "saved_at");

ALTER TABLE "worker_saved_jobs"
    ADD CONSTRAINT "worker_saved_jobs_worker_identity_id_fkey"
    FOREIGN KEY ("worker_identity_id") REFERENCES "worker_identities" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "worker_saved_jobs"
    ADD CONSTRAINT "worker_saved_jobs_job_request_id_fkey"
    FOREIGN KEY ("job_request_id") REFERENCES "job_requests" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
