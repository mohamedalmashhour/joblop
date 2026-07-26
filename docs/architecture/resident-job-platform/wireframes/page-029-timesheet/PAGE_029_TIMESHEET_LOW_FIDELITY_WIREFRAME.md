# Page 029 - Timesheet Low-Fidelity Wireframe

Status: Initial wireframe complete
Epic: Epic 3 - Worker Portal
Primary user: Authenticated worker
Secondary visibility: Employer, authorized reviewer, Support, Payroll, and Platform staff where role-permitted
Architecture baseline: Resident Job Architecture Phase 1 v1.0
Epic planning baseline: Epic 3 Worker Portal Planning v1.0
Attendance boundary baseline: EPIC_3_ATTENDANCE_BOUNDARY_REVIEW.md
Frozen architecture source: pages/PAGE_029_TIMESHEET.md
Implementation: Not authorized

## 1. Frozen Page Confirmation

The frozen architecture page map defines:

| Page | Frozen title | Source |
| --- | --- | --- |
| 028 | GPS Check Out | pages/PAGE_028_GPS_CHECK_OUT.md |
| 029 | Timesheet | pages/PAGE_029_TIMESHEET.md |
| 030 | Earnings | pages/PAGE_030_EARNINGS.md |

No title inference, rename, or architecture amendment is introduced.

## 2. Page Purpose

Timesheet is the authenticated worker page for reviewing attendance evidence and submitting or
correcting a reviewable time record.

It allows the worker to:

- review attendance evidence for a completed or active shift;
- compare scheduled and recorded times;
- review breaks and exceptions;
- add a governed correction request;
- submit the timesheet for review where required;
- track review status;
- understand which hours remain unapproved;
- understand that timesheet submission is not payroll or payment.

The page must not:

- approve hours automatically;
- calculate final payroll;
- create an invoice;
- trigger payment;
- let workers edit authoritative GPS timestamps;
- let employers silently alter worker records;
- treat elapsed time as approved paid time;
- infer misconduct;
- expose private GPS details unnecessarily.

## 3. Timesheet Lifecycle

```text
Shift scheduled
↓
GPS or fallback check-in recorded
↓
GPS or fallback checkout recorded
↓
Attendance evidence assembled
↓
Worker reviews timesheet
↓
Worker submits or raises correction
↓
Employer or authorized reviewer reviews
↓
Additional information requested
↓
Hours approved, partially approved, or disputed
↓
Payroll input created in a future workflow
↓
Payment in a future workflow
```

Required boundaries:

```text
Timesheet created
does not equal
Timesheet submitted

Timesheet submitted
does not equal
Hours approved

Hours approved
does not equal
Payroll processed

Payroll processed
does not equal
Payment completed
```

## 4. Time Types

The page must display time values independently.

| Time type | Meaning | Boundary |
| --- | --- | --- |
| Scheduled start | Planned shift start | Not actual work start by itself |
| Scheduled end | Planned shift end | Not actual work end by itself |
| Recorded check-in | Evidence event from Page 027 | Not approved attendance |
| Recorded checkout | Evidence event from Page 028 | Not approved hours |
| Elapsed duration | Time between recorded events | Not automatically worked time |
| Scheduled breaks | Planned break expectation | Not proof break was taken |
| Recorded/declared breaks | Worker/reviewer break information | Not automatically unpaid |
| Exception time | Late, early, missing, duplicate, or changed time | Requires review |
| Proposed payable time | System-calculated pending value | Not final, not payroll |
| Approved hours | Only after governed review | Not net payment |

Required labels:

```text
Elapsed duration
does not equal
Worked time

Worked time
does not equal
Approved paid time

Approved paid time
does not equal
Net payment
```

The page must not collapse all time values into "Total hours."

## 5. Data Classification

Every field must show its authority level.

### System-Recorded and Read-Only

- accepted shift terms;
- scheduled start and end;
- GPS check-in;
- GPS checkout;
- approved fallback event;
- timestamps;
- timezone;
- attendance method.

### Worker-Provided

- break confirmation;
- exception explanation;
- correction request;
- shift-specific note;
- missing check-in or checkout explanation.

### Reviewer-Controlled

- approval state;
- approved hours;
- partial approval;
- correction request;
- dispute status;
- review note visible to worker where appropriate.

Workers must not directly overwrite system-recorded timestamps.

## 6. Desktop Wireframe

