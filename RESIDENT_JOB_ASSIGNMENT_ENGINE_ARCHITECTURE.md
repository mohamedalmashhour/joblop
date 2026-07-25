# Resident Job Assignment Engine Architecture

Status: READY FOR OWNER REVIEW

This document defines the future Assignment Engine architecture only. It authorizes no schema, migration, permissions, services, APIs, frontend, calendar, attendance, timesheet, payroll, finance, notification, AI execution, reporting, push, merge, deployment, or implementation work.

## 1. Assignment Operating Principle

Assignment is the authoritative operational commitment that confirms a specific worker is committed to a specific approved work schedule after a valid Job Request, valid Dispatch, accepted Worker Offer, and final authoritative validation.

Canonical flow:

```text
Job Request
-> Dispatch
-> Worker Offer
-> Accepted Worker Offer
-> Assignment
-> Attendance
```

Required clarifications:

- Accepted Worker Offer does not equal Assignment.
- Assignment does not equal Attendance.
- Attendance does not equal Timesheet.
- Timesheet does not equal Payroll.
- Assignment confirms the work commitment only.

Assignment owns:

- confirmed worker
- confirmed schedule
- confirmed work commitment

Assignment does not own:

- attendance
- timesheets
- payroll
- finance
- performance
- notifications
- analytics
- worker discipline
- dispute resolution

## 2. Canonical Lifecycle

Recommended Assignment lifecycle:

```text
pending_validation
-> confirmed
-> worker_acknowledged
-> ready_for_attendance
-> in_attendance_window
-> attendance_handoff
```

Administrative and exception states:

```text
cancelled
worker_withdrawn
employer_cancelled
platform_cancelled
replacement_required
expired_before_start
closed
```

Lifecycle interpretation:

- `pending_validation` means accepted Worker Offer exists, but final assignment creation checks are in progress.
- `confirmed` means the Assignment transaction committed successfully.
- `worker_acknowledged` means the worker has seen the confirmed assignment; it is not attendance.
- `ready_for_attendance` means the start-window boundary is approaching.
- `in_attendance_window` means attendance may be initiated by a later Attendance engine.
- `attendance_handoff` means Assignment has handed context to Attendance.
- `closed` means Assignment lifecycle has completed its pre-attendance responsibility or has been superseded by downstream records.

## 3. Assignment Entity

Recommended future `Assignment` entity fields:

Identity and references:

- Assignment ID
- Job Request ID
- Dispatch Review ID
- Worker Offer ID
- Worker Offer Terms Version ID accepted by the worker
- Worker Identity ID
- Employer Organization ID
- Residence ID
- Department ID
- Work Group ID
- Role Definition ID

Confirmed commitment:

- confirmed start time
- confirmed end time
- timezone
- confirmed worker-facing title
- confirmed role summary
- confirmed worksite summary
- confirmed department summary
- confirmed responsibility summary
- confirmed policy summary
- confirmed compensation summary boundary
- confirmation timestamp

Control:

- state
- capacity sequence or assignment slot number
- created by actor
- confirmed by actor or system transaction
- cancelled by actor where applicable
- worker withdrawal timestamp where applicable
- cancellation reason category
- version
- created at
- updated at

Evidence:

- accepted Worker Offer reference
- final validation snapshot
- conflict-check timestamp
- capacity-check timestamp
- calendar-reservation boundary reference if introduced
- audit correlation ID

Do not include:

- attendance timestamps
- GPS evidence
- worked time
- approved hours
- payroll hours
- invoice amounts
- payment status
- employer payment credentials
- worker banking
- tax identifiers
- performance rating
- disciplinary conclusion
- notification-provider payload

## 4. Assignment States

Recommended states:

