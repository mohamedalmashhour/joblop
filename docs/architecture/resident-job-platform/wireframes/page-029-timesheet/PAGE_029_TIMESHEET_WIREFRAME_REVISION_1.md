# Page 029 - Timesheet Wireframe Revision 1

Status: Approved revision complete
Epic: Epic 3 - Worker Portal
Page: 029 - Timesheet
Revision: 1
Approval target: Approved Wireframe v1.0
Architecture baseline: Resident Job Architecture Phase 1 v1.0
Epic planning baseline: Epic 3 Worker Portal Planning v1.0
Attendance boundary baseline: EPIC_3_ATTENDANCE_BOUNDARY_REVIEW.md
Implementation: Not authorized

## 1. Revision Scope

This controlled revision resolves only the approved owner-review conditions from the Page 029
Product Design Review.

Revision 1 strengthens:

- reviewer adjustment audit visibility;
- payroll and payment boundaries;
- mobile partial-approval visibility.

This revision does not change:

- Architecture Freeze;
- Epic 3 Planning;
- UX Foundation;
- Navigation;
- EPIC_3_ATTENDANCE_BOUNDARY_REVIEW.md;
- Pages 016-028.

## 2. Summary of Changes

| Condition | Revision 1 response |
| --- | --- |
| Reviewer Adjustment Audit Block | Added a dedicated audit block that preserves original value, proposed value, final value, actor, timestamp, reason, and audit reference. |
| Payroll Boundary Banner | Added a dedicated boundary banner near proposed payable time and approved hours. |
| Mobile Partial-Approval Pattern | Added a compact mobile pattern that keeps approved and disputed time visible with reason, worker action, and next review step. |

## 3. Authoritative Evidence Boundary

Attendance evidence remains authoritative.

Workers may request a correction, but workers cannot overwrite:

- GPS check-in timestamp;
- GPS checkout timestamp;
- approved fallback check-in timestamp;
- approved fallback checkout timestamp;
- system-generated audit timestamp;
- reviewer adjustment history.

Correction request does not equal evidence change.

```text
Authoritative attendance evidence
↓
Worker review
↓
Correction request, if needed
↓
Authorized review
↓
Approved adjustment or dispute state
```

The original attendance evidence remains visible in the governed record even when a reviewer
approves an adjustment.

## 4. Separate Time Types

The wireframe must keep these time concepts visually distinct:

| Time concept | Meaning | Boundary |
| --- | --- | --- |
| Scheduled time | Planned assignment time | Not proof of work |
| Recorded time | Check-in/check-out evidence | Not approved hours by itself |
| Elapsed time | Duration between recorded events | Not automatically payable |
| Proposed time | Pending system summary for review | Not final |
| Approved time | Reviewer-approved hours | Not payroll |
| Disputed time | Time still under review | Must remain visible |

Required visible statement:

```text
Scheduled time != Recorded time != Elapsed time != Proposed time != Approved time != Payroll time
```

## 5. Reviewer Adjustment Audit Block

Add this dedicated block below the reviewer status area and above any future payroll handoff label.

```text
REVIEWER ADJUSTMENT AUDIT

Adjustment status:
[None / Proposed / Approved / Rejected / Superseded]

Original value:
[system evidence or worker-submitted value]

Proposed value:
[reviewer proposed adjustment]

Final reviewed value:
[approved value or pending]

Adjusted by:
[authorized reviewer role]

Timestamp:
[review timestamp placeholder]

Reason:
[plain-language reason]

Audit reference:
[audit record placeholder]
```

Rules:

- original value remains visible;
- proposed value remains visible while under review;
- final value never erases the original;
- actor, timestamp, and reason are required for every adjustment;
- adjustment notes cannot silently alter worker-submitted notes;
- adjustment history cannot be deleted from the worker-facing review trail where relevant.

## 6. Payroll Boundary Banner

Add this dedicated banner near "Proposed payable time" and "Approved hours."

```text
PAYROLL BOUNDARY

This timesheet records reviewed time only.

Approved hours are not payroll.
Payroll is not payment.
Payment is not invoicing.

This page does not calculate deductions, taxes, net payment, employer billing,
platform commission, or final settlement.
```

Required boundaries:

```text
Timesheet approval
does not equal
Payroll calculation

Payroll calculation
does not equal
Worker payment

Worker payment
does not equal
Employer invoice
```

