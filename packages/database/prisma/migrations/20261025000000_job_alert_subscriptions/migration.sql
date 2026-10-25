-- JobScanner job-alert subscriptions captured from the PUBLIC landing magnet. A visitor leaves their
-- email (optionally a role/province) so JobLop — not the external source — owns the lead and can alert
-- them as matching jobs appear. One row per email (unique). No account, no money. confirmed_at is set
-- if/when a confirmation step is added.
CREATE TABLE "job_alert_subscriptions" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "role_keywords" TEXT,
    "province" TEXT,
    "locale" TEXT,
    "source" TEXT NOT NULL DEFAULT 'public_landing',
    "confirmed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
    CONSTRAINT "job_alert_subscriptions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "job_alert_subscriptions_email_key" ON "job_alert_subscriptions" ("email");
CREATE INDEX "job_alert_subscriptions_created_at_idx" ON "job_alert_subscriptions" ("created_at");
