# Resident Job Attendance Engine Architecture

Status: READY FOR OWNER REVIEW

This document defines the future Attendance Engine architecture only. It authorizes no schema, migration, permissions, services, APIs, GPS tracking, clock-in/out implementation, break calculations, Timesheets, Payroll, Finance, notifications, AI execution, push, merge, deployment, or implementation work.

## 1. Attendance Operating Principle

Attendance is the authoritative operational evidence engine.

Attendance begins only from a valid Assignment. It records operational presence facts and attendance status. It does not calculate timesheets, payroll, invoices, payments, performance, analytics, or discipline.

Canonical flow:

```text
Job Request
-> Dispatch
-> Worker Offer
-> Assignment
-> Attendance
-> Timesheet
```

Required clarifications:

- Assignment does not equal Attendance.
- Attendance does not equal Timesheet.
- Timesheet does not equal Payroll.
- Attendance records operational facts only.

Attendance owns:

- operational presence
- arrival evidence
- departure evidence
- worked interval evidence
- attendance status

Attendance does not own:

- timesheet calculations
- approved hours
- payroll
- finance
- invoices
- payments
- performance evaluation
- analytics
- worker discipline
- notification delivery
- AI execution

## 2. Canonical Lifecycle

Recommended narrow Phase 01 lifecycle:

```text
pending_start
-> checked_in
-> checked_out
-> completed
```

Recommended exception states:

```text
missed
cancelled
exception
```

Future lifecycle extensions:

```text
on_break
-> resumed
```

Phase 01 should keep breaks as recorded evidence or deferred metadata unless the owner approves a full break engine.

## 3. Attendance Entity

Recommended future `AttendanceRecord` entity fields:

Identity and references:

- Attendance Record ID
- Assignment ID
- Job Request ID
- Worker Identity ID
- Employer Organization ID
- Residence ID
- Department ID
- Work Group ID
- Role Definition ID

State:

- attendance status
- created at
- updated at
- version

Schedule reference:

- scheduled start time from Assignment
- scheduled end time from Assignment
- timezone
- Assignment lifecycle snapshot

Check-in evidence:

- check-in timestamp
- check-in actor
- check-in method
- check-in evidence reference
- check-in location policy result
- check-in device or session reference where allowed

Check-out evidence:

- check-out timestamp
- check-out actor
- check-out method
- check-out evidence reference
- check-out location policy result
- check-out device or session reference where allowed

Exception evidence:

- exception category
- exception notes
- supervisor action reference
- worker note reference
- offline submission marker
- conflict marker

Do not include:

- approved hours
- payroll hours
- invoice amounts
- payment status
- worker banking
- tax identifiers
- performance rating
- disciplinary conclusion
- notification-provider payload
- raw continuous GPS trail

## 4. Attendance States

Recommended Phase 01 states:

| State           | Meaning                                                        | Owner             | Allowed Next States                 | Explicit Non-Ownership |
| --------------- | -------------------------------------------------------------- | ----------------- | ----------------------------------- | ---------------------- |
| `pending_start` | Valid Assignment exists and Attendance is waiting for start     | Attendance Engine | `checked_in`, `missed`, `cancelled` | not worked time        |
| `checked_in`    | Arrival evidence has been recorded                             | Attendance Engine | `checked_out`, `exception`          | not approved hours     |
| `checked_out`   | Departure evidence has been recorded                           | Attendance Engine | `completed`, `exception`            | not timesheet approval |
| `completed`     | Attendance evidence is complete enough for Timesheet handoff    | Attendance Engine | future Timesheet                    | not payroll            |
| `missed`        | Attendance was not started within governed policy               | Attendance Engine | `exception`                         | not misconduct finding |
| `cancelled`     | Attendance was cancelled because Assignment became invalid      | Attendance Engine | none                                | not finance            |
| `exception`     | Attendance requires review because evidence is incomplete/odd   | Attendance Engine | future review or Timesheet boundary | not discipline         |

