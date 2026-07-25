# Resident Job Department Foundation Report

## 1. Starting HEAD

`f452c26` — `docs(resident-job): residence foundation report`

## 2. Final HEAD

Pending local commits at the time this report was authored.

## 3. Department Model

The Department Foundation uses the existing approved Phase 01 `Department` entity only.

Implemented fields:

- Department ID
- Public Department ID
- Employer Organization ID
- Residence ID
- Name
- Status
- Created-by user reference
- Created timestamp
- Updated timestamp
- Archived timestamp
- Version derived from `updatedAt`

No schema fields were added.

Deferred because they are not present in the approved schema:

- Description
- Preferred language
- Primary contact
- Staffing requirements
- WorkGroup mappings
- RoleDefinition mappings
- Schedules
- Budgets
- Payroll or billing fields
- Compliance documents
- Job Request fields

## 4. Residence Ownership

Every Department belongs to exactly one Residence.

The service requires:

- explicit `organizationId`
- explicit `residenceId`
- explicit `departmentId` for read/update/status operations

The Residence parent is validated before Department creation, listing, reading, updating, or status changes.

## 5. Employer Organization Ownership Chain

The implemented ownership chain is:

`Employer Organization -> Residence -> Department`

The effective tenant boundary is inherited through the parent Residence. A Department cannot be accessed unless the Residence belongs to the same Employer Organization context.

## 6. Creation Flow

Implemented flow:

1. Validate authenticated actor at the API boundary.
2. Validate organization context through active membership.
3. Validate `department.create` permission.
4. Validate Employer Organization status.
5. Validate Residence ownership and status.
6. Validate Department name.
7. Create Department.
8. Write `department.created` audit event transactionally where Prisma is used.
9. Return authoritative Department payload.

Creation does not create Work Groups, Role Definitions, Job Requests, worker records, or finance records.

## 7. Read/List/Update Boundary

Implemented API/service operations:

- create Department under one Residence
- read one Department under one Residence
- list Departments for one Residence
- update Department name
- change Department status

Not implemented:

- global Department search
- cross-organization Department queries
- cross-Residence reassignment
- public Department access
- Department-to-WorkGroup mapping
- Department-to-Job Request workflow

## 8. Status Lifecycle

The approved schema status values are:

- `draft`
- `active`
- `restricted`
- `inactive`
- `closed`

Supported lifecycle transitions:

- `draft -> active`
- `draft -> closed`
- `active -> inactive`
- `inactive -> active`
- `active -> closed`
- `inactive -> closed`

Rejected transition:

- `closed -> active`

`inactive` represents the approved suspended-like operational pause because the current schema does not define a separate `suspended` Department status.

Closed Departments remain readable for history but cannot be operationally updated.

## 9. Authorization

The Department Foundation activates only the existing approved permissions:

- `department.read`
- `department.create`
- `department.update`

Authorization requires:

- authenticated user
- active user account through session validation
- explicit organization context
- active organization membership
- required role permission
- active Employer Organization
- active Residence for ordinary management
- matching Department ownership chain

Deny-by-default behavior is preserved.

## 10. Tenant Isolation

Tenant isolation is enforced through:

- organization context
- membership selection
- permission check
- Residence ownership validation
- Department ownership validation

Cross-tenant and guessed identifiers return safe authorization denials without exposing whether the Department exists.

## 11. API/Service Boundary

API routes implemented:

- `POST /organizations/:organizationId/residences/:residenceId/departments`
- `GET /organizations/:organizationId/residences/:residenceId/departments`
- `GET /organizations/:organizationId/residences/:residenceId/departments/:departmentId`
- `PATCH /organizations/:organizationId/residences/:residenceId/departments/:departmentId`
- `POST /organizations/:organizationId/residences/:residenceId/departments/:departmentId/status`

No Work Group, Role Definition, Job Request, Dispatch, Attendance, Finance, Notification, AI, Reporting, or frontend API was added.

## 12. Audit Events

Implemented Department audit actions:

- `department.created`
- `department.updated`
- `department.inactivated`
- `department.reactivated`
- `department.closed`
- `department.access_denied`

Audit records conceptually include:

- actor
- organization
- residence
- department
- prior state
- new state
- reason
- timestamp
- correlation identifier
- source

Secrets and sensitive contact data are not logged.

## 13. Concurrency Handling

Optimistic concurrency uses the approved version mechanism derived from `updatedAt`.

Implemented behavior:

- valid version succeeds
- stale version fails safely
- invalid version fails safely
- Residence ID cannot be changed
- Organization ID cannot be changed
- immutable Department identity fields cannot be changed

## 14. Tests

Focused tests cover:

- Department creation
- Department read
- Department listing
- Department update
- stale update rejection
- status lifecycle transitions
- invalid transition rejection
- closed Department readability
- closed Department update blocking
- tenant isolation
- cross-Residence denial
- membership state denial
- permission denial
- parent Organization blocking
- parent Residence blocking
- audit creation
- audit rollback on create failure
- API safe denial behavior

## 15. Security Validation

Security controls preserved:

- safe authorization errors
- no raw Prisma/PostgreSQL error exposure
- no global Department lookup for ordinary users
- no platform-supervision shortcut to tenant ownership
- no sensitive data added to the Department model
- no secrets logged

## 16. Deferred Work Groups and Role Definitions

Work Groups and Role Definitions remain deferred.

Department Foundation does not:

- create Work Groups
- read Work Groups
- create Role Definitions
- read Role Definitions
- map Departments to Work Groups or Role Definitions

## 17. Remaining Risks

Remaining implementation risks:

- The approved schema has no Department description/contact/preferred-language fields; those remain future schema-gated work.
- `inactive` is used for suspended-like behavior because no separate `suspended` Department status exists.
- Duplicate Department naming is limited to existing schema behavior; no new uniqueness rule was introduced.

## 18. Readiness Verdict

DEPARTMENT FOUNDATION READY FOR OWNER REVIEW
