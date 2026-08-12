-- HR-5.1 Chunk 3: governed corrections / revision lineage. Adds a family/revision lineage, a
-- signed-by-direction delta model (never negative Money), idempotency + one-current-revision
-- invariants at the DB layer, and triggers that make LOCKED payroll history immutable. Forward-only,
-- data-preserving (existing calculations backfill familyRootId = their own id). No money execution.

ALTER TABLE "payroll_calculations"
  ADD COLUMN "family_root_id" UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  ADD COLUMN "previous_calculation_id" UUID,
  ADD COLUMN "previous_fingerprint" TEXT,
  ADD COLUMN "correction_type" TEXT,
  ADD COLUMN "correction_reason" TEXT,
  ADD COLUMN "corrected_by_user_id" UUID,
  ADD COLUMN "corrected_at" TIMESTAMPTZ(3),
  ADD COLUMN "correlation_key" TEXT,
  ADD COLUMN "adjusts_calculation_id" UUID,
  ADD COLUMN "adjustment_net_direction" TEXT,
  ADD COLUMN "adjustment_net_delta_minor" INTEGER,
  ADD COLUMN "adjustment_gross_direction" TEXT,
  ADD COLUMN "adjustment_gross_delta_minor" INTEGER,
  ADD COLUMN "adjustment_deductions_direction" TEXT,
  ADD COLUMN "adjustment_deductions_delta_minor" INTEGER,
  ADD COLUMN "adjustment_employer_cost_direction" TEXT,
  ADD COLUMN "adjustment_employer_cost_delta_minor" INTEGER;

-- Backfill: every existing calculation is its own family root.
UPDATE "payroll_calculations" SET "family_root_id" = "id" WHERE "family_root_id" = '00000000-0000-0000-0000-000000000000';
ALTER TABLE "payroll_calculations" ALTER COLUMN "family_root_id" DROP DEFAULT;

-- Correction lineage integrity + governed delta model.
ALTER TABLE "payroll_calculations"
  ADD CONSTRAINT "payroll_calc_correction_type_check" CHECK ("correction_type" IS NULL OR "correction_type" IN ('pre_lock_revision', 'post_lock_adjustment')),
  ADD CONSTRAINT "payroll_calc_net_dir_check" CHECK ("adjustment_net_direction" IS NULL OR "adjustment_net_direction" IN ('credit', 'debit')),
  ADD CONSTRAINT "payroll_calc_gross_dir_check" CHECK ("adjustment_gross_direction" IS NULL OR "adjustment_gross_direction" IN ('credit', 'debit')),
  ADD CONSTRAINT "payroll_calc_ded_dir_check" CHECK ("adjustment_deductions_direction" IS NULL OR "adjustment_deductions_direction" IN ('credit', 'debit')),
  ADD CONSTRAINT "payroll_calc_emp_dir_check" CHECK ("adjustment_employer_cost_direction" IS NULL OR "adjustment_employer_cost_direction" IN ('credit', 'debit')),
  -- absolute deltas are NON-NEGATIVE (direction carries the sign; Money never goes negative)
  ADD CONSTRAINT "payroll_calc_net_delta_nonneg" CHECK ("adjustment_net_delta_minor" IS NULL OR "adjustment_net_delta_minor" >= 0),
  ADD CONSTRAINT "payroll_calc_gross_delta_nonneg" CHECK ("adjustment_gross_delta_minor" IS NULL OR "adjustment_gross_delta_minor" >= 0),
  ADD CONSTRAINT "payroll_calc_ded_delta_nonneg" CHECK ("adjustment_deductions_delta_minor" IS NULL OR "adjustment_deductions_delta_minor" >= 0),
  ADD CONSTRAINT "payroll_calc_emp_delta_nonneg" CHECK ("adjustment_employer_cost_delta_minor" IS NULL OR "adjustment_employer_cost_delta_minor" >= 0),
  -- a post-lock adjustment MUST point at the locked original, carry a reason, and a net direction+delta
  ADD CONSTRAINT "payroll_calc_adjustment_complete" CHECK (
    "correction_type" IS DISTINCT FROM 'post_lock_adjustment'
    OR ("adjusts_calculation_id" IS NOT NULL AND "correction_reason" IS NOT NULL AND "adjustment_net_direction" IS NOT NULL AND "adjustment_net_delta_minor" IS NOT NULL)
  ),
  -- a pre-lock revision (rev > 1) must carry a reason + previous linkage
  ADD CONSTRAINT "payroll_calc_prelock_reason" CHECK (
    "correction_type" IS DISTINCT FROM 'pre_lock_revision'
    OR ("correction_reason" IS NOT NULL AND "previous_calculation_id" IS NOT NULL)
  );