```text
HEADER
Resident Job | Timesheet | Worker: [Name] | Help | Notifications

BOUNDARY NOTICE
Timesheet review is not payroll or payment.
Timesheet submitted ≠ hours approved.
Hours approved ≠ payroll processed.
Payroll processed ≠ payment completed.

SHIFT IDENTITY
- Assignment: [role / department / residence]
- Shift date: [date]
- Shift timezone: [timezone]
- Worker viewing timezone: [if different]
- Scheduled start/end: [time + timezone]
- Attendance source: GPS / fallback / review required / missing
- Timesheet status: Draft / Submitted / Correction requested / Under review
- Last reviewer update: [timestamp placeholder]

TIMESHEET LIFECYCLE
Shift scheduled -> Check-in recorded -> Checkout recorded -> Evidence assembled
-> Worker review -> Submit/correct -> Reviewer review -> Approved/partial/disputed
-> Future payroll input -> Future payment

TIME SOURCE TABLE
| Field | Value | Source | Editable? | Review state |
| Scheduled start | [time] | Shift terms | No | Confirmed / changed |
| Scheduled end | [time] | Shift terms | No | Confirmed / changed |
| Recorded check-in | [time] | GPS/fallback | No | Recorded / review req. |
| Recorded checkout | [time] | GPS/fallback | No | Recorded / review req. |
| Elapsed duration | [duration] | System calculation | No | Pending review |
| Scheduled break | [duration] | Shift policy | No | Pending / reviewed |
| Worker break confirmation | [duration/status] | Worker | Yes | Draft/submitted |
| Exception time | [duration/status] | Worker/system | Limited | Review required |
| Proposed payable time | [duration] | System pending calc | No | Not final |
| Approved hours | [duration/blank] | Reviewer | No | Only after review |

Do not display one generic "Total hours" as the final truth.

TIMEZONE AND DATE BOUNDARY
- Recorded at [time] in shift timezone
- Viewed as [time] in worker timezone, where relevant
- Overnight shift indicator
- Cross-midnight date ownership
- Daylight-saving transition note where applicable
- Underlying authoritative timestamp is not changed by display conversion

BREAK HANDLING
- Scheduled break
- Worker-confirmed break
- Employer-confirmed break
- Unpaid break
- Paid break
- Break discrepancy
- Break status unknown

Notice:
Scheduled break ≠ break actually taken.
Break taken ≠ automatically unpaid.
No silent deduction without source, amount, review state, and correction path.

EARLY / LATE / EXTENDED TIME
- Late check-in
- Early checkout
- Extended shift
- Missing event
- Conflicting event
- Employer-requested early release
- Employer-requested extension
- Worker emergency
- Technical failure

Use neutral language.
Late checkout ≠ approved overtime.
Extended elapsed time ≠ payable overtime.
Early checkout ≠ misconduct.

PROPOSED PAYABLE TIME
Label as:
- system calculation
- pending review
- not final
- subject to approved rules and evidence

This page does not calculate final wages, deductions, taxes, net pay,
employer invoice, or platform commission.

WORKER REVIEW
Worker reviews:
- correct shift
- scheduled time
- recorded attendance
- breaks
- exceptions
- proposed time summary
- submitted notes
- correction requests

Actions:
[Timesheet appears correct]
[I need to request a correction]
[Save draft]
[Submit for review]

No material confirmations are preselected.
Worker is not forced to agree with disputed data.

CORRECTION REQUEST
Supported reasons:
- missing check-in
- missing checkout
- incorrect timestamp
- break discrepancy
- employer released worker early
- shift extended
- wrong assignment
- duplicate event
- GPS or fallback issue
- system error

Required information:
- affected field
- requested correction
- reason
- optional supporting evidence reference
- support path

Correction requested ≠ correction approved.
Worker cannot directly rewrite authoritative evidence.

SUPPORTING EVIDENCE
Correction request -> evidence reference -> governed supporting workflow.
Examples:
- supervisor confirmation
- approved message
- incident reference
- support case
- document reference

Do not duplicate document storage.
Do not expose resident or medical information.

REVIEWER / EMPLOYER BOUNDARY
Worker-facing status may show:
- under review
- worker action required
- employer action required
- correction requested
- approved
- partially approved
- disputed
- review unavailable

Review adjustments must preserve:
- original value
- proposed value
- final value
- actor
- timestamp
- reason
- audit trail

Employers or reviewers must not silently alter worker-submitted notes,
original GPS evidence, original fallback records, or audit history.

APPROVAL STATES
Worker state:
- Draft
- Submitted
- Correction requested
- Worker response provided

Review state:
- Not reviewed
- Under review
- Additional information requested
- Approved
- Partially approved
- Disputed
- Closed
- Review unavailable

Payroll handoff state:
- Not ready
- Ready for future payroll
- Blocked by dispute
- Handoff unavailable

Do not collapse these into "Completed."

PARTIAL APPROVAL
- Approved portion
- Disputed portion
- Reason
- Current reviewer
- Worker action
- Next review step

Partial approval ≠ final resolution.
Disputed time remains visible.

AMENDMENT REQUEST
Amendment requested ≠ submission deleted.
Preserve:
- original submission
- amended submission
- timestamps
- reasons
- review history

No silent replacement after review begins.

ATTENDANCE EVIDENCE SUMMARY
Visible summaries only:
- check-in time
- checkout time
- method
- review-required indicator
- fallback status
- exception status

Do not normally expose exact coordinates, raw diagnostics, continuous location,
internal fraud signals, or support-only notes.

PRIVACY AND VISIBILITY
Worker-visible:
- their timesheet
- attendance summary
- submitted notes
- correction status
- reviewer-visible comments intended for worker

Employer-visible:
- operational attendance evidence
- worker-submitted shift note where relevant
- correction request
- review state

Platform-only:
- audit history
- internal support notes
- fraud controls
- sensitive GPS diagnostics
- system reconciliation details

Do not expose resident data or unrelated worker history.

FINANCIAL UX BOUNDARY
Separate:
- time evidence
- approved hours
- pay rate
- estimated gross
- payroll calculation
- net payment
- employer billing

Timesheet focuses on time evidence and review.
Compensation summary is informational and subordinate.
No payment timing or amount is final here.

DISPUTE BOUNDARY
Correction ≠ formal dispute.
Formal dispute ≠ legal claim.
Timesheet may link to a future dispute workflow, but does not own full dispute resolution.
No deadlines, penalties, or appeal rights are invented.

AI ASSISTANCE
AI may explain time categories, identify missing fields, summarize discrepancies,
help format worker-written explanations, identify possible duplicate events, explain review status,
and route to support.

AI must not approve hours, alter timestamps, fabricate attendance, decide whether the worker
worked, calculate final payroll, determine misconduct, delete evidence, resolve disputes,
submit correction without confirmation, or pressure worker to accept an adjustment.
```

