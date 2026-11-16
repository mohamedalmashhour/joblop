-- CRM core (phase 1: pipeline + contacts). Additive only: three new enums and two new tables; no
-- existing table, column, row or constraint is changed, so applying this migration changes nothing a
-- running API does. This is a dedicated, staff-only sales/relationship surface.
--   crm_contacts   one row per person/company tracked in the pipeline. Optional links to the real
--                  users / employer_organizations / external_job_leads row it came from, all
--                  ON DELETE SET NULL so deleting a source never deletes CRM history. The unique on
--                  external_job_lead_id makes importing the same lead twice a no-op.
--   crm_activities the per-contact timeline: notes, logged calls/emails, stage moves and tasks.
--                  ON DELETE CASCADE from its contact; actor is SET NULL if the staff member leaves.
-- Nothing here sends marketing email or moves money. marketing_opt_in_at is a display-only cached
-- mirror of users.marketing_email_opt_in_at; the separate marketing phase must re-read live consent.

-- CreateEnum
CREATE TYPE "CrmContactType" AS ENUM ('worker', 'employer', 'lead');

-- CreateEnum
CREATE TYPE "CrmContactStage" AS ENUM ('new', 'contacted', 'qualified', 'active', 'dormant');

-- CreateEnum
CREATE TYPE "CrmActivityKind" AS ENUM ('note', 'call', 'email', 'stage_change', 'task');

-- CreateTable
CREATE TABLE "crm_contacts" (
    "id" UUID NOT NULL,
    "type" "CrmContactType" NOT NULL,
    "user_id" UUID,
    "organization_id" UUID,
    "external_job_lead_id" UUID,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "stage" "CrmContactStage" NOT NULL DEFAULT 'new',
    "assignee_user_id" UUID,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "marketing_opt_in_at" TIMESTAMPTZ(3),
    "created_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "crm_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_activities" (
    "id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "kind" "CrmActivityKind" NOT NULL,
    "body" TEXT,
    "actor_user_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "crm_contacts_external_job_lead_id_key" ON "crm_contacts"("external_job_lead_id");

-- CreateIndex
CREATE INDEX "crm_contacts_stage_updated_at_idx" ON "crm_contacts"("stage", "updated_at");

-- CreateIndex
CREATE INDEX "crm_contacts_type_stage_idx" ON "crm_contacts"("type", "stage");

-- CreateIndex
CREATE INDEX "crm_contacts_assignee_user_id_idx" ON "crm_contacts"("assignee_user_id");

-- CreateIndex
CREATE INDEX "crm_activities_contact_id_created_at_idx" ON "crm_activities"("contact_id", "created_at");

-- AddForeignKey
ALTER TABLE "crm_contacts" ADD CONSTRAINT "crm_contacts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_contacts" ADD CONSTRAINT "crm_contacts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "employer_organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_contacts" ADD CONSTRAINT "crm_contacts_external_job_lead_id_fkey" FOREIGN KEY ("external_job_lead_id") REFERENCES "external_job_leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_contacts" ADD CONSTRAINT "crm_contacts_assignee_user_id_fkey" FOREIGN KEY ("assignee_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_contacts" ADD CONSTRAINT "crm_contacts_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "crm_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
