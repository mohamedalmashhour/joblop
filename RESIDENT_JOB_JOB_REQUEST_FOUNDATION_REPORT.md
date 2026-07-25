# Resident Job Job Request Foundation Report

## Executive Summary

The Job Request Foundation is implemented as the central Phase 01 staffing-request boundary. It establishes employer-owned draft creation, read/list access, draft updates, submission, resubmission after information requests, cancellation, platform intake review, information requests, and approval to the future dispatch boundary.

The implementation does not create dispatch attempts, worker offers, assignments, attendance, timesheets, invoices, payments, worker payables, notifications, AI, reporting, or frontend workflow integration.

## Architecture Scope

Job Request now sits under the approved hierarchy:

Employer Organization -> Residence -> Department -> Work Group -> Role Definition -> Job Request

The Job Request remains independent from:

- Shift
- Worker Offer
- Assignment
- Attendance
- Timesheet
- Invoice
- Employer Payment
- Worker Payable

The Global HR Core Expansion decision is preserved. `RoleDefinition` remains unchanged for Phase 01, and no `GlobalOccupation` schema or compatibility layer is introduced.

## Persistence Boundary

The foundation uses the existing Phase 01 Prisma schema and migration. No schema change, migration change, database model expansion, or raw SQL migration framework was introduced.

The Prisma repository implements:

- transaction-safe Job Request number generation through `JobRequestSequence`
- immutable `JR-{YEAR}-{6-DIGIT-SEQUENCE}` display numbers
- draft creation
- read by ID or number
- organization/residence/department listing
- optimistic-concurrency draft updates
- optimistic-concurrency state transitions
- immutable audit event creation

Gaps are allowed and numbers are never reused.

## Service Boundary

The service layer validates:

- active employer organization membership
- active organization state
- organization-scoped permissions
- residence ownership by organization
- department ownership by residence
- Work Group existence and active state
- Role Definition existence, active state, and Work Group membership
- draft payload validity before persistence
- legal state transitions
- optimistic concurrency
- tenant isolation

## State Model

Implemented states:

- `draft`
- `submitted`
- `admin_review`
- `information_required`
- `approved_for_dispatch`
- `cancelled`
- `expired`
- `archived`

Implemented transitions:

- draft -> submitted
- information_required -> submitted
- submitted -> admin_review
- admin_review -> information_required
- admin_review -> approved_for_dispatch
- draft/submitted/information_required/approved_for_dispatch -> cancelled

No downstream dispatch execution is implemented.

## API Surface

Employer APIs:

- `POST /organizations/:organizationId/job-requests`
- `GET /organizations/:organizationId/job-requests`
- `GET /organizations/:organizationId/job-requests/:jobRequestIdOrNumber`
- `PATCH /organizations/:organizationId/job-requests/:jobRequestId`
- `POST /organizations/:organizationId/job-requests/:jobRequestId/submit`
- `POST /organizations/:organizationId/job-requests/:jobRequestId/cancel`

Platform intake APIs:

- `GET /platform/job-requests/intake`
- `GET /platform/job-requests/intake/:jobRequestIdOrNumber`
- `POST /platform/job-requests/intake/:jobRequestId/admin-review`
- `POST /platform/job-requests/intake/:jobRequestId/request-information`
- `POST /platform/job-requests/intake/:jobRequestId/approve-for-dispatch`

The APIs use safe authorization failures and do not expose dispatch, assignment, attendance, finance, notification, AI, or reporting actions.

## Authorization and Tenant Isolation

Employer Job Request operations require active organization membership and an approved organization role with the specific Job Request permission.

Platform intake operations require explicit `PLATFORM_ADMINISTRATOR` authority and platform context.

Cross-tenant reads return safe denials and do not expose whether a Job Request exists in another organization.

## Audit Events

Implemented Job Request audit actions:

- `job_request.created`
- `job_request.updated`
- `job_request.submitted`
- `job_request.resubmitted`
- `job_request.admin_review_started`
- `job_request.information_requested`
- `job_request.approved_for_dispatch`
- `job_request.cancelled`
- `job_request.access_denied`

Audit events preserve actor, organization, Job Request ID, Job Request number, prior state, new state, reason, correlation ID, policy version, and timestamp.

## Tests

Focused service tests cover:

- immutable yearly Job Request number generation
- submission lifecycle
- parent-chain validation
- tenant isolation
- optimistic concurrency
- invalid state transitions
- platform intake permissions
- information request
- resubmission audit
- approval to dispatch boundary

Focused API tests cover:

- employer draft creation
- employer list
- employer submit
- platform intake list
- platform admin review
- approval to dispatch boundary

## Validation

Validation was run after implementation and tests:

- Typecheck
- Lint
- Focused auth tests
- Focused API tests
- Repository validation suite
- Build
- Secret scan
- Boundary validation
- `git diff --check`

## Deferred Work

Deferred by design:

- Dispatch
- Worker Offers
- Assignment
- Attendance
- Timesheets
- Completion review
- Calculation policies
- Invoices
- Employer payments
- Worker payables
- Notifications
- AI
- Reporting
- frontend integration beyond the minimum API boundary
- `GlobalOccupation`

## Verdict

JOB REQUEST FOUNDATION READY FOR OWNER REVIEW
