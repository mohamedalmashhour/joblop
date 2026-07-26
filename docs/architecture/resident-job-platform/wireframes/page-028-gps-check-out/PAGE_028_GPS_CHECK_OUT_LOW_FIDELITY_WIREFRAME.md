# Page 028 - GPS Check Out Low-Fidelity Wireframe

Status: Initial wireframe complete
Epic: Epic 3 - Worker Portal
Primary user: Authenticated worker
Secondary visibility: Scheduler, Employer, Support, and Platform staff where role-permitted
Architecture baseline: Resident Job Architecture Phase 1 v1.0
Epic planning baseline: Epic 3 Worker Portal Planning v1.0
Frozen architecture source: pages/PAGE_028_GPS_CHECK_OUT.md
Implementation: Not authorized

## 1. Frozen Page Confirmation

The frozen architecture page map defines:

| Page | Frozen title | Source |
| --- | --- | --- |
| 027 | GPS Check In | pages/PAGE_027_GPS_CHECK_IN.md |
| 028 | GPS Check-Out / GPS Check Out | pages/PAGE_028_GPS_CHECK_OUT.md |
| 029 | Timesheet | pages/PAGE_029_TIMESHEET.md |

No title inference, rename, or architecture amendment is introduced.

## 2. Page Purpose

GPS Check Out is the authenticated worker page for ending an active shift through a governed
checkout event.

It allows the worker to:

- end an active shift;
- confirm departure;
- perform GPS validation where required;
- submit checkout;
- report checkout problems;
- use approved fallback methods;
- understand that checkout is not attendance approval, payroll approval, or payment.

The page must not:

- approve attendance;
- approve worked hours;
- calculate payroll;
- approve overtime;
- finalize payment;
- continuously track worker location;
- infer misconduct from GPS alone;
- expose unnecessary location information.

## 3. Attendance Lifecycle Boundary

```text
Checked In
↓
Working
↓
Worker Initiates Check Out
↓
Location Validation
↓
Check Out Submitted
↓
Check Out Recorded
↓
Attendance Review (future)
↓
Hours Approval (future)
↓
Payroll (future)
↓
Payment (future)
```

Required boundaries:

```text
Check Out Submitted
does not equal
Attendance Approved

Attendance Approved
does not equal
Hours Approved

Hours Approved
does not equal
Payroll

Payroll
does not equal
Payment
```

## 4. Information Ownership

Page 028 owns:

- active shift identity;
- checkout availability;
- worker-initiated departure confirmation;
- checkout GPS/privacy explanation;
- checkout device/location result at wireframe level;
- checkout fallback concepts;
- checkout submitted/recorded/review-required states;
- checkout problem reporting;
- safety and departure reminders.

Page 028 does not own:

- check-in creation;
- continuous tracking;
- attendance approval;
- hours approval;
- timesheet approval;
- payroll calculation;
- overtime approval;
- payment;
- employer billing;
- misconduct determination;
- GPS/geofence implementation.

## 5. Desktop Wireframe

