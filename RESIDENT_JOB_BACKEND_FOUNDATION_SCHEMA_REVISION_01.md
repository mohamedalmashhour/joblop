# Resident Job Backend Foundation Schema Revision 01

Status: REVISED SCHEMA PROPOSAL - OWNER APPROVAL REQUIRED
Accepted master workflow commit: `476c688`
Purpose: Reconcile Backend Foundation Phase 01 with the approved Master Operational Workflow.

This document does not modify the previous proposal silently. It supersedes the active Phase 01 proposal only if the owner approves it. No schema, migration, API, database table, authentication code, backend implementation, frontend integration, or test code has been created.

## 1. Approved Owner Rules

- Job Request is the central commercial and operational source of truth.
- Every staffing engagement begins with one Job Request.
- Downstream records must reference the originating Job Request.
- Shift is a derived operational schedule, not the top-level commercial object.
- A downstream record may have its own immutable identity but must not become an independent commercial order.
- Job Request Number is a permanent public operational reference.
- Job Request Number is unique, immutable, safe to display, backend-generated, collision-safe, auditable, searchable, never reused, and not editable by users.
- Phase 01 may include only identity, authentication foundation, organization membership, roles and permissions, EmployerOrganization, Residence, Department, WorkGroup, RoleDefinition, minimal Job Request foundation, Job Request Number generation, and audit actor/audit foundation.
- Dispatch, Worker Offer, Assignment, Attendance, Timesheet, Completion Review, Calculation Policy, Invoice, Employer Payment, Worker Payable, notifications, AI matching, support, and reporting remain deferred.

## 2. Differences From The Original Schema Proposal

| Area | Original Proposal | Revision 01 |
| --- | --- | --- |
| Central business object | No Job Request persistence in Phase 01 | Adds minimal `job_requests` as the source-of-truth foundation |
| Public operational reference | No human-readable request number | Adds immutable `job_request_number` and a generation mechanism |
| Work capsules | Not included | Adds `work_groups` and operational `role_definitions` catalogue |
| Role meaning | `role_definitions` described platform access roles | Splits access roles into `access_role_definitions` and operational staffing roles into `role_definitions` |
| Permissions | Same | Keeps Phase 01 permissions only; future permissions may be declared disabled only if owner approves |
| WorkerProfile | Included as boundary | Optional/deferred unless shared identity requires it |
| Audit | Actor reference only | Keeps `audit_actor_references`; proposes minimal `audit_events` because authoritative Job Request actions require immutable audit |
| Admin intake | Not present | Adds Job Request states required for submitted request, information required, and approved for dispatch |
| Tenant isolation | Organization/residence/department | Extends tenant isolation to Job Requests and catalogue visibility |
| Future workflow entities | Deferred | Still deferred; not pulled into Phase 01 |

## 3. Exact Phase 01 Entities

Required proposed entities:

1. `users`
2. `user_identities`
3. `sessions`
4. `employer_organizations`
5. `organization_memberships`
6. `residences`
7. `departments`
8. `work_groups`
9. `role_definitions`
10. `access_role_definitions`
11. `permission_definitions`
12. `access_role_permissions`
13. `membership_access_roles`
14. `job_request_sequences`
15. `job_requests`
16. `audit_actor_references`
17. `audit_events`

Optional/deferred:

- `worker_profiles` may remain deferred unless owner approves worker identity/profile persistence in Phase 01.

## 4. Exact Fields And Types

Types are PostgreSQL-oriented. Final migration syntax depends on the approved migration tool.

### `users`

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | yes | Primary key |
| `public_id` | `text` | yes | Unique external-safe account reference |
| `email_normalized` | `text` | yes | Lowercase canonical email; unique |
| `display_name` | `text` | no | User-facing name |
| `status` | `text` | yes | `email_verification_pending`, `active`, `restricted`, `disabled`, `closed` |
| `primary_language` | `text` | no | Country-neutral language preference |
| `created_at` | `timestamptz` | yes | Creation timestamp |
| `updated_at` | `timestamptz` | yes | Last update timestamp |
| `disabled_at` | `timestamptz` | no | Disabled account timestamp |
| `closed_at` | `timestamptz` | no | Account closure timestamp |

### `user_identities`

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | yes | Primary key |
| `user_id` | `uuid` | yes | FK to `users.id` |
| `provider` | `text` | yes | `local_password`, `dev_test`, `future_oauth` |
| `provider_subject` | `text` | yes | Provider-scoped subject |
| `email_verified_at` | `timestamptz` | no | Email verification only |
| `password_hash` | `text` | no | Hash only; no plaintext |
| `password_updated_at` | `timestamptz` | no | Password lifecycle timestamp |
| `mfa_state` | `text` | yes | `not_configured`, `optional`, `required`, `enrolled`, `locked` |
| `created_at` | `timestamptz` | yes | Creation timestamp |
| `updated_at` | `timestamptz` | yes | Last update timestamp |

