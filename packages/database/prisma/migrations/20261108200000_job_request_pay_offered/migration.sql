-- Pay offered on long-term jobs (paid listing, the employer pays the worker directly). Additive only:
-- three nullable columns on job_requests. Gated behind EMPLOYER_PLANS_ENABLED (default off); with the
-- flag off nothing writes them and no worker response includes them.
-- AlterTable
ALTER TABLE "job_requests" ADD COLUMN     "pay_offered_max_minor" INTEGER,
ADD COLUMN     "pay_offered_min_minor" INTEGER,
ADD COLUMN     "pay_offered_unit" TEXT;
