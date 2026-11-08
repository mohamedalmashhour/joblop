-- Job bonus: a bonus offered to attract workers to an approved job that is still not filled.
-- Employer-funded (offered -> accepted/declined, billed on the employer invoice) or platform-funded
-- (approved by staff). Additive only: three new enums, one new table, one new defaulted column.
CREATE TYPE "JobBonusKind" AS ENUM ('hourly', 'transport', 'one_time');
CREATE TYPE "JobBonusFunding" AS ENUM ('employer', 'platform');
CREATE TYPE "JobBonusStatus" AS ENUM ('offered_to_employer', 'employer_accepted', 'employer_declined', 'approved', 'cancelled');

CREATE TABLE "job_bonuses" (
    "id" UUID NOT NULL,
    "job_request_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "kind" "JobBonusKind" NOT NULL,
    "funded_by" "JobBonusFunding" NOT NULL,
    "status" "JobBonusStatus" NOT NULL,
    "amount_minor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CAD',
    "suggested_by_system" BOOLEAN NOT NULL DEFAULT false,
    "urgent_override" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT,
    "created_by_user_id" UUID NOT NULL,
    "decided_by_user_id" UUID,
    "offered_at" TIMESTAMPTZ(3),
    "responded_at" TIMESTAMPTZ(3),
    "approved_at" TIMESTAMPTZ(3),
    "cancelled_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "job_bonuses_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "job_bonuses_amount_minor_positive" CHECK ("amount_minor" > 0)
);

CREATE INDEX "job_bonuses_job_request_id_status_idx" ON "job_bonuses"("job_request_id", "status");

ALTER TABLE "job_bonuses" ADD CONSTRAINT "job_bonuses_job_request_id_fkey" FOREIGN KEY ("job_request_id") REFERENCES "job_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Bonus paid on each payroll worked-time snapshot (0 for every existing row).
ALTER TABLE "payroll_worked_time_references" ADD COLUMN "bonus_minor" INTEGER NOT NULL DEFAULT 0;