| State                  | Meaning                                                                           | Owner                               | Allowed Next States                                                                                    | Explicit Non-Ownership    |
| ---------------------- | --------------------------------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------- |
| `pending_validation`   | Accepted Worker Offer is being checked for final assignment creation              | Assignment Engine                   | `confirmed`, `replacement_required`, `cancelled`                                                       | not attendance            |
| `confirmed`            | Worker and schedule are committed                                                 | Assignment Engine                   | `worker_acknowledged`, `ready_for_attendance`, `cancelled`, `worker_withdrawn`, `replacement_required` | not punch-in              |
| `worker_acknowledged`  | Worker has viewed or acknowledged the confirmed assignment                        | Worker boundary                     | `ready_for_attendance`, `cancelled`, `worker_withdrawn`, `replacement_required`                        | not attendance acceptance |
| `ready_for_attendance` | Assignment is ready to be consumed by Attendance when the attendance window opens | Assignment Engine                   | `in_attendance_window`, `cancelled`, `worker_withdrawn`, `replacement_required`                        | not GPS check-in          |
| `in_attendance_window` | Attendance engine may act on the assignment                                       | Assignment plus Attendance boundary | `attendance_handoff`, `cancelled`, `replacement_required`                                              | not worked time           |
| `attendance_handoff`   | Assignment context has been handed to Attendance                                  | Assignment Engine                   | `closed`                                                                                               | not attendance evidence   |
| `worker_withdrawn`     | Worker withdrew from the confirmed assignment under policy                        | Worker plus Assignment boundary     | `replacement_required`, `closed`                                                                       | not discipline            |
| `employer_cancelled`   | Employer cancelled according to governed policy                                   | Employer plus Assignment boundary   | `replacement_required`, `closed`                                                                       | not payment decision      |
| `platform_cancelled`   | Platform cancelled because source context became invalid or unsafe                | Platform authority                  | `replacement_required`, `closed`                                                                       | not misconduct finding    |
| `replacement_required` | Assignment cannot be fulfilled as planned and replacement workflow is needed      | Assignment boundary                 | future Replacement Engine                                                                              | not replacement execution |
| `expired_before_start` | Assignment became invalid before attendance window without attendance             | Assignment Engine                   | `closed`, `replacement_required`                                                                       | not no-show determination |
| `closed`               | Assignment lifecycle is complete for this engine                                  | Assignment Engine                   | none                                                                                                   | not timesheet closure     |

State names are architectural recommendations and require owner approval before schema implementation.

## 5. Assignment Creation Rules

Assignment may be created only when all conditions are true:

- Job Request exists and remains valid.
- Job Request still has unfilled required worker capacity.
- DispatchReview exists and remains valid.
- DispatchReview is not cancelled or closed in a way that blocks assignment.
- Worker Offer exists and is `accepted`.
- Worker Offer accepted terms version is current and immutable.
- WorkerIdentity is active.
- Residence and Department remain active for the organization.
- WorkGroup and RoleDefinition remain active or grandfathered by approved policy.
- final schedule conflict recheck passes.
- final capacity validation passes.
- final policy validation passes.
- requester has assignment creation authority.
- transaction can commit atomically.

If any precondition fails:

- no Assignment is created
- accepted Worker Offer remains preserved
- failure is audited
- safe error is returned
- Dispatch may proceed to replacement or exception handling

## 6. Preconditions From Worker Offer

Assignment depends on the accepted Worker Offer foundation.

Required Worker Offer inputs:

- `WorkerOffer.id`
- `WorkerOffer.status = accepted`
- accepted `WorkerOfferTermsVersion.id`
- `WorkerIdentity.id`
- Job Request reference
- Dispatch Review reference
- employer organization reference
- residence reference
- department reference
- WorkGroup reference
- RoleDefinition reference
- accepted time window and timezone
- worker-facing terms accepted by the worker
- response timestamp
- audit correlation

Worker Offer dependencies must be read as source evidence, not rewritten by Assignment.

Assignment must not:

- alter Worker Offer terms
- rewrite Worker Offer response
- hide stale-term evidence
- reclassify decline or expiry
- create a new Worker Offer silently

## 7. Capacity Validation

Assignment must enforce final capacity at transaction time.

Capacity validation must check:

- Job Request required worker count
- existing non-cancelled Assignments for the Job Request
- accepted Worker Offers already consumed into Assignments
- replacement state where applicable
- multi-worker slot limits
- cancelled and replacement records according to policy

