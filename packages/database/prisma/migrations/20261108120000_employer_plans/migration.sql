-- Employer fixed plans, split by job length (short_term / long_term). Additive only: two new tables,
-- a defaulted job_length column on job_requests (every existing job stays short_term) and three
-- nullable/defaulted columns on request_pricing_snapshots. Gated behind EMPLOYER_PLANS_ENABLED
-- (default off); with the flag off nothing reads or writes the plan tables and every snapshot keeps
-- employer_plan_code NULL, employer_plan_discount_ppm 0 and job_length NULL. The worker rate never
-- changes because of a plan.
-- AlterTable
ALTER TABLE "job_requests" ADD COLUMN     "job_length" TEXT NOT NULL DEFAULT 'short_term';

-- AlterTable
ALTER TABLE "request_pricing_snapshots" ADD COLUMN     "employer_plan_code" TEXT,
ADD COLUMN     "employer_plan_discount_ppm" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "job_length" TEXT;

-- CreateTable
CREATE TABLE "employer_plans" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "track" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "trial_ends_at" TIMESTAMPTZ(3),
    "current_period_end" TIMESTAMPTZ(3),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "trial_used_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "employer_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employer_plan_orders" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "plan" TEXT NOT NULL,
    "price_minor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "period_months" INTEGER NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'e_transfer',
    "status" TEXT NOT NULL,
    "payment_ref" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "paid_at" TIMESTAMPTZ(3),

    CONSTRAINT "employer_plan_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "employer_plans_organization_track_key" ON "employer_plans"("organization_id", "track");

-- CreateIndex
CREATE INDEX "employer_plan_orders_org_status_idx" ON "employer_plan_orders"("organization_id", "status");

-- CreateIndex
CREATE INDEX "employer_plan_orders_status_created_idx" ON "employer_plan_orders"("status", "created_at");

-- AddForeignKey
ALTER TABLE "employer_plans" ADD CONSTRAINT "employer_plans_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "employer_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employer_plan_orders" ADD CONSTRAINT "employer_plan_orders_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "employer_organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

