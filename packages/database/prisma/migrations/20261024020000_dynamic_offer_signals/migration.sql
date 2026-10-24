-- Dynamic offer engine P2: signal capture. Worker offer preferences (mutable) + the append-only
-- offer/outcome log that becomes the training set for the learned acceptance/WTP models. Additive;
-- no money flows through these tables. See docs/matching/DYNAMIC_OFFER_ENGINE_DESIGN.md.
CREATE TABLE "worker_offer_preferences" (
    "worker_identity_id" UUID NOT NULL,
    "min_rate_per_hour_minor" INTEGER NOT NULL DEFAULT 0,
    "requires_transport" BOOLEAN NOT NULL DEFAULT false,
    "max_distance_km" INTEGER NOT NULL DEFAULT 100,
    "updated_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
    CONSTRAINT "worker_offer_preferences_pkey" PRIMARY KEY ("worker_identity_id")
);
ALTER TABLE "worker_offer_preferences"
    ADD CONSTRAINT "wop_worker_fk" FOREIGN KEY ("worker_identity_id") REFERENCES "worker_identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "offer_decision_events" (
    "id" UUID NOT NULL,
    "job_request_id" UUID,
    "worker_identity_id" UUID NOT NULL,
    "base_rate_minor" INTEGER NOT NULL,
    "transport_allowance_minor" INTEGER NOT NULL,
    "bonus_minor" INTEGER NOT NULL,
    "client_price_minor" INTEGER NOT NULL,
    "worker_cost_minor" INTEGER NOT NULL,
    "margin_minor" INTEGER NOT NULL,
    "acceptance_probability" DOUBLE PRECISION NOT NULL,
    "model_kind" TEXT NOT NULL,
    "hours" INTEGER NOT NULL,
    "distance_km" INTEGER NOT NULL,
    "hours_until_shift" INTEGER NOT NULL,
    "willingness_to_pay_per_hour_minor" INTEGER NOT NULL,
    "feat_reliability" DOUBLE PRECISION NOT NULL,
    "feat_requires_transport" BOOLEAN NOT NULL,
    "feat_min_rate_per_hour_minor" INTEGER NOT NULL,
    "outcome" TEXT NOT NULL DEFAULT 'proposed',
    "outcome_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
    CONSTRAINT "offer_decision_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ode_worker_idx" ON "offer_decision_events" ("worker_identity_id");
CREATE INDEX "ode_job_idx" ON "offer_decision_events" ("job_request_id");
CREATE INDEX "ode_outcome_idx" ON "offer_decision_events" ("outcome");
ALTER TABLE "offer_decision_events" ADD CONSTRAINT "ode_outcome_check" CHECK ("outcome" IN ('proposed','offered','accepted','declined','ignored','expired'));
ALTER TABLE "offer_decision_events"
    ADD CONSTRAINT "ode_worker_fk" FOREIGN KEY ("worker_identity_id") REFERENCES "worker_identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
