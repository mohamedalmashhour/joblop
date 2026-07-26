# Resident Workforce OS — Timesheet Engine Baseline

Status: APPROVED AND FROZEN

This document freezes the accepted Timesheet Foundation. Any future change to the Timesheet schema, permissions, lifecycle, Attendance dependency, calculation rules, review model, locking boundary, API capability map, audit model, privacy boundary, or downstream Payroll and Finance handoff requires an approved Architecture Change Request.

## 1. Accepted Commits

Accepted implementation commits:

- `0d4587d` - `feat(database): add timesheet foundation schema`
- `7d4809c` - `feat(authz): add timesheet permissions`
- `983f1ac` - `feat(timesheet): implement timesheet lifecycle`
- `6d8f3f6` - `test(timesheet): validate timesheet boundaries`
- `774e3dc` - `docs(resident-job): timesheet foundation report`

## 2. Operating Boundary

Timesheet is the governed work-time calculation and review layer between Attendance and future Payroll or Finance.

Canonical boundary:

```text
Assignment
-> Attendance
-> Timesheet
-> Payroll and Finance boundaries
```

Required clarifications:

- Attendance remains the authoritative evidence source.
- Timesheet never rewrites Attendance.
- Timesheet calculates governed work-time records only.
- Worker payable time remains separate from employer billable time.
- Timesheet does not calculate final pay, deductions, taxes, invoices, payments, or accounting entries.
- Approved and locked Timesheets are the only valid future Payroll and Finance inputs.
- Locked Timesheets are never silently overwritten.
- AI cannot approve, lock, or alter Timesheets.

## 3. Frozen Entities

Frozen required entities:

- `Timesheet`
- `TimesheetCalculationSnapshot`

The `Timesheet` entity stores:

- Assignment reference
- AttendanceRecord reference
- Job Request reference
- WorkerIdentity reference
- EmployerOrganization reference
- Residence, Department, WorkGroup, and RoleDefinition references
- Timesheet status
- Assignment version snapshot
- Attendance version snapshot
- scheduled and actual time snapshots
- timezone
- raw elapsed minutes
- payable minutes
- billable minutes
- excluded minutes
- break minutes
- premium candidate minutes
- overtime candidate minutes
- rounding adjustment minutes
- review statuses and actors
- approval, locking, rejection, cancellation, and correction markers
- actor, version, created-at, and updated-at fields

The `TimesheetCalculationSnapshot` entity stores:

- Timesheet reference
- AttendanceRecord reference
- Attendance version snapshot
- Assignment reference
- Assignment version snapshot
- calculation policy version
- Country Pack version
- raw and normalized timestamps
- timezone
- break and rounding rule references
- raw, payable, billable, excluded, break, premium, overtime, and rounding minute values
- exception flags
- calculation engine version
- created-at timestamp

## 4. Frozen Lifecycle

Frozen Timesheet states:

- `draft`
- `calculation_pending`
- `review_required`
- `worker_review`
- `employer_review`
- `platform_review`
- `approved`
- `locked`
- `rejected`
- `correction_required`
- `cancelled`

Approved review path:

```text
draft
-> calculation_pending
-> worker_review
-> employer_review
-> platform_review
-> approved
-> locked
```

Exception and correction states:

```text
review_required
correction_required
rejected
cancelled
```

Lifecycle rules:

- Timesheets are created only from valid completed Attendance.
- Calculation snapshots preserve versioned input evidence.
- Worker review is explicit.
- Employer review is explicit.
- Platform approval is explicit.
- Silence never counts as approval.
- Locking requires approval.
- Locked Timesheets cannot be silently recalculated or overwritten.
- Corrections require governed lifecycle movement and audit.

## 5. Attendance Dependency

Timesheets depend on Attendance as authoritative evidence for:

- worker presence
- check-in timestamp
- check-out timestamp
- Attendance status
- Assignment reference
- Attendance evidence summary
- Attendance version

Timesheet creation requires:

- completed Attendance
- check-in timestamp
- check-out timestamp
- valid Assignment reference
- no duplicate Timesheet for the same Assignment or AttendanceRecord
- authorized actor

Timesheet must not:

- create Attendance
- check workers in
- check workers out
- rewrite Attendance timestamps
- alter Attendance state
- replace Attendance evidence

## 6. Calculation Boundary

Timesheet calculation is a work-time calculation only.

Timesheet may calculate or preserve:

- raw elapsed minutes
- payable minutes
- billable minutes
- excluded minutes
- break minutes
- premium candidate minutes
- overtime candidate minutes
- rounding adjustment minutes
- exception flags
- calculation version
- Country Pack version reference

Timesheet must not calculate:

- gross pay
- net pay
- deductions
- taxes
- employer invoice amount
- platform margin
- worker payment
- accounting entries
- remittances

## 7. Payable Versus Billable Separation

Worker payable time and employer billable time are separate governed concepts.

Rules:

- payable minutes may become a future Payroll input
- billable minutes may become a future Finance or Invoice input
- neither value creates money movement
- neither value creates a financial posting
- neither value creates a worker payment
- neither value creates an employer invoice

## 8. Worker Review

Workers may:

- read their own Timesheet summary
- view worker-relevant time calculations
- confirm review
- dispute the Timesheet

Workers must not:

- edit Attendance evidence
- approve platform Timesheets
- lock Timesheets
- create Payroll records
- view employer billing rates
- view platform margin
- trigger payment

## 9. Employer Review

Employer users may:

- read organization-scoped Timesheet summaries
- view employer-relevant billable time
- confirm review
- dispute the Timesheet

Employer users must not:

- edit Attendance evidence
- approve platform Timesheets
- lock Timesheets
- alter worker payable time directly
- create Payroll records
- create Invoice records
- trigger payment

## 10. Platform Approval and Locking

Platform reviewers may:

- create Timesheets from completed Attendance
- calculate Timesheets
- request correction
- approve Timesheets after required reviews
- reject Timesheets
- lock approved Timesheets
- read audit summaries

Platform reviewers must not use Timesheet approval to:

- calculate payroll
- create invoices
- execute payments
- post accounting entries
- resolve payment disputes
- override Attendance evidence silently

## 11. Correction Boundary

Timesheet correction is governed and auditable.

Correction may occur when:

- Attendance evidence is stale or corrected upstream
- worker disputes the Timesheet
- employer disputes the Timesheet
- platform review identifies missing or inconsistent inputs
- calculation snapshot is stale

Correction must preserve:

- original Timesheet record
- original calculation snapshot
- actor
- reason
- timestamp
- prior state
- new state

Post-lock changes require future formal correction architecture. Locked Timesheets are not silently overwritten.

## 12. Permissions

Frozen Timesheet permissions:

- `timesheet.create`
- `timesheet.read`
- `timesheet.calculate`
- `timesheet.recalculate`
- `timesheet.review`
- `timesheet.approve`
- `timesheet.lock`
- `timesheet.reject`
- `timesheet.request_correction`
- `timesheet.adjust`
- `timesheet.audit_read`
- `timesheet.worker_read`
- `timesheet.worker_confirm`
- `timesheet.worker_dispute`
- `timesheet.employer_read`
- `timesheet.employer_confirm`
- `timesheet.employer_dispute`
- `timesheet.supervise`

Frozen role boundary:

- `TIMESHEET_REVIEWER` owns platform review authority.
- Worker Access owns worker-specific read, confirm, and dispute.
- Employer organization roles own employer-specific read, confirm, and dispute.
- Dispatcher has read-only Timesheet visibility where granted and cannot approve or lock.
- `timesheet.supervise` remains reserved.

## 13. API Capability Boundary

Frozen Timesheet capabilities:

- create Timesheet from completed Attendance
- list platform Timesheets
- read platform Timesheet
- calculate Timesheet
- request correction
- approve Timesheet
- reject Timesheet
- lock Timesheet
- read audit summary
- list organization Timesheets
- employer confirm
- employer dispute
- worker read
- worker confirm
- worker dispute

No Payroll, Finance, Invoice, Payment, Tax, Notification, GPS, Offline, Analytics, or AI execution API is part of the Timesheet baseline.

## 14. Audit Model

Timesheet audit preserves:

- actor
- role/context
- organization scope
- Timesheet reference
- Attendance reference
- Assignment reference
- prior state
- new state
- reason
- timestamp
- version

Frozen event categories:

- creation attempted
- creation failed
- Timesheet created
- calculation started
- calculation completed
- calculation failed
- worker confirmed
- worker disputed
- employer confirmed
- employer disputed
- correction requested
- approved
- rejected
- locked
- authorization denied
- version conflict

## 15. Concurrency

Frozen concurrency controls include:

- unique Assignment-to-Timesheet boundary
- unique AttendanceRecord-to-Timesheet boundary
- version snapshots for Attendance and Assignment
- Timesheet version field
- stale version rejection
- no duplicate Timesheet creation for the same evidence
- lock boundary for future downstream handoff

Future Payroll and Finance must consume locked Timesheets idempotently and must not mutate Timesheet history.

## 16. Privacy

Timesheet privacy boundary:

- worker sees own worker-facing Timesheet data only
- employer sees organization-scoped operational/billable review data only
- platform reviewers see governed review data required for approval

Timesheet must not expose:

- bank data
- tax identifiers
- payroll results
- employer billing rates in worker view
- platform margin
- other workers' records
- protected health information
- internal fraud or investigation notes

## 17. Validation Results

Accepted validation:

- Prisma format passed
- Prisma validate passed
- Prisma generate passed
- Prisma migrate deploy passed in unrestricted local execution
- targeted database tests passed
- targeted authorization tests passed
- targeted Timesheet service/API tests passed
- repository typecheck passed
- repository lint passed
- repository tests passed: 56 files / 349 tests
- repository build passed
- `validate:env` passed
- `validate:boundaries` passed
- `scan:secrets` passed
- targeted Prettier passed
- `git diff --check` passed

## 18. Architecture Change Request Rule

The Timesheet Foundation is frozen.

Material changes require an approved Architecture Change Request, including changes to:

- Timesheet entities
- calculation semantics
- payable versus billable separation
- lifecycle states
- approval rules
- locking rules
- correction rules
- permissions
- API capabilities
- audit model
- privacy boundaries
- Payroll or Finance handoff boundaries

## 19. Final Status

Timesheet Foundation:

```text
APPROVED
FROZEN
READY AS INPUT TO PAYROLL ARCHITECTURE
```
