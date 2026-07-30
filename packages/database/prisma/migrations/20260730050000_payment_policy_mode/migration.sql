ALTER TABLE "employer_payment_attempts"
ADD COLUMN "policy_mode" TEXT NOT NULL DEFAULT 'manual_collection';
