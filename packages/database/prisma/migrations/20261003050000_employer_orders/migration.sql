-- CreateEnum: multi-role employer order status (rolled up from child job requests)
CREATE TYPE "EmployerOrderStatus" AS ENUM ('draft', 'submitted', 'admin_review', 'partially_approved', 'approved', 'cancelled', 'expired');

-- CreateTable: employer_order_sequences — per-year counter for human order numbers (mirrors job_request_sequences)
CREATE TABLE "employer_order_sequences" (
    "scope_year" INTEGER NOT NULL,
    "last_value" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "employer_order_sequences_pkey" PRIMARY KEY ("scope_year")
);

-- CreateIndex
CREATE INDEX "employer_order_sequences_scope_year_idx" ON "employer_order_sequences"("scope_year");

-- CreateTable: employer_orders — one employer submission grouping several job requests (one per role
-- line), sharing a worksite + time window. Children keep their own governed pricing/approval/dispatch;
-- the order is the grouping + single submit/cancel + combined view. residence_id/department_id/
-- creator_user_id are app-validated against the org (children carry the enforced FKs).
CREATE TABLE "employer_orders" (
    "id" UUID NOT NULL,
    "order_number" TEXT NOT NULL,
    "organization_id" UUID NOT NULL,
    "residence_id" UUID NOT NULL,
    "department_id" UUID NOT NULL,
    "creator_user_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "note" TEXT,
    "request_type" "JobRequestType" NOT NULL,
    "urgency" "JobRequestUrgency" NOT NULL DEFAULT 'normal',
    "timezone" TEXT NOT NULL,
    "start_at" TIMESTAMPTZ(3) NOT NULL,
    "end_at" TIMESTAMPTZ(3) NOT NULL,
    "status" "EmployerOrderStatus" NOT NULL DEFAULT 'draft',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_by_user_id" UUID NOT NULL,
    "updated_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "submitted_at" TIMESTAMPTZ(3),
    "cancelled_at" TIMESTAMPTZ(3),

    CONSTRAINT "employer_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "employer_orders_order_number_key" ON "employer_orders"("order_number");

-- CreateIndex
CREATE INDEX "employer_orders_org_status_created_idx" ON "employer_orders"("organization_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "employer_orders_org_residence_status_idx" ON "employer_orders"("organization_id", "residence_id", "status");

-- AddForeignKey
ALTER TABLE "employer_orders" ADD CONSTRAINT "employer_orders_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "employer_organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: link job requests to their parent order (nullable; a standalone request has none)
ALTER TABLE "job_requests" ADD COLUMN "order_id" UUID;

-- CreateIndex
CREATE INDEX "job_requests_order_id_created_at_idx" ON "job_requests"("order_id", "created_at");

-- AddForeignKey
ALTER TABLE "job_requests" ADD CONSTRAINT "job_requests_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "employer_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
