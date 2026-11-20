-- Launch step 5 (matching). Additive only: new nullable or defaulted columns and one new table; no
-- existing column, row or constraint is changed.
--   job_requests: the certificates the employer requires (keys) + the free text of an "other" one.
--   hr_documents: the certificate a staff member verified a generic document as.
--   worker_offers: a staff certificate override (who, when, why), also written to audit_events.
--   worker_job_interests: the employer's choice on a long-term applicant and when contact was shown.
--   unfilled_shift_alerts: one row per staff warning (job, threshold, start) so each goes out once.

-- AlterTable
ALTER TABLE "job_requests" ADD COLUMN     "required_certificate_other" TEXT,
ADD COLUMN     "required_certificates" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "hr_documents" ADD COLUMN     "verified_certificate_key" TEXT;

-- AlterTable
ALTER TABLE "worker_offers" ADD COLUMN     "certificate_override_at" TIMESTAMPTZ(3),
ADD COLUMN     "certificate_override_by_user_id" UUID,
ADD COLUMN     "certificate_override_reason" TEXT;

-- AlterTable
ALTER TABLE "worker_job_interests" ADD COLUMN     "employer_contact_revealed_at" TIMESTAMPTZ(3),
ADD COLUMN     "employer_decided_at" TIMESTAMPTZ(3),
ADD COLUMN     "employer_decided_by_user_id" UUID,
ADD COLUMN     "employer_decision" TEXT;

-- CreateTable
CREATE TABLE "unfilled_shift_alerts" (
    "id" UUID NOT NULL,
    "job_request_id" UUID NOT NULL,
    "threshold_hours" INTEGER NOT NULL,
    "start_at" TIMESTAMPTZ(3) NOT NULL,
    "openings" INTEGER NOT NULL,
    "filled" INTEGER NOT NULL,
    "emailed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unfilled_shift_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "unfilled_shift_alerts_created_at_idx" ON "unfilled_shift_alerts"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "unfilled_shift_alerts_job_threshold_start_key" ON "unfilled_shift_alerts"("job_request_id", "threshold_hours", "start_at");

-- AddForeignKey
ALTER TABLE "unfilled_shift_alerts" ADD CONSTRAINT "unfilled_shift_alerts_job_request_id_fkey" FOREIGN KEY ("job_request_id") REFERENCES "job_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
