# Resident Job Assignment Foundation Report

Status: READY FOR OWNER REVIEW

## Executive Summary

The Assignment Foundation implements the approved Assignment Engine boundary only.

Assignment is now the platform-authoritative operational commitment created after:

```text
Job Request
-> Dispatch
-> Accepted Worker Offer
-> final Assignment validation
-> Assignment
```

The foundation preserves the approved distinctions:

- Accepted Worker Offer does not equal Assignment.
- Assignment does not equal Attendance.
- Worker acknowledgement does not create Attendance.
- Attendance, Worker Calendar, Timesheets, Payroll, Finance, notifications, and AI execution remain deferred.

## Schema

Implemented database changes:

- `AssignmentStatus` enum
- `Assignment` entity
- Assignment migration: `20260725030000_assignment_foundation`

The Assignment entity stores the confirmed operational commitment and references:

- Job Request
- Dispatch Review
- Worker Offer
- accepted Worker Offer Terms Version
- Worker Identity
- Employer Organization
- Residence
- Department
- Work Group
- Role Definition

The schema includes:

- confirmed schedule
- confirmed timezone
- confirmed worker-facing summaries
- assignment status
- validation snapshot
- capacity validation timestamp
- conflict validation timestamp
- lifecycle timestamps
- cancellation or replacement reason category
- actor references
- optimistic version field

No schema was added for:

- Attendance
- Worker Calendar
- Timesheets
- Payroll
- Finance
- notifications
- GPS
- clock-in/out
- AI execution

## Assignment Entity

Assignment owns:

- confirmed worker
- confirmed schedule
- confirmed work commitment

Assignment does not own:

- attendance evidence
- GPS evidence
- worked time
- approved hours
- payroll hours
- invoice amounts
- payment state
- worker performance
- disciplinary findings
- notification-provider delivery
- analytics

## Permissions

Implemented Assignment permissions:

- `assignment.create`
- `assignment.read`
- `assignment.cancel`
- `assignment.withdraw`
- `assignment.mark_replacement_required`
- `assignment.attendance_handoff`
- `assignment.audit_read`
- `assignment.worker_read`
- `assignment.worker_acknowledge`
- `assignment.worker_withdraw`
- `assignment.supervise`

Permission boundaries:

- Platform administrators and dispatchers may create and manage Assignment lifecycle transitions.
- Organization users may read Assignment status within their organization scope.
- Workers may read, acknowledge, or withdraw only their own Assignments.
- Assignment supervision is defined but not broadly granted by default.

## Lifecycle

Implemented states:

- `pending_validation`
- `confirmed`
- `worker_acknowledged`
- `ready_for_attendance`
- `in_attendance_window`
- `attendance_handoff`
- `worker_withdrawn`
- `employer_cancelled`
- `platform_cancelled`
- `replacement_required`
- `expired_before_start`
- `closed`

Implemented lifecycle behavior:

- Assignment creation starts from an accepted Worker Offer.
- Worker acknowledgement is recorded separately after Assignment creation.
- Attendance readiness and attendance-window transitions stop at the Attendance handoff boundary.
- Cancellation and replacement-required states do not mutate historical accepted offers.
- Replacement is represented as a boundary state only; no Replacement Engine is implemented.

## Worker Offer Integration

Assignment creation requires:

- existing Worker Offer
- Worker Offer status `accepted`
- current accepted Worker Offer Terms Version
- valid Job Request
- valid Dispatch Review
- active Worker Identity
- available Job Request capacity
- no conflicting active Assignment for the worker

Assignment does not:

- rewrite Worker Offer terms
- change Worker Offer response state
- silently accept offers
- simulate worker acceptance
- hide accepted-offer evidence

## Capacity Enforcement

Capacity is enforced at Assignment creation by comparing:

- Job Request required worker count
- existing active Assignments for the Job Request

The service rejects Assignment creation when the Job Request capacity is already filled.

## Worker Acknowledgement

Worker acknowledgement is implemented as a separate lifecycle transition:

```text
confirmed
-> worker_acknowledged
```

Worker acknowledgement does not:

- create Attendance
- create Worker Calendar entries
- create Timesheets
- create Payroll
- send real notifications
- begin clock-in/out

## Employer Read-Only Status

Employer-facing Assignment access is read-only.

Organization-scoped users may view Assignment status and summaries where authorized, but the page/API surface does not allow employer users to create Attendance, approve hours, modify Worker Offers, or execute financial workflows.

## Audit

Assignment audit hooks record lifecycle and authorization events, including:

- assignment creation attempted
- assignment validation failed
- assignment validation passed
- assignment confirmed
- worker acknowledged assignment
- worker withdrew from assignment
- assignment ready for attendance
- assignment entered attendance window
- assignment handed off to attendance
- assignment cancelled
- replacement required
- assignment read
- assignment audit read

Audit events preserve:

- actor
- action
- outcome
- resource reference
- organization scope
- metadata
- timestamp through the existing audit repository boundary

No business audit beyond Assignment events was introduced.

## API

Implemented Assignment API surface:

- `POST /platform/assignments`
- `GET /platform/assignments`
- `GET /platform/assignments/:assignmentId`
- `POST /platform/assignments/:assignmentId/ready-for-attendance`
- `POST /platform/assignments/:assignmentId/attendance-window`
- `POST /platform/assignments/:assignmentId/attendance-handoff`
- `POST /platform/assignments/:assignmentId/cancel`
- `POST /platform/assignments/:assignmentId/replacement-required`
- `GET /platform/assignments/:assignmentId/audit`
- `GET /organizations/:organizationId/assignments`
- `GET /worker/assignments/:assignmentId`
- `POST /worker/assignments/:assignmentId/acknowledge`
- `POST /worker/assignments/:assignmentId/withdraw`

The API does not expose:

- Attendance APIs
- Worker Calendar APIs
- Timesheet APIs
- Payroll APIs
- Finance APIs
- notification-provider APIs
- AI execution APIs

## Validation

Completed validation:

- Prisma validate: PASS
- Prisma generate: PASS
- direct SQL migration validation against disposable PostgreSQL database: PASS
- typecheck: PASS
- lint: PASS
- focused Assignment tests: PASS
- repository tests: PASS, 56 files / 337 tests
- build: PASS
- validate:env: PASS
- validate:boundaries: PASS
- scan:secrets: PASS
- git diff --check: PASS

Prisma Migrate environment note:

- Direct SQL migration validation passed against a disposable PostgreSQL database.
- A later sandboxed Prisma migrate deploy retry was limited by local PostgreSQL/sandbox connectivity behavior, not by a schema or migration defect.

## Deferred Attendance

Attendance remains deferred.

Assignment stops at:

```text
attendance_handoff
```

No implementation was added for:

- GPS
- check-in
- check-out
- attendance evidence
- attendance review
- worked time
- approved hours
- timesheets
- payroll
- finance

## Risks

Remaining risks:

- Assignment creation currently depends on service-level capacity and conflict checks; production deployment should validate transaction isolation behavior under real concurrent database load.
- Future Attendance implementation must consume Assignment context without mutating historical Assignment evidence.
- Future Worker Calendar implementation must reference Assignment without becoming the source of Assignment truth.
- Future Replacement implementation must create downstream replacement records and must not rewrite historical Assignments.

## Readiness Verdict

ASSIGNMENT FOUNDATION READY FOR OWNER REVIEW