### `sessions`

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | yes | Primary key |
| `user_id` | `uuid` | yes | FK to `users.id` |
| `session_hash` | `text` | yes | Unique hash only |
| `status` | `text` | yes | `active`, `expired`, `revoked` |
| `created_at` | `timestamptz` | yes | Creation timestamp |
| `expires_at` | `timestamptz` | yes | Expiration timestamp |
| `last_seen_at` | `timestamptz` | no | Recent use timestamp |
| `revoked_at` | `timestamptz` | no | Revocation timestamp |
| `ip_hash` | `text` | no | Hashed reference only |
| `user_agent_hash` | `text` | no | Hashed reference only |

### `employer_organizations`

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | yes | Primary key |
| `public_id` | `text` | yes | Unique external-safe reference |
| `legal_name` | `text` | yes | Business legal name |
| `display_name` | `text` | yes | User-facing organization name |
| `status` | `text` | yes | `invited`, `pending_review`, `active`, `restricted`, `suspended`, `closed` |
| `created_by_user_id` | `uuid` | no | FK to `users.id` |
| `reviewed_by_user_id` | `uuid` | no | FK to `users.id` |
| `created_at` | `timestamptz` | yes | Creation timestamp |
| `updated_at` | `timestamptz` | yes | Last update timestamp |
| `restricted_at` | `timestamptz` | no | Restriction timestamp |
| `suspended_at` | `timestamptz` | no | Suspension timestamp |
| `closed_at` | `timestamptz` | no | Closure timestamp |

### `organization_memberships`

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | yes | Primary key |
| `organization_id` | `uuid` | yes | FK to `employer_organizations.id` |
| `user_id` | `uuid` | yes | FK to `users.id` |
| `status` | `text` | yes | `invited`, `active`, `suspended`, `revoked`, `expired` |
| `invited_by_user_id` | `uuid` | no | FK to `users.id` |
| `created_at` | `timestamptz` | yes | Creation timestamp |
| `accepted_at` | `timestamptz` | no | Acceptance timestamp |
| `suspended_at` | `timestamptz` | no | Suspension timestamp |
| `revoked_at` | `timestamptz` | no | Revocation timestamp |
| `expired_at` | `timestamptz` | no | Expiration timestamp |

### `residences`

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | yes | Primary key |
| `public_id` | `text` | yes | Unique external-safe reference |
| `organization_id` | `uuid` | yes | FK to `employer_organizations.id` |
| `name` | `text` | yes | Residence/worksite display name |
| `status` | `text` | yes | `draft`, `active`, `restricted`, `inactive`, `closed` |
| `address_summary` | `text` | no | Operational location summary only |
| `city` | `text` | no | Country-neutral city |
| `region` | `text` | no | Province/state/region |
| `country` | `text` | no | ISO-compatible country text |
| `created_by_user_id` | `uuid` | no | FK to `users.id` |
| `created_at` | `timestamptz` | yes | Creation timestamp |
| `updated_at` | `timestamptz` | yes | Last update timestamp |
| `archived_at` | `timestamptz` | no | Archive timestamp |

### `departments`

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | yes | Primary key |
| `public_id` | `text` | yes | Unique external-safe reference |
| `organization_id` | `uuid` | yes | FK to `employer_organizations.id` |
| `residence_id` | `uuid` | yes | FK to `residences.id` |
| `name` | `text` | yes | Department/work area name |
| `status` | `text` | yes | `draft`, `active`, `restricted`, `inactive`, `closed` |
| `created_by_user_id` | `uuid` | no | FK to `users.id` |
| `created_at` | `timestamptz` | yes | Creation timestamp |
| `updated_at` | `timestamptz` | yes | Last update timestamp |
| `archived_at` | `timestamptz` | no | Archive timestamp |

### `work_groups`

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | yes | Primary key |
| `key` | `text` | yes | Unique stable key, e.g. `kitchen` |
| `display_label` | `text` | yes | Default label |
| `status` | `text` | yes | `active`, `inactive`, `retired` |
| `display_order` | `integer` | yes | Touch-first ordering |
| `icon_key` | `text` | no | UI icon reference, not implementation asset |
| `qualification_summary` | `text` | no | Catalogue-level summary |
| `safety_requirement_summary` | `text` | no | Catalogue-level safety summary |
| `default_template_key` | `text` | no | Future job-order template boundary |
| `created_at` | `timestamptz` | yes | Creation timestamp |
| `updated_at` | `timestamptz` | yes | Last update timestamp |

Recommended model: global platform-managed catalogue for Phase 01, with organization overrides deferred. This prevents each employer from creating incompatible role taxonomies before dispatch rules exist.

### `role_definitions`