Future states:

- `on_break`
- `resumed`

Break states should be introduced only when break evidence and break policy ownership are approved.

## 5. Attendance Creation Rules

Attendance may be created only when:

- Assignment exists.
- Assignment status allows Attendance handoff.
- Worker Identity matches the Assignment worker.
- Assignment has not been cancelled, withdrawn, replaced, closed, or expired.
- No active AttendanceRecord already exists for the same Assignment unless policy explicitly allows correction or exception records.
- actor has attendance creation authority.
- attendance creation can be audited.

If creation fails:

- no AttendanceRecord is created
- Assignment history is preserved
- failure is audited
- safe error is returned

## 6. Assignment Dependency

Attendance depends on Assignment as the authoritative source for:

- confirmed worker
- confirmed schedule
- confirmed worksite
- confirmed department
- confirmed role
- confirmed Assignment status

Attendance must not:

- create Assignment
- modify Assignment schedule
- rewrite Worker Offer terms
- change Dispatch decisions
- change Job Request capacity
- create Worker Calendar records

## 7. Worker Check-In Boundary

Worker check-in records arrival evidence.

Check-in may capture:

- timestamp
- worker actor
- permitted verification method
- evidence reference
- location policy result
- device/session reference where allowed
- offline marker where applicable

Check-in must not:

- prove all worked time
- approve attendance
- approve timesheet
- create payroll
- determine misconduct
- expose sensitive location data beyond policy

Timing validation should classify early or late arrival neutrally as an operational fact, not as automatic fault.

## 8. Worker Check-Out Boundary

Worker check-out records departure evidence.

Check-out may capture:

- timestamp
- worker actor
- permitted verification method
- evidence reference
- location policy result
- offline marker where applicable

Check-out must not:

- calculate payable hours
- approve timesheets
- approve payroll
- trigger payment
- determine performance

Missing checkout should create an exception path, not a punitive conclusion.

## 9. Break Boundary

Break support should remain provider-neutral and policy-driven.

Future break evidence may support:

- paid breaks
- unpaid breaks
- multiple breaks
- interrupted breaks
- missed break recording

Phase 01 recommendation:

- Do not implement break calculations inside Attendance.
- Record break evidence only if explicitly approved.
- Leave timesheet calculation and payroll effects to later engines.

## 10. Exception Handling

Attendance exception handling must preserve evidence and avoid automatic punitive conclusions.

Exception categories:

- no-show
- late arrival
- early departure
- missing checkout
- duplicate check-in
- duplicate checkout
- Assignment cancelled
- Assignment withdrawn
- worker replaced
- offline submission
- invalid location
- supervisor override

Each exception must preserve:

- original evidence
- actor
- timestamp
- reason category
- source record
- audit event
- downstream status

## 11. Supervisor Authority

Supervisor authority may include:

- review attendance evidence
- add supervisor notes
- classify evidence as requiring review
- confirm operational presence where policy allows
- request correction
- create override marker where authorized

Supervisor authority must not:

- rewrite raw worker evidence
- approve Timesheets
- approve Payroll
- discipline workers automatically
- alter Assignment history

## 12. Worker Authority

Worker authority may include:

- check in for own Assignment
- check out for own Assignment
- submit a correction note
- submit offline evidence when permitted
- view own AttendanceRecord

Worker authority must not:

- overwrite GPS or verification evidence
- approve their own Attendance
- alter Assignment terms
- alter Timesheets
- calculate Payroll

## 13. Employer Visibility

Employer visibility should be minimum necessary and role-based.

Employers may see:

- Assignment reference
- attendance status
- check-in/check-out status
- safe timestamp summaries
- exception category
- supervisor review state
- Timesheet handoff readiness

Employers must not see:

- raw continuous GPS trails
- sensitive device identifiers
- protected worker information
- health information
- internal fraud indicators
- unrelated worker history
- payroll details

