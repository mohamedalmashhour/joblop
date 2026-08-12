-- HR-5.1 Payroll hardening. The worked-time reference becomes an immutable TIME + RATE snapshot:
-- it records the shift window, role scope, worksite, and the governed EmployerContract rate that
-- was effective at the shift's start instant, so a later contract/rate change can never re-base an
-- existing calculation and the calculation is reproducible from its own snapshot. A deterministic
-- calculation fingerprint and earning-line provenance are added. No money execution, no PAID state.

ALTER TABLE "payroll_worked_time_references"
  ADD COLUMN "scheduled_start_at" TIMESTAMPTZ(3) NOT NULL DEFAULT '1970-01-01T00:00:00Z',
  ADD COLUMN "scheduled_end_at" TIMESTAMPTZ(3) NOT NULL DEFAULT '1970-01-01T00:00:00Z',
  ADD COLUMN "assignment_id" UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  ADD COLUMN "work_group_id" UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  ADD COLUMN "role_definition_id" UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  ADD COLUMN "residence_id" UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  ADD COLUMN "compensation_type" TEXT NOT NULL DEFAULT 'hourly',
  ADD COLUMN "contract_id" UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  ADD COLUMN "contract_version" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "contract_effective_from" TIMESTAMPTZ(3) NOT NULL DEFAULT '1970-01-01T00:00:00Z',
  ADD COLUMN "applied_hourly_rate_minor" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'CAD',
  ADD COLUMN "source_effective_instant" TIMESTAMPTZ(3) NOT NULL DEFAULT '1970-01-01T00:00:00Z';

-- Drop the temporary backfill defaults; new rows must always supply these snapshot columns.
ALTER TABLE "payroll_worked_time_references"
  ALTER COLUMN "scheduled_start_at" DROP DEFAULT,
  ALTER COLUMN "scheduled_end_at" DROP DEFAULT,
  ALTER COLUMN "assignment_id" DROP DEFAULT,
  ALTER COLUMN "work_group_id" DROP DEFAULT,
  ALTER COLUMN "role_definition_id" DROP DEFAULT,
  ALTER COLUMN "residence_id" DROP DEFAULT,
  ALTER COLUMN "contract_id" DROP DEFAULT,
  ALTER COLUMN "contract_version" DROP DEFAULT,
  ALTER COLUMN "contract_effective_from" DROP DEFAULT,
  ALTER COLUMN "applied_hourly_rate_minor" DROP DEFAULT,
  ALTER COLUMN "source_effective_instant" DROP DEFAULT;

ALTER TABLE "payroll_calculations"
  ADD COLUMN "calculation_fingerprint" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "worker_classification" TEXT NOT NULL DEFAULT 'employee';

ALTER TABLE "payroll_earning_lines"
  ADD COLUMN "source_contract_id" UUID,
  ADD COLUMN "source_contract_version" TEXT;
