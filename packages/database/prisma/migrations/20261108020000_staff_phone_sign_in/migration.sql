-- One-time codes for staff phone sign-in. Only a hash of each code is stored. Non-destructive: one new table.
CREATE TABLE "staff_phone_sign_in_codes" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "code_hash" CHAR(64) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "consumed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_phone_sign_in_codes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "staff_phone_sign_in_codes_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "staff_phone_sign_in_codes_user_id_created_at_idx"
  ON "staff_phone_sign_in_codes"("user_id", "created_at");
