CREATE TYPE "CalendarVerificationState" AS ENUM (
  'pending',
  'verified',
  'failed',
  'unavailable'
);

CREATE TABLE "staffing_request_calendar_profiles" (
  "id" UUID NOT NULL,
  "job_request_id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "residence_id" UUID NOT NULL,
  "duties_summary" TEXT,
  "qualifications" JSONB NOT NULL,
  "address_summary" TEXT,
  "special_instructions" TEXT,
  "contract_verification_state" "CalendarVerificationState" NOT NULL DEFAULT 'pending',
  "payment_method_readiness_state" "CalendarVerificationState" NOT NULL DEFAULT 'pending',
  "location_verification_state" "CalendarVerificationState" NOT NULL DEFAULT 'pending',
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_by_user_id" UUID NOT NULL,
  "updated_by_user_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "staffing_request_calendar_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "staffing_request_calendar_profiles_job_request_id_key"
  ON "staffing_request_calendar_profiles"("job_request_id");

CREATE INDEX "staffing_request_calendar_profiles_org_updated_idx"
  ON "staffing_request_calendar_profiles"("organization_id", "updated_at");

CREATE INDEX "staffing_request_calendar_profiles_residence_updated_idx"
  ON "staffing_request_calendar_profiles"("residence_id", "updated_at");

ALTER TABLE "staffing_request_calendar_profiles"
  ADD CONSTRAINT "staffing_request_calendar_profiles_job_request_id_fkey"
  FOREIGN KEY ("job_request_id") REFERENCES "job_requests"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
