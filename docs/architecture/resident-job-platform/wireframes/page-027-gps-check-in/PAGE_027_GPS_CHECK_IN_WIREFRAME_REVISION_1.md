# Page 027 - GPS Check In Wireframe Revision 1

Status: Approved-condition revision complete
Epic: Epic 3 - Worker Portal
Primary user: Authenticated worker
Architecture baseline: Resident Job Architecture Phase 1 v1.0
Epic planning baseline: Epic 3 Worker Portal Planning v1.0
Source wireframe: PAGE_027_GPS_CHECK_IN_LOW_FIDELITY_WIREFRAME.md
Implementation: Not authorized

## 1. Revision Scope

This controlled revision strengthens informed location permission, check-in state truthfulness,
geofence fairness, fallback check-in, privacy and data minimization, offline and duplicate handling,
material-shift-change protection, attendance boundaries, worker safety, and AI governance.

This revision does not redesign the page and does not modify:

- Architecture Freeze.
- Epic 3 Planning.
- UX Foundation.
- Navigation.
- Pages 016-026.
- EPIC_3_MID_ARCHITECTURE_REVIEW.md.

## 2. Three Independent Check-In Dimensions

Every check-in state must preserve three independent dimensions.

### A. Device / Location State

- Permission not requested.
- Permission granted.
- Permission denied.
- Location unavailable.
- Accuracy insufficient.
- Location services disabled.
- Device or browser unsupported.
- Timeout.

### B. Proximity State

- Within approved area.
- Near boundary.
- Outside approved area.
- Site location unavailable.
- Result inconclusive.

### C. Attendance / Check-In State

- Not submitted.
- Pending submission.
- Submitted.
- Recorded.
- Review required.
- Correction requested.
- Rejected where governed.
- Verification unavailable.

Required boundaries:

```text
Location available
does not equal
Check-in submitted

Check-in submitted
does not equal
Check-in recorded

Check-in recorded
does not equal
Attendance approved

Attendance approved
does not equal
Hours approved

Hours approved
does not equal
Paid
```

## 3. Revised Desktop Wireframe

