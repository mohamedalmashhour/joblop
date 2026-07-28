ALTER TABLE "dispatch_candidates"
ADD COLUMN "worker_identity_id" UUID;

CREATE INDEX "dispatch_candidates_review_worker_shortlist_idx"
ON "dispatch_candidates"("dispatch_review_id", "worker_identity_id", "shortlist_state");

ALTER TABLE "dispatch_candidates"
ADD CONSTRAINT "dispatch_candidates_worker_identity_id_fkey"
FOREIGN KEY ("worker_identity_id") REFERENCES "worker_identities"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