## 7. Mobile Wireframe

Mobile must prioritize:

1. Shift identity.
2. Scheduled versus recorded times.
3. Elapsed duration as pending, not approved.
4. Break summary.
5. Discrepancy warning.
6. Correction action.
7. Submission status.
8. Reviewer status.
9. Clear timezone.
10. Sticky submit or correction action where appropriate.

```text
MOBILE TOP
Timesheet
[Role] at [Residence]
[Date] [Shift timezone]

STATUS
Draft / Submitted / Under review / Correction requested / Approved / Partial / Disputed
Payroll: not ready / future handoff / blocked

TIME COMPARISON
Scheduled: [start] - [end]
Check-in: [time + method + review state]
Checkout: [time + method + review state]
Elapsed: [duration] pending review
Proposed payable: [duration] not final
Approved hours: [blank or approved value only after review]

BREAKS
Scheduled break: [value]
Worker-confirmed: [value/status]
Discrepancy: [none / review required]

REVIEW ACTION
[Timesheet appears correct]
[Request correction]
[Save draft]
[Submit for review]

CORRECTION
Affected field
Requested correction
Reason
Evidence reference
[Submit correction request]

REVIEWER STATUS
Under review / more information needed / partial approval / disputed
Disputed time remains visible.

BOUNDARY
Timesheet submitted is not payroll or payment.
```

Avoid dense spreadsheet layouts on mobile.

## 8. Offline and Stale State

Include:

- draft saved locally;
- pending submission;
- server confirmation unavailable;
- stale attendance data;
- newer reviewer update available;
- duplicate submission;
- conflicting amendment.

Do not show "Submitted" until the authoritative system confirms it.
Do not allow an offline change to overwrite a newer reviewed record silently.

## 9. Error and Edge States

Required states:

- no attendance evidence;
- missing check-in;
- missing checkout;
- both events missing;
- duplicate check-in;
- duplicate checkout;
- overnight shift;
- daylight-saving transition;
- shift cancelled after check-in;
- employer changed shift;
- early release;
- extended shift;
- partial approval;
- correction requested;
- disputed time;
- review unavailable;
- payroll handoff blocked;
- offline submission;
- stale record;
- support unavailable.

Every state must explain what happened and what the worker can do next.

## 10. Accessibility

The page must support:

- semantic time table or definition structure;
- keyboard navigation;
- screen-reader comparison of scheduled and recorded times;
- no color-only discrepancy states;
- accessible correction forms;
- error association;
- focus management;
- clear timezone labels;
- accessible partial-approval states;
- plain-language review outcomes;
- sufficient contrast.

## 11. International Readiness

The page must not hardcode:

- date format;
- time format;
- timezone;
- week structure;
- break rules;
- overtime rules;
- payroll rules;
- labour classification;
- currency;
- compensation calculation;
- review deadlines;
- dispute rules;
- attendance terminology;
- jurisdiction-specific timekeeping law.

Jurisdiction, employer, assignment, policy, locale, and financial rules remain configurable.

## 12. Self Validation

| Requirement | Result |
| --- | --- |
| Frozen title remains Timesheet | Pass |
| Architecture Freeze unchanged | Pass |
| Epic 3 Planning unchanged | Pass |
| Pages 016-028 unchanged | Pass |
| Attendance boundary review unchanged | Pass |
| No Page 030 created | Pass |
| No implementation started | Pass |
| No React/frontend/backend/API/database work | Pass |
| No payroll/invoicing/payment logic created | Pass |

## 13. Final Wireframe Status

```text
Page 029 - Timesheet
Wireframe: COMPLETE
Product Review: REQUIRED
Approval Record: NOT CREATED

Page 030
BLOCKED
```