```text
HEADER
Resident Job | GPS Check In | Worker: [Name] | Help | Notifications

BOUNDARY NOTICE
GPS Check In records one worker-initiated attendance event.
It is not continuous tracking, automatic presence approval, hours approval,
payroll, payment, or misconduct determination.

SHIFT CONFIRMATION
Before check-in, worker confirms:
- Correct assignment
- Correct employer / residence
- Correct date
- Correct start time
- Correct timezone
- Correct approved location
- Current accepted-shift status
- Material changes reviewed

Blocked states:
- Cancelled shift
- Unrelated shift
- Wrong date
- Wrong site
- Stale shift version
- Materially changed shift awaiting acknowledgement

ATTENDANCE LIFECYCLE
Accepted shift -> Arrival window -> Worker initiates check-in
-> Permission/location -> Validation -> Recorded or review required
-> Attendance in progress -> Future check-out -> Attendance review
-> Approved hours -> Payroll

CHECK-IN WINDOW
State: Too early / Available now / Late check-in / Window closed
      / Manual review available / Shift cancelled / Reconfirmation required
Source: employer, site, assignment, jurisdiction, or approved platform policy
No universal threshold, penalty, or no-show conclusion is hardcoded.

INFORMED LOCATION PERMISSION
Before requesting location, show:
- Why location is needed
- It is requested for this check-in event only
- Continuous tracking is not part of this page
- Operational result produced
- Who may see the result
- What happens if permission is declined
- Available fallback methods
- Support path

Permission must be explicit, worker-initiated, not preselected, not bundled,
not requested on page load, and not reused for continuous tracking.

CHECK-IN STATE PANEL
Device / location state:
[permission not requested] [granted] [denied] [unavailable] [accuracy insufficient]
[services disabled] [unsupported] [timeout]

Proximity state:
[within approved area] [near boundary] [outside approved area]
[site unavailable] [inconclusive]

Attendance / check-in state:
[not submitted] [pending submission] [submitted] [recorded]
[review required] [correction requested] [rejected where governed]
[verification unavailable]

GEOFENCE FAIRNESS
Outside area or near boundary does not mean misconduct.
Possible explanations:
- inaccurate site coordinates
- wrong entrance
- parking area
- large facility
- low GPS accuracy
- device limitation
- network delay
- authorized off-site reporting location
- operational exception

Use neutral language:
"Location could not be confirmed"
"Review required"
"Additional information needed"
"Try again or use an approved alternative"

Avoid:
"False location"
"Fraud detected"
"Worker absent"
"Invalid worker"

CONFIGURABLE PROXIMITY RULES
Approved proximity rule may vary by:
- site
- employer
- assignment
- jurisdiction
- approved platform policy

Worker-facing UX communicates the result without exposing unnecessary internal
security configuration or exact geofence logic.

ACCURACY HANDLING
Accuracy state:
- Sufficient accuracy
- Low accuracy
- Unable to determine reliably

If accuracy is insufficient:
[Retry] [Move to a safe open area] [Confirm entrance/site]
[Use approved fallback] [Contact support]

Do not display false precision.
Do not display exact latitude/longitude in normal worker or employer views.
Do not refresh repeatedly without worker action.

FALLBACK CHECK-IN GOVERNANCE
Configurable fallback methods:
- site QR code
- assignment-specific code
- employer or supervisor confirmation
- support-assisted check-in
- kiosk
- manual review request
- documented exception

Fallback submitted ≠ fallback approved.
Fallback approved ≠ worked hours approved.
Every fallback remains assignment-specific and auditable.

Fallback review ownership:
- authorized employer actor, where approved
- scheduler, where approved
- support, where approved
- platform operations, where approved

Reviewer visibility depends on role, permission, assignment, and approved policy.

QR AND CODE SAFETY
QR/code concepts should be:
- assignment-specific
- site-specific
- time-limited where approved
- unusable for another shift
- unusable at another site
- protected from public exposure
- resistant to replay

No reusable static secrets, token algorithms, or implementation design appear here.

OFFLINE TRUTHFULNESS
States:
- Location captured, not submitted
- Pending reconnection
- Submission in progress
- Server confirmation unavailable
- Retry required
- Duplicate submission detected

Saved on device ≠ submitted.
Submitted ≠ recorded.
Do not show "check-in recorded" until the authoritative system confirms it.
Offline event does not imply attendance approval, payroll, or payment.

DUPLICATE / CROSS-DEVICE HANDLING
States:
- already checked in
- duplicate submission
- another device submitted
- stale page
- overlapping shifts
- wrong assignment
- check-in after check-out
- cancelled assignment
- shift version changed

Show the authoritative current state and support path.
Do not create multiple conceptual attendance records.

MATERIAL CHANGE PROTECTION
If the accepted shift changed after worker acceptance:
- pause check-in where acknowledgement is required
- show changed terms
- require review
- provide support or decline route where allowed
- do not check the worker into new terms silently

EMPLOYER VISIBILITY STAGING
Before check-in:
- accepted commitment status
- worker action pending
- check-in window status where operationally appropriate

After check-in recorded:
- check-in recorded
- check-in time
- approved method
- arrival exception status where applicable

When review is required:
- review required
- worker action pending
- fallback used
- operational status only

Not generally visible:
- exact coordinates
- continuous location
- device details
- private worker explanation
- unrelated location history
- raw GPS diagnostics
- support notes
- internal risk signals

PLATFORM AND SUPPORT ACCESS
Authorized staff may access only what is needed for a case or operational purpose:
- assignment
- timestamp
- configured site reference
- proximity result
- accuracy state
- validation method
- fallback evidence
- audit history
- support history

Access must be role-based, auditable, purpose-bound where applicable, and removed
after role changes. Broad staff access is not implied.

DATA MINIMIZATION AND RETENTION
- Location is collected for a specific check-in event.
- Continuous tracking is not part of this page.
- Exact-location display is minimized.
- No public location exposure.
- Access is role-based.
- Retention is governed separately.
- Disputes or legal hold may affect deletion.

No specific retention period is invented.
Exact coordinates are not treated as necessary by default.

WORKER SAFETY
- Do not operate the device while driving.
- Use check-in only after safely arriving.
- Report unsafe access conditions.
- Emergency support path.
- Workplace safety escalation.

Do not force retry while worker is driving or in an unsafe place.

ATTENDANCE AND PAYROLL BOUNDARY
GPS Check In ≠ confirmed presence for the full shift.
Check-in ≠ approved attendance.
Approved attendance ≠ approved paid hours.
Approved paid hours ≠ payment completed.

Page 027 must not edit hours, approve hours, calculate payroll, create payment,
or mark shift complete.

AI ASSISTANCE
AI may explain permission states, proximity results, review-required reasons,
fallback options, non-sensitive check-in steps, and support routing.

AI must not infer fraud, determine presence, approve or reject check-in, alter
timestamps, fabricate location, submit without worker confirmation, activate
background tracking, expose location, penalize workers, approve hours, or create
payroll events.
```