-- Idempotency: a (family, correlation_key) may commit at most once — a duplicate correction retry
-- with the same key cannot create a second revision.
CREATE UNIQUE INDEX "payroll_calc_family_correlation_key" ON "payroll_calculations" ("family_root_id", "correlation_key") WHERE "correlation_key" IS NOT NULL;

-- One-current invariant: at most one live, approvable revision per family (calculated/in_review/
-- approved). Locked + superseded + rejected are terminal/historical and excluded.
CREATE UNIQUE INDEX "payroll_calc_one_current_per_family" ON "payroll_calculations" ("family_root_id") WHERE "status" IN ('calculated', 'in_review', 'approved');

ALTER TABLE "payroll_calculations"
  ADD CONSTRAINT "payroll_calculations_adjusts_fkey" FOREIGN KEY ("adjusts_calculation_id") REFERENCES "payroll_calculations" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── LOCKED immutability at the DB layer ──
-- A locked calculation is terminal history: no row update is permitted once status = 'locked'.
CREATE OR REPLACE FUNCTION "payroll_locked_calc_immutable"() RETURNS trigger AS $$
BEGIN
  IF OLD."status" = 'locked' THEN
    RAISE EXCEPTION 'payroll calculation % is locked and immutable', OLD."id";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "payroll_calc_locked_immutable_trg" BEFORE UPDATE ON "payroll_calculations" FOR EACH ROW EXECUTE FUNCTION "payroll_locked_calc_immutable"();

-- The financial line + worked-time snapshots of an approved OR locked calculation cannot be updated
-- or deleted directly — corrections must create a new governed revision/adjustment instead.
CREATE OR REPLACE FUNCTION "payroll_frozen_child_immutable"() RETURNS trigger AS $$
DECLARE parent_status TEXT;
DECLARE parent_id UUID;
BEGIN
  parent_id := COALESCE(OLD."payroll_calculation_id", NEW."payroll_calculation_id");
  SELECT "status" INTO parent_status FROM "payroll_calculations" WHERE "id" = parent_id;
  IF parent_status IN ('approved', 'locked') THEN
    RAISE EXCEPTION 'payroll financial lines of an %-state calculation are immutable', parent_status;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "payroll_wtr_frozen_trg" BEFORE UPDATE OR DELETE ON "payroll_worked_time_references" FOR EACH ROW EXECUTE FUNCTION "payroll_frozen_child_immutable"();
CREATE TRIGGER "payroll_earn_frozen_trg" BEFORE UPDATE OR DELETE ON "payroll_earning_lines" FOR EACH ROW EXECUTE FUNCTION "payroll_frozen_child_immutable"();
CREATE TRIGGER "payroll_ded_frozen_trg" BEFORE UPDATE OR DELETE ON "payroll_deduction_lines" FOR EACH ROW EXECUTE FUNCTION "payroll_frozen_child_immutable"();
CREATE TRIGGER "payroll_emp_frozen_trg" BEFORE UPDATE OR DELETE ON "payroll_employer_cost_lines" FOR EACH ROW EXECUTE FUNCTION "payroll_frozen_child_immutable"();