Recommended rule:

```text
confirmed active assignments <= requiredWorkerCount
```

Accepted Worker Offers do not reserve final capacity unless a future owner decision defines a temporary hold policy. Final Assignment creation remains authoritative.

## 8. Final Conflict Recheck

Assignment must recheck worker schedule conflict immediately before creation.

Conflict inputs may include:

- existing confirmed Assignments
- future approved Worker Calendar entries
- accepted but unassigned Worker Offers if owner approves a hold policy
- unavailable dates from a future availability/calendar engine
- required rest or labour-policy constraints from Country Pack where approved

Conflict recheck result must be auditable.

Conflict failure must not punish the worker automatically. It should produce a safe exception and return to Dispatch or Replacement handling.

## 9. Worker Calendar Relationship

Assignment may create or reference a future Worker Calendar entry only after owner approval of the calendar relationship.

Recommended boundary:

- Worker Offer acceptance does not create a confirmed calendar entry.
- Assignment confirmation may create a confirmed calendar commitment.
- Worker Calendar displays the confirmed Assignment.
- Worker Calendar does not create Assignment.
- Calendar updates do not rewrite Assignment history.

Calendar entry types may later include:

- `assignment_confirmed`
- `assignment_cancelled`
- `attendance_window`
- `availability_block`

Those are future calendar decisions, not authorized here.

## 10. Employer Visibility

Employer may see:

- assigned worker display name as governed
- assignment status
- worksite, department, role, and schedule
- readiness for attendance
- cancellation or replacement-required status
- safe support path
- audit summary where authorized

Employer must not see:

- worker private profile data
- banking
- tax identifiers
- health information
- protected characteristics
- internal dispatch notes
- internal AI ranking
- other workers' private responses
- unrelated Worker Offer data

## 11. Worker Visibility

Worker may see:

- confirmed assignment status
- employer/worksite summary as governed
- residence and department
- confirmed role
- confirmed schedule and timezone
- arrival instructions where approved
- policy summary
- cancellation or withdrawal policy
- attendance handoff status
- support path

Worker must not see:

- employer billing
- platform margin
- internal dispatch notes
- other candidates
- employer payment status
- invoice/payment details
- internal fraud/security indicators

## 12. Dispatcher Authority

Dispatcher may:

- initiate Assignment creation from accepted Worker Offer
- review final validation results
- cancel or mark replacement required where authorized
- read Assignment audit
- navigate to Attendance handoff

Dispatcher must not:

- create Assignment without accepted Worker Offer unless future owner-approved exception exists
- bypass capacity
- bypass conflicts
- waive qualifications silently
- rewrite Worker Offer acceptance
- approve attendance
- approve timesheets
- calculate payroll
- issue invoices
- execute payments

## 13. Worker Authority

Worker may:

- view own confirmed Assignment
- acknowledge own confirmed Assignment where required
- request withdrawal or cancellation according to policy
- navigate to future Attendance when eligible
- contact support where needed

Worker must not:

- create Assignment
- modify Assignment terms
- modify schedule unilaterally
- assign another worker
- alter attendance evidence
- approve timesheets
- trigger payroll

## 14. Assignment Cancellation

Assignment cancellation requires governed reason categories.

Recommended reason categories:

- employer cancelled
- worker withdrew
- platform cancelled
- worksite unavailable
- source request invalidated
- compliance issue
- duplicate assignment
- schedule conflict discovered
- replacement completed
- operational support action

Cancellation must preserve:

- original Assignment
- actor
- timestamp
- reason category
- policy context
- replacement boundary status where applicable

Cancellation does not delete Worker Offer, Attendance, Timesheet, Invoice, Payment, or audit records.

## 15. Assignment Withdrawal

Worker withdrawal is a request or governed action according to policy. It must not automatically become discipline or negative rating.

Withdrawal flow should preserve:

- worker actor
- timestamp
- reason category if supplied
- policy window
- support path
- replacement requirement
- audit event

