-- HR-5: Payroll / Finance FOUNDATION (TEST / SYNTHETIC — no execution). Payroll consumes
-- approved/locked worked time and produces a governed calculation snapshot. It never recomputes
-- attendance and never moves money. No `paid` state, no banking/remittance model. Jurisdiction is
-- modelled explicitly by country + region. Money is integer minor units with an explicit currency.

CREATE TYPE "PayrollPeriodStatus" AS ENUM ('open', 'calculating', 'review', 'approved', 'locked');
CREATE TYPE "PayrollCalculationStatus" AS ENUM ('calculated', 'in_review', 'approved', 'rejected', 'superseded', 'locked');
CREATE TYPE "PayrollDeductionCategory" AS ENUM ('statutory', 'benefit', 'voluntary', 'garnishment', 'other');

CREATE TABLE "payroll_periods" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "jurisdiction_country" TEXT NOT NULL,
    "jurisdiction_region" TEXT NOT NULL,
    "period_start" TIMESTAMPTZ(3) NOT NULL,
    "period_end" TIMESTAMPTZ(3) NOT NULL,
    "timezone" TEXT NOT NULL,
    "status" "PayrollPeriodStatus" NOT NULL DEFAULT 'open',
    "currency" TEXT NOT NULL,
    "rule_provider_key" TEXT NOT NULL,
    "rule_provider_version" TEXT NOT NULL,
    "synthetic" BOOLEAN NOT NULL DEFAULT true,
    "created_by_user_id" UUID NOT NULL,
    "reviewed_by_user_id" UUID,
    "approved_by_user_id" UUID,
    "locked_by_user_id" UUID,
    "approved_at" TIMESTAMPTZ(3),
    "locked_at" TIMESTAMPTZ(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "payroll_periods_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "payroll_periods_period_window_check" CHECK ("period_end" > "period_start")
);
CREATE UNIQUE INDEX "payroll_periods_org_jurisdiction_window_key" ON "payroll_periods" ("organization_id", "jurisdiction_country", "jurisdiction_region", "period_start", "period_end");
CREATE INDEX "payroll_periods_org_status_start_idx" ON "payroll_periods" ("organization_id", "status", "period_start");
CREATE INDEX "payroll_periods_jurisdiction_status_idx" ON "payroll_periods" ("jurisdiction_country", "jurisdiction_region", "status");
CREATE INDEX "payroll_periods_status_start_idx" ON "payroll_periods" ("status", "period_start");

CREATE TABLE "payroll_calculations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "payroll_period_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "worker_identity_id" UUID NOT NULL,
    "revision" INTEGER NOT NULL,
    "status" "PayrollCalculationStatus" NOT NULL DEFAULT 'calculated',
    "jurisdiction_country" TEXT NOT NULL,
    "jurisdiction_region" TEXT NOT NULL,
    "rule_provider_key" TEXT NOT NULL,
    "rule_provider_version" TEXT NOT NULL,
    "calculation_policy_version" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "gross_pay_minor" INTEGER NOT NULL,
    "total_deductions_minor" INTEGER NOT NULL,
    "net_pay_minor" INTEGER NOT NULL,
    "total_employer_cost_minor" INTEGER NOT NULL,
    "synthetic" BOOLEAN NOT NULL DEFAULT true,
    "calculated_at" TIMESTAMPTZ(3) NOT NULL,
    "created_by_user_id" UUID NOT NULL,
    "reviewed_by_user_id" UUID,
    "approved_by_user_id" UUID,
    "rejected_by_user_id" UUID,
    "approved_at" TIMESTAMPTZ(3),
    "rejected_at" TIMESTAMPTZ(3),
    "superseded_by_id" UUID,
    "review_note" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "payroll_calculations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "payroll_calculations_period_worker_revision_key" ON "payroll_calculations" ("payroll_period_id", "worker_identity_id", "revision");
CREATE INDEX "payroll_calculations_org_period_idx" ON "payroll_calculations" ("organization_id", "payroll_period_id");
CREATE INDEX "payroll_calculations_worker_period_idx" ON "payroll_calculations" ("worker_identity_id", "payroll_period_id");
CREATE INDEX "payroll_calculations_period_status_idx" ON "payroll_calculations" ("payroll_period_id", "status");
CREATE INDEX "payroll_calculations_jurisdiction_idx" ON "payroll_calculations" ("jurisdiction_country", "jurisdiction_region");

CREATE TABLE "payroll_worked_time_references" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "payroll_calculation_id" UUID NOT NULL,
    "timesheet_id" UUID NOT NULL,
    "timesheet_version" INTEGER NOT NULL,
    "timesheet_status" TEXT NOT NULL,
    "payable_minutes" INTEGER NOT NULL,
    "billable_minutes" INTEGER NOT NULL,
    CONSTRAINT "payroll_worked_time_references_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "payroll_worked_time_refs_calculation_idx" ON "payroll_worked_time_references" ("payroll_calculation_id");
CREATE INDEX "payroll_worked_time_refs_timesheet_idx" ON "payroll_worked_time_references" ("timesheet_id");

CREATE TABLE "payroll_earning_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "payroll_calculation_id" UUID NOT NULL,
    "classification" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity_minutes" INTEGER,
    "rate_minor" INTEGER,
    "amount_minor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "payroll_earning_lines_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "payroll_earning_lines_calculation_idx" ON "payroll_earning_lines" ("payroll_calculation_id");

CREATE TABLE "payroll_deduction_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "payroll_calculation_id" UUID NOT NULL,
    "category" "PayrollDeductionCategory" NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount_minor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "payroll_deduction_lines_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "payroll_deduction_lines_calculation_idx" ON "payroll_deduction_lines" ("payroll_calculation_id");

CREATE TABLE "payroll_employer_cost_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "payroll_calculation_id" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount_minor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "payroll_employer_cost_lines_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "payroll_employer_cost_lines_calculation_idx" ON "payroll_employer_cost_lines" ("payroll_calculation_id");

-- Referential integrity to external authorities (org/worker) + internal parent/child links.
ALTER TABLE "payroll_periods" ADD CONSTRAINT "payroll_periods_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "employer_organizations" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payroll_calculations" ADD CONSTRAINT "payroll_calculations_payroll_period_id_fkey" FOREIGN KEY ("payroll_period_id") REFERENCES "payroll_periods" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payroll_calculations" ADD CONSTRAINT "payroll_calculations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "employer_organizations" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payroll_calculations" ADD CONSTRAINT "payroll_calculations_worker_identity_id_fkey" FOREIGN KEY ("worker_identity_id") REFERENCES "worker_identities" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payroll_worked_time_references" ADD CONSTRAINT "payroll_worked_time_references_payroll_calculation_id_fkey" FOREIGN KEY ("payroll_calculation_id") REFERENCES "payroll_calculations" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payroll_earning_lines" ADD CONSTRAINT "payroll_earning_lines_payroll_calculation_id_fkey" FOREIGN KEY ("payroll_calculation_id") REFERENCES "payroll_calculations" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payroll_deduction_lines" ADD CONSTRAINT "payroll_deduction_lines_payroll_calculation_id_fkey" FOREIGN KEY ("payroll_calculation_id") REFERENCES "payroll_calculations" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payroll_employer_cost_lines" ADD CONSTRAINT "payroll_employer_cost_lines_payroll_calculation_id_fkey" FOREIGN KEY ("payroll_calculation_id") REFERENCES "payroll_calculations" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