## 7. Partial Approval Pattern

Partial approval must never hide disputed time.

```text
PARTIAL APPROVAL

Approved portion:
[duration / approved date-time range]

Disputed portion:
[duration / disputed date-time range]

Reason:
[reviewer-visible reason]

Worker action:
[Review / respond / provide information / contact support]

Next review step:
[Awaiting worker response / awaiting employer review / platform review]
```

Rules:

- approved portion and disputed portion remain visible together;
- disputed time is not converted to zero silently;
- partial approval does not close the timesheet unless all review steps are complete;
- unresolved disputed time can block future payroll handoff;
- worker can see what action is available next.

## 8. Mobile Partial-Approval Pattern

Mobile must show a compact partial-approval card without hiding disputed time.

```text
MOBILE PARTIAL APPROVAL CARD

Status: Partially approved

Approved:
[approved duration]

Still under review:
[disputed duration]

Why:
[short reason]

Your next step:
[action]

Next review:
[review step]

[View full audit]
[Respond]
```

Mobile rules:

- the first mobile screen must still answer what is approved and what is disputed;
- disputed time must not be buried below long notes;
- status must not rely on color alone;
- payroll boundary remains visible before any payment-related language appears.

## 9. AI Boundary

AI remains explanatory only.

AI may:

- explain time categories;
- summarize discrepancies;
- identify missing fields;
- help format a worker-written correction explanation;
- explain review status;
- route the worker to support.

AI must not:

- approve hours;
- alter GPS or fallback evidence;
- alter reviewer values;
- calculate payroll;
- calculate payment;
- create invoices;
- resolve disputes;
- determine misconduct;
- submit correction requests without worker confirmation.

## 10. Revised Desktop Structure

```text
HEADER
BOUNDARY NOTICE
SHIFT IDENTITY
TIMESHEET LIFECYCLE
TIME SOURCE TABLE
TIMEZONE AND DATE BOUNDARY
BREAK HANDLING
EARLY / LATE / EXTENDED TIME
PROPOSED PAYABLE TIME
PAYROLL BOUNDARY BANNER
WORKER REVIEW
CORRECTION REQUEST
SUPPORTING EVIDENCE
REVIEWER / EMPLOYER BOUNDARY
REVIEWER ADJUSTMENT AUDIT
APPROVAL STATES
PARTIAL APPROVAL
AMENDMENT REQUEST
ATTENDANCE EVIDENCE SUMMARY
PRIVACY AND VISIBILITY
FINANCIAL UX BOUNDARY
DISPUTE BOUNDARY
AI ASSISTANCE
```

## 11. Revised Mobile Structure

```text
MOBILE TOP
STATUS
TIME COMPARISON
PAYROLL BOUNDARY
BREAKS
REVIEW ACTION
CORRECTION
REVIEWER STATUS
PARTIAL APPROVAL CARD
ADJUSTMENT AUDIT SUMMARY
BOUNDARY
```

The mobile design must keep the worker's immediate question clear:

```text
What time is recorded?
What time is approved?
What time is still disputed?
What can I do next?
```

## 12. Self Validation

| Requirement | Result |
| --- | --- |
| Attendance evidence remains authoritative | Pass |
| Workers cannot overwrite GPS or fallback timestamps | Pass |
| Scheduled, elapsed, proposed, approved, and disputed time remain separate | Pass |
| Correction requests do not directly alter evidence | Pass |
| Partial approval keeps disputed time visible | Pass |
| Reviewer adjustments preserve original value, new value, actor, timestamp, and reason | Pass |
| Timesheet approval remains separate from payroll | Pass |
| Payroll remains separate from payment and invoicing | Pass |
| AI cannot approve hours, alter evidence, calculate payroll, or resolve disputes | Pass |
| Architecture Freeze unchanged | Pass |
| Epic 3 Planning unchanged | Pass |
| UX Foundation unchanged | Pass |
| Navigation unchanged | Pass |
| Pages 016-028 unchanged | Pass |
| No Page 030 created | Pass |
| No implementation started | Pass |

## 13. Final Revision Status

```text
Page 029 - Timesheet
Wireframe Revision 1: COMPLETE
Approval target: APPROVED WIREFRAME v1.0

Page 030 - Earnings
UNBLOCKED as next controlled gate
NOT CREATED
```
