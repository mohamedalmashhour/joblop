# Resident Job Backend Foundation Schema Proposal

Status: SCHEMA APPROVAL REQUIRED BEFORE IMPLEMENTATION
Baseline reviewed: `4794996`
Scope: Backend Foundation Phase 01 schema decision gate

This document is a proposal only. No schema file, migration, database table, API, backend route, seed data, or implementation code has been created.

## 1. Existing Persistence Architecture

The repository currently has a backend shell, not an authorized business persistence layer.

Current findings:

- `apps/api` exposes a Fastify API with only `GET /health`.
- `apps/api/.env.example` includes `DATABASE_URL` and `SESSION_SECRET`, but no database client is wired.
- `packages/database` exposes `getDatabaseShellStatus()` and explicitly reports:
  - `migrationsAuthorized: false`
  - `businessSchemaAuthorized: false`
- No `schema.prisma`, Drizzle config, SQL migrations, migration directory, or ORM configuration was found.
- `packages/auth` defines role constants and `assertRole()`, but does not implement authentication, sessions, providers, MFA, password storage, or authorization persistence.
- `packages/shared/src/domain/platformIntegration.ts` defines canonical platform concepts and state vocabulary. Those shared types are compatibility references, not persistence.
- Frontend employer, worker, and admin journeys are currently fixture-backed or integration-pending where backend persistence is required.

Recommended persistence direction:

- Use a PostgreSQL-compatible relational schema because `DATABASE_URL` is already represented as a PostgreSQL URL in `apps/api/.env.example`.
- Do not select an ORM or migration runner as part of this document. That remains an owner/engineering decision before implementation.
- Keep Phase 01 limited to identity, organization structure, membership, roles, permissions, worker profile boundary, and audit actor references.

Explicitly out of scope for this schema phase:

- Shifts
- Applications
- Recommendations
- Assignments
- Attendance records
- Timesheets
- Invoices
- Payments
- Payroll
- Notifications
- Messages
- Support cases
- Full audit event persistence
- Reports
- AI execution or AI recommendation storage

## 2. Proposed Minimum Entities

The minimum approved backend foundation should introduce only these entities:

| Entity | Purpose | Primary Owner |
| --- | --- | --- |
| `users` | Account-level user record shared by worker, employer, and admin surfaces | Platform |
| `user_identities` | Authentication-provider identity boundary | Authentication |
| `sessions` | Revocable session boundary | Authentication |
| `employer_organizations` | Employer organization identity and operational scope | Admin / Employer |
| `organization_memberships` | User membership in an employer organization | Organization Admin |
| `residences` | Employer operating locations | Employer |
| `departments` | Work areas within residences | Employer |
| `role_definitions` | Canonical role vocabulary | Admin |
| `permission_definitions` | Canonical permission vocabulary | Admin |
| `role_permissions` | Role-to-permission mapping | Admin |
| `membership_roles` | Membership-to-role assignment | Organization Admin |
| `worker_profiles` | Worker profile boundary only | Worker |
| `audit_actor_references` | Actor reference for future audit records | System |

## 3. Exact Fields

Field types are proposed in PostgreSQL terms. Final syntax depends on the approved migration tool.

### `users`

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | yes | Primary key |
| `public_id` | `text` | yes | Unique external-safe reference |
| `email_normalized` | `text` | yes | Lowercase canonical email; unique |
| `display_name` | `text` | no | User-facing name |
| `status` | `text` | yes | `email_verification_pending`, `active`, `restricted`, `disabled`, `closed` |
| `primary_language` | `text` | no | Compatible with shared language values, not jurisdiction-specific |
| `created_at` | `timestamptz` | yes | Creation timestamp |
| `updated_at` | `timestamptz` | yes | Last update timestamp |
| `disabled_at` | `timestamptz` | no | Set when disabled |
| `closed_at` | `timestamptz` | no | Set when closed |

### `user_identities`

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | yes | Primary key |
| `user_id` | `uuid` | yes | FK to `users.id` |
| `provider` | `text` | yes | `local_password`, `dev_test`, `future_oauth` |
| `provider_subject` | `text` | yes | Provider-scoped subject |
| `email_verified_at` | `timestamptz` | no | Email verification only; not identity verification |
| `password_hash` | `text` | no | Hash only; never plaintext |
| `password_updated_at` | `timestamptz` | no | Password lifecycle reference |
| `mfa_state` | `text` | yes | `not_configured`, `optional`, `required`, `enrolled`, `locked` |
| `created_at` | `timestamptz` | yes | Creation timestamp |
| `updated_at` | `timestamptz` | yes | Last update timestamp |

