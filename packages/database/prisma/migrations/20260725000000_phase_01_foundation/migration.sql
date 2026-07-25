-- Resident Job Phase 01 foundation.
-- Scope: identity, membership, organization, work catalogue, minimal Job Request, and audit foundation only.
-- Deferred entities such as dispatch, worker offers, assignments, attendance, timesheets, invoices, payments, notifications, support, and reporting are intentionally absent.

CREATE TYPE "UserStatus" AS ENUM ('email_verification_pending', 'active', 'restricted', 'disabled', 'closed');
CREATE TYPE "IdentityProvider" AS ENUM ('local_password', 'dev_test', 'future_oauth');
CREATE TYPE "MfaState" AS ENUM ('not_configured', 'optional', 'required', 'enrolled', 'locked');
CREATE TYPE "SessionStatus" AS ENUM ('active', 'expired', 'revoked');
CREATE TYPE "EmployerOrganizationStatus" AS ENUM ('invited', 'pending_review', 'active', 'restricted', 'suspended', 'closed');
CREATE TYPE "OrganizationMembershipStatus" AS ENUM ('invited', 'active', 'suspended', 'revoked', 'expired');
CREATE TYPE "ResidenceStatus" AS ENUM ('draft', 'active', 'restricted', 'inactive', 'closed');
CREATE TYPE "DepartmentStatus" AS ENUM ('draft', 'active', 'restricted', 'inactive', 'closed');
CREATE TYPE "CatalogueStatus" AS ENUM ('active', 'inactive', 'retired');
CREATE TYPE "AccessRoleStatus" AS ENUM ('draft', 'active', 'restricted', 'retired');
CREATE TYPE "AccessRoleScope" AS ENUM ('platform', 'organization', 'worker');
CREATE TYPE "JobRequestStatus" AS ENUM ('draft', 'submitted', 'admin_review', 'information_required', 'approved_for_dispatch', 'cancelled', 'expired', 'archived');
CREATE TYPE "JobRequestUrgency" AS ENUM ('normal', 'urgent', 'immediate');
CREATE TYPE "JobRequestType" AS ENUM ('single_day', 'multi_day', 'recurring_intent');
CREATE TYPE "AuditActorType" AS ENUM ('user', 'system', 'service');
CREATE TYPE "AuditSource" AS ENUM ('api', 'admin', 'employer', 'worker', 'system');

CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "public_id" TEXT NOT NULL,
    "email_normalized" TEXT NOT NULL,
    "display_name" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'email_verification_pending',
    "primary_language" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "disabled_at" TIMESTAMPTZ(3),
    "closed_at" TIMESTAMPTZ(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_identities" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider" "IdentityProvider" NOT NULL,
    "provider_subject" TEXT NOT NULL,
    "email_verified_at" TIMESTAMPTZ(3),
    "password_hash" TEXT,
    "password_updated_at" TIMESTAMPTZ(3),
    "mfa_state" "MfaState" NOT NULL DEFAULT 'not_configured',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "user_identities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "session_hash" TEXT NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "last_seen_at" TIMESTAMPTZ(3),
    "revoked_at" TIMESTAMPTZ(3),
    "ip_hash" TEXT,
    "user_agent_hash" TEXT,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "employer_organizations" (
    "id" UUID NOT NULL,
    "public_id" TEXT NOT NULL,
    "legal_name" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "status" "EmployerOrganizationStatus" NOT NULL DEFAULT 'pending_review',
    "created_by_user_id" UUID,
    "reviewed_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "restricted_at" TIMESTAMPTZ(3),
    "suspended_at" TIMESTAMPTZ(3),
    "closed_at" TIMESTAMPTZ(3),

    CONSTRAINT "employer_organizations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "organization_memberships" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "OrganizationMembershipStatus" NOT NULL DEFAULT 'invited',
    "invited_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accepted_at" TIMESTAMPTZ(3),
    "suspended_at" TIMESTAMPTZ(3),
    "revoked_at" TIMESTAMPTZ(3),
    "expired_at" TIMESTAMPTZ(3),

    CONSTRAINT "organization_memberships_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "residences" (
    "id" UUID NOT NULL,
    "public_id" TEXT NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "status" "ResidenceStatus" NOT NULL DEFAULT 'draft',
    "address_summary" TEXT,
    "city" TEXT,
    "region" TEXT,
    "country" TEXT,
    "created_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "archived_at" TIMESTAMPTZ(3),

    CONSTRAINT "residences_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "departments" (
    "id" UUID NOT NULL,
    "public_id" TEXT NOT NULL,
    "organization_id" UUID NOT NULL,
    "residence_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "status" "DepartmentStatus" NOT NULL DEFAULT 'draft',
    "created_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "archived_at" TIMESTAMPTZ(3),

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "work_groups" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "display_label" TEXT NOT NULL,
    "status" "CatalogueStatus" NOT NULL DEFAULT 'active',
    "display_order" INTEGER NOT NULL,
    "icon_key" TEXT,
    "qualification_summary" TEXT,
    "safety_requirement_summary" TEXT,
    "default_template_key" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "work_groups_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "role_definitions" (
    "id" UUID NOT NULL,
    "work_group_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "display_label" TEXT NOT NULL,
    "status" "CatalogueStatus" NOT NULL DEFAULT 'active',
    "display_order" INTEGER NOT NULL,
    "localized_label_key" TEXT,
    "qualification_summary" TEXT,
    "safety_requirement_summary" TEXT,
    "admin_configurable" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "role_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "access_role_definitions" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "scope" "AccessRoleScope" NOT NULL,
    "status" "AccessRoleStatus" NOT NULL DEFAULT 'active',
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "access_role_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "permission_definitions" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "implemented" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "permission_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "access_role_permissions" (
    "access_role_definition_id" UUID NOT NULL,
    "permission_definition_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "access_role_permissions_pkey" PRIMARY KEY ("access_role_definition_id","permission_definition_id")
);

CREATE TABLE "membership_access_roles" (
    "membership_id" UUID NOT NULL,
    "access_role_definition_id" UUID NOT NULL,
    "assigned_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(3),

    CONSTRAINT "membership_access_roles_pkey" PRIMARY KEY ("membership_id","access_role_definition_id")
);

CREATE TABLE "job_request_sequences" (
    "scope_year" INTEGER NOT NULL,
    "last_value" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "job_request_sequences_pkey" PRIMARY KEY ("scope_year")
);

CREATE TABLE "job_requests" (
    "id" UUID NOT NULL,
    "job_request_number" TEXT NOT NULL,
    "organization_id" UUID NOT NULL,
    "residence_id" UUID NOT NULL,
    "department_id" UUID NOT NULL,
    "work_group_id" UUID NOT NULL,
    "role_definition_id" UUID NOT NULL,
    "creator_user_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "number_of_workers" INTEGER NOT NULL DEFAULT 1,
    "urgency" "JobRequestUrgency" NOT NULL DEFAULT 'normal',
    "request_type" "JobRequestType" NOT NULL,
    "timezone" TEXT NOT NULL,
    "start_at" TIMESTAMPTZ(3) NOT NULL,
    "end_at" TIMESTAMPTZ(3) NOT NULL,
    "is_multi_day" BOOLEAN NOT NULL DEFAULT false,
    "has_recurring_intent" BOOLEAN NOT NULL DEFAULT false,
    "status" "JobRequestStatus" NOT NULL DEFAULT 'draft',
    "admin_review_reason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_by_user_id" UUID NOT NULL,
    "updated_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "submitted_at" TIMESTAMPTZ(3),
    "cancelled_at" TIMESTAMPTZ(3),
    "expired_at" TIMESTAMPTZ(3),
    "archived_at" TIMESTAMPTZ(3),

    CONSTRAINT "job_requests_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "job_requests_number_of_workers_check" CHECK ("number_of_workers" >= 1),
    CONSTRAINT "job_requests_end_after_start_check" CHECK ("end_at" > "start_at"),
    CONSTRAINT "job_requests_version_check" CHECK ("version" >= 1)
);

CREATE TABLE "audit_actor_references" (
    "id" UUID NOT NULL,
    "actor_type" "AuditActorType" NOT NULL,
    "user_id" UUID,
    "organization_id" UUID,
    "display_label" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_actor_references_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_events" (
    "id" UUID NOT NULL,
    "actor_reference_id" UUID NOT NULL,
    "organization_id" UUID,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "entity_public_reference" TEXT,
    "action" TEXT NOT NULL,
    "prior_state" TEXT,
    "new_state" TEXT,
    "reason" TEXT,
    "source" "AuditSource" NOT NULL,
    "correlation_id" TEXT NOT NULL,
    "policy_version" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_public_id_key" ON "users"("public_id");
CREATE UNIQUE INDEX "users_email_normalized_key" ON "users"("email_normalized");
CREATE INDEX "users_email_normalized_idx" ON "users"("email_normalized");
CREATE INDEX "users_status_idx" ON "users"("status");

CREATE UNIQUE INDEX "user_identities_provider_subject_key" ON "user_identities"("provider", "provider_subject");
CREATE INDEX "user_identities_user_id_idx" ON "user_identities"("user_id");
CREATE INDEX "user_identities_provider_subject_idx" ON "user_identities"("provider", "provider_subject");

CREATE UNIQUE INDEX "sessions_session_hash_key" ON "sessions"("session_hash");
CREATE INDEX "sessions_session_hash_idx" ON "sessions"("session_hash");
CREATE INDEX "sessions_user_id_status_idx" ON "sessions"("user_id", "status");
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

CREATE UNIQUE INDEX "employer_organizations_public_id_key" ON "employer_organizations"("public_id");
CREATE INDEX "employer_organizations_status_idx" ON "employer_organizations"("status");

CREATE INDEX "organization_memberships_organization_id_status_idx" ON "organization_memberships"("organization_id", "status");
CREATE INDEX "organization_memberships_user_id_status_idx" ON "organization_memberships"("user_id", "status");
CREATE UNIQUE INDEX "organization_memberships_one_non_terminal_membership_idx"
  ON "organization_memberships"("organization_id", "user_id")
  WHERE "status" IN ('invited', 'active', 'suspended');

CREATE UNIQUE INDEX "residences_public_id_key" ON "residences"("public_id");
CREATE UNIQUE INDEX "residences_organization_id_id_key" ON "residences"("organization_id", "id");
CREATE INDEX "residences_organization_id_status_idx" ON "residences"("organization_id", "status");
CREATE INDEX "residences_organization_id_name_idx" ON "residences"("organization_id", "name");
CREATE UNIQUE INDEX "residences_active_org_lower_name_unique"
  ON "residences"("organization_id", lower("name"))
  WHERE "archived_at" IS NULL AND "status" <> 'closed';

CREATE UNIQUE INDEX "departments_public_id_key" ON "departments"("public_id");
CREATE UNIQUE INDEX "departments_organization_id_id_key" ON "departments"("organization_id", "id");
CREATE UNIQUE INDEX "departments_residence_id_id_key" ON "departments"("residence_id", "id");
CREATE UNIQUE INDEX "departments_organization_id_residence_id_id_key" ON "departments"("organization_id", "residence_id", "id");
CREATE INDEX "departments_organization_id_status_idx" ON "departments"("organization_id", "status");
CREATE INDEX "departments_residence_id_status_idx" ON "departments"("residence_id", "status");
CREATE INDEX "departments_residence_id_name_idx" ON "departments"("residence_id", "name");
CREATE UNIQUE INDEX "departments_active_residence_lower_name_unique"
  ON "departments"("residence_id", lower("name"))
  WHERE "archived_at" IS NULL AND "status" <> 'closed';

CREATE UNIQUE INDEX "work_groups_key_key" ON "work_groups"("key");
CREATE INDEX "work_groups_status_display_order_idx" ON "work_groups"("status", "display_order");
CREATE UNIQUE INDEX "work_groups_active_display_order_unique"
  ON "work_groups"("display_order")
  WHERE "status" = 'active';

CREATE UNIQUE INDEX "role_definitions_key_key" ON "role_definitions"("key");
CREATE UNIQUE INDEX "role_definitions_work_group_id_id_key" ON "role_definitions"("work_group_id", "id");
CREATE INDEX "role_definitions_work_group_id_status_display_order_idx" ON "role_definitions"("work_group_id", "status", "display_order");

CREATE UNIQUE INDEX "access_role_definitions_key_key" ON "access_role_definitions"("key");
CREATE UNIQUE INDEX "permission_definitions_key_key" ON "permission_definitions"("key");
CREATE INDEX "access_role_permissions_permission_definition_id_idx" ON "access_role_permissions"("permission_definition_id");

CREATE INDEX "membership_access_roles_access_role_definition_id_idx" ON "membership_access_roles"("access_role_definition_id");
CREATE UNIQUE INDEX "membership_access_roles_one_active_role_idx"
  ON "membership_access_roles"("membership_id", "access_role_definition_id")
  WHERE "revoked_at" IS NULL;

CREATE INDEX "job_request_sequences_scope_year_idx" ON "job_request_sequences"("scope_year");
ALTER TABLE "job_request_sequences"
  ADD CONSTRAINT "job_request_sequences_last_value_check" CHECK ("last_value" >= 0);

CREATE UNIQUE INDEX "job_requests_job_request_number_key" ON "job_requests"("job_request_number");
CREATE INDEX "job_requests_job_request_number_idx" ON "job_requests"("job_request_number");
CREATE INDEX "job_requests_organization_id_status_created_at_idx" ON "job_requests"("organization_id", "status", "created_at");
CREATE INDEX "job_requests_organization_id_residence_id_status_idx" ON "job_requests"("organization_id", "residence_id", "status");
CREATE INDEX "job_requests_organization_id_department_id_status_idx" ON "job_requests"("organization_id", "department_id", "status");
CREATE INDEX "job_requests_organization_id_start_at_idx" ON "job_requests"("organization_id", "start_at");
CREATE INDEX "job_requests_status_submitted_at_idx" ON "job_requests"("status", "submitted_at");
CREATE INDEX "job_requests_created_by_user_id_created_at_idx" ON "job_requests"("created_by_user_id", "created_at");

CREATE INDEX "audit_actor_references_user_id_idx" ON "audit_actor_references"("user_id");
CREATE INDEX "audit_actor_references_organization_id_idx" ON "audit_actor_references"("organization_id");
CREATE INDEX "audit_events_organization_id_created_at_idx" ON "audit_events"("organization_id", "created_at");
CREATE INDEX "audit_events_entity_type_entity_id_created_at_idx" ON "audit_events"("entity_type", "entity_id", "created_at");
CREATE INDEX "audit_events_entity_public_reference_idx" ON "audit_events"("entity_public_reference");
CREATE INDEX "audit_events_correlation_id_idx" ON "audit_events"("correlation_id");

ALTER TABLE "user_identities" ADD CONSTRAINT "user_identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "employer_organizations" ADD CONSTRAINT "employer_organizations_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "employer_organizations" ADD CONSTRAINT "employer_organizations_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "employer_organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_invited_by_user_id_fkey" FOREIGN KEY ("invited_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "residences" ADD CONSTRAINT "residences_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "employer_organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "residences" ADD CONSTRAINT "residences_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "departments" ADD CONSTRAINT "departments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "employer_organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "departments" ADD CONSTRAINT "departments_organization_id_residence_id_fkey" FOREIGN KEY ("organization_id", "residence_id") REFERENCES "residences"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "departments" ADD CONSTRAINT "departments_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "role_definitions" ADD CONSTRAINT "role_definitions_work_group_id_fkey" FOREIGN KEY ("work_group_id") REFERENCES "work_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "access_role_permissions" ADD CONSTRAINT "access_role_permissions_access_role_definition_id_fkey" FOREIGN KEY ("access_role_definition_id") REFERENCES "access_role_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "access_role_permissions" ADD CONSTRAINT "access_role_permissions_permission_definition_id_fkey" FOREIGN KEY ("permission_definition_id") REFERENCES "permission_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "membership_access_roles" ADD CONSTRAINT "membership_access_roles_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "organization_memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "membership_access_roles" ADD CONSTRAINT "membership_access_roles_access_role_definition_id_fkey" FOREIGN KEY ("access_role_definition_id") REFERENCES "access_role_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "membership_access_roles" ADD CONSTRAINT "membership_access_roles_assigned_by_user_id_fkey" FOREIGN KEY ("assigned_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "job_requests" ADD CONSTRAINT "job_requests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "employer_organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "job_requests" ADD CONSTRAINT "job_requests_organization_id_residence_id_fkey" FOREIGN KEY ("organization_id", "residence_id") REFERENCES "residences"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "job_requests" ADD CONSTRAINT "job_requests_organization_id_residence_id_department_id_fkey" FOREIGN KEY ("organization_id", "residence_id", "department_id") REFERENCES "departments"("organization_id", "residence_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "job_requests" ADD CONSTRAINT "job_requests_work_group_id_fkey" FOREIGN KEY ("work_group_id") REFERENCES "work_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "job_requests" ADD CONSTRAINT "job_requests_work_group_id_role_definition_id_fkey" FOREIGN KEY ("work_group_id", "role_definition_id") REFERENCES "role_definitions"("work_group_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "job_requests" ADD CONSTRAINT "job_requests_creator_user_id_fkey" FOREIGN KEY ("creator_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "job_requests" ADD CONSTRAINT "job_requests_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "job_requests" ADD CONSTRAINT "job_requests_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "audit_actor_references" ADD CONSTRAINT "audit_actor_references_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "audit_actor_references" ADD CONSTRAINT "audit_actor_references_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "employer_organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_reference_id_fkey" FOREIGN KEY ("actor_reference_id") REFERENCES "audit_actor_references"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "employer_organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION reject_job_request_number_update()
RETURNS trigger AS $$
BEGIN
  IF NEW.job_request_number <> OLD.job_request_number THEN
    RAISE EXCEPTION 'job_request_number is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "job_requests_prevent_job_request_number_update"
BEFORE UPDATE ON "job_requests"
FOR EACH ROW
EXECUTE FUNCTION reject_job_request_number_update();

CREATE OR REPLACE FUNCTION reject_audit_event_update_or_delete()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_events are append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "audit_events_prevent_update"
BEFORE UPDATE ON "audit_events"
FOR EACH ROW
EXECUTE FUNCTION reject_audit_event_update_or_delete();

CREATE TRIGGER "audit_events_prevent_delete"
BEFORE DELETE ON "audit_events"
FOR EACH ROW
EXECUTE FUNCTION reject_audit_event_update_or_delete();
