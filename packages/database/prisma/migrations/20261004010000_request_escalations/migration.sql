-- CreateEnum: owner-escalation lifecycle
CREATE TYPE "RequestEscalationStatus" AS ENUM ('open', 'resolved', 'dismissed');

-- CreateTable: request_escalations — a role line flagged for the platform owners' judgement. Resolving
-- it is a human decision; the governed intake transition still performs any approval. Workflow state
-- only; it never prices, pays, or bills.
CREATE TABLE "request_escalations" (
    "id" UUID NOT NULL,
    "job_request_id" UUID NOT NULL,
    "order_id" UUID,
    "organization_id" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "RequestEscalationStatus" NOT NULL DEFAULT 'open',
    "raised_by_user_id" UUID NOT NULL,
    "resolved_by_user_id" UUID,
    "resolution" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMPTZ(3),
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "request_escalations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "request_escalations_status_created_idx" ON "request_escalations"("status", "created_at");

-- CreateIndex
CREATE INDEX "request_escalations_request_status_idx" ON "request_escalations"("job_request_id", "status");

-- AddForeignKey
ALTER TABLE "request_escalations" ADD CONSTRAINT "request_escalations_job_request_id_fkey" FOREIGN KEY ("job_request_id") REFERENCES "job_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
