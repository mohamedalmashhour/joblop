-- Marketing-email consent (CASL) for workers. One nullable timestamp recording when the worker
-- explicitly opted in to marketing email (null = not opted in). Separate from the service/account
-- relationship; transactional messages never depend on it. Non-destructive: one new nullable column.
ALTER TABLE "worker_hr_intakes" ADD COLUMN "marketing_email_opt_in_at" TIMESTAMPTZ;