Operational staffing roles, not access-control roles.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | yes | Primary key |
| `work_group_id` | `uuid` | yes | FK to `work_groups.id` |
| `key` | `text` | yes | Stable role key |
| `display_label` | `text` | yes | Default visible role label |
| `status` | `text` | yes | `active`, `inactive`, `retired` |
| `display_order` | `integer` | yes | Capsule ordering |
| `localized_label_key` | `text` | no | Localization boundary |
| `qualification_summary` | `text` | no | Worker qualification summary boundary |
| `safety_requirement_summary` | `text` | no | Safety/PPE/orientation boundary |
| `admin_configurable` | `boolean` | yes | Whether Admin may configure future metadata |
| `created_at` | `timestamptz` | yes | Creation timestamp |
| `updated_at` | `timestamptz` | yes | Last update timestamp |

Initial role catalogue:

- Kitchen: Chef, Sous-chef, Cook, Kitchen helper, Dishwasher
- Care / Nursing: Nurse, Licensed practical nurse, Personal support worker, Care aide
- Housekeeping / Support: Housekeeper, Laundry worker, Dining-room aide, General support
- Maintenance: General maintenance, Repair technician, Facility support, Emergency maintenance

### `access_role_definitions`

Access-control roles, replacing the original ambiguous `role_definitions` access-role use.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | yes | Primary key |
| `key` | `text` | yes | Unique access role key |
| `scope` | `text` | yes | `platform`, `organization`, `worker` |
| `status` | `text` | yes | `draft`, `active`, `restricted`, `retired` |
| `description` | `text` | no | Human-readable role purpose |
| `is_system` | `boolean` | yes | Seeded platform role marker |
| `created_at` | `timestamptz` | yes | Creation timestamp |
| `updated_at` | `timestamptz` | yes | Last update timestamp |

Initial access role keys mirror `packages/auth/src/index.ts`: `WORKER`, `EMPLOYER_OWNER`, `EMPLOYER_SCHEDULER`, `DISPATCHER`, `COMPLIANCE_REVIEWER`, `FINANCE_REVIEWER`, `SUPPORT_AGENT`, `PLATFORM_ADMIN`, `READ_ONLY_AUDITOR`.

### `permission_definitions`

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | yes | Primary key |
| `key` | `text` | yes | Unique permission key |
| `phase` | `text` | yes | `foundation_phase_01` or future phase marker |
| `implemented` | `boolean` | yes | False for disabled future placeholders |
| `description` | `text` | no | Human-readable permission purpose |
| `created_at` | `timestamptz` | yes | Creation timestamp |
| `updated_at` | `timestamptz` | yes | Last update timestamp |

Phase 01 permission keys:

- `organization.read`
- `organization.update`
- `residence.read`
- `residence.create`
- `residence.update`
- `department.read`
- `department.create`
- `department.update`
- `work_group.read`
- `role_definition.read`
- `job_request.create`
- `job_request.read`
- `job_request.update_draft`
- `job_request.submit`
- `job_request.cancel`
- `job_request.admin_read`
- `job_request.request_information`
- `job_request.approve_for_dispatch`
- `platform.supervise`
- `audit_actor_reference.read`
- `audit_event.read`

### `access_role_permissions`

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `access_role_definition_id` | `uuid` | yes | FK to `access_role_definitions.id` |
| `permission_definition_id` | `uuid` | yes | FK to `permission_definitions.id` |
| `created_at` | `timestamptz` | yes | Assignment timestamp |

Primary key: `(access_role_definition_id, permission_definition_id)`.

### `membership_access_roles`

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `membership_id` | `uuid` | yes | FK to `organization_memberships.id` |
| `access_role_definition_id` | `uuid` | yes | FK to `access_role_definitions.id` |
| `assigned_by_user_id` | `uuid` | no | FK to `users.id` |
| `created_at` | `timestamptz` | yes | Assignment timestamp |
| `revoked_at` | `timestamptz` | no | Revocation timestamp |

### `job_request_sequences`

Concurrency-safe Job Request Number support.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `scope_year` | `integer` | yes | Sequence year if annual reset is approved |
| `last_value` | `integer` | yes | Last allocated sequence value |
| `updated_at` | `timestamptz` | yes | Last allocation timestamp |

Primary key: `(scope_year)`.

This table is only recommended if Option C is approved. It is included in the revised proposal because it is the recommended generation strategy, but final implementation remains blocked until owner approval.

