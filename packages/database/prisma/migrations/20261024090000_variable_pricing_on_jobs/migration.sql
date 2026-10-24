-- Gap A: wire variable client pricing (emergency + distance) into the authoritative per-job money.
-- job_requests carries the worksite distance (input for the distance surcharge); the pricing snapshot
-- captures the emergency per-hour surcharge (platform-kept) and the distance surcharge split 50/50.
ALTER TABLE "job_requests" ADD COLUMN "worksite_distance_km" DOUBLE PRECISION;
ALTER TABLE "request_pricing_snapshots"
  ADD COLUMN "emergency_surcharge_per_hour_minor" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "distance_surcharge_minor" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "distance_worker_minor" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "distance_platform_minor" INTEGER NOT NULL DEFAULT 0;