Authentication remains separate from identity verification, credential verification, worker approval, employer approval, eligibility, and employment.

### `sessions`

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | yes | Primary key |
| `user_id` | `uuid` | yes | FK to `users.id` |
| `session_hash` | `text` | yes | Unique hash only; no raw session secret |
| `status` | `text` | yes | `active`, `expired`, `revoked` |
| `created_at` | `timestamptz` | yes | Creation timestamp |
| `expires_at` | `timestamptz` | yes | Expiration timestamp |
| `last_seen_at` | `timestamptz` | no | Recent use timestamp |
| `revoked_at` | `timestamptz` | no | Revocation timestamp |
| `ip_hash` | `text` | no | Hashed reference only |
| `user_agent_hash` | `text` | no | Hashed reference only |

Session persistence does not define cookies, JWTs, token format, or authentication middleware.

### `employer_organizations`

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | yes | Primary key |
| `public_id` | `text` | yes | Unique external-safe reference |
| `legal_name` | `text` | yes | Business legal name |
| `display_name` | `text` | yes | User-facing name |
| `status` | `text` | yes | `invited`, `pending_review`, `active`, `restricted`, `suspended`, `closed` |
| `created_by_user_id` | `uuid` | no | FK to `users.id` |
| `reviewed_by_user_id` | `uuid` | no | FK to `users.id`; human review only |
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

Invitation is not an active account. Membership is not authentication.

### `residences`

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | yes | Primary key |
| `public_id` | `text` | yes | Unique external-safe reference |
| `organization_id` | `uuid` | yes | FK to `employer_organizations.id` |
| `name` | `text` | yes | Residence name |
| `status` | `text` | yes | `draft`, `active`, `restricted`, `inactive`, `closed` |
| `address_summary` | `text` | no | Operational display only; no clinical records |
| `city` | `text` | no | Country-neutral location field |
| `region` | `text` | no | Province/state/region text |
| `country` | `text` | no | ISO-compatible text value, not hardcoded |
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
| `name` | `text` | yes | Department name |
| `status` | `text` | yes | `draft`, `active`, `restricted`, `inactive`, `closed` |
| `created_by_user_id` | `uuid` | no | FK to `users.id` |
| `created_at` | `timestamptz` | yes | Creation timestamp |
| `updated_at` | `timestamptz` | yes | Last update timestamp |
| `archived_at` | `timestamptz` | no | Archive timestamp |

Departments are residence-scoped in this proposal. If organization-wide departments are required, that is an owner decision before implementation.

### `role_definitions`

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | yes | Primary key |
| `key` | `text` | yes | Unique role key |
| `scope` | `text` | yes | `platform`, `organization`, `worker` |
| `status` | `text` | yes | `draft`, `active`, `restricted`, `retired` |
| `description` | `text` | no | Human-readable role purpose |
| `is_system` | `boolean` | yes | True for seeded platform roles |
| `created_at` | `timestamptz` | yes | Creation timestamp |
| `updated_at` | `timestamptz` | yes | Last update timestamp |

Initial role keys should mirror `packages/auth/src/index.ts`:

- `WORKER`
- `EMPLOYER_OWNER`
- `EMPLOYER_SCHEDULER`
- `DISPATCHER`
- `COMPLIANCE_REVIEWER`
- `FINANCE_REVIEWER`
- `SUPPORT_AGENT`
- `PLATFORM_ADMIN`
- `READ_ONLY_AUDITOR`

### `permission_definitions`

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | yes | Primary key |
| `key` | `text` | yes | Unique permission key |
| `phase` | `text` | yes | `foundation_phase_01` or future phase marker |
| `implemented` | `boolean` | yes | False for future placeholders |
| `description` | `text` | no | Human-readable permission purpose |
| `created_at` | `timestamptz` | yes | Creation timestamp |
| `updated_at` | `timestamptz` | yes | Last update timestamp |

Recommended Phase 01 permission keys:

- `user.self.read`
- `user.self.update_basic`
- `organization.read`
- `organization.update_basic`
- `organization.membership.read`
- `organization.membership.invite`
- `organization.membership.suspend`
- `residence.read`
- `residence.create`
- `residence.update_basic`
- `department.read`
- `department.create`
- `department.update_basic`
- `role.read`
- `role.assign_membership`
- `worker_profile.read_self`
- `worker_profile.update_boundary`
- `audit_actor_reference.read`