## 4. Mobile Flow

Mobile users must clearly access:

1. Correct shift.
2. Current time and timezone.
3. Check-in window.
4. Permission explanation.
5. Check In action.
6. GPS/device result.
7. Proximity result.
8. Attendance/check-in state.
9. Fallback.
10. Retry.
11. Support.
12. Success or pending state.
13. Safe-driving reminder.

Material shift changes, blocked check-in, review-required states, and offline pending states must
remain visible without forcing the worker through dense maps or technical diagnostics.

## 5. Resolved Owner Conditions

| Owner condition | Revision response |
| --- | --- |
| Separate dimensions | Device/location, proximity, and attendance/check-in states are independent. |
| Informed permission | Pre-location explanation now covers why, event scope, no tracking, result, visibility, decline, fallback, and support. |
| Correct shift confirmation | Worker must confirm assignment, employer, date, time, timezone, location, status, and material changes. |
| Geofence fairness | Outside/near-boundary states use neutral language and list legitimate explanations. |
| Configurable proximity | Radius/rules remain configurable and sensitive logic is not exposed. |
| Accuracy | Plain-language accuracy states and safe retry/fallback paths added. |
| Fallback governance | Fallback methods are configurable, auditable, not auto-approved, and reviewer ownership is clarified. |
| QR/code safety | Assignment/site/time limits and replay/public-exposure protections are represented without implementation. |
| Offline truthfulness | Offline saved, submitted, and recorded states are separated. |
| Duplicate handling | Duplicate, cross-device, wrong-assignment, stale, and cancelled states added. |
| Late/early check-in | Configurable windows and neutral next actions are preserved without penalties. |
| Material changes | Check-in pauses where acknowledgement is required. |
| Employer visibility | Before, recorded, and review-required employer visibility stages added. |
| Platform access | Role-based, auditable, purpose-bound staff access clarified. |
| Data minimization | Event-specific collection, no continuous tracking, and minimal exact-location display reinforced. |
| Worker safety | Safe-arrival, no-driving-use, unsafe access reporting, and escalation added. |
| Attendance/payroll | Check-in, attendance, hours, payroll, and payment are explicitly separate. |
| AI boundary | AI cannot infer fraud, decide presence, approve check-in, alter timestamps, expose location, approve hours, or create payroll. |
| Accessibility/mobile | Mobile flow and accessible state/error/fallback requirements remain explicit. |

## 6. Accessibility

Revision 1 maintains:

- screen-reader status announcements for device, proximity, and check-in state;
- no color-only states;
- keyboard and switch access;
- accessible permission language;
- accessible QR/code alternatives;
- sufficient contrast;
- clear focus changes after permission, retry, fallback, and success states;
- plain-language error recovery;
- clear current time and timezone labels.

## 7. International Readiness

The page does not hardcode:

- geofence radius;
- check-in window;
- late threshold;
- timezone;
- date or time format;
- distance unit;
- location provider;
- privacy language;
- consent wording;
- retention period;
- employer access rules;
- fallback method;
- emergency number;
- attendance law;
- labour policy.

Jurisdiction, employer, site, assignment, locale, and policy configuration remain separate.

## 8. Governance Confirmation

```text
Frozen title remains GPS Check In.
Architecture Freeze unchanged.
Epic 3 Planning unchanged.
UX Foundation unchanged.
Navigation unchanged.
Pages 016-026 unchanged.
EPIC_3_MID_ARCHITECTURE_REVIEW.md unchanged.
No Page 028 created.
No implementation started.
No React/frontend/backend/API/database work.
No GPS integration created.
No geofence implementation created.
No attendance implementation created.
No payroll implementation created.
No production data.
```

## 9. Final Revision Status

```text
Page 027 - GPS Check In
Wireframe Revision 1: COMPLETE
Ready for Product Design Review Revision 1

Page 028
BLOCKED until Page 027 approval record is created
```