### `job_requests`

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | yes | Primary key |
| `job_request_number` | `text` | yes | Unique immutable public reference, e.g. `JR-2026-000184` |
| `organization_id` | `uuid` | yes | FK to `employer_organizations.id` |
| `residence_id` | `uuid` | yes | FK to `residences.id` |
| `department_id` | `uuid` | yes | FK to `departments.id` |
| `work_group_id` | `uuid` | yes | FK to `work_groups.id` |
| `role_definition_id` | `uuid` | yes | FK to operational `role_definitions.id` |
| `creator_user_id` | `uuid` | yes | FK to `users.id` |
| `title` | `text` | yes | Employer-visible request title |
| `description` | `text` | no | Basic job description |
| `number_of_workers` | `integer` | yes | Requested worker count; minimum 1 |
| `urgency` | `text` | yes | `normal`, `urgent`, `immediate` |
| `request_type` | `text` | yes | `single_day`, `multi_day`, `recurring_intent` |
| `timezone` | `text` | yes | IANA timezone string |
| `start_at` | `timestamptz` | yes | Requested start date/time |
| `end_at` | `timestamptz` | yes | Requested end date/time |
| `is_multi_day` | `boolean` | yes | Derived or explicitly stored boundary |
| `has_recurring_intent` | `boolean` | yes | Recurring indicator only; no recurrence engine |
| `status` | `text` | yes | Phase 01 Job Request status enum |
| `admin_review_reason` | `text` | no | Reason for Information Required / cancellation / approval note |
| `version` | `integer` | yes | Optimistic concurrency/versioning |
| `created_by_user_id` | `uuid` | yes | FK to `users.id` |
| `updated_by_user_id` | `uuid` | no | FK to `users.id` |
| `created_at` | `timestamptz` | yes | Creation timestamp |
| `updated_at` | `timestamptz` | yes | Last update timestamp |
| `submitted_at` | `timestamptz` | no | Submission timestamp |
| `cancelled_at` | `timestamptz` | no | Cancellation timestamp |
| `expired_at` | `timestamptz` | no | Expiration timestamp |
| `archived_at` | `timestamptz` | no | Archive timestamp |

Phase 01 intentionally does not include full dispatch, attendance, finance, safety, policy, payment, worker offer, or assignment structures.

### `audit_actor_references`

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | yes | Primary key |
| `actor_type` | `text` | yes | `user`, `system`, `service` |
| `user_id` | `uuid` | no | FK to `users.id` when actor is a user |
| `organization_id` | `uuid` | no | FK to `employer_organizations.id` where scoped |
| `display_label` | `text` | yes | Safe audit display label |
| `created_at` | `timestamptz` | yes | Creation timestamp |

### `audit_events`

Minimal immutable audit foundation for authoritative Phase 01 actions.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | yes | Primary key |
| `actor_reference_id` | `uuid` | yes | FK to `audit_actor_references.id` |
| `organization_id` | `uuid` | no | FK to `employer_organizations.id` where tenant-scoped |
| `entity_type` | `text` | yes | e.g. `job_request`, `organization`, `membership` |
| `entity_id` | `uuid` | yes | Internal entity ID |
| `entity_public_reference` | `text` | no | e.g. Job Request Number |
| `action` | `text` | yes | Controlled action key |
| `prior_state` | `text` | no | Previous state if applicable |
| `new_state` | `text` | no | New state if applicable |
| `reason` | `text` | no | Human/admin reason where required |
| `source` | `text` | yes | `api`, `admin`, `employer`, `worker`, `system` |
| `correlation_id` | `text` | yes | Request correlation identifier |
| `policy_version` | `text` | no | Future policy reference |
| `created_at` | `timestamptz` | yes | Immutable event timestamp |

Audit events are append-only. They must not become workflow source records.

### Optional `worker_profiles`

If approved for Phase 01:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | yes | Primary key |
| `user_id` | `uuid` | yes | Unique FK to `users.id` |
| `status` | `text` | yes | `draft`, `pending_review`, `active`, `restricted`, `suspended`, `closed` |
| `profile_completion_percent` | `integer` | yes | 0-100 boundary |
| `preferred_language` | `text` | no | Worker preference |
| `created_at` | `timestamptz` | yes | Creation timestamp |
| `updated_at` | `timestamptz` | yes | Last update timestamp |

Recommendation: defer unless worker sign-up persistence is implemented in the same Phase 01 slice.

## 5. Relationships