### `role_permissions`

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `role_definition_id` | `uuid` | yes | FK to `role_definitions.id` |
| `permission_definition_id` | `uuid` | yes | FK to `permission_definitions.id` |
| `created_at` | `timestamptz` | yes | Assignment timestamp |

Primary key: `(role_definition_id, permission_definition_id)`.

### `membership_roles`

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `membership_id` | `uuid` | yes | FK to `organization_memberships.id` |
| `role_definition_id` | `uuid` | yes | FK to `role_definitions.id` |
| `assigned_by_user_id` | `uuid` | no | FK to `users.id` |
| `created_at` | `timestamptz` | yes | Assignment timestamp |
| `revoked_at` | `timestamptz` | no | Revocation timestamp |

Role is not permission. Authentication does not grant permissions. Permissions are resolved through membership status, role assignments, account status, and operational rules.

### `worker_profiles`

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | yes | Primary key |
| `user_id` | `uuid` | yes | Unique FK to `users.id` |
| `status` | `text` | yes | `draft`, `pending_review`, `active`, `restricted`, `suspended`, `closed` |
| `profile_completion_percent` | `integer` | yes | 0-100 boundary value only |
| `preferred_language` | `text` | no | Worker preference |
| `created_at` | `timestamptz` | yes | Creation timestamp |
| `updated_at` | `timestamptz` | yes | Last update timestamp |

This is a boundary record only. It does not store licenses, certifications, background checks, availability, assignments, attendance, timesheets, payroll, banking, or protected health information.

### `audit_actor_references`

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | yes | Primary key |
| `actor_type` | `text` | yes | `user`, `system`, `service` |
| `user_id` | `uuid` | no | FK to `users.id` when actor is a user |
| `organization_id` | `uuid` | no | FK to `employer_organizations.id` when scoped |
| `display_label` | `text` | yes | Safe label for audit display |
| `created_at` | `timestamptz` | yes | Creation timestamp |

This table only provides actor references for future audit events. It does not store the audit event log.

## 4. Relationships

| Relationship | Cardinality | Notes |
| --- | --- | --- |
| `users` -> `user_identities` | 1 to many | A user may have multiple provider identities |
| `users` -> `sessions` | 1 to many | Sessions are revocable independently |
| `users` -> `worker_profiles` | 1 to 0/1 | Worker boundary is optional |
| `employer_organizations` -> `organization_memberships` | 1 to many | Membership governs organization access |
| `users` -> `organization_memberships` | 1 to many | A user may belong to multiple organizations |
| `employer_organizations` -> `residences` | 1 to many | Residences belong to one organization |
| `residences` -> `departments` | 1 to many | Departments are residence-scoped |
| `role_definitions` -> `role_permissions` | 1 to many | Role permission mapping |
| `permission_definitions` -> `role_permissions` | 1 to many | Permission role mapping |
| `organization_memberships` -> `membership_roles` | 1 to many | Membership may carry multiple roles |
| `role_definitions` -> `membership_roles` | 1 to many | Role assignment to memberships |
| `users` -> `audit_actor_references` | 1 to many | Optional actor reference |
| `employer_organizations` -> `audit_actor_references` | 1 to many | Optional organization-scoped actor reference |

## 5. Constraints

Recommended hard constraints:

- `users.public_id` unique.
- `users.email_normalized` unique.
- `user_identities.provider, user_identities.provider_subject` unique.
- `sessions.session_hash` unique.
- `employer_organizations.public_id` unique.
- `organization_memberships.organization_id, organization_memberships.user_id` should allow only one non-terminal membership at a time.
- `residences.public_id` unique.
- `residences.organization_id, lower(name)` unique for non-archived residences.
- `departments.public_id` unique.
- `departments.residence_id, lower(name)` unique for non-archived departments.
- `role_definitions.key` unique.
- `permission_definitions.key` unique.
- `role_permissions.role_definition_id, role_permissions.permission_definition_id` primary key.
- `membership_roles.membership_id, role_definition_id` should allow only one active assignment at a time.
- `worker_profiles.user_id` unique.
- Status fields must be constrained to approved values.
- `worker_profiles.profile_completion_percent` must be between 0 and 100.
- `departments.organization_id` must match the organization owning `departments.residence_id`. If the selected migration tool cannot enforce this directly, it must be enforced in service logic and covered by tests.

Deletion approach:

- Prefer status transitions and archival timestamps over physical deletion.
- Physical deletion must not be used for governed business records without an approved retention policy.

## 6. Indexes

Recommended indexes:

- `users(email_normalized)`
- `users(status)`
- `user_identities(user_id)`
- `user_identities(provider, provider_subject)`
- `sessions(user_id, status)`
- `sessions(expires_at)`
- `sessions(session_hash)`
- `employer_organizations(status)`
- `employer_organizations(display_name)`
- `organization_memberships(organization_id, status)`
- `organization_memberships(user_id, status)`
- `residences(organization_id, status)`
- `residences(organization_id, name)`
- `departments(organization_id, status)`
- `departments(residence_id, status)`
- `departments(residence_id, name)`
- `role_permissions(permission_definition_id)`
- `membership_roles(role_definition_id)`
- `worker_profiles(user_id)`
- `worker_profiles(status)`
- `audit_actor_references(user_id)`
- `audit_actor_references(organization_id)`

## 7. Data-Retention Considerations

Retention should be conservative and status-driven:

- User records: retained while account is active, restricted, disabled, or required for audit/accountability.
- User identities: retained while linked to an account; password hashes rotated or invalidated according to security policy.
- Sessions: expire automatically; revoked and expired session references may be retained briefly for security review using hashed values only.
- Organizations, residences, departments: archived rather than deleted while downstream operational records may exist.
- Memberships and role assignments: retained as governance history.
- Worker profile boundary: retained while the account exists and while required for operational accountability.
- Audit actor references: retained as long as future audit event records may reference them.

No jurisdiction-specific retention periods are proposed here. Legal review and operational policy must define final retention timelines before production.

## 8. Privacy Classification

| Entity | Classification | Privacy Notes |
| --- | --- | --- |
| `users` | Personal information | Email and display name; minimum necessary exposure |
| `user_identities` | Highly sensitive authentication data | Password hash and provider subject must never be exposed |
| `sessions` | Highly sensitive security data | Store hashes only; never expose raw secrets |
| `employer_organizations` | Business confidential | Visible by authorized membership and admin role |
| `organization_memberships` | Personal and organizational access data | Access-controlled; not broadly visible |
| `residences` | Business operational data | Do not store clinical or resident data |
| `departments` | Business operational data | Do not store clinical or resident data |
| `role_definitions` | Security governance data | Readable only where authorized |
| `permission_definitions` | Security governance data | Readable only where authorized |
| `role_permissions` | Security governance data | Admin-controlled |
| `membership_roles` | Security governance data | Admin or authorized organization owner controlled |
| `worker_profiles` | Personal worker data | Boundary only; does not include documents or protected data |
| `audit_actor_references` | Audit governance data | Safe labels only; no secrets |

Explicitly prohibited in Phase 01:

- Banking details
- Tax identifiers
- Health information
- Credential documents
- Background-check documents
- Internal fraud indicators
- Investigation notes
- Secret tokens or recovery codes

## 9. Authorization Implications

Authorization must remain separate from authentication:

- Authentication answers who is attempting access.
- Authorization answers what that authenticated user may do.
- Email verification is not identity verification.
- Identity verification is not credential verification.
- Credential verification is not worker approval.
- Worker approval is not shift eligibility.
- Organization membership is not platform administration.

Recommended rules:

- Deny by default.
- Account status must be checked before organization or worker access.
- Organization access requires active membership.
- Organization role assignment requires active membership.
- Suspended or revoked memberships must not grant access.
- Worker profile access is self-scoped unless a future approved workflow grants limited visibility.
- Employer users must not access worker private profile details through this foundation schema.
- Admin role access must be resolved through platform role assignment, not through employer organization membership.
- AI receives no direct authority from these tables.

Phase 01 should only enable role/permission resolution for identity, organization, residence, department, and worker profile boundary workflows.

## 10. Migration Strategy

No migration is authorized yet.

If approved, the smallest implementation strategy is:

1. Owner approves this proposal or requests changes.
2. Engineering selects the migration tool and database client.
3. Add a first migration containing only the approved tables, constraints, and indexes.
4. Add database package helpers for connecting and checking migration readiness.
5. Apply migration only in local/test environments first.
6. Add seed data for local development and tests.
7. Add API integration only for approved foundation flows.
8. Keep future business workflows fixture-backed until their schemas are approved.

Compatibility note:

- Because no ORM exists today, introducing Prisma, Drizzle, Knex, raw SQL migrations, or another tool is itself an implementation decision and should be approved before code changes.

## 11. Rollback Strategy

Before production:

- Rollback can drop the new foundation tables in reverse dependency order.
- Local/test data can be reseeded.
- No business workflow records exist in this phase, so rollback impact is limited to foundation account and organization data.

After production:

- Physical rollback must be avoided unless data has not been used.
- Prefer forward corrective migrations.
- Disable new API routes if needed while preserving data.
- Preserve users, memberships, role assignments, and audit actor references unless legal/security policy authorizes removal.

