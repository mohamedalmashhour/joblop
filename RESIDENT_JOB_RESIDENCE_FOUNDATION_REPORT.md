# Resident Job Residence Foundation Report

## 1. Starting HEAD

Starting accepted baseline:

- `e49da23` — `docs(resident-job): employer organization foundation report`

## 2. Final HEAD

Final HEAD will be the documentation commit created after validation.

## 3. Residence Model

Residence is implemented as the operational staffing location belonging to exactly one Employer Organization.

It remains distinct from:

- User
- OrganizationMembership
- EmployerOrganization
- Department
- WorkGroup
- RoleDefinition
- JobRequest

The implementation uses only the approved existing Phase 01 Residence schema fields:

- residence ID
- public residence ID
- employer organization ID
- name
- status
- address summary
- city
- region
- country
- created by user
- created at
- updated at
- archived at

No schema changes or migrations were introduced.

## 4. Employer Organization Ownership

Every Residence belongs to exactly one Employer Organization.

Rules enforced:

- no Residence without an Employer Organization
- no organization reassignment
- no cross-organization read
- no cross-organization update
- no cross-organization status change
- explicit organization context required
- active membership required
- correct permission required

EmployerOrganization logic is reused through the accepted organization repository boundary. Residence does not duplicate organization ownership logic.

## 5. Creation Flow

Implemented creation flow:

1. Authenticated user submits Residence data in an explicit organization context.
2. Membership and authorization are evaluated.
3. Employer Organization status is checked.
4. Residence input is validated.
5. Residence is created.
6. Residence audit event is written transactionally by the Prisma repository.
7. Authoritative Residence response is returned.

Creation does not create Departments, Job Requests, workers, finance records, staffing requirements, or operational data.

## 6. Read, List, and Update Boundary

Implemented:

- read one Residence inside an approved organization context
- list Residences for one Employer Organization
- optional status filter using approved schema statuses
- update approved Residence fields only

Not implemented:

- global Residence search
- cross-tenant queries
- Department routes
- Job Request routes
- staffing endpoints
- frontend onboarding integration

## 7. Status Lifecycle

The approved schema defines:

- draft
- active
- restricted
- inactive
- closed

Implemented governed transitions:

- draft to active
- draft to closed
- active to inactive
- inactive to active
- active to closed
- inactive to closed

Closed Residence records remain readable but cannot be operationally updated. Closed to active is not allowed.

Because the approved schema does not define a `suspended` Residence state, the operationally restricted/suspended-like state is represented by the existing `inactive` state. No new enum value was added.

## 8. Authorization

Implemented using existing approved permissions:

- `residence.read`
- `residence.create`
- `residence.update`

These permissions were activated for this phase only. Department, WorkGroup, RoleDefinition, and Job Request permissions remain reserved.

Checks include:

- authenticated user
- active user session
- explicit organization context
- active membership
- required role permission
- Employer Organization status
- Residence organization ownership
- Residence lifecycle status

## 9. Tenant Isolation

Validated:

- anonymous create denied
- no organization context denied
- invited membership denied
- suspended membership denied
- revoked membership denied
- expired membership denied
- missing `residence.create` denied
- missing `residence.read` denied
- missing `residence.update` denied
- organization A cannot read organization B Residence
- organization A cannot list organization B Residences
- organization A cannot update organization B Residence
- guessed Residence ID denied safely
- Platform Administrator supervision does not imply ownership
- suspended Employer Organization blocks ordinary Residence management
- closed Employer Organization blocks ordinary Residence management

## 10. API and Service Boundary

Implemented minimum Residence API routes:

- `POST /organizations/:organizationId/residences`
- `GET /organizations/:organizationId/residences`
- `GET /organizations/:organizationId/residences/:residenceId`
- `PATCH /organizations/:organizationId/residences/:residenceId`
- `POST /organizations/:organizationId/residences/:residenceId/status`

No broad public search, Department API, Job Request API, staffing API, finance API, notification API, or frontend integration was added.

## 11. Audit Events

Implemented audit event support for:

- Residence created
- Residence updated
- Residence inactivated
- Residence reactivated
- Residence closed
- sensitive denied Residence access

Audit includes actor, organization, Residence ID, prior/new state, reason where supplied, timestamp, correlation ID, source, and policy version.

No passwords, session tokens, secrets, or unnecessary contact payloads are logged.

## 12. Concurrency Handling

Optimistic concurrency uses the existing `updatedAt` timestamp as the approved version token.

Validated:

- valid version update succeeds
- stale version update fails safely
- status transition requires current version
- invalid version fails safely

No new version column was added.

## 13. Tests

Tests cover:

- create Residence
- read Residence
- list organization Residences
- successful update
- stale update rejection
- active to inactive
- inactive to active
- active to closed
- invalid closed to active transition
- closed Residence remains readable
- closed Residence cannot be operationally updated
- audit event creation
- no partial write if transactional audit fails
- organization ID cannot be changed
- tenant isolation
- membership state denial
- permission denial
- API route coverage
- Membership regression tests
- Authorization regression tests
- Employer Organization regression tests

## 14. Security Validation

Security controls preserved:

- deny by default
- safe external errors
- explicit organization context
- minimum Residence fields exposed
- no raw database error exposure
- no cross-tenant leakage
- no internal audit metadata in ordinary responses
- no secrets logged

## 15. Deferred Department Work

Deferred to later approved phases:

- Department Foundation
- Department routes
- Department ownership under Residence
- Work Groups
- Role Definitions
- Job Request Foundation
- Residence-specific staffing requirements
- floors, rooms, units, beds, equipment, parking, compliance documents, billing configuration, and payroll/payment data

## 16. Remaining Risks

- The conceptual request listed contact, timezone, postal code, and address-line fields, but the approved Phase 01 schema currently supports only address summary, city, region, and country. No schema proposal was made because the Residence Foundation can operate with existing fields.
- The schema uses `inactive`, not `suspended`, for the Residence restricted-operation state.
- `updatedAt` is used as the concurrency token because no explicit version column exists in the approved schema.
- Residence creation audit is transactional in the Prisma repository; non-Prisma in-memory test repositories model that behavior for validation only.

## 17. Readiness Verdict

**RESIDENCE FOUNDATION READY FOR OWNER REVIEW**

Residence Foundation is implemented as a tenant-bound operational location service with safe API routes, membership and authorization enforcement, audit hooks, lifecycle controls, and optimistic concurrency while preserving Department and Job Request boundaries.
