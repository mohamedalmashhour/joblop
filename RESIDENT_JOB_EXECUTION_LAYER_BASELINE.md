# Resident Workforce OS — Execution Layer Baseline

Status: APPROVED AND FROZEN

This document freezes the complete Execution Layer from Job Request through Timesheet. Any future change to engine ownership, source-of-truth boundaries, state handoffs, audit continuity, tenant isolation, privacy, concurrency, or financial handoff rules requires an approved Architecture Change Request.

## 1. Purpose of the Execution Layer

The Execution Layer governs the operational chain that turns an employer staffing need into reviewed work-time evidence.

Canonical frozen chain:

```text
Job Request
-> Dispatch
-> Worker Offer
-> Assignment
-> Attendance
-> Timesheet
```

The Execution Layer does not include:

- Payroll
- Finance
- Invoicing
- Payments
- Tax
- Accounting
- Notifications
- Analytics
- AI execution

## 2. Engine-by-Engine Responsibilities

## Job Request

Job Request owns the employer's commercial and operational request for labor.

It owns:

- requested work
- organization and worksite context
- role and WorkGroup need
- requested schedule
- required worker count
- request lifecycle
- source request terms

It does not own:

- Dispatch decision
- Worker Offer response
- Assignment commitment
- Attendance evidence
- Timesheet calculation
- Payroll
- Finance

## Dispatch

Dispatch owns platform review and recommendation/selection preparation.

It owns:

- dispatch review
- candidate consideration boundary
- recommendation evidence
- dispatcher decision support
- capacity-aware dispatch review

It does not own:

- Assignment creation
- Worker acceptance
- Attendance
- Timesheets
- Payroll
- Finance

## Worker Offer

Worker Offer owns the worker-facing offer and explicit worker response.

It owns:

- offer terms presented to worker
- worker response
- acceptance/decline/expiry lifecycle
- offer terms version
- worker-visible offer evidence

It does not own:

- Assignment creation
- Attendance evidence
- Timesheet calculation
- Payroll
- Finance

## Assignment

Assignment owns the platform-authoritative operational commitment.

It owns:

- confirmed worker
- confirmed schedule
- confirmed work commitment
- final validation after accepted Worker Offer
- worker acknowledgement boundary
- Attendance handoff readiness

It does not own:

- Attendance evidence
- worked time
- Timesheet approval
- Payroll
- Finance

## Attendance

Attendance owns operational presence evidence.

It owns:

- check-in
- check-out
- attendance status
- evidence method labels
- Attendance exceptions
- server-authoritative attendance timestamps

It does not own:

- Timesheet calculation
- approved hours
- payroll
- invoices
- finance
- worker performance

## Timesheet

Timesheet owns governed work-time calculation and review.

It owns:

- Attendance-derived work-time calculation
- worker review
- employer review
- platform approval
- locking
- payable versus billable minute separation
- Payroll and Finance input boundary

It does not own:

- Payroll calculation
- worker payment
- employer invoicing
- tax
- accounting
- payment execution

## 3. Source-of-Truth Boundaries

Frozen source-of-truth map:

| Engine       | Authoritative Record                           | Downstream Consumers                                      |
| ------------ | ---------------------------------------------- | --------------------------------------------------------- |
| Job Request  | `JobRequest`                                   | Dispatch, Worker Offer, Assignment, Attendance, Timesheet |
| Dispatch     | `DispatchReview`                               | Worker Offer, Assignment                                  |
| Worker Offer | `WorkerOffer`                                  | Assignment                                                |
| Assignment   | `Assignment`                                   | Attendance, Timesheet                                     |
| Attendance   | `AttendanceRecord`                             | Timesheet                                                 |
| Timesheet    | `Timesheet` and `TimesheetCalculationSnapshot` | future Payroll and Finance                                |

Downstream engines consume authoritative upstream records but do not rewrite them.

## 4. State Handoffs

Frozen handoffs:

```text
Job Request approved for dispatch
-> Dispatch creates review outcome
-> Worker Offer presents terms
-> Worker accepts offer
-> Assignment validates and commits
-> Assignment enters Attendance handoff
-> Attendance records check-in/check-out evidence
-> Attendance completes
-> Timesheet imports evidence
-> Timesheet locks
-> Payroll and Finance boundary becomes eligible
```

Explicit non-equivalences:

- Dispatch does not create Assignment.
- Worker Offer acceptance does not itself create Assignment.
- Assignment does not create Attendance evidence.
- Attendance does not calculate Timesheets.
- Timesheet does not create Payroll or Finance records.

## 5. Prohibited Cross-Engine Ownership

No engine may absorb another engine's primary responsibility.

Prohibited ownership leakage:

