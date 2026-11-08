-- Job alerts by email + push notifications to the phone app. Additive only: five new nullable
-- columns on job_alert_subscriptions and one new table. Existing alert rows get their unsubscribe
-- token from the sender, before their first email is sent.
ALTER TABLE "job_alert_subscriptions" ADD COLUMN "last_checked_at" TIMESTAMPTZ(3),
ADD COLUMN "last_sent_at" TIMESTAMPTZ(3),
ADD COLUMN "unsubscribe_token" TEXT,
ADD COLUMN "unsubscribed_at" TIMESTAMPTZ(3),
ADD COLUMN "user_id" UUID;

CREATE UNIQUE INDEX "job_alert_subscriptions_unsubscribe_token_key" ON "job_alert_subscriptions"("unsubscribe_token");
CREATE INDEX "job_alert_subscriptions_user_id_idx" ON "job_alert_subscriptions"("user_id");
CREATE INDEX "job_alert_subscriptions_unsubscribed_at_last_checked_at_idx" ON "job_alert_subscriptions"("unsubscribed_at", "last_checked_at");

ALTER TABLE "job_alert_subscriptions" ADD CONSTRAINT "job_alert_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "push_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(3),
    CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "push_tokens_platform_check" CHECK ("platform" IN ('ios', 'android', 'web'))
);

CREATE UNIQUE INDEX "push_tokens_token_key" ON "push_tokens"("token");
CREATE INDEX "push_tokens_user_id_revoked_at_idx" ON "push_tokens"("user_id", "revoked_at");

ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