```text
HEADER
Resident Job | GPS Check Out | Worker: [Name] | Help | Notifications

BOUNDARY NOTICE
GPS Check Out records a specific checkout event only.
It is not attendance approval, approved hours, payroll, overtime approval, payment,
continuous tracking, or misconduct determination.

ATTENDANCE LIFECYCLE
Checked in -> Working -> Worker initiates checkout -> Location validation
-> Checkout submitted -> Checkout recorded -> Future attendance review
-> Future hours approval -> Future payroll -> Future payment

SHIFT SUMMARY
- Assignment: [role / department / residence]
- Scheduled end time: [time + timezone]
- Current status: Checked in / active shift / checkout available / review required
- Check-out window: [state]
- Compensation summary: informational only
- Current requirement status: [no change / changed / support required]
- Last material update: [timestamp placeholder]

CHECK-OUT WINDOW
- State: Too early / Available / Late checkout / Window closed / Status unavailable
- Config source: employer, site, assignment, jurisdiction, or approved platform policy
- Available action: continue working, check out, provide reason, request support, fallback
- No universal threshold, penalty, overtime, or no-show conclusion is hardcoded

WORKER DEPARTURE CONFIRMATION
Worker confirms:
- correct active shift
- work activity is ending
- departure intent
- current time and timezone
- location permission for this checkout event where required
- any required checkout note or problem report

GPS AND PRIVACY MODEL
- explicit worker action
- no continuous tracking
- no unnecessary coordinates
- minimal location collection
- role-based visibility
- fair geofence handling
- governed fallback workflow

LOCATION RESULT PANEL
Device / location state:
- Permission not requested / granted / denied
- Location unavailable
- Accuracy insufficient
- Location services disabled
- Device or browser unsupported
- Timeout

Proximity state:
- Within approved area
- Near boundary
- Outside approved area
- Site location unavailable
- Result inconclusive

Checkout state:
- Not submitted
- Pending submission
- Submitted
- Recorded
- Review required
- Correction requested
- Rejected where governed
- Verification unavailable

GEOFENCE FAIRNESS
Outside configured area does not automatically mean misconduct or shift abandonment.
It may reflect wrong exit, parking area, large facility, low accuracy, inaccurate site
coordinates, device issue, network delay, authorized off-site task, or operational exception.

FALLBACK CHECKOUT
Configurable concepts only:
- supervisor confirmation
- QR
- assignment-specific code
- support-assisted checkout
- manual review

Fallback submitted ≠ automatically approved.

CHECKOUT PROBLEM REPORTING
- GPS unavailable
- forgot to check out
- phone battery/device problem
- internet unavailable
- shift ended at a different approved area
- safety/access issue
- employer asked worker to stay late
- employer ended work early

Problem report creates a governed review path. It does not approve hours.

SUCCESSFUL CHECKOUT
- Checkout recorded
- Timestamp and timezone
- Assignment reference
- Validation method
- Review still pending? yes/no
- Next step: Timesheet / Attendance Review future workflow
- Support route

Truthful language:
Checkout recorded is not attendance approval, hours approval, overtime approval, payroll,
or payment.

REVIEW REQUIRED
- Location could not be confirmed
- Additional information needed
- Fallback submitted
- Offline submission pending
- Duplicate or conflicting checkout detected
- Contact support / retry / provide note

Avoid:
- fraud detected
- worker abandoned shift
- invalid checkout
- misconduct

MATERIAL / STATUS PROTECTION
Protect against:
- cancelled shift
- changed assignment
- duplicate checkout
- already checked out
- another device
- stale assignment
- offline state
- check-out after prior checkout
- no active check-in found

Show authoritative current state and support path.

EMPLOYER VISIBILITY
Potentially visible:
- checkout recorded
- checkout time
- review required
- worker action pending
- fallback used
- departure exception status

Not generally visible:
- exact coordinates
- continuous location
- device details
- private worker explanation
- unrelated location history
- raw GPS diagnostics
- support notes
- internal risk signals

PLATFORM / SUPPORT VISIBILITY
Role-based, auditable access may include:
- assignment
- timestamp
- configured site reference
- proximity result
- accuracy state
- validation method
- fallback evidence
- audit history
- support history

WORKER SAFETY
- Finish work safely before interacting with device
- Do not interact while driving
- Use local emergency services for immediate danger
- Report unsafe departure conditions
- Contact approved workplace/support route

AI ASSISTANCE
AI may explain checkout steps, GPS states, fallback options, and next support path.
AI must not approve attendance, edit hours, create payroll, infer fraud, fabricate checkout,
alter timestamps, approve overtime, or mark payment complete.
```

## 6. Mobile Wireframe

Mobile must prioritize:

1. Correct active shift.
2. Checkout availability.
3. Current time and timezone.
4. Primary checkout action.
5. GPS/privacy explanation.
6. Device/proximity/checkout status.
7. Fallback action.
8. Problem report.
9. Support.
10. Recorded or review-required confirmation.
11. Safe-driving reminder.

