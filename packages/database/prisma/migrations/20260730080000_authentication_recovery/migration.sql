CREATE TABLE "email_verification_codes" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "code_hash" CHAR(64) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "consumed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "email_verification_codes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "email_verification_codes_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "email_verification_codes_user_active_idx"
ON "email_verification_codes"("user_id", "consumed_at", "created_at");

CREATE INDEX "email_verification_codes_expires_at_idx"
ON "email_verification_codes"("expires_at");

CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "consumed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "password_reset_tokens_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key"
ON "password_reset_tokens"("token_hash");

CREATE INDEX "password_reset_tokens_user_active_idx"
ON "password_reset_tokens"("user_id", "consumed_at", "created_at");

CREATE INDEX "password_reset_tokens_expires_at_idx"
ON "password_reset_tokens"("expires_at");
