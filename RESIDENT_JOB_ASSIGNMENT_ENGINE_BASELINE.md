# Resident Job Assignment Engine Baseline

Status: APPROVED AND FROZEN

This document freezes the accepted Assignment Foundation. Any future change to the Assignment schema, permissions, lifecycle, validation rules, Worker Offer dependency, capacity enforcement, acknowledgement model, employer visibility, audit model, or API capability boundary requires an Architecture Change Request.

## 1. Accepted Commits

Accepted implementation commits:

- `a605b5b` - `feat(database): add assignment foundation schema`
- `ec5b893` - `feat(authz): add assignment permissions`
- `fe8cf5e` - `feat(assignment): implement assignment lifecycle`
- `451e056` - `test(assignment): validate assignment boundaries`
- `5ff99bc` - `docs(resident-job): assignment foundation report`

## 2. Operating Boundary

Assignment is the platform-authoritative operational commitment created only after an accepted Worker Offer and final authoritative validation.

Canonical boundary:

```text
Job Request
-> Dispatch
-> Worker Offer
-> Accepted Worker Offer
-> Assignment
-> Attendance
```

Required clarifications:

- Assignment is created only after an accepted Worker Offer and final authoritative validation.
- Assignment is the authoritative operational commitment.
- Assignment is NOT Attendance.
- Assignment does not record worked time, GPS, clock events, payroll, invoices, or finance.
- Attendance is the next engine.

## 3. Frozen Entity

Frozen Assignment entity:

- `Assignment`

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

Assignment owns:

- confirmed worker
- confirmed schedule
- confirmed work commitment

Assignment does not own:

- attendance evidence
- GPS evidence
- clock-in/out events
- break records
- worked time
- approved hours
- timesheets
- payroll
- invoices
- finance
- payment state
- notifications
- AI execution
- worker performance
- disciplinary findings
- analytics

## 4. Lifecycle

Frozen Assignment states:

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

Approved primary lifecycle:

```text
pending_validation
-> confirmed
-> worker_acknowledged
-> ready_for_attendance
-> in_attendance_window
-> attendance_handoff
```

Approved administrative and exception outcomes:

```text
worker_withdrawn
employer_cancelled
platform_cancelled
replacement_required
expired_before_start
closed
```

Lifecycle rules:

- Assignment is created only by the platform-authoritative Assignment transaction.
- Worker acknowledgement is separate from Assignment creation.
- Worker acknowledgement does not create Attendance.
- Attendance readiness and attendance-window transitions stop at the Attendance handoff boundary.
- Cancellation and replacement states preserve historical Assignment evidence.
- Replacement creates new downstream records and never mutates historical Assignments.

## 5. Permissions

Frozen Assignment permissions:

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

Approved access boundary:

- Platform administrators and dispatchers may create and manage Assignment lifecycle transitions.
- Organization users may read Assignment status within their organization scope.
- Workers may read, acknowledge, or withdraw only their own Assignments.
- `assignment.supervise` is reserved and is not broadly granted by default.

## 6. Validation Rules

Assignment creation requires:

- valid Job Request
- valid Dispatch Review
- accepted Worker Offer
- current accepted Worker Offer Terms Version
- active Worker Identity
- active or policy-valid organization context
- active or policy-valid residence context
- active or policy-valid department context
- active or policy-valid Work Group and Role Definition
- available Job Request capacity
- no conflicting active Assignment for the worker
- authorized platform actor

If validation fails:

- no Assignment is created
- accepted Worker Offer evidence is preserved
- failure is audited
- safe error is returned

## 7. Worker Offer Dependency

Assignment depends on Worker Offer evidence.

Required Worker Offer inputs:

- Worker Offer ID
- Worker Offer status `accepted`
- accepted Worker Offer Terms Version ID
- Worker Identity ID
- Job Request reference
- Dispatch Review reference
- employer organization reference
- residence reference
- department reference
- Work Group reference
- Role Definition reference
- accepted schedule and timezone
- worker-facing summaries and terms

Assignment must not:

- alter Worker Offer terms
- rewrite Worker Offer response
- hide stale terms
- reclassify declined or expired offers
- create a Worker Offer silently

## 8. Capacity Enforcement

Capacity enforcement is frozen as an Assignment creation rule.

The Assignment service compares:

- Job Request required worker count
- existing active Assignments for that Job Request

If capacity is filled:

- no new Assignment is created
- Worker Offer evidence remains intact
- failure is audited
- Dispatch may move to a governed exception or replacement path

## 9. Acknowledgement Model

Worker acknowledgement is a worker-side lifecycle event after Assignment confirmation.

Approved distinction:

```text
Assignment created
!=
Worker acknowledged
!=
Attendance
```

Acknowledgement may confirm that the worker saw or acknowledged the Assignment, but it must not:

- create Attendance
- create clock events
- create Worker Calendar records
- create Timesheets
- calculate payroll
- send real notifications

## 10. Employer Visibility

Employer-facing Assignment visibility is read-only.

Employers may view:

- Assignment status
- worker-facing title and role summary
- confirmed schedule
- confirmed worksite summary
- confirmed department summary
- safe operational status
- attendance handoff readiness where authorized

Employers must not use Assignment visibility to:

- create Attendance
- approve hours
- modify Worker Offers
- alter worker terms
- execute payroll
- issue invoices
- view protected worker information

## 11. Audit Model

Frozen Assignment audit events include:

- assignment creation attempted
- validation failed
- validation passed
- assignment confirmed
- assignment read
- worker acknowledged assignment
- worker withdrew from assignment
- assignment ready for attendance
- assignment entered attendance window
- assignment handed off to attendance
- assignment cancelled
- replacement required
- audit read

Audit events preserve:

- actor
- action
- outcome
- resource reference
- organization scope
- metadata
- timestamp through the existing audit boundary

Assignment audit does not become:

- attendance evidence
- timesheet approval
- payroll approval
- misconduct finding
- analytics automation

## 12. API Capability Boundary

Frozen Assignment API capabilities:

- create Assignment from accepted Worker Offer
- list platform Assignments
- read platform Assignment
- mark ready for attendance
- mark in attendance window
- mark attendance handoff
- cancel Assignment
- mark replacement required
- read Assignment audit summary
- list organization Assignments read-only
- read worker-owned Assignment
- acknowledge worker-owned Assignment
- withdraw worker-owned Assignment

Assignment API must not expose:

- Attendance creation
- GPS tracking
- clock-in/out
- break management
- Timesheet creation
- Payroll calculation
- Finance execution
- notification-provider delivery
- AI execution

## 13. Validation Summary

Accepted validation summary:

- Prisma validate: PASS
- Prisma generate: PASS
- direct SQL migration validation: PASS
- typecheck: PASS
- lint: PASS
- Assignment tests: PASS
- repository tests: PASS
- build: PASS
- validate:env: PASS
- validate:boundaries: PASS
- scan:secrets: PASS
- git diff --check: PASS

## 14. Architecture Change Request Requirement

The Assignment Foundation is frozen.

An Architecture Change Request is required before changing:

- Assignment entity structure
- Assignment lifecycle states
- Assignment permissions
- Assignment creation rules
- Worker Offer dependency
- capacity enforcement
- worker acknowledgement model
- employer visibility
- audit behavior
- API capability boundary
- relationship to Attendance
- relationship to Replacement
- relationship to Worker Calendar

## 15. Next Engine

Attendance is the next engine.

Attendance must begin only from a valid Assignment and must not rewrite Assignment history.