Reverse dependency order for destructive local rollback:

1. `membership_roles`
2. `role_permissions`
3. `audit_actor_references`
4. `worker_profiles`
5. `sessions`
6. `user_identities`
7. `departments`
8. `residences`
9. `organization_memberships`
10. `permission_definitions`
11. `role_definitions`
12. `employer_organizations`
13. `users`

## 12. Seed Strategy

Recommended local/test seed only:

- One platform administrator.
- One read-only auditor.
- One support agent.
- One employer organization in `active` state.
- One employer owner membership.
- One employer scheduler membership.
- One suspended employer membership.
- One residence in `active` state.
- Two departments in `active` state.
- One worker user with a `worker_profiles` boundary record.
- One restricted worker user for access-denial testing.
- Seeded role definitions matching `packages/auth`.
- Seeded permission definitions for foundation workflows only.
- Seeded role-permission mappings.
- No real personal data.
- No production-like banking, payroll, credential, health, or background-check data.

Seed data must be clearly labelled as development/test fixtures.

## 13. Test Strategy

Required tests before migration approval becomes implementation:

- Migration applies cleanly to an empty local/test database.
- Migration rollback works in local/test.
- Seed data loads idempotently or fails safely.
- Unique constraints reject duplicate emails, public IDs, memberships, roles, and permissions.
- Foreign keys reject orphan identities, sessions, memberships, residences, departments, and roles.
- Department organization/residence mismatch is rejected.
- Suspended, revoked, disabled, and closed states deny access.
- Authentication does not imply authorization.
- Email verification does not imply identity verification.
- Worker profile completion does not imply worker approval.
- Organization membership does not imply platform admin authority.
- Sessions store only hashes, not raw tokens.
- Sensitive fields are never returned in API responses.
- Cross-organization access is denied.
- Worker profile boundary does not expose credential, license, background-check, banking, payroll, or health data.

Required command set after implementation is authorized:

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- Package-specific API/database tests
- Build commands for affected applications

## 14. Compatibility With Employer, Worker, and Admin Frontends

### Employer Frontend

Compatible foundation capabilities:

- Employer sign-up can create a user boundary after owner-approved auth implementation.
- Organization creation can map to `employer_organizations`.
- Employer membership can map to `organization_memberships`.
- Residence creation can map to `residences`.
- Department setup can map to `departments`.
- Employer role checks can map to `membership_roles` and `role_permissions`.

Still not supported by this schema:

- Shift creation
- Applications
- AI recommendations
- Assignment
- Attendance
- Timesheets
- Invoices
- Payments
- Reports
- Messages
- Support

### Worker Frontend

Compatible foundation capabilities:

- Worker account record can map to `users`.
- Worker authentication identity can map to `user_identities`.
- Worker profile boundary can map to `worker_profiles`.
- Preferred language and profile completion can be represented at a boundary level.

Still not supported by this schema:

- Professional information
- Licenses
- Certifications
- Background checks
- Availability
- Shift discovery
- Applications
- Accepted shifts
- Attendance
- Timesheets
- Earnings
- Payments
- Ratings
- Documents

### Admin Frontend

Compatible foundation capabilities:

- User administration can map to `users`, `user_identities`, `sessions`, and `worker_profiles`.
- Employer administration can map to `employer_organizations`.
- Residence and department administration can map to `residences` and `departments`.
- Role/permission visibility can map to role and permission tables.
- Audit log pages can later reference `audit_actor_references`.

Still not supported by this schema:

- Full audit log event persistence
- Compliance workflows
- Shift management
- Finance
- Payroll
- Reports
- AI Control Center persistence
- Notification Center persistence

## Owner Decisions Required

Implementation must not begin until these decisions are resolved:

1. Approve, reject, or revise this foundation schema.
2. Confirm PostgreSQL as the persistence target.
3. Select migration strategy and database client or ORM.
4. Confirm whether departments are strictly residence-scoped in Phase 01.
5. Confirm whether local password authentication is part of Phase 01 or deferred behind provider selection.
6. Confirm whether `sessions` should be persisted in the application database or delegated to a future auth provider.
7. Confirm that `audit_actor_references` may be created without full audit event persistence.
8. Confirm the permitted local/test seed users and organizations.

## Final Gate Status

Backend Foundation Phase 01 is blocked at the schema decision gate.

No migration is authorized.
No schema change is authorized.
No API implementation is authorized.
No authentication implementation is authorized.
No database work is authorized until owner approval is received.
