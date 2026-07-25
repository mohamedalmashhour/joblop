-- Worker Offer Foundation
-- Scope: WorkerIdentity and WorkerOffer lifecycle only. Assignment, calendar,
-- attendance, payroll, finance, and notification-provider execution remain deferred.

CREATE TYPE "WorkerIdentityStatus" AS ENUM ('active', 'inactive', 'closed');
CREATE TYPE "WorkerOfferStatus" AS ENUM (
  'draft',
  'approved',
  'sent',
  'delivered',
  'viewed',
  'accepted',
  'declined',
  'expired',
  'withdrawn',
  'cancelled'
);
CREATE TYPE "WorkerOfferDeliveryStatus" AS ENUM ('pending', 'attempted', 'delivered', 'failed');
CREATE TYPE "WorkerOfferResponseType" AS ENUM ('accepted', 'declined');

CREATE TABLE "worker_identities" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "display_name" TEXT,
  "preferred_language" TEXT,
  "status" "WorkerIdentityStatus" NOT NULL DEFAULT 'active',
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "version" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "worker_identities_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "worker_identities_version_check" CHECK ("version" >= 1)
);

CREATE TABLE "worker_offers" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "dispatch_review_id" UUID NOT NULL,
  "job_request_id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "residence_id" UUID NOT NULL,
  "department_id" UUID NOT NULL,
  "worker_identity_id" UUID NOT NULL,
  "current_terms_version_id" UUID,
  "status" "WorkerOfferStatus" NOT NULL DEFAULT 'draft',
  "expires_at" TIMESTAMPTZ(3) NOT NULL,
  "approved_at" TIMESTAMPTZ(3),
  "sent_at" TIMESTAMPTZ(3),
  "delivered_at" TIMESTAMPTZ(3),
  "viewed_at" TIMESTAMPTZ(3),
  "responded_at" TIMESTAMPTZ(3),
  "withdrawn_at" TIMESTAMPTZ(3),
  "cancelled_at" TIMESTAMPTZ(3),
  "created_by_user_id" UUID NOT NULL,
  "updated_by_user_id" UUID,
  "approved_by_user_id" UUID,
  "sent_by_user_id" UUID,
  "withdrawn_by_user_id" UUID,
  "cancelled_by_user_id" UUID,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "version" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "worker_offers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "worker_offers_version_check" CHECK ("version" >= 1),
  CONSTRAINT "worker_offers_expires_after_created_check" CHECK ("expires_at" > "created_at")
);

CREATE TABLE "worker_offer_terms_versions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "worker_offer_id" UUID NOT NULL,
  "version_number" INTEGER NOT NULL,
  "worker_visible_title" TEXT NOT NULL,
  "worker_visible_summary" TEXT,
  "timezone" TEXT NOT NULL,
  "start_at" TIMESTAMPTZ(3) NOT NULL,
  "end_at" TIMESTAMPTZ(3) NOT NULL,
  "work_group_id" UUID NOT NULL,
  "role_definition_id" UUID NOT NULL,
  "compensation_summary" TEXT,
  "policy_summary" TEXT,
  "created_by_user_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "worker_offer_terms_versions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "worker_offer_terms_versions_version_number_check" CHECK ("version_number" >= 1),
  CONSTRAINT "worker_offer_terms_versions_end_after_start_check" CHECK ("end_at" > "start_at")
);

CREATE TABLE "worker_offer_delivery_attempts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "worker_offer_id" UUID NOT NULL,
  "status" "WorkerOfferDeliveryStatus" NOT NULL DEFAULT 'pending',
  "provider_boundary" TEXT NOT NULL DEFAULT 'abstract',
  "reason" TEXT,
  "attempted_at" TIMESTAMPTZ(3),
  "delivered_at" TIMESTAMPTZ(3),
  "failed_at" TIMESTAMPTZ(3),
  "created_by_user_id" UUID,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "worker_offer_delivery_attempts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "worker_offer_responses" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "worker_offer_id" UUID NOT NULL,
  "worker_identity_id" UUID NOT NULL,
  "terms_version_id" UUID NOT NULL,
  "response_type" "WorkerOfferResponseType" NOT NULL,
  "reason" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "worker_offer_responses_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "worker_identities_user_id_key" ON "worker_identities"("user_id");
CREATE INDEX "worker_identities_status_idx" ON "worker_identities"("status");

CREATE UNIQUE INDEX "worker_offers_current_terms_version_id_key" ON "worker_offers"("current_terms_version_id");
CREATE UNIQUE INDEX "worker_offers_dispatch_worker_key" ON "worker_offers"("dispatch_review_id", "worker_identity_id");
CREATE INDEX "worker_offers_dispatch_review_id_status_idx" ON "worker_offers"("dispatch_review_id", "status");
CREATE INDEX "worker_offers_organization_id_status_updated_at_idx" ON "worker_offers"("organization_id", "status", "updated_at");
CREATE INDEX "worker_offers_worker_identity_id_status_expires_at_idx" ON "worker_offers"("worker_identity_id", "status", "expires_at");
CREATE INDEX "worker_offers_job_request_id_status_idx" ON "worker_offers"("job_request_id", "status");

