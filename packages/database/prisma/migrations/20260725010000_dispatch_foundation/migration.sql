-- Resident Job Dispatch Foundation.
-- Scope: dispatch review and dispatch candidate evaluation-summary boundary only.
-- Deferred: worker offers, assignments, worker calendars, dispatch attempts, replacement links,
-- full candidate evaluation records, attendance, timesheets, finance, notifications, AI execution, and reporting.

CREATE TYPE "DispatchReviewStatus" AS ENUM ('draft', 'active', 'candidate_review', 'shortlist_ready', 'offer_preparation', 'paused', 'cancelled', 'closed');
CREATE TYPE "DispatchType" AS ENUM ('initial', 'replacement_reserved');
CREATE TYPE "DispatchPriority" AS ENUM ('normal', 'urgent', 'emergency');
CREATE TYPE "DispatchCandidateSourceType" AS ENUM ('internal_worker_profile', 'invited_worker', 'staffing_partner', 'enterprise_employee_pool', 'external_integration', 'imported_record', 'unavailable');
CREATE TYPE "DispatchMatchState" AS ENUM ('match', 'partial_match', 'no_match', 'not_evaluated');
CREATE TYPE "DispatchSummaryState" AS ENUM ('meets_requirements', 'partially_meets', 'missing_required', 'verification_pending', 'expired', 'not_evaluated');
CREATE TYPE "DispatchAvailabilityState" AS ENUM ('available', 'partially_available', 'unavailable', 'not_evaluated', 'source_unavailable');
CREATE TYPE "DispatchConflictState" AS ENUM ('conflict_free', 'conflict_detected', 'not_evaluated', 'source_unavailable');
CREATE TYPE "DispatchServiceAreaState" AS ENUM ('inside_service_area', 'outside_service_area', 'not_evaluated', 'source_unavailable');
CREATE TYPE "DispatchTravelState" AS ENUM ('suitable', 'unsuitable', 'unknown', 'not_evaluated', 'source_unavailable');
CREATE TYPE "DispatchTransportState" AS ENUM ('available', 'unavailable', 'unknown', 'not_evaluated', 'source_unavailable');
CREATE TYPE "DispatchRecommendationState" AS ENUM ('not_evaluated', 'recommended', 'not_recommended', 'alternative', 'unavailable');
CREATE TYPE "DispatchShortlistState" AS ENUM ('not_shortlisted', 'shortlisted', 'removed');

CREATE TABLE "dispatch_reviews" (
    "id" UUID NOT NULL,
    "job_request_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "residence_id" UUID NOT NULL,
    "department_id" UUID NOT NULL,
    "work_group_id" UUID NOT NULL,
    "role_definition_id" UUID NOT NULL,
    "dispatch_type" "DispatchType" NOT NULL DEFAULT 'initial',
    "state" "DispatchReviewStatus" NOT NULL DEFAULT 'draft',
    "operational_owner_user_id" UUID,
    "priority" "DispatchPriority" NOT NULL DEFAULT 'normal',
    "urgency" "JobRequestUrgency" NOT NULL DEFAULT 'normal',
    "required_worker_count" INTEGER NOT NULL,
    "shortlisted_candidate_count" INTEGER NOT NULL DEFAULT 0,
    "prepared_offer_count" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMPTZ(3),
    "paused_at" TIMESTAMPTZ(3),
    "cancelled_at" TIMESTAMPTZ(3),
    "closed_at" TIMESTAMPTZ(3),
    "created_by_user_id" UUID NOT NULL,
    "updated_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "dispatch_reviews_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "dispatch_reviews_required_worker_count_check" CHECK ("required_worker_count" > 0),
    CONSTRAINT "dispatch_reviews_shortlisted_candidate_count_check" CHECK ("shortlisted_candidate_count" >= 0),
    CONSTRAINT "dispatch_reviews_prepared_offer_count_check" CHECK ("prepared_offer_count" >= 0),
    CONSTRAINT "dispatch_reviews_version_check" CHECK ("version" >= 1),
    CONSTRAINT "dispatch_reviews_shortlist_not_above_required_check" CHECK ("shortlisted_candidate_count" <= "required_worker_count"),
    CONSTRAINT "dispatch_reviews_prepared_not_above_required_check" CHECK ("prepared_offer_count" <= "required_worker_count")
);

