-- Dynamic offer engine P4b: client intake signals (what the client needs), captured from the client
-- page and used as the willingness-to-pay ceiling. One per job. Additive; no money flows.
CREATE TABLE "client_intake_signals" (
    "job_request_id" UUID NOT NULL,
    "organization_id" UUID,
    "urgency" TEXT NOT NULL DEFAULT 'normal',
    "budget_flexibility" TEXT NOT NULL DEFAULT 'normal',
    "willingness_to_pay_per_hour_minor" INTEGER NOT NULL,
    "notes" TEXT,
    "updated_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
    CONSTRAINT "client_intake_signals_pkey" PRIMARY KEY ("job_request_id")
);
ALTER TABLE "client_intake_signals" ADD CONSTRAINT "cis_urgency_check" CHECK ("urgency" IN ('low','normal','high','urgent'));
ALTER TABLE "client_intake_signals" ADD CONSTRAINT "cis_flex_check" CHECK ("budget_flexibility" IN ('tight','normal','flexible'));
