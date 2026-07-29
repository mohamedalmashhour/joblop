-- A worker identity can have only one canonical candidate provenance record per dispatch.
-- Multiple external source references must be reconciled before linking the worker identity.
CREATE UNIQUE INDEX "dispatch_candidates_review_worker_identity_key"
ON "dispatch_candidates"("dispatch_review_id", "worker_identity_id")
WHERE "worker_identity_id" IS NOT NULL;
