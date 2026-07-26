# Page 028 - GPS Check Out Wireframe Revision 1

Status: Approved-condition revision complete
Epic: Epic 3 - Worker Portal
Primary user: Authenticated worker
Architecture baseline: Resident Job Architecture Phase 1 v1.0
Epic planning baseline: Epic 3 Worker Portal Planning v1.0
Source wireframe: PAGE_028_GPS_CHECK_OUT_LOW_FIDELITY_WIREFRAME.md
Implementation: Not authorized

## 1. Revision Scope

This controlled revision resolves the documented Page 028 owner-review conditions:

- stay-late / overtime governance;
- no-active-check-in correction path.

The revision preserves the existing GPS privacy, checkout lifecycle, fallback governance,
attendance/payroll boundaries, worker safety, AI governance, accessibility, and mobile-first
structure.

This revision does not redesign the page and does not modify:

- Architecture Freeze.
- Epic 3 Planning.
- UX Foundation.
- Navigation.
- Pages 016-027.
- EPIC_3_MID_ARCHITECTURE_REVIEW.md.

## 2. Revised Checkout Governance Additions

### 2.1 Stay-Late / Extra-Time Governance

Late checkout, staying late, or an employer request to remain on site must be governed separately
from the checkout event.

```text
Employer asks worker to stay late
does not equal
Overtime approved

Late checkout
does not equal
Extra hours approved

Extra time reported
does not equal
Payroll approved

Payroll approved
does not equal
Payment completed
```

The checkout page may collect or route an extra-time note only where governed. It must not:

- approve overtime;
- approve extra hours;
- calculate payroll;
- guarantee payment;
- imply the employer request alone is sufficient for approval;
- hide that later attendance/timesheet review may be required.

Required UX states:

- Extra time not applicable.
- Worker reports employer request to stay late.
- Worker reports operational reason for late checkout.
- Extra time note submitted.
- Extra time requires attendance/timesheet review.
- Extra time disputed or correction requested.
- Support required.

### 2.2 No Active Check-In Found

If no active check-in is found, Page 028 must show a safe correction path.

The page must not fabricate, backfill, or silently create a missing check-in.

Allowed next actions:

- contact support;
- provide evidence where governed;
- request attendance correction;
- review active assignment;
- return to the approved check-in flow if still available;
- view current authoritative state.

Required boundaries:

```text
No active check-in found
does not equal
Worker did not work

Correction request
does not equal
Check-in created

Evidence submitted
does not equal
Attendance approved

Attendance correction
does not equal
Payroll approved
```

## 3. Revised Desktop Wireframe Sections

These sections extend the approved initial wireframe.

```text
STAY-LATE / EXTRA-TIME GOVERNANCE
- Status: not applicable / reported / review required / correction requested
- Reported reason: employer request / operational delay / worker forgot checkout
  / safety issue / connectivity issue / other governed reason
- Scheduled end: [time + timezone]
- Checkout time: [time + timezone]
- Extra time note: [optional where governed]
- Review path: future attendance/timesheet review
- Support path: [Contact support]

Notice:
Late checkout or employer request does not automatically approve overtime,
extra hours, payroll, or payment.

NO ACTIVE CHECK-IN FOUND
- Authoritative state: no active check-in located / stale state / another device
- Worker action: contact support / provide evidence / request correction
- Assignment review: [active assignment summary]
- Correction path: governed attendance correction request
- Support path: [Contact support]

Notice:
Checkout cannot fabricate or backfill a missing check-in automatically.
Evidence or correction request may require human review before attendance,
hours, payroll, or payment decisions.
```

## 4. Revised Mobile Flow Additions

Mobile must surface the two corrected conditions without adding cognitive overload.

```text
IF STAYING LATE OR CHECKING OUT LATE
[Late checkout / extra time notice]
Scheduled end: [time]
Checkout time: [time]
[Add governed note] [Contact support]
Extra time may require review. It is not automatically approved or paid.

IF NO ACTIVE CHECK-IN FOUND
[No active check-in found]
This cannot be corrected automatically from checkout.
[Request correction] [Contact support] [Review assignment]
Correction request is not attendance approval or payroll.
```

## 5. Resolved Conditions

| Condition | Revision response |
| --- | --- |
| Stay-late / overtime governance | Added explicit lifecycle, states, notices, and review path separating late checkout, employer request, extra hours, overtime, payroll, and payment. |
| No active check-in found | Added safe correction path and boundaries preventing fabricated/backfilled check-in or automatic attendance approval. |

## 6. Updated State and Edge Cases

Revision 1 adds or strengthens:

- employer asked worker to stay late;
- operational reason for late checkout;
- extra time note submitted;
- extra time requires review;
- overtime not approved;
- payroll not approved;
- no active check-in found;
- stale state;
- check-in recorded on another device;
- attendance correction requested;
- evidence submitted;
- support required.

Every state must explain what happened and what the worker can do next.

## 7. Accessibility

Revision 1 preserves:

- plain-language late-checkout and correction messages;
- no color-only status states;
- accessible support/correction controls;
- screen-reader announcements for review-required states;
- clear focus movement after correction or support actions;
- mobile-first presentation of urgent checkout blockers.

## 8. International Readiness

The revision does not hardcode:

- overtime policy;
- paid-hours rule;
- labor law;
- payroll timing;
- penalty rules;
- employer approval process;
- correction deadlines;
- jurisdiction-specific wage language.

All stay-late, extra-time, correction, attendance, payroll, and payment rules remain governed by
approved future policy and implementation.

## 9. Governance Confirmation

```text
Frozen title remains GPS Check Out.
Architecture Freeze unchanged.
Epic 3 Planning unchanged.
UX Foundation unchanged.
Navigation unchanged.
Pages 016-027 unchanged.
EPIC_3_MID_ARCHITECTURE_REVIEW.md unchanged.
No Page 029 created.
No implementation started.
No React/frontend/backend/API/database work.
No GPS integration created.
No attendance implementation created.
No hours implementation created.
No payroll implementation created.
No production data.
```

## 10. Final Revision Status

```text
Page 028 - GPS Check Out
Wireframe Revision 1: COMPLETE
Ready for Product Design Review Revision 1

Page 029
BLOCKED until Page 028 approval record is created
```
