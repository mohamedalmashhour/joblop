-- Worker Pro paid plan entitlement: unlocks AI CVs + premium designs, and priority job access (best /
-- higher-wage leads and emergency requests first). Server-side enforced. Real payment collection FROZEN
-- (admin grant now; gated purchase later). Append-only; active = status 'active' and not expired.
CREATE TABLE "cv_entitlements" (
    "id" UUID NOT NULL,
    "worker_ref" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "granted_by_user_id" UUID,
    "expires_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
    CONSTRAINT "cv_entitlements_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "cv_entitlements_worker_status_idx" ON "cv_entitlements" ("worker_ref", "status");
