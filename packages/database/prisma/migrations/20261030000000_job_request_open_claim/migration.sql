-- Hybrid auto-offer direct-claim: open_claim flag on job_requests.
-- When true, approving+pricing opens the job for first-come worker self-claim (instant assign,
-- up to number_of_workers slots). When false (default), the manual admin dispatch path is unchanged.
ALTER TABLE "job_requests" ADD COLUMN "open_claim" BOOLEAN NOT NULL DEFAULT false;
