-- CreateTable: request_pricing_snapshots — the immutable per-request hidden-markup record captured
-- at admin approval. Stores the employer rate (E), the chosen margin, the derived worker rate (W),
-- and the per-allowance employer/worker splits. Payroll pays W from here and each audience view
-- reads only its own side; the platform margin is the difference. One snapshot per job request.
CREATE TABLE "request_pricing_snapshots" (
    "id" UUID NOT NULL,
    "job_request_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "contract_id" UUID NOT NULL,
    "contract_version" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "margin_ppm" INTEGER NOT NULL,
    "employer_hourly_rate_minor" INTEGER NOT NULL,
    "worker_hourly_rate_minor" INTEGER NOT NULL,
    "platform_hourly_margin_minor" INTEGER NOT NULL,
    "transport_employer_minor" INTEGER NOT NULL DEFAULT 0,
    "transport_worker_minor" INTEGER NOT NULL DEFAULT 0,
    "meal_employer_minor" INTEGER NOT NULL DEFAULT 0,
    "meal_worker_minor" INTEGER NOT NULL DEFAULT 0,
    "lodging_employer_minor" INTEGER NOT NULL DEFAULT 0,
    "lodging_worker_minor" INTEGER NOT NULL DEFAULT 0,
    "captured_by_user_id" UUID NOT NULL,
    "captured_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_pricing_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "request_pricing_snapshots_job_request_id_key" ON "request_pricing_snapshots"("job_request_id");

-- CreateIndex
CREATE INDEX "request_pricing_snapshots_org_captured_idx" ON "request_pricing_snapshots"("organization_id", "captured_at");

-- CreateIndex
CREATE INDEX "request_pricing_snapshots_contract_idx" ON "request_pricing_snapshots"("contract_id", "contract_version");

-- AddForeignKey
ALTER TABLE "request_pricing_snapshots" ADD CONSTRAINT "request_pricing_snapshots_job_request_id_fkey" FOREIGN KEY ("job_request_id") REFERENCES "job_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
