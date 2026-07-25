# Resident Workforce OS — Attendance Foundation Report

Status: Ready for Owner Review

## Executive Summary

The Attendance Foundation implements the approved intentionally small attendance boundary. It adds one required entity, `AttendanceRecord`, and the minimum service/API layer required to create attendance from a valid Assignment, allow worker check-in and check-out, expose employer read-only attendance status, and preserve auditability.

The implementation does not begin Timesheets, Payroll, Finance, Invoices, GPS provider integration, offline synchronization, notifications, analytics, or AI execution.

## Schema

Added:

- `AttendanceStatus`
- `AttendanceRecord`

`AttendanceRecord` stores operational attendance evidence only:

- Assignment reference
- Job Request reference
- Worker identity reference
- Organization, residence, department, WorkGroup, and RoleDefinition references
- Scheduled start/end snapshot
- Assignment status snapshot at creation
- Attendance lifecycle status
- Provider-neutral check-in and check-out evidence summaries
- Optional location-policy result labels without provider integration
- Completion, missed, cancellation, and exception markers
- Actor, version, and timestamp fields

Deferred:

- `AttendanceEvidence`
- `AttendanceBreak`
- `AttendanceException`
- `AttendanceOfflineSubmission`
- Timesheet entities
- Payroll entities
- Finance entities
- GPS provider entities

## AttendanceRecord

`AttendanceRecord` is created only from a valid Assignment at the attendance handoff boundary. It is the first operational evidence record after Assignment and remains separate from approved hours, payroll, invoice, payment, and worker evaluation records.

The record has a one-to-one unique relationship with Assignment, preventing duplicate active attendance creation for the same Assignment.

## Permissions

Added attendance permissions:

- `attendance.create`
- `attendance.read`
- `attendance.check_in`
- `attendance.check_out`
- `attendance.override`
- `attendance.cancel`
- `attendance.audit_read`
- `attendance.worker_read`
- `attendance.worker_check_in`
- `attendance.worker_check_out`
- `attendance.supervise` reserved

Assigned active permissions:

- Platform Administrator: create, read, check-in, check-out, override, cancel, audit read
- Dispatcher: create, read, check-in, check-out, override, cancel, audit read
- Organization Owner/Admin/Staff: read-only attendance visibility
- Worker Access: worker-owned read, check-in, and check-out

Reserved:

- `attendance.supervise` remains unassigned.

## Lifecycle

Approved lifecycle implemented:

```text
pending_start
checked_in
checked_out
completed
missed
cancelled
exception
```

Implemented transitions:

- Assignment handoff creates `pending_start`
- Worker check-in moves `pending_start` to `checked_in`
- Worker check-out moves `checked_in` to `checked_out`
- Platform review can move `checked_out` to `completed`
- Platform review can move `pending_start` to `missed`
- Platform review can mark governed exception states
- Platform review can cancel attendance without mutating Assignment history

Break handling remains deferred.

## Assignment Dependency

Attendance may only begin from Assignment states approved for attendance handoff:

- `in_attendance_window`
- `attendance_handoff`

Attendance creation validates:

- Assignment exists
- Assignment is at an attendance-ready boundary
- Assignment has no existing AttendanceRecord
- Assignment schedule and context are copied as a snapshot

Attendance never updates Assignment history.

## Worker Check-In Boundary

Worker check-in:

- Requires authenticated WorkerIdentity ownership
- Requires `attendance.worker_check_in`
- Requires `pending_start`
- Records a server-authoritative timestamp
- Records provider-neutral method/evidence labels
- Does not create GPS provider records
- Does not calculate worked time
- Does not create Timesheets

AI cannot check workers in.

## Worker Check-Out Boundary

Worker check-out:

- Requires authenticated WorkerIdentity ownership
- Requires `attendance.worker_check_out`
- Requires `checked_in`
- Records a server-authoritative timestamp
- Rejects checkout before check-in
- Records provider-neutral method/evidence labels
- Does not calculate approved hours
- Does not create Timesheets
- Does not create Payroll, Finance, Invoice, or Payment records

AI cannot check workers out.

## Audit

Attendance audit events are recorded for:

- Creation attempts
- Validation failures
- Attendance created
- Worker check-in attempts
- Worker checked in
- Worker check-out attempts
- Worker checked out
- Completion
- Missed attendance
- Exception
- Cancellation
- Version conflict
- Authorization denial

Audit records use the existing audit foundation and preserve actor, action, prior state, new state, reason, timestamp, and correlation reference.

## API

Added authentication-protected API surface:

- `POST /platform/attendance`
- `GET /platform/attendance`
- `GET /platform/attendance/:attendanceRecordId`
- `POST /platform/attendance/:attendanceRecordId/complete`
- `POST /platform/attendance/:attendanceRecordId/missed`
- `POST /platform/attendance/:attendanceRecordId/exception`
- `POST /platform/attendance/:attendanceRecordId/cancel`
- `GET /platform/attendance/:attendanceRecordId/audit`
- `GET /organizations/:organizationId/attendance`
- `GET /worker/attendance/:attendanceRecordId`
- `POST /worker/attendance/:attendanceRecordId/check-in`
- `POST /worker/attendance/:attendanceRecordId/check-out`

The API does not expose Timesheet, Payroll, Finance, Invoice, Notification, GPS provider, offline sync, analytics, or AI execution endpoints.

## Validation

Passed:

- Prisma validate
- Prisma generate
- Migration SQL validation on disposable PostgreSQL database
- Focused Attendance/API/database tests: 109 tests passed
- Repository typecheck
- Repository lint
- Repository tests: 56 files / 343 tests passed
- Repository build
- `validate:env`
- `validate:boundaries`
- `scan:secrets`
- `git diff --check`
- Targeted Prettier check for changed TypeScript files

Note:

- `prisma migrate deploy` using TCP was blocked by the local execution sandbox (`Operation not permitted`).
- The same migration chain was validated successfully by applying all migration SQL files directly with `psql` to a disposable local PostgreSQL database, then dropping that database.
- The repository-wide `pnpm validate` aggregate remains blocked at `pnpm format` by broad pre-existing formatting warnings outside the Attendance scope. Attendance-touched TypeScript files pass targeted Prettier checks, and the Prisma schema passes `prisma format`/`prisma validate`.

## Deferred Timesheet Work

Attendance stops at operational evidence and the `completed` state. It does not:

- Create Timesheets
- Propose hours
- Approve hours
- Calculate elapsed time for payroll
- Generate invoice data
- Create worker payables

The Timesheet engine remains the next separate owner-approved phase.

## Remaining Risks

- Prisma migrate deployment through this sandbox remains environment-limited for TCP database URLs.
- Future Timesheet implementation must consume Attendance as evidence without mutating Attendance history.
- Future GPS provider integration must remain optional and provider-neutral.
- Future offline attendance support requires a separate architecture and owner approval.
- Future AI summaries must remain advisory and must not alter attendance evidence.

## Readiness Verdict

ATTENDANCE FOUNDATION READY FOR OWNER REVIEW
