CREATE TABLE "platform_access_grants" (
  "user_id" UUID NOT NULL,
  "access_role_definition_id" UUID NOT NULL,
  "granted_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "release_sha" CHAR(40) NOT NULL,
  CONSTRAINT "platform_access_grants_pkey"
    PRIMARY KEY ("user_id", "access_role_definition_id"),
  CONSTRAINT "platform_access_grants_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "platform_access_grants_access_role_definition_id_fkey"
    FOREIGN KEY ("access_role_definition_id") REFERENCES "access_role_definitions"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "platform_access_grants_role_idx"
  ON "platform_access_grants"("access_role_definition_id");

CREATE TABLE "initial_admin_bootstrap" (
  "key" VARCHAR(64) NOT NULL,
  "secret_digest" CHAR(64) NOT NULL,
  "expires_at" TIMESTAMPTZ(3) NOT NULL,
  "used_at" TIMESTAMPTZ(3),
  "created_user_id" UUID,
  "environment" VARCHAR(16) NOT NULL,
  "release_sha" CHAR(40) NOT NULL,
  "outcome" VARCHAR(32) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "initial_admin_bootstrap_pkey" PRIMARY KEY ("key"),
  CONSTRAINT "initial_admin_bootstrap_created_user_id_fkey"
    FOREIGN KEY ("created_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "initial_admin_bootstrap_release_sha_format"
    CHECK ("release_sha" ~ '^[0-9a-f]{40}$'),
  CONSTRAINT "initial_admin_bootstrap_environment"
    CHECK ("environment" = 'staging'),
  CONSTRAINT "initial_admin_bootstrap_completion"
    CHECK (
      ("used_at" IS NULL AND "created_user_id" IS NULL) OR
      ("used_at" IS NOT NULL AND "created_user_id" IS NOT NULL)
    )
);

CREATE INDEX "initial_admin_bootstrap_used_at_idx"
  ON "initial_admin_bootstrap"("used_at");