CREATE UNIQUE INDEX "worker_offer_terms_offer_version_key" ON "worker_offer_terms_versions"("worker_offer_id", "version_number");
CREATE INDEX "worker_offer_terms_worker_offer_id_created_at_idx" ON "worker_offer_terms_versions"("worker_offer_id", "created_at");

CREATE INDEX "worker_offer_delivery_worker_offer_id_created_at_idx" ON "worker_offer_delivery_attempts"("worker_offer_id", "created_at");
CREATE INDEX "worker_offer_delivery_status_created_at_idx" ON "worker_offer_delivery_attempts"("status", "created_at");

CREATE UNIQUE INDEX "worker_offer_responses_worker_offer_id_key" ON "worker_offer_responses"("worker_offer_id");
CREATE INDEX "worker_offer_responses_worker_identity_id_created_at_idx" ON "worker_offer_responses"("worker_identity_id", "created_at");

ALTER TABLE "worker_identities"
  ADD CONSTRAINT "worker_identities_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "worker_offers"
  ADD CONSTRAINT "worker_offers_dispatch_review_id_fkey"
  FOREIGN KEY ("dispatch_review_id") REFERENCES "dispatch_reviews"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "worker_offers"
  ADD CONSTRAINT "worker_offers_job_request_id_fkey"
  FOREIGN KEY ("job_request_id") REFERENCES "job_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "worker_offers"
  ADD CONSTRAINT "worker_offers_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "employer_organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "worker_offers"
  ADD CONSTRAINT "worker_offers_organization_residence_fkey"
  FOREIGN KEY ("organization_id", "residence_id") REFERENCES "residences"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "worker_offers"
  ADD CONSTRAINT "worker_offers_organization_residence_department_fkey"
  FOREIGN KEY ("organization_id", "residence_id", "department_id") REFERENCES "departments"("organization_id", "residence_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "worker_offers"
  ADD CONSTRAINT "worker_offers_worker_identity_id_fkey"
  FOREIGN KEY ("worker_identity_id") REFERENCES "worker_identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "worker_offers"
  ADD CONSTRAINT "worker_offers_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "worker_offers"
  ADD CONSTRAINT "worker_offers_updated_by_user_id_fkey"
  FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "worker_offers"
  ADD CONSTRAINT "worker_offers_approved_by_user_id_fkey"
  FOREIGN KEY ("approved_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "worker_offers"
  ADD CONSTRAINT "worker_offers_sent_by_user_id_fkey"
  FOREIGN KEY ("sent_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "worker_offers"
  ADD CONSTRAINT "worker_offers_withdrawn_by_user_id_fkey"
  FOREIGN KEY ("withdrawn_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "worker_offers"
  ADD CONSTRAINT "worker_offers_cancelled_by_user_id_fkey"
  FOREIGN KEY ("cancelled_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "worker_offer_terms_versions"
  ADD CONSTRAINT "worker_offer_terms_versions_worker_offer_id_fkey"
  FOREIGN KEY ("worker_offer_id") REFERENCES "worker_offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "worker_offer_terms_versions"
  ADD CONSTRAINT "worker_offer_terms_versions_work_group_id_fkey"
  FOREIGN KEY ("work_group_id") REFERENCES "work_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "worker_offer_terms_versions"
  ADD CONSTRAINT "worker_offer_terms_versions_work_group_role_fkey"
  FOREIGN KEY ("work_group_id", "role_definition_id") REFERENCES "role_definitions"("work_group_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "worker_offer_terms_versions"
  ADD CONSTRAINT "worker_offer_terms_versions_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "worker_offers"
  ADD CONSTRAINT "worker_offers_current_terms_version_id_fkey"
  FOREIGN KEY ("current_terms_version_id") REFERENCES "worker_offer_terms_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "worker_offer_delivery_attempts"
  ADD CONSTRAINT "worker_offer_delivery_attempts_worker_offer_id_fkey"
  FOREIGN KEY ("worker_offer_id") REFERENCES "worker_offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "worker_offer_delivery_attempts"
  ADD CONSTRAINT "worker_offer_delivery_attempts_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "worker_offer_responses"
  ADD CONSTRAINT "worker_offer_responses_worker_offer_id_fkey"
  FOREIGN KEY ("worker_offer_id") REFERENCES "worker_offers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "worker_offer_responses"
  ADD CONSTRAINT "worker_offer_responses_worker_identity_id_fkey"
  FOREIGN KEY ("worker_identity_id") REFERENCES "worker_identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "worker_offer_responses"
  ADD CONSTRAINT "worker_offer_responses_terms_version_id_fkey"
  FOREIGN KEY ("terms_version_id") REFERENCES "worker_offer_terms_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
