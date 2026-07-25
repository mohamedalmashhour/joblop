# Resident Workforce OS — Attendance Engine Baseline

Status: FROZEN

This document freezes the accepted Attendance Foundation. It is the baseline for any future Timesheet, Payroll, Finance, GPS, offline, notification, analytics, or AI work that consumes attendance evidence.

## 1. Purpose

Attendance is the operational evidence layer between Assignment and Timesheet.

Attendance begins only from a valid Assignment. It records worker presence evidence, lifecycle status, actor history, and server-side timestamps. It does not calculate payable hours, billable hours, overtime, premiums, payroll, invoices, payments, worker performance, analytics, or discipline.

## 2. AttendanceRecord Entity

The frozen required entity is `AttendanceRecord`.

`AttendanceRecord` stores:

- Assignment reference
- Job Request reference
- WorkerIdentity reference
- EmployerOrganization reference
- Residence, Department, WorkGroup, and RoleDefinition references
- scheduled start and scheduled end snapshot
- timezone
- Assignment status snapshot
- Attendance status
- check-in timestamp, actor, method, evidence summary, and location-policy result
- check-out timestamp, actor, method, evidence summary, and location-policy result
- completion, missed, cancellation, and exception markers
- actor, version, created-at, and updated-at fields

`AttendanceRecord` is operational evidence. It is not a Timesheet.

## 3. Attendance Lifecycle

Frozen lifecycle:

```text
pending_start
checked_in
checked_out
completed
missed
cancelled
exception
```

Allowed lifecycle behavior:

- Assignment handoff creates `pending_start`.
- Worker check-in moves `pending_start` to `checked_in`.
- Worker check-out moves `checked_in` to `checked_out`.
- Platform review can move `checked_out` to `completed`.
- Platform review can move `pending_start` to `missed`.
- Platform review can mark governed exceptions.
- Platform review can cancel attendance without mutating Assignment history.

Attendance does not calculate approved hours.

## 4. Assignment Dependency

Attendance depends on Assignment as the authoritative source for:

- confirmed worker
- confirmed schedule
- confirmed organization
- confirmed worksite
- confirmed department
- confirmed WorkGroup and RoleDefinition
- Attendance handoff readiness

Attendance may begin only when Assignment is in an attendance-ready state:

- `in_attendance_window`
- `attendance_handoff`

Attendance never rewrites Assignment history.

## 5. Worker Check-In Boundary

Worker check-in:

- requires authenticated WorkerIdentity ownership
- requires `attendance.worker_check_in`
- requires `pending_start`
- records a server-authoritative timestamp
- stores provider-neutral method and evidence summary
- may store a location-policy result label
- does not require GPS
- does not create GPS provider records
- does not calculate worked time
- does not create a Timesheet

AI cannot check workers in.

## 6. Worker Check-Out Boundary

Worker check-out:

- requires authenticated WorkerIdentity ownership
- requires `attendance.worker_check_out`
- requires `checked_in`
- records a server-authoritative timestamp
- rejects checkout before check-in
- stores provider-neutral method and evidence summary
- may store a location-policy result label
- does not calculate elapsed time as payable or billable time
- does not create a Timesheet
- does not create Payroll, Finance, Invoice, or Payment records

AI cannot check workers out.

## 7. Employer Visibility

Employer visibility is read-only and organization-scoped.

Employer users may see minimum operational attendance status for their own organization, such as:

- Assignment reference
- worker identity reference required for operations
- scheduled time
- current attendance status
- check-in/check-out presence where authorized
- exception status
- completion status

Employer users must not see:

- worker banking
- tax identifiers
- protected health information
- platform risk notes
- internal fraud indicators
- other organizations' records
- other workers' unrelated data
- Payroll, Invoice, Payment, or platform margin data

## 8. Worker Visibility

Workers may see only their own AttendanceRecords.

Worker visibility may include:

- scheduled time
- attendance status
- own check-in timestamp
- own check-out timestamp
- evidence method labels
- exception/cancellation status
- Timesheet handoff readiness when applicable

Workers must not see:

- employer billing terms
- platform commercial data
- other workers' records
- internal operational notes not intended for worker disclosure

## 9. Permissions

Frozen attendance permissions:

| Permission | Status | Boundary |
| --- | --- | --- |
| `attendance.create` | active | Create AttendanceRecord from valid Assignment |
| `attendance.read` | active | Employer/platform read visibility |
| `attendance.check_in` | active | Platform-supervised check-in evidence |
| `attendance.check_out` | active | Platform-supervised check-out evidence |
| `attendance.override` | active | Mark completion, missed, or exception states |
| `attendance.cancel` | active | Cancel attendance without mutating Assignment |
| `attendance.audit_read` | active | Read attendance audit summaries |
| `attendance.worker_read` | active | Worker-owned read |
| `attendance.worker_check_in` | active | Worker-owned check-in |
| `attendance.worker_check_out` | active | Worker-owned check-out |
| `attendance.supervise` | reserved | Reserved; not assigned |

Role mapping:

- Platform Administrator: active operational attendance permissions
- Dispatcher: active operational attendance permissions
- Employer organization roles: read-only attendance visibility
- Worker Access: worker-owned read, check-in, and check-out

## 10. Audit Events