```text
MOBILE TOP
GPS Check Out
[Role] at [Residence]
Active shift since [check-in time]
Scheduled end: [time + timezone]

CHECKOUT STATUS
[Available / too early / late / window closed / review required]
Next action: [check out / continue working / use fallback / contact support]

SHIFT CONFIRMATION
[Assignment reference]
[Current status]
[Last material update]
[Changed/cancelled/stale warning if active]

PRIMARY ACTION
[End shift and check out]

LOCATION / PRIVACY
This records a checkout event only.
No continuous tracking.
[Allow location for this checkout] [Use fallback] [Not now]

RESULT
Device: [available / denied / low accuracy / timeout]
Proximity: [within area / near boundary / outside / inconclusive]
Checkout: [submitted / recorded / review required / pending]

FALLBACK / PROBLEM
[Supervisor confirmation] [QR/code] [Support-assisted] [Manual review]
[Report checkout problem]

CONFIRMATION
Checkout recorded at [time + timezone]
Next: future timesheet / attendance review
Not payroll or payment approval.

SAFETY
Finish work safely. Do not use device while driving.
```

Avoid dense maps. Use clear checkout status and fallback actions before technical detail.

## 7. State and Edge Cases

Required states:

- Checked in.
- Active shift.
- Too early.
- Checkout available.
- Late checkout.
- Window closed.
- Status unavailable.
- Permission not requested.
- Permission granted.
- Permission denied.
- Location unavailable.
- Accuracy insufficient.
- Location services disabled.
- Device/browser unsupported.
- Timeout.
- Within approved area.
- Near boundary.
- Outside approved area.
- Site location unavailable.
- Result inconclusive.
- Not submitted.
- Pending submission.
- Submitted.
- Recorded.
- Review required.
- Correction requested.
- Rejected where governed.
- Verification unavailable.
- Supervisor fallback submitted.
- QR/code fallback submitted.
- Support-assisted checkout requested.
- Manual review requested.
- Cancelled shift.
- Changed assignment.
- Duplicate checkout.
- Already checked out.
- Checkout recorded on another device.
- Stale assignment.
- Offline.
- No active check-in found.
- Employer asked worker to stay late.
- Employer ended work early.
- Unsafe departure condition.

Every state must explain what happened and what the worker can do next.

## 8. Accessibility

The page must support:

- keyboard navigation;
- screen-reader checkout status announcements;
- accessible location-permission explanation;
- no color-only states;
- clear focus management after submit, retry, fallback, and success;
- accessible fallback controls;
- clear error association;
- plain-language GPS guidance;
- sufficient contrast;
- large mobile touch targets;
- clear time and timezone labels.

## 9. International Readiness

The page must not hardcode:

- check-out window;
- late threshold;
- timezone;
- date or time format;
- distance unit;
- location provider;
- geofence radius;
- privacy language;
- retention period;
- employer access rules;
- fallback method;
- emergency number;
- attendance law;
- labour policy;
- overtime policy;
- payroll timing.

Jurisdiction, employer, site, assignment, locale, and policy configuration remain separate.

## 10. Self Validation

| Requirement | Result |
| --- | --- |
| Frozen title remains GPS Check Out | Pass |
| Architecture Freeze unchanged | Pass |
| Epic 3 Planning unchanged | Pass |
| Pages 016-027 unchanged | Pass |
| No Page 029 created | Pass |
| No implementation started | Pass |
| No React/frontend/backend/API/database work | Pass |
| No GPS integration created | Pass |
| No attendance implementation created | Pass |
| No payroll implementation created | Pass |

## 11. Final Wireframe Status

```text
Page 028 - GPS Check Out
Wireframe: COMPLETE
Product Review: REQUIRED
Approval Record: NOT CREATED

Page 029
BLOCKED
```
