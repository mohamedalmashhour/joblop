-- ACR-0005 — persisted advisory job-grading audit: the gender-neutral, deterministic pay-equity
-- record of WHY a tier was assigned (Québec Loi sur l'équité salariale defensibility). ADVISORY ONLY —
-- no money is moved by this table and no payment/financial data is stored. Append-only in practice.
CREATE TABLE "job_grading_audit" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "job_request_id" UUID,
    "created_by_user_id" UUID NOT NULL,
    "family" TEXT NOT NULL,
    "tier" INTEGER NOT NULL,
    "tier_ceiling" INTEGER NOT NULL,
    "raw_score" INTEGER NOT NULL,
    "normalized_score" DOUBLE PRECISION NOT NULL,
    "degree_skill" INTEGER NOT NULL,
    "degree_effort" INTEGER NOT NULL,
    "degree_responsibility" INTEGER NOT NULL,
    "degree_working_conditions" INTEGER NOT NULL,
    "factor_weights" JSONB NOT NULL,
    "band_currency" TEXT NOT NULL,
    "band_min_minor" INTEGER NOT NULL,
    "band_mid_minor" INTEGER NOT NULL,
    "band_max_minor" INTEGER NOT NULL,
    "band_multiplier" DOUBLE PRECISION NOT NULL,
    "engagement" TEXT NOT NULL,
    "premium_ppm" INTEGER NOT NULL,
    "needs_human_review" BOOLEAN NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "evaluated_by" TEXT NOT NULL,
    "audit_note_en" TEXT NOT NULL,
    "audit_note_fr" TEXT NOT NULL,
    "engine_version" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
    CONSTRAINT "job_grading_audit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "job_grading_audit_org_idx" ON "job_grading_audit" ("organization_id");
CREATE INDEX "job_grading_audit_job_request_idx" ON "job_grading_audit" ("job_request_id");

ALTER TABLE "job_grading_audit"
    ADD CONSTRAINT "job_grading_audit_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "employer_organizations" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "job_grading_audit"
    ADD CONSTRAINT "job_grading_audit_job_request_id_fkey"
    FOREIGN KEY ("job_request_id") REFERENCES "job_requests" ("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "job_grading_audit"
    ADD CONSTRAINT "job_grading_audit_created_by_user_id_fkey"
    FOREIGN KEY ("created_by_user_id") REFERENCES "users" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