Attendance audit records preserve actor, action, prior state, new state, reason, timestamp, correlation reference, Assignment reference, AttendanceRecord reference, and organization scope where available.

Frozen event categories:

- creation attempted
- validation failed
- attendance created
- check-in attempted
- checked in
- check-out attempted
- checked out
- completed
- missed
- exception
- cancelled
- version conflict
- authorization denied

## 11. API Capability Boundary

Frozen Attendance API capabilities:

- create Attendance from Assignment
- list Attendance
- read Attendance
- complete Attendance
- mark missed
- mark exception
- cancel Attendance
- read Attendance audit summary
- employer organization read-only attendance list
- worker-owned Attendance read
- worker check-in
- worker check-out

The API does not expose Timesheet, Payroll, Finance, Invoice, Payment, GPS provider, offline sync, notification, analytics, or AI execution capabilities.

## 12. Concurrency Controls

Frozen concurrency controls:

- unique AttendanceRecord per Assignment
- optimistic version checks
- stale update rejection
- duplicate check-in protection
- duplicate check-out protection
- server-side timestamp authority
- audit record for version conflicts

Future consumers must preserve the original AttendanceRecord identifier and version used for calculation.

## 13. Timestamp Authority

Attendance uses server-side timestamps as authoritative for lifecycle operations.

Device timestamps, GPS provider timestamps, offline timestamps, or third-party timestamps are not authoritative in the frozen baseline unless a future approved architecture explicitly adds those evidence sources.

## 14. Validation Rules

Attendance validates:

- Assignment exists
- Assignment is at an attendance-ready boundary
- one AttendanceRecord per Assignment
- WorkerIdentity owns worker self-service actions
- lifecycle transition is allowed
- expected version is current
- checkout is not before check-in
- actor has the required permission

Failure behavior:

- no unauthorized state change
- safe external error
- audit where appropriate
- Assignment history preserved

## 15. Privacy Boundary

Attendance stores minimum operational evidence only.

Attendance must not store:

- full GPS trails
- biometric data
- banking data
- tax identifiers
- protected health information
- worker performance ratings
- disciplinary conclusions
- payroll amounts
- invoice amounts
- payment credentials
- AI prompts or model internals

## 16. Known Limitations

The frozen Attendance Foundation is intentionally small.

Known limitations:

- no break engine
- no GPS provider integration
- no offline synchronization
- no Timesheet creation
- no payable-hour calculation
- no billable-hour calculation
- no payroll or finance handoff
- no notification provider
- no AI execution

## 17. Deferred Break Handling

Break handling is deferred.

The frozen baseline does not record:

- paid breaks
- unpaid breaks
- missed breaks
- interrupted breaks
- automatic break deductions
- multiple break intervals

Future Timesheet architecture must treat break evidence as unavailable unless separately approved and implemented.

## 18. Deferred GPS Verification

GPS is optional and provider-neutral.

The frozen baseline may store a location-policy result label, but it does not:

- require GPS
- integrate a GPS provider
- store continuous location trails
- decide misconduct from location data
- approve or reject time from GPS data alone

## 19. Deferred Offline Synchronization

Offline synchronization is not implemented.

The frozen baseline does not include offline queues, offline evidence, device trust scoring, conflict resolution, or replay logic.

## 20. Deferred Timesheet Handoff

Attendance stops at evidence completion.

`completed` Attendance may become eligible for a future Timesheet engine, but Attendance does not:

- create Timesheets
- propose hours
- approve hours
- calculate worked time
- calculate payable time
- calculate billable time

## 21. Accepted Commits

Accepted Attendance Foundation commits:

- `ce17b5a` — `feat(database): add attendance foundation schema`
- `bf95a4f` — `feat(authz): add attendance permissions`
- `d7ae983` — `feat(attendance): implement attendance lifecycle`
- `7eec62e` — `test(attendance): validate attendance boundaries`
- `debc8ac` — `docs(resident-job): attendance foundation report`

## 22. Validation Results

Accepted validation:

- Prisma validate: pass
- Prisma generate: pass
- migration SQL validation on disposable PostgreSQL database: pass
- focused Attendance/API/database tests: pass
- repository typecheck: pass
- repository lint: pass
- repository tests: pass
- repository build: pass
- `validate:env`: pass
- `validate:boundaries`: pass
- `scan:secrets`: pass
- `git diff --check`: pass

Environment note:

- Prisma migrate over TCP was blocked by the execution sandbox, while direct SQL migration validation through local `psql` passed.

## 23. Architecture Change Request Rule

Attendance schema, permissions, lifecycle, APIs, audit model, timestamp authority, and privacy boundaries are frozen.

Any material change requires an approved Architecture Change Request.

Explicit frozen statements:

- Attendance begins only from a valid Assignment.
- Attendance does not rewrite Assignment history.
- AttendanceRecord is operational evidence.
- Attendance is not a Timesheet.
- Attendance does not calculate payable hours.
- Attendance does not calculate employer billable hours.
- Attendance does not calculate overtime, premiums, breaks, payroll, invoices, or payments.
- Check-in and check-out use authoritative server-side rules.
- GPS is not mandatory and no GPS provider is part of the frozen baseline.
- Offline synchronization is not implemented.
- Break handling is deferred.
- AI cannot create or alter Attendance evidence.
