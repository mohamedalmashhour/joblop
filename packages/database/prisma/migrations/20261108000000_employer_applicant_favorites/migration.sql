-- Employer favourites on interested workers. A suggestion to Joblop staff only: it changes no interest
-- status and creates no offer. Non-destructive: two new nullable columns.
ALTER TABLE "worker_job_interests"
  ADD COLUMN "employer_favorited_at" TIMESTAMPTZ(3),
  ADD COLUMN "employer_favorited_by_user_id" UUID;