| Relationship | Cardinality | Notes |
| --- | --- | --- |
| `users` -> `user_identities` | 1 to many | User may have multiple auth-provider identities |
| `users` -> `sessions` | 1 to many | Sessions are revocable |
| `users` -> `organization_memberships` | 1 to many | User may belong to multiple organizations |
| `employer_organizations` -> `organization_memberships` | 1 to many | Membership governs tenant access |
| `employer_organizations` -> `residences` | 1 to many | Residence belongs to one organization |
| `residences` -> `departments` | 1 to many | Department belongs to one residence |
| `work_groups` -> `role_definitions` | 1 to many | Operational roles belong to work groups |
| `access_role_definitions` -> `access_role_permissions` | 1 to many | Access roles map to permissions |
| `permission_definitions` -> `access_role_permissions` | 1 to many | Permissions map to access roles |
| `organization_memberships` -> `membership_access_roles` | 1 to many | Membership may carry access roles |
| `access_role_definitions` -> `membership_access_roles` | 1 to many | Role assignment to memberships |
| `employer_organizations` -> `job_requests` | 1 to many | Job Request belongs to one organization |
| `residences` -> `job_requests` | 1 to many | Job Request uses one residence/worksite |
| `departments` -> `job_requests` | 1 to many | Job Request uses one department |
| `work_groups` -> `job_requests` | 1 to many | Job Request selects one work group |
| `role_definitions` -> `job_requests` | 1 to many | Job Request selects one operational role |
| `users` -> `job_requests` | 1 to many | Creator/updater attribution |
| `audit_actor_references` -> `audit_events` | 1 to many | Actor reference reused by audit events |
| `employer_organizations` -> `audit_events` | 1 to many | Tenant-scoped audit events |

## 6. State Enums

### User status

- `email_verification_pending`
- `active`
- `restricted`
- `disabled`
- `closed`

### Identity provider

- `local_password`
- `dev_test`
- `future_oauth`

### Session status

- `active`
- `expired`
- `revoked`

### Employer organization status

- `invited`
- `pending_review`
- `active`
- `restricted`
- `suspended`
- `closed`

### Membership status

- `invited`
- `active`
- `suspended`
- `revoked`
- `expired`

### Residence / Department status

- `draft`
- `active`
- `restricted`
- `inactive`
- `closed`

### Work group / operational role status

- `active`
- `inactive`
- `retired`

### Access role status

- `draft`
- `active`
- `restricted`
- `retired`

### Job Request status

- `draft`
- `submitted`
- `admin_review`
- `information_required`
- `approved_for_dispatch`
- `cancelled`
- `expired`
- `archived`

Phase 01 intentionally does not include `dispatching`, `offered_to_workers`, `partially_filled`, `filled`, `confirmed`, `in_progress`, `awaiting_completion_review`, `completed`, or `exception_review`. Those require future dispatch, assignment, attendance, timesheet, and finance entities.

### Job Request urgency

- `normal`
- `urgent`
- `immediate`

### Job Request type

- `single_day`
- `multi_day`
- `recurring_intent`

## 7. Constraints

- `users.public_id` unique.
- `users.email_normalized` unique.
- `user_identities(provider, provider_subject)` unique.
- `sessions.session_hash` unique.
- `employer_organizations.public_id` unique.
- Only one non-terminal `organization_memberships` record should exist per `(organization_id, user_id)`.
- `residences.public_id` unique.
- Active/non-archived `residences(organization_id, lower(name))` unique.
- `departments.public_id` unique.
- Active/non-archived `departments(residence_id, lower(name))` unique.
- `departments.organization_id` must match the owning organization of `departments.residence_id`.
- `work_groups.key` unique.
- Active `work_groups.display_order` should be unique or deterministic.
- `role_definitions.key` unique.
- `role_definitions(work_group_id, display_order)` deterministic for capsule ordering.
- `access_role_definitions.key` unique.
- `permission_definitions.key` unique.
- `access_role_permissions(access_role_definition_id, permission_definition_id)` primary key.
- One active `membership_access_roles(membership_id, access_role_definition_id)` assignment at a time.
- `job_requests.job_request_number` unique and immutable.
- `job_requests.number_of_workers >= 1`.
- `job_requests.end_at > job_requests.start_at`.
- `job_requests.organization_id` must match residence and department ownership.
- `job_requests.department_id` must belong to `job_requests.residence_id`.
- `job_requests.role_definition_id` must belong to `job_requests.work_group_id`.
- `job_requests.version >= 1`.
- `job_request_sequences.last_value >= 0`.
- `audit_events` append-only; no update/delete workflow.
- Status fields constrained to approved enum values.

## 8. Indexes

- `users(email_normalized)`
- `users(status)`
- `user_identities(user_id)`
- `user_identities(provider, provider_subject)`
- `sessions(session_hash)`
- `sessions(user_id, status)`
- `sessions(expires_at)`
- `employer_organizations(status)`
- `organization_memberships(organization_id, status)`
- `organization_memberships(user_id, status)`
- `residences(organization_id, status)`
- `residences(organization_id, name)`
- `departments(organization_id, status)`
- `departments(residence_id, status)`
- `departments(residence_id, name)`
- `work_groups(status, display_order)`
- `role_definitions(work_group_id, status, display_order)`
- `access_role_permissions(permission_definition_id)`
- `membership_access_roles(access_role_definition_id)`
- `job_request_sequences(scope_year)`
- `job_requests(job_request_number)`
- `job_requests(organization_id, status, created_at)`
- `job_requests(organization_id, residence_id, status)`
- `job_requests(organization_id, department_id, status)`
- `job_requests(organization_id, start_at)`
- `job_requests(status, submitted_at)`
- `job_requests(created_by_user_id, created_at)`
- `audit_actor_references(user_id)`
- `audit_actor_references(organization_id)`
- `audit_events(organization_id, created_at)`
- `audit_events(entity_type, entity_id, created_at)`
- `audit_events(entity_public_reference)`
- `audit_events(correlation_id)`

