-- Platform Greetings & Certificates: an admin sends holiday/occasion greeting cards and issues
-- certificates (e.g. "Super Worker") to workers and employers. In-app delivery rows ARE the inbox;
-- email is best-effort (existing mailer, fail-closed). Country-neutral — occasions come from the active
-- CountryProfile, not these tables. No money, no governance.
-- NOTE: drafted to match repo conventions; verify with `prisma migrate` before merge.

CREATE TABLE "platform_greetings" (
    "id" UUID NOT NULL,
    "occasion_key" TEXT,
    "template_key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "audience_scope" TEXT NOT NULL,
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_greetings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "platform_greetings_created_idx" ON "platform_greetings"("created_at");

CREATE TABLE "platform_greeting_deliveries" (
    "id" UUID NOT NULL,
    "greeting_id" UUID NOT NULL,
    "recipient_user_id" UUID NOT NULL,
    "recipient_kind" TEXT NOT NULL,
    "email_status" TEXT NOT NULL DEFAULT 'none',
    "read_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_greeting_deliveries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "platform_greeting_deliveries_recipient_idx" ON "platform_greeting_deliveries"("recipient_user_id", "created_at");
CREATE INDEX "platform_greeting_deliveries_greeting_idx" ON "platform_greeting_deliveries"("greeting_id");

ALTER TABLE "platform_greeting_deliveries"
    ADD CONSTRAINT "platform_greeting_deliveries_greeting_id_fkey"
    FOREIGN KEY ("greeting_id") REFERENCES "platform_greetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "platform_certificates" (
    "id" UUID NOT NULL,
    "recipient_user_id" UUID NOT NULL,
    "recipient_kind" TEXT NOT NULL,
    "recipient_name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "note" TEXT,
    "serial" TEXT NOT NULL,
    "email_status" TEXT NOT NULL DEFAULT 'none',
    "read_at" TIMESTAMPTZ(3),
    "issued_by_user_id" UUID NOT NULL,
    "issued_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_certificates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "platform_certificates_serial_key" ON "platform_certificates"("serial");
CREATE INDEX "platform_certificates_recipient_idx" ON "platform_certificates"("recipient_user_id", "issued_at");
