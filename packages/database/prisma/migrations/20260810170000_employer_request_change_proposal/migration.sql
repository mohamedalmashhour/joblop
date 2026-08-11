-- CreateEnum
CREATE TYPE "EmployerRequestChangeProposalStatus" AS ENUM ('proposed', 'reconfirmation_pending', 'completed', 'rejected', 'requires_reconciliation', 'cancelled');

-- CreateTable
CREATE TABLE "employer_request_change_proposals" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "job_request_id" UUID NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "base_request_version" INTEGER NOT NULL,
    "status" "EmployerRequestChangeProposalStatus" NOT NULL DEFAULT 'proposed',
    "material_fields" JSONB NOT NULL,
    "proposed_values" JSONB NOT NULL,
    "affected_assignment_ids" JSONB NOT NULL,
    "original_terms_version" INTEGER NOT NULL,
    "proposed_terms_version" INTEGER NOT NULL,
    "governed_rate_minor" INTEGER,
    "currency" TEXT,
    "reason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "employer_request_change_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "employer_request_change_proposals_org_status_idx" ON "employer_request_change_proposals"("organization_id", "status");

-- CreateIndex
CREATE INDEX "employer_request_change_proposals_job_request_id_idx" ON "employer_request_change_proposals"("job_request_id");

-- AddForeignKey
ALTER TABLE "employer_request_change_proposals" ADD CONSTRAINT "employer_request_change_proposals_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "employer_organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employer_request_change_proposals" ADD CONSTRAINT "employer_request_change_proposals_job_request_id_fkey" FOREIGN KEY ("job_request_id") REFERENCES "job_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