## 9. Job Request Number Generation Design

Recommended initial pattern: `JR-{YEAR}-{SEQUENCE}`.

Annual sequence reset is not assumed until owner approval. The recommended strategy supports annual reset but makes the reset policy explicit.

| Option | Concurrency Safety | Database Support | Transaction Behavior | Annual Reset | Rollback Behavior | Testability | Readability | Gap Risk | Multi-Region |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A. Database-backed yearly sequence | Strong if implemented with database sequence per year | Requires dynamic/yearly sequences or sequence-management DDL | Sequence allocation not usually rolled back | Natural by year-specific sequence | Gaps likely after rollback | Good, but yearly DDL harder | Excellent | Gaps possible; acceptable if documented | Harder across regions |
| B. Global database sequence with formatted year | Strong | Simple global sequence | Sequence allocation not rolled back | No true annual reset | Gaps likely | Very good | Good, but sequence does not reset | Gaps possible; acceptable | Better than yearly sequence |
| C. Dedicated counter record with row locking | Strong with transaction row lock | Standard relational table | Increment and Job Request create occur in same transaction | Supported by `scope_year` row | Rollback can roll back counter if same transaction | Excellent | Excellent | Fewer gaps, but gaps still possible after committed cancellation | Needs primary-writer or distributed locking in multi-region |
| D. Opaque public identifier plus display number | Strong for opaque ID; display number still needs strategy | Simple UUID/ULID plus optional display | Depends on display number design | Optional | Low collision risk for opaque ID | Good | Less friendly unless display number exists | Depends | Best for multi-region if display number not sequential |

Recommendation: Option C, dedicated counter record with row locking, for Phase 01.

Why:

- It directly supports the requested `JR-{YEAR}-{SEQUENCE}` pattern.
- It is collision-safe when allocated inside the same transaction that creates the Job Request.
- It is easy to test with concurrent creation.
- It avoids naive maximum-number-plus-one logic.
- It keeps the format configurable.
- It can preserve annual reset if owner approves `scope_year`.

Operational note:

- Gaps in Job Request Numbers should be acceptable and documented. No public operational reference should ever be reused after cancellation, rollback after external visibility, or deletion.
- If true multi-region writes are required later, this strategy must be revisited before multi-region deployment.

## 10. WorkGroup And RoleDefinition Catalogue Design

Recommended model: global platform-managed catalogue for Phase 01.

Why:

- Capsules must be consistent across employers.
- Admin dispatch needs a shared role vocabulary.
- Organization-specific overrides before dispatch rules exist would create duplicate staffing concepts.
- UI components should read the catalogue, not hardcode it.

Future extension:

- Organization-specific overrides can be added later through a separate `organization_work_group_overrides` or `organization_role_overrides` design if owner approves.

Catalogue seed:

| WorkGroup | Roles |
| --- | --- |
| Kitchen | Chef, Sous-chef, Cook, Kitchen helper, Dishwasher |
| Care / Nursing | Nurse, Licensed practical nurse, Personal support worker, Care aide |
| Housekeeping / Support | Housekeeper, Laundry worker, Dining-room aide, General support |
| Maintenance | General maintenance, Repair technician, Facility support, Emergency maintenance |

Localized label boundary:

- Store a stable key and default label in Phase 01.
- Full localization tables can be deferred.

Qualification/safety boundary:

- Store summaries only.
- Do not implement credential, compliance, or qualification-rule persistence in Phase 01.

## 11. Tenant Isolation Design

Tenant isolation rules:

- Every organization-owned record includes `organization_id`.
- Residence and Department ownership must match the Job Request organization.
- Job Request Number is safe to display but must not grant access.
- API access must always check authenticated user, account status, organization membership, membership status, role, and permission.
- Direct UUID guessing and Job Request Number searching must be scoped by authorization.
- Platform admin supervision must not silently become employer organization ownership.

Required isolation tests:

- unauthenticated denied
- invalid session denied
- suspended user denied
- revoked membership denied
- employer cannot read another organization
- employer cannot create Residence in another organization
- employer cannot use another organization's Department
- employer cannot create Job Request for another organization
- worker cannot manage employer organization
- ordinary employer cannot become platform Admin
- public Job Request Number cannot permit cross-tenant access
- direct ID guessing cannot bypass authorization

## 12. Authentication Compatibility

Repository reality:

