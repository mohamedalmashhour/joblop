# Resident Job Dispatch Foundation Report

## Executive Summary

Dispatch Foundation has been implemented within the approved scope. The foundation adds the governed dispatch review boundary after approved Job Requests and before future Worker Offer, Assignment, Worker Calendar, Attendance, Timesheet, Finance, Notification, AI execution, and Reporting workflows.

The implementation preserves the approved rule that Dispatch recommends and prepares operational review only. It does not create worker offers, assignments, worker acceptance, attendance, payroll, invoices, payments, notifications, or AI execution.

## Scope Implemented

- DispatchReview schema and migration.
- DispatchCandidate schema and migration.
- One non-terminal DispatchReview per JobRequest constraint.
- Dispatch permission catalogue.
- Active Dispatcher role with approved dispatch permissions only.
- Reserved `dispatch.supervise` permission with no active role assignment.
- Dispatch service lifecycle.
- CandidateSource interface.
- Default candidate source unavailable boundary.
- Candidate evaluation-summary storage only.
- Manual shortlist add, remove, and reorder.
- Offer-preparation boundary without WorkerOffer creation.
- Platform dispatcher/admin API boundary.
- Employer high-level read-only dispatch status endpoint.
- Dispatch audit hooks.
- Focused service and API tests.

## Explicitly Deferred

- DispatchAttempt.
- ReplacementDispatchLink.
- Full CandidateEvaluation records.
- WorkerOffer.
- Assignment.
- WorkerCalendarEntry.
- Attendance.
- Timesheets.
- Invoices.
- Payments.
- Notifications.
- AI execution.
- Reporting.

## Schema Summary

New approved entities:

- `DispatchReview`
- `DispatchCandidate`

DispatchReview references:

- JobRequest
- EmployerOrganization
- Residence
- Department
- WorkGroup
- RoleDefinition
- User as operational owner / creator / updater

DispatchCandidate stores only approved evaluation-summary fields:

- candidate source reference
- approved display name
- WorkGroup match
- RoleDefinition match
- qualification summary state
- verification summary state
- availability state
- schedule conflict state
- service area state
- travel suitability state
- transport constraint state
- recommendation state
- shortlist state
- source freshness
- last evaluated time
- evaluation version

Prohibited candidate data remains absent:

- home address
- banking
- tax
- government ID
- health information
- protected characteristics
- complaints
- investigations
- employer price
- platform margin

## Authorization Summary

Added active permissions:

- `dispatch.create`
- `dispatch.read`
- `dispatch.review_candidates`
- `dispatch.manage_shortlist`
- `dispatch.pause`
- `dispatch.resume`
- `dispatch.cancel`
- `dispatch.close`
- `dispatch.prepare_offer`
- `dispatch.audit_read`

Added reserved permission:

- `dispatch.supervise`

Role assignment:

- `DISPATCHER` receives only active dispatch permissions.
- `PLATFORM_ADMINISTRATOR` receives active dispatch permissions through platform authority.
- `ORGANIZATION_OWNER`, `ORGANIZATION_ADMINISTRATOR`, `ORGANIZATION_STAFF`, and `WORKER_ACCESS` receive no dispatch authority.
- `dispatch.supervise` is not assigned to active roles.

## Lifecycle Summary

Implemented states:

- draft
- active
- candidate_review
- shortlist_ready
- offer_preparation
- paused
- cancelled
- closed

Non-terminal states:

- draft
- active
- candidate_review
- shortlist_ready
- offer_preparation
- paused

Terminal states:

- cancelled
- closed

The database enforces one non-terminal DispatchReview per JobRequest.

## Candidate Source Boundary

CandidateSource is implemented as an interface only.

The default runtime source returns:

- `candidate_source_unavailable`

No WorkerProfile schema, WorkerOffer schema, Assignment schema, or AI candidate engine was introduced.

## Employer Visibility Boundary

Employers receive only high-level dispatch status for their own JobRequest:

- job request reference
- dispatch state
- required worker count
- shortlisted candidate count
- prepared offer count
- remaining worker count
- last update timestamp

Employer status does not expose candidate source references, internal evaluation states, candidate details, or platform-only dispatch notes.

## Audit Summary

Dispatch audit hooks record:

- dispatch created
- owner changed
- candidate review started
- candidate source unavailable
- candidate evaluated
- candidate shortlisted
- candidate removed
- shortlist reordered
- shortlist ready
- offer preparation
- paused
- resumed
- cancelled
- closed
- access denied

Audit records use policy version:

- `dispatch-foundation-v1`

## Validation Results

Passed:

- Prisma schema validation
- Prisma Client generation
- repository typecheck
- repository lint
- repository tests
- environment validation
- boundary validation
- secret scan
- repository build
- `git diff --check`

Focused test results:

- `@rwos/auth` tests: 57 passed
- `@rwos/api` tests: 23 passed
- full repository tests: 56 files passed / 327 tests passed

Environment-limited validation:

- `pnpm --filter @rwos/database prisma:migrate:deploy` could not complete in the Codex sandbox.
- Prisma loaded the configured local database `resident_job_phase01_validation` at `localhost:5432`, then returned a blank schema-engine error.
- Direct `psql` connectivity from this sandbox failed with local socket access blocked: `Operation not permitted`.
- This is consistent with the previously observed local PostgreSQL sandbox limitation.

No schema defect was identified by Prisma validation.

## Boundary Verification

Confirmed:

- Dispatch does not create WorkerOffer.
- Dispatch does not create Assignment.
- Dispatch does not create WorkerCalendarEntry.
- Dispatch does not contact workers.
- Dispatch does not simulate acceptance.
- Dispatch does not approve attendance.
- Dispatch does not calculate payroll.
- Dispatch does not issue invoices.
- Dispatch does not execute payments.
- Dispatch does not run AI recommendations.
- Dispatch does not expose protected worker data.

## Commits Created

- `be1d775` - `feat(database): add dispatch foundation schema`
- `c7d5802` - `feat(authz): add dispatch permissions and dispatcher role`
- `18bf79d` - `feat(dispatch): implement dispatch lifecycle and candidate boundary`
- `00fbe93` - `test(dispatch): validate dispatch lifecycle privacy and isolation`

## Remaining Risk

The only remaining validation gap is live PostgreSQL migration deploy from the Codex sandbox. The owner should run the database migration validation from normal macOS Terminal using the approved disposable validation database workflow.

## Deferred Work

Next phases remain blocked until owner review:

- Worker Offer Foundation
- Assignment Foundation
- Worker Calendar Foundation
- Attendance Foundation
- Timesheet Foundation
- Financial workflows
- Notification workflows
- AI execution workflows

## Verdict

DISPATCH FOUNDATION READY FOR OWNER REVIEW