CREATE TABLE "dispatch_candidates" (
    "id" UUID NOT NULL,
    "dispatch_review_id" UUID NOT NULL,
    "candidate_source_type" "DispatchCandidateSourceType" NOT NULL,
    "candidate_source_reference" TEXT NOT NULL,
    "approved_display_name" TEXT NOT NULL,
    "work_group_match" "DispatchMatchState" NOT NULL DEFAULT 'not_evaluated',
    "role_definition_match" "DispatchMatchState" NOT NULL DEFAULT 'not_evaluated',
    "qualification_summary_state" "DispatchSummaryState" NOT NULL DEFAULT 'not_evaluated',
    "verification_summary_state" "DispatchSummaryState" NOT NULL DEFAULT 'not_evaluated',
    "availability_state" "DispatchAvailabilityState" NOT NULL DEFAULT 'not_evaluated',
    "schedule_conflict_state" "DispatchConflictState" NOT NULL DEFAULT 'not_evaluated',
    "service_area_state" "DispatchServiceAreaState" NOT NULL DEFAULT 'not_evaluated',
    "travel_suitability_state" "DispatchTravelState" NOT NULL DEFAULT 'not_evaluated',
    "transport_constraint_state" "DispatchTransportState" NOT NULL DEFAULT 'not_evaluated',
    "recommendation_state" "DispatchRecommendationState" NOT NULL DEFAULT 'not_evaluated',
    "shortlist_state" "DispatchShortlistState" NOT NULL DEFAULT 'not_shortlisted',
    "shortlist_order" INTEGER,
    "source_freshness_at" TIMESTAMPTZ(3),
    "last_evaluated_at" TIMESTAMPTZ(3),
    "evaluation_version" INTEGER NOT NULL DEFAULT 1,
    "added_by_user_id" UUID,
    "removed_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "dispatch_candidates_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "dispatch_candidates_shortlist_order_check" CHECK ("shortlist_order" IS NULL OR "shortlist_order" > 0),
    CONSTRAINT "dispatch_candidates_evaluation_version_check" CHECK ("evaluation_version" >= 1),
    CONSTRAINT "dispatch_candidates_version_check" CHECK ("version" >= 1)
);

CREATE INDEX "dispatch_reviews_job_request_id_idx" ON "dispatch_reviews"("job_request_id");
CREATE INDEX "dispatch_reviews_organization_id_state_updated_at_idx" ON "dispatch_reviews"("organization_id", "state", "updated_at");
CREATE INDEX "dispatch_reviews_operational_owner_user_id_state_idx" ON "dispatch_reviews"("operational_owner_user_id", "state");
CREATE INDEX "dispatch_reviews_residence_id_state_idx" ON "dispatch_reviews"("residence_id", "state");
CREATE INDEX "dispatch_reviews_department_id_state_idx" ON "dispatch_reviews"("department_id", "state");
CREATE UNIQUE INDEX "dispatch_reviews_one_non_terminal_per_job_request_idx"
  ON "dispatch_reviews"("job_request_id")
  WHERE "state" IN ('draft', 'active', 'candidate_review', 'shortlist_ready', 'offer_preparation', 'paused');

CREATE UNIQUE INDEX "dispatch_candidates_review_source_ref_key" ON "dispatch_candidates"("dispatch_review_id", "candidate_source_reference");
CREATE INDEX "dispatch_candidates_dispatch_review_id_shortlist_state_idx" ON "dispatch_candidates"("dispatch_review_id", "shortlist_state");
CREATE INDEX "dispatch_candidates_dispatch_review_id_source_freshness_at_idx" ON "dispatch_candidates"("dispatch_review_id", "source_freshness_at");
CREATE INDEX "dispatch_candidates_candidate_source_reference_idx" ON "dispatch_candidates"("candidate_source_reference");

ALTER TABLE "dispatch_reviews" ADD CONSTRAINT "dispatch_reviews_job_request_id_fkey" FOREIGN KEY ("job_request_id") REFERENCES "job_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dispatch_reviews" ADD CONSTRAINT "dispatch_reviews_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "employer_organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dispatch_reviews" ADD CONSTRAINT "dispatch_reviews_organization_id_residence_id_fkey" FOREIGN KEY ("organization_id", "residence_id") REFERENCES "residences"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dispatch_reviews" ADD CONSTRAINT "dispatch_reviews_organization_id_residence_id_department_id_fkey" FOREIGN KEY ("organization_id", "residence_id", "department_id") REFERENCES "departments"("organization_id", "residence_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dispatch_reviews" ADD CONSTRAINT "dispatch_reviews_work_group_id_fkey" FOREIGN KEY ("work_group_id") REFERENCES "work_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dispatch_reviews" ADD CONSTRAINT "dispatch_reviews_work_group_id_role_definition_id_fkey" FOREIGN KEY ("work_group_id", "role_definition_id") REFERENCES "role_definitions"("work_group_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dispatch_reviews" ADD CONSTRAINT "dispatch_reviews_operational_owner_user_id_fkey" FOREIGN KEY ("operational_owner_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "dispatch_reviews" ADD CONSTRAINT "dispatch_reviews_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dispatch_reviews" ADD CONSTRAINT "dispatch_reviews_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "dispatch_candidates" ADD CONSTRAINT "dispatch_candidates_dispatch_review_id_fkey" FOREIGN KEY ("dispatch_review_id") REFERENCES "dispatch_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dispatch_candidates" ADD CONSTRAINT "dispatch_candidates_added_by_user_id_fkey" FOREIGN KEY ("added_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "dispatch_candidates" ADD CONSTRAINT "dispatch_candidates_removed_by_user_id_fkey" FOREIGN KEY ("removed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