- `packages/auth` currently defines role constants and `assertRole()`.
- `packages/config` supports `DATABASE_URL` and `SESSION_SECRET`.
- `packages/database` is a shell with migrations and business schema unauthorized until approval.
- No external auth provider is currently selected.

Schema compatibility:

- `users`, `user_identities`, and `sessions` support application-owned local/dev auth if approved.
- External provider support remains possible through `user_identities.provider` and `provider_subject`.
- Provider choice remains an owner decision before implementation if production external auth is desired.

Behavior after approval:

- sign up
- sign in
- sign out
- session validation
- disabled account handling
- expired session handling
- safe errors
- no account enumeration
- development/test mode separated from production
- no plaintext credentials
- no secrets in logs

## 13. Authorization Model

Authorization is deny-by-default.

Phase 01 authorization concepts:

- User != Organization.
- Authentication != Membership.
- Membership != Role.
- Organization Owner != Platform Admin.
- Access role != operational work role.
- Job Request creator != unrestricted Job Request authority.

Permission scope:

- Employer organization read/update.
- Residence read/create/update.
- Department read/create/update.
- Work-group read.
- Operational role-definition read.
- Job Request create/read/update draft/submit/cancel within authorized organization scope.
- Admin Job Request read, request information, approve for dispatch.
- Platform supervision boundary.

Future workflow permissions may be declared only as disabled/unimplemented placeholders if owner approves.

## 14. Audit Foundation

Every authoritative Phase 01 action must create or prepare for an immutable audit record.

Revision 01 recommends adding minimal `audit_events`, not only `audit_actor_references`, because Job Request submission and Admin intake actions are authoritative.

Minimum audited actions:

- user registration
- sign-in security event
- membership creation
- membership suspension/revocation
- organization creation/update
- residence creation/update
- department creation/update
- Job Request creation
- Job Request submission
- Information Required
- Approved for Dispatch
- cancellation

Audit boundary:

- Audit records are immutable.
- Audit records do not become workflow source records.
- UI history is not authoritative audit.
- Audit event visibility is permission-scoped.

## 15. Privacy Classification

| Entity | Classification | Rationale |
| --- | --- | --- |
| `users` | Restricted | Email and account identifiers |
| `user_identities` | Restricted | Authentication-provider and password-hash data |
| `sessions` | Restricted | Session/security references |
| `employer_organizations` | Confidential | Business tenant identity |
| `organization_memberships` | Restricted | Links people to access rights |
| `residences` | Confidential | Business operating locations |
| `departments` | Internal | Operational work areas |
| `work_groups` | Internal/Public-safe | Catalogue may be shown but managed internally |
| `role_definitions` | Internal/Public-safe | Operational role labels may be shown; configuration internal |
| `access_role_definitions` | Internal | Security vocabulary |
| `permission_definitions` | Internal | Security action vocabulary |
| `access_role_permissions` | Confidential | Access-control mapping |
| `membership_access_roles` | Restricted | Grants access to people |
| `job_request_sequences` | Internal | Operational reference generation |
| `job_requests` | Confidential/Restricted by field | Contains employer order, location, contact, and operational details |
| `audit_actor_references` | Confidential | Actor display references |
| `audit_events` | Restricted | Immutable activity evidence |
| `worker_profiles` | Restricted | Personal worker boundary if approved |

## 16. Retention Boundary

- Job Request Numbers are never reused.
- Cancelled, expired, or archived Job Requests remain retained as governed records.
- Organizations, residences, departments, memberships, Job Requests, and audit events should use status/archive behavior rather than physical deletion after production use.
- Legal retention periods are not defined here and require owner/legal approval.
- Audit events are immutable and retained according to future audit retention policy.

## 17. Migration Plan

No migration is authorized yet.

If approved:

1. Select migration tool/database client.
2. Create first migration for approved Phase 01 foundation tables only.
3. Apply to local/test only.
4. Seed access roles, permissions, work groups, operational roles, and test organization data.
5. Add database connection helpers in `packages/database`.
6. Add API/auth implementation only after migration approval.
7. Keep future workflow screens fixture-backed until their schema phases are approved.

## 18. Rollback Plan

Before production:

- Drop new tables in reverse dependency order in local/test.
- Rerun migrations and seeds after correction.

After production:

- Prefer forward corrective migrations.
- Do not reuse Job Request Numbers.
- Preserve audit events and Job Request references.
- Disable affected API routes rather than deleting governed records.

Reverse local/test destructive order:

1. Optional `worker_profiles`
2. `audit_events`
3. `audit_actor_references`
4. `job_requests`
5. `job_request_sequences`
6. `membership_access_roles`
7. `access_role_permissions`
8. `permission_definitions`
9. `access_role_definitions`
10. `role_definitions`
11. `work_groups`
12. `departments`
13. `residences`
14. `organization_memberships`
15. `employer_organizations`
16. `sessions`
17. `user_identities`
18. `users`