## 14. Worker Visibility

Workers may see:

- their own Assignment reference
- their own attendance status
- submitted check-in/check-out timestamps
- verification method summary
- exception status
- correction or support path

Workers must not see:

- employer internal notes unrelated to attendance evidence
- other workers' attendance
- internal security heuristics
- raw audit internals

## 15. GPS / Location Policy Boundary

GPS must not be assumed mandatory.

Recommended provider-neutral verification methods:

- GPS
- QR code
- NFC
- supervisor confirmation
- kiosk
- secure PIN
- geofence
- none

Architecture recommendation:

- Attendance should store verification method and policy result, not provider-specific implementation as the core model.
- Raw location data should be minimized.
- Continuous tracking should be prohibited unless separately approved.
- Location evidence should support operational verification only.
- Location failure should create an exception path, not automatic worker fault.

## 16. Offline Behavior Boundary

Future offline support should preserve server authority.

Offline evidence may include:

- local event timestamp
- local device/session reference
- submission timestamp
- replay-protection nonce
- offline reason category
- sync status

Server-side rules:

- server remains authoritative
- duplicate submissions are rejected or linked
- conflicts are preserved for review
- offline events are audited
- offline evidence must not bypass Assignment validation

No offline implementation is authorized by this document.

## 17. Audit Model

Attendance audit events should include:

- attendance creation attempted
- attendance creation failed
- attendance created
- check-in attempted
- check-in accepted
- check-in rejected
- check-out attempted
- check-out accepted
- check-out rejected
- exception created
- supervisor note added
- override marker added
- offline submission received
- duplicate submission detected
- attendance completed
- Timesheet handoff created

Audit must preserve:

- actor
- role
- timestamp
- action
- source record
- evidence reference
- outcome
- reason category
- policy version where applicable

## 18. Permission Model

Recommended minimum future permissions:

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
- `attendance.supervise`

Recommended access boundary:

- Platform administrators may supervise Attendance where authorized.
- Dispatchers may read operational Attendance status where required for coverage.
- Employer supervisors may read and supervise Attendance within organization scope.
- Workers may read, check in, and check out only their own Attendance.
- `attendance.supervise` should be reserved for explicit supervisory roles.

Do not implement permissions until owner approval.

## 19. API Capability Map

Recommended future API capabilities:

- create Attendance from valid Assignment
- read Attendance by platform role
- list Attendance by organization/residence/department
- worker read own Attendance
- worker check in
- worker check out
- supervisor add note
- supervisor mark exception
- supervisor override marker
- read Attendance audit
- hand off completed Attendance to Timesheet

APIs must not:

- calculate Timesheets
- approve hours
- calculate Payroll
- issue invoices
- execute payments
- send provider notifications
- execute AI decisions

## 20. Entity Impact

Recommended Phase 01 entity:

- `AttendanceRecord`

Optional future supporting records:

- `AttendanceEvidence`
- `AttendanceBreak`
- `AttendanceException`
- `AttendanceOfflineSubmission`

Deferred entities:

- Timesheet
- Payroll
- Invoice
- Payment
- WorkerCalendar
- NotificationDelivery
- PerformanceReview

## 21. Concurrency

Concurrency controls should prevent:

- duplicate AttendanceRecords for one Assignment
- duplicate check-in
- duplicate check-out
- check-out before check-in
- stale supervisor overrides
- replayed offline events

Recommended controls:

- unique Assignment-to-active-Attendance constraint
- optimistic version field
- transaction-level state transition checks
- idempotency key for submitted events
- audit event for rejected duplicates

## 22. Country Pack Boundary

Country Packs may define:

- permitted attendance verification methods
- location evidence retention
- break evidence rules
- late/early policy labels
- privacy wording
- worker notification wording
- locale-specific time display

Country Packs must not:

- alter raw evidence
- silently calculate payroll
- override Assignment validation
- remove audit requirements

## 23. Global HR Compatibility

Attendance should remain compatible with the Global HR Core expansion.

Compatibility rules:

- Attendance references Assignment, not a single industry-specific schedule type.
- Residence and Department remain valid Resident Job vertical context.
- Future generic Worksite/Location can coexist by mapping from Assignment context.
- Attendance methods should be configurable by country, industry, and organization policy.
- Attendance must not assume senior-residence-only workflows.

## 24. Exception Flows

| Exception | Authoritative Actor | Preserved Records | Audit | Downstream Effect |
| --- | --- | --- | --- | --- |
| No-show | Attendance Engine plus supervisor review | Assignment, empty/late Attendance evidence | no-show marker, reviewer | Timesheet receives exception, not approved hours |
| Late arrival | Worker evidence plus policy classification | check-in timestamp, schedule reference | late marker | Timesheet review can consider evidence |
| Early departure | Worker evidence plus policy classification | check-out timestamp, schedule reference | early departure marker | Timesheet review can consider evidence |
| Missing checkout | Attendance Engine | check-in evidence, missing checkout marker | exception marker | Timesheet requires review |
| Duplicate check-in | Attendance Engine | first check-in, duplicate attempt | rejected duplicate | no overwrite |
| Duplicate checkout | Attendance Engine | first checkout, duplicate attempt | rejected duplicate | no overwrite |
| Assignment cancelled | Assignment Engine | Assignment state, Attendance attempt | cancellation marker | Attendance cancelled or blocked |
| Assignment withdrawn | Assignment Engine | Assignment withdrawal, Attendance attempt | withdrawal marker | Attendance cancelled or blocked |
| Worker replaced | Replacement Engine future boundary | historical Assignment and new replacement reference | replacement marker | new Assignment owns replacement Attendance |
| Offline submission | Attendance Engine | local evidence, sync evidence | offline submission marker | review if conflict exists |
| Invalid location | Attendance Engine plus supervisor review | location policy result, method summary | exception marker | review path, not automatic fault |
| Supervisor override | Supervisor | original evidence, override marker | actor, reason, timestamp | Timesheet sees both original and override |

## 25. Test Strategy

Future implementation tests should cover:

- Attendance creation only from valid Assignment
- rejected creation for invalid/cancelled/replaced Assignments
- worker-owned check-in
- worker-owned check-out
- duplicate check-in prevention
- duplicate check-out prevention
- check-out before check-in prevention
- missing checkout exception
- late/early labels remain neutral
- supervisor override preserves original evidence
- offline replay protection
- employer read-only visibility
- worker privacy boundary
- Timesheet handoff boundary
- no payroll, invoice, payment, notification, or AI side effects

## 26. Recommended Implementation Order

Recommended future order:

1. Freeze this Attendance architecture after owner approval.
2. Add Attendance schema and migration.
3. Add Attendance permissions.
4. Implement Attendance repository/service.
5. Implement worker check-in/check-out lifecycle.
6. Implement exception state handling.
7. Implement supervisor review markers without Timesheet approval.
8. Implement employer and worker read-only views through API boundaries.
9. Add audit events.
10. Add tests for boundaries and lifecycle.
11. Create Attendance Foundation report.
12. Stop before Timesheet implementation.

## 27. Owner Decisions Required

Owner approval is required before implementation for:

- final Attendance entity list
- final Attendance state list
- whether breaks are included in Phase 01 or deferred
- approved verification methods
- whether GPS is allowed, optional, or disabled by default
- offline evidence policy
- supervisor override scope
- employer visibility scope
- location evidence retention
- worker correction path
- Country Pack attendance defaults
- Timesheet handoff trigger
- idempotency and duplicate-submission policy

## Readiness Verdict

ATTENDANCE ENGINE ARCHITECTURE READY FOR OWNER APPROVAL
