-- Launch step 6 (AI safety). Additive only: one new table; no existing table, column, row or
-- constraint is changed.
--   ai_usage_events: one row per outside-AI attempt (feature, user id, time) for per-person daily and
--   monthly limits that survive a deploy. It never holds a prompt, a reply or personal data.

-- CreateTable
CREATE TABLE "ai_usage_events" (
    "id" UUID NOT NULL,
    "feature" TEXT NOT NULL,
    "actor_ref" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_usage_events_feature_actor_ref_created_at_idx" ON "ai_usage_events"("feature", "actor_ref", "created_at");

-- CreateIndex
CREATE INDEX "ai_usage_events_feature_created_at_idx" ON "ai_usage_events"("feature", "created_at");
