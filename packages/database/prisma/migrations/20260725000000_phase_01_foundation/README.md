# Phase 01 Foundation Migration

This migration creates the approved Backend Foundation Phase 01 persistence layer only.

## Included Tables

- `users`
- `user_identities`
- `sessions`
- `employer_organizations`
- `organization_memberships`
- `residences`
- `departments`
- `work_groups`
- `role_definitions`
- `access_role_definitions`
- `permission_definitions`
- `access_role_permissions`
- `membership_access_roles`
- `job_request_sequences`
- `job_requests`
- `audit_actor_references`
- `audit_events`

## Explicitly Deferred

No dispatch, worker offer, assignment, attendance, timesheet, invoice, payment, notification, support, reporting, AI recommendation, payroll, or worker payable tables are created.

## Job Request Number Boundary

The migration establishes `job_request_sequences` plus a unique immutable `job_requests.job_request_number` column for future transaction-safe `JR-{YEAR}-{6-DIGIT-SEQUENCE}` allocation. The atomic generation service is not implemented in this migration.

## Rollback For Local/Test

For local or test databases only, roll back by dropping the migration with Prisma Migrate or by dropping tables in the reverse dependency order documented in `RESIDENT_JOB_BACKEND_FOUNDATION_SCHEMA_REVISION_01.md`.