## 19. Seed/Catalogue Plan

Seed only development/test data and approved catalogues:

- platform admin
- read-only auditor
- dispatcher/admin intake user
- employer owner
- employer scheduler
- suspended/revoked membership test users
- one active employer organization
- one active residence
- two active departments
- access role definitions matching `packages/auth`
- Phase 01 permission definitions
- access role-permission mappings
- membership access-role assignments
- WorkGroup catalogue
- operational RoleDefinition catalogue
- initial `job_request_sequences` row only if Option C annual counter is approved
- sample Job Requests only in test fixtures, not production seed

No real personal, banking, tax, credential, health, payroll, payment, or worker compliance data.

## 20. Test Plan

Schema and migration tests:

- migration applies to empty database
- rollback works in local/test
- constraints reject invalid status values
- unique constraints reject duplicates
- FK constraints reject orphan records
- Job Request Number is unique and immutable
- concurrent Job Request creation produces unique numbers
- `end_at > start_at`
- department/residence/organization mismatch rejected
- role/work-group mismatch rejected

Auth/security tests:

- unauthenticated denied
- invalid session denied
- expired session denied
- disabled account denied
- no account enumeration
- no plaintext credentials
- no secrets logged

Authorization/tenant tests:

- revoked membership denied
- suspended membership denied
- employer cannot access another organization
- employer cannot use another organization's residence/department
- employer cannot create Job Request outside organization
- worker cannot manage employer organization
- ordinary employer cannot access platform admin
- Job Request Number search remains tenant-scoped

Workflow tests:

- create draft Job Request
- update draft Job Request
- submit Job Request
- move to Information Required
- approve for dispatch
- cancel Job Request
- audit event created for authoritative actions

## 21. Frontend Integration Impact

After schema and backend approval, integrate only:

Employer:

- sign up/sign in
- company profile
- residence setup
- department setup
- work-group capsule catalogue
- role selection
- initial Job Request creation
- draft save
- submit to Admin
- Job Request Number display
- Job Request status display

Admin:

- authentication boundary
- submitted Job Request intake list
- Job Request detail
- Information Required action
- Approved for Dispatch action

Worker:

- authentication may use shared identity foundation
- no Worker Offer, calendar, assignment, attendance, timesheet, payable, or mobile dispatch integration yet

All later screens remain fixture-backed and clearly labelled.

## 22. Deferred Entities

Deferred until later schema phases:

- JobRequestRequirement
- JobSchedule beyond basic start/end boundary
- JobCommercialTerm
- JobSafetyRequirement
- JobContact
- DispatchReview beyond Admin status/reason fields
- WorkerCandidate
- DispatchAttempt
- WorkerOffer
- Assignment
- WorkerCalendarEntry
- AttendanceRecord
- BreakRecord
- Timesheet
- EmployerCompletionReview
- CalculationPolicy
- CalculationResult
- Invoice
- EmployerPayment
- WorkerPayable
- Notification
- SupportCase
- Reporting models
- AI recommendation persistence
- Full worker compliance entities
- Full payment-provider entities

## 23. Owner Decisions Still Required

1. Approve or revise this Revision 01 schema.
2. Confirm PostgreSQL as the persistence target.
3. Select migration/database tooling.
4. Approve Option C for Job Request Number generation or select another option.
5. Decide whether annual sequence reset is approved for `JR-{YEAR}-{SEQUENCE}`.
6. Confirm gaps in Job Request Numbers are acceptable and numbers are never reused.
7. Approve global platform-managed WorkGroup/RoleDefinition catalogue for Phase 01.
8. Confirm access roles should be renamed to `access_role_definitions` to avoid conflict with operational roles.
9. Confirm whether full minimal `audit_events` are approved in Phase 01.
10. Decide whether optional `worker_profiles` remains deferred or included.
11. Confirm local password auth vs external provider before production auth implementation.
12. Confirm whether sessions are application-owned or delegated to an auth provider.
13. Confirm whether future permissions may be seeded as disabled placeholders.
14. Confirm first integration order after schema approval.

## 24. Final Recommendation

Approve Revision 01 with these core changes:

- Add `job_requests` as the Phase 01 source-of-truth foundation.
- Add immutable `job_request_number`.
- Use Option C, dedicated counter record with row locking, for the initial Job Request Number strategy.
- Add global platform-managed `work_groups`.
- Add operational `role_definitions` under WorkGroups.
- Rename access-control roles to `access_role_definitions`.
- Add minimal `audit_events` for authoritative Phase 01 actions.
- Keep WorkerProfile optional/deferred unless worker identity persistence is implemented in the same slice.
- Keep all dispatch, worker offer, assignment, attendance, timesheet, finance, notification, support, AI, and reporting entities deferred.

Verdict: revised Backend Foundation Phase 01 schema is ready for owner approval.