Worker withdrawal does not calculate penalties, payroll, invoices, or ratings.

## 16. Replacement Boundary

Assignment may mark `replacement_required`.

Replacement Engine owns:

- replacement search
- replacement dispatch
- replacement offers
- replacement assignment chain

Assignment does not own:

- candidate search
- AI recommendation generation
- notification campaign
- replacement worker selection

Assignment may provide replacement inputs:

- original Assignment ID
- Job Request ID
- required role
- schedule
- cancellation context
- urgency category

## 17. Multi-Worker Assignments

For Job Requests requiring multiple workers, the recommended model is one Assignment per confirmed worker.

This supports:

- independent worker response
- independent attendance
- independent cancellation
- independent replacement
- independent timesheet path
- clear audit history

Group-level views may aggregate Assignments by Job Request, but aggregation must not collapse individual Assignment authority.

## 18. Multi-Day Assignments

Multi-day work should be modeled carefully before implementation.

Recommended options:

Option A: one Assignment with multiple schedule segments.

Option B: parent Assignment group with child daily Assignments.

Option C: separate Assignments linked by a recurring or grouped request reference.

Recommendation for Phase 01:

Use one Assignment per worker per confirmed work commitment and defer advanced multi-day segmentation until owner approves attendance and timesheet requirements. If multi-day support is needed immediately, prefer explicit schedule segments so Attendance can later record day-level evidence without rewriting Assignment.

## 19. Audit Model

Assignment audit must capture:

- assignment creation attempted
- final validation passed
- final validation failed
- assignment confirmed
- worker acknowledged
- ready for attendance
- attendance handoff
- worker withdrawal requested
- employer cancelled
- platform cancelled
- replacement required
- assignment closed
- permission denied
- concurrency conflict

Audit metadata should preserve:

- actor
- role
- timestamp
- source IP or request context where approved
- Job Request ID
- Dispatch Review ID
- Worker Offer ID
- Assignment ID
- previous state
- new state
- reason category
- policy version
- correlation ID

Audit must never expose secrets, protected personal information, payroll data, banking data, tax data, health data, or internal security material.

## 20. Permission Model

Recommended future active permissions:

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

Recommended reserved permission:

- `assignment.supervise`

Recommended role boundaries:

- `PLATFORM_ADMINISTRATOR` may manage assignments.
- `DISPATCHER` may create and manage assignment readiness.
- `EMPLOYER_MANAGER` may read employer-visible assignment status and request cancellation where approved.
- `WORKER_ACCESS` may read, acknowledge, and request withdrawal only for own Assignment.

Permissions are recommendations only until implementation approval.

## 21. API Capability Map

Recommended future platform capabilities:

- create Assignment from accepted Worker Offer
- list Assignments
- read Assignment
- cancel Assignment
- mark replacement required
- perform attendance handoff
- read Assignment audit summary

Recommended future employer capabilities:

- list employer-visible Assignments
- read employer-visible Assignment
- request cancellation where approved

Recommended future worker capabilities:

- list own Assignments
- read own Assignment
- acknowledge own Assignment
- request withdrawal where approved

Explicitly prohibited from Assignment API:

- create Attendance
- approve Timesheet
- calculate Payroll
- issue Invoice
- execute Payment
- publish Rating
- send Notification provider messages
- run AI dispatch

## 22. Entity Impact

Recommended future entities:

- `Assignment`
- optional `AssignmentValidationSnapshot`
- optional `AssignmentScheduleSegment`
- optional `AssignmentCancellation`
- optional `AssignmentAuditReference`

Existing entities referenced:

- `JobRequest`
- `DispatchReview`
- `WorkerOffer`
- `WorkerOfferTermsVersion`
- `WorkerIdentity`
- `EmployerOrganization`
- `Residence`
- `Department`
- `WorkGroup`
- `RoleDefinition`
- `AuditEvent`

No existing frozen entity should be repurposed into Assignment. Assignment must be additive.

## 23. Concurrency

Assignment creation must be transaction-safe.

Required concurrency protections:

- lock or safely verify Job Request capacity
- verify Worker Offer is still accepted and unconsumed
- verify no existing active Assignment consumes the same Worker Offer
- verify worker conflict state at creation time
- use optimistic version or database constraints
- preserve idempotency key for create-from-offer

Concurrency failure must return safe conflict information and must not create partial Assignment state.

## 24. Country Pack Boundary

Country Pack may influence:

- labour-rule validation
- required rest windows
- cancellation policy
- assignment documentation
- worker visibility language
- local compliance warnings
- time-zone handling

Country Pack must not:

- create Assignment by itself
- bypass accepted Worker Offer
- approve attendance
- calculate payroll
- replace human authority where required

Country-specific rules must be versioned and auditable.

## 25. Global HR Compatibility

Assignment should remain compatible with future global HR expansion.

Compatibility rules:

- `RoleDefinition` remains unchanged for Phase 01.
- Future `GlobalOccupation` may be referenced through compatibility fields or profile joins.
- Residence and Department remain valid vertical-specific worksite structures.
- Future generic Worksite/Location can coexist without replacing Residence silently.
- Assignment should reference the operational role used at the time of confirmation.

Assignment must distinguish:

- Global Occupation
- Country Occupation Profile
- Organization Job Position
- Worker Skill
- Access Role
- Job Request
- Permanent Vacancy
- Assignment

## 26. Exception Flows

Recommended exception flows:

- accepted offer but capacity filled before Assignment
- accepted offer but worker conflict discovered
- accepted offer but Job Request cancelled
- accepted offer but residence/department inactive
- accepted offer but role disabled
- duplicate assignment attempt
- stale terms detected after acceptance
- worker identity closed before confirmation
- system transaction failure
- attendance window reached without confirmation

Exception principles:

- preserve original records
- audit all outcomes
- avoid punitive assumptions
- return safe reason categories
- route to Dispatch, Replacement, or Support as appropriate
- do not calculate payroll or fees

## 27. Test Strategy

Required future tests:

- create Assignment from accepted Worker Offer
- reject creation from non-accepted Worker Offer
- reject stale Worker Offer terms
- reject duplicate assignment from same Worker Offer
- enforce capacity transactionally
- enforce conflict recheck
- preserve Worker Offer history
- worker can read only own Assignment
- employer sees only employer-visible data
- dispatcher cannot bypass validation
- cancellation preserves audit
- withdrawal does not infer discipline
- replacement boundary is marked but not executed
- attendance handoff does not create attendance evidence
- no payroll, invoice, payment, notification, or AI execution side effects
- concurrency conflict tests

## 28. Recommended Implementation Order

Recommended controlled implementation sequence:

1. Assignment schema proposal and owner review.
2. Assignment migration after approval.
3. Assignment permission catalogue.
4. Assignment domain service with in-memory tests.
5. Assignment repository and transaction boundary.
6. Create-from-accepted-offer API.
7. Read/list APIs for platform, employer, and worker views.
8. Cancellation and withdrawal boundaries.
9. Attendance handoff boundary.
10. Audit summary.
11. Integration tests.
12. Documentation report.
13. Owner review and freeze.

Do not begin Attendance until Assignment is accepted and frozen.

## 29. Owner Decisions Required

Owner approval is required for:

- final Assignment state names
- whether Assignment creation is fully system-transactional after worker acceptance or requires dispatcher confirmation
- whether accepted Worker Offers create temporary capacity holds
- whether Worker Calendar entries are created at Assignment confirmation
- cancellation reason categories
- worker withdrawal rules
- employer cancellation rules
- replacement-required trigger rules
- multi-day Assignment model
- multi-worker aggregation model
- Assignment acknowledgement requirement
- Attendance handoff timing
- Country Pack labour-rule enforcement depth for Phase 01
- whether employers can request cancellation directly or only through support/dispatch
- final permission assignments by role
- retention rules
- audit visibility rules

## Verdict

ASSIGNMENT ENGINE ARCHITECTURE READY FOR OWNER APPROVAL
