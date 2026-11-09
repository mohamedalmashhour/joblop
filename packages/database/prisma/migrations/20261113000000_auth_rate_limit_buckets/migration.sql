-- Production readiness: sign-in rate limiter in PostgreSQL (AUTH_RATE_LIMITER_BACKEND=postgres).
-- Additive only: one new table; no existing table, column, row or constraint is changed. The table is
-- unused until the backend is selected, so applying it changes nothing for a running API.
--   auth_rate_limit_buckets: one row per limiter bucket (an HMAC digest of an account or an IP, never
--   the raw value), with its hit count and the end of its current window.

-- CreateTable
CREATE TABLE "auth_rate_limit_buckets" (
    "bucket_key" TEXT NOT NULL,
    "hits" INTEGER NOT NULL,
    "window_ends_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "auth_rate_limit_buckets_pkey" PRIMARY KEY ("bucket_key")
);

-- CreateIndex
CREATE INDEX "auth_rate_limit_buckets_window_ends_at_idx" ON "auth_rate_limit_buckets"("window_ends_at");
