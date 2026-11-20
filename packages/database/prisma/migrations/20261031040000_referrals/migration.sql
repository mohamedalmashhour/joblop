-- Invite-a-friend / referral: each user gets one stable shareable invite code; a friend who signs up
-- with that code is recorded as a referral attributed to the inviter. Country-neutral, no money.
-- NOTE: drafted to match repo conventions; verify with `prisma migrate` before merge.

CREATE TABLE "referral_codes" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_codes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "referral_codes_user_id_key" ON "referral_codes"("user_id");
CREATE UNIQUE INDEX "referral_codes_code_key" ON "referral_codes"("code");

CREATE TABLE "referrals" (
    "id" UUID NOT NULL,
    "referrer_user_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "invitee_user_id" UUID,
    "invitee_email" TEXT,
    "status" TEXT NOT NULL DEFAULT 'joined',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "referrals_invitee_user_id_key" ON "referrals"("invitee_user_id");
CREATE INDEX "referrals_referrer_idx" ON "referrals"("referrer_user_id", "created_at");
