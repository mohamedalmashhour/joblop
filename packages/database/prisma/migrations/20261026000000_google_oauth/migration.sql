-- Google OAuth link + encrypted refresh token for direct Google Calendar sync.
-- The identity itself reuses the existing IdentityProvider enum value `future_oauth`
-- (providerSubject = 'google:<sub>'); no enum change is needed.
CREATE TABLE "google_oauth_tokens" (
    "user_id" UUID NOT NULL,
    "google_sub" TEXT NOT NULL,
    "refresh_token_encrypted" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "calendar_sync_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "google_oauth_tokens_pkey" PRIMARY KEY ("user_id")
);

CREATE UNIQUE INDEX "google_oauth_tokens_google_sub_key" ON "google_oauth_tokens"("google_sub");

ALTER TABLE "google_oauth_tokens"
    ADD CONSTRAINT "google_oauth_tokens_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