- Dispatch must not create Assignments.
- Worker Offer must not become Assignment.
- Assignment must not record clock events.
- Attendance must not calculate payable or billable time.
- Timesheet must not create Payroll.
- Timesheet must not create Invoice or Finance records.
- No Execution Layer engine may execute payments.
- No Execution Layer engine may post accounting entries.

## 6. Audit Continuity

Every engine preserves its own audit trail and references upstream evidence.

Audit continuity requires:

- actor
- role/context
- organization scope
- source record reference
- prior state
- new state
- reason
- timestamp
- version or snapshot where applicable

Downstream audits must reference upstream records instead of rewriting upstream history.

## 7. Tenant Isolation

Execution Layer records preserve tenant isolation through organization-scoped references.

Required isolation dimensions include:

- EmployerOrganization
- Residence
- Department
- WorkerIdentity
- JobRequest
- Assignment
- AttendanceRecord
- Timesheet

Cross-tenant access must be denied by default.

## 8. Privacy Boundaries

Privacy principles:

- workers see their own worker-facing records
- employers see only organization-scoped operational data
- platform users see only data required for authorized review
- financial, banking, tax, health, risk, and investigation data remain excluded unless separately authorized

Worker-visible records must not expose:

- employer billing rates
- platform margin
- other workers' records
- internal risk notes

Employer-visible records must not expose:

- worker banking
- tax identifiers
- private worker notes
- unrelated worker records

## 9. Concurrency Boundaries

Execution Layer concurrency controls include:

- unique downstream creation where required
- version snapshots
- expected-version updates
- idempotency boundaries
- stale state rejection
- no duplicate Assignment for filled capacity
- no duplicate Attendance for one Assignment
- no duplicate Timesheet for one AttendanceRecord
- lock boundaries before future financial handoff

## 10. Failure Isolation

Failure in one engine must not silently mutate upstream engines.

Examples:

- Dispatch failure does not close Job Request automatically.
- Worker Offer expiry does not delete Dispatch.
- Assignment failure preserves accepted Worker Offer evidence.
- Attendance exception does not rewrite Assignment.
- Timesheet correction does not rewrite Attendance.
- future Payroll failure must not unlock Timesheet.
- future Payment failure must not rewrite Payroll calculation.

## 11. Replacement and Correction Principles

Replacement principles:

- replacement creates new downstream records
- historical Assignments remain preserved
- prior Worker Offers remain auditable
- Attendance history remains intact
- Timesheets remain tied to their original Attendance evidence

Correction principles:

- corrections are explicit
- corrections are audited
- corrections preserve original values and reasons
- locked records are not silently overwritten

## 12. Financial Handoff Boundary

The Execution Layer stops at locked Timesheets.

Financial handoff eligibility:

```text
Timesheet status = locked
```

Locked Timesheet permits future Payroll and Finance engines to consume governed time inputs.

Locked Timesheet does not:

- calculate gross pay
- calculate net pay
- calculate deductions
- create Payroll records
- create invoices
- execute payments
- post accounting entries
- calculate tax

## 13. Accepted Engine Baselines

Accepted baselines:

- Platform Core baseline
- Dispatch Engine baseline
- Worker Offer Engine baseline
- Assignment Engine baseline
- Attendance Engine baseline
- Timesheet Engine baseline

Accepted Timesheet commits:

- `0d4587d` - `feat(database): add timesheet foundation schema`
- `7d4809c` - `feat(authz): add timesheet permissions`
- `983f1ac` - `feat(timesheet): implement timesheet lifecycle`
- `6d8f3f6` - `test(timesheet): validate timesheet boundaries`
- `774e3dc` - `docs(resident-job): timesheet foundation report`

## 14. Validation Summary

Accepted validation for the complete Execution Layer includes:

- Prisma validation and generation
- Prisma migration deployment through Timesheet
- targeted engine tests
- full repository typecheck
- full repository lint
- full repository tests: 56 files / 349 tests
- build
- environment validation
- boundary validation
- secret scan
- targeted Prettier
- `git diff --check`

## 15. Architecture Change Request Rule

The Execution Layer is frozen.

Material changes require an approved Architecture Change Request, including changes to:

- engine ownership
- state handoffs
- source-of-truth boundaries
- Job Request-to-Dispatch flow
- Dispatch-to-Worker Offer flow
- Worker Offer-to-Assignment flow
- Assignment-to-Attendance flow
- Attendance-to-Timesheet flow
- financial handoff eligibility
- cross-engine audit rules
- tenant isolation
- privacy boundaries
- concurrency controls

## 16. Final Status

Execution Layer:

```text
APPROVED
FROZEN
READY AS INPUT TO PAYROLL ARCHITECTURE
```
